# ModelPromptForge Thailand Solution
## Business Analysis, Product Requirements, and Software Engineering Reference

**Document ID:** `015-thailand-commerce-visual-solution`  
**Application:** `ModelPromptForge`  
**Status:** Proposed Requirement  
**Target Market:** Thailand  
**Audience:** Business Owner, Product Owner, Business Analyst, UX/UI Designer, Software Engineer, AI Engineer, QA  
**Updated:** 2026-07-12

---

# 1. Executive Summary

ModelPromptForge ปัจจุบันมีความสามารถด้านการสร้างภาพตัวละครจาก attribute, การใช้ face/style reference, การสร้างภาพแบบ normal, headshot และ character sheet รวมถึง queue, credits, history และ image lineage

อย่างไรก็ตาม ระบบในรูปแบบปัจจุบันยังมีลักษณะเป็น **เครื่องมือสำหรับประกอบ prompt และสร้างตัวละคร** มากกว่าเป็น **โซลูชันทางธุรกิจที่แก้ปัญหาให้ผู้ใช้ไทยโดยตรง**

การเปลี่ยนผลิตภัณฑ์ที่เสนอคือ:

> จาก **Prompt/Character Generation Tool**  
> เป็น **AI Visual Commerce Studio สำหรับธุรกิจและครีเอเตอร์ไทย**

ระบบใหม่จะช่วยผู้ใช้สร้าง:

1. ภาพแฟชั่นเพื่อขายเสื้อผ้า รองเท้า กระเป๋า และเครื่องประดับ
2. ภาพรีวิวสินค้าและ lifestyle product content
3. ภาพโฆษณาและ campaign visual
4. Storyboard สำหรับวิดีโอขายสินค้า รีวิวสินค้า และ brand story
5. ชุดภาพหลายภาพที่มีตัวแบบ ฉาก แสง และสไตล์ใกล้เคียงกัน
6. งาน bulk generation สำหรับสินค้าหลายรายการในครั้งเดียว

---

# 2. Business Problem

## 2.1 ปัญหาของผู้ใช้ไทย

ผู้ขายสินค้าและครีเอเตอร์ในไทยมักพบปัญหา:

- ไม่มีงบจ้างช่างภาพ สตูดิโอ และนางแบบทุกครั้ง
- ต้องสร้างภาพสินค้าเป็นจำนวนมาก
- ภาพที่สร้างด้วย AI หลายภาพมักมีหน้าตา ฉาก และสไตล์ไม่ต่อเนื่อง
- การเขียน prompt มีความซับซ้อน
- ไม่รู้ศัพท์การถ่ายภาพ แสง กล้อง หรือ composition
- ต้องปรับภาพหลายขนาดสำหรับ Shopee, Lazada, Facebook, Instagram และ TikTok
- ไม่สามารถสร้างภาพจากสินค้าหลายชิ้นแบบ batch ได้ง่าย
- การทำ storyboard สำหรับคลิปขายของยังใช้เวลามาก
- เครื่องมือ AI ส่วนใหญ่ไม่ได้ออกแบบ workflow สำหรับผู้ใช้ไทย

## 2.2 Business Opportunity

ModelPromptForge สามารถสร้างความแตกต่างได้ด้วย:

- UI ภาษาไทย
- Workflow สำเร็จรูปตามงานจริง
- Bulk upload และ batch generation
- Consistency control
- Photographer-style presets
- Marketplace-ready outputs
- Storyboard จาก brief ภาษาไทย
- ระบบ credits ที่คิดตามงานจริง
- รองรับทั้งผู้ขายรายย่อย ครีเอเตอร์ และเอเจนซี

---

# 3. Product Positioning

## 3.1 Product Statement

> ModelPromptForge Thailand คือ AI Visual Commerce Studio ที่ช่วยร้านค้า ครีเอเตอร์ และธุรกิจไทยสร้างภาพขายสินค้า ภาพรีวิว ภาพแฟชั่น ภาพโฆษณา และ storyboard โดยไม่ต้องเขียน prompt ซับซ้อน

## 3.2 Primary Target Users

