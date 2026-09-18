import sys
import time
import requests
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from domain.thonburian_tts_manager import ThonburianTtsManager
from adapters.thonburian_tts_adapter import ThonburianTtsAdapter
from config.service_config import load_post_processing_config

def test_thonburian_tts_unit():
    print("==================================================")
    print("   Thonburian-TTS (F5-TTS) Unit Test Suite        ")
    print("==================================================")

    config = load_post_processing_config()
    policy = config.expressiveTts

    # Test 1: Adapter synthesis with Thonburian-TTS
    adapter = ThonburianTtsAdapter(policy=policy)
    audio_bytes, sr, duration, mode, ai_used, fallback_used, fallback_reason = adapter.synthesize(
        text="สวัสดีครับ นี่คือระบบสังเคราะห์เสียงพากย์ Thonburian-TTS [uv_break] ออกเสียงเป๊ะครับ",
        voice="th-TH-Premwadee",
        cfg_strength=2.0,
        emotion="happy",
        speed=1.0
    )
    print(
        f"[1] Adapter Synthesis: {len(audio_bytes)} bytes, SampleRate={sr}Hz, "
        f"Duration={duration:.2f}s, Mode={mode}, FallbackUsed={fallback_used}"
    )
    assert len(audio_bytes) > 0
    assert sr == 24000
    assert duration >= 0.5
    assert fallback_used is False

    # Test 2: Manager process with CfgStrength
    manager = ThonburianTtsManager(policy=policy)
    res = manager.process(
        text="ทดสอบการแสดงอารมณ์พากย์ภาพยนตร์ [uv_break] ด้วยสถาปัตยกรรม F5-TTS Flow Matching",
        voice="th-TH-Niwat",
        cfg_strength=3.0,
        emotion="excited",
        speed=1.1
    )
    print(
        f"[2] Manager Process: Duration={res['durationSeconds']}s, CfgStrength={res['cfgStrength']}, "
        f"Mode={res['executionMode']}, FallbackUsed={res['fallbackUsed']}"
    )
    assert "bytesBase64" in res
    assert res["sampleRate"] == 24000
    assert res["mimeType"] == "audio/wav"
    assert res["fallbackUsed"] is False

    print("   UNIT TESTS PASSED CLEANLY!\n")

def test_thonburian_tts_api():
    print("==================================================")
    print("   Thonburian-TTS HTTP Integration Test Suite     ")
    print("==================================================")

    config = load_post_processing_config()
    base_url = f"http://{config.runtime.host}:{config.runtime.port}"
    token = config.runtime.internalToken

    headers = {
        "X-Post-Processing-Token": token,
        "Content-Type": "application/json"
    }

    # 1. Test Web Playground Route GET /tts-playground
    pg_res = requests.get(f"{base_url}/tts-playground")
    print(f"[1] GET /tts-playground Status: {pg_res.status_code}")
    assert pg_res.status_code == 200
    assert "Thonburian-TTS" in pg_res.text
    print("    Playground UI is live & accessible!")

    # 2. Test GET /v1/expressive-tts/voices and /v1/thonburian-tts/voices
    voices_res = requests.get(f"{base_url}/v1/thonburian-tts/voices", headers=headers)
    print(f"[2] GET /v1/thonburian-tts/voices Status: {voices_res.status_code}")
    assert voices_res.status_code == 200
    voices_data = voices_res.json()
    assert "voices" in voices_data
    assert len(voices_data["voices"]) >= 3
    print(f"    Thonburian Voice Catalog API returned {len(voices_data['voices'])} native Thai reference voices!")

    # 3. Test API Route POST /v1/thonburian-tts
    req_body = {
        "text": "สวัสดีค่ะ [uv_break] ทดสอบระบบพากย์ภาพยนตร์ Thonburian-TTS ผ่าน API",
        "voice": "th-TH-Premwadee",
        "cfgStrength": 2.5,
        "emotion": "happy",
        "speed": 1.0,
        "outputFormat": "WAV"
    }
    api_res = requests.post(f"{base_url}/v1/thonburian-tts", headers=headers, json=req_body)
    print(f"[3] POST /v1/thonburian-tts Status: {api_res.status_code}")
    assert api_res.status_code == 200
    data = api_res.json()
    assert "bytesBase64" in data
    assert data["sampleRate"] == 24000
    assert data["cfgStrength"] == 2.5
    print(f"    Thonburian Speech Synthesized Successfully: Duration={data['durationSeconds']}s, Hash={data['outputHash'][:12]}...")

    print("\n==================================================")
    print("   ALL THONBURIAN-TTS TESTS PASSED 100%!         ")
    print("==================================================")

if __name__ == "__main__":
    test_thonburian_tts_unit()
    test_thonburian_tts_api()
