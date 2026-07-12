# Step 13: Image Collections, Navigation, and UI Reliability Fixes

**ID**: `013-image-collections-navigation-and-ui-fixes`  
**Application**: `ModelPromptForge`  
**Status**: Implemented  
**Implementation authorization**: Approved and completed

## 1. Objective

เพิ่มระบบ Collection สำหรับจัดกลุ่มภาพ generation history ที่เกี่ยวข้องกัน เช่น ตัวละครหลายคนในเรื่องเดียวกันหรือ character set เดียวกัน พร้อมแก้ปัญหา Face Match และ language switching และเพิ่มปุ่มเลื่อนกลับไปยัง `Visual Viewport & Queue`

งานรอบนี้ต้องออกแบบ data model ให้ต่อยอดไปสู่ AI Story/Character orchestration ได้ แต่ยังไม่รวมการวิเคราะห์ story หรือสร้างตัวละครอัตโนมัติด้วย AI

## 2. Scope

### Included in Step 13

- สร้าง, แก้ไข, ลบ และเลือก Collection
- กำหนดชื่อ, description, story และ default collection
- เพิ่ม/ลบ history images ใน Collection
- แสดง history แบบกรองตาม Collection
- แสดง Collection membership ใน history card และ lightbox
- เตรียม metadata สำหรับ AI Story/Character Set ในอนาคต
- แก้ Face Match stale reference state
- แก้ language switch lifecycle
- เพิ่ม floating scroll-to-viewport control
- เพิ่ม persistence, validation และ API contracts ที่เกี่ยวข้อง

### Deferred to a Future Requirement

- AI วิเคราะห์ story เพื่อแยกตัวละคร
- AI สร้าง character profiles หรือ generation plans
- Batch generation ตัวละครทีละตัว
- Automatic prompt orchestration และ consistency evaluation
- Retry/resume workflow สำหรับ AI-generated character batches
- Provider/model selection สำหรับ story analysis

Step 13 ต้องไม่เรียก AI API ใหม่เพื่อทำงาน Collection

## 3. Current Structure and Constraints

- History ปัจจุบันเก็บใน `server/history.json`
- Generated images เก็บใน `client/outputs/`
- History UI render จาก `state.history` ใน `client/app.js`
- Queue และ active jobs อยู่ใน memory
- Lightbox รองรับ generation metadata และ reference lineage แล้ว
- Client state บางส่วนเก็บใน `localStorage` แยกตาม generation mode
- Backend ใช้ JSON file storage จึงต้องเขียนแบบ atomic เพื่อลดความเสียหายจาก concurrent writes

Collection ต้องอ้างถึง history item ด้วย job ID ไม่ duplicate Base64 หรือ image file

## 4. Collection Domain Model

### 4.1 Storage

เพิ่มไฟล์ `server/collections.json` โดยเริ่มต้นเป็น:

```json
{
  "version": 1,
  "defaultCollectionId": null,
  "collections": []
}
```

ตัวอย่าง Collection:

```json
{
  "id": "col_1783792583067_ab12cd",
  "name": "Moonlight Cafe Story",
  "description": "Character set for the same cafe story world",
  "story": "A group of friends reconnect at a late-night cafe in Bangkok.",
  "coverJobId": "job_1783792583067_243e24qel",
  "jobIds": [
    "job_1783792583067_243e24qel",
    "job_1783793155000_xxxxx"
  ],
  "createdAt": 1783792583067,
  "updatedAt": 1783793155000,
  "futureAutomation": {
    "status": "not_configured",
    "characterProfiles": [],
    "generationPlan": null
  }
}
```

### 4.2 Field Rules

