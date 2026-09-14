# Post-Processing Service Technical Specification

## 1. Overview & Architecture Boundaries

The **Post-Processing Service** is a lightweight, high-isolation internal microservice dedicated to performing deterministic media transformations and ML-assisted processing on generated media derivatives (e.g., Faceless Previs masking).

```
                      +---------------------------------------+
                      |         Core Server (Express)         |
                      | - Validates Actor Authorization       |
                      | - Fetches Source Asset Bytes          |
                      | - Registers Output Asset Record       |
                      +-------------------+-------------------+
                                          |
                        Loopback HTTP     | x-post-processing-token
                         (127.0.0.1)      | Binary Payload Stream
                                          v
                      +---------------------------------------+
                      |     Post-Processing Service API       |
                      |           (node:http / ESM)           |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
    +-----------------------+                           +-----------------------+
    |   sharp Image Engine  |                           |  MediaPipe Detector   |
    | - Metadata / Format   |                           | - Headless Chromium   |
    | - SVG Composite       |                           | - WASM / CPU Delegate |
    | - Output Encoding     |                           | - Network Blocked     |
    +-----------------------+                           +-----------------------+
```

### Architectural Principles & Guardrails
- **Isolation**: Runs as a separate Node.js ESM process (`node:http`) listening on `127.0.0.1` (default port `6501`). It has **no access** to application databases, user stores, or cloud storage credentials.
- **Stateless & Media-Private**: Communicates strictly via raw binary streams (`image/jpeg`, `image/png`, `image/webp`). Accepts no source URLs, local filesystem paths, Base64 strings, or customer identifiers.
- **Authentication**: Requires the `x-post-processing-token` header on all protected endpoints, validated using constant-time crypto comparison (`timingSafeEqual`).
- **Sandboxed Inference**: Executes MediaPipe Face Landmarker inside a Playwright headless Chromium browser context with all outbound network requests (`route.abort()`) blocked.

---

## 2. Capability Matrix & Operational Phases

| Phase | Capability | Status | Technology / Adapter | Auth / Billing Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **Faceless Previs Pilot** | **Implemented** | `sharp` + MediaPipe Face Landmarker (WASM/CPU) | Internal Token / 0 Credits |
| **P1** | Platform Qualification & Jobs | Open (Req 021) | Async Jobs, Signed Storage Delivery | Core Auth / Ledger Integration |
| **P2** | Image Enhancement & Upscale | Deferred | Pinned Super-Resolution Models | Gated Commercial Qualification |
| **P3** | Basic Video Processing | Deferred | Frame Interpolation / Re-encoding | Gated Commercial Qualification |
| **P4** | Audio Analysis & STT | Deferred | Whisper / Diarization Adapters | Gated Commercial Qualification |
| **P5** | Voice Repair & Lipsync | Deferred | Consent-bound Voice Synthesis | Gated Consent & Commercial Gate |

---

## 3. Technology Stack & Service Layout

```
post-processing-service/
├── .env                     # Local runtime configuration (ignored by git)
├── .env.example             # Documented environment template
├── AGENTS.md                # Subsystem rules and responsibility map
├── README.md                # High-level operational overview
├── SPECIFICATION.md         # Detailed technical specification (this document)
├── setupModel.mjs           # Checksum-verified model preparation script
├── api/
│   └── server.mjs           # HTTP server, authentication, rate limits, error mapping
├── domain/
│   └── facelessPrevis.mjs   # Core image processing, face geometry validation, SVG overlay
├── adapters/
│   └── MediaPipeFaceDetector.mjs # Playwright Chromium sandbox & MediaPipe WASM bridge
├── config/
│   ├── policy.json          # Checked-in non-secret operational policy & limits
│   └── serviceConfig.mjs    # Validated configuration & policy loader
└── models/
    └── face_landmarker.task # Pinned MediaPipe model artifact (SHA-256 verified)
```

---

## 4. Configuration & Policy Enforcement

Configuration is split into **Runtime Environment** (loaded via `config/serviceConfig.mjs`) and **Operational Policy** (loaded from `config/policy.json`).

### 4.1 Runtime Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `POST_PROCESSING_PILOT_ENABLED` | `boolean` | `false` | Enables/disables the Faceless Previs endpoint. |
| `POST_PROCESSING_HOST` | `string` | `127.0.0.1` | Loopback binding address (must be `127.0.0.1`). |
| `POST_PROCESSING_PORT` | `number` | `6501` | Service HTTP port. |
| `POST_PROCESSING_INTERNAL_TOKEN`| `string` | *(generated)* | Minimum 32-byte shared internal token. |
| `POST_PROCESSING_FACE_MODEL_PATH`| `string` | `models/face_landmarker.task` | Path to local model file. |

### 4.2 Policy Rules (`config/policy.json`)

The policy file is strictly validated on startup (`validatePolicy`). Any schema discrepancy causes immediate process exit.