| User Segment | Main Need |
|---|---|
| ร้านเสื้อผ้าออนไลน์ | สร้างภาพหลายชุดด้วยตัวแบบและฉากเดิม |
| ร้านกระเป๋า รองเท้า เครื่องประดับ | สร้างภาพ lifestyle และ fashion selling |
| แบรนด์สกินแคร์/เครื่องสำอาง | สร้างภาพรีวิวและภาพโฆษณา |
| ร้านอาหาร/ของกิน/เครื่องดื่ม | สร้างภาพสินค้าและ lifestyle content |
| Content Creator | สร้างภาพประกอบและ storyboard |
| Freelance/Agency | ทำงานหลายแบรนด์และหลาย campaign |
| นักเขียน/นักทำ Visual Novel | สร้าง story visual และ storyboard |

---

# 4. Product Structure

```text
ModelPromptForge Thailand
├── Commerce Image Studio
│   ├── Fashion Selling
│   ├── Product Selling
│   └── Product Review
├── Storyboard Studio
│   ├── Product Story
│   ├── Review Story
│   └── Brand/Campaign Story
├── Photographer Style Library
│   ├── Advertising
│   ├── Fashion Editorial
│   ├── E-commerce Product
│   ├── Review/Lifestyle
│   └── Storytelling/Cinematic
└── Advanced Custom Studio
    └── Existing Manual Attribute Generator
```

---

# 5. Feature Reference Index

| Feature ID | Feature Name | Priority |
|---|---|---:|
| `TH-COM-001` | Solution Home / Use-case Selector | Must |
| `TH-FAS-001` | Fashion Product Project | Must |
| `TH-FAS-002` | Bulk Product Upload | Must |
| `TH-FAS-003` | Consistent Model and Scene Lock | Must |
| `TH-FAS-004` | Fashion Batch Generation | Must |
| `TH-REV-001` | Product Review Project | Must |
| `TH-REV-002` | Reviewer Persona | Should |
| `TH-STO-001` | Thai Storyboard Brief | Must |
| `TH-STO-002` | AI Shot-list Generation | Must |
| `TH-STO-003` | Storyboard Frame Generation | Must |
| `TH-PHO-001` | Photographer Style Library | Must |
| `TH-PHO-002` | Advertising Style | Must |
| `TH-PHO-003` | Fashion Editorial Style | Must |
| `TH-PHO-004` | E-commerce Product Style | Must |
| `TH-PHO-005` | Product Review Style | Must |
| `TH-PHO-006` | Storytelling Style | Must |
| `TH-EXP-001` | Marketplace Export Presets | Must |
| `TH-BAT-001` | Durable Batch Job Management | Must |
| `TH-BIL-001` | Credit Estimate and Billing | Must |
| `TH-BRD-001` | Brand Kit | Should |
| `TH-TPL-001` | Thai Solution Template Library | Must |

---

# 6. Detailed Feature Requirements

## 6.1 `TH-COM-001` — Solution Home / Use-case Selector

### Business Objective
ลดความซับซ้อนของระบบ โดยให้ผู้ใช้เริ่มจาก “สิ่งที่ต้องการทำ” แทนการเริ่มจาก attribute หรือ prompt

### Input
- ประเภทงานที่ผู้ใช้เลือก
- ภาษา UI
- โปรเจกต์เดิมหรือโปรเจกต์ใหม่

### Process
```text
User opens application
  -> System displays solution cards
  -> User selects use case
  -> System loads matching workflow and presets
  -> New project is created
```

### Output
- โปรเจกต์ประเภท Fashion, Review, Storyboard หรือ Custom
- ค่าเริ่มต้นของ workflow
- Recommended presets

### UI Options
```text
1. สร้างภาพขายแฟชั่น
2. สร้างภาพขายสินค้า
3. สร้างภาพรีวิวสินค้า
4. สร้าง Storyboard
5. สร้างภาพแบบกำหนดเอง
```

### Code Reference
```text
client/
  solution-home.js
  solution-home.css

server/
  routes/projects.js
  services/projectService.js

database/
  projects
  project_types
```

### Acceptance Criteria
- ผู้ใช้สร้างโปรเจกต์จาก solution card ได้
- แต่ละ solution โหลดค่าเริ่มต้นต่างกัน
- ผู้ใช้กลับมาทำโปรเจกต์เดิมได้
- Manual Generator เดิมยังเข้าใช้งานได้

