# ModelPromptForge - Project Understanding Guide

เอกสารนี้เป็น source of truth สำหรับทำความเข้าใจโครงสร้างและพฤติกรรมของโปรเจกต์ตามโค้ดปัจจุบัน ใช้สำหรับ onboarding นักพัฒนาและ AI agent ก่อนเริ่มแก้ไขงาน

อัปเดตจากการวิเคราะห์ repository: 2026-07-13

## 1. ภาพรวม

ModelPromptForge เป็นเว็บแอปสำหรับประกอบ prompt และสร้างภาพตัวละครจาก attribute แบบมีโครงสร้าง ผู้ใช้เลือกคุณลักษณะผ่าน UI แทนการเขียน prompt เองทั้งหมด แล้ว backend จะ compile prompt และส่งไปยัง OpenAI หรือ Google Gemini

ความสามารถหลัก:

- Dynamic attribute form จาก JSON schema
- Prompt preview แบบ real time พร้อม template และ conflict resolution
- สร้างภาพผ่าน OpenAI Image API และ Gemini/Imagen
- รองรับ normal, headshot และ character-sheet modes
- รองรับ face/style reference อย่างละไม่เกิน 2 ภาพ
- OpenAI image streaming ผ่าน SSE พร้อม partial preview
- Queue, credits, generation history และ lineage ของภาพอ้างอิง
- ภาษา UI/label ไทยและอังกฤษ
- Fashion Direction และ curated fashion taxonomy ตั้งแต่ marketplace commerce ถึง runway/couture
- Presets, custom color pickers, randomization, field locking และ import/export config
- Image Collections พร้อม description, story, cover, default auto-assignment และ history filtering
- เก็บ state ใน `localStorage` แยกตาม generation mode

งานหลักทำงานผ่าน Node/Express backend ไม่ใช่ client-only application

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS และ JavaScript ES6+ |
| Backend | Node.js ESM และ Express 4 |
| API transport | REST และ Server-Sent Events (SSE) |
| Image providers | OpenAI และ Google Gemini/Imagen |
| Local storage | JSON files, browser `localStorage` และ generated image files |
| Development | `nodemon` |

ไม่มี React, Vue, database server หรือ ORM ในโปรเจกต์หลัก

## 3. โครงสร้าง Repository

```text
ModelPromptForge/
|-- client/
|   |-- index.html                 # App shell และ viewport
|   |-- style.css                  # Dark neon/glassmorphism design system
|   |-- app.js                     # UI, state, preview, SSE และ history
|   `-- outputs/                   # Generated images (runtime)
|-- server/
|   |-- server.js                  # Express routes และ attribute bundle
|   |-- promptCompiler.js          # Authoritative server-side prompt compiler
|   |-- queueManager.js            # Queue, credits, SSE, output และ history
|   |-- database.json              # Mock users, roles และ credits
|   |-- history.json               # Successful generation history
|   `-- providers/
|       |-- BaseProvider.js
|       |-- ProviderFactory.js
|       |-- OpenAIProvider.js
|       `-- GeminiProvider.js
|-- attributes/
|   |-- 001-character.json ... 023-architecture.json
|   |-- 024-fashion-commerce.json # Optional curated fashion attribute pack
|   `-- spec/
|       |-- ui-schema.json
|       |-- prompt-templates.json
|       |-- prompt-order.json
|       |-- presets.json
|       `-- attribute-library.json
|-- requirements/                  # Requirements และ implementation plans
|-- sub-app-game-character/        # Static sub-application แยกจาก app หลัก
|-- example-target/                # ตัวอย่าง exported prompt/config
|-- package.json
`-- nodemon.json
```

`sub-app-game-character` ถูก serve ที่ `/sub-app-game-character` แต่มี code/data/design system ของตัวเอง ไม่ได้ใช้ state หรือ attribute library ชุดเดียวกับ app หลัก

## 4. การเริ่มระบบ

ติดตั้ง dependency และเริ่ม server:

```bash
npm install
npm start
```

Development mode:

```bash
npm run dev
```

ค่า default คือ `http://localhost:3000`

Environment variables:

```dotenv
PORT=3000
OPENAI_API_KEY=...
GEMINI_API_KEY=...
MAX_CONCURRENT_GENERATIONS=2
```

