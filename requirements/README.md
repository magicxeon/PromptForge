# ModelPromptForge — Project Understanding Guide

> **วัตถุประสงค์ของเอกสารนี้**: บันทึกความเข้าใจโครงสร้างและระบบทั้งหมดของ project ไว้เพื่อให้ AI agent หรือผู้พัฒนาสามารถ pick up งานต่อได้ทันทีโดยไม่ต้องอ่านโค้ดทั้งหมดซ้ำ

---

## 1. สรุป Project ในภาพรวม

**ModelPromptForge** คือ Single Page Application (SPA) แบบ client-side ล้วน ทำด้วย vanilla HTML + CSS + JavaScript ไม่มี framework ไม่มี backend

**เป้าหมาย**: ช่วยให้ผู้ใช้สร้าง prompt สำหรับ AI image generator (โดยเฉพาะ GPT Image / DALL-E 3, Midjourney, Stable Diffusion) ผ่าน UI แบบ dropdown form แทนการพิมพ์เองทั้งหมด

**Aesthetic Focus**: ภาพ Asian beauty — Thai, Korean, Japanese, Chinese — เน้นความขาว น่ารัก สไตล์ตุ๊กตา (doll-like) และ editorial fashion

---

## 2. โครงสร้างไฟล์ทั้งหมด

```
ModelPromptForge/
├── index.html                        # App shell — layout, panels, right sidebar controls
├── style.css                         # Design system — dark mode, neon glow, glassmorphism
├── app.js                            # Core logic — fetch, state, render, compile, events
├── attributes/                       # JSON datasets for all option groups
│   ├── 001-character.json            # Gender, Age, Ethnicity, Beauty, Reference
│   ├── 002-face.json                 # Face Shape, Expression
│   ├── 003-eyes.json                 # Eye shapes
│   ├── 004-eyebrows.json             # Eyebrow styles
│   ├── 005-nose.json                 # Nose shapes
│   ├── 006-lips.json                 # Lip types, Smile
│   ├── 007-skin.json                 # Skin tone, Texture, Makeup, Freckles
│   ├── 008-hair.json                 # Hair length, style, texture, color, bangs
│   ├── 009-body.json                 # Body shape — has gpt-image-safe variants
│   ├── 010-clothing.json             # Top, Bottom, Dress, Shoes, Accessories, Casual wear
│   ├── 011-pose.json                 # Standing, Sitting, Walking, Hand Position, Eye Contact
│   ├── 012-environment.json          # Location, Architecture, Props, Weather, Time, Season
│   ├── 013-lighting.json             # Key/Fill/Back Light, Flash, Neon, Ambient, Golden Hour, Natural
│   ├── 014-camera.json               # Brand, Lens, Focal Length, Aperture, ISO, WB, Perspective
│   ├── 015-quality.json              # Resolution, Sharpness, Photorealism, Color Grading, Film Look
│   ├── 016-nsfw.json                 # Nudity Level, Sensual Pose (ซ่อนอยู่ ต้อง toggle เปิด)
│   └── spec/
│       ├── ui-schema.json            # กำหนด accordion groups และ fields ทุกตัว
│       ├── prompt-templates.json     # Template strings ที่ใช้ประกอบ prompt
│       └── prompt-order.json        # ลำดับการวาง segment ใน prompt
├── requirements/
│   ├── README.md                     # ← ไฟล์นี้ — project understanding guide
│   ├── requirements.md               # Original functional requirements
│   ├── prompt-rules.md               # Prompt ordering rules
│   ├── gpt-image-style-guide.md      # GPT Image specific style guidelines
│   └── implementation-plan/
│       └── enhancements/
│           ├── 001-options-enhancements.md   # NSFW toggle, lighting, clothing, env, conflict rules
│           ├── 002-dynamic-preview-canvas.md # 8-bit pixel art canvas preview (pending impl.)
│           └── 003-gpt-safe-positive-words.md # Positive words system (pending impl.)
└── example-target/                   # ตัวอย่าง exported prompts / config JSON
```