- `id`: server-generated, unique และ immutable
- `name`: required, trim แล้วต้องยาว 1-100 ตัวอักษร
- `description`: optional, ไม่เกิน 1,000 ตัวอักษร
- `story`: optional, ไม่เกิน 20,000 ตัวอักษร
- `coverJobId`: optional และต้องอยู่ใน `jobIds`; ถ้าไม่กำหนดให้ใช้สมาชิกตัวแรกเป็น cover
- `jobIds`: unique ordered array ของ existing history job IDs
- `createdAt`: immutable Unix timestamp milliseconds
- `updatedAt`: เปลี่ยนทุก mutation
- `futureAutomation`: reserved object สำหรับ requirement ถัดไป Client ใน Step 13 ห้ามแก้ค่า object นี้โดยตรง

### 4.3 Default Collection

- มี default collection ได้ครั้งละหนึ่ง Collection ต่อระบบ PoC ปัจจุบัน
- ค่า canonical อยู่ที่ root field `defaultCollectionId` ไม่เก็บ `isDefault` ซ้ำในทุก Collection
- การ set default ใหม่แทนค่าเดิมทันที
- สามารถ clear default ได้
- เมื่อ generation สำเร็จและมี default collection ระบบต้องเพิ่ม job ID ใหม่เข้า Collection โดยอัตโนมัติ
- หาก default collection ถูกลบ ให้ตั้ง `defaultCollectionId` เป็น `null`
- การเพิ่มอัตโนมัติต้อง idempotent และห้ามเพิ่ม job ID ซ้ำ

## 5. Collection API

