import os
import sys
import base64
import requests
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from domain.video_processing_manager import VideoProcessingManager, video_processing_manager
from config.service_config import load_post_processing_config

def test_video_processing_unit():
    print("==================================================")
    print("   Video Processing (P3) Unit Test Suite          ")
    print("==================================================")
    config = load_post_processing_config()
    policy = config.policy

    dummy_video_bytes = b"FAKE_MP4_VIDEO_HEADER_PADDING_BYTES_FOR_UNIT_TEST"

    res = video_processing_manager.process_interpolation(
        video_bytes=dummy_video_bytes,
        target_fps=30,
        output_codec="h264",
        policy=policy
    )
    print(f"[1] Video Interpolation: TargetFPS={res['targetFps']}, Duration={res['durationSeconds']}s, Mode={res['executionMode']}")
    assert res["success"] is True
    assert res["targetFps"] == 30
    assert "bytesBase64" in res

    res_enh = video_processing_manager.process_enhancement(
        video_bytes=dummy_video_bytes,
        denoise_level=0.5,
        sharpen_level=0.5,
        policy=policy
    )
    print(f"[2] Video Enhancement: Duration={res_enh['durationSeconds']}s, Mode={res_enh['executionMode']}")
    assert res_enh["success"] is True
    assert "bytesBase64" in res_enh
    print("   VIDEO PROCESSING UNIT TESTS PASSED CLEANLY!\n")


def test_video_processing_api():
    print("==================================================")
    print("   Video Processing (P3) HTTP API Test Suite      ")
    print("==================================================")
    config = load_post_processing_config()
    base_url = "http://127.0.0.1:6501"
    token = config.runtime.internalToken
    headers = {
        "X-Post-Processing-Token": token,
        "Content-Type": "application/json"
    }

    dummy_b64 = base64.b64encode(b"FAKE_MP4_VIDEO_HEADER_PADDING_BYTES_FOR_API_TEST").decode("utf-8")

    payload_interp = {
        "bytesBase64": dummy_b64,
        "targetFps": 30,
        "outputCodec": "h264",
        "preserveAudio": True
    }
    r1 = requests.post(f"{base_url}/v1/video/interpolate", headers=headers, json=payload_interp)
    print(f"[1] POST /v1/video/interpolate Status: {r1.status_code}")
    assert r1.status_code == 200
    res1 = r1.json()
    assert res1["success"] is True
    assert res1["targetFps"] == 30
    print(f"    Interpolated Video: Duration={res1['durationSeconds']}s, Mode={res1['executionMode']}")

    payload_enh = {
        "bytesBase64": dummy_b64,
        "denoiseLevel": 0.5,
        "sharpenLevel": 0.5
    }
    r2 = requests.post(f"{base_url}/v1/video/enhance", headers=headers, json=payload_enh)
    print(f"[2] POST /v1/video/enhance Status: {r2.status_code}")
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["success"] is True
    print(f"    Enhanced Video: Duration={res2['durationSeconds']}s, Mode={res2['executionMode']}")

    print("\n==================================================")
    print("   ALL VIDEO PROCESSING TESTS PASSED 100%!        ")
    print("==================================================")


if __name__ == "__main__":
    test_video_processing_unit()
    test_video_processing_api()
