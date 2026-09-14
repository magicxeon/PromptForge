import io
import sys
import time
import json
import base64
import requests
from pathlib import Path
from PIL import Image

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from domain.image_enhancement_manager import ImageEnhancementManager, enhance_image
from adapters.image_enhancement_adapter import ImageEnhancementAdapter
from config.service_config import load_post_processing_config

def create_sample_png(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_adapter_and_manager():
    print("==================================================")
    print("   Image Enhancement & Upscaling Unit Test Suite  ")
    print("==================================================")
    
    config = load_post_processing_config()
    enhancement_policy = config.imageEnhancement
    
    sample_bytes = create_sample_png(100, 100)
    
    # Test 1: Adapter 2x upscaling
    adapter = ImageEnhancementAdapter(policy=enhancement_policy)
    out_bytes, w, h, mode, cuda = adapter.process(sample_bytes, scale=2, sharpen=True)
    print(f"[1] Adapter 2x Upscale: {w}x{h} px, mode={mode}, cuda={cuda}")
    assert w == 200 and h == 200
    assert len(out_bytes) > 0

    # Test 2: Adapter 4x upscaling
    out_bytes_4x, w4, h4, mode4, _ = adapter.process(sample_bytes, scale=4, sharpen=True)
    print(f"[2] Adapter 4x Upscale: {w4}x{h4} px, mode={mode4}")
    assert w4 == 400 and h4 == 400

    # Test 3: Manager process & hashing
    manager = ImageEnhancementManager(policy=enhancement_policy)
    res = manager.process(sample_bytes, scale=2, sharpen=True, denoise=True)
    print(f"[3] Manager Process: Target {res['targetWidth']}x{res['targetHeight']}, outputHash={res['outputHash'][:12]}...")
    assert res["targetWidth"] == 200
    assert res["targetHeight"] == 200
    assert res["scale"] == 2
    assert "bytesBase64" in res
    assert res["inputHash"] != res["outputHash"]

    print("   UNIT TESTS PASSED CLEANLY!\n")

def test_api_endpoints():
    print("==================================================")
    print("   Image Enhancement HTTP Integration Test Suite   ")
    print("==================================================")
    
    config = load_post_processing_config()
    base_url = f"http://{config.runtime.host}:{config.runtime.port}"
    token = config.runtime.internalToken
    headers = {
        "X-Post-Processing-Token": token,
        "Content-Type": "application/octet-stream"
    }

    sample_bytes = create_sample_png(120, 80)

    # 1. Capabilities Check
    res = requests.get(f"{base_url}/v1/capabilities", headers={"X-Post-Processing-Token": token})
    print(f"[1] GET /v1/capabilities status: {res.status_code}")
    assert res.status_code == 200
    cap_data = res.json()
    assert "image_upscale" in cap_data["operations"]
    assert cap_data["operations"]["image_upscale"]["available"] is True
    print("    Capability 'image_upscale' is active!")

    # 2. Sync REST Endpoint: POST /v1/image-upscale
    upscale_headers = {
        **headers,
        "X-Scale": "2",
        "X-Sharpen": "true"
    }
    res = requests.post(f"{base_url}/v1/image-upscale", headers=upscale_headers, data=sample_bytes)
    print(f"[2] POST /v1/image-upscale status: {res.status_code}, response: {res.text}")
    assert res.status_code == 200
    up_data = res.json()
    assert up_data["targetWidth"] == 240
    assert up_data["targetHeight"] == 160
    print(f"    Sync Upscale Successful: {up_data['originalWidth']}x{up_data['originalHeight']} -> {up_data['targetWidth']}x{up_data['targetHeight']}")

    # 3. Async Job Protocol: POST /v1/jobs (operation: "image.upscale")
    job_req = {
        "operation": "image.upscale",
        "inputBase64": base64.b64encode(sample_bytes).decode("ascii"),
        "options": {
            "scale": 4,
            "sharpen": True,
            "denoise": True
        }
    }
    res = requests.post(
        f"{base_url}/v1/jobs",
        headers={"X-Post-Processing-Token": token, "Content-Type": "application/json"},
        json=job_req
    )
    print(f"[3] POST /v1/jobs status: {res.status_code}")
    assert res.status_code == 202
    job_info = res.json()
    job_id = job_info["jobId"]
    print(f"    Created Job ID: {job_id}")

    # Poll Job Status
    completed = False
    for attempt in range(10):
        time.sleep(0.3)
        status_res = requests.get(f"{base_url}/v1/jobs/{job_id}", headers={"X-Post-Processing-Token": token})
        assert status_res.status_code == 200
        st = status_res.json()
        print(f"    Polling status ({attempt + 1}): {st['status']}")
        if st["status"] == "completed":
            completed = True
            break
        elif st["status"] == "failed":
            raise RuntimeError(f"Job failed: {st.get('error')}")

    assert completed is True

    # Get Job Result
    result_res = requests.get(f"{base_url}/v1/jobs/{job_id}/result", headers={"X-Post-Processing-Token": token})
    print(f"[4] GET /v1/jobs/{job_id}/result status: {result_res.status_code}")
    assert result_res.status_code == 200
    job_result = result_res.json()
    assert job_result["targetWidth"] == 480
    assert job_result["targetHeight"] == 320
    print(f"    Async Job Result Verified: 4x Upscale to {job_result['targetWidth']}x{job_result['targetHeight']} px!")

    print("\n==================================================")
    print("   ALL IMAGE ENHANCEMENT TESTS PASSED 100%!      ")
    print("==================================================")

if __name__ == "__main__":
    test_adapter_and_manager()
    test_api_endpoints()
