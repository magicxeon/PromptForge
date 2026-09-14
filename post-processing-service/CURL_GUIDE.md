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
