import logging
from typing import Dict, Any, Optional
from domain.thonburian_tts_manager import ThonburianTtsManager, thonburian_tts_manager

logger = logging.getLogger("post_processing.expressive_tts_manager")

class ExpressiveTtsManager:
    """
    Canonical Expressive TTS Manager delegating directly to ThonburianTtsManager.
    """

    def __init__(self, policy: Any = None):
        self.policy = policy
        self.thonburian_manager = ThonburianTtsManager(policy=policy) if policy else None

    def process(
        self,
        text: str,
        voice_seed: int = 42,
        voice: Optional[str] = None,
        ref_audio_b64: Optional[str] = None,
        ref_text: Optional[str] = None,
        cfg_strength: float = 2.0,
        emotion: str = "neutral",
        speed: float = 1.0,
        temperature: float = 0.3,
        output_format: str = "WAV",
        correlation_id: Optional[str] = None,
        policy: Any = None,
        chunk_length: Optional[int] = None
    ) -> Dict[str, Any]:
        active_policy = policy or self.policy
        manager = self.thonburian_manager
        if not manager or manager.policy != active_policy:
            manager = ThonburianTtsManager(policy=active_policy)

        return manager.process(
            text=text,
            voice=voice,
            ref_audio_b64=ref_audio_b64,
            ref_text=ref_text,
            cfg_strength=cfg_strength,
            speed=speed,
            emotion=emotion,
            voice_seed=voice_seed,
            output_format=output_format,
            correlation_id=correlation_id,
            policy=active_policy,
            chunk_length=chunk_length
        )


expressive_tts_manager = ExpressiveTtsManager()
