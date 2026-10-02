# Post-Processing Service API Testing Guide (cURL & Postman)

คู่มือสำหรับการทดสอบ **Post-Processing Microservice API** (ทุก Endpoint ส่งคืนข้อมูลในรูปแบบ **JSON Format 100%**)

---

## 1. ข้อมูลพื้นฐานของระบบ (Service Basics)

- **Base URL**: `http://127.0.0.1:6501`
- **Response Format**: `application/json; charset=utf-8` **ทุก Endpoint**
- **Authentication**: ทุก Endpoint ใน `/v1/*` ต้องแนบ Header:
  - `x-post-processing-token: <INTERNAL_TOKEN>` (ค่าเริ่มต้นในการพัฒนา: `dev-internal-token-change-in-production-32bytes`)
- **การเริ่มบริการแบบแยกอิสระ (Start Standalone Service)**:
  ```bash
  # รันจาก Root Directory (d:\development\ModelPromptForge)
  node post-processing-service/scripts/start-service.mjs

  # หรือดับเบิลคลิกไฟล์ Batch
  post-processing-service/scripts/start-service.bat
  ```

---

## 2. ตาราง API Endpoints (JSON Only)

| Method | Endpoint | Auth Required | Request Body / Type | Response Format | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` หรือ `/v1/health` | No | None | `JSON` | ตรวจสอบสถานะการทำงานกระบวนการ (Liveness Probe) |
| `GET` | `/v1/capabilities` | Yes (`token`) | None | `JSON` | ตรวจสอบฟีเจอร์และสถานะความพร้อมของ Model |
| `GET` | `/v1/metrics` | Yes (`token`) | None | `JSON` | ดึงข้อมูล Telemetry & Operations (Uptime, Memory, Latency, Request Counts) |
| `POST` | `/v1/faceless-previs` | Yes (`token`) | Binary Image | `JSON` | ส่งรูปภาพ binary เพื่อประมวลผล Faceless Previs (คืนค่าเป็น JSON พร้อม `bytesBase64`) |
| `POST` | `/v1/face-landmarks` | Yes (`token`) | Binary Image | `JSON` | ตรวจจับพิกัดใบหน้าบนรูปภาพ binary (คืนค่าเป็น JSON Coordinates) |
| `POST` | `/v1/jobs` | Yes (`token`) | `JSON` (`inputBase64`) | `JSON` | สร้างและจัดคิว Async Processing Job (คืนค่า 202 Accepted + `jobId`) |
| `GET` | `/v1/jobs/{id}` | Yes (`token`) | None | `JSON` | ตรวจสอบสถานะ ความคืบหน้า (Progress/Stage) ของ Async Job |
| `GET` | `/v1/jobs/{id}/result` | Yes (`token`) | None | `JSON` | ดึงผลลัพธ์ฉบับสมบูรณ์ของ Async Job ที่ประมวลผลเสร็จสิ้นแล้ว |
| `DELETE` | `/v1/jobs/{id}` | Yes (`token`) | None | `JSON` | ยกเลิก Async Job ที่กำลังรอดำเนินการ (Transition to `cancelled`) |
| `GET` | `/tts-playground` | No | None | `HTML` | เปิดหน้าเว็บ Interactive Web Test Playground สำหรับทดลองสังเคราะห์เสียงบนบราวเซอร์ |
| `POST` | `/v1/expressive-tts` | Yes (`token`) | `JSON` (`text`, `emotion`, etc.) | `JSON` | สังเคราะห์เสียงใส่อารมณ์ (ChatTTS Engine / Formant Audio Synth) พร้อมคืนค่า `bytesBase64` |

---

## 3. คำสั่ง cURL สำหรับการทดสอบ (cURL Examples)

### 3.1 Health Check (`GET /health`)
```bash
curl -X GET http://127.0.0.1:6501/health
```
**Expected Response (200 OK JSON)**:
```json
{
  "service": "post-processing",
  "status": "running"
}
```

---

### 3.2 Service Capabilities (`GET /v1/capabilities`)
```bash
curl -X GET http://127.0.0.1:6501/v1/capabilities \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes"
```
**Expected Response (200 OK JSON)**:
```json
{
  "apiVersion": "1",
  "operations": {
    "faceless_previs": {
      "available": true,
      "reason": null,
      "policyVersion": "white-previs-v1",
      "modelHash": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
      "maxBytes": 26214400,
      "maxPixels": 16000000,
      "maxFaces": 8
    },
    "face_landmarks": {
      "available": true,
      "reason": null,
      "policyVersion": "white-previs-v1",
      "modelHash": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
      "maxBytes": 26214400,
      "maxPixels": 16000000,
      "maxFaces": 8
    }
  }
}
```

---

### 3.3 Telemetry & Operational Metrics (`GET /v1/metrics`)
```bash
curl -X GET http://127.0.0.1:6501/v1/metrics \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes"
```
**Expected Response (200 OK JSON)**:
```json
{
  "service": "post-processing",
  "uptimeSeconds": 145,
  "memoryUsage": {
    "rssBytes": 85123000,
    "heapTotalBytes": 42000000,
    "heapUsedBytes": 28000000,
    "externalBytes": 1500000
  },
  "requests": {
    "total": 12,
    "successful": 11,
    "failed": 1,
    "activePending": 0
  },
  "performance": {
    "avgProcessingTimeMs": 185,
    "maxProcessingTimeMs": 320
  },
  "capabilities": {
    "faceless_previs": true,
    "face_landmarks": true
  }
}
```

---

### 3.4 Faceless Previs Masking (`POST /v1/faceless-previs`)

> **หมายเหตุ**: ในการส่งภาพไบนารี จะต้องแนบ `x-input-sha256` ที่ตรงกับค่า SHA-256 Hash ของไฟล์ภาพต้นฉบับด้วย ผลลัพธ์จะถูกส่งกลับมาเป็น **JSON Object** ที่มีฟิลด์ `bytesBase64` บรรจุข้อมูลรูปภาพ PNG

#### คำสั่ง cURL บน Linux / macOS (Bash):
```bash
IMAGE_HASH=$(openssl dgst -sha256 sample.png | awk '{print $2}')

