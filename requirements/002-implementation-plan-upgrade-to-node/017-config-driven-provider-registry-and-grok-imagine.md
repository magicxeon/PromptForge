# 17. Config-driven Provider Registry and Grok Imagine Provider

**ID:** `017-config-driven-provider-registry-and-grok-imagine`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - Pending Runtime Verification  
**Feature type:** Core provider architecture and paid image provider integration  
**Depends on:** Requirement 005 - Modular Generation Providers, Queue, Credits, History and Reference Workflow  
**Required by:** Requirement 018 - Provider Pricing Catalog and Value Ranking, Requirement 019 - AI Model Comparison Workspace  
**Created:** 2026-07-14  
**Implementation authorization:** Approved and implemented on 2026-07-14

## 1. Objective

เพิ่ม xAI Grok Imagine เป็น image generation provider และปรับระบบ Provider/Model ให้เป็น module ที่ควบคุมจาก server-owned configuration เพื่อให้สามารถ:

- เปิดหรือปิด Provider ได้โดยไม่แก้ HTML/Client code
- เปิดหรือปิด Model รายตัวได้
- เพิ่มหรือลด Model ของ Provider เดิมผ่าน configuration
- กำหนด default Model, display order, capabilities และ credit policy จากจุดเดียว
- เพิ่ม Provider adapter ใหม่ในอนาคตโดยไม่แก้ generation route, selector logic และ validation หลายจุด
- ให้ AI Comparison อ่าน Provider/Model/capability contract ชุดเดียวกับ Single Image generation

ขอบเขตนี้ประกอบด้วยสองส่วนที่ต้อง implement ร่วมกัน:

1. `Provider Registry + Configuration` เป็น core architecture
2. `GrokImagineProvider` เป็น provider module ตัวแรกที่ใช้ architecture ใหม่ครบทั้ง Image Generation และ Image Edit

### 1.1 Implementation outcome

Implementation ปัจจุบันประกอบด้วย:

- server-owned `server/config/providers.json` และ schema
- ProviderConfigLoader, ProviderRegistry และ registered adapter map
- dynamic `/api/providers` catalog และ Client selectors
- capability-driven references, aspect ratio, output resolution และ streaming behavior
- configurable per-model credit deduction/refund contract
- Grok generation/edit ผ่าน `X_API_KEY`, `b64_json`, 1-3 references และ non-streaming flow
- MIME-aware output persistence สำหรับ PNG/JPEG/WebP
- Provider/Model/Resolution session และ import/export persistence
- mock/unit tests สำหรับ Registry, Grok payload/error handling และ image MIME utilities

ยังไม่ได้เรียก xAI API จริง และยังไม่ได้รัน Node test suite ตาม workspace execution instruction จึงต้องทำ Runtime Verification ก่อนเปลี่ยนสถานะเป็น Verified

## 2. Current Problems

Provider และ Model ปัจจุบันกระจายอยู่หลายจุด:

- `client/index.html` hardcode Provider options
- `client/app.js` มี `PROVIDER_SUBMODELS` และ conditional ตาม OpenAI Model
- `server/server.js` hardcode default Model และ OpenAI streaming decision
- `server/providers/ProviderFactory.js` ใช้ `if/else` เพื่อ instantiate OpenAI/Gemini
- `.env.example` มี API key variables แต่ไม่มี provider enable/disable contract
- capability เช่น streaming, image edit, reference count และ aspect ratio ไม่ได้ประกาศเป็น metadata กลาง

ผลกระทบ:

- เพิ่ม Provider ต้องแก้หลายไฟล์และเสี่ยงให้ Client/Server model list ไม่ตรงกัน
- ปิด Model ที่เลิกใช้ต้อง deploy code
- Server ยังต้องเชื่อ Model ID ที่ Client ส่งก่อนตรวจแบบกระจัดกระจาย
- AI Comparison ไม่สามารถ validate ความสามารถของแต่ละ slot จาก contract กลางได้
- default Model และ credit estimate อาจไม่ตรงกันระหว่าง UI กับ Server

## 3. Product Boundary

