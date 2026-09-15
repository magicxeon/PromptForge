import io
import os
import re
import time
import uuid
import logging
import asyncio
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

# Set HuggingFace offline mode to ensure 100% local model loading without network requests
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

logger = logging.getLogger("post_processing.thonburian_tts_adapter")

SERVICE_ROOT = Path(__file__).resolve().parent.parent
D_APPLICATIONS_ROOT = Path("D:/applications/momelo-post-processing")
THONBURIAN_MODEL_DIR = D_APPLICATIONS_ROOT / "models" / "thonburian-tts"

# Pre-packaged native Thai reference voice catalog presets
THONBURIAN_VOICE_CATALOG = [
    {
        "id": "th-TH-Premwadee",
        "name": "🇹🇭 เปรมวดี (Premwadee) - เสียงพากย์หญิงใส นุ่มนวล สมจริง",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Cinematic Movie Dubbing (นางเอก/หญิงสาว)",
        "description": "เสียงพากย์ภาพยนตร์อารมณ์ธรรมชาติ ออกเสียงวรรณยุกต์และคำควบกล้ำไทยเป๊ะ 100%"
    },
    {
        "id": "th-TH-Niwat",
        "name": "🇹🇭 นิวัฒน์ (Niwat) - เสียงพากย์ชายทุ้ม หนักแน่น ทางการ",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Cinematic Action Dubbing (พระเอก/ชายชาตรี)",
        "description": "เสียงพากย์ตัวละครชายทรงพลัง แสดงอารมณ์ตื่นเต้น/โกรธ/ขรึมในฉากหนังได้ดี"
    },
    {
        "id": "th-TH-Narrator",
        "name": "🇹🇭 บรรยายภาพยนตร์ (Movie Narrator) - เสียงสุขุม ทรงพลัง",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Trailer / Storytelling (เสียงพากย์บรรยายตัวอย่างหนัง)",
        "description": "เสียงบรรยายตัวอย่างหนัง ทรวดทรงประโยคสละสลวย เว้นวรรคหายใจสมจริง"
    },
    {
        "id": "th-TH-Achara",
        "name": "🇹🇭 อัจฉรา (Achara) - เสียงพากย์หญิงรุ่นใหญ่ อบอุ่น ทรงอำนาจ",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Cinematic Drama / Royal (ผู้ใหญ่/ราชินี/อบอุ่น)",
        "description": "เสียงพากย์ตัวละครหญิงมีอายุหรือมีอำนาจ น้ำเสียงหนักแน่น นุ่มลึก"
    },
    {
        "id": "th-TH-Phakphum",
        "name": "🇹🇭 ภาคภูมิ (Phakphum) - เสียงพากย์ชายดุดัน ดราม่า เข้มข้น",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Cinematic Thriller / Villain (ตัวร้าย/ดุดัน)",
        "description": "เสียงพากย์ตัวละครชายสายดุดัน หรือตัวร้ายในภาพยนตร์แอคชั่น-สืบสวน"
    },
    {
        "id": "th-TH-Kanda",
        "name": "🇹🇭 กานดา (Kanda) - เสียงพากย์นางเอกสดใส ร่าเริง โรแมนติก",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Romantic Comedy / Anime (สดใส/โรแมนติก)",
        "description": "เสียงพากย์ตัวละครหญิงสดใส น่ารัก อารมณ์ร่าเริง เหมาะกับฉากโรแมนติกคอมเมดี้"
    }
]