curl -X POST http://127.0.0.1:6501/v1/faceless-previs \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes" \
  -H "x-expected-faces: 1" \
  -H "x-input-sha256: $IMAGE_HASH" \
  -H "Content-Type: image/png" \
  --data-binary "@sample.png"
```

#### คำสั่งสำหรับ Windows PowerShell:
```powershell
$hash = (Get-FileHash -Algorithm SHA256 .\sample.png).Hash.ToLower()

Invoke-RestMethod -Uri "http://127.0.0.1:6501/v1/faceless-previs" `
  -Method Post `
  -Headers @{
    "x-post-processing-token" = "dev-internal-token-change-in-production-32bytes";
    "x-expected-faces" = "1";
    "x-input-sha256" = $hash;
  } `
  -ContentType "image/png" `
  -InFile ".\sample.png"
```

**Expected Response (200 OK JSON)**:
```json
{
  "width": 800,
  "height": 600,
  "faceCount": 1,
  "inputHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "outputHash": "f4c2d89a...",
  "policyVersion": "white-previs-v1",
  "modelHash": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  "mimeType": "image/png",
  "bytesBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### 3.5 Face Landmarks Detection (`POST /v1/face-landmarks`)

#### คำสั่ง cURL สำหรับดึงพิกัดใบหน้า JSON (Bash):
```bash
IMAGE_HASH=$(openssl dgst -sha256 sample.png | awk '{print $2}')

curl -X POST http://127.0.0.1:6501/v1/face-landmarks \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes" \
  -H "x-expected-faces: 1" \
  -H "x-input-sha256: $IMAGE_HASH" \
  -H "Content-Type: image/png" \
  --data-binary "@sample.png"
```

**Expected Response (200 OK JSON)**:
```json
{
  "width": 800,
  "height": 600,
  "faceCount": 1,
  "inputHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "modelHash": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  "policyVersion": "white-previs-v1",
  "faces": [
    [
      { "x": 0.452, "y": 0.312, "z": -0.015 },
      { "x": 0.455, "y": 0.350, "z": -0.021 }
    ]
  ]
}
```

---

### 3.6 Async Job Protocol Endpoints (`POST /v1/jobs`, `GET`, `DELETE`)

#### (A) สร้างและจัดคิว Async Job (`POST /v1/jobs`):
```bash
curl -X POST http://127.0.0.1:6501/v1/jobs \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes" \
  -H "x-idempotency-key: key_unique_001" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "image.face_landmarks",
    "inputBase64": "<BASE64_ENCODED_IMAGE_BYTES>",
    "options": { "expectedFaces": 1 }
  }'
```
**Expected Response (202 Accepted JSON)**:
```json
{
  "jobId": "job_1789369110_2dbc01ee",
  "status": "queued",
  "operation": "image.face_landmarks",
  "createdAt": "2026-09-14T06:58:30.585910+00:00",
  "idempotencyKey": "key_unique_001",
  "isDuplicate": false
}
```

#### (B) สอบถามสถานะ Async Job (`GET /v1/jobs/{id}`):
```bash
curl -X GET http://127.0.0.1:6501/v1/jobs/job_1789369110_2dbc01ee \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes"
```
**Expected Response (200 OK JSON)**:
```json
{
  "jobId": "job_1789369110_2dbc01ee",
  "operation": "image.face_landmarks",
  "status": "completed",
  "stage": "completed",
  "progress": 1.0,
  "createdAt": "2026-09-14T06:58:30.585910+00:00",
  "updatedAt": "2026-09-14T06:58:30.650000+00:00",
  "idempotencyKey": "key_unique_001",
  "resultSummary": {
    "width": 512,
    "height": 512,
    "faceCount": 1,
    "inputHash": "..."
  },
  "error": null
}
```

#### (C) ดึงผลลัพธ์ฉบับเต็ม (`GET /v1/jobs/{id}/result`):
```bash
curl -X GET http://127.0.0.1:6501/v1/jobs/job_1789369110_2dbc01ee/result \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes"
```

#### (D) ยกเลิก Async Job (`DELETE /v1/jobs/{id}`):
```bash
curl -X DELETE http://127.0.0.1:6501/v1/jobs/job_1789369110_2dbc01ee \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes"
```

---

### 3.7 Image Enhancement & Upscaling (`POST /v1/image-upscale`, `POST /v1/image-enhance`)

#### (A) Synchronous REST Upscale (2x / 4x):
```bash
curl -X POST http://127.0.0.1:6501/v1/image-upscale \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes" \
  -H "x-scale: 2" \
  -H "x-sharpen: true" \
  -H "Content-Type: image/png" \
  --data-binary "@sample.png"
```
**Expected Response (200 OK JSON)**:
```json
{
  "originalWidth": 120,
  "originalHeight": 80,
  "targetWidth": 240,
  "targetHeight": 160,
  "scale": 2,
  "sharpen": true,
  "restoreFaces": false,
  "denoise": false,
  "contrastRestoration": true,
  "executionMode": "pil_lanczos_2x",
  "cudaAccelerated": false,
  "inputHash": "ac4173b3387160e2...",
  "outputHash": "f2fa2c0cbcdc8c32...",
  "policyVersion": "enhance-v1",
  "mimeType": "image/png",
  "bytesBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### (B) Async Job Upscale Protocol (`POST /v1/jobs`):
```bash
curl -X POST http://127.0.0.1:6501/v1/jobs \
  -H "x-post-processing-token: dev-internal-token-change-in-production-32bytes" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "image.upscale",
    "inputBase64": "<BASE64_ENCODED_IMAGE>",
    "options": {
      "scale": 4,
      "sharpen": true,
      "denoise": true
    }
  }'