```json
{
  "schemaVersion": 1,
  "facelessPrevis": {
    "policyVersion": "white-previs-v1",
    "maxInputBytes": 26214400,
    "maxPixels": 16000000,
    "maxFaces": 8,
    "maxConcurrentRequests": 4,
    "processingTimeoutMs": 30000,
    "minFaceRadiusX": 8,
    "minFaceRadiusY": 10,
    "mask": {
      "fill": "#f7f5f1",
      "guideStroke": "#b8b5b0",
      "guideWidth": 1.5,
      "guideOpacity": 0.7,
      "radiusXScale": 0.58,
      "radiusYScale": 0.57,
      "guideHeightScale": 0.77
    },
    "detector": {
      "numFaces": 8,
      "minFaceDetectionConfidence": 0.6,
      "minFacePresenceConfidence": 0.6
    },
    "model": {
      "fileName": "face_landmarker.task",
      "sha256": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
      "downloadUrl": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      "maxDownloadBytes": 5000000,
      "downloadTimeoutMs": 15000
    }
  }
}
```

---

## 5. API Reference & Data Contracts

### 5.1 Liveness Probe
- **`GET /health`**
  - **Auth**: None
  - **Response** `200 OK`:
    ```json
    { "service": "post-processing", "status": "running" }
    ```

---

### 5.2 Capability Discovery
- **`GET /v1/capabilities`**
  - **Auth**: Header `x-post-processing-token`
  - **Response** `200 OK`:
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
        }
      }
    }
    ```

---

### 5.3 Faceless Previs Transformation
- **`POST /v1/faceless-previs`**
  - **Auth**: Header `x-post-processing-token`
  - **Headers Required**:
    - `x-input-sha256`: Expected SHA-256 hash of request body bytes.
    - `x-expected-faces`: Integer (`1` to `8`) expected face count.
  - **Body**: Raw image bytes (`image/jpeg`, `image/png`, or `image/webp`).
  - **Response** `200 OK`:
    - **Content-Type**: `image/png`
    - **Headers**:
      - `x-output-sha256`: SHA-256 hash of output PNG.
      - `x-face-count`: Detected face count matching `x-expected-faces`.
      - `x-mask-policy-version`: Active mask policy version.
      - `x-model-sha256`: Active model SHA-256 hash.
    - **Body**: Raw PNG image bytes containing white-face ellipse masks with guide markings.

---

## 6. Error Codes & HTTP Mapping

Errors are returned as standard JSON responses with machine-readable codes.

| HTTP Status | Error Code | Description / Trigger |
| :--- | :--- | :--- |
| **401** | `unauthorized` | Missing or invalid `x-post-processing-token`. |
| **400** | `input_hash_mismatch` | Body SHA-256 does not match `x-input-sha256`. |
| **400** | `faceless_expected_faces_invalid` | `x-expected-faces` header missing or out of bounds (1..8). |
| **400** | `faceless_image_invalid` | Unable to decode image buffer via `sharp`. |
| **400** | `faceless_image_unsupported` | Format is not JPEG/PNG/WebP, or exceeds pixel limits. |
| **413** | `faceless_input_size_invalid` | Request body exceeds `maxInputBytes` (25MB). |
| **422** | `faceless_detection_failed` | MediaPipe landmark detection failed internally. |
| **422** | `faceless_face_count_mismatch` | Detected faces do not match `x-expected-faces`. |
| **422** | `faceless_face_too_small` | A detected face radius is below `minFaceRadiusX/Y`. |
| **429** | `processing_busy` | Active requests exceed `maxConcurrentRequests` (4). |
| **503** | `face_model_unavailable` | Model missing, hash mismatch, Chromium uninstalled, or pilot disabled. |
| **504** | `processing_timeout` | Processing exceeded `processingTimeoutMs` (30s). Browser context recycled. |

---

## 7. Integration Contract with Core (Express Application)

```
[Web Client] ---> POST /api/cinematic/.../shots/:shotId/faceless-previs
                         |
                         v
             [Core Cinematic Controller]
             1. Verify shot & storyboard source asset
             2. Fetch source asset bytes from Assets Repository
             3. Compute SHA-256 hash of bytes
             4. Invoke Post-Processing Service: POST /v1/faceless-previs
             5. Verify x-output-sha256 and receive output PNG
             6. Save output derivative via Assets Repository
             7. Return new Asset reference to Client (Pending user approval)
```

- **Core Endpoints Bridge**:
  - `GET /api/cinematic/faceless-previs/capabilities`
  - `POST /api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/faceless-previs`
  - `PUT /api/cinematic/projects/:projectId/shots/:shotId/storyboard-source` (Explicit User Approval)

---

## 8. Verification & Operational Guidelines

- **Model Download**: Run `node setupModel.mjs` to fetch and verify the pinned MediaPipe task file before service startup.
- **Headless Chromium**: Ensure Playwright Chromium is installed (`npx playwright install chromium`).
- **Regression Isolation**: Modifying `policy.json` parameters (e.g. mask colors or radius scales) requires updating `policyVersion` and running regression tests to ensure visual output consistency.