- ต้องมี API key ของ provider ที่เลือกใช้งาน
- API key อยู่ฝั่ง server และไม่ถูกส่งไป browser
- `MAX_CONCURRENT_GENERATIONS` กำหนดจำนวน job ที่ประมวลผลพร้อมกัน

## 5. Frontend Architecture

### 5.1 App State

State หลักอยู่ใน `client/app.js` และประกอบด้วย:

- `schema`, `templates`, `order`, `library`, `presets`
- `selections`: attribute ที่เลือก โดย key คือชื่อ field จาก UI schema
- `lockedFields`: field ที่ randomization ห้ามแก้
- `imageReferences`: `faceMatch`, `styleMatch`, `poseMatch`, `characterReference`, `characterOverrides`
- face/style/character reference slots A และ B พร้อม parent job IDs
- `language`: default `th`
- `aspectRatio`: default `6:8`
- `mode`: default `normal`
- `username`, `userRole`, `activeJobId`
- custom colors สำหรับ Hair, legacy garment fields และ Fashion Product Type

State ถูกบันทึกใน `localStorage` แยกตาม mode:

```text
model_prompt_forge_state_normal
model_prompt_forge_state_headshot
model_prompt_forge_state_character_sheet
```

### 5.2 Initialization

ลำดับเริ่มต้นโดยสรุป:

1. Client เรียก `GET /api/attributes/bundle`
2. โหลด schema, templates, order, library และ presets เข้า state
3. สร้าง accordion fields ตาม `ui-schema.json`
4. restore state ของ mode ปัจจุบัน
5. bind controls, provider/model selectors, references และ generation events
6. โหลด credits และ history

Client ไม่อ่าน attribute files ทีละไฟล์ใน runtime ปกติ แม้ยังมี `ATTRIBUTE_FILES` constant อยู่ แต่ใช้ bundle endpoint เป็นหลัก

### 5.3 Generation Modes

| Mode | Behavior |
|---|---|
| `normal` | ใช้ template ที่เลือกและ attribute ทุกกลุ่มตามปกติ |
| `headshot` | บังคับโครง portrait ระดับศีรษะถึงไหล่ พื้นหลังขาว และมุมหน้าตรง |
| `character-sheet` | สร้าง front/side/back full-body model sheet บนพื้นหลังขาว |

### 5.4 UI Theme

Design system อยู่ใน `client/style.css`:

- พื้นหลังดำอมม่วง
- Glassmorphism panels
- Neon purple, pink, cyan, green, gold และ red tokens
- Error state ใช้ translucent neon-red viewport banner
- Layout เป็น creative configurator + visual dashboard และรองรับ responsive viewport

เมื่อเพิ่ม UI ให้ reuse CSS variables และ component patterns เดิมก่อนสร้าง style ใหม่

## 6. Attribute และ Spec System

ปัจจุบันมี:

- 24 attribute JSON files
- 643 attribute entries
- 15 UI schema groups
- 7 prompt templates
- 12 presets

### 6.1 Attribute Contract

รูปแบบทั่วไป:

```json
{
  "id": "character.001",
  "category": "character",
  "subcategory": "Gender",
  "label": {
    "en": "Female",
    "th": "ผู้หญิง"
  },
  "ui": {
    "control": "select",
    "group": "Character"
  },
  "prompt": {
    "default": "female",
    "gpt-image": "female woman",
    "gpt-image-safe": "...",
    "gpt-image-positive": ["..."]
  },
  "exclusions": [],
  "tags": ["character"],
  "enabled": true
}
```

กติกาสำคัญ:

