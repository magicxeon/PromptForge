import logging
from typing import Tuple, Dict, Any, Optional
from adapters.thonburian_tts_adapter import ThonburianTtsAdapter, THONBURIAN_VOICE_CATALOG

logger = logging.getLogger("post_processing.expressive_tts_adapter")

VOICE_CATALOG = THONBURIAN_VOICE_CATALOG

class ExpressiveTtsAdapter:
    """
    Canonical Expressive TTS Adapter delegating directly to Thonburian-TTS (F5-TTS Flow Matching Architecture).
    """

    def __init__(self, policy: Any):
        self.policy = policy
        self.thonburian_adapter = ThonburianTtsAdapter(policy=policy)

    def synthesize(
        self,
        text: str,
        voice_seed: int = 42,
        voice: Optional[str] = None,
        ref_audio_bytes: Optional[bytes] = None,
        ref_text: Optional[str] = None,
        cfg_strength: float = 2.0,
        emotion: str = "neutral",
        speed: float = 1.0,
        temperature: float = 0.3,
        output_format: str = "WAV"
    ) -> Tuple[bytes, int, float, str, bool, bool, Optional[str]]:
        return self.thonburian_adapter.synthesize(
            text=text,
            voice=voice,
            ref_audio_bytes=ref_audio_bytes,
            ref_text=ref_text,
            cfg_strength=cfg_strength,
            speed=speed,
            emotion=emotion,
            voice_seed=voice_seed,
            output_format=output_format
        )
