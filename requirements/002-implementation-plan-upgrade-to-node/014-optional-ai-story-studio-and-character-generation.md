# Step 14: Optional AI Story Studio and Character Generation

**ID**: `014-optional-ai-story-studio-and-character-generation`  
**Application**: `ModelPromptForge`  
**Status**: Draft for review  
**Feature type**: Optional paid workflow  
**Dependency**: Step 13 Image Collections  
**Implementation authorization**: Not yet approved

## 1. Objective

เพิ่ม Optional `Story Studio` สำหรับให้ผู้ใช้ใส่ plot แล้วใช้ Gemini วิเคราะห์โลกของเรื่อง ตัวละคร บุคลิก ความสัมพันธ์ และแนวทางภาพ จากนั้น map ตัวละครเข้าสู่ attribute/template ของ ModelPromptForge เพื่อสร้าง canonical character images ทีละคนอย่างมีขั้นตอน

Story Studio ไม่ใช่ feature ฟรี การวิเคราะห์ด้วย AI, re-analysis และ image generation ต้องคิด credits ตาม credit contract ในเอกสารนี้

## 2. Optional Product Boundary

- App หลักและ manual image generation ต้องใช้งานได้โดยไม่เปิด Story Studio
- Collection ปกติไม่จำเป็นต้องมี story, cast หรือ AI metadata
- ผู้ใช้เข้าสู่ Story Studio ผ่าน action ที่ชัดเจน เช่น `Open Story Studio`
- ห้ามเปิด AI analysis หรือหัก credit อัตโนมัติเพียงเพราะสร้าง/เปิด Collection
- ห้าม auto-enroll Collection เก่าเข้า Story Studio
- Story Studio state ต้องแยกจาก manual configurator state แต่สามารถส่ง approved character configuration ไปเปิดใน configurator ได้
- หากปิดหรือยกเลิก Story Studio รูปภาพและ Collection ปกติต้องไม่เสียหาย

## 3. User Journey

```text
Create/Open Collection
  -> Choose Open Story Studio (optional)
  -> Enter plot and visual direction
  -> Review credit estimate
  -> Confirm and analyze story
  -> Review/edit cast
  -> Map approved characters to existing attributes
  -> Review visual configuration
  -> Review generation plan and total image credits
  -> Generate canonical headshot one character at a time
  -> Approve canonical face
  -> Generate character sheet
  -> Approve character
  -> Continue to next character
  -> Optional future scene workflow
```

Human approval is required before AI analysis, before batch image generation, and before changing canonical identity.

## 4. Story Studio Screen Structure

Story Studio เป็น workspace แยกจากหน้าสร้างภาพหลัก แต่เชื่อมผ่าน Collection เดียวกัน

Desktop layout:

```text
| Story Studio Header: Collection, save status, credit balance |
| Step Navigation | Active Workspace                           |
| 1 Story         |                                            |
| 2 Cast          |                                            |
| 3 Visual Setup  |                                            |
| 4 Generate      |                                            |
| 5 Scenes        |                                            |
| Footer: progress, estimated cost, primary action              |
```

Mobile layout:

- Step navigation เป็น horizontal progress indicator
- Editor เปิดเป็น full-screen sheet
- Primary/secondary actions อยู่ใน sticky bottom bar
- Credit estimate ต้องเห็นก่อนปุ่มยืนยันที่มีค่าใช้จ่าย

### Step 1: Story

Fields:

- Title
- Plot/Story
- Optional genre
- Optional setting/period
- Optional visual direction
- Optional expected cast size
- Analysis quality: `Fast & Economical` หรือ `Deep Analysis`

Actions:

- `Save Draft`: ไม่คิด credit
- `Estimate Analysis`: ไม่คิด creditและไม่เรียก model
- `Analyze Story`: แสดง confirmation พร้อม credit cost ก่อนดำเนินการ

### Step 2: Cast

แสดง Character Cards พร้อม:

- Name
- Role และ importance
- Personality
- Age range, gender และ ethnicity
- Story description
- Visual concept
- Relationships
- Confidence และ warnings
- Status: `Draft`, `Needs Review`, `Approved`, `Generating`, `Generated`, `Failed`

User สามารถ add/edit/remove/merge characters โดยไม่คิด AI credit หากเป็น manual edit

### Step 3: Visual Setup