---

## 6.2 `TH-FAS-001` — Fashion Product Project

### Business Objective
ช่วยร้านค้าแฟชั่นสร้างชุดภาพขายสินค้าที่มีภาพลักษณ์สม่ำเสมอ

### Input
- ชื่อโปรเจกต์
- ประเภทสินค้า
- ภาพสินค้า
- ภาพตัวแบบหรือ AI model preset
- สถานที่
- Photographer style
- Aspect ratio
- จำนวนภาพต่อสินค้า

### Process
```text
Create fashion project
  -> Upload product images
  -> Select model identity
  -> Select scene
  -> Select photographer style
  -> Configure consistency settings
  -> Review credit estimate
  -> Generate
```

### Output
- ภาพแฟชั่นแยกตามสินค้า
- ภาพหน้าปก
- ภาพ lifestyle
- ภาพรายละเอียด
- ภาพ collection overview

### Example Data
```json
{
  "projectType": "fashion",
  "productCategory": "clothing",
  "modelProfileId": "model_001",
  "sceneProfileId": "scene_001",
  "photographerStyleId": "photo_fashion_editorial",
  "consistency": {
    "lockModelIdentity": true,
    "lockScene": true,
    "lockLighting": true,
    "lockCamera": true,
    "poseVariation": "low"
  }
}
```

### Acceptance Criteria
- สร้าง fashion project ได้
- เชื่อมสินค้าแต่ละรายการกับ generation job ได้
- ใช้ model/scene/style เดียวกันทั้งโปรเจกต์ได้
- ผู้ใช้เปลี่ยนค่ารายสินค้าได้

---

## 6.3 `TH-FAS-002` — Bulk Product Upload

### Business Objective
ลดเวลาอัปโหลดและตั้งค่าสินค้าหลายรายการ

### Input
- ภาพสินค้า 1–50 ภาพ
- ชื่อสินค้า
- SKU
- ประเภทสินค้า
- สี
- หมายเหตุ
- CSV metadata แบบ optional

### Process
```text
Upload multiple files
  -> Validate file type and size
  -> Detect duplicates
  -> Create product records
  -> Generate thumbnails
  -> Allow metadata review
  -> Add to batch project
```

### Output
- Product item records
- Thumbnail list
- Upload validation report
- Ready-to-generate product queue

### Example API
```http
POST /api/projects/:projectId/products/bulk
Content-Type: multipart/form-data
```

### Example Response
```json
{
  "accepted": 10,
  "rejected": 1,
  "items": [
    {
      "productItemId": "prod_001",
      "filename": "dress-red.jpg",
      "status": "ready"
    }
  ]
}
```

### Code Reference
```text
client/
  bulk-upload.js
  product-grid.js

server/
  routes/productItems.js
  services/uploadService.js
  services/imageValidationService.js

storage/
  products/original/
  products/thumbnails/
```

### Acceptance Criteria
- รองรับการอัปโหลดพร้อมกันอย่างน้อย 20 ไฟล์ใน MVP
- แสดง progress รายไฟล์
- ไฟล์ที่ผิดพลาดไม่ทำให้ทั้งชุดล้มเหลว
- ผู้ใช้แก้ชื่อสินค้าและ SKU หลังอัปโหลดได้

---

## 6.4 `TH-FAS-003` — Consistent Model and Scene Lock

### Business Objective
สร้างภาพหลายสินค้าที่ดูเหมือนถ่ายใน session เดียวกัน

### Input
- Canonical model reference
- Canonical face reference
- Scene reference
- Pose reference
- Lighting preset
- Camera preset
- Consistency level

### Process
```text
Select canonical references
  -> Build consistency profile
  -> Lock core attributes
  -> Apply profile to each product job
  -> Allow controlled variation
  -> Record lineage
```

### Output
- Consistency profile
- Locked attributes
- Parent reference IDs
- Reusable session preset

### Consistency Levels
| Level | Behavior |
|---|---|
| Low | รักษาโทนและฉาก แต่ pose เปลี่ยนได้มาก |
| Medium | รักษาหน้า ฉาก แสง และ camera ใกล้เคียงกัน |
| High | รักษาหน้า ฉาก แสง camera และ pose family อย่างเข้มงวด |