- `id` ต้องไม่ซ้ำ
- `label` ควรมีทั้ง `en` และ `th`
- `subcategory` ต้องตรงกับ field name ใน UI schema เมื่อ category มีหลาย field
- `prompt.default` เป็น fallback หลัก
- `enabled: false` ทำให้ option ไม่แสดง
- `exclusions` ปิด option ที่ขัดกันโดยตรง
- `tags` ใช้แก้ conflict เช่น indoor/outdoor และ day/night
- หากเพิ่ม attribute file ใหม่ ต้องเพิ่มชื่อไฟล์ใน `ATTRIBUTE_FILES` ของ `server/server.js`; client มีรายการซ้ำที่ควรรักษาให้ตรงกันจนกว่าจะ refactor
- `024-fashion-commerce.json` เป็น modular pack ที่ UI ปัจจุบันใช้สำหรับ Fashion Direction, Hair, Body, Clothing, Pose, Environment และ Lighting แบบ curated โดยคงข้อมูล 001-023 สำหรับ backward compatibility
- Story Character Reference ใช้ reference authority: ค่า Character/Face/Hair/Skin/Body/Clothing เดิมยังอยู่ใน state แต่ถูก suppress ตอน compile เว้นแต่เปิด Advanced Override

### 6.2 Spec Files

| File | Responsibility |
|---|---|
| `ui-schema.json` | กลุ่ม, field, required state และ control definition |
| `prompt-templates.json` | รูปประโยคสำหรับ normal mode |
| `prompt-order.json` | ลำดับการประกอบ segment |
| `presets.json` | template, ratio, references และ selections สำเร็จรูป |
| `attribute-library.json` | Combined/reference library; runtime bundle ปัจจุบันอ่านไฟล์ 001-023 โดยตรง |

Attribute bundle ถูก cache ใน memory และ gzip เมื่อ client รองรับ การแก้ JSON ระหว่าง server ทำงานจึงต้อง restart server เพื่อ rebuild cache

## 7. Prompt Compilation

มี prompt logic สองชุด:

- `client/app.js`: สร้าง live preview และ export
- `server/promptCompiler.js`: compile prompt ที่ส่งให้ providerจริง

Server compiler เป็น authoritative path สำหรับ image generation

Flow หลัก:

```text
selections + custom colors
  -> clone active selections
  -> resolve tag conflicts by category priority
  -> apply face/style/pose reference overrides
  -> group Character/Face/Hair/Skin/Body/Clothing/Pose/Environment/Lighting/Camera/Quality/NSFW
  -> apply normal template or special mode layout
  -> append deduplicated GPT-safe positive words
  -> append aspect ratio instruction
```

Conflict pairs ปัจจุบัน:

- indoor / outdoor
- day / night
- summer / winter
- modern / vintage
- cyberpunk / traditional

เมื่อแก้ prompt behavior ต้องตรวจและอัปเดตทั้ง client preview กับ server compiler เพื่อไม่ให้ preview ต่างจาก prompt ที่ส่งจริง

## 8. Backend API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/attributes/bundle` | Schema, templates, order, attributes และ presets |
| `GET` | `/api/credits?user=...` | Credits และ role ของ mock user |
| `POST` | `/api/credits/recharge` | เพิ่ม mock credits 10 หน่วย |
| `POST` | `/api/generate` | Compile prompt และ enqueue generation job |
| `GET` | `/api/jobs/:id` | Job status/result/error |
| `GET` | `/api/jobs/:id/stream` | SSE progress, partial image, completion หรือ error |
| `GET` | `/api/history` | Successful generation history |
| `DELETE` | `/api/history/:id` | ลบ history และ output image |
| `GET` | `/api/collections` | List Collections และ default Collection |
| `POST` | `/api/collections` | Create Collection |
| `GET/PATCH/DELETE` | `/api/collections/:id` | Read, edit หรือ delete Collection metadata |
| `POST/DELETE` | `/api/collections/:id/images...` | Add/remove history membership |
| `PUT` | `/api/collections/:id/default` | Set default Collection |
| `DELETE` | `/api/collections/default` | Clear default Collection |

`POST /api/generate` รับ selections และ config จาก client แต่ prompt ถูก compile ฝั่ง server เพื่อไม่ต้องเชื่อ prompt text จาก browser

## 9. Queue, Credits และ History

`server/queueManager.js` รับผิดชอบ:

- เก็บ queue และ active jobs ใน memory
- จำกัด concurrency จาก `MAX_CONCURRENT_GENERATIONS`
- หัก 1 credit เมื่อเริ่มประมวลผลจริง
- resolve `/outputs/...` reference paths กลับเป็น Base64
- เรียก provider แบบ stream หรือ non-stream
- เขียนภาพสำเร็จที่ `client/outputs/<jobId>.png`
- บันทึก metadata ใน `server/history.json`
- ส่ง completion/error ไป SSE listeners
- คืน credit หนึ่งครั้งเมื่อ OpenAI ตอบ `moderation_blocked`