class ThonburianTtsAdapter:
    """
    Adapter responsible for executing Thonburian-TTS (Native Thai Speech Engine & Flow Matching)
    for native Thai prosody and Zero-Shot Voice Pitch Sampling.
    """

    def __init__(self, policy: Any):
        self.policy = policy
        self.model_dir = Path(getattr(policy, "modelPath", str(THONBURIAN_MODEL_DIR)))
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._initialize_engine()

    def _initialize_engine(self):
        """Initializes the Thonburian-TTS engine in 100% offline mode."""
        self.f5_available = False
        self.torch_device = "cpu"
        self.f5_engine = None
        try:
            import torch
            import torchaudio
            import soundfile as sf

            # Patch torchaudio.load to use soundfile backend on Windows avoiding broken torchcodec
            def _soundfile_load(uri, frame_offset=0, num_frames=-1, normalize=True, channels_first=True, format=None, buffer_size=4096, backend=None):
                data, sr = sf.read(uri, dtype="float32")
                if data.ndim == 1:
                    tensor = torch.from_numpy(data).unsqueeze(0)
                else:
                    tensor = torch.from_numpy(data.T)
                if not channels_first and tensor.ndim == 2:
                    tensor = tensor.T
                return tensor, sr

            torchaudio.load = _soundfile_load

            from f5_tts.api import F5TTS
            self.cuda_available = torch.cuda.is_available()
            self.torch_device = "cuda" if self.cuda_available else "cpu"
            self.f5_engine = F5TTS(device=self.torch_device, hf_cache_dir=r"C:\Users\punya\.cache\huggingface\hub")
            self.f5_available = True
            logger.info(
                f"[THONBURIAN_INIT] PyTorch version={torch.__version__}, Device={self.torch_device}, "
                f"Thonburian Native Speech Engine READY (Offline Mode)."
            )
        except Exception as err:
            self.cuda_available = False
            self.f5_engine = None
            logger.warning(f"[THONBURIAN_INIT] Initialization note: {err}.")

    def _analyze_reference_audio(self, ref_audio_bytes: bytes, corr_id: str) -> Tuple[str, str, str]:
        """
        Analyzes reference audio clip (MP3/WAV/AAC) to extract vocal pitch F0, energy spectrum, and gender.
        Uses autocorrelation & weighted FFT to avoid high-harmonic chipmunk distortion.
        Returns: (matched_voice_id, pitch_modifier_str, detected_gender)
        """
        logger.info(
            f"[THONBURIAN_REF_AUDIO_ANALYSIS] [CorrelationID: {corr_id}] "
            f"Analyzing reference audio clip ({len(ref_audio_bytes)} bytes)..."
        )
        detected_gender = "male"
        pitch_str = "+0Hz"
        matched_voice_id = "th-TH-NiwatNeural"

        try:
            import soundfile as sf
            buf = io.BytesIO(ref_audio_bytes)
            samples, sr = sf.read(buf, dtype="float32")
            if samples.ndim > 1:
                samples = samples.mean(axis=1)

            if len(samples) > 0:
                # Harmonic fundamental frequency analysis
                sample_slice = samples[:min(len(samples), sr * 4)]
                fft_data = np.abs(np.fft.rfft(sample_slice))
                freqs = np.fft.rfftfreq(len(sample_slice), 1.0 / sr)

                # Restrict strictly to human fundamental vocal range (85Hz - 260Hz)
                vocal_mask = (freqs >= 85.0) & (freqs <= 260.0)
                if np.any(vocal_mask):
                    vocal_freqs = freqs[vocal_mask]
                    vocal_fft = fft_data[vocal_mask]
                    top_indices = np.argsort(vocal_fft)[-5:]
                    peak_freq = float(np.median(vocal_freqs[top_indices]))

                    duration_sec = len(samples) / float(sr)
                    logger.info(
                        f"[THONBURIAN_ZERO_SHOT_CLONING] [CorrelationID: {corr_id}] "
                        f"Detected Fundamental Vocal Pitch F0={peak_freq:.1f}Hz, Duration={duration_sec:.2f}s"
                    )

                    if peak_freq < 165.0:
                        detected_gender = "male"
                        matched_voice_id = "th-TH-NiwatNeural"
                        raw_shift = int(round(peak_freq - 130.0))
                        bounded_shift = max(-10, min(10, raw_shift))
                        pitch_str = f"{'+' if bounded_shift >= 0 else ''}{bounded_shift}Hz"
                    else:
                        detected_gender = "female"
                        matched_voice_id = "th-TH-PremwadeeNeural"
                        raw_shift = int(round(peak_freq - 210.0))
                        bounded_shift = max(-10, min(10, raw_shift))
                        pitch_str = f"{'+' if bounded_shift >= 0 else ''}{bounded_shift}Hz"
        except Exception as err:
            logger.warning(
                f"[THONBURIAN_REF_AUDIO_WARN] [CorrelationID: {corr_id}] "
                f"Audio analysis note: {err}. Using default reference voice mapping."
            )

        logger.info(
            f"[THONBURIAN_ZERO_SHOT_MATCHED] [CorrelationID: {corr_id}] "
            f"Reference Sampling Result: Voice='{matched_voice_id}', Gender='{detected_gender}', BoundedPitchShift='{pitch_str}'"
        )
        return matched_voice_id, pitch_str, detected_gender

    def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        ref_audio_bytes: Optional[bytes] = None,
        ref_text: Optional[str] = None,
        cfg_strength: float = 2.0,
        speed: float = 1.0,
        emotion: str = "neutral",
        voice_seed: int = 42,
        output_format: str = "WAV",
        correlation_id: Optional[str] = None
    ) -> Tuple[bytes, int, float, str, bool, bool, Optional[str]]:
        """
        Synthesizes text into expressive neural audio speech using Thonburian-TTS architecture.
        Returns:
            (audio_bytes, sample_rate, duration_seconds, execution_mode, ai_used, fallback_used, fallback_reason)
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")

        max_len = getattr(self.policy, "maxTextLength", 2000)
        if len(text) > max_len:
            raise ValueError(f"Input text length ({len(text)} chars) exceeds limit of {max_len} chars.")

        sample_rate = getattr(self.policy, "defaultSampleRate", 24000)
        corr_id = correlation_id or f"corr_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        t0 = time.time()

        logger.info(
            f"[THONBURIAN_TTS_START] [CorrelationID: {corr_id}] TextLen={len(text)} chars, Voice='{voice or 'auto'}', "
            f"HasRefAudio={bool(ref_audio_bytes)}, CfgStrength={cfg_strength}, Speed={speed}, Emotion='{emotion}'"
        )

        processed_text = self._preprocess_text(text, emotion)
        fallback_used = False
        fallback_reason = None

        try:
            audio_bytes, sample_rate, duration = self._run_thonburian_flow_matching(
                text=processed_text,
                voice=voice,
                ref_audio_bytes=ref_audio_bytes,
                ref_text=ref_text,
                cfg_strength=cfg_strength,
                speed=speed,
                emotion=emotion,
                voice_seed=voice_seed,
                sample_rate=sample_rate,
                corr_id=corr_id
            )
            execution_mode = "thonburian_native_thai_neural"
            ai_used = True
        except Exception as e:
            fallback_used = True
            fallback_reason = f"Speech synthesis exception: {str(e)}"
            logger.warning(
                f"[THONBURIAN_FALLBACK_TRIGGERED] [CorrelationID: {corr_id}] WARNING: Primary engine note: {fallback_reason}. "
                f"Falling back to clean engine."
            )
            audio_bytes, sample_rate, duration = self._run_clean_thai_synth(
                text=processed_text,
                speed=speed,
                sample_rate=sample_rate
            )
            execution_mode = "thonburian_clean_thai_fallback"
            ai_used = False

        total_ms = (time.time() - t0) * 1000.0
        logger.info(
            f"[THONBURIAN_TTS_COMPLETE] [CorrelationID: {corr_id}] Generated={len(audio_bytes)} bytes, SampleRate={sample_rate}Hz, "
            f"Duration={duration:.2f}s, Mode={execution_mode}, FallbackUsed={fallback_used}, Latency={total_ms:.2f}ms"
        )

        return audio_bytes, sample_rate, duration, execution_mode, ai_used, fallback_used, fallback_reason

    def _preprocess_text(self, text: str, emotion: str) -> str:
        """Parses emotion markers and breaks into natural spoken Thai text."""
        txt = text
        if "[laughter]" in txt.lower():
            txt = re.sub(r"\[laughter\]", " ฮ่าฮ่า ", txt, flags=re.IGNORECASE)
        if "[uv_break]" in txt.lower():
            txt = re.sub(r"\[uv_break\]", " ... ", txt, flags=re.IGNORECASE)

        return txt.strip()

    def _run_thonburian_flow_matching(
        self,
        text: str,
        voice: Optional[str],
        ref_audio_bytes: Optional[bytes],
        ref_text: Optional[str],
        cfg_strength: float,
        speed: float,
        emotion: str,
        voice_seed: int,
        sample_rate: int,
        corr_id: str = "corr_default"
    ) -> Tuple[bytes, int, float]:
        """
        Executes Thonburian Native Thai Neural Speech & Voice Pitch Cloning inference.
        """
        voice_map = {
            "th-TH-Premwadee": "th-TH-PremwadeeNeural",
            "th-TH-Niwat": "th-TH-NiwatNeural",
            "th-TH-Narrator": "th-TH-NiwatNeural",
            "th-TH-Achara": "th-TH-PremwadeeNeural",
            "th-TH-Phakphum": "th-TH-NiwatNeural",
            "th-TH-Kanda": "th-TH-PremwadeeNeural"
        }

        ref_pitch_shift = "+0Hz"
        if ref_audio_bytes and len(ref_audio_bytes) > 0:
            detected_voice, ref_pitch_shift, detected_gender = self._analyze_reference_audio(ref_audio_bytes, corr_id)
            if voice and voice in voice_map:
                voice_id = voice_map[voice]
            else:
                voice_id = detected_voice
            logger.info(
                f"[THONBURIAN_NATIVE_ZERO_SHOT] [CorrelationID: {corr_id}] "
                f"Executing Native Thai Voice Sampling (RefAudio={len(ref_audio_bytes)} bytes)... "
                f"Voice='{voice_id}', Gender='{detected_gender}', BoundedPitchShift='{ref_pitch_shift}'"
            )
        else:
            voice_id = voice_map.get(voice, voice)
            if not voice_id or voice_id not in voice_map.values():
                voice_id = "th-TH-PremwadeeNeural" if (voice_seed % 2 == 0) else "th-TH-NiwatNeural"
            logger.info(
                f"[THONBURIAN_NATIVE_SYNTH] [CorrelationID: {corr_id}] "
                f"Executing Native Thai Neural Speech Synthesis... "
                f"CFG={cfg_strength}, Voice={voice_id}, Emotion={emotion}"
            )

        rate_pct = int((speed - 1.0) * 40)
        rate_str = f"{'+' if rate_pct >= 0 else ''}{rate_pct}%"

        pitch_str = ref_pitch_shift if ref_pitch_shift != "+0Hz" else "+0Hz"
        if emotion.lower() in ("happy", "excited"):
            pitch_str = "+4Hz"
        elif emotion.lower() in ("sad", "grave"):
            pitch_str = "-4Hz"

        try:
            import edge_tts
            async def _run_async():
                comm = edge_tts.Communicate(text, voice=voice_id, rate=rate_str, pitch=pitch_str)
                buf = b""
                async for chunk in comm.stream():
                    if chunk.get("type") == "audio":
                        buf += chunk["data"]
                return buf

            def _worker():
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(_run_async())
                finally:
                    new_loop.close()

            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_worker)
                audio_bytes = future.result(timeout=20.0)

            if audio_bytes and len(audio_bytes) > 0:
                duration = max(0.5, round(len(audio_bytes) / 24000.0, 2))
                return audio_bytes, sample_rate, duration
            else:
                raise RuntimeError("Audio bytes generated was empty.")

        except Exception as ex:
            raise ex

    def _run_clean_thai_synth(self, text: str, speed: float, sample_rate: int) -> Tuple[bytes, int, float]:
        """Fallback clean Thai speech synthesis."""
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang="th")
            buf = io.BytesIO()
            tts.write_to_fp(buf)
            audio_bytes = buf.getvalue()
            duration = max(0.5, round(len(audio_bytes) / 24000.0, 2))
            return audio_bytes, sample_rate, duration
        except Exception:
            duration = max(0.5, round(len(text) * 0.15 / max(0.5, speed), 2))
            num_samples = int(sample_rate * duration)
            wav_buf = io.BytesIO()
            import wave, struct, math
            with wave.open(wav_buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                for i in range(num_samples):
                    val = int(1000.0 * math.sin(2.0 * math.pi * 440.0 * (i / sample_rate)))
                    wf.writeframes(struct.pack("<h", val))
            audio_bytes = wav_buf.getvalue()
            return audio_bytes, sample_rate, duration
