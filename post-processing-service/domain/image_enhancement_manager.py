import base64
import hashlib
import io
import logging
from typing import Dict, Any, Optional
from PIL import Image

from adapters.image_enhancement_adapter import ImageEnhancementAdapter
from domain.faceless_previs import HTTPException_Like

logger = logging.getLogger("post_processing.image_enhancement_manager")


class ImageEnhancementManager:
    """
    Reusable component manager responsible for image enhancement, upscaling,
    sharpening, contrast restoration, and face restoration processing.
    """

    def __init__(self, policy: Any = None):
        self.policy = policy
        self.adapter = ImageEnhancementAdapter(policy=policy) if policy else None

    def process(
        self,
        bytes_data: bytes,
        scale: int = 2,
        sharpen: bool = True,
        restore_faces: bool = False,
        denoise: bool = False,
        contrast_restoration: bool = True,
        anti_aliasing: bool = True,
        use_ai_engine: bool = True,
        output_format: str = "PNG",
        policy: Any = None
    ) -> Dict[str, Any]:
        active_policy = policy or self.policy
        if not active_policy:
            raise HTTPException_Like("enhancement_policy_missing", "Policy configuration is missing.", 500)

        adapter = self.adapter
        if not adapter or adapter.policy != active_policy:
            adapter = ImageEnhancementAdapter(policy=active_policy)

        # Validate input bytes size
        if not isinstance(bytes_data, bytes) or not bytes_data or len(bytes_data) > active_policy.maxInputBytes:
            raise HTTPException_Like(
                "enhancement_input_size_invalid",
                f"Image size ({len(bytes_data) if bytes_data else 0} bytes) exceeds limit of {active_policy.maxInputBytes} bytes.",
                413
            )

        # Validate image decoding & bounds
        try:
            pil_img = Image.open(io.BytesIO(bytes_data))
            pil_img.verify()
            pil_img = Image.open(io.BytesIO(bytes_data))
        except Exception:
            raise HTTPException_Like("enhancement_image_invalid", "Image could not be decoded.", 400)

        orig_w, orig_h = pil_img.width, pil_img.height
        if not orig_w or not orig_h:
            raise HTTPException_Like("enhancement_image_invalid", "Invalid image dimensions.", 400)

        if orig_w * orig_h > active_policy.maxPixels:
            raise HTTPException_Like(
                "enhancement_image_unsupported",
                f"Image dimensions ({orig_w}x{orig_h}={orig_w * orig_h} px) exceed maximum allowed input pixels ({active_policy.maxPixels} px).",
                400
            )

        # Validate scale factor
        if scale not in active_policy.allowedScales:
            raise HTTPException_Like(
                "enhancement_scale_unsupported",
                f"Scale factor {scale} is unsupported. Allowed scale factors are {active_policy.allowedScales}.",
                400
            )

        # Perform enhancement / upscaling via Adapter
        try:
            output_bytes, new_w, new_h, execution_mode, ai_used = adapter.process(
                image_bytes=bytes_data,
                scale=scale,
                sharpen=sharpen,
                restore_faces=restore_faces,
                denoise=denoise,
                contrast_restoration=contrast_restoration,
                anti_aliasing=anti_aliasing,
                use_ai_engine=use_ai_engine,
                output_format=output_format
            )
        except ValueError as ve:
            logger.error(f"[ENHANCEMENT_FAILED] Validation/value error: {ve}")
            raise HTTPException_Like("enhancement_processing_failed", str(ve), 400)
        except Exception as e:
            logger.error(f"[ENHANCEMENT_FAILED] Execution exception: {e}")
            raise HTTPException_Like("enhancement_execution_error", f"Processing error: {str(e)}", 500)

        input_hash = hashlib.sha256(bytes_data).hexdigest()
        output_hash = hashlib.sha256(output_bytes).hexdigest()

        logger.info(
            f"[MANAGER_PROCESSED] InputHash={input_hash[:12]}... -> OutputHash={output_hash[:12]}... "
            f"({orig_w}x{orig_h} -> {new_w}x{new_h} px)"
        )

        return {
            "bytes": output_bytes,
            "bytesBase64": base64.b64encode(output_bytes).decode("ascii"),
            "originalWidth": orig_w,
            "originalHeight": orig_h,
            "targetWidth": new_w,
            "targetHeight": new_h,
            "scale": scale,
            "sharpen": sharpen,
            "restoreFaces": restore_faces,
            "denoise": denoise,
            "contrastRestoration": contrast_restoration,
            "antiAliasing": anti_aliasing,
            "aiEngineUsed": ai_used,
            "executionMode": execution_mode,
            "cudaAccelerated": ai_used,
            "inputHash": input_hash,
            "outputHash": output_hash,
            "policyVersion": active_policy.policyVersion,
            "mimeType": f"image/{(output_format or 'png').lower()}"
        }


image_enhancement_manager = ImageEnhancementManager()


def enhance_image(
    bytes_data: bytes,
    scale: int = 2,
    sharpen: bool = True,
    restore_faces: bool = False,
    denoise: bool = False,
    contrast_restoration: bool = True,
    output_format: str = "PNG",
    policy: Any = None
) -> Dict[str, Any]:
    return image_enhancement_manager.process(
        bytes_data=bytes_data,
        scale=scale,
        sharpen=sharpen,
        restore_faces=restore_faces,
        denoise=denoise,
        contrast_restoration=contrast_restoration,
        output_format=output_format,
        policy=policy
    )
