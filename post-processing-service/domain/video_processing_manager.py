import base64
import hashlib
import logging
from typing import Dict, Any, Optional
from adapters.video_processing_adapter import VideoProcessingAdapter

logger = logging.getLogger("post_processing.video_processing_manager")

class VideoProcessingManager:
    """
    Manager owning video processing business validation, payload size checks,
    and delegation to VideoProcessingAdapter.
    """

    def __init__(self, policy: Any = None):
        self.policy = policy
        self.adapter = VideoProcessingAdapter(policy=policy) if policy else None

    def process_interpolation(
        self,
        video_bytes: bytes,
        target_fps: int = 30,
        output_codec: str = "h264",
        preserve_audio: bool = True,
        correlation_id: Optional[str] = None,
        policy: Any = None
    ) -> Dict[str, Any]:
        """
        Validates payload and delegates frame rate interpolation to VideoProcessingAdapter.
        """
        active_policy = policy or self.policy
        policy_cfg = getattr(active_policy, "videoProcessing", {}) if active_policy else {}
        if isinstance(policy_cfg, dict):
            max_bytes = policy_cfg.get("maxInputBytes", 104857600)
            allowed_fps = policy_cfg.get("allowedTargetFps", [24, 30, 60])
        else:
            max_bytes = getattr(policy_cfg, "maxInputBytes", 104857600)
            allowed_fps = getattr(policy_cfg, "allowedTargetFps", [24, 30, 60])

        if len(video_bytes) > max_bytes:
            raise ValueError(f"Video input size ({len(video_bytes)} bytes) exceeds max limit of {max_bytes} bytes")

        if target_fps not in allowed_fps:
            raise ValueError(f"Target FPS {target_fps} is not allowed. Choose from {allowed_fps}")

        input_hash = hashlib.sha256(video_bytes).hexdigest()
        corr_id = correlation_id or f"corr_vid_{input_hash[:8]}"

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = VideoProcessingAdapter(policy=active_policy)

        out_bytes, out_fps, duration, metadata, mode, fallback_used = adapter.interpolate_frames(
            video_bytes=video_bytes,
            target_fps=target_fps,
            output_codec=output_codec,
            preserve_audio=preserve_audio,
            correlation_id=corr_id
        )

        output_hash = hashlib.sha256(out_bytes).hexdigest()
        bytes_b64 = base64.b64encode(out_bytes).decode("utf-8")

        logger.info(
            f"[VIDEO_MANAGER_INTERPOLATE] [CorrelationID: {corr_id}] InputHash={input_hash[:12]}... -> "
            f"OutputHash={output_hash[:12]}... Duration={duration:.2f}s, OutFPS={out_fps}, Mode={mode}"
        )

        return {
            "success": True,
            "bytesBase64": bytes_b64,
            "targetFps": out_fps,
            "durationSeconds": duration,
            "metadata": metadata,
            "executionMode": mode,
            "fallbackUsed": fallback_used,
            "correlationId": corr_id,
            "inputHash": input_hash,
            "outputHash": output_hash,
            "mimeType": "video/mp4"
        }

    def process_enhancement(
        self,
        video_bytes: bytes,
        denoise_level: float = 0.5,
        sharpen_level: float = 0.5,
        output_codec: str = "h264",
        correlation_id: Optional[str] = None,
        policy: Any = None
    ) -> Dict[str, Any]:
        """
        Validates payload and delegates video spatial enhancement to VideoProcessingAdapter.
        """
        active_policy = policy or self.policy
        input_hash = hashlib.sha256(video_bytes).hexdigest()
        corr_id = correlation_id or f"corr_enh_{input_hash[:8]}"

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = VideoProcessingAdapter(policy=active_policy)

        out_bytes, duration, metadata, mode, fallback_used = adapter.enhance_video(
            video_bytes=video_bytes,
            denoise_level=denoise_level,
            sharpen_level=sharpen_level,
            output_codec=output_codec,
            correlation_id=corr_id
        )

        output_hash = hashlib.sha256(out_bytes).hexdigest()
        bytes_b64 = base64.b64encode(out_bytes).decode("utf-8")

        return {
            "success": True,
            "bytesBase64": bytes_b64,
            "durationSeconds": duration,
            "metadata": metadata,
            "executionMode": mode,
            "fallbackUsed": fallback_used,
            "correlationId": corr_id,
            "inputHash": input_hash,
            "outputHash": output_hash,
            "mimeType": "video/mp4"
        }


video_processing_manager = VideoProcessingManager()