### Example Data
```json
{
  "consistencyProfileId": "cons_001",
  "canonicalFaceJobId": "job_face_001",
  "sceneReferenceJobId": "job_scene_001",
  "lockedFields": [
    "Gender",
    "Age",
    "Ethnicity",
    "Face Shape",
    "Hair",
    "Location",
    "Lighting",
    "Camera"
  ],
  "variation": {
    "pose": 0.20,
    "expression": 0.15,
    "framing": 0.10
  }
}
```

### Acceptance Criteria
- ผู้ใช้กำหนด model reference กลางได้
- ทุกงานเก็บ lineage ไปยัง reference
- เปลี่ยน canonical reference ต้องยืนยัน
- การ regenerate ไม่สูญเสีย consistency settings

---

## 6.5 `TH-FAS-004` — Fashion Batch Generation

### Business Objective
สร้างภาพสินค้าหลายชิ้นใน workflow เดียว

### Input
- Product items
- Generation plan
- Credits
- Model
- Number of outputs per item
- Consistency profile

### Process
```text
Review product list
  -> Calculate total maximum credits
  -> User confirms
  -> Create batch
  -> Enqueue jobs one by one
  -> Deduct credit when each job starts
  -> Persist result
  -> Continue / pause / retry
```

### Output
- Batch record
- Job list
- Product image results
- Error and retry report
- Credit usage summary

### Batch Status
```text
draft
queued
processing
paused
partially_completed
completed
failed
cancelled
```

### Example Data
```json
{
  "batchId": "batch_001",
  "projectId": "project_001",
  "totalItems": 10,
  "completedItems": 4,
  "failedItems": 1,
  "status": "processing",
  "estimatedCredits": 30,
  "chargedCredits": 12
}
```

### Acceptance Criteria
- Batch หักเครดิตทีละ job
- หยุด batch ได้
- Resume แล้วไม่สร้างงานที่สำเร็จแล้วซ้ำ
- Retry เฉพาะรายการที่ล้มเหลวได้
- ผู้ใช้ export เฉพาะรายการที่ผ่านการ approve ได้

---

## 6.6 `TH-REV-001` — Product Review Project

### Business Objective
สร้างภาพรีวิวสินค้าในสไตล์คนใช้จริง โดยไม่ต้องจัดถ่ายทุกครั้ง

### Input
- ภาพสินค้า
- ประเภทสินค้า
- Reviewer persona
- สถานที่
- วิธีถือหรือใช้งาน
- Mood
- Platform target

### Process
```text
Upload product
  -> Select review template
  -> Select reviewer persona
  -> Select usage action
  -> Apply review photographer style
  -> Generate review images
```

### Output
- ภาพถือสินค้า
- ภาพทดลองใช้
- ภาพ lifestyle
- ภาพ close-up
- ภาพ social cover

### Review Templates
```text
Office Review
Cafe Review
Home Review
Beauty Review
Professional Review
TikTok Creator Review
Shopee/Lazada Review
```

### Acceptance Criteria
- ผู้ใช้เลือก review template ได้
- แสดงคำเตือนสำหรับสินค้าที่มี claim ด้านสุขภาพ
- Product image ต้องไม่ถูกเปลี่ยนโลโก้หรือรูปทรงโดยไม่มีคำเตือน
- รองรับ output 1:1, 4:5 และ 9:16

---

## 6.7 `TH-REV-002` — Reviewer Persona

### Business Objective
ให้ผู้ใช้เลือกบุคลิกผู้รีวิวโดยไม่ต้องเขียน prompt

### Input
- Gender
- Age range
- Occupation style
- Lifestyle
- Tone
- Appearance preset

### Process
```text
Select persona preset
  -> Map to character attributes
  -> Apply safe Thai-localized labels
  -> Allow user edits
  -> Save as reusable persona
```

### Output
- Reviewer profile
- Attribute mapping
- Reusable persona preset

