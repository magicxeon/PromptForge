import io
import time
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import cv2

logger = logging.getLogger("post_processing.image_enhancement_adapter")

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
    CUDA_AVAILABLE = torch.cuda.is_available()
except ImportError:
    TORCH_AVAILABLE = False
    CUDA_AVAILABLE = False

SERVICE_ROOT = Path(__file__).resolve().parent.parent
D_APPLICATIONS_ROOT = Path("D:/applications/momelo-post-processing")


if TORCH_AVAILABLE:
    class ResidualDenseBlock_5C(nn.Module):
        def __init__(self, nf=64, gc=32, bias=True):
            super().__init__()
            self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1, bias=bias)
            self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1, bias=bias)
            self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1, bias=bias)
            self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1, bias=bias)
            self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1, bias=bias)
            self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

        def forward(self, x):
            x1 = self.lrelu(self.conv1(x))
            x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
            x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
            x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
            x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
            return x5 * 0.2 + x

    class RRDB(nn.Module):
        def __init__(self, nf=64, gc=32):
            super().__init__()
            self.rdb1 = ResidualDenseBlock_5C(nf, gc)
            self.rdb2 = ResidualDenseBlock_5C(nf, gc)
            self.rdb3 = ResidualDenseBlock_5C(nf, gc)

        def forward(self, x):
            out = self.rdb1(x)
            out = self.rdb2(out)
            out = self.rdb3(out)
            return out * 0.2 + x

    class RRDBNet(nn.Module):
        def __init__(self, num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4):
            super().__init__()
            self.scale = scale
            self.conv_first = nn.Conv2d(num_in_ch, num_feat, 3, 1, 1, bias=True)
            self.body = nn.Sequential(*[RRDB(num_feat, num_grow_ch) for _ in range(num_block)])
            self.conv_body = nn.Conv2d(num_feat, num_feat, 3, 1, 1, bias=True)

            self.conv_up1 = nn.Conv2d(num_feat, num_feat, 3, 1, 1, bias=True)
            self.conv_up2 = nn.Conv2d(num_feat, num_feat, 3, 1, 1, bias=True)
            self.conv_hr = nn.Conv2d(num_feat, num_feat, 3, 1, 1, bias=True)
            self.conv_last = nn.Conv2d(num_feat, num_out_ch, 3, 1, 1, bias=True)
            self.lrelu = nn.LeakyReLU(negative_slope=0.2, inplace=True)

        def forward(self, x):
            feat = self.conv_first(x)
            body_feat = self.conv_body(self.body(feat))
            feat = feat + body_feat

            feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
            feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
            out = self.conv_last(self.lrelu(self.conv_hr(feat)))
            return out