เพิ่ม endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/collections` | List collections พร้อม default ID และ summary |
| `POST` | `/api/collections` | Create collection |
| `GET` | `/api/collections/:id` | Collection detail พร้อม resolved history members |
| `PATCH` | `/api/collections/:id` | Update name, description, story หรือ cover |
| `DELETE` | `/api/collections/:id` | Delete collection metadata เท่านั้น |
| `POST` | `/api/collections/:id/images` | Add one or more history job IDs |
| `DELETE` | `/api/collections/:id/images/:jobId` | Remove membership |
| `PUT` | `/api/collections/:id/default` | Set as default |
| `DELETE` | `/api/collections/default` | Clear default |

API requirements:

- Validate IDs, lengths และ JSON shape ฝั่ง server
- Unknown Collection หรือ history job ID ใช้ `404`
- Invalid payload ใช้ `400`
- Duplicate membership สำเร็จแบบ idempotent
- Response error ใช้ `{ "error": { "code": "...", "message": "..." } }`
- ห้ามรับ filesystem path จาก client สำหรับ Collection operations
- เขียน `collections.json` ผ่าน temporary file แล้ว rename เพื่อให้เป็น atomic write
- Serialize Collection mutations เพื่อป้องกัน lost update ใน process เดียวกัน

## 6. History and Deletion Semantics

- Collection membership เป็น reference ไปยัง `history.json`; ไม่สร้างสำเนาภาพ
- การลบ Collection ห้ามลบ history หรือ output image
- การลบ history item ต้องลบ job ID นั้นออกจากทุก Collection
- หาก deleted job เป็น cover ให้เลือกสมาชิกที่เหลือตัวแรก; ถ้าไม่มีให้ `coverJobId = null`
- Lightbox lineage behavior เดิมต้องยังทำงาน
- Collection detail ต้องไม่ crash เมื่อพบ orphan job ID จากข้อมูลเก่า; ให้ skip ใน resolved members และรายงาน orphan count ใน server log

## 7. Collection User Experience

### 7.1 Placement

ขยาย panel `Background Queue & History` โดยเพิ่ม Collection toolbar เหนือ history grid:

- Collection selector: `All Images`, default Collection และ Collection อื่น
- `New Collection` action
- `Edit Collection` action เมื่อเลือก Collection
- Default indicator
- จำนวนภาพใน Collection

ใช้ theme เดิม: dark glass panel, purple/cyan accents, compact controls และ neon focus states

### 7.2 Create/Edit Collection

ใช้ modal หรือ expandable editor ที่เข้ากับ lightbox/design system เดิม ประกอบด้วย:

- Name
- Description
- Story
- Set as default checkbox/action
- Cover image selector จากสมาชิก
- Save และ Cancel

ต้องมี character counter สำหรับ description และ story และแสดง validation inline

### 7.3 Add Images

รองรับอย่างน้อยสองทาง:

1. History card action: `Add to Collection`
2. Lightbox action: `Add to Collection`

Selection UI ต้องรองรับ:

- เพิ่มเข้า Collection ที่มีอยู่
- สร้าง Collection ใหม่แล้วเพิ่มภาพปัจจุบัน
- แสดง Collection ที่ภาพเป็นสมาชิกอยู่แล้ว
- ไม่ duplicate membership

### 7.4 Browse and Empty States

- `All Images` แสดง history ทั้งหมดตาม behavior เดิม
- เมื่อเลือก Collection ให้ filter ตามลำดับ `jobIds` ของ Collection
- Collection ที่ไม่มีภาพแสดง empty state พร้อม action เพิ่มภาพ
- History card แสดง badge จำนวน Collection หรือชื่อ Collection เมื่อมีพื้นที่พอ
- Lightbox แสดง Collection memberships พร้อม navigation ไป Collection
- Active Queue ไม่ถูก filter ด้วย Collection เพราะ job ยังไม่เป็น successful history item

### 7.5 Default Collection Generation Flow

หลัง Queue บันทึก output และ history สำเร็จ:

1. อ่าน default Collection
2. เพิ่ม new job ID แบบ idempotent
3. อัปเดต `updatedAt`
4. Emit completion ตามเดิม
5. Client refresh ทั้ง history และ Collection summaries

หากการอัปเดต Collection ล้มเหลว ห้ามทำให้ generation ที่บันทึกภาพสำเร็จแล้วเปลี่ยนเป็น failed; ให้ log warning และส่ง optional `collectionWarning` ใน completion metadata

## 8. Future AI Story/Character Extension Points

Step 13 เตรียมโครงสร้างไว้เท่านั้น Requirement ถัดไปสามารถเพิ่ม entities แยก เช่น:

```json
{
  "characterProfiles": [
    {
      "id": "char_...",
      "name": "Mali",
      "role": "protagonist",
      "description": "...",
      "visualTraits": {},
      "referenceJobIds": [],
      "status": "draft"
    }
  ],
  "generationPlan": {
    "status": "draft",
    "orderedCharacterIds": [],
    "currentCharacterId": null
  }
}
```

Design constraints สำหรับอนาคต:

- Story text เป็น input ต้นทาง แต่ AI output ต้องเก็บแยกจาก user-authored story
- Character profile ต้องมี stable ID และ reference history IDs
- Batch generation ต้องเป็น resumable plan ไม่ผูกกับ browser session
- แต่ละ generated job ในอนาคตควรมี `collectionId` และ `characterProfileId`
- ต้องมี human review ก่อน enqueue ตัวละครอัตโนมัติ
- ต้องไม่ overwrite user-edited profile เมื่อ re-analyze story โดยไม่มี confirmation
- AI analysis/generation status ไม่ควรถูกยัดไว้ใน `history.json`; ควรมี orchestration storage แยก

## 9. Bug Fix: Face Match Must Not Retain Images While Disabled

### 9.1 Required Invariant

เมื่อ `#ref-face-match` ไม่ checked ค่าต่อไปนี้ต้องว่างเสมอ:

```js
state.faceReferenceImageA === null
state.faceReferenceImageB === null
state.faceReferenceJobIds.length === 0
```

และ:

- file input ต้องถูก reset
- face preview slots ต้องถูกซ่อน/ล้าง
- payload `/api/generate` ต้องไม่ส่ง face reference data
- saved `localStorage` state ต้องไม่เก็บ stale face images

### 9.2 Lifecycle Cases

ต้อง enforce invariant เมื่อ:

- App initialization
- restore state จาก `localStorage`
- เปลี่ยน generation mode
- import configuration
- uncheck Face Match
- เปลี่ยนไป DALL-E model
- reset form

หาก restore/import พบ face images แต่ `faceMatch === false` ให้ discard images และ job IDs ไม่เปิด checkbox อัตโนมัติ

