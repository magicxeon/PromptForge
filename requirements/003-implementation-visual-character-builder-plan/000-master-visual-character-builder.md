# Visual Character Builder Master Plan

**Status:** Illustrated Asset Direction Approved - Face Shape Pilot Selected  
**Product area:** Studio / character creation  
**MVP:** Photorealistic Guided Headshot Character Builder for adults and minors  
**Created:** 2026-07-16  
**Updated:** 2026-07-16

## 1. Product Goal

สร้างประสบการณ์เลือกหน้าตาและลักษณะตัวละครแบบ character creator ในเกม เพื่อให้ผู้ใช้ที่ไม่รู้ศัพท์ด้าน prompt, การถ่ายภาพ หรือ anatomy สามารถสร้างตัวละครที่ใกล้กับภาพในใจได้โดยไม่ต้องเขียน prompt เอง

Visual Character Builder เป็นเจ้าของมาตรฐานกลางสำหรับ:

- attribute และ prompt value ที่ใช้สร้างตัวละคร
- Visual Option, diagram, swatch และ uploaded reference
- โครงสร้าง asset, ชื่อไฟล์, manifest และ validation
- reusable UI controls และ selected state
- guided defaults ที่ซ่อนศัพท์เทคนิคจากผู้ใช้ทั่วไป
- การส่ง selection เข้า prompt compiler และ generation pipeline เดิม

## 2. Position in Requirement Structure

```text
002-implementation-plan-upgrade-to-node
003-implementation-visual-character-builder-plan
004-implementation-community-plan
005-implementation-commercial-feature-plan
```

Visual Character Builder ต้องมาก่อน Community และ Commercial เพราะเป็น foundation สำหรับสร้างผลงาน, remix configuration, model profile และ commercial workflow

Community และ Commercial ต้องอ้าง contract จาก folder นี้ ห้ามสร้าง visual picker, asset manifest หรือ character attribute contract ซ้ำใน module ของตนเอง

## 3. MVP Decision

MVP แรกคือ **Photorealistic Guided Headshot Character Builder** สำหรับคนจริง ทั้งผู้ใหญ่และผู้เยาว์ โดยมี age-aware safety rules

### 3.1 Confirmed Product Decisions

- Visual output เริ่มจากมนุษย์สมจริงเท่านั้น
- รองรับ Child, Preteen, Teen, Adult และ Senior ตามช่วงอายุที่กำหนดใน Requirement 001
- Anime, illustration, fantasy และ rendering style อื่นจะเพิ่มภายหลังในฐานะ Style Filter ไม่ปะปนกับ anatomy attributes
- ใช้ `Visual Heritage` เพื่อสื่อถึงเชื้อสาย/ลักษณะเชิงภูมิภาค ไม่ถือเป็น nationality และไม่กำหนด skin tone อัตโนมัติ
- UI ใช้ control แบบผสม: visual cards, diagram, swatch, segmented control, slider และ dropdown ตามชนิดข้อมูล
- Dropdown เดิมคงไว้ได้เมื่อรายการยาว, อ่อนไหว, เป็นศัพท์เฉพาะ หรือภาพไม่ได้ช่วยให้เลือกแม่นขึ้น
- Attribute เดิมตัดหรือรวมได้ แต่ต้องมี migration, legacy fallback หรือคำเตือนที่ตรวจสอบได้
- `Non-binary` ไม่อยู่ในตัวเลือกของ MVP และค่าเก่าต้องให้ผู้ใช้เลือก Character Presentation ใหม่ ห้าม map เป็น Androgynous อัตโนมัติ

Included:

- Character foundation ที่จำเป็นต่อ headshot
- Age-aware field filtering และ server-side protection สำหรับผู้เยาว์
- Visual Heritage แบบ grouped searchable dropdown
- Face structure
- Facial features
- Hair and hair color
- Skin, appearance and expression แบบพื้นฐาน
- Guided headshot output presets
- Visual Option assets, manifest, validation และ reusable UI
- Prompt preview แบบภาษาคนทั่วไปและ advanced prompt inspection
- การบันทึก, restore, import/export และ generation ผ่านระบบเดิม

Deferred:

- Full-body character builder
- Body shape และ pose library
- เสื้อผ้าแบบประกอบหลายชิ้น
- Pattern/material editor ขั้นสูง
- Scene Story และ environment builder
- Technical camera/lens controls สำหรับผู้ใช้ทั่วไป
- Community publishing และ marketplace
- Real-time composite avatar preview
- Character sheet หลายมุม
- Style filters เช่น Anime, illustration, fantasy และ non-photorealistic rendering

## 4. User Journey

```text
Start Headshot
  -> choose character foundation
  -> choose face structure
  -> choose facial features
  -> choose hair and colors
  -> choose skin/appearance/expression
  -> choose simple output style
  -> review character summary
  -> generate with selected provider/model
  -> save character configuration for future use
```

ผู้ใช้ไม่ต้องเห็นคำอย่าง focal length, key light, chromatic aberration หรือ prompt weighting ในเส้นทางปกติ ระบบใช้ reviewed presets แปลง intent ให้เป็นค่าทางเทคนิคที่เหมาะสม

เมื่อผู้ใช้เลือกอายุต่ำกว่า 18 ปี ระบบต้อง derive `audienceClass: minor`, จำกัด appearance/expression ที่ไม่เหมาะสม และบังคับใช้ข้อจำกัดอีกครั้งบน server ห้ามพึ่งการซ่อน control ฝั่ง UI เพียงอย่างเดียว

## 5. Shared Architecture

### 5.1 Single Sources of Truth