History เก็บเฉพาะงานสำเร็จ พร้อม provider, submodel, duration และ parent face/style job IDs งานล้มเหลวไม่สร้าง output หรือ history entry

Queue ไม่ durable: หาก restart process งาน queued/processing และ job status ใน memory จะหาย แต่ output/history ที่เขียนแล้วจะยังอยู่

Collection metadata เก็บใน `server/collections.json` ผ่าน `server/collectionManager.js` โดยอ้าง history job IDs แทนการ duplicate รูป มี default Collection ได้หนึ่งรายการ และ successful generation ใหม่จะถูกเพิ่มเข้า default แบบ idempotent

## 10. Provider Architecture

`ProviderFactory` เลือก provider และตรวจ API key ก่อนสร้าง instance

### 10.1 OpenAI

รองรับ model choices ที่ UI ระบุ:

- `gpt-image-1-mini`
- `gpt-image-1`
- `gpt-image-1.5`
- `gpt-image-2`
- `dall-e-3`
- `dall-e-2`

พฤติกรรมสำคัญ:

- Text-to-image ใช้ `/v1/images/generations`
- Reference/edit ใช้ `/v1/images/edits` แบบ multipart
- GPT Image รองรับหลาย reference images
- DALL-E controls จะปิด face/style reference ใน client
- Streaming parser รองรับ generation/edit partial events
- Partial image เป็น preview เท่านั้นจนกว่า stream จบโดยไม่มี terminal failure
- Error ถูก normalize เป็น `provider`, `type`, `code`, `message`, `requestId`, `safetyViolations`, `retryable`
- `moderation_blocked` ยกเลิก partial preview และไม่ retry อัตโนมัติ

Application-level completion ถูก emit โดย Queue หลังเขียน output และ history สำเร็จ ไม่ forward provider completion โดยตรง

### 10.2 Gemini

- Imagen legacy ใช้ `:predict`
- Gemini image models ใช้ `/v1beta/interactions`
- ส่ง style references ก่อน face references เป็น image input parts
- แปลง ratio `6:8` เป็น `3:4`
- `gemini-3.1-flash-lite-image` ถูกจำกัดไว้ที่ 1K ใน provider
- ไม่มี native image SSE ใน implementation นี้; provider คืนผลสำเร็จแบบครั้งเดียว

Model IDs และ API contracts เป็นข้อมูลที่เปลี่ยนตาม provider ควรตรวจเอกสารทางการก่อนเพิ่มหรือเปลี่ยน model

## 11. Image Reference และ Lineage

- Face reference: Slot A และ B
- Style reference: Slot A และ B
- Reference อาจเป็น Base64, data URL หรือ local `/outputs/...` path
- Queue แปลง local output path เป็น Base64 ก่อนเรียก provider
- เมื่อใช้ภาพจาก history เป็น reference จะเก็บ parent job ID
- Lightbox ใช้ parent IDs เพื่อย้อนดู generation lineage
- ถ้า slot เต็ม การ assign ใหม่จะแทน Slot B

Face/style references ถูก disable และล้างเมื่อเลือก DALL-E 2 หรือ DALL-E 3

## 12. SSE Event Contract

Events ที่ client ใช้:

| Event | Meaning |
|---|---|
| `status` | queued/processing status |
| `image_generation.partial_image` | OpenAI generation preview |
| `image_edit.partial_image` | OpenAI edit/reference preview |
| `image_generation.completed` | Queue persist output/history สำเร็จ |
| `error` | Terminal normalized application error |

กฎ terminal behavior:

- Provider error/completion ไม่ถูก forward ตรงจาก Queue callback
- Queue ส่ง terminal application event เพียงครั้งเดียว
- Error หลัง partial image มีสิทธิ์เหนือ preview เสมอ
- Client ต้องล้าง failed preview, download action และ telemetry
- Technical details แสดง request ID และ safety metadata โดยไม่ log Base64

## 13. Localization