```


---

## 4. ขั้นตอนการทดสอบผ่านโปรแกรม Postman (Step-by-Step Postman Guide)

### ขั้นตอนที่ 1: Import Collection เข้า Postman
1. เปิดโปรแกรม Postman
2. กดปุ่ม **Import** (บริเวณมุมซ้ายบน)
3. เลือกไฟล์ `d:\development\ModelPromptForge\post-processing-service\post-processing-service.postman_collection.json`
4. Postman จะแสดง Collection ชื่อ **"ModelPromptForge - Post-Processing Service"**

### ขั้นตอนที่ 2: ตั้งค่า Variables
1. คลิกที่ชื่อ Collection **"ModelPromptForge - Post-Processing Service"**
2. ไปที่แท็บ **Variables**
3. ตรวจสอบค่า:
   - `baseUrl`: `http://127.0.0.1:6501`
   - `internalToken`: `dev-internal-token-change-in-production-32bytes`
   - `inputSha256`: ใส่ SHA-256 Hash ของไฟล์ภาพที่คุณต้องการทดสอบ

### ขั้นตอนที่ 3: วิธีหาค่า SHA-256 ของรูปภาพเพื่อใส่ใน Postman
**คำสั่งบน Windows PowerShell**:
```powershell
(Get-FileHash -Algorithm SHA256 .\your_image.png).Hash.ToLower()
```
นำข้อความ SHA-256 Hex (64 ตัวอักษร) ที่ได้ไปวางใน **Header `x-input-sha256`**

