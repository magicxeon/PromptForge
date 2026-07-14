# 19. AI Model Comparison Workspace

**ID:** `019-ai-model-comparison-workspace`  
**Application:** `ModelPromptForge`  
**Status:** Draft for review  
**Feature type:** Optional paid multi-model generation workflow  
**Depends on:** Requirement 017 - Config-driven Provider Registry and Grok Imagine, Requirement 018 - Provider Pricing Catalog and Value Ranking, Queue, credits, History, Collections, session persistence  
**Created:** 2026-07-14  
**Implementation authorization:** Not yet approved

## 1. Objective

เพิ่มโหมด `AI Comparison` สำหรับส่ง prompt และ configuration ชุดเดียวกันไปสร้างภาพด้วย AI ตั้งแต่ 2 ถึง 4 slots พร้อมกัน เพื่อให้ผู้ใช้เปรียบเทียบคุณภาพ ความสม่ำเสมอ ความเหมาะสมกับงาน และต้นทุนของ Model ต่าง ๆ ได้ในบริบทเดียวกัน

ระบบต้องรองรับ:

- Provider เดียวกันแต่คนละ Model
- Provider ต่างกัน
- Model เดียวกันซ้ำหลาย slot เพื่อเปรียบเทียบความแปรปรวนของผลลัพธ์
- การเพิ่ม Provider และ Model ใหม่ในอนาคตโดยไม่เขียน Comparison UI แบบผูกกับแต่ละแบรนด์
- การเก็บผลลัพธ์เป็น Comparison Set เพื่อกลับมาเปรียบเทียบภายหลัง
- การซูมและเลื่อนภาพหลายภาพพร้อมกัน
- การคิดเครดิตตามต้นทุนจริงของแต่ละ child generation job

AI Comparison เป็น optional workflow ผู้ใช้ยังสร้างภาพแบบ Single Image ได้เหมือนเดิม

## 2. Product Decisions

### 2.1 Hybrid screen architecture

ใช้หน้า Studio Creative Configurator เดิมสำหรับสร้าง prompt และตั้งค่า attributes แต่แยกพื้นที่ดูผลเปรียบเทียบเป็น `Comparison Workspace`

เหตุผล:

- ไม่สร้าง Studio Configurator ซ้ำสองชุด
- Single Image และ Comparison ใช้ prompt compiler และ configuration contract เดียวกัน
- พื้นที่แสดง 2-4 ภาพพร้อมเครื่องมือ zoom/pan ต้องการพื้นที่มากกว่า Visual Viewport ปัจจุบัน
- Comparison Set สามารถเปิดจาก History หรือ Collection ได้โดยไม่ต้องคืนค่าฟอร์มเดิมก่อน

### 2.2 Fair comparison is the MVP default

MVP ใช้ `Fair Comparison`:

- compile source prompt หนึ่งครั้งจาก configuration snapshot
- ใช้ semantic prompt เดียวกันทุก slot
- เก็บข้อความจริงที่ส่งให้แต่ละ Provider เป็น `submittedPrompt`
- ห้ามปรับเนื้อหา prompt สำหรับ Model ใดโดยไม่แสดงให้ผู้ใช้ทราบ

อนาคตสามารถเพิ่ม `Optimized Comparison` ซึ่งใช้ Provider Prompt Adapter แต่ต้องเก็บทั้ง source prompt, adapter version และ submitted prompt เพื่อ audit ได้

### 2.3 Duplicate models are allowed

อนุญาตให้เลือก Provider + Model เดียวกันมากกว่าหนึ่ง slot เพื่อวัด consistency และ variation โดยแต่ละ slot ต้องเป็น child job แยกและคิดเครดิตแยก

## 3. Entry Point and Model Selector UX

### 3.1 Compare icon placement

ไอคอน Compare ต้องอยู่ใกล้กับส่วนเลือก AI Model ใน `Engine & Target Output` โดยวางติดกับ label หรือด้านขวาของ `Submodel Version` ไม่วางไว้ในเมนูที่ห่างจาก model selector