- Map character concepts ไปยัง existing attribute IDs
- แสดง confidence ต่อ field
- ใช้ custom override เมื่อไม่มี exact match
- แสดง mapping warnings
- แยก core identity กับ scene-flexible attributes
- เปิด config ใน manual configurator ได้
- `Remap with AI` เป็น paid AI action และต้องยืนยัน credit
- Manual mapping/edit ไม่คิด AI credit

### Step 4: Generate Characters

ต่อ character:

1. Generate headshot candidates
2. User เลือก canonical face
3. Generate character sheet โดยใช้ canonical reference
4. User approve character
5. Continue to next character

Default ต้อง pause หลังแต่ละ character เพื่อ review ผู้ใช้สามารถเปิด `Auto-continue approved characters` ได้เอง

### Step 5: Scenes

ใน Step 14 ให้เป็น preparation/entry point เท่านั้น การสร้าง scene หลายตัวละครแบบ orchestration เต็มรูปแบบควรแยก requirement ถัดไป

- แสดง approved characters และ canonical references
- สร้าง scene draft ด้วย manual input ได้
- ยังไม่รับประกัน multi-character identity consistency เกิน reference limit ของ provider

## 5. AI Model Strategy

### Default Analysis Model

ใช้ `gemini-3.1-flash-lite` สำหรับ `Fast & Economical` เพราะเหมาะกับ high-volume structured data processing และมีต้นทุนต่ำ

### Deep Analysis Model

ใช้ `gemini-2.5-flash` สำหรับ `Deep Analysis` เมื่อ:

- Plot ซับซ้อน
- ตัวละครหรือความสัมพันธ์จำนวนมาก
- ต้องวิเคราะห์ motivation/continuity ลึกขึ้น
- Fast analysis ให้ confidence ต่ำ

### Model Rules

- Model IDs ต้อง configurable ฝั่ง server ไม่ hard-code ใน client
- UI แสดง product mode (`Fast`, `Deep`) ไม่จำเป็นต้อง expose model ID ให้ user ทั่วไป
- Admin สามารถดู model/version ใน technical metadata
- ใช้ structured output JSON schema
- ห้ามใช้ image-generation model สำหรับ text story analysis
- ก่อน implementation ต้อง verify current model availability และ pricing จากเอกสาร Google อย่างเป็นทางการ

References:

- `https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash`
- `https://ai.google.dev/gemini-api/docs/models`
- `https://ai.google.dev/gemini-api/docs/pricing`

## 6. Credit Contract

### 6.1 Proposed Default Credit Costs

ค่าต่อไปนี้เป็น product credit defaults สำหรับ PoC และต้องเก็บเป็น server-side configuration:

| Action | Proposed Cost |
|---|---:|
| Save/edit story manually | 0 credits |
| Fast story analysis | 1 credit |
| Deep story analysis | 2 credits |
| Fast re-analysis | 1 credit |
| Deep re-analysis | 2 credits |
| AI remap one character | 1 credit |
| Manual character/attribute edit | 0 credits |
| Generate one image candidate | 1 existing image credit |
| Generate character sheet image | 1 existing image credit |
| Regenerate image | Same as a new image generation |

AI extraction และ initial attribute mapping ที่อยู่ใน request วิเคราะห์เรื่องเดียวกันต้องไม่คิดซ้ำเป็นสอง actions หาก response เดียวให้ผลทั้ง cast และ initial mapping

### 6.2 Cost Preview

ก่อน paid action ต้องแสดง:

- Action name
- Model tier
- Credits required
- Current balance
- Balance after confirmation
- จำนวน characters/images ที่รวมอยู่
- แจ้งชัดว่า regeneration หรือ re-analysis คิด creditใหม่

ตัวอย่าง:

```text
Analyze Story with Fast Analysis
Cost: 1 credit
Current balance: 20
Balance after analysis: 19

[Cancel] [Confirm & Analyze - 1 Credit]
```

Generation plan example:

```text
4 characters
2 headshot candidates per character = 8 credits
1 character sheet per approved character = up to 4 credits
Maximum planned image cost = 12 credits
```

ค่า maximum estimate ต้องไม่ถูกหักล่วงหน้าทั้งหมด ระบบหักทีละ billable job เมื่อเริ่มประมวลผล

### 6.3 Deduction Rules