---

## 3. โครงสร้าง JSON ของ Attribute Files

ทุกไฟล์ใน `/attributes/` เป็น JSON array ของ option objects มีโครงสร้างดังนี้:

```json
{
  "id": "environment.pop_06",
  "category": "environment",
  "label": "Bustling Japanese Arcade",
  "ui": {
    "control": "select",
    "group": "Environment"
  },
  "subcategory": "Location",
  "prompt": {
    "default": "in a bustling Japanese game center and arcade",
    "gpt-image": "in a vibrant bustling Japanese game center and arcade, filled with glowing screens and colorful neon signs",
    "gpt-image-safe": "...",          
    "gpt-image-positive": "..."       
  },
  "exclusions": ["environment.008"],  
  "tags": ["environment", "location", "arcade", "indoor", "asian"],
  "enabled": true
}
```

### ฟิลด์ที่สำคัญ:
| ฟิลด์ | ความหมาย |
|---|---|
| `id` | unique ID ใช้เป็น key ใน `state.selections` และใช้อ้างอิงใน `exclusions` |
| `category` | ตรงกับชื่อ category ย่อ เช่น `"environment"`, `"clothing"` |
| `subcategory` | ใช้ filter options ให้ตรงกับ field ใน ui-schema (เช่น `"Location"`, `"Architecture"`) |
| `prompt.default` | คำ prompt พื้นฐาน |
| `prompt.gpt-image` | คำ prompt แบบ expanded ใช้กับ GPT Image โดยปกติ |
| `prompt.gpt-image-safe` | คำ prompt เซฟสำหรับเลี่ยง safety filter (เปิดใช้ผ่าน GPT-Safe Mode toggle) |
| `prompt.gpt-image-positive` | (pending) คำ positive keywords เพิ่มท้าย prompt เมื่อเปิด GPT-Safe Mode |
| `exclusions` | (pending) array ของ `id` ที่ห้ามเลือกพร้อมกัน |
| `enabled` | `false` = ซ่อน option ออกจาก dropdown |

### ข้อสังเกต subcategory:
- ไฟล์ที่ **มี** subcategory: `010-clothing.json`, `011-pose.json`, `012-environment.json`, `013-lighting.json`, `016-nsfw.json`
- ไฟล์ที่ **ไม่มี** subcategory (ใช้ heuristics ใน `getOptionsForField`): `001-character.json`, `002-face.json`, `007-skin.json`, `006-lips.json`

---

## 4. Spec Files

### `attributes/spec/ui-schema.json`
กำหนด accordion groups และ fields ทั้งหมด มี 12 groups:
`Character`, `Face`, `Hair`, `Skin`, `Body`, `Clothing`, `Pose`, `Environment`, `Lighting`, `Camera`, `Quality`, `NSFW`

Group `NSFW` จะถูก **ซ่อนโดย CSS default** และแสดงผลเมื่อ user เปิด toggle "Enable NSFW Options"

### `attributes/spec/prompt-templates.json`
Template strings ที่ประกอบ prompt ขั้นสุดท้าย มี 7 templates:
| Template | ลักษณะ |
|---|---|
| `portrait` | standard — `{subject}, {appearance}, {clothing}, ...` |
| `nightclub` | เน้น nightclub atmosphere |
| `street` | เน้น urban street |
| `studio` | photography studio |
| `thaiTraditional` | สำหรับชุดไทย |
| `vintageFilm` | สไตล์ฟิล์มเก่า |
| `cafeMinimalist` | สไตล์ cafe ญี่ปุ่น/เกาหลี |

Template tags ที่ใช้: `{subject}`, `{appearance}`, `{clothing}`, `{nsfw}`, `{pose}`, `{environment}`, `{lighting}`, `{camera}`, `{quality}`