### Example Personas
```text
สาวออฟฟิศวัย 25–35
คุณแม่ยุคใหม่
นักศึกษา
ผู้ชายสายเทค
สายสุขภาพ
ครีเอเตอร์สายบิวตี้
เจ้าของร้านออนไลน์
```

---

## 6.8 `TH-STO-001` — Thai Storyboard Brief

### Business Objective
เปลี่ยน brief ภาษาไทยให้เป็นแผนภาพและแผนถ่ายทำ

### Input
- Campaign title
- Product
- Target audience
- Objective
- Platform
- Duration
- Tone
- Thai brief
- Number of scenes

### Process
```text
User enters Thai brief
  -> Validate length
  -> Normalize business context
  -> Build structured AI request
  -> Display analysis cost
  -> Confirm analysis
```

### Output
- Structured storyboard brief
- Campaign objective
- Visual direction
- Suggested shot count

### Example Input
```text
ทำคลิปขายกระเป๋าสำหรับผู้หญิงวัยทำงาน
เริ่มจากเดินเข้าคาเฟ่ วางกระเป๋าบนโต๊ะ
เปิดให้เห็นช่องด้านใน และจบด้วยภาพถือกระเป๋าเดินออกจากร้าน
```

---

## 6.9 `TH-STO-002` — AI Shot-list Generation

### Business Objective
ช่วยผู้ใช้ที่ไม่มีประสบการณ์ด้านวิดีโอสร้าง shot list ที่ใช้ได้จริง

### Input
- Structured brief
- Product data
- Platform
- Video duration
- Photographer/story style

### Process
```text
Brief
  -> AI analyzes objective
  -> Divide into scenes
  -> Generate shot descriptions
  -> Define framing, action, camera, lighting
  -> Validate structured JSON
  -> User reviews and edits
```

### Output
```json
{
  "shots": [
    {
      "shotNo": 1,
      "durationSec": 2,
      "shotType": "wide",
      "action": "นางแบบเดินเข้าคาเฟ่พร้อมถือกระเป๋า",
      "camera": "eye-level tracking",
      "lighting": "soft morning light",
      "purpose": "เปิดเรื่องและแนะนำสินค้า"
    }
  ]
}
```

### Acceptance Criteria
- Output ต้องผ่าน JSON schema
- ผู้ใช้ reorder shot ได้
- Manual edit ไม่เสียเครดิต
- Re-analysis สร้าง revision ใหม่

---

## 6.10 `TH-STO-003` — Storyboard Frame Generation

### Business Objective
สร้างภาพตัวอย่างสำหรับแต่ละ shot ก่อนผลิตวิดีโอจริง

### Input
- Approved shot list
- Product references
- Model reference
- Style
- Number of frames
- Aspect ratio

### Process
```text
Approve shot list
  -> Map shot to image attributes
  -> Create generation plan
  -> Review credit estimate
  -> Generate one frame at a time
  -> Approve / regenerate
  -> Compile storyboard
```

### Output
- Storyboard frames
- Contact sheet
- Shot metadata
- PDF/PNG export
- Prompt/config export

### Acceptance Criteria
- แต่ละ frame เชื่อมกับ shot ID
- Frame ที่สำเร็จแล้วไม่สร้างซ้ำตอน resume
- Export เป็น contact sheet ได้
- รองรับ 9:16 สำหรับ TikTok/Reels

---

# 7. Photographer Style Library

## 7.1 `TH-PHO-001` — Photographer Style Library

### Business Objective
แปลงความรู้ด้านการถ่ายภาพให้เป็น preset ที่คนทั่วไปเลือกใช้ได้

### Input
- Style category
- Style preset
- Product type
- Platform

### Process
```text
Select style
  -> Load camera/lighting/composition preset
  -> Apply prompt attributes
  -> Validate conflicts
  -> Preview visual direction
```

### Output
- Photographer style configuration
- Prompt segments
- Example use cases
- Recommended output ratio

### Shared Style Schema
```json
{
  "id": "photo.advertising.clean-premium",
  "category": "Advertising",
  "label": {
    "th": "โฆษณาสะอาดพรีเมียม",
    "en": "Clean Premium Advertising"
  },
  "camera": [],
  "lighting": [],
  "composition": [],
  "background": [],
  "quality": [],
  "recommendedFor": [],
  "prompt": {}
}
```

