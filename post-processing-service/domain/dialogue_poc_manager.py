import base64
import hashlib
import importlib.util
import io
import json
import math
import os
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf

from domain.faceless_previs import HTTPException_Like
from adapters.openvoice_conversion_adapter import OpenVoiceConversionAdapter


class DialoguePocManager:
    """Private, expiring media and voice-profile storage for the local Postman POC."""

    def __init__(self, policy):
        self.policy = policy
        self.root = Path(policy.scratchRoot).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _record_path(self, kind, identifier):
        prefix = {"media": "media_", "profile": "voice_"}[kind]
        if not isinstance(identifier, str) or not identifier.startswith(prefix) or len(identifier) != len(prefix) + 32:
            raise HTTPException_Like("media_not_found", "Private item not found.", 404)
        try:
            int(identifier[len(prefix):], 16)
        except ValueError:
            raise HTTPException_Like("media_not_found", "Private item not found.", 404)
        return self.root / f"{identifier}.json"

    def _read(self, kind, identifier):
        path = self._record_path(kind, identifier)
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, ValueError):
            raise HTTPException_Like("media_not_found", "Private item not found.", 404)
        if record["expiresAt"] <= time.time():
            raise HTTPException_Like("media_expired", "Private item expired.", 410)
        return record

    def read_media(self, identifier):
        record = self._read("media", identifier)
        path = self.root / record["fileName"]
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != record["sha256"]:
            raise HTTPException_Like("media_unavailable", "Media is unavailable.", 410)
        return record, path

    def read_profile(self, identifier):
        return self._read("profile", identifier)

    def _write(self, kind, identifier, record):
        path = self._record_path(kind, identifier)
        temporary = path.with_suffix(".new")
        temporary.write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
        temporary.replace(path)

    def _probe(self, path):
        try:
            result = subprocess.run([self.policy.ffprobePath, "-v", "error", "-show_format",
                                     "-show_streams", "-of", "json", str(path)],
                                    capture_output=True, timeout=15, check=True)
            info = json.loads(result.stdout)
            duration = float(info["format"]["duration"])
            streams = info["streams"]
        except (OSError, ValueError, KeyError, subprocess.SubprocessError):
            raise HTTPException_Like("media_invalid", "Media could not be decoded.", 422)
        audio = [item for item in streams if item.get("codec_type") == "audio"]
        video = [item for item in streams if item.get("codec_type") == "video"]
        channels = audio[0].get("channels") if audio else None
        try:
            sample_rate = int(audio[0].get("sample_rate", 0)) if audio else 0
        except (ValueError, TypeError):
            sample_rate = 0
        if len(audio) != 1 or len(video) > 1 or channels not in (1, 2) or not 8000 <= sample_rate <= 192000:
            raise HTTPException_Like("media_unsupported", "POC requires one mono/stereo audio track and at most one video track.", 422)
        if not math.isfinite(duration) or duration <= 0 or duration > self.policy.maxSourceSeconds:
            raise HTTPException_Like("media_duration_invalid", "Media duration exceeds the POC limit.", 422)
        return round(duration * 1000), bool(video), channels

    def store_media(self, data, mime_type, parent_id=None):
        self.cleanup_expired()
        allowed = {"video/mp4": ".mp4", "audio/wav": ".wav", "audio/x-wav": ".wav",
                   "audio/mpeg": ".mp3"}
        if mime_type not in allowed or not data or len(data) > self.policy.maxInputBytes:
            raise HTTPException_Like("media_input_invalid", "Unsupported or oversized media.", 413)
        identifier = "media_" + uuid.uuid4().hex
        path = self.root / (identifier + allowed[mime_type])
        path.write_bytes(data)
        try:
            duration_ms, has_video, channels = self._probe(path)
            if mime_type == "video/mp4" and not has_video:
                raise HTTPException_Like("media_invalid", "MP4 requires a video stream.", 422)
            if mime_type != "video/mp4" and has_video:
                raise HTTPException_Like("media_invalid", "Audio upload contains video.", 422)
            record = {"mediaId": identifier, "fileName": path.name, "mimeType": mime_type,
                      "sha256": hashlib.sha256(data).hexdigest(), "durationMs": duration_ms,
                      "hasVideo": has_video, "audioChannels": channels, "parentMediaId": parent_id,
                      "expiresAt": int(time.time()) + self.policy.retentionSeconds}
            self._write("media", identifier, record)
            return record
        except Exception:
            path.unlink(missing_ok=True)
            raise

    def media_result(self, identifier):
        record, path = self.read_media(identifier)
        if path.stat().st_size > self.policy.maxInputBytes:
            raise HTTPException_Like("media_input_invalid", "Artifact exceeds response limit.", 413)
        return {**record, "bytesBase64": base64.b64encode(path.read_bytes()).decode("ascii")}

    def create_profile(self, reference_id, start_ms, end_ms, consent_record_id, transcript):
        self.cleanup_expired()
        reference, _ = self.read_media(reference_id)
        if not isinstance(consent_record_id, str) or not consent_record_id.strip():
            raise HTTPException_Like("voice_consent_required", "A POC consent record is required.", 422)
        if transcript is not None and (not isinstance(transcript, str) or len(transcript) > self.policy.maxTextLength):
            raise HTTPException_Like("voice_reference_text_invalid", "Reference transcript is invalid.", 422)
        validate_interval(start_ms, end_ms, reference["durationMs"], self.policy.maxEditSeconds)
        if end_ms - start_ms < 3000:
            raise HTTPException_Like("voice_reference_short", "Reference must be at least three seconds.", 422)
        from adapters.dialogue_audio_adapter import DialogueAudioAdapter
        _, reference_path = self.read_media(reference_id)
        reference_wav = DialogueAudioAdapter(self.policy).extract_wav(reference_path, start_ms, end_ms, 16000)
        samples, _ = sf.read(io.BytesIO(reference_wav), dtype="float32")
        if len(samples) < 16000 * 3 or float(np.sqrt(np.mean(samples * samples))) < 0.003 or float(np.mean(np.abs(samples) >= 0.99)) > 0.01:
            raise HTTPException_Like("voice_reference_poor", "Reference is silent, clipped or too short; choose a cleaner interval.", 422)
        identifier = "voice_" + uuid.uuid4().hex
        record = {"voiceProfileId": identifier, "referenceMediaId": reference_id,
                  "startMs": start_ms, "endMs": end_ms, "referenceTranscript": transcript,
                  "consentRecordId": consent_record_id,
                  "expiresAt": min(reference["expiresAt"], int(time.time()) + self.policy.retentionSeconds),
                  "version": 1}
        self._write("profile", identifier, record)
        return {key: value for key, value in record.items() if key != "referenceTranscript"}

    def validate_job(self, body):
        if not isinstance(body, dict) or body.get("operation") not in ("audio.dialogue_repair", "audio.voice_conversion"):
            raise HTTPException_Like("invalid_operation", "Unsupported dialogue operation.", 400)
        options = body.get("options")
        if not isinstance(options, dict):
            raise HTTPException_Like("audio_options_invalid", "Dialogue options are required.", 422)
        operation = body["operation"]
        source_id = options.get("sourceMediaId")
        profile_id = options.get("voiceProfileId")
        source, _ = self.read_media(source_id or "")
        profile = self.read_profile(profile_id or "")
        self.read_media(profile["referenceMediaId"])
        consent = options.get("consentRecordId")
        if not isinstance(consent, str) or not consent.strip() or consent != profile["consentRecordId"]:
            raise HTTPException_Like("voice_consent_required", "The local voice consent record is unavailable.", 422)
        if operation == "audio.dialogue_repair":
            model_path = Path(self.policy.thaiTtsModelPath)
            if (importlib.util.find_spec("f5_tts") is None
                    or not (model_path / "mega_f5_last.safetensors").is_file()
                    or not (model_path / "mega_vocab.txt").is_file()):
                raise HTTPException_Like("voice_model_unavailable", "Thai speech model is not installed.", 503)
            text = options.get("replacementText")
            if not isinstance(text, str) or not text.strip() or len(text) > self.policy.maxTextLength:
                raise HTTPException_Like("audio_text_invalid", "Replacement text is required within the configured limit.", 422)
            segments = [{"startMs": options.get("startMs"), "endMs": options.get("endMs")}]
            if not profile.get("referenceTranscript"):
                raise HTTPException_Like("voice_reference_text_required", "A matching reference transcript is required.", 422)
        else:
            if not OpenVoiceConversionAdapter(self.policy).ready():
                raise HTTPException_Like("voice_conversion_unavailable", "OpenVoice V2 is not installed or its checkpoint is missing.", 503)
            segments = options.get("segments")
            if not isinstance(segments, list) or not 1 <= len(segments) <= 8:
                raise HTTPException_Like("audio_interval_invalid", "Provide one to eight selected intervals.", 422)
        cleaned = []
        previous_end = -1
        total_ms = 0
        for item in segments:
            if not isinstance(item, dict):
                raise HTTPException_Like("audio_interval_invalid", "Invalid selected interval.", 422)
            start_ms, end_ms = item.get("startMs"), item.get("endMs")
            validate_interval(start_ms, end_ms, source["durationMs"], self.policy.maxEditSeconds)
            if start_ms < previous_end:
                raise HTTPException_Like("audio_interval_invalid", "Intervals must be ordered and non-overlapping.", 422)
            cleaned.append({"startMs": start_ms, "endMs": end_ms})
            previous_end = end_ms
            total_ms += end_ms - start_ms
        if total_ms > self.policy.maxEditSeconds * 1000:
            raise HTTPException_Like("audio_interval_invalid", "Total selected speech exceeds the limit.", 422)
        return operation, {"sourceMediaId": source_id, "voiceProfileId": profile_id,
                           "consentRecordId": consent, "segments": cleaned,
                           **({"replacementText": text.strip()} if operation == "audio.dialogue_repair" else {})}

    def delete(self, kind, identifier):
        record = self._read(kind, identifier)
        self._record_path(kind, identifier).unlink(missing_ok=True)
        if kind == "media":
            (self.root / record["fileName"]).unlink(missing_ok=True)
        return {"deleted": True, "id": identifier}

    def cleanup_expired(self):
        now = time.time()
        for path in (*self.root.glob("media_*.json"), *self.root.glob("voice_*.json")):
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
                if record.get("expiresAt", now + 1) > now:
                    continue
                if path.name.startswith("media_"):
                    filename = record.get("fileName", "")
                    if filename in {path.stem + extension for extension in (".mp4", ".wav", ".mp3")}:
                        (self.root / filename).unlink(missing_ok=True)
                path.unlink(missing_ok=True)
            except (OSError, ValueError):
                continue


def validate_interval(start_ms, end_ms, duration_ms, max_seconds):
    if (type(start_ms) is not int or type(end_ms) is not int or start_ms < 0
            or end_ms <= start_ms or end_ms > duration_ms
            or end_ms - start_ms > max_seconds * 1000):
        raise HTTPException_Like("audio_interval_invalid", "Select a valid interval within the media duration.", 422)