- Single Image workflow ต้องใช้งานเหมือนเดิมหลัง migration
- OpenAI และ Gemini ต้องย้ายเข้า Registry โดยไม่เปลี่ยน generation behavior ที่ใช้งานอยู่
- Grok เป็น optional paid Provider และต้องปิดได้จาก configuration
- การไม่มี `X_API_KEY` ต้องไม่ทำให้ application ทั้งระบบ start ไม่ได้ หาก Grok ถูกปิด
- หาก Grok เปิดแต่ API key ไม่พร้อม ให้ Provider แสดง unavailable/disabled reason หรือถูกตัดออกจาก public catalog ตาม environment policy
- API key และ internal configuration ห้ามส่งไป Client
- configuration เปลี่ยน catalog/capability/policy เท่านั้น ไม่อนุญาตให้ Client ส่ง arbitrary endpoint หรือ class/module path

## 4. Architecture Overview

```text
server/config/providers.json
        |
        v
ProviderConfigLoader ---- validates schema and environment
        |
        v
ProviderRegistry -------- public catalog / server validation / defaults
        |
        +---- OpenAIProvider module
        +---- GeminiProvider module
        +---- GrokImagineProvider module
        |
        v
ProviderFactory -------- instantiates enabled registered adapter
        |
        v
Queue Manager ---------- generate/edit, history, credits, errors
```

Client flow:

```text
GET /api/providers
  -> populate Provider Engine dropdown
  -> populate Model dropdown from selected provider
  -> apply default model and capability policy
  -> submit provider/model IDs
  -> server validates IDs against Registry again
```

## 5. Provider Module Contract

### 5.1 Adapter boundary

Provider module ต้องรับ normalized application options และแปลงเป็น payload เฉพาะ Provider ภายใน module เท่านั้น

ขั้นต่ำต้องรองรับ:

```javascript
class BaseProvider {
  async generateImage(prompt, options) {}
  async generateImageStream(prompt, options, onEvent) {}
}
```

เพิ่ม optional methods/metadata ตาม architecture review:

```javascript
class BaseProvider {
  static providerId = "provider-id";

  validateModelOptions(modelConfig, options) {}
  normalizeProviderError(error, context) {}
  mapAspectRatio(aspectRatio, modelConfig) {}
  estimateUsage(modelConfig, options) {}
}
```

ข้อกำหนด:

- `server/server.js` ห้ามรู้ endpoint หรือ payload shape ของ Grok/OpenAI/Gemini
- Queue Manager ส่ง reference images แบบ normalized และ deduplicated ตาม workflow เดิม
- Provider คืน result contract เดียวกัน เช่น `{ base64, mimeType, usage, providerMetadata }`
- Provider error ต้อง map เข้าสู่ standard queue error contract
- provider-specific metadata เก็บได้ แต่ห้ามบังคับให้ History consumer รู้ payload ดิบ

### 5.2 Registration

ใช้ code-owned adapter registration map เช่น:

```javascript
const PROVIDER_ADAPTERS = {
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  xai: GrokImagineProvider
};
```

Configuration อ้างได้เฉพาะ adapter ID ที่ register ใน code แล้ว เพื่อป้องกัน arbitrary dynamic import/path injection

การเพิ่ม Provider protocol ใหม่ต้องทำเพียง:

1. เพิ่ม adapter module
2. register adapter ID
3. เพิ่ม provider/model configuration
4. เพิ่ม secret environment variable

ไม่ต้องแก้ HTML dropdown, client model constants, generation route หรือ Comparison Workspace

## 6. Server-owned Provider Configuration

### 6.1 File location

เสนอให้เพิ่ม:

```text
server/config/providers.json
server/config/provider-config.schema.json
```

Configuration เป็น non-secret deployment configuration ส่วน API keys อยู่ใน environment เท่านั้น

อาจรองรับ environment variable ต่อไปนี้:

```dotenv
PROVIDER_CONFIG_PATH=server/config/providers.json
X_API_KEY=your_xai_api_key_here
```

`PROVIDER_CONFIG_PATH` เป็น optional override สำหรับ deployment แต่ต้อง resolve ภายใน allowlisted configuration directory หรือผ่าน trusted startup configuration เท่านั้น

### 6.2 Proposed configuration shape