---

## 7.2 `TH-PHO-002` — Advertising Style

### Input
- Product
- Campaign mood
- Brand colors
- Hero message

### Process
```text
Apply commercial lighting
  -> Use clean composition
  -> Reserve text-safe space
  -> Emphasize product
```

### Output
- Hero advertising image
- Banner-ready image
- Text-safe composition

### Presets
```text
Clean Premium
Luxury Campaign
Colorful Commercial
Minimal Product Hero
Thai Festive Campaign
Modern Technology Ad
```

---

## 7.3 `TH-PHO-003` — Fashion Editorial Style

### Input
- Model
- Outfit
- Location
- Fashion mood

### Process
```text
Apply editorial pose family
  -> Apply fashion lighting
  -> Apply magazine composition
  -> Maintain model identity
```

### Output
- Editorial image
- Lookbook image
- Campaign cover
- Fashion detail shot

### Presets
```text
Luxury Editorial
Street Fashion
Korean Minimal
Japanese Lifestyle
Thai Contemporary
Resort Fashion
Studio Lookbook
```

---

## 7.4 `TH-PHO-004` — E-commerce Product Style

### Input
- Product image
- Background
- Marketplace
- Number of angles

### Process
```text
Clean product isolation
  -> Preserve shape/logo
  -> Apply ecommerce lighting
  -> Generate platform ratio
```

### Output
- Main product image
- Detail image
- Usage image
- Marketplace-ready image set

### Presets
```text
White Background
Soft Gradient
Tabletop Product
Hand-held Product
Premium Marketplace
Minimal Lifestyle
```

---

## 7.5 `TH-PHO-005` — Product Review Style

### Input
- Product
- Reviewer persona
- Action
- Environment

### Process
```text
Apply natural review lighting
  -> Use candid framing
  -> Position product clearly
  -> Maintain authentic look
```

### Output
- UGC-style review image
- Lifestyle review
- Product-in-use image

### Presets
```text
Beauty Creator
Office Review
Home User Review
Cafe Lifestyle
Tech Reviewer
Professional Expert
```

---

## 7.6 `TH-PHO-006` — Storytelling Style

### Input
- Story mood
- Scene
- Character
- Narrative objective

### Process
```text
Apply cinematic composition
  -> Apply visual continuity
  -> Apply scene progression
  -> Generate narrative frame
```

### Output
- Cinematic still
- Story frame
- Campaign sequence
- Short-form storyboard

### Presets
```text
Warm Lifestyle Story
Cinematic Drama
Bright Commercial Story
Documentary Candid
Romantic Story
Inspirational Brand Story
```

---

# 8. Marketplace Export

## `TH-EXP-001` — Marketplace Export Presets

### Business Objective
ลดงาน resize และเตรียมภาพสำหรับแพลตฟอร์มไทย

### Input
- Approved images
- Target platforms
- Crop mode
- Watermark
- Brand kit

### Process
```text
Select outputs
  -> Apply platform dimensions
  -> Smart crop
  -> Apply watermark/logo
  -> Generate export package
```

### Output Presets
| Platform | Ratio |
|---|---|
| Shopee | 1:1 |
| Lazada | 1:1 |
| Facebook Feed | 4:5 |
| Instagram Feed | 4:5 |
| Instagram Story | 9:16 |
| TikTok | 9:16 |
| Website Banner | 16:9 |

### Export Structure
```text
project-name/
├── shopee/
├── lazada/
├── facebook/
├── instagram/
├── tiktok/
└── original/
```

---

# 9. Technical Architecture

## 9.1 Proposed Architecture

```text
Frontend
  -> Solution workflows
  -> Bulk upload
  -> Batch dashboard
  -> Storyboard editor
  -> Photographer presets

Backend API
  -> Project service
  -> Product service
  -> Batch service
  -> Billing service
  -> Prompt compiler
  -> Storyboard service
  -> Export service

Queue
  -> Durable generation jobs
  -> Retry
  -> Pause/resume
  -> Idempotency

Database
  -> Projects
  -> Product items
  -> Consistency profiles
  -> Batches
  -> Jobs
  -> Storyboards
  -> Billing ledger

Cloud Storage
  -> Product originals
  -> References
  -> Generated outputs
  -> Thumbnails
  -> Export packages
```

