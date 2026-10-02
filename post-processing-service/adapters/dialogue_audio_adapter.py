import io
import subprocess

import numpy as np
import soundfile as sf

from domain.faceless_previs import HTTPException_Like


class DialogueAudioAdapter:
    def __init__(self, policy):
        self.policy = policy

    def _ffmpeg(self, arguments, timeout=30):
        try:
            result = subprocess.run([self.policy.ffmpegPath, "-nostdin", "-hide_banner", "-loglevel", "error",
                                     "-y", *arguments], capture_output=True, timeout=timeout, check=True)
            return result.stdout
        except (OSError, subprocess.SubprocessError):
            raise HTTPException_Like("audio_processing_failed", "FFmpeg could not process this media.", 422)

    def extract_wav(self, path, start_ms=None, end_ms=None, sample_rate=None, mono=True):
        arguments = ["-i", str(path)]
        if start_ms is not None:
            arguments += ["-ss", f"{start_ms / 1000:.3f}", "-t", f"{(end_ms - start_ms) / 1000:.3f}"]
        arguments += ["-map", "0:a:0", "-vn"]
        if mono:
            arguments += ["-ac", "1"]
        if sample_rate:
            arguments += ["-ar", str(sample_rate)]
        arguments += ["-c:a", "pcm_s16le", "-f", "wav", "pipe:1"]
        return self._ffmpeg(arguments)

    def fit_candidate(self, wav, sample_rate, target_samples):
        samples, source_rate = sf.read(io.BytesIO(wav), dtype="float32")
        if samples.ndim != 1 or not len(samples):
            raise HTTPException_Like("audio_candidate_invalid", "Generated speech is empty.", 422)
        ratio = (len(samples) / source_rate) / (target_samples / sample_rate)
        if not 1 / self.policy.maxStretchRatio <= ratio <= self.policy.maxStretchRatio:
            raise HTTPException_Like("audio_timing_unfit", "Speech does not fit the selected interval; extend it or retry.", 422)
        args = ["-i", "pipe:0", "-af", f"atempo={ratio:.6f},aresample={sample_rate}",
                "-ac", "1", "-ar", str(sample_rate), "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"]
        try:
            result = subprocess.run([self.policy.ffmpegPath, "-nostdin", "-hide_banner", "-loglevel", "error",
                                     *args], input=wav, capture_output=True, timeout=30, check=True)
            fitted, rate = sf.read(io.BytesIO(result.stdout), dtype="int16")
            if rate != sample_rate or fitted.ndim != 1 or abs(len(fitted) - target_samples) > sample_rate // 20:
                raise ValueError("Timing mismatch")
        except (OSError, ValueError, subprocess.SubprocessError):
            raise HTTPException_Like("audio_timing_unfit", "Speech cannot fit the selected interval.", 422)
        if len(fitted) < target_samples:
            fitted = np.pad(fitted, (0, target_samples - len(fitted)))
        return fitted[:target_samples], ratio

    def splice(self, source_wav, candidate_wav, start_ms, end_ms):
        source, rate = sf.read(io.BytesIO(source_wav), dtype="int16")
        if source.ndim not in (1, 2) or (source.ndim == 2 and source.shape[1] != 2):
            raise HTTPException_Like("media_unsupported", "POC requires mono or stereo dialogue.", 422)
        start = round(start_ms * rate / 1000)
        end = round(end_ms * rate / 1000)
        if end > len(source):
            raise HTTPException_Like("audio_interval_invalid", "Interval exceeds decoded audio.", 422)
        fitted, ratio = self.fit_candidate(candidate_wav, rate, end - start)
        output = source.copy()
        original_voice = source[start:end].astype(np.float32)
        candidate_voice = fitted.astype(np.float32)
        original_rms = float(np.sqrt(np.mean(original_voice * original_voice)))
        candidate_rms = float(np.sqrt(np.mean(candidate_voice * candidate_voice)))
        gain = min(2.0, max(0.5, original_rms / candidate_rms)) if candidate_rms > 1 else 1.0
        fitted = np.clip(candidate_voice * gain, -32768, 32767).astype(np.int16)
        if source.ndim == 2:
            fitted = np.repeat(fitted[:, None], 2, axis=1)
        fade = min(round(self.policy.fadeMs * rate / 1000), (end - start) // 2)
        if fade:
            ramp = np.arange(fade, dtype=np.float32) / fade
            if source.ndim == 2:
                ramp = ramp[:, None]
            fitted[:fade] = (source[start:start + fade] * (1 - ramp) + fitted[:fade] * ramp).astype(np.int16)
            fitted[-fade:] = (fitted[-fade:] * (1 - ramp) + source[end - fade:end] * ramp).astype(np.int16)
        output[start:end] = fitted
        buffer = io.BytesIO()
        sf.write(buffer, output, rate, format="WAV", subtype="PCM_16")
        return buffer.getvalue(), {"sampleRate": rate, "startSample": start, "endSample": end,
                                    "stretchRatio": round(ratio, 5), "gainDb": round(20 * np.log10(gain), 2)}

    def remux(self, source_path, audio_path, output_path, duration_ms):
        self._ffmpeg(["-i", str(source_path), "-i", str(audio_path), "-map", "0:v:0", "-map", "1:a:0",
                      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "apad",
                      "-t", f"{duration_ms / 1000:.3f}", str(output_path)],
                     timeout=self.policy.jobTimeoutSeconds)