โครงสร้างแนะนำ:

```text
Provider Engine                 Submodel Version        [Compare icon]
[Google Gemini AI       v]      [Selected Model      v] [comparison]
```

ข้อกำหนดของปุ่ม:

- ใช้ icon แบบ split view, side-by-side frames หรือ comparison grid ที่เข้ากับ theme เดิม
- มี tooltip `Compare AI Models` / `เปรียบเทียบโมเดล AI`
- มี accessible name และรองรับ keyboard
- active state ต้องเห็นชัดเมื่ออยู่ใน Comparison Mode
- badge แสดงจำนวน slots เช่น `2`, `3`, `4` เมื่อเปิด Comparison Mode
- ห้ามใช้ icon ที่สื่อว่า duplicate, copy หรือ gallery จนทำให้ความหมายคลุมเครือ
- บน mobile ไอคอนต้องยังอยู่ใกล้ model selector และมี touch target ไม่น้อยกว่า 44x44 CSS pixels

### 3.2 Entering Comparison Mode

เมื่อกด Compare icon จาก Single Image Mode:

1. เก็บ Provider และ Model ปัจจุบันเป็น Slot 1
2. สร้าง Slot 2 อัตโนมัติ
3. เปิด Comparison Model Tray ภายใน `Engine & Target Output`
4. ไม่ reset attributes, prompt, aspect ratio, references หรือ custom colors
5. Slot 2 ใช้ Provider เดียวกับ Slot 1 เป็นค่าเริ่มต้น แต่ต้องให้ผู้ใช้เลือก Model ก่อน Generate หากไม่มีค่า default ที่ valid

### 3.3 Leaving Comparison Mode

- ผู้ใช้ออกจาก Comparison Mode ได้โดยกด Compare icon ซ้ำหรือเลือก `Single Image`
- ต้องเก็บ Comparison slot draft ไว้ใน session เพื่อกลับมาเปิดต่อได้
- Single Image selector ใช้ค่า Slot 1 เป็นค่าเริ่มต้นหลังออกจาก Comparison Mode
- การออกจาก mode ห้ามลบ Comparison Set หรือผลลัพธ์ที่สร้างแล้ว

## 4. Comparison Model Tray

### 4.1 Slot behavior

- เริ่มต้น 2 slots
- เพิ่มได้สูงสุด 4 slots
- ลบได้เมื่อเหลือมากกว่า 2 slots
- แต่ละ slot มี Provider dropdown และ Model dropdown
- Model dropdown โหลดจาก Provider Registry ตาม Provider ที่เลือก
- slot แสดง estimated credit, capability warnings และ validation status
- รองรับ drag reorder ในอนาคต แต่ MVP ใช้ปุ่ม move left/right ได้หากจำเป็น

ตัวอย่าง:

```text
AI Comparison                              2 of 4

Slot 1                                     Slot 2
[OpenAI              v]                    [Google Gemini       v]
[gpt-image model     v]                    [Gemini image model  v]
Estimated: 10 credits                      Estimated: 8 credits

[+ Add Model]                       Estimated total: 18 credits
```

### 4.2 Slot validation

ก่อน Generate ทุก slot ต้องผ่าน validation แยกกัน:

- Provider เปิดใช้งานและมี API configuration
- Model อยู่ใน allowlist ของ Provider
- Model รองรับ image generation
- รองรับ aspect ratio หรือมี normalization policy ที่ชัดเจน
- รองรับจำนวนและประเภท reference images ที่ configuration ปัจจุบันใช้งาน
- รองรับ safety/options ที่จำเป็น
- มี credit estimate

หาก slot ไม่รองรับ capability ใด:

- แสดง warning ที่ slot นั้นทันที
- ห้าม silently drop reference image หรือเปลี่ยน parameter
- ผู้ใช้ต้องเปลี่ยน Model, ปิด option ที่ไม่รองรับ หรือเอา slot ออกจาก Comparison