Upload และ `Use as Face Reference` actions ต้องเปิด Face Match อย่างชัดเจนก่อนเก็บภาพ หรือเรียก shared helper ที่เปิด checkboxและ sync state แบบ atomic

## 10. Bug Fix: Language Switch Must Rebind Dynamic UI Safely

### 10.1 Expected Behavior

- คลิก `TH` หรือ `EN` แล้ว label ของ dynamic fields/options เปลี่ยนทันที
- Active language pill ถูกต้อง
- Existing selections, custom inputs, locks, validation state, references, colors และ accordion open state ไม่สูญหาย
- Prompt values ไม่เปลี่ยนภาษา; เปลี่ยนเฉพาะ display labels
- Language choice persist หลัง reload (global key เช่น `model_prompt_forge_language`)

### 10.2 Rendering Lifecycle

กำหนด lifecycle เดียวสำหรับ language change:

1. Capture dynamic UI state ที่จำเป็น
2. เปลี่ยน `state.language`
3. Re-render form labels/options
4. Rebind dynamic form handlers หรือใช้ event delegation ที่ stable container
5. Restore selections และ visual state
6. Update summaries และ prompt preview
7. Persist language

ต้องป้องกัน duplicate listeners หลังสลับภาษาหลายครั้ง โดยแยก static event binding ออกจาก dynamic form binding หรือใช้ delegated listeners

`renderForm()` ห้ามทำให้ top-level language pill listeners หาย และห้ามเรียก full `bindEvents()` ซ้ำโดยไม่มี cleanup

## 11. Feature: Inline Scroll to Visual Viewport & Queue

### 11.1 Visibility

เพิ่มปุ่ม up icon ขนาดเล็กในแถวเดียวกันและอยู่ถัดจาก `Import Configuration JSON` เพื่อให้เข้าถึงได้ทันทีเมื่อผู้ใช้เลื่อนมาถึงส่วนล่างของ Configurator โดยไม่ใช้ floating overlay

### 11.2 Interaction

- Click แล้ว smooth scroll ไปที่ `#visual-dashboard`
- หาก dashboard collapsed ให้ expand ก่อน scroll
- Focus heading/control ของ `Visual Viewport & Queue` หลัง scroll เพื่อ keyboard accessibility
- รองรับ `prefers-reduced-motion` โดยใช้ instant scroll
- ปุ่มต้องมี `type="button"`, `aria-label`, tooltip และ keyboard activation

### 11.3 Visual Design

- ใช้ compact rounded-square button ขนาดเล็กใน action row เดียวกับ Import
- Icon ใช้ up arrow ที่ไม่พึ่ง emoji rendering เพียงอย่างเดียว
- Reuse purple/cyan border, glass background และ glow tokens จาก `client/style.css`
- ปุ่มต้องไม่บัง `Import Configuration JSON` และจัดระยะห่างด้วย flex layout
- Mobile ต้องมี touch target อย่างน้อย 44x44 px

## 12. Backend and Frontend Change Map

Expected implementation touchpoints:

| File | Expected Responsibility |
|---|---|
| `server/collectionManager.js` | Collection storage, validation, atomic writes และ membership operations |
| `server/server.js` | Collection REST routes |
| `server/queueManager.js` | Add successful jobs to default Collection; cleanup memberships on history deletion |
| `server/collections.json` | Versioned Collection persistence |
| `client/index.html` | Collection toolbar/editor/actions และ scroll-up control |
| `client/style.css` | Collection components และ floating control ตาม theme |
| `client/app.js` | Collection state/API/rendering, Face Match invariant, language lifecycle และ observer |
| `requirements/README.md` | Update architecture/API/data contracts หลัง implementation สำเร็จ |

ชื่อไฟล์และ abstraction สามารถปรับได้ระหว่าง implementation หากพบ pattern ที่เหมาะกับ codebase มากกว่า แต่ต้องอัปเดต requirement นี้และ README ให้ตรงกับโครงสร้างจริง