### `attributes/spec/prompt-order.json`
กำหนดลำดับ segment ใน prompt:
`subject → face_shape → eyes → eyebrows → nose → lips → skin → hair_style → body → clothing_fit → fabric → tops → bottoms → nsfw → pose_body → environment → lighting → camera → quality`

---

## 5. โครงสร้าง app.js

### Constants และ State
```js
const ATTRIBUTE_FILES = [...]  // รายชื่อไฟล์ JSON ทั้งหมดที่ต้อง fetch
const FIELD_TO_CATEGORY_MAP = {...}  // map field name → category string
const PRESETS = {...}  // preset definitions (nightclub, studio, street, thaiSilk, cheongsam, minimalistCafe, beachCasual)

const state = {
  schema: null,       // ui-schema.json
  templates: null,    // prompt-templates.json
  order: null,        // prompt-order.json order array
  library: [],        // รวม options ทุกตัวจากทุกไฟล์
  selections: {},     // { fieldName: { id, value, isCustom, group } }
  imageReferences: { faceMatch, styleMatch, poseMatch },
  aspectRatio: "6:8"
}
```

### ลำดับการทำงานตอน init
1. `initApp()` → fetch spec files + attribute files พร้อมกัน
2. `renderForm()` → สร้าง accordion UI จาก schema
3. `bindEvents()` → ผูก event listeners
4. `updatePromptPreview()` → compile prompt ครั้งแรก

### ฟังก์ชันหลัก
| ฟังก์ชัน | หน้าที่ |
|---|---|
| `renderForm()` | สร้าง accordion + dropdown จาก ui-schema |
| `getOptionsForField(fieldName, category, library)` | filter options ให้ตรง field โดยใช้ subcategory หรือ heuristics |
| `bindEvents()` | ผูก event ทุกอย่าง — dropdown change, checkboxes, buttons, presets |
| `getPromptValueForSelection(selection)` | ดึงค่า prompt ที่ถูกต้องโดยดู GPT-Safe toggle (คืน `gpt-image-safe` หรือ `gpt-image` หรือ `default`) |
| `updateAccordionSummaryBadges(groupName)` | อัปเดต badge สรุปหัว accordion |
| `generatePromptText(cleanTextOnly)` | compile prompt จาก state.selections + template |
| `updatePromptPreview()` | เรียก generatePromptText แล้วแสดง HTML ใน #prompt-preview |
| `copyPromptToClipboard()` | copy text prompt |
| `copyPromptAsJSON()` | copy structured JSON |
| `exportConfigJSON()` | download JSON config file |
| `importConfigJSON(jsonStr)` | restore state จาก JSON |
| `resetForm()` | ล้าง selections และ UI ทั้งหมด |
| `randomizeSelections()` | สุ่มเลือก options (65% chance ต่อ field) |
| `applyFaceMatchLockout()` | lock Face fields เมื่อ Face Match checkbox เปิด |

### การจัดการ selections state
เมื่อ user เลือก dropdown:
```js
state.selections[fieldName] = {
  id: "environment.pop_06",   // option ID จาก JSON
  value: "prompt text...",    // prompt value ที่แสดงตามสภาพ GPT-Safe
  isCustom: false,            // true ถ้าเป็น custom write-in
  group: "Environment"        // accordion group name
}
```

---

## 6. UI Layout

### Left Panel (`#form-container`)
- Collapsible accordions สร้างจาก `ui-schema.json` แบบ dynamic
- แต่ละ accordion มี badge แสดงสรุปค่าที่เลือก
- NSFW accordion ซ่อนโดย default