### 4.3 Generate action

ปุ่มหลักเปลี่ยนจาก `Generate Image` เป็น `Generate Comparison` เมื่อ Comparison Mode active

ก่อนส่งต้องแสดง:

- จำนวน jobs
- Provider และ Model ทั้งหมด
- estimated credit ต่อ slot
- estimated total credit
- warning เรื่อง capability หรือราคาที่อาจเปลี่ยน
- confirmation ก่อนเริ่ม process ที่มีค่าใช้จ่าย

## 5. User Journey

```text
Build prompt in Studio Creative Configurator
  -> Select Provider and Model
  -> Press Compare icon beside Model selector
  -> Review Slot 1 and configure Slot 2
  -> Optionally add Slot 3 and Slot 4
  -> Review capability validation and estimated total credits
  -> Confirm Generate Comparison
  -> Create Comparison Set and Comparison Run
  -> Enqueue 2-4 child generation jobs
  -> Open Comparison Workspace
  -> Observe independent progress for every slot
  -> Compare with synchronized zoom and pan
  -> Select optional Winner
  -> Add individual images or the whole set to Collection
  -> Reopen the set from History or Collection later
```

## 6. Comparison Workspace UX

### 6.1 Layout

Desktop:

- 2 images: two equal columns
- 3 images: configurable three columns or one large + two stacked; default three equal columns for fair comparison
- 4 images: 2x2 grid
- each viewport must have an equal comparison frame even when output resolutions differ
- model name, provider, status, generation time and credit appear in a compact header/footer per slot

Mobile:

- one image per viewport with horizontal swipe or tabs
- optional split view for two images on sufficiently wide devices
- model identity remains visible while swiping
- synchronized zoom may be disabled automatically when only one image is visible, but the shared viewport state must be retained

### 6.2 Synchronized inspection

Workspace controls:

- `Sync Zoom` on by default
- `Sync Pan` on by default
- zoom in/out
- mouse wheel or trackpad zoom
- drag to pan
- `Fit`, `100%`, and `Reset View`
- toggle sync off to inspect one slot independently
- fullscreen
- hide/show individual slots without deleting results

การ synchronize ต้องใช้ normalized coordinates แทน raw pixels เพื่อให้ภาพต่าง resolution และ aspect handling เลื่อนไปยังบริเวณสัมพันธ์กันได้

```text
normalizedCenterX = imageCenterX / renderedImageWidth
normalizedCenterY = imageCenterY / renderedImageHeight
normalizedZoom = visibleImageScale / fitScale
```

หาก Provider คืน aspect ratio ต่างจากที่ขอ:

- ห้าม stretch ภาพ
- ใช้ contain/letterbox ใน comparison frame
- แสดง actual dimensions และ mismatch warning

### 6.3 Slot actions

แต่ละผลลัพธ์รองรับ:

- open full detail
- download image
- mark/unmark as Winner
- use as Face Reference
- use as Style Reference
- use as Character Reference ตาม mode policy
- add to Collection
- retry failed slot โดยสร้าง child job ใหม่ใน Comparison Run เดิมหรือ Run ใหม่ตาม retry contract
- view source prompt, submitted prompt and generation parameters

Set-level actions:

- rename Comparison Set
- add all completed images to Collection
- start a new Run with the same prompt/configuration
- duplicate Run configuration and change models
- export comparison metadata
- delete set ตาม retention and lineage policy

## 7. Comparison Set and Run Model

### 7.1 Entity hierarchy

```text
Project (future)
  Collection
    Comparison Set
      Comparison Run
        Comparison Slot
          Generation Job
```

