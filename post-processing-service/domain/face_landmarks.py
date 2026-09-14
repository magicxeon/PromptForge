import hashlib
import io
from typing import Dict, Any, Optional
from PIL import Image
from domain.faceless_previs import HTTPException_Like, valid_face

def detect_face_landmarks(
    bytes_data: bytes,
    detector: Any,
    expected_faces: Optional[int],
    policy: Any
) -> Dict[str, Any]:
    if not isinstance(bytes_data, bytes) or not bytes_data or len(bytes_data) > policy.maxInputBytes:
        raise HTTPException_Like("faceless_input_size_invalid", "Image exceeds the supported size.", 413)

    if expected_faces is not None and (not isinstance(expected_faces, int) or expected_faces < 1 or expected_faces > policy.maxFaces):
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

    try:
        faces = detector.detect(bytes_data)
    except Exception as e:
        if hasattr(e, "code"):
            raise e
        raise HTTPException_Like("faceless_detection_failed", "Face detection failed.", 422)

    if expected_faces is not None and (not isinstance(faces, list) or len(faces) != expected_faces):
        raise HTTPException_Like("faceless_face_count_mismatch", "Not all expected faces were detected.", 422)

    input_hash = hashlib.sha256(bytes_data).hexdigest()

    return {
        "width": width,
        "height": height,
        "faceCount": len(faces) if isinstance(faces, list) else 0,
        "inputHash": input_hash,
        "modelHash": policy.model.sha256,
        "policyVersion": policy.policyVersion,
        "faces": faces
    }