```json
{
  "schemaVersion": 1,
  "defaultProvider": "gemini",
  "providers": [
    {
      "id": "xai",
      "adapter": "xai-imagine",
      "enabled": true,
      "displayName": {
        "en": "xAI Grok Imagine",
        "th": "xAI Grok Imagine"
      },
      "apiKeyEnv": "X_API_KEY",
      "displayOrder": 30,
      "defaultModel": "grok-imagine-image-quality",
      "models": [
        {
          "id": "grok-imagine-image-quality",
          "enabled": true,
          "displayName": {
            "en": "Grok Imagine Image Quality",
            "th": "Grok Imagine Image Quality"
          },
          "displayOrder": 10,
          "capabilities": {
            "imageGeneration": true,
            "imageEdit": true,
            "imageReferences": true,
            "maxReferenceImages": 3,
            "streaming": false,
            "responseFormats": ["b64_json"],
            "resolutions": ["1k", "2k"],
            "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "19.5:9", "9:19.5", "20:9", "9:20", "auto"]
          },
          "defaults": {
            "resolution": "1k",
            "responseFormat": "b64_json"
          },
          "creditPolicy": "xai.grok-imagine-image-quality.1k"
        },
        {
          "id": "grok-imagine-image",
          "enabled": true,
          "displayName": {
            "en": "Grok Imagine Image",
            "th": "Grok Imagine Image"
          },
          "displayOrder": 20,
          "capabilities": {
            "imageGeneration": true,
            "imageEdit": true,
            "imageReferences": true,
            "maxReferenceImages": 3,
            "streaming": false,
            "responseFormats": ["b64_json"],
            "resolutions": ["1k", "2k"],
            "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "19.5:9", "9:19.5", "20:9", "9:20", "auto"]
          },
          "defaults": {
            "resolution": "1k",
            "responseFormat": "b64_json"
          },
          "creditPolicy": "xai.grok-imagine-image.1k"
        }
      ]
    }
  ]
}
```

ชื่อ Model, ราคาและ capabilities เปลี่ยนได้ตาม Provider จึงต้องถือ configuration นี้เป็น application allowlist ไม่ใช่ auto-trust จาก remote model listing

### 6.3 Configuration rules

- `provider.id` และ `model.id` ต้อง unique
- Provider ที่ `enabled: false` ไม่แสดงและ server reject request
- Model ที่ `enabled: false` ไม่แสดงและ server reject request
- `defaultProvider` ต้อง enabled และพร้อมใช้งาน หรือ fallback ตาม `displayOrder`
- `defaultModel` ต้องเป็น enabled model ภายใต้ Provider เดียวกัน
- Provider ที่ไม่มี enabled model ต้องไม่แสดง
- capability และ defaults ต้องผ่าน JSON schema
- unknown adapter ID ทำให้ Provider นั้น invalid แต่ไม่ควรทำให้ Provider อื่นหยุดทำงาน
- invalid default/capability ต้อง log actionable startup error
- production ห้ามเปิด config hot reload โดยไม่มี atomic validation; MVP ใช้ restart เพื่อ apply config
- public response ต้องส่งเฉพาะ sanitized fields

## 7. Public Provider Catalog API

เพิ่ม endpoint:

```text
GET /api/providers
```

ตัวอย่าง response:

```json
{
  "schemaVersion": 1,
  "defaultProvider": "gemini",
  "providers": [
    {
      "id": "xai",
      "displayName": {
        "en": "xAI Grok Imagine",
        "th": "xAI Grok Imagine"
      },
      "defaultModel": "grok-imagine-image-quality",
      "available": true,
      "models": [
        {
          "id": "grok-imagine-image-quality",
          "displayName": {
            "en": "Grok Imagine Image Quality",
            "th": "Grok Imagine Image Quality"
          },
          "capabilities": {},
          "defaults": {},
          "estimatedCredits": 0
        }
      ]
    }
  ]
}
```

ห้ามส่ง:

- `apiKeyEnv`
- API key value
- internal adapter class/path
- private base URL override
- raw provider error
- internal pricing formula ที่ไม่จำเป็นต่อ UI

Catalog response ควร cache ด้วย version/ETag ได้ในอนาคต แต่ Client ต้อง refresh เมื่อ application reload

## 8. Client Migration

### 8.1 Dynamic selectors