### Right Panel (Sticky sidebar)
ประกอบด้วย sections:
1. **Template Selector** — dropdown เลือก prompt template
2. **Presets** — chip buttons สำหรับ preset ต่างๆ (nightclub, studio, street, thaiSilk, cheongsam, minimalistCafe, beachCasual)
3. **Aspect Ratio** — chip buttons (1:1, 6:8, 16:9, 9:16)
4. **Image Reference Options** — checkboxes: Face Match, Style Match, Pose Match
5. **Content Settings** — checkboxes: Enable NSFW Options, GPT-Safe Mode (Avoid Violations)
6. **Live Prompt Preview** — แสดง prompt แบบ color-coded + ปุ่ม Copy Text / Copy JSON
7. **Actions** — ปุ่ม Surprise Me (random), Reset, Export JSON, Import JSON

---

## 7. Color Token Classes ใน Live Preview

| CSS Class | สี | หมายถึง |
|---|---|---|
| `.token-subject` | ม่วง/violet | Character segment |
| `.token-appearance` | ฟ้าอ่อน/cyan | Face, Hair, Skin segment |
| `.token-clothing` | ส้ม/amber | Clothing segment |
| `.token-pose` | เขียว | Pose segment |
| `.token-environment` | ฟ้าน้ำทะเล | Environment segment |
| `.token-lighting` | เหลือง | Lighting segment |
| `.token-camera` | เทา | Camera segment |
| `.token-quality` | ชมพูอ่อน | Quality segment |
| `.token-reference` | ชมพูเรืองแสง | Image Reference overrides |
| `.token-nsfw` | ชมพูบาน | NSFW segment |

---

## 8. Prompt Compilation Flow

```
generatePromptText(cleanTextOnly)
  ↓
  [ตรวจ Image Reference overrides] → ถ้า faceMatch/styleMatch/poseMatch เปิด → inject fixed text แทน
  ↓
  compileGroupSegment(groupName, tokenClass)
    ↓
    [วน state.order] → หา selection ที่ group ตรงกัน
    → getPromptValueForSelection(selection)
       → ดู toggle-gpt-safe
       → คืน prompt["gpt-image-safe"] || prompt["gpt-image"] || prompt.default
    ↓
    [fallback] → ถ้าหาไม่เจอจาก order → วนจาก state.selections โดยตรง
  ↓
  แทน template tags {subject}, {appearance}, {clothing}, {nsfw}, {pose}, {environment}, {lighting}, {camera}, {quality}
  ↓
  ต่อท้ายด้วย --ar {aspectRatio}
```

---

## 9. GPT-Safe Mode System

**Toggle**: `#toggle-gpt-safe` checkbox ใน Content Settings

**วิธีทำงาน**: เมื่อเปิด ฟังก์ชัน `getPromptValueForSelection()` จะเลือก:
1. `prompt["gpt-image-safe"]` — ถ้ามี
2. `prompt["gpt-image"]` — fallback
3. `prompt.default` — fallback สุดท้าย

**Attribute files ที่มี gpt-image-safe ครบ**: `009-body.json`

**Planned (pending)**: `gpt-image-positive` field — รวบรวม positive keywords ต่อท้าย prompt เมื่อ GPT-Safe เปิด ดูรายละเอียดใน `003-gpt-safe-positive-words.md`

---

## 10. NSFW System

**Toggle**: `#toggle-nsfw` checkbox ใน Content Settings

**Accordion**: `#accordion-nsfw` ซ่อนโดย `style.css` default แสดงเมื่อ checkbox checked

**Dataset**: `016-nsfw.json` — มี 2 fields:
- `Nudity Level` (subcategory: `Nudity Level`)
- `Sensual Pose` (subcategory: `Sensual Pose`)

**เมื่อปิด toggle**: ล้าง state.selections ของ NSFW group ทั้งหมดทันที

---

## 11. Exclusions System (Pending Implementation)

ดูรายละเอียดใน [001-options-enhancements.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/enhancements/001-options-enhancements.md) ส่วน **E. Conflict Prevention & Mutual Exclusions**