- `Comparison Set` คือกลุ่มการทดลองที่ผู้ใช้กลับมาใช้งานต่อได้
- `Comparison Run` คือการกด Generate Comparison หนึ่งครั้ง
- `Comparison Slot` เก็บ Provider/Model และเชื่อมกับ generation job
- generation job ยังคงเป็น history item ปกติและสามารถใช้งานเดี่ยวได้

Comparison Set ไม่จำเป็นต้องอยู่ใน Collection แต่สามารถ link เข้า Collection หนึ่งหรือหลายรายการได้ในอนาคต MVP อาจเริ่มจากหนึ่ง Collection หรือไม่มี Collection

### 7.2 Required snapshots

ทุก Run ต้องเก็บ immutable snapshot ณ ตอนกดยืนยัน:

- source prompt
- configuration/selections
- mode and template
- aspect ratio
- custom colors
- reference image job IDs and reference role
- safety settings
- user ID/username ตามระบบปัจจุบัน
- Provider and Model per slot
- estimated credit per slot and total
- capability registry version
- prompt compiler version เมื่อมี

ห้ามอ่านค่าจาก Studio state ปัจจุบันเพื่อแสดง metadata ของงานที่ส่งไปแล้ว

### 7.3 Proposed JSON shape

```json
{
  "id": "cmp_set_xxx",
  "name": "Fashion model comparison",
  "description": "",
  "collectionIds": ["col_xxx"],
  "winnerJobId": "job_xxx",
  "createdAt": 0,
  "updatedAt": 0,
  "runs": [
    {
      "id": "cmp_run_xxx",
      "status": "partially_completed",
      "sourcePrompt": "...",
      "configurationSnapshot": {},
      "estimatedTotalCredit": 18,
      "actualTotalCredit": 18,
      "createdAt": 0,
      "completedAt": 0,
      "slots": [
        {
          "id": "cmp_slot_1",
          "position": 1,
          "provider": "openai",
          "model": "model-id",
          "submittedPrompt": "...",
          "jobId": "job_xxx",
          "status": "completed",
          "estimatedCredit": 10,
          "actualCredit": 10,
          "error": null
        }
      ]
    }
  ]
}
```

### 7.4 Persistence boundary

- ห้ามเก็บ Comparison Run ไว้เฉพาะ in-memory queue
- refresh server หรือ browser ต้องยังเปิด Set และดู child job ที่บันทึกเสร็จแล้วได้
- ใช้ repository/service interface เพื่อให้ช่วงแรกใช้ JSON persistence ได้และย้ายเป็น database ภายหลังโดยไม่เปลี่ยน route/business logic
- write operation ต้อง serialized/atomic ตามรูปแบบ Collection Manager เพื่อป้องกัน child jobs update ทับกัน
- History cleanup ต้องซ่อม link, winner และ cover state ของ Comparison Set

## 8. Provider Architecture

### 8.1 Provider Registry contract

Comparison UI และ orchestrator ต้องอ่านข้อมูลผ่าน Provider Registry ไม่ใช้ hardcoded conditional ตามชื่อ OpenAI, Gemini หรือ Provider ในอนาคต

Model capability ขั้นต่ำ:

```json
{
  "provider": "provider-id",
  "model": "model-id",
  "displayName": "Model name",
  "enabled": true,
  "capabilities": {
    "imageGeneration": true,
    "imageReferences": true,
    "multipleImageReferences": true,
    "streaming": false,
    "supportedAspectRatios": ["1:1", "3:4", "4:3"],
    "maxReferenceImages": 4
  },
  "creditPolicy": {
    "estimateKey": "provider.model.default"
  }
}
```

Registry responsibilities:

- list enabled providers and models
- expose capability metadata
- validate requested configuration
- estimate credits
- normalize display names
- reject unknown or disabled models on server

### 8.2 Comparison Orchestrator

เพิ่ม service กลางที่รับ Comparison Run request แล้ว:

1. validate user and slots
2. compile/freeze prompt and configuration snapshot
3. validate capabilities per slot
4. calculate and return estimate before confirmation
5. create persistent Set/Run records
6. enqueue child jobs through Queue Manager
7. update each slot independently from queue events
8. calculate aggregate Run status and actual credits
9. expose progress to client

