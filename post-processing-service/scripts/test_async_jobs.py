import base64
import json
import time
import urllib.request
import urllib.error
from PIL import Image, ImageDraw
import io

BASE_URL = "http://127.0.0.1:6501"
TOKEN = "dev-internal-token-change-in-production-32bytes"

def create_sample_face_png() -> bytes:
    img = Image.new("RGB", (512, 512), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    # Head
    draw.ellipse([180, 100, 330, 320], fill=(230, 190, 160))
    # Eyes
    draw.ellipse([210, 170, 235, 190], fill=(40, 40, 40))
    draw.ellipse([275, 170, 300, 190], fill=(40, 40, 40))
    # Mouth
    draw.ellipse([230, 250, 280, 275], fill=(180, 70, 70))
    
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()

def http_request(url: str, method: str = "GET", payload: dict = None, headers: dict = None) -> tuple:
    req_headers = {"X-Post-Processing-Token": TOKEN}
    if headers:
        req_headers.update(headers)
        
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed

def run_tests():
    print("==================================================")
    print("   Post-Processing Service Async Jobs Test Suite  ")
    print("==================================================")

    # 1. Health check
    status_code, body = http_request(f"{BASE_URL}/health")
    print(f"[1] GET /health -> Status {status_code}: {body}")
    assert status_code == 200, "Health check failed!"

    # Create sample image
    sample_bytes = create_sample_face_png()
    sample_b64 = base64.b64encode(sample_bytes).decode("ascii")

    # 2. POST /v1/jobs (Create Async Job: face_landmarks)
    print("\n[2] Submitting Async Job (image.face_landmarks)...")
    idem_key = f"test_idempotency_key_{int(time.time())}"
    payload = {
        "operation": "image.face_landmarks",
        "inputBase64": sample_b64,
        "options": {"expectedFaces": 1},
        "idempotencyKey": idem_key
    }
    status_code, body = http_request(f"{BASE_URL}/v1/jobs", method="POST", payload=payload)
    print(f"    Status {status_code}: {body}")
    assert status_code == 202, f"Expected 202 Accepted, got {status_code}"
    job_id = body["jobId"]
    assert body["status"] == "queued"

    # 3. Poll GET /v1/jobs/{id}
    print(f"\n[3] Polling GET /v1/jobs/{job_id}...")
    completed = False
    for attempt in range(10):
        time.sleep(0.5)
        status_code, job_info = http_request(f"{BASE_URL}/v1/jobs/{job_id}")
        print(f"    Attempt {attempt+1}: Status={job_info.get('status')}, Progress={job_info.get('progress')}")
        if job_info.get("status") == "completed":
            completed = True
            break
        elif job_info.get("status") in ("failed", "cancelled"):
            print(f"    Job ended with status: {job_info.get('status')}, Error: {job_info.get('error')}")
            break

    assert completed or job_info.get("status") in ("completed", "failed"), "Job polling timeout!"

    # 4. Fetch GET /v1/jobs/{id}/result
    print(f"\n[4] Fetching GET /v1/jobs/{job_id}/result...")
    status_code, result = http_request(f"{BASE_URL}/v1/jobs/{job_id}/result")
    print(f"    Status {status_code}: faceCount={result.get('faceCount')}, width={result.get('width')}, height={result.get('height')}")
    assert status_code == 200, f"Expected 200 OK result, got {status_code}"

    # 5. Idempotency Check (Submit exact same idempotency key)
    print("\n[5] Testing Idempotency Deduplication...")
    status_code, dupe_body = http_request(f"{BASE_URL}/v1/jobs", method="POST", payload=payload)
    print(f"    Status {status_code}: {dupe_body}")
    assert status_code == 202, f"Expected 202 Accepted for duplicate key, got {status_code}"
    assert dupe_body["jobId"] == job_id, "Idempotency failed to return original job ID!"
    assert dupe_body.get("isDuplicate") is True, "Expected isDuplicate: True!"

    # 6. Cancellation Check (Create new job and cancel it immediately)
    print("\n[6] Testing Job Cancellation...")
    cancel_payload = {
        "operation": "image.faceless_previs",
        "inputBase64": sample_b64,
        "options": {"expectedFaces": 1}
    }
    status_code, cancel_job = http_request(f"{BASE_URL}/v1/jobs", method="POST", payload=cancel_payload)
    new_job_id = cancel_job["jobId"]
    print(f"    Created new job: {new_job_id}")
    
    # Cancel immediately
    status_code, cancel_res = http_request(f"{BASE_URL}/v1/jobs/{new_job_id}", method="DELETE")
    print(f"    DELETE /v1/jobs/{new_job_id} -> Status {status_code}: {cancel_res}")
    assert status_code == 200, "Cancellation request failed!"

    # 7. Check 404 for non-existent job
    print("\n[7] Testing 404 for non-existent job...")
    status_code, error_body = http_request(f"{BASE_URL}/v1/jobs/job_invalid_99999")
    print(f"    GET /v1/jobs/job_invalid_99999 -> Status {status_code}: {error_body}")
    assert status_code == 404, f"Expected 404 Not Found, got {status_code}"

    print("\n==================================================")
    print("   ALL ASYNC JOB PROTOCOL TESTS PASSED CLEANLY!   ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
