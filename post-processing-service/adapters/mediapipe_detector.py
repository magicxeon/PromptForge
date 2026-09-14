import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

class MediaPipeFaceDetector:
    def __init__(self, model_path: Path, policy: Any):
        self.model_path = Path(model_path)
        self.policy = policy
        self.landmarker = None
        self.unavailable_reason: Optional[str] = "not_initialized"

    def initialize(self) -> bool:
        if not MEDIAPIPE_AVAILABLE:
            self.unavailable_reason = "mediapipe_library_missing"
            return False
            
        if not self.model_path.exists():
            self.unavailable_reason = "model_missing"
            return False
            
        with open(self.model_path, "rb") as f:
            data = f.read()
            
        if hashlib.sha256(data).hexdigest() != self.policy.model.sha256:
            self.unavailable_reason = "model_hash_mismatch"
            return False
            
        try:
            base_options = mp_python.BaseOptions(model_asset_path=str(self.model_path))
            options = mp_vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=mp_vision.RunningMode.IMAGE,
                num_faces=self.policy.detector.numFaces,
                min_face_detection_confidence=self.policy.detector.minFaceDetectionConfidence,
                min_face_presence_confidence=self.policy.detector.minFacePresenceConfidence
            )
            self.landmarker = mp_vision.FaceLandmarker.create_from_options(options)
            self.unavailable_reason = None
            return True
        except Exception as e:
            self.unavailable_reason = "model_initialization_failed"
            return False

    def detect(self, image_bytes: bytes) -> List[List[Dict[str, float]]]:
        if self.unavailable_reason or not self.landmarker:
            raise ValueError(f"Face detector unavailable: {self.unavailable_reason}")
            
        import numpy as np
        from PIL import Image
        import io
        
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        np_img = np.array(pil_img)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np_img)
        
        result = self.landmarker.detect(mp_image)
        
        faces = []
        if result and result.face_landmarks:
            for face_landmarks in result.face_landmarks:
                points = [{"x": float(lm.x), "y": float(lm.y), "z": float(lm.z)} for lm in face_landmarks]
                faces.append(points)
                
        return faces

    def close(self):
        if self.landmarker:
            try:
                self.landmarker.close()
            except Exception:
                pass
            self.landmarker = None