### 12.1 Open Studio Configurator Floating Action Refinement

- ปุ่ม `#btn-floating-config` (`Open Studio Configurator`) ต้องใช้ visual treatment เดียวกับ `#btn-generate-image` ได้แก่ gold gradient, dark text, gold border, glow, pulse และ hover/active feedback
- Reuse `.btn-neon-yellow-glow` เพื่อให้ทั้งสองปุ่มใช้ design token และ interaction state ชุดเดียวกัน ไม่สร้างสีทองซ้ำอีกชุด
- คงรูปทรง floating pill และ fixed positioning ของปุ่ม Studio ไว้ เพื่อไม่เปลี่ยน affordance เดิม
- ขยับปุ่มสูงขึ้นเล็กน้อยจากตำแหน่งเดิม เพื่อให้เข้าถึงง่ายและไม่ชิดขอบล่าง โดย target desktop offset คือประมาณ `3.25rem`
- Mobile offset ต้องรวม `env(safe-area-inset-bottom)` และรักษา touch target ไม่น้อยกว่า 44px
- ปุ่มต้องไม่ทับ floating scroll-to-viewport control ที่กำหนดใน Section 11; เมื่อ Step 13 implement ครบ ให้จัดทั้งสอง action เป็น floating action stack เดียวกัน
- Behavior เดิมยังคงเหมือนเดิม: click แล้ว expand `#creative-configurator`, ซ่อน floating trigger และ smooth-scroll ไปยัง configurator

### 12.1 Open Studio Configurator Floating Action Refinement

- ปุ่ม `#btn-floating-config` (`Open Studio Configurator`) ต้องใช้ visual treatment เดียวกับ `#btn-generate-image` ได้แก่ gold gradient, dark text, gold border, glow, pulse และ hover/active feedback
- Reuse `.btn-neon-yellow-glow` เพื่อให้ทั้งสองปุ่มใช้ design token และ interaction state ชุดเดียวกัน ไม่สร้างสีทองซ้ำอีกชุด
- คงรูปทรง floating pill และ fixed positioning ของปุ่ม Studio ไว้ เพื่อไม่เปลี่ยน affordance เดิม
- ขยับปุ่มสูงขึ้นเล็กน้อยจากตำแหน่งเดิม เพื่อให้เข้าถึงง่ายและไม่ชิดขอบล่าง โดย target desktop offset คือประมาณ `3.25rem`
- Mobile offset ต้องรวม `env(safe-area-inset-bottom)` และรักษา touch target ไม่น้อยกว่า 44px
- ปุ่มต้องไม่ทับ floating scroll-to-viewport control ที่กำหนดใน Section 11; เมื่อ Step 13 implement ครบ ให้จัดทั้งสอง action เป็น floating action stack เดียวกัน
- Behavior เดิมยังคงเหมือนเดิม: click แล้ว expand `#creative-configurator`, ซ่อน floating trigger และ smooth-scroll ไปยัง configurator

## 13. Acceptance Criteria

### Collections

- สร้าง Collection พร้อม name/description/story ได้
- แก้ไขและลบ Collection โดยไม่ลบภาพได้
- เพิ่ม/ลบ history images และไม่เกิดรายการซ้ำ
- ตั้ง/เปลี่ยน/ล้าง default Collection ได้
- Generation ใหม่ถูกเพิ่มเข้า default Collection หลังสำเร็จ
- ลบ history แล้ว membership และ cover ถูก cleanup
- Filter `All Images` และแต่ละ Collection ถูกต้อง
- Restart server แล้วยังอ่าน Collection ได้

### Face Match

- Checkbox ปิดแล้วไม่มี face image/job ID ใน state, localStorage หรือ generation payload
- Restore/import/mode switch ไม่ทำให้ stale reference กลับมา
- Upload หรือ loopback assignment เปิด checkbox และ sync UI/state ถูกต้อง

### Language