**วิธีที่วางแผนไว้**:
- เพิ่ม field `"exclusions": ["other.id"]` ใน JSON option objects
- เมื่อ user เลือก option ที่มี exclusions → auto-clear option ที่ขัดแย้งออกจาก state + UI

**ตัวอย่าง conflicts ที่รู้จัก**:
| Option | ขัดกับ |
|---|---|
| `environment.pop_06` (Japanese Arcade) | `environment.008` (Traditional Thai architecture) |
| `environment.pop_04` (Ornate Traditional Temple) | `environment.007` (Cyberpunk neon streets) |
| `environment.001` (Crowded nightclub) | `environment.pop_07` (Botanical Greenhouse) |
| `environment.007` (Cyberpunk neon streets) | `environment.008` (Traditional Thai architecture) |

---

## 12. Presets

| Preset Key | Template | ธีม |
|---|---|---|
| `nightclub` | nightclub | ผู้หญิงไทยในไนท์คลับ flash + neon |
| `studio` | studio | ผู้หญิงเกาหลีใน studio corset |
| `street` | street | ผู้หญิงญี่ปุ่นริมถนน urban |
| `thaiSilk` | thaiTraditional | ชุดผ้าไหมไทย + วัด |
| `cheongsam` | vintageFilm | ชุด Qipao จีน vintage film |
| `minimalistCafe` | cafeMinimalist | ผู้หญิงเกาหลีในคาเฟ่ minimalist |
| `beachCasual` | portrait | ผู้หญิงไทยชุด casual ริมทะเล |

---

## 13. งานที่ Implementation เสร็จแล้ว

| Task | ไฟล์ | Status |
|---|---|---|
| NSFW Toggle + Accordion | `index.html`, `app.js`, `style.css`, `016-nsfw.json`, `ui-schema.json` | ✅ Done |
| Natural Lighting options | `013-lighting.json` | ✅ Done |
| Casual Clothing options | `010-clothing.json` | ✅ Done |
| Popular Environment options | `012-environment.json` | ✅ Done |
| GPT-Safe Mode toggle | `index.html`, `app.js` | ✅ Done |
| `gpt-image-safe` field ใน body.json | `009-body.json` | ✅ Done |
| Beach Casual preset | `app.js` | ✅ Done |

## 14. งานที่ยังรอ Implementation

| Task | Requirement File | Priority |
|---|---|---|
| Exclusions / Conflict Prevention | `001-options-enhancements.md` (ส่วน E) | 🔴 High (user รายงาน bug) |
| GPT-Safe Positive Words (`gpt-image-positive`) | `003-gpt-safe-positive-words.md` | 🟡 Medium |
| 8-Bit Dynamic Preview Canvas | `002-dynamic-preview-canvas.md` | 🟢 Low |

---

## 15. หมายเหตุสำคัญและ Gotchas

1. **ไม่มี backend** — ทุกอย่าง client-side fetch จาก local files เท่านั้น ต้องรันผ่าน HTTP server (Live Server, `npm serve`) ไม่ใช่ double-click เปิด HTML ตรง เพราะ fetch จะ fail ด้วย CORS error
2. **FIELD_TO_CATEGORY_MAP** ต้องอัปเดตทุกครั้งที่เพิ่ม field ใหม่ใน ui-schema
3. **subcategory ต้องตรงกับชื่อ field** ใน ui-schema ทุกตัวอักษร (case-sensitive)
4. **state.library** คือ flat array รวม options ทั้งหมด ค้นหาด้วย `.find(item => item.id === id)`
5. **getPromptValueForSelection** ต้องการ `state.library` ครบ — ถ้า item ไม่อยู่ใน library จะ fallback ไปใช้ `selection.value` เดิม
6. **NSFW accordion** ถูกสร้างจาก `renderForm()` เหมือน accordion ปกติ แต่ถูกซ่อนด้วย `display: none` ใน `style.css` และแสดงผ่าน JS event listener ของ `#toggle-nsfw`