- Attribute definition เป็นเจ้าของ semantic ID, label และ prompt value
- Visual manifest เป็นเจ้าของ asset path, dimensions, alt text และ visual treatment
- UI schema เป็นเจ้าของ control type และ section placement
- Prompt compiler เป็นเจ้าของลำดับและ provider prompt mapping
- Saved configuration เก็บ semantic IDs ไม่เก็บ label หรือ filename เป็นค่าหลัก
- Age classification เป็น derived domain state จาก Age option ไม่ใช่ค่าที่ client กำหนดเอง
- Style Filter เป็นคนละแกนกับ anatomy และ Visual Heritage

ห้าม hardcode option ซ้ำใน HTML, CSS หรือ component เฉพาะ category

### 5.2 Progressive Enhancement

- Option ที่มี visual asset ใช้ visual control
- Option ที่ asset ขาดหรือโหลดไม่ได้ยังเลือกผ่าน text fallback ได้
- Attribute เดิมยัง compile prompt ได้ระหว่างทยอย migrate
- Legacy value ที่ไม่มี safe replacement แสดงผ่าน text/dropdown fallback พร้อมคำเตือนแทนการลบทิ้งเงียบ ๆ
- แต่ละ section เปิดใช้งานได้ด้วย feature flag โดยไม่ต้องรอ asset ครบทุก category

### 5.3 Asset Families

| Family | Primary use | Preferred format |
|---|---|---|
| Illustrated Visual Option | Face, eyes, nose, lips, hair | Monochrome PNG/WebP derived from source sets |
| Diagram | Face geometry, framing, body silhouette | SVG or WebP |
| Recolorable UI icon | Control/state/abstract silhouette | SVG `currentColor` or monochrome PNG mask |
| Swatch | Hair, eyes, skin, clothing color | CSS color/gradient |
| Uploaded Reference | Face or clothing reference | Original plus normalized derivative |

## 6. Requirement Sequence

| Step | Requirement | Output | Dependency |
|---:|---|---|---|
| 001 | Foundation Domain and Attribute Contract | Stable IDs, section rules, compatibility | Existing attribute schema |
| 002 | Assets Visual Standard and Pipeline | Naming, folders, manifests, prompt templates | 001 |
| 003 | Shared Visual Controls and Interaction | Reusable picker, swatch, fallback | 001, 002 |
| 004 | Headshot Face Structure | First visual category pilot | 001-003 |
| 005 | Headshot Facial Features | Eyes, brows, nose, lips | 004 approved |
| 006 | Headshot Hair and Color | Hair visual options and swatches | 003, 004 style approved |
| 007 | Headshot Skin Appearance and Expression | Appearance controls and expression | 003-006 |
| 008 | Headshot Guided Output and Generation | Defaults, summary, prompt and generate | 004-007 |
| 009 | Headshot Integration Accessibility and QA | Persistence, performance and release gate | 001-008 |
| 010 | Character Reference and Clothing Concept | Future contract only | Headshot MVP accepted |
| 010-014 | Scene Character Directing and Reference Set | Editable expression with Character Reference, richer pose/environment direction, and future four-image reference set | 010-013 and Scene Builder |

Do not begin mass asset production before the Face Structure pilot passes its visual review gate.

## 7. Work Allocation

### Codex / Engineering

- Inventory and normalize attributes
- Write per-section master prompts and per-option visual differences
- Create manifests, folder templates and validators
- Implement shared UI components and schema rendering
- Map visual selections to existing prompt compilation
- Generate prototype assets when requested and tools are available
- Verify responsive layout, accessibility and missing-asset behavior

### Product Owner / User

- Approve visual direction using a small prototype set
- Review whether each image communicates the intended difference
- Supply or edit final assets when manual control is preferred
- Confirm representation, cultural fit and acceptable terminology
- Approve each category before production moves to the next category

The user should not need to invent filenames or directory placement. Engineering publishes the manifest and asset checklist first.

## 8. Delivery Gates

### Gate A: Contract Review

- Attribute IDs and section boundaries approved
- Adult/minor age bands, Visual Heritage terminology และ server safety rules approved
- Asset standard and naming approved
- No duplicate source of truth remains

### Gate B: Face Structure Pilot

- Three to five representative options use one consistent visual pattern
- UI renders selected, hover, disabled and missing-asset states
- User approves crop, style and semantic clarity

### Gate C: Headshot Content Complete

- Every MVP option has metadata and approved visual or explicit fallback
- Prompt output remains equivalent to the semantic selection
- No technical knowledge is required for the default journey

### Gate D: Headshot MVP Release

- Save/restore/import/export work
- Mobile, keyboard and screen-reader paths work
- Asset performance budget passes
- Provider/model generation works through the existing pipeline

## 9. Non-duplication Rules

- One reusable visual picker serves every category.
- One asset validator checks every category.
- One manifest schema serves generated and user-supplied assets.
- Color options use swatches instead of producing duplicate color images unless color changes the form materially.
- Runtime icons are sliced from one approved category source set; an individual override may replace one slice without regenerating the set.
- Category prompts inherit a shared visual master; per-option prompts describe only the changing property.
- Community remix stores semantic configuration IDs, not copied UI definitions.
- Commercial model profiles reference saved character configurations, not a separate character builder.

## 10. Success Criteria

- A first-time user can create a distinct headshot without typing a prompt.
- Users can understand the visible difference between options without knowing specialist terminology.
- Adding a new option normally requires data and an asset, not new UI code.
- Missing assets never block generation.
- The same saved character can later become the canonical face for Character Reference and commercial workflows.