ห้ามให้ orchestrator เรียก Provider SDK/API โดยตรง ต้องผ่าน Queue Manager และ ProviderFactory เพื่อคง retry, safety, reference deduplication และ history behavior เดิม

## 9. API Design Proposal

Endpoints อาจปรับชื่อระหว่าง implementation review แต่ต้องแยก estimate ออกจาก confirm:

```text
POST   /api/comparisons/estimate
POST   /api/comparisons
GET    /api/comparisons
GET    /api/comparisons/:setId
PATCH  /api/comparisons/:setId
DELETE /api/comparisons/:setId

POST   /api/comparisons/:setId/runs
GET    /api/comparisons/:setId/runs/:runId
GET    /api/comparisons/:setId/runs/:runId/stream
POST   /api/comparisons/:setId/runs/:runId/slots/:slotId/retry
PATCH  /api/comparisons/:setId/winner
```

ข้อกำหนด:

- estimate response มี TTL หรือ pricing version
- confirm request ส่ง estimate token/version เพื่อป้องกันราคาคลาดเคลื่อนแบบ silent
- create Run รองรับ idempotency key ป้องกัน double click สร้าง 2 batches
- server ตรวจ Provider/Model allowlist ซ้ำเสมอ
- response ต้องคืน Set ID, Run ID และ child job IDs
- Run endpoint ต้องอ่าน persistent state ได้แม้ in-memory job ถูก cleanup แล้ว
- SSE ของ Run เป็น aggregate stream แต่ child job status endpoint เดิมยังใช้ได้

## 10. Queue, Concurrency and Failure Handling

### 10.1 Parent and child jobs

- Comparison Run เป็น logical parent ไม่ใช่ generation job
- แต่ละ slot เป็น child generation job ปกติ
- child jobs เข้าคิวตาม concurrency limit ของระบบ
- คำว่า `พร้อมกัน` ใน UX หมายถึง submit เป็น batch เดียวกัน ไม่รับประกันว่า Provider จะเริ่มประมวลผลใน millisecond เดียวกัน
- UI แสดง queued, processing, streaming, completed, failed และ cancelled แยกต่อ slot

### 10.2 Aggregate status

Run status ที่รองรับ:

- `draft`
- `awaiting_confirmation`
- `queued`
- `processing`
- `completed`
- `partially_completed`
- `failed`
- `cancelled`

กฎตัวอย่าง:

- completed ทุก slot -> `completed`
- สำเร็จอย่างน้อยหนึ่ง slotและมี failed/cancelled -> `partially_completed`
- ไม่มี slot สำเร็จและทุก slot terminal failure -> `failed`

### 10.3 Partial failure

- failure ของ slot หนึ่งห้ามลบผลลัพธ์ของ slot อื่น
- แสดงข้อความที่เป็นมิตรและ technical details แบบ expandable ตาม pattern เดิม
- safety rejection ใช้ refund policy เดิมของ Provider/job
- retry เฉพาะ slot ต้องไม่สร้างซ้ำ slot ที่สำเร็จ
- retry result ต้องเก็บ lineage ไปยัง failed slot attempt เดิม

## 11. Credits and Billing

- AI Comparison ไม่ใช่ feature ฟรี
- ทุก slot มี estimated และ actual credit แยก
- แสดง estimated total ก่อน confirm
- Model ซ้ำหลาย slot คิดเครดิตทุก slot
- child job หักเครดิตตาม lifecycle เดิมเมื่อเริ่ม process
- job ที่ไม่เคยเริ่มเพราะ queue validation failure ห้ามถูกหักเครดิต
- safety/provider failure ใช้ refund contract เดิม
- aggregate actual total ต้องคำนวณจาก ledger entries ไม่เชื่อค่าที่ client ส่ง
- หาก balance ไม่พอสำหรับ estimate ทั้ง batch ให้ block ก่อน create Run หรือใช้ explicit reservation policy ในอนาคต
- price change หลัง estimate ต้องแจ้งและขอ confirm ใหม่เมื่อเกิน tolerance ที่กำหนด