- Default language คือไทย (`state.language = "th"`)
- Attribute labels รองรับ `{ "en": "...", "th": "..." }`
- `getLocalizedLabel()` fallback จากภาษาปัจจุบันไป `en`
- Prompt values ยังเป็นภาษาอังกฤษ เพราะส่งให้ image providers
- เมื่อเพิ่ม option ใหม่ ต้องเพิ่ม label ทั้งสองภาษา

## 14. Security และ Data Boundaries

- Provider API keys อยู่ใน environment variables ฝั่ง server
- Prompt สำหรับ generation compile ฝั่ง server
- Attribute bundle expose เฉพาะข้อมูล UI/prompt ที่ client ต้องใช้
- `database.json` เป็น mock storage ไม่เหมาะกับ production authentication/billing
- `X-User-Role` และ username จาก client ไม่ใช่ security boundary ที่เชื่อถือได้
- CORS เปิดใช้งานแบบกว้างในปัจจุบัน
- Reference Base64 ถูกส่งผ่าน JSON/multipart และอาจมีขนาดใหญ่
- อย่า log API keys, Base64 images หรือ provider response ทั้งก้อน

## 15. Known Risks และ Technical Debt

1. Prompt compilation ซ้ำใน client และ server มีโอกาส drift
2. `ATTRIBUTE_FILES` ซ้ำใน client และ server มีโอกาสรายการไม่ตรงกัน
3. Queue อยู่ใน memory และไม่ recover หลัง restart
4. Credits/history ใช้ read-modify-write บน JSON files จึงมี race condition เมื่อมี concurrent writes
5. Mock user/role สามารถเลือกจาก client ได้และไม่ใช่ authentication จริง
6. Attribute bundle cache ไม่มี invalidation ระหว่าง runtime
7. ไม่มี automated test suite ใน `package.json`; ปัจจุบันมีเพียง `start` และ `dev`
8. Provider model availability และ parameter support อาจเปลี่ยน ต้อง verify กับ official docs
9. Generated files และ history ไม่มี retention/cleanup policy อัตโนมัติ
10. `checkAndDeductCredit()` ใน `server/server.js` เป็น helper ที่ไม่ได้ใช้; การหักเงินจริงในระบบปัจจุบันอยู่ใน Queue

## 16. แนวทางแก้ไขงาน

ก่อนแก้ feature:

1. อ่าน requirement/implementation plan ที่เกี่ยวข้อง
2. ตรวจ code path จริงทั้ง client และ server
3. รักษา UI theme และ component pattern เดิม
4. หากแก้ attribute ให้ตรวจ schema, category mapping, subcategory และ prompt order
5. หากแก้ prompt ให้ sync client preview กับ server compiler
6. หากแก้ provider ให้ตรวจทั้ง normal response, streaming, edit/reference และ error path
7. หากแก้ queue ให้ตรวจ credits, output, history, SSE terminal event และ reconnect behavior
8. อัปเดตเอกสารนี้เมื่อ architecture หรือ contract เปลี่ยน

Verification ขั้นต่ำ:

```bash
node --check client/app.js
node --check server/server.js
node --check server/promptCompiler.js
node --check server/queueManager.js
node --check server/providers/OpenAIProvider.js
node --check server/providers/GeminiProvider.js
```

จากนั้นควรทดสอบ manual flow อย่างน้อย:

- โหลด attribute bundle และ render form
- สลับภาษาและ generation mode
- generate แบบไม่มี reference
- generate/edit แบบมี reference
- partial preview แล้วสำเร็จ
- partial preview แล้ว moderation block
- credit deduction/refund
- history, deletion และ lineage navigation
- state restore หลัง reload

## 17. Related Documents

- `requirements/requirements.md`: functional requirements ตั้งต้น
- `requirements/prompt-rules.md`: prompt ordering rules
- `requirements/gpt-image-style-guide.md`: GPT Image prompt guidance
- `requirements/implementation-plan-upgrade-to-node/000-master.md`: แผน migration หลัก
- `requirements/implementation-plan-upgrade-to-node/009-loopback-referencing.md`: references, lineage และ stream safety handling
- `requirements/implementation-plan-upgrade-to-node/010-attribute-bundling-and-security.md`: attribute bundle/security
- `requirements/implementation-plan-upgrade-to-node/012-session-persistence-and-engine-validation.md`: state persistence และ validation