- ถอด Provider `<option>` ที่ hardcode ใน `client/index.html`
- ถอด `PROVIDER_SUBMODELS` จาก `client/app.js`
- fetch `/api/providers` ตอน initialize
- populate Provider และ Model ตาม localized display name และ display order
- เลือก server-provided default
- ถ้า restored session ใช้ Provider/Model ที่ถูกปิด ให้ fallback และแจ้งผู้ใช้
- selector ต้องแสดง unavailable state อย่างเป็นมิตรเมื่อ catalog โหลดไม่ได้
- Prompt/configuration ต้องไม่ถูก reset เมื่อ catalog refresh

### 8.2 Capability-driven controls

แทน conditional เช่น `provider === "openai" && model === "dall-e-3"` ด้วย capability metadata:

- disable image references เมื่อ `imageEdit` หรือ `imageReferences` เป็น false
- จำกัดจำนวน reference slots ตาม `maxReferenceImages`
- แสดง streaming UI เฉพาะ `streaming: true` และ server response ยืนยัน
- validate aspect ratio/resolution จาก Model metadata
- AI Comparison ใช้ metadata ชุดเดียวกัน

Client capability เป็น UX guidance เท่านั้น Server ต้อง validate ซ้ำ

## 9. Server Validation and Defaults

`POST /api/generate` ต้องเปลี่ยนจาก hardcoded defaults เป็น:

1. resolve Provider จาก Registry
2. ตรวจ Provider enabled/available
3. resolve Model จาก request หรือ Provider default
4. ตรวจ Model enabled
5. validate generation mode, references, aspect ratio และ resolution จาก capability
6. resolve streaming จาก capability + provider policy
7. enqueue ด้วย resolved provider/model snapshot

History ต้องเก็บ:

- requested Provider/Model IDs
- resolved Model ID หาก Provider คืน alias resolution
- provider catalog/config version
- normalized provider metadata ที่จำเป็นต่อ billing/diagnostics

ห้าม silently เปลี่ยน disabled/unknown Model เป็น default เพราะอาจทำให้ราคาและผลลัพธ์ต่างจากที่ผู้ใช้ยืนยัน ให้คืน validation error และให้ Client refresh catalog

## 10. Grok Imagine API Integration

### 10.1 Authentication and endpoints

Base URL:

```text
https://api.x.ai/v1
```

Authentication:

```http
Authorization: Bearer ${X_API_KEY}
Content-Type: application/json
```

Endpoints:

```text
POST /v1/images/generations
POST /v1/images/edits
```

MVP ใช้ native `fetch` และ JSON payload ให้สอดคล้องกับ providers ปัจจุบัน ไม่เพิ่ม SDK dependency หากไม่จำเป็น

### 10.2 Image generation

ตัวอย่าง normalized request:

```json
{
  "model": "grok-imagine-image-quality",
  "prompt": "<compiled prompt>",
  "n": 1,
  "aspect_ratio": "3:4",
  "resolution": "1k",
  "response_format": "b64_json"
}
```

ข้อกำหนด:

- MVP บังคับ `n: 1` เพราะ Queue/History หนึ่ง job ต่อหนึ่งภาพ
- ใช้ `response_format: "b64_json"` เพื่อบันทึก output ผ่าน Queue Manager โดยไม่พึ่ง temporary URL
- หาก Provider คืน URL ต้อง download และ persist ก่อน URL หมดอายุ
- เก็บ `mime_type`, `revised_prompt`, usage และ actual resolved model เมื่อมี
- response ที่ไม่มี `data[0].b64_json` หรือ URL ต้องเป็น provider response error

### 10.3 Aspect ratio mapping

Map application ratio ผ่าน config/provider mapper:

| Application | Grok Imagine | Policy |
|---|---|---|
| `1:1` | `1:1` | exact |
| `16:9` | `16:9` | exact |
| `9:16` | `9:16` | exact |
| `6:8` | `3:4` | mathematically equivalent |
| `4:5` | configurable fallback | ไม่ใช่ ratio ที่ยืนยันจาก docs; ต้องแจ้งก่อน Generate หรือ block จนกำหนด policy |

ห้ามเลือก ratio ที่ใกล้เคียงแบบ silent

### 10.4 Resolution

- รองรับ `1k` และ `2k` ตาม Model capability configuration
- default `1k` เพื่อควบคุมต้นทุน
- resolution ที่ไม่รองรับต้องถูก reject ก่อนหักเครดิต
- credit estimate ต้องคำนึงถึง Model, resolution และจำนวน input images