- Server เป็น authority สำหรับราคาและ balance
- Client estimate ใช้เพื่อ display เท่านั้น
- Server ต้อง revalidate cost และ balance ก่อน enqueue
- Analysis credit หักเมื่อ analysis job เริ่ม processing ไม่ใช่เมื่อเปิด modal
- Image generation ใช้ระบบหักเครดิตของ Queue เดิม
- แต่ละ billable job ต้องมี immutable `billingActionId`
- ห้ามหักซ้ำเมื่อ client reconnect/retry status request
- Batch plan ต้องหยุดก่อนเริ่ม job ถัดไปเมื่อ balance ไม่พอ
- User สามารถ cancel queued jobs ที่ยังไม่เริ่มโดยไม่เสีย credit
- Started/completed jobs มี audit record แม้ UI ถูกปิด

### 6.4 Refund Rules

Refund credit เมื่อ:

- Provider/network/server failure เกิดก่อนมี usable structured result
- Response parse/schema validation ล้มเหลวหลัง retry policy สิ้นสุด
- Job ถูก server cancel ก่อนเรียก provider
- Existing image moderation refund policy ระบุให้ refund

ไม่ refund เมื่อ:

- Analysis สำเร็จและ user ไม่ชอบผลลัพธ์
- User เลือก re-analyze หรือ regenerate เอง
- User ลบผลลัพธ์ที่สำเร็จแล้ว
- User เปลี่ยน plot หลัง analysis สำเร็จ

Refund ต้อง idempotent และมี audit event อ้างถึง original `billingActionId`

### 6.5 Pricing Configuration

เพิ่ม server-side config เช่น:

```json
{
  "storyAnalysisFast": 1,
  "storyAnalysisDeep": 2,
  "characterAiRemap": 1,
  "imageGeneration": 1
}
```

Client ห้ามส่งราคาที่ server เชื่อถือโดยตรง API response ต้องส่ง authoritative cost กลับมา

## 7. Structured AI Output

Story analysis ต้องคืน schema versioned และ validate ก่อนบันทึก:

```json
{
  "schemaVersion": 1,
  "storySummary": "...",
  "worldBible": {
    "genre": "...",
    "period": "...",
    "locations": [],
    "visualStyle": "...",
    "colorPalette": [],
    "continuityRules": []
  },
  "characters": [
    {
      "id": "char_...",
      "name": "...",
      "role": "protagonist",
      "importance": "main",
      "personality": [],
      "ageRange": "...",
      "gender": "...",
      "ethnicity": "...",
      "storyDescription": "...",
      "visualConcept": "...",
      "relationships": [],
      "confidence": 0.0
    }
  ]
}
```

Rules:

- AI-generated IDs ต้องถูก normalize/replace ด้วย server-generated stable IDs
- User-authored story และ AI analysis ต้องเก็บแยกกัน
- Re-analysis สร้าง revision ใหม่ ไม่ overwrite approved/user-edited data โดยอัตโนมัติ
- ห้าม enqueue image generation จาก raw AI response ก่อน validation และ human approval

## 8. Character Profile and Attribute Mapping

Character profile แบ่งเป็น:

### Core Identity

- Gender
- Age range
- Ethnicity
- Face shape/features
- Skin tone
- Body build
- Primary hair style/color
- Distinctive marks/accessories

### Scene-Flexible Attributes

- Expression
- Makeup
- Clothing
- Pose
- Location
- Lighting
- Camera
- Story event

Mapping contract:

```json
{
  "field": "Ethnicity",
  "attributeId": "character.007",
  "confidence": 0.99,
  "source": "ai",
  "customValue": null,
  "warning": null
}
```

- Attribute ID ต้องมีอยู่จริงใน current bundle
- Unknown AI ID ต้อง reject หรือเปลี่ยนเป็น reviewed custom value
- Confidence ต่ำกว่า configurable threshold ต้องเป็น `Needs Review`
- User edit ต้องเปลี่ยน `source` เป็น `user` และ re-analysis ห้าม overwrite โดยไม่มี confirmation

## 9. Canonical Character Workflow

- Approved character เริ่มจาก canonical headshot
- User เลือกภาพหนึ่งเป็น `canonicalFaceJobId`
- Character sheet ใช้ canonical face reference
- Optional style image เก็บใน `canonicalStyleJobIds`
- Canonical reference change ต้องยืนยัน เพราะมีผลกับ future scenes
- ทุก generation เก็บ `collectionId`, `characterProfileId`, profile revision และ reference job IDs
- Character status เปลี่ยนเป็น `Generated` หลัง canonical approval ไม่ใช่แค่ provider คืนภาพสำเร็จ

## 10. Story Studio Persistence

แนะนำ storage แยกจาก `collections.json` เพื่อไม่ทำให้ Collection CRUD หนักเกินไป:

```text
server/story-projects.json
```