- สลับ TH/EN ได้หลายครั้งโดย controls ยังทำงาน
- Selections และ UI state ไม่หาย
- ไม่มี duplicate event behavior
- Reload แล้วยังคงภาษาที่เลือก

### Scroll Control

- แสดงและซ่อนตามตำแหน่ง panel ถูกต้องทั้ง desktop/mobile
- Scroll และ expand visual dashboard ได้
- Keyboard และ reduced-motion behavior ผ่าน
- ไม่บัง import action หรือ modal controls

### Open Studio Configurator Action

- สี, glow, pulse, hover และ active state ตรงกับปุ่ม `Generate Image`
- ปุ่มอยู่สูงกว่าตำแหน่งเดิมและกดได้สะดวกทั้ง desktop/mobile
- ยังคง expand และ scroll ไป Studio Configurator ได้ตาม behavior เดิม
- ไม่ชนกับ safe area หรือ floating controls อื่น

### Open Studio Configurator Action

- สี, glow, pulse, hover และ active state ตรงกับปุ่ม `Generate Image`
- ปุ่มอยู่สูงกว่าตำแหน่งเดิมและกดได้สะดวกทั้ง desktop/mobile
- ยังคง expand และ scroll ไป Studio Configurator ได้ตาม behavior เดิม
- ไม่ชนกับ safe area หรือ floating controls อื่น

## 14. Verification Plan

### Data/API

- Unit tests สำหรับ validation, default uniqueness, idempotent membership และ cover fallback
- Concurrent mutation test เพื่อยืนยัน serialized/atomic writes
- API tests สำหรับ success, invalid payload, 404 และ duplicate add
- History deletion integration test ตรวจ Collection cleanup

### Client

- Collection create/edit/delete/add/remove/filter manual and automated flows
- Face Match lifecycle tests ครบทุก entry point ใน Section 9.2
- Language toggle repeated-switch test พร้อม selection/custom input/lock preservation
- IntersectionObserver visibility และ keyboard navigation tests
- Responsive visual check ที่ desktop, tablet และ mobile widths

### Regression

- Existing queue partial preview, completion และ moderation failure
- History lightbox, download, delete และ lineage
- Per-mode localStorage persistence
- DALL-E reference lockout
- Import/export configuration

## 15. Out of Scope Decisions Requiring Future Review

Requirement ถัดไปต้องตัดสินใจเพิ่มเติมก่อนทำ AI automation:

- AI provider/model สำหรับ story analysis
- Character schema และ editable fields ขั้นสุดท้าย
- Credit calculation สำหรับ analysis และ batch generation
- Maximum characters ต่อ story และ concurrency policy
- Human approval checkpoints
- Retry, cancellation และ resume semantics
- Character consistency scoring และ reference selection strategy
- Multi-user ownership/permissions ของ Collections

## 16. Implemented Structure Notes

- Collection persistence อยู่ใน `server/collectionManager.js` และ `server/collections.json`
- Collection mutations ถูก serialize ใน process และเขียนผ่าน temporary file + rename
- REST routes อยู่ใน `server/server.js` ตาม contract ใน Section 5
- Queue เพิ่ม successful job เข้า default Collection หลัง history persistence และไม่ fail generation หาก Collection update ล้มเหลว
- History deletion cleanup membership และ cover ผ่าน Collection manager
- Client เพิ่ม Collection toolbar, create/edit modal, default/cover controls, filtering และ membership editor สำหรับ history cards/lightbox
- Face Match ใช้ shared invariant helpers เพื่อ clear state, previews, file input, localStorage และ generation payload เมื่อ disabled
- Language selection persist ใน `model_prompt_forge_language` และ dynamic controls ถูก bind ใหม่หลัง re-render โดยไม่ bind static controls ซ้ำ
- Scroll control อยู่ถัดจาก `Import Configuration JSON` และรองรับการ expand dashboard, reduced-motion และ keyboard accessibility
- Backend tests อยู่ใน `test/collectionManager.test.js` และเรียกด้วย `node --test` หรือ `npm test`
