import importlib.util
from pathlib import Path

from domain.faceless_previs import HTTPException_Like


class OpenVoiceConversionAdapter:
    """Optional OpenVoice V2 tone conversion. No implicit model download or TTS fallback."""

    def __init__(self, policy):
        self.checkpoint = Path(policy.openVoiceCheckpoint)

    def ready(self):
        return (self.checkpoint.joinpath("config.json").is_file()
                and self.checkpoint.joinpath("checkpoint.pth").is_file()
                and importlib.util.find_spec("openvoice") is not None)

    def convert(self, source_path, reference_path, output_path):
        if not self.ready():
            raise HTTPException_Like("voice_conversion_unavailable", "OpenVoice V2 is not installed or its checkpoint is missing.", 503)
        try:
            import torch
            from openvoice.api import ToneColorConverter
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            converter = ToneColorConverter(str(self.checkpoint / "config.json"),
                                           device=device, enable_watermark=False)
            converter.load_ckpt(str(self.checkpoint / "checkpoint.pth"))
            # Reference clips are already manually selected and isolated; no VAD/ASR download.
            source_se = converter.extract_se([str(source_path)])
            target_se = converter.extract_se([str(reference_path)])
            converter.convert(audio_src_path=str(source_path), src_se=source_se,
                              tgt_se=target_se, output_path=str(output_path), message="")
        except Exception:
            raise HTTPException_Like("voice_conversion_failed", "Voice conversion failed on this clip.", 422)