## 12. History and Collections Integration

### 12.1 History

- child image แสดงใน Background Queue & History ตามปกติ
- เพิ่ม badge `Comparison` และลิงก์กลับไป Comparison Set
- History filter รองรับแสดงเฉพาะ Comparison jobs ในอนาคต
- การเปิด child image ยังดู Parent Lineage และ reference roles ได้เหมือนงานปกติ

### 12.2 Collections

- เพิ่มภาพราย slot เข้า Collection ได้
- เพิ่ม completed images ทั้ง Set เข้า Collection ได้ใน action เดียว
- Collection แสดง grouping metadata ว่าภาพมาจาก Comparison Set เดียวกัน
- การลบภาพออกจาก Collection ไม่ลบ Comparison Set หรือไฟล์จริง
- การลบ Comparison Set ไม่ลบ child history/images โดยอัตโนมัติ เว้นแต่ผู้ใช้เลือก explicit destructive option ในอนาคต

## 13. Session and Recovery

- Comparison slot draft ต้อง persist ตาม session/mode โดยไม่ทับ Single Image selection
- reload ระหว่าง generation ต้องเปิด Run เดิมและ recover status จาก persistent Run + History
- ห้ามพึ่ง `/api/jobs/:id` เพียงอย่างเดียว เพราะ in-memory job อาจถูก cleanup และคืน 404
- completed child ที่มีใน History ต้องถูก repair กลับเป็น completed หาก Run state ค้าง
- หาก network หลุด client reconnect aggregate stream หรือ fallback polling ได้
- duplicate completion event ต้อง idempotent

## 14. Localization and Accessibility

- UI text ใหม่มี `en` และ `th`
- Compare icon มี tooltip, `aria-label`, focus state และ keyboard activation
- slot status ไม่ใช้สีเพียงอย่างเดียว ต้องมีข้อความ/icon state
- synchronized zoom controls รองรับ keyboard
- viewport มี accessible model label
- error และ credit confirmation อ่านตามลำดับที่เหมาะสมด้วย screen reader
- reduced motion preference ต้องปิด animation ที่ไม่จำเป็น

## 15. Security and Validation

- client ส่งเฉพาะ Provider/Model IDs; server resolve configuration จาก registry
- reject มากกว่า 4 หรือน้อยกว่า 2 slots
- reject duplicate slot IDs แต่อนุญาต duplicate Provider/Model combinations
- validate references, mode policy, aspect ratio และ safety ต่อ Model
- ห้าม client กำหนดราคา actual credit
- sanitize Comparison Set name/description
- authorization ต้องครอบ Set, Run, child jobs และ linked Collections
- rate limit batch creation แยกจาก single generation เมื่อระบบ user/login พร้อมใช้งาน
- API key และ provider error internals ห้ามรั่วไป client

## 16. Performance Requirements

- Model Tray ต้องไม่โหลด SDK ของ Provider
- lazy-load Comparison Workspace เมื่อเปิดใช้งาน
- thumbnail ใช้ไฟล์ขนาดเหมาะสม ไม่โหลด full-resolution ทั้ง History list
- synchronized pan/zoom ใช้ `requestAnimationFrame` และไม่ broadcast DOM event แบบ recursive
- จำกัด active full-resolution view สูงสุด 4 ภาพ
- aggregate event update ต้อง batch render เพื่อลด layout thrashing
- queue concurrency ยังคงถูกควบคุมฝั่ง server ไม่เพิ่มตามจำนวน slots แบบไร้ขีดจำกัด

## 17. Modular File Direction

