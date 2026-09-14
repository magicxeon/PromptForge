import base64
import hashlib
import io
import math
from typing import Dict, Any, List, Tuple
from PIL import Image, ImageDraw

def create_faceless_previs(
    bytes_data: bytes,
    detector: Any,
    expected_faces: int,
    policy: Any
) -> Dict[str, Any]:
    if not isinstance(bytes_data, bytes) or not bytes_data or len(bytes_data) > policy.maxInputBytes:
        raise HTTPException_Like("faceless_input_size_invalid", "Image exceeds the supported size.", 413)

    if not isinstance(expected_faces, int) or expected_faces < 1 or expected_faces > policy.maxFaces:
        raise HTTPException_Like("faceless_expected_faces_invalid", f"Expected visible face count must be 1 to {policy.maxFaces}.", 400)

    try:
        pil_img = Image.open(io.BytesIO(bytes_data))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(bytes_data))
    except Exception:
        raise HTTPException_Like("faceless_image_invalid", "Image could not be decoded.", 400)

    fmt = (pil_img.format or "").lower()
    if fmt not in ("jpeg", "png", "webp") or not pil_img.width or not pil_img.height:
        raise HTTPException_Like("faceless_image_unsupported", "Use a JPEG, PNG or WebP image within configured bounds.", 400)

    width, height = pil_img.width, pil_img.height
    if width * height > policy.maxPixels:
        raise HTTPException_Like("faceless_image_unsupported", "Image exceeds maximum allowed pixels.", 400)

    # Convert image to RGBA PNG for compositing
    rgba_img = pil_img.convert("RGBA")

    # Detect faces
    try:
        faces = detector.detect(bytes_data)
    except Exception as e:
        if hasattr(e, "code"):
            raise e
        raise HTTPException_Like("faceless_detection_failed", "Face detection failed. Source image untouched.", 422)

    if not isinstance(faces, list) or len(faces) != expected_faces or any(not valid_face(f) for f in faces):
        raise HTTPException_Like("faceless_face_count_mismatch", "Not all expected faces were detected. Use another image or Generate options.", 422)

    shapes = [face_shape(f, width, height, policy.mask) for f in faces]
    if any(s["rx"] < policy.minFaceRadiusX or s["ry"] < policy.minFaceRadiusY for s in shapes):
        raise HTTPException_Like("faceless_face_too_small", "A visible face is too small to mask reliably.", 422)

    # Overlay rendering
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    fill_rgba = hex_to_rgba(policy.mask.fill, 255)
    stroke_rgba = hex_to_rgba(policy.mask.guideStroke, int(policy.mask.guideOpacity * 255))
    stroke_width = max(1, int(policy.mask.guideWidth))

    for shape in shapes:
        cx, cy, rx, ry = shape["cx"], shape["cy"], shape["rx"], shape["ry"]
        # Draw white ellipse mask
        draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill_rgba)
        
        # Draw guide line crosshair
        guide_y1 = round(cy - ry * policy.mask.guideHeightScale)
        guide_y2 = round(cy + ry * policy.mask.guideHeightScale)
        guide_x = shape["guideX"]
        draw.line([(guide_x, guide_y1), (guide_x, guide_y2)], fill=stroke_rgba, width=stroke_width)

    # Composite mask overlay onto image
    final_img = Image.alpha_composite(rgba_img, overlay).convert("RGB")
    out_buffer = io.BytesIO()
    final_img.save(out_buffer, format="PNG")
    output_bytes = out_buffer.getvalue()

    input_hash = hashlib.sha256(bytes_data).hexdigest()
    output_hash = hashlib.sha256(output_bytes).hexdigest()

    return {
        "bytes": output_bytes,
        "bytesBase64": base64.b64encode(output_bytes).decode("ascii"),
        "width": width,
        "height": height,
        "faceCount": len(faces),
        "inputHash": input_hash,
        "outputHash": output_hash,
        "policyVersion": policy.policyVersion,
        "modelHash": policy.model.sha256,
        "mimeType": "image/png"
    }

def valid_face(face: List[Dict[str, float]]) -> bool:
    return isinstance(face, list) and len(face) >= 100 and all(
        isinstance(pt, dict) and -0.05 <= pt.get("x", -1) <= 1.05 and -0.05 <= pt.get("y", -1) <= 1.05 for pt in face
    )

def face_shape(face: List[Dict[str, float]], width: int, height: int, mask: Any) -> Dict[str, float]:
    xs = [pt["x"] * width for pt in face]
    ys = [pt["y"] * height for pt in face]
    left, right = min(xs), max(xs)
    top, bottom = min(ys), max(ys)
    cx = round((left + right) / 2, 2)
    cy = round((top + bottom) / 2, 2)
    rx = round((right - left) * mask.radiusXScale, 2)
    ry = round((bottom - top) * mask.radiusYScale, 2)
    guide_x = round(min(right, max(left, (face[1]["x"] if len(face) > 1 else cx / width) * width)), 2)
    return {"cx": cx, "cy": cy, "rx": rx, "ry": ry, "guideX": guide_x}

def hex_to_rgba(hex_str: str, alpha: int = 255) -> Tuple[int, int, int, int]:
    clean = hex_str.lstrip("#")
    if len(clean) == 6:
        r, g, b = int(clean[0:2], 16), int(clean[2:4], 16), int(clean[4:6], 16)
        return (r, g, b, alpha)
    return (247, 245, 241, alpha)

class HTTPException_Like(Exception):
    def __init__(self, code: str, message: str, status_code: int):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)
