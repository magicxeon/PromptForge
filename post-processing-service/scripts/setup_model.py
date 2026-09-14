import hashlib
import os
import sys
import urllib.request
from pathlib import Path

# Add parent dir to sys.path to import config
SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from config.service_config import load_post_processing_config, D_APPLICATIONS_ROOT

def ensure_face_model(config=None) -> bool:
    if config is None:
        config = load_post_processing_config()
        
    model_policy = config.policy.model
    target_path = config.runtime.modelPath
    
    # Ensure directory exists under D:\applications\momelo-post-processing\models\ or target
    target_dir = target_path.parent
    target_dir.mkdir(parents=True, exist_ok=True)
    
    if target_path.exists():
        with open(target_path, "rb") as f:
            content = f.read()
        if hashlib.sha256(content).hexdigest() == model_policy.sha256:
            print(f"Face Landmarker model ready at: {target_path}")
            return True
        else:
            raise ValueError(f"Local model Checksum changed at {target_path}; refusing to overwrite.")
            
    print(f"Downloading Face Landmarker model to {target_path}...")
    temp_path = target_path.with_suffix(".partial")
    
    try:
        req = urllib.request.Request(model_policy.downloadUrl, headers={"User-Agent": "Momelo-Post-Processing/1.0"})
        with urllib.request.urlopen(req, timeout=model_policy.downloadTimeoutMs / 1000) as response:
            if response.status != 200:
                raise ValueError(f"Model download HTTP error: {response.status}")
            data = response.read()
            
        if len(data) > model_policy.maxDownloadBytes:
            raise ValueError(f"Model download size {len(data)} exceeds limit {model_policy.maxDownloadBytes}")
            
        actual_hash = hashlib.sha256(data).hexdigest()
        if actual_hash != model_policy.sha256:
            raise ValueError(f"Model checksum mismatch: expected {model_policy.sha256}, got {actual_hash}")
            
        with open(temp_path, "wb") as f:
            f.write(data)
            
        temp_path.replace(target_path)
        print(f"Face Landmarker model successfully downloaded and verified at {target_path}")
        return True
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

def ensure_upscale_model(config=None) -> bool:
    if config is None:
        config = load_post_processing_config()

    enhancement_policy = getattr(config, "imageEnhancement", None)
    if not enhancement_policy or not enhancement_policy.model:
        print("Upscale model policy not configured.")
        return False

    model_policy = enhancement_policy.model
    models_dir = D_APPLICATIONS_ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    target_path = models_dir / model_policy.fileName

    if target_path.exists():
        print(f"Real-ESRGAN ONNX model ready at: {target_path}")
        return True

    print(f"Checking Real-ESRGAN ONNX model at {target_path}...")
    temp_path = target_path.with_suffix(".partial")

    try:
        req = urllib.request.Request(model_policy.downloadUrl, headers={"User-Agent": "Momelo-Post-Processing/1.0"})
        with urllib.request.urlopen(req, timeout=model_policy.downloadTimeoutMs / 1000) as response:
            if response.status != 200:
                raise ValueError(f"Model download HTTP error: {response.status}")
            data = response.read()

        if len(data) > model_policy.maxDownloadBytes:
            raise ValueError(f"Model download size {len(data)} exceeds limit {model_policy.maxDownloadBytes}")

        with open(temp_path, "wb") as f:
            f.write(data)

        temp_path.replace(target_path)
        print(f"Real-ESRGAN ONNX model successfully prepared at {target_path}")
        return True
    except Exception as ex:
        print(f"Warning: AI model download unavailable ({ex}); isolated Advanced CV fallback will be used.")
        return False
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

if __name__ == "__main__":
    try:
        ensure_face_model()
        ensure_upscale_model()
    except Exception as e:
        print(f"Error preparing models: {e}", file=sys.stderr)
        sys.exit(1)