ชื่อไฟล์จริงให้ตรวจตามโครงสร้างก่อน implement แต่ควรแยก responsibility โดยประมาณ:

```text
client/
  comparison/
    comparisonModeController.js
    comparisonModelTray.js
    comparisonWorkspace.js
    synchronizedViewport.js
    comparisonApi.js

server/
  comparison/
    comparisonManager.js
    comparisonRepository.js
    comparisonOrchestrator.js
    comparisonValidator.js
  providers/
    providerRegistry.js
```

ห้ามเพิ่ม logic ทั้งหมดลง `client/app.js` หรือ `server/server.js` ควรให้ไฟล์เดิมทำหน้าที่ bootstrap/routes และเรียก module ใหม่

## 18. Implementation Steps and Progress Tracking

### Phase A: Architecture and contracts

- [ ] สำรวจ ProviderFactory, Queue Manager, History, Collections และ credit lifecycle ปัจจุบัน
- [ ] ออกแบบ Provider Registry และ Model Capability schema
- [ ] ออกแบบ Comparison Set/Run repository interface
- [ ] กำหนด estimate/confirm/idempotency contract
- [ ] เพิ่ม unit tests สำหรับ validation และ aggregate status

### Phase B: Server orchestration

- [ ] เพิ่ม Comparison repository แบบ serialized persistence
- [ ] เพิ่ม Comparison Manager/Orchestrator
- [ ] เพิ่ม estimate endpoint
- [ ] เพิ่ม create/list/detail/update endpoints
- [ ] เชื่อม 2-4 child jobs เข้ากับ Queue Manager
- [ ] เพิ่ม persistent status recovery และ partial failure handling
- [ ] เพิ่ม aggregate SSE หรือ polling contract
- [ ] เพิ่ม credit and refund integration tests

### Phase C: Model selector UX

- [ ] เพิ่ม Compare icon ใกล้ AI Model selector
- [ ] เพิ่ม localized tooltip และ accessibility behavior
- [ ] เพิ่ม active state และ slot count badge
- [ ] เพิ่ม Comparison Model Tray เริ่มต้น 2 slots
- [ ] เพิ่ม/ลบ slots สูงสุด 4
- [ ] แสดง capabilities, warnings และ cost estimate ต่อ slot
- [ ] เพิ่ม confirmation ก่อน Generate Comparison
- [ ] persist Comparison draft แยกจาก Single Image state

### Phase D: Comparison Workspace

- [ ] เพิ่ม responsive 2/3/4-image layout
- [ ] แสดง independent job status และ partial results
- [ ] เพิ่ม normalized synchronized zoom/pan
- [ ] เพิ่ม Fit, 100%, Reset, fullscreen และ sync toggle
- [ ] เพิ่ม slot actions และ Winner selection
- [ ] รองรับ reload/reconnect ระหว่างงาน

### Phase E: History and Collections

- [ ] เพิ่ม Comparison badge และ Set link ใน History
- [ ] เพิ่ม individual/add-all Collection actions
- [ ] เพิ่ม Comparison grouping metadata ใน Collection
- [ ] เพิ่ม cleanup/repair rules
- [ ] เพิ่ม reopen Comparison Set จาก History และ Collection

### Phase F: Verification

- [ ] Unit tests: slot limits, duplicate models, registry validation
- [ ] Unit tests: aggregate status and partial failures
- [ ] Unit tests: estimate, deduction and refund totals
- [ ] Persistence tests: concurrent child updates do not lose data
- [ ] Recovery tests: browser/server refresh and in-memory job cleanup
- [ ] UI tests: 2, 3 and 4 slots
- [ ] UI tests: synchronized zoom/pan with different resolutions
- [ ] Accessibility and Thai/English localization checks
- [ ] Manual verification with at least two Providers when credentials are available

## 19. MVP Acceptance Criteria