## 11. Grok Image Edit and References

เมื่อมี Face, Style หรือ Character Reference อย่างน้อยหนึ่งภาพ ให้ใช้ `/v1/images/edits`

Request shape:

- หนึ่งภาพใช้ `image`
- หลายภาพใช้ `images`
- แต่ละรายการรองรับ URL, Base64/Data URL หรือ xAI `file_id` ตาม integration phase
- MVP ใช้ reference bytes ที่ Queue Manager resolve/deduplicate แล้ว
- จำกัดสูงสุด 3 unique references ตาม Grok Imagine edit capability ที่ตรวจจากเอกสารปัจจุบัน

ตัวอย่างหลายภาพ:

```json
{
  "model": "grok-imagine-image-quality",
  "prompt": "<compiled prompt with reference authority>",
  "images": [
    { "type": "image_url", "url": "data:image/png;base64,<base64>" },
    { "type": "image_url", "url": "data:image/jpeg;base64,<base64>" }
  ],
  "aspect_ratio": "3:4",
  "resolution": "1k",
  "response_format": "b64_json"
}
```

ข้อกำหนด:

- reference object ทุกตัวต้องมี `type: "image_url"` ตาม xAI JSON API contract ทั้ง field `image` และ `images`
- รักษาลำดับ Character, Face, Style ตาม normalized reference priority เดิม
- ภาพ bytes เดียวกันต้องส่งเพียงครั้งเดียว
- หาก references มากกว่า Model limit ให้ block พร้อมข้อความ ไม่ตัดภาพท้ายทิ้งแบบ silent
- ตรวจ MIME/size ก่อนส่ง
- single-image edit อาจรักษา aspect ratio ของ input ตาม behavior ของ xAI; ต้องแจ้ง mismatch และทดสอบก่อนรับรอง exact output ratio
- Files API/file ID caching เป็น future optimization ไม่อยู่ใน MVP

## 12. Streaming Policy

เอกสาร REST ที่อ้างอิงใน requirement นี้ยืนยัน standard response แต่ยังไม่ใช้เป็นหลักฐานสำหรับ partial-image streaming contract แบบ OpenAI

ดังนั้น MVP:

- `capabilities.streaming = false` สำหรับ Grok image models
- `GrokImagineProvider.generateImage()` รองรับ generation/edit แบบ non-streaming
- ไม่เปิด SSE partial image events
- Queue/Client ใช้ polling และ completed output flow เดิม
- หาก xAI เพิ่ม streaming ในอนาคต ให้เปิดผ่าน capability/config หลังเพิ่ม parser และ regression tests แล้วเท่านั้น

## 13. Response and Output Handling

Provider result contract:

```javascript
{
  base64: "...",
  mimeType: "image/jpeg",
  usage: {
    costInUsdTicks: 0
  },
  providerMetadata: {
    revisedPrompt: "",
    resolvedModel: "grok-imagine-image-quality",
    respectModeration: true
  }
}
```

ข้อกำหนด:

- Queue Manager ต้องเลือก extension จาก `mimeType` ไม่ hardcode `.png` สำหรับ Grok JPEG output
- History `imageUrl` ต้องชี้ไฟล์ local ที่ persist แล้ว
- ห้ามเก็บ full Base64 ใน History JSON
- validate HTTP status, content type และ response schema
- จำกัดขนาด remote download และ timeout
- temporary Provider URL ห้ามถูกบันทึกเป็น output หลัก

## 14. Error and Safety Handling

Map Grok errors เข้าสู่ standard error contract:

```javascript
{
  provider: "xai",
  code: "provider_error | moderation_blocked | rate_limited | invalid_request | authentication_failed | timeout",
  message: "user-safe message",
  requestId: "...",
  safetyViolations: [],
  retryable: false
}
```

ข้อกำหนด:

- moderation result ที่ไม่มีภาพต้องเป็น `moderation_blocked`
- safety rejection ใช้ refund policy เดิม
- HTTP 429 เป็น retryable ตาม `Retry-After` และ queue policy
- authentication/configuration error ไม่ควร retry อัตโนมัติ
- 5xx/network timeout อาจ retry ตาม bounded policy
- log request ID แต่ห้าม log API key หรือ full Base64 references
- เมื่อ Provider ตอบ non-2xx ให้ log endpoint, HTTP status, sanitized payload และ response body; แทน Base64 ด้วย MIME/byte summary
- error parser ต้องรองรับข้อความจาก `message`, `detail`, `error`, `error_description` และ nested error object เพื่อไม่ให้ HTTP 400 เหลือเพียง generic message
- error detail ใน UI ใช้ pattern friendly message + expandable technical detail เดิม

## 15. Credits and Usage

- Grok เป็น paid Provider
- credit estimate มาจาก server pricing/credit configuration ไม่ hardcode ใน Client
- Model, resolution และจำนวน input images อาจมีต้นทุนต่างกัน
- บันทึก `usage.cost_in_usd_ticks` เมื่อ response มี เพื่อ reconciliation
- actual user credit deduction ต้องผ่าน application credit policy/ledger ไม่คำนวณโดยเชื่อ Client
- แสดง estimated credits ก่อน Generate
- failed/safety jobs ใช้ deduction/refund lifecycle เดิม
- pricing metadata ต้องมี `effectiveAt`/version เพื่อรองรับราคา Provider เปลี่ยน
- remote model list หรือ usage response ห้ามเปลี่ยน credit conversion policy โดยอัตโนมัติ

## 16. Environment Configuration

ปรับ `.env.example`:

```dotenv
X_API_KEY=your_xai_api_key_here
PROVIDER_CONFIG_PATH=server/config/providers.json
```

Migration:

- ใช้ `X_API_KEY` เป็น canonical key ตาม deployment configuration ของ project
- ไม่เพิ่ม alias key อีกชื่อเพื่อลดความสับสนระหว่าง environment
- ห้ามส่ง key status แบบละเอียดเกินจำเป็นให้ unauthenticated client

## 17. Model Discovery Policy

xAI มี endpoint:

```text
GET /v1/image-generation-models
GET /v1/image-generation-models/:modelId
```

MVP ไม่ auto-enable Model จาก remote endpoint เพราะ:

- Model ใหม่อาจมีราคา/capability ที่ application ยังไม่รองรับ
- remote alias อาจเปลี่ยน behavior
- AI Comparison ต้องมี stable allowlist และ credit estimate

ใช้ endpoint นี้สำหรับ optional admin health check/reconciliation เท่านั้น:

- ตรวจว่า configured Model ยังมีอยู่
- แสดง fingerprint/version/aliases แก่ admin
- แจ้ง deprecated/unavailable Model
- ห้ามเพิ่ม Model เข้าหน้า User โดยอัตโนมัติ

การเพิ่ม/ลด Model สำหรับผู้ใช้ทำผ่าน `providers.json`

## 18. Configuration Administration

MVP:

- แก้ `server/config/providers.json`
- validate ตอน server startup
- restart server เพื่อ apply
- log sanitized active provider/model summary

Future admin UI:

- enable/disable Provider
- enable/disable Model
- change default and display order
- edit credit policy reference
- run provider health check
- preview impact before publish
- version and rollback configuration

Admin UI ห้ามแก้ API key value โดยตรงใน JSON configuration

## 19. Backward Compatibility and Migration

- migrate OpenAI/Gemini model list จาก Client constants เข้า configuration
- preserve current provider IDs `openai` และ `gemini`
- session/config import ที่อ้าง enabled Model เดิมต้อง restore ได้
- disabled/removed Model ต้องแสดง migration warning และให้ผู้ใช้เลือกใหม่
- existing History ยังคงแสดง Provider/Model text ได้แม้ Model ถูกปิด
- Provider registry failure ต้องไม่ทำลาย History/Collections
- fallback static catalog ใช้ได้เฉพาะ development emergency และต้องไม่ bypass server allowlist

## 20. Security Requirements

- API keys อยู่ server environment เท่านั้น
- server validates Provider/Model against enabled Registry
- Client ห้ามกำหนด adapter, endpoint, API key env name หรือ cost
- configuration schema ปฏิเสธ duplicate IDs และ invalid types
- arbitrary module loading จาก JSON ถูกห้าม
- remote output URL download ต้อง allow HTTPS, enforce timeout/size limit และป้องกัน SSRF redirect ไป private network
- reference URL จาก Client ต้องไม่ถูกส่งต่อโดยไม่ผ่าน trusted image normalization
- redact Authorization header และ Base64 payload จาก logs
- Provider public catalog ต้องผ่าน explicit serializer allowlist