## 9.2 Suggested Database Tables

```text
users
projects
project_members
product_items
model_profiles
scene_profiles
consistency_profiles
photographer_styles
generation_batches
generation_jobs
storyboards
storyboard_shots
image_outputs
credit_wallets
credit_ledger
billing_actions
export_jobs
brand_kits
```

## 9.3 Suggested Backend Modules

```text
server/
├── routes/
│   ├── projects.js
│   ├── productItems.js
│   ├── batches.js
│   ├── storyboards.js
│   ├── photographerStyles.js
│   ├── exports.js
│   └── billing.js
├── services/
│   ├── projectService.js
│   ├── uploadService.js
│   ├── consistencyService.js
│   ├── batchService.js
│   ├── storyboardService.js
│   ├── photographerStyleService.js
│   ├── exportService.js
│   └── billingService.js
├── repositories/
├── validators/
└── workers/
```

---

# 10. End-to-End Workflows

## 10.1 Fashion Bulk Workflow

```text
INPUT
- สินค้า 10 ชิ้น
- นางแบบ 1 คน
- สถานที่ 1 แห่ง
- Style 1 แบบ
- จำนวนภาพ 3 ภาพ/สินค้า

PROCESS
1. Upload product images
2. Validate files
3. Create product records
4. Create consistency profile
5. Select photographer style
6. Calculate 30 generation jobs
7. Display maximum credit estimate
8. User confirms
9. Queue jobs
10. Deduct credit job-by-job
11. Save output and lineage
12. Review and retry failed items
13. Export marketplace package

OUTPUT
- ภาพ 30 ภาพ
- แยกตามสินค้า
- มี model/scene/style ที่ต่อเนื่อง
- พร้อมดาวน์โหลดเป็น Shopee/Lazada/TikTok
```

## 10.2 Product Review Workflow

```text
INPUT
- ภาพสินค้า
- Reviewer persona
- สถานที่
- Review style
- Platform

PROCESS
1. Upload product
2. Select review template
3. Select persona
4. Select product interaction
5. Generate preview
6. Approve or regenerate
7. Export platform sizes

OUTPUT
- ภาพรีวิว
- ภาพถือสินค้า
- ภาพ lifestyle
- Social-ready images
```

## 10.3 Storyboard Workflow

```text
INPUT
- Brief ภาษาไทย
- สินค้า
- กลุ่มเป้าหมาย
- Platform
- ระยะเวลา

PROCESS
1. Analyze brief
2. Generate structured shot list
3. User edits and approves
4. Map each shot to visual attributes
5. Generate storyboard frames
6. Compile contact sheet
7. Export PDF/PNG

OUTPUT
- Shot list
- Storyboard frames
- Contact sheet
- Production reference
```

---

# 11. Credit and Billing Rules

## 11.1 Billing Principles

- Server เป็นผู้กำหนดราคา
- Client แสดง estimate เท่านั้น
- หักเครดิตเมื่อ job เริ่ม processing
- Batch หักทีละ job
- Job ที่ยังไม่เริ่มและถูก cancel ไม่เสียเครดิต
- Retry ใหม่คิดเครดิตใหม่ ยกเว้น failure ที่เข้า refund policy
- ทุก transaction ต้องมี `billingActionId`

## 11.2 Example Credit Estimate

```json
{
  "projectId": "project_001",
  "batchType": "fashion_bulk",
  "items": 10,
  "imagesPerItem": 3,
  "model": "gpt-image-2",
  "creditPerImage": 3,
  "maximumCredits": 90,
  "currentBalance": 120,
  "balanceAfterMaximum": 30
}
```

---

# 12. Non-functional Requirements

## Performance
- Bulk upload 20 ไฟล์ใน MVP
- รองรับ batch อย่างน้อย 100 jobs
- หน้า batch ต้องอัปเดตสถานะแบบ real time
- Thumbnail load ต้องไม่ใช้ original image โดยตรง

## Reliability
- Queue ต้อง durable
- Restart server แล้ว job status ต้องไม่หาย
- Retry ต้อง idempotent
- Billing deduction/refund ต้องตรวจสอบย้อนหลังได้