หรือใช้ per-project files ในอนาคตเมื่อข้อมูลโตขึ้น

Story project ต้องเก็บ:

- `collectionId`
- User-authored story
- World bible revisions
- Character profiles and revisions
- Attribute mappings
- Canonical references
- Generation plan and status
- AI model metadata
- Billing action references
- Created/updated timestamps

ห้ามเก็บ full provider reasoning, API key หรือ Base64 image ใน story project

## 11. Analysis and Generation Jobs

Text analysis ควรใช้ job abstraction แยกประเภทแต่เข้ากับ queue semantics เดิม:

```json
{
  "id": "analysis_...",
  "type": "story_analysis",
  "status": "queued",
  "collectionId": "col_...",
  "modelTier": "fast",
  "creditCost": 1,
  "billingActionId": "bill_..."
}
```

Required statuses:

- `draft`
- `queued`
- `processing`
- `needs_review`
- `approved`
- `failed`
- `cancelled`

Analysis ต้องรองรับ reconnect/status polling และไม่ผูกความสำเร็จกับ browser tab ที่เปิดอยู่

## 12. Safety and Validation

- Validate plot length และ request body size
- Strip/limit unsupported markup
- Treat story text as untrusted input
- Structured output schema validation เป็น mandatory
- Limit maximum characters returned per analysis
- Require user confirmation ก่อนสร้างภาพของ minor/ambiguous-age characters
- Existing provider moderation handling ยังใช้กับทุก image job
- Technical error details ห้าม expose API key หรือ raw provider payload

## 13. Failure and Recovery UX

- Analysis failure แสดง normalized error และ refund state
- User retry ได้โดยเห็นว่าจะคิด creditหรือใช้ refunded retry tokenอย่างไร
- Partial cast result ห้ามบันทึกเป็น approved result
- Batch image generation หยุดที่ failed character และให้เลือก Retry/Skip/Stop
- Completed characters ต้องไม่ถูก generate ซ้ำเมื่อ resume
- Browser reload ต้องกลับมาเห็น progress ปัจจุบัน

## 14. Acceptance Criteria

### Optional Behavior

- Manual app และ Collection ใช้งานได้โดยไม่เปิด Story Studio
- ไม่มี AI call หรือ credit deduction จากการเปิด/สร้าง Collection
- Story Studio เปิดเฉพาะจาก explicit user action

### Credits

- ทุก paid action แสดง cost และต้อง confirm
- Server คำนวณ cost และ balance ใหม่ก่อนเริ่ม
- Analysis, re-analysis, remap และ image jobs หักตาม config
- Batch หักทีละ job ไม่ reserve maximum estimate
- Failure refund ทำงานแบบ idempotent
- Audit สามารถอธิบายได้ว่า credit ถูกหัก/คืนจาก action ใด

### Story and Cast

- Gemini คืน structured schema ที่ validate ได้
- User review/edit cast ก่อน image generation
- Re-analysis ไม่ overwrite approved edits
- Low-confidence mappings ถูก flag

### Character Generation

- Generation ทำทีละ character ตาม default
- Canonical face ต้องถูกเลือกก่อน character sheet
- Resume ไม่สร้าง completed character ซ้ำ
- Outputs ถูกเพิ่มเข้า Collection และผูก character profile

## 15. Verification Plan

- Story analysis structured-output contract tests
- Fast/deep model routing tests
- Credit estimate vs server charge tests
- Insufficient-credit tests ก่อนและระหว่าง batch
- Idempotent deduction/refund/reconnect tests
- Re-analysis revision merge tests
- Invalid/hallucinated attribute ID tests
- Canonical approval and reference propagation tests
- Pause/resume/skip/retry batch tests
- Manual workflow regression tests เมื่อ Story Studio ไม่ได้เปิด
- Desktop/mobile wizard accessibility and responsive tests

## 16. Decisions to Confirm During Review

1. ยืนยัน default costs: Fast 1, Deep 2, AI Remap 1 credit
2. จำนวน headshot candidates default ต่อ character: แนะนำ 2 ภาพ
3. ต้องการให้ Auto-continue เปิดได้เฉพาะ admin หรือทุก user
4. Maximum characters ต่อ analysis: แนะนำ 20 คน และ main/supporting ที่พร้อม generate ไม่เกิน 10 คนต่อ plan
5. Step 5 Scenes จะอยู่ใน Step 14 แบบ draft-only หรือแยกออกจาก UI จนกว่า requirement scene orchestration จะพร้อม

