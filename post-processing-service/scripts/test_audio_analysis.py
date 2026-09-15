import os
import sys
import base64
import requests
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from domain.audio_analysis_manager import AudioAnalysisManager, audio_analysis_manager
from config.service_config import load_post_processing_config

def test_audio_analysis_unit():
    print("==================================================")
    print("   Audio Analysis (P4) Unit Test Suite            ")
    print("==================================================")
    config = load_post_processing_config()
    policy = config.policy

    dummy_audio_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    res = audio_analysis_manager.process_transcription(
        audio_bytes=dummy_audio_bytes,
        language="th",
        detect_language=True,
        policy=policy
    )
    print(f"[1] Audio Transcription: Text='{res['text']}', Lang='{res['language']}', Words={len(res['words'])}, Mode={res['executionMode']}")
    assert res["success"] is True
    assert "text" in res
    assert "words" in res

    res_diar = audio_analysis_manager.process_diarization(
        audio_bytes=dummy_audio_bytes,
        max_speakers=4,
        policy=policy
    )
    print(f"[2] Speaker Diarization: SpeakerCount={res_diar['speakerCount']}, Segments={len(res_diar['segments'])}, Mode={res_diar['executionMode']}")
    assert res_diar["success"] is True
    assert res_diar["speakerCount"] >= 1
    print("   AUDIO ANALYSIS UNIT TESTS PASSED CLEANLY!\n")


def test_audio_analysis_api():
    print("==================================================")
    print("   Audio Analysis (P4) HTTP API Test Suite        ")
    print("==================================================")
    config = load_post_processing_config()
    base_url = "http://127.0.0.1:6501"
    token = config.runtime.internalToken
    headers = {
        "X-Post-Processing-Token": token,
        "Content-Type": "application/json"
    }

    dummy_wav_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    dummy_b64 = base64.b64encode(dummy_wav_bytes).decode("utf-8")

    payload_stt = {
        "bytesBase64": dummy_b64,
        "language": "th",
        "detectLanguage": True
    }
    r1 = requests.post(f"{base_url}/v1/audio/transcribe", headers=headers, json=payload_stt)
    print(f"[1] POST /v1/audio/transcribe Status: {r1.status_code}")
    assert r1.status_code == 200
    res1 = r1.json()
    assert res1["success"] is True
    print(f"    Transcribed Text: '{res1['text']}', Lang='{res1['language']}', Mode={res1['executionMode']}")

    payload_diar = {
        "bytesBase64": dummy_b64,
        "maxSpeakers": 4
    }
    r2 = requests.post(f"{base_url}/v1/audio/diarize", headers=headers, json=payload_diar)
    print(f"[2] POST /v1/audio/diarize Status: {r2.status_code}")
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["success"] is True
    print(f"    Diarized Speakers: Count={res2['speakerCount']}, Segments={len(res2['segments'])}, Mode={res2['executionMode']}")

    print("\n==================================================")
    print("   ALL AUDIO ANALYSIS TESTS PASSED 100%!          ")
    print("==================================================")


if __name__ == "__main__":
    test_audio_analysis_unit()
    test_audio_analysis_api()