## 21. Modular File Direction

ชื่อจริงอาจปรับหลัง code review แต่ควรแยก responsibility:

```text
server/
  config/
    providers.json
    provider-config.schema.json
  providers/
    BaseProvider.js
    OpenAIProvider.js
    GeminiProvider.js
    GrokImagineProvider.js
    ProviderFactory.js
    ProviderRegistry.js
    ProviderConfigLoader.js
    providerAdapters.js
  routes/
    providers.js
```

Client อาจแยก:

```text
client/
  providers/
    providerCatalog.js
    providerSelector.js
    capabilityPolicy.js
```

ห้ามรวม Registry/config loading ทั้งหมดไว้ใน `server/server.js` หรือเพิ่ม Grok conditionals กระจายทั่ว `client/app.js`

## 22. Implementation Steps and Progress Tracking

### Phase A: Registry contracts

- [ ] inventory OpenAI/Gemini models, defaults, capabilities and conditionals ปัจจุบัน
- [ ] สร้าง provider configuration schema
- [ ] สร้าง ProviderConfigLoader และ validation errors
- [ ] สร้าง ProviderRegistry และ sanitized public catalog
- [ ] เปลี่ยน ProviderFactory จาก `if/else` เป็น registered adapter map
- [ ] เพิ่ม unit tests สำหรับ enabled/disabled/default/duplicate configuration

### Phase B: Existing provider migration

- [ ] ย้าย OpenAI model catalog เข้า providers configuration
- [ ] ย้าย Gemini model catalog เข้า providers configuration
- [ ] ย้าย streaming/reference/aspect policies เป็น capabilities
- [ ] เปลี่ยน `/api/generate` ให้ resolve Provider/Model ผ่าน Registry
- [ ] รักษา OpenAI/Gemini regression behavior

### Phase C: Dynamic client catalog

- [ ] เพิ่ม `GET /api/providers`
- [ ] ถอด hardcoded Provider options จาก HTML
- [ ] ถอด `PROVIDER_SUBMODELS` จาก Client
- [ ] populate selectors จาก public catalog
- [ ] เพิ่ม loading/error/empty states
- [ ] ใช้ capability metadata แทน provider/model conditionals
- [ ] เพิ่ม session fallback warning เมื่อ Model ถูกปิด

### Phase D: Grok Imagine Provider

- [ ] เพิ่ม `GrokImagineProvider.js`
- [ ] document `X_API_KEY` ใน `.env.example` สำหรับ Grok Imagine
- [ ] implement `/images/generations` with `b64_json`
- [ ] implement `/images/edits` สำหรับ 1-3 unique references
- [ ] implement aspect ratio and resolution validation
- [ ] handle JPEG/PNG MIME and output extension
- [ ] normalize usage, revised prompt, resolved model and moderation metadata
- [ ] normalize rate limit, auth, moderation and provider errors
- [ ] register Grok adapter and configure enabled models

### Phase E: Credits, history and recovery

- [ ] เพิ่ม Grok credit policies and estimate metadata
- [ ] reconcile `cost_in_usd_ticks`
- [ ] verify deduction/refund lifecycle
- [ ] persist provider config version and resolved model
- [ ] verify completed Grok output remains after remote URL expires
- [ ] verify refresh and History/Collection reuse

### Phase F: Verification

- [ ] configuration schema and Registry unit tests
- [ ] ProviderFactory registration tests
- [ ] API catalog serialization/security tests
- [ ] Grok generation request/response mock tests
- [ ] Grok single-reference edit mock test
- [ ] Grok three-reference edit and over-limit validation tests
- [ ] aspect ratio mapping and unsupported `4:5` test
- [ ] MIME/extension persistence tests
- [ ] moderation, 401, 429, 5xx and malformed response tests
- [ ] OpenAI/Gemini regression tests
- [ ] runtime smoke test with xAI credentials after explicit approval

## 23. Acceptance Criteria