## Security
- API keys อยู่ server-side
- Signed URL สำหรับ private images
- Validate file type และ file size
- ไม่ log Base64 image
- ตรวจสิทธิ์เข้าถึง project ทุก request

## Localization
- UI ภาษาไทยเป็น default
- Label ทุก feature มีไทยและอังกฤษ
- Prompt ส่ง provider เป็นภาษาอังกฤษ
- Brief ภาษาไทยต้อง normalize ก่อนส่ง AI

---

# 13. MVP Scope

## Phase 1 — Sellable MVP

### Must Have
- `TH-COM-001`
- `TH-FAS-001`
- `TH-FAS-002`
- `TH-FAS-003`
- `TH-FAS-004`
- `TH-REV-001`
- `TH-STO-001`
- `TH-STO-002`
- `TH-STO-003`
- `TH-PHO-001` ถึง `TH-PHO-006`
- `TH-EXP-001`
- `TH-BAT-001`
- `TH-BIL-001`

### Out of Scope for MVP
- Video generation
- Multi-character scene consistency ขั้นสูง
- Automatic ad copy generation
- Full team collaboration
- Marketplace API direct publishing
- Mobile application
- Unlimited generation plan

---

# 14. Recommended Implementation Order

```text
1. Project and database foundation
2. Cloud Storage migration
3. Durable queue
4. Billing ledger
5. Solution Home
6. Photographer Style Library
7. Fashion project
8. Bulk upload
9. Consistency profile
10. Batch generation
11. Product Review project
12. Storyboard brief and shot list
13. Storyboard frame generation
14. Marketplace export
15. Analytics and cost dashboard
```

---

# 15. Success Metrics

## Business Metrics

| Metric | Initial Target |
|---|---:|
| Project creation completion | >60% |
| First successful image | >50% of registered users |
| Batch completion rate | >90% |
| Paid conversion | 3–8% |
| Repeat purchase | >20% |
| Average images per project | >10 |
| Gross contribution margin | 35–50% |

## Product Metrics

- Time to first image
- Upload-to-generation completion rate
- Average batch size
- Regeneration rate
- Approval rate
- Export rate
- Storyboard completion rate
- Model/style preset usage

---

# 16. Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product shape/logo distortion | High | Reference validation, warnings, edit mode |
| Face inconsistency | High | Canonical face and lineage |
| Batch cost overrun | High | Credit estimate and per-job charging |
| Queue loss | High | Durable queue |
| Provider pricing changes | Medium | Versioned rate card |
| Thai users find workflow complex | High | Solution-first UI |
| AI claims for health products | High | Claim warnings and restricted templates |
| Storage growth | Medium | Retention and thumbnail policy |
| Low output quality | High | Photographer presets and approval workflow |

---

# 17. Final Recommendation

ModelPromptForge ควรเก็บ Manual Generator เดิมไว้เป็น Advanced Mode แต่ไม่ควรใช้เป็นหน้าหลักของผลิตภัณฑ์

หน้าหลักควรเริ่มจาก Solution:

```text
สร้างภาพขายแฟชั่น
สร้างภาพขายสินค้า
สร้างภาพรีวิวสินค้า
สร้าง Storyboard
สร้างภาพแบบกำหนดเอง
```

Feature ที่ควรพัฒนาเป็นอันดับแรกคือ:

1. Bulk Fashion Generation
2. Consistency Profile
3. Photographer Style Presets
4. Product Review Workflow
5. Thai Storyboard Workflow
6. Marketplace Export
7. Durable Batch and Billing System

การเปลี่ยนนี้ทำให้ผลิตภัณฑ์มีคุณค่าที่อธิบายได้ง่ายขึ้นในเชิงธุรกิจ และมี code reference ที่แยกเป็น feature ชัดเจนสำหรับนำไปวาง roadmap, issue, branch, test case และ implementation plan ต่อได้

---

# 18. Source Documents

เอกสารนี้ต่อยอดจาก:

- `README(1).md` — Project Understanding Guide ของ ModelPromptForge
- `014-optional-ai-story-studio-and-character-generation.md` — Requirement ของ Story Studio เดิม