class ImageEnhancementAdapter:
    """
    Adapter responsible for executing low-level image enhancement & upscaling operations.
    Supports Real-ESRGAN Deep Learning AI Super-Resolution Engine, PyTorch CUDA acceleration,
    and an isolated, high-quality Advanced Computer Vision Engine (Bilateral Filter + Unsharp Masking).
    """

    def __init__(self, policy: Any):
        self.policy = policy
        self.torch_available = TORCH_AVAILABLE
        self.cuda_available = CUDA_AVAILABLE
        self.pytorch_model = None
        self.device = "cuda" if CUDA_AVAILABLE else "cpu"
        
        self._init_realesrgan_model()

    def _init_realesrgan_model(self):
        if not self.torch_available:
            return

        model_name = "RealESRGAN_x4plus.pth"
        d_app_model = D_APPLICATIONS_ROOT / "models" / model_name
        local_model = SERVICE_ROOT / "models" / model_name

        model_path = None
        if d_app_model.exists():
            model_path = d_app_model
        elif local_model.exists():
            model_path = local_model

        if model_path and model_path.exists():
            try:
                state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
                if "params_ema" in state_dict:
                    state_dict = state_dict["params_ema"]
                elif "params" in state_dict:
                    state_dict = state_dict["params"]

                model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
                model.load_state_dict(state_dict, strict=True)
                model.to(self.device)
                model.eval()
                self.pytorch_model = model
                logger.info(f"Real-ESRGAN PyTorch model loaded successfully from {model_path}")
            except Exception as e:
                logger.warning(f"Failed to load Real-ESRGAN model at {model_path}: {e}")
                self.pytorch_model = None

    def is_cuda_accelerated(self) -> bool:
        return self.cuda_available

    def process(
        self,
        image_bytes: bytes,
        scale: int = 2,
        sharpen: bool = True,
        restore_faces: bool = False,
        denoise: bool = False,
        contrast_restoration: bool = True,
        anti_aliasing: bool = True,
        use_ai_engine: bool = True,
        output_format: str = "PNG"
    ) -> Tuple[bytes, int, int, str, bool]:
        """
        Enhance/Upscale an image buffer with Real-ESRGAN Deep Learning AI Super-Resolution and Anti-Aliased Bilateral Filtering.
        Returns:
            (output_bytes, new_width, new_height, execution_mode, ai_accelerated)
        """
        if scale not in self.policy.allowedScales:
            scale = self.policy.defaultScale

        # Load image with PIL
        try:
            image = Image.open(io.BytesIO(image_bytes))
            orig_mode = image.mode
            if orig_mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid image format: {str(e)}")

        orig_w, orig_h = image.size
        new_w = orig_w * scale
        new_h = orig_h * scale

        # Limit check on output dimensions
        if new_w * new_h > self.policy.maxOutputPixels:
            logger.error(
                f"[IMAGE_ENHANCE_REJECTED] Target dimensions {new_w}x{new_h}={new_w * new_h} px "
                f"exceed maxOutputPixels limit of {self.policy.maxOutputPixels} px"
            )
            raise ValueError(
                f"Output image dimensions ({new_w}x{new_h}={new_w * new_h} px) "
                f"exceed policy limit of {self.policy.maxOutputPixels} pixels."
            )

        logger.info(
            f"[IMAGE_ENHANCE_START] Input: {orig_w}x{orig_h} px ({len(image_bytes)} bytes), "
            f"Target: {new_w}x{new_h} px ({scale}x), AI_Engine={use_ai_engine}, Sharpen={sharpen}"
        )

        execution_mode = "advanced_cv_lanczos"
        ai_used = False
        processed_image = None
        t0 = time.time()

        # 1. Try Real-ESRGAN Deep Learning AI Super-Resolution if enabled
        if use_ai_engine and getattr(self.policy, "aiEngineEnabled", True) and self.pytorch_model:
            try:
                logger.info(f"[AI_INFERENCE] Running Real-ESRGAN Super-Resolution on device='{self.device}'...")
                ai_t0 = time.time()
                processed_image = self._run_realesrgan_pytorch(image, scale)
                ai_duration_ms = (time.time() - ai_t0) * 1000.0
                execution_mode = f"real_esrgan_ai_{scale}x"
                ai_used = True
                logger.info(f"[AI_INFERENCE_COMPLETE] Real-ESRGAN finished in {ai_duration_ms:.2f}ms")
            except Exception as e:
                logger.warning(f"[AI_INFERENCE_FALLBACK] Real-ESRGAN execution fallback: {e}")
                processed_image = None

        # 2. Advanced Computer Vision Fallback Engine (Lanczos Resampling)
        if processed_image is None:
            logger.info(f"[CV_FALLBACK] Resampling using Lanczos {orig_w}x{orig_h} -> {new_w}x{new_h} px")
            processed_image = image.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
            execution_mode = f"advanced_cv_lanczos_{scale}x"

        # Convert to OpenCV numpy BGR array for Advanced Anti-Aliasing & Edge-Preserving Filters
        np_img = np.array(processed_image)
        has_alpha = np_img.shape[2] == 4 if len(np_img.shape) == 3 else False
        if has_alpha:
            bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGBA2BGR)
            alpha_channel = np_img[:, :, 3]
        else:
            bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

        # 3. Edge-Preserving Bilateral Filtering (ONLY for non-AI fallback mode to prevent washing out AI details)
        if not ai_used and (anti_aliasing or getattr(self.policy, "enableAntiAliasing", True)):
            r = getattr(self.policy, "bilateralFilterRadius", 9)
            logger.info(f"[FILTER] Applying Bilateral Filter (radius={r}, sigma=75)")
            bgr_img = cv2.bilateralFilter(bgr_img, d=r, sigmaColor=75, sigmaSpace=75)

        # 4. CLAHE (Contrast Limited Adaptive Histogram Equalization) - Enhances micro-texture contrast & razor-sharp details
        lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8))
        cl_chan = clahe.apply(l_chan)
        limg = cv2.merge((cl_chan, a_chan, b_chan))
        bgr_img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        # 5. Denoise Filter
        if denoise:
            logger.info("[FILTER] Applying Non-Local Means Denoising")
            bgr_img = cv2.fastNlMeansDenoisingColored(bgr_img, None, 3, 3, 7, 21)

        # Convert back to PIL Image
        if has_alpha:
            rgba_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGBA)
            rgba_img[:, :, 3] = alpha_channel
            processed_image = Image.fromarray(rgba_img)
        else:
            rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
            processed_image = Image.fromarray(rgb_img)

        # 6. Edge-Adaptive Unsharp Masking (USM) (Radius=1 for fine pixel sharpness, zero wide halos)
        if sharpen:
            radius = getattr(self.policy, "unsharpMaskRadius", 1)
            percent = getattr(self.policy, "unsharpMaskPercent", 200)
            threshold = getattr(self.policy, "unsharpMaskThreshold", 1)
            processed_image = processed_image.filter(
                ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold)
            )

        # 7. Contrast Restoration
        if contrast_restoration:
            enhancer = ImageEnhance.Contrast(processed_image)
            processed_image = enhancer.enhance(1.06)

        # Encode output
        output_buffer = io.BytesIO()
        fmt = output_format.upper()
        if fmt not in ("PNG", "JPEG", "WEBP"):
            fmt = "PNG"

        if fmt == "JPEG" and processed_image.mode == "RGBA":
            processed_image = processed_image.convert("RGB")

        processed_image.save(output_buffer, format=fmt, quality=95)
        output_bytes = output_buffer.getvalue()
        total_duration_ms = (time.time() - t0) * 1000.0

        logger.info(
            f"[IMAGE_ENHANCE_COMPLETE] Output: {new_w}x{new_h} px ({len(output_bytes)} bytes), "
            f"Mode={execution_mode}, AI_Used={ai_used}, Duration={total_duration_ms:.2f}ms"
        )

        return output_bytes, new_w, new_h, execution_mode, ai_used

    def _run_realesrgan_pytorch(self, pil_image: Image.Image, scale: int) -> Image.Image:
        """Runs Real-ESRGAN PyTorch inference on a PIL Image."""
        if not self.pytorch_model:
            raise RuntimeError("Real-ESRGAN PyTorch model uninitialized.")

        rgb_img = pil_image.convert("RGB")
        np_img = np.array(rgb_img, dtype=np.float32) / 255.0
        # HWC to NCHW [1, 3, H, W]
        t_in = torch.from_numpy(np.transpose(np_img, (2, 0, 1))).unsqueeze(0).to(self.device)

        with torch.no_grad():
            t_out = self.pytorch_model(t_in).squeeze(0).clamp(0.0, 1.0)

        np_out = (t_out.permute(1, 2, 0).cpu().numpy() * 255.0).astype(np.uint8)
        out_img = Image.fromarray(np_out)

        # If requested scale is 2x and model output is 4x, resize smoothly to target 2x & recover fine detail
        target_w, target_h = pil_image.width * scale, pil_image.height * scale
        if out_img.width != target_w or out_img.height != target_h:
            out_img = out_img.resize((target_w, target_h), resample=Image.Resampling.LANCZOS)
            out_img = out_img.filter(ImageFilter.UnsharpMask(radius=1, percent=140, threshold=0))

        return out_img
