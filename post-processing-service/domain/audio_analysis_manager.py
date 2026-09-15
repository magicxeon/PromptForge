import base64
import hashlib
import logging
from typing import Dict, Any, Optional
from adapters.audio_analysis_adapter import AudioAnalysisAdapter

logger = logging.getLogger("post_processing.audio_analysis_manager")

class AudioAnalysisManager:
    """
    Manager owning Audio Speech-to-Text Transcription and Speaker Diarization
    business rules, validation, and delegation to AudioAnalysisAdapter.
    """

    def __init__(self, policy: Any = None):
        self.policy = policy
        self.adapter = AudioAnalysisAdapter(policy=policy) if policy else None

    def process_transcription(
        self,
        audio_bytes: bytes,
        language: str = "th",
        detect_language: bool = True,
        correlation_id: Optional[str] = None,
        policy: Any = None
    ) -> Dict[str, Any]:
        """
        Validates payload and delegates speech-to-text transcription to AudioAnalysisAdapter.
        """
        active_policy = policy or self.policy
        policy_cfg = getattr(active_policy, "audioAnalysis", {}) if active_policy else {}
        if isinstance(policy_cfg, dict):
            max_bytes = policy_cfg.get("maxInputBytes", 52428800)
        else:
            max_bytes = getattr(policy_cfg, "maxInputBytes", 52428800)

        if len(audio_bytes) > max_bytes:
            raise ValueError(f"Audio payload size ({len(audio_bytes)} bytes) exceeds max limit of {max_bytes} bytes")

        input_hash = hashlib.sha256(audio_bytes).hexdigest()
        corr_id = correlation_id or f"corr_stt_{input_hash[:8]}"

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = AudioAnalysisAdapter(policy=active_policy)

        text, detected_lang, words, duration, mode, fallback_used = adapter.transcribe_audio(
            audio_bytes=audio_bytes,
            language=language,
            detect_language=detect_language,
            correlation_id=corr_id
        )

        output_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

        logger.info(
            f"[AUDIO_MANAGER_TRANSCRIBE] [CorrelationID: {corr_id}] TextLen={len(text)} chars, "
            f"DetectedLang='{detected_lang}', WordsCount={len(words)}, Duration={duration:.2f}s, Mode={mode}"
        )

        return {
            "success": True,
            "text": text,
            "language": detected_lang,
            "words": words,
            "durationSeconds": duration,
            "executionMode": mode,
            "fallbackUsed": fallback_used,
            "correlationId": corr_id,
            "inputHash": input_hash,
            "outputHash": output_hash
        }

    def process_diarization(
        self,
        audio_bytes: bytes,
        max_speakers: int = 4,
        correlation_id: Optional[str] = None,
        policy: Any = None
    ) -> Dict[str, Any]:
        """
        Validates payload and delegates speaker diarization to AudioAnalysisAdapter.
        """
        active_policy = policy or self.policy
        input_hash = hashlib.sha256(audio_bytes).hexdigest()
        corr_id = correlation_id or f"corr_diar_{input_hash[:8]}"

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = AudioAnalysisAdapter(policy=active_policy)

        segments, speaker_count, duration, mode, fallback_used = adapter.diarize_speakers(
            audio_bytes=audio_bytes,
            max_speakers=max_speakers,
            correlation_id=corr_id
        )

        output_hash = hashlib.sha256(str(segments).encode("utf-8")).hexdigest()

        return {
            "success": True,
            "speakerCount": speaker_count,
            "segments": segments,
            "durationSeconds": duration,
            "executionMode": mode,
            "fallbackUsed": fallback_used,
            "correlationId": corr_id,
            "inputHash": input_hash,
            "outputHash": output_hash
        }


audio_analysis_manager = AudioAnalysisManager()
