import base64
import hashlib
import logging
from typing import Dict, Any, Optional

from adapters.thonburian_tts_adapter import ThonburianTtsAdapter, THONBURIAN_VOICE_CATALOG
from domain.faceless_previs import HTTPException_Like

logger = logging.getLogger("post_processing.thonburian_tts_manager")

class ThonburianTtsManager:
    """
    Reusable component manager responsible for Thonburian-TTS (F5-TTS Flow Matching)
    expressive Thai speech synthesis, zero-shot emotion cloning, telemetry, and input validation.
    """

    def __init__(self, policy: Any = None):
        self.policy = policy
        self.adapter = ThonburianTtsAdapter(policy=policy) if policy else None

    def get_voice_catalog(self) -> list:
        """Returns the pre-packaged Thonburian-TTS native Thai voice reference catalog."""
        return THONBURIAN_VOICE_CATALOG

    def process(
        self,
        text: str,
        voice: Optional[str] = None,
        ref_audio_b64: Optional[str] = None,
        ref_text: Optional[str] = None,
        cfg_strength: float = 2.0,
        speed: float = 1.0,
        emotion: str = "neutral",
        voice_seed: int = 42,
        output_format: str = "WAV",
        correlation_id: Optional[str] = None,
        policy: Any = None,
        chunk_length: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process the text and reference inputs via the ThonburianTTS model adapter.
        """
        active_policy = policy or self.policy
        if not active_policy:
            raise HTTPException_Like("tts_policy_missing", "Policy configuration is missing.", 500)

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = ThonburianTtsAdapter(policy=active_policy)

        # Validate input text
        if not isinstance(text, str) or not text.strip():
            raise HTTPException_Like("tts_text_invalid", "Input text cannot be empty.", 400)

        if len(text) > active_policy.maxTextLength:
            raise HTTPException_Like(
                "tts_text_exceeds_limit",
                f"Text length ({len(text)} chars) exceeds limit of {active_policy.maxTextLength} chars.",
                400
            )

        # Decode reference audio if provided
        ref_audio_bytes = None
        if ref_audio_b64:
            try:
                ref_audio_bytes = base64.b64decode(ref_audio_b64)
            except Exception:
                raise HTTPException_Like("ref_audio_invalid", "refAudioBase64 could not be decoded.", 400)

        # Execute Thonburian-TTS synthesis via Adapter
        try:
            audio_bytes, sample_rate, duration, execution_mode, ai_used, fallback_used, fallback_reason = adapter.synthesize(
                text=text,
                voice=voice,
                ref_audio_bytes=ref_audio_bytes,
                ref_text=ref_text,
                cfg_strength=cfg_strength,
                speed=speed,
                emotion=emotion,
                voice_seed=voice_seed,
                output_format=output_format,
                correlation_id=correlation_id,
                chunk_length=chunk_length
            )
        except ValueError as ve:
            raise HTTPException_Like("tts_validation_failed", str(ve), 400)
        except Exception as e:
            raise HTTPException_Like("tts_execution_error", f"Thonburian-TTS synthesis error: {str(e)}", 500)

        input_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        output_hash = hashlib.sha256(audio_bytes).hexdigest()
        corr_id = correlation_id or f"corr_{input_hash[:12]}"

        logger.info(
            f"[THONBURIAN_MANAGER_PROCESSED] [CorrelationID: {corr_id}] InputHash={input_hash[:12]}... -> OutputHash={output_hash[:12]}... "
            f"Duration={duration:.2f}s, Mode={execution_mode}, FallbackUsed={fallback_used}, CfgStrength={cfg_strength}"
        )

        return {
            "bytes": audio_bytes,
            "bytesBase64": base64.b64encode(audio_bytes).decode("ascii"),
            "text": text,
            "voice": voice or "auto",
            "cfgStrength": cfg_strength,
            "emotion": emotion,
            "speed": speed,
            "sampleRate": sample_rate,
            "durationSeconds": round(duration, 2),
            "aiEngineUsed": ai_used,
            "executionMode": execution_mode,
            "fallbackUsed": fallback_used,
            "fallbackReason": fallback_reason,
            "correlationId": corr_id,
            "inputHash": input_hash,
            "outputHash": output_hash,
            "policyVersion": active_policy.policyVersion,
            "mimeType": f"audio/{(output_format or 'wav').lower()}"
        }


thonburian_tts_manager = ThonburianTtsManager()