### ขั้นตอนที่ 4: การแนบไฟล์รูปภาพใน Request (Binary Mode)
1. ใน Postman เลือก Request **"04. Faceless Previs"** หรือ **"05. Face Landmarks"**
2. ไปที่แท็บ **Body** -> เลือกประเภทเป็น **binary**
3. กดปุ่ม **Select File** แล้วเลือกไฟล์ภาพ PNG/JPEG/WebP ที่คุณต้องการทดสอบ
4. ไปที่แท็บ **Headers** -> ตรวจสอบว่า `x-input-sha256` มีค่าตรงกับไฟล์ภาพที่เลือก
5. กดปุ่ม **Send**

### ขั้นตอนที่ 5: การดูผลลัพธ์ (JSON Response)
- ทุก Request จะคืนค่าเป็น **JSON Object** (`Content-Type: application/json; charset=utf-8`)
- สำหรับ Request `/v1/faceless-previs` ข้อมูลรูปภาพ PNG จะถูกแนบมาในฟิลด์ `bytesBase64`

---

## 4. คำสั่ง cURL สำหรับ Expressive TTS (`POST /v1/expressive-tts`)

```bash
curl -X POST http://127.0.0.1:6501/v1/expressive-tts \
  -H "X-Post-Processing-Token: dev-internal-token-change-in-production-32bytes" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "สวัสดีครับ [laughter] ยินดีต้อนรับสู่ระบบสังเคราะห์เสียงใส่อารมณ์ [uv_break] ลองฟังเสียงได้เลยครับ",
    "voiceSeed": 42,
    "emotion": "happy",
    "speed": 1.0,
    "temperature": 0.3,
    "outputFormat": "WAV"
  }'
```

**Expected Response (200 OK JSON)**:
```json
{
  "bytesBase64": "UklGRiX/AABXQVZFZm10...",
  "text": "สวัสดีครับ [laughter] ยินดีต้อนรับสู่ระบบสังเคราะห์เสียงใส่อารมณ์...",
  "voiceSeed": 42,
  "emotion": "happy",
  "speed": 1.0,
  "temperature": 0.3,
  "sampleRate": 24000,
  "durationSeconds": 4.84,
  "aiEngineUsed": false,
  "executionMode": "expressive_formant_synth",
  "inputHash": "eee3d4a83edd...",
  "outputHash": "478dde941b69...",
  "policyVersion": "tts-v1",
  "mimeType": "audio/wav"
}
```

## Dialogue audio POC (Postman, local only)

This section describes the two opt-in speech operations. Existing image and TTS
endpoints above are unchanged. Run `scripts/start-dialogue-poc.bat` with a working
Python environment (`VENV_DIR` may override its default), FFmpeg and FFprobe on
`PATH`. It binds to `127.0.0.1:6501`. If the port is occupied, set
`POST_PROCESSING_PORT` before launch. `GET /v1/capabilities` reports separate
readiness for `audio.dialogue_repair` and `audio.voice_conversion`.

If startup prints `Unable to create process`, the existing venv launcher cannot
find its original Python installation. This is different from a missing package:
do not reinstall the already-installed packages. Point `VENV_DIR` to another
working venv, or explicitly repair the existing Python 3.10 venv with a known
working base interpreter of the **same minor version**:

```bat
set "POST_PROCESSING_BASE_PYTHON=D:\path\to\Python310\python.exe"
post-processing-service\scripts\start-dialogue-poc.bat --repair-venv
post-processing-service\scripts\start-dialogue-poc.bat
```

Normal startup never modifies the venv. The repair command preserves its
site-packages and verifies that the launcher works afterward. If a package
import itself fails, the batch prints Python's specific error so the operator
can fix that dependency separately.

The first requires a Thai F5-TTS checkpoint plus `f5-tts`; the second requires
OpenVoice V2. Existing installed Thai weights can be reused. Optional explicit
setup commands download all **new** model files/caches below
`D:\development\temp\momelo-models` (nothing is downloaded on service start):

```bat
post-processing-service\scripts\start-dialogue-poc.bat --setup-thai
post-processing-service\scripts\start-dialogue-poc.bat --setup-openvoice
```

Review the model licenses and use only operator-owned or authorized speech.
Keep `POST_PROCESSING_INTERNAL_TOKEN` private. This is a single-operator,
loopback-only POC, not a customer API. Uploaded media and profile metadata are
private scratch under `POST_PROCESSING_DIALOGUE_DATA_ROOT` and expire after 24h.
No mixed music/ambience, overlapping speakers, word alignment, lip-sync editing,
or automatic Thai-pronunciation verification is promised.

Import `post-processing-service.postman_collection.json`. Its Dialogue POC
requests use raw binary upload, **not multipart**. Set the local file in each
request, then run in this order (do not run the whole collection):

1. Upload source MP4 (or WAV/MP3) to `POST /v1/media` with the matching
   `Content-Type`. Upload a clean reference WAV separately, or reuse the source
   media ID. Each response has a media ID, SHA-256, duration and expiry.
2. `POST /v1/voice-profiles` with `referenceMediaId`, `startMs`, `endMs` (3-20s),
   `consentRecordId`, and a transcript matching the reference audio for repair.
   The consent ID identifies the operator's separate rights record; this API
   does not prove voice rights by itself.
3. `POST /v1/jobs` with a fresh `X-Idempotency-Key` and one of these payloads:

```json
{"operation":"audio.dialogue_repair","options":{"sourceMediaId":"media_...","voiceProfileId":"voice_...","consentRecordId":"poc_consent_001","startMs":1200,"endMs":2800,"replacementText":"แบบเดียวกัน"}}
```

```json
{"operation":"audio.voice_conversion","options":{"sourceMediaId":"media_...","voiceProfileId":"voice_...","consentRecordId":"poc_consent_001","segments":[{"startMs":1200,"endMs":2800}]}}
```

4. Poll `GET /v1/jobs/{jobId}` until completed/failed/cancelled, then call
   `GET /v1/jobs/{jobId}/result`. It returns `audioMediaId` and, for video
   sources, `previewMediaId`, timing evidence and hashes. A new attempt needs a
   **new** idempotency key; the same key with changed inputs returns 409.
5. `GET /v1/media/{previewMediaId}` returns authenticated JSON with
   `bytesBase64`. Save that JSON response locally and decode it with:

```powershell
powershell -NoProfile -File post-processing-service\scripts\decode-dialogue-media.ps1 -JsonPath D:\development\temp\preview.json -OutputPath D:\development\temp\preview.mp4
```

6. Listen to the before/after outside Postman and check words, voice, seams,
   timing and lips. Only then call `POST /v1/jobs/{jobId}/adoption`, followed by
   `POST /v1/jobs/{jobId}/export`. Export makes a separate media artifact and
   does not overwrite the source. Download/decode that new ID the same way.
   `DELETE /v1/jobs/{jobId}` cancels a nonterminal job. Deleting a voice profile
   revokes later adoption/export. `DELETE /v1/media/{id}` removes private media.

Audio outside the chosen sample interval is copied exactly in the lossless WAV
editing master. MP4 export re-encodes audio as AAC and copies video where possible;
its audio outside-range bytes are not bit-identical. Speech that cannot fit the
interval within the configured stretch bound fails with `audio_timing_unfit` so
the operator can widen the interval or retry. The API cannot confirm that the
original clip is dialogue-only or that the new voice is perceptually correct.