1. Provider และ Model dropdown ไม่มีรายการ hardcode ใน Client
2. Client โหลด Provider/Model จาก sanitized server catalog
3. เปิด/ปิด Provider หรือ Model จาก configuration แล้ว UI และ server validation ตรงกันหลัง restart
4. เพิ่ม Model ให้ Provider เดิมผ่าน configuration ได้โดยไม่แก้ Client/route/ProviderFactory
5. unknown หรือ disabled Provider/Model ถูก reject ฝั่ง Server
6. OpenAI และ Gemini ยังสร้างภาพและใช้ references/streaming ตาม behavior เดิม
7. Grok generation สร้างภาพผ่าน `/v1/images/generations` และ persist เป็น local output
8. Grok edit ใช้ reference 1-3 ภาพผ่าน `/v1/images/edits`
9. reference ซ้ำถูกส่งเพียงครั้งเดียวและเกิน limit ถูก block โดยไม่ silent truncation
10. Grok ใช้ non-streaming completed-output flow โดยไม่มี partial-image UI ค้าง
11. aspect ratio/resolution ถูก validate ก่อน enqueue และไม่มี silent fallback
12. JPEG/PNG output ถูกบันทึกด้วย MIME/extension ถูกต้อง
13. Grok errors และ moderation ใช้ queue error/refund contract เดิม
14. API keys, internal adapter details และ pricing internals ไม่รั่วใน public catalog/logs
15. Provider Registry เป็น dependency ที่ AI Comparison ใช้เลือก Model, validate capabilities และ estimate credits ได้

## 24. Out of Scope

- Grok video generation/editing
- xAI chat/language models
- automatic enablement จาก remote model list
- xAI Files API caching/persistent file IDs
- provider configuration admin UI
- config hot reload ใน production
- Grok partial-image streaming จนกว่าจะมี verified API contract
- multiple output images (`n > 1`) ต่อ Queue job
- Provider endpoint override จาก Client

## 25. Decisions to Confirm Before Implementation

1. เปิด Grok ใน default configuration ทันทีหรือให้ `enabled: false` จนใส่ `X_API_KEY`
2. ใช้ `grok-imagine-image-quality` เป็น default ตามคำแนะนำ xAI หรือใช้ `grok-imagine-image` เพื่อประหยัดต้นทุน
3. เปิด resolution `2k` ใน UI ตั้งแต่ MVP หรือเริ่มเฉพาะ `1k`
4. unsupported application ratio `4:5` จะ block หรือ map เป็น `3:4` พร้อม explicit confirmation
5. **ยืนยันแล้ว:** Grok Imagine ใช้ `X_API_KEY` จาก `.env`
6. unavailable Provider ที่เปิดใน config แต่ไม่มี key จะซ่อนจาก User หรือแสดง disabled พร้อมเหตุผลสำหรับ Admin เท่านั้น

## 26. Recommended Defaults

- Grok config `enabled: true` แต่ public catalog แสดงเฉพาะเมื่อ key พร้อม; Admin เห็น unavailable reason
- ใช้ `grok-imagine-image-quality` เป็น default ตาม current xAI recommendation
- เปิด `1k` เป็น default และให้ `2k` เป็น advanced option พร้อม credit estimate
- block `4:5` ใน MVP จนผู้ใช้ยืนยัน mapping policy เพื่อป้องกัน output composition เปลี่ยนแบบเงียบ ๆ
- ใช้ `X_API_KEY` เป็น environment variable เดียวสำหรับ Grok Imagine
- ใช้ `b64_json`, `n: 1`, non-streaming สำหรับ MVP

## 27. Official References

- xAI REST Image Generation and Image Edit: https://docs.x.ai/developers/rest-api-reference/inference/images
- xAI Image Generation capabilities: https://docs.x.ai/developers/model-capabilities/images/generation
- xAI Imagine overview and multi-reference editing: https://docs.x.ai/developers/model-capabilities/imagine
- xAI Image Generation Models API: https://docs.x.ai/developers/rest-api-reference/inference/models
- xAI Grok Imagine Image model: https://docs.x.ai/developers/models/grok-imagine-image
- xAI Files input references: https://docs.x.ai/developers/model-capabilities/imagine/files/inputs

Research snapshot date: 2026-07-14. Model availability, aliases, pricing and capabilities must be verified again immediately before implementation because Provider contracts can change.