1. Compare icon อยู่ติดกับพื้นที่เลือก AI Model และเปิด/ปิด Comparison Mode ได้โดยไม่ reset Studio configuration
2. Comparison Mode เริ่มด้วย 2 slots และเพิ่มได้สูงสุด 4 slots
3. เลือก Provider เดียวกัน, ต่าง Provider หรือ Model ซ้ำกันได้
4. ทุก slot ผ่าน server-side capability validation ก่อน enqueue
5. ผู้ใช้เห็น estimated credit ต่อ slot และรวมก่อนยืนยัน
6. การยืนยันหนึ่งครั้งสร้าง Comparison Run และ child jobs 2-4 งานโดยไม่เกิด duplicate จาก double click
7. failure ของงานหนึ่งไม่ทำให้ผลสำเร็จของงานอื่นหาย
8. refresh browser แล้วยังเปิด Comparison Run และผลลัพธ์เดิมได้
9. Workspace แสดง 2-4 ภาพและซูม/เลื่อนพร้อมกันด้วย normalized viewport state
10. ผู้ใช้ปิด sync เพื่อดูภาพแยกได้
11. ผู้ใช้เลือก Winner และเพิ่มภาพรายรูปหรือทั้งหมดเข้า Collection ได้
12. child jobs ยังคงเปิดจาก History และเชื่อมกลับ Comparison Set ได้
13. actual credits ตรงกับ child job ledger และ refund policy
14. การเพิ่ม Provider ใหม่ทำผ่าน Provider Registry/capability metadata โดยไม่แก้ Comparison Workspace เฉพาะแบรนด์

## 20. Out of Scope for MVP

- AI ตัดสิน Winner อัตโนมัติ
- blind voting หรือ team review
- pixel-level image diff/heatmap
- automatic prompt optimization per Provider
- statistical benchmark dashboard
- automatic social publishing
- Project-level permissions จนกว่า Project/User phase จะพร้อม
- ลบ child images พร้อม Comparison Set แบบ cascade

## 21. Decisions to Confirm Before Implementation

1. Comparison Set ต้องถูกสร้างอัตโนมัติทุกครั้ง หรือให้ผู้ใช้เลือก Set เดิมก่อน Generate
2. MVP จะมี Run หลายรอบใน Set เดียวทันที หรือเริ่มจากหนึ่ง Set ต่อหนึ่ง Run แล้วค่อย migrate
3. Winner เลือกได้หนึ่งภาพต่อ Set หรือหนึ่งภาพต่อ Run
4. Add all to Collection จะใช้ Default Collection อัตโนมัติหรือเปิด Collection picker
5. Slot 2 ควร auto-select Model ที่ราคาประหยัด/แนะนำ หรือบังคับให้ผู้ใช้เลือกเอง
6. เมื่อ reference capability ไม่เท่ากัน จะ block ทั้ง Run หรืออนุญาตให้ผู้ใช้ exclude option เฉพาะ slot ใน phase หลัง
7. Comparison Workspace เปิด inline แทน Visual Viewport, เป็น full-screen overlay หรือเป็น route แยก โดยข้อเสนอปัจจุบันคือ route/workspace แยกที่เปิดจากหน้าเดิม

## 22. Recommended Defaults

- Auto-create Comparison Set ในการ Generate ครั้งแรก
- รองรับหลาย Runs ต่อ Set ตั้งแต่ data model แต่ MVP UI อาจเริ่มจาก Run เดียว
- Winner หนึ่งภาพต่อ Run และ optional Set Winner หนึ่งภาพ
- Add all เปิด Collection picker พร้อมเลือก Default Collection ไว้ล่วงหน้า
- Slot 2 ใช้ Provider เดียวกับ Slot 1 แต่ยังไม่ auto-select Model ซ้ำ หากมี Model ทางเลือก
- capability mismatch เป็น blocking validation เพื่อรักษาความยุติธรรมของ MVP
- Comparison Workspace เป็น workspace/route แยก และ Compare icon/model tray อยู่ในหน้า Configurator เดิม
