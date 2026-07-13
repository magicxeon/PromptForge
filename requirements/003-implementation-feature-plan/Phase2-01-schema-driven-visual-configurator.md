# Schema-driven Visual Configurator

**Document ID:** `016-schema-driven-visual-configurator`  
**Application:** `ModelPromptForge`  
**Status:** Proposed Requirement - Awaiting Review  
**Priority:** Medium  
**Updated:** 2026-07-12

## 1. Objective

ปรับ `Studio Creative Configurator` จากการใช้ dropdown เป็นหลัก ให้ผู้ใช้เข้าใจผลลัพธ์ของแต่ละ option ได้จากภาพ, diagram, สี, icon และคำอธิบาย โดยเลือก control ให้เหมาะกับลักษณะข้อมูลของแต่ละ category

การพัฒนาต้องเป็น progressive enhancement:

- Attribute เดิมและ prompt contract ต้องยังทำงานเหมือนเดิม
- Option ที่ไม่มี visual asset ต้อง fallback เป็น dropdown ได้
- สามารถทยอยเปิดใช้ทีละ field/category โดยไม่ต้อง migrate ทั้งระบบพร้อมกัน
- Desktop และ mobile ต้องใช้งานได้ รวมถึง keyboard และ screen reader
- Theme ต้องสอดคล้องกับ dark neon/glass design system ปัจจุบัน

## 2. User Problems

- ผู้ใช้ไม่รู้ว่าข้อความใน dropdown จะส่งผลต่อรูปภาพอย่างไร
- ศัพท์ด้านกล้อง แสง composition และ pose เข้าใจยากสำหรับผู้ใช้ทั่วไป
- Native `<select>` ไม่เหมาะกับการเปรียบเทียบตัวเลือกเชิงภาพ
- Category แต่ละประเภทมี interaction pattern ต่างกัน แต่ปัจจุบันใช้ control ใกล้เคียงกันทั้งหมด
- เมื่อ option มีจำนวนมาก ผู้ใช้ค้นหาและจดจำค่าที่เคยใช้ได้ยาก

## 3. UX Strategy

### 3.1 Control Matrix

| Data type/category | Recommended control | Example |
|---|---|---|
| รูปแบบที่ต้องเปรียบเทียบด้วยภาพ | Visual card picker | Hair, Face Shape, Clothing, Environment |
| หลักการเชิงเทคนิค | Diagram picker | Framing, Camera Angle, Lighting Direction |
| สีหรือโทน | Swatch/gradient picker | Hair Color, Clothing Color, Color Grading |
| ตัวเลือกน้อยและ mutually exclusive | Segmented control | Gender, Output Orientation |
| ระดับต่อเนื่อง | Labeled slider | Blur, Makeup Intensity, Light Strength |
| รายการขนาดใหญ่ | Searchable visual picker | Pose, Clothing, Environment |
| เรื่องราวแบบมีลำดับ | Guided scene builder | Scene Story, Photographic Context |
| ค่าทางเทคนิคที่ภาพไม่ช่วยมาก | Compact select | ISO, Camera Brand |

### 3.2 Responsive Pattern

- Desktop: selected-value trigger เปิด popover หรือ gallery dialog
- Mobile: trigger เปิด bottom sheet ที่เลื่อนดูและค้นหาได้
- Visual card แสดงภาพ/diagram, label และ selected state
- Detail view แสดงคำอธิบาย, prompt effect และ preview ขนาดใหญ่
- Modal ต้องมี Search, Clear, Apply/Close และ Custom value ตามความเหมาะสม

ไม่ใช้รูปภาพภายใน native `<select>` เพราะ browser rendering และ accessibility ไม่สม่ำเสมอ

## 4. Attribute UI Contract

เพิ่ม metadata แบบ optional โดยไม่เปลี่ยน contract เดิม:

```json
{
  "id": "camera.framing_06",
  "category": "camera_framing",
  "subcategory": "Framing",
  "label": {
    "en": "Full-body Shot",
    "th": "ระยะเต็มตัว"
  },
  "description": {
    "en": "Shows the complete subject from head to toe.",
    "th": "แสดงตัวแบบครบตั้งแต่ศีรษะถึงปลายเท้า"
  },
  "ui": {
    "control": "visual-picker",
    "group": "Camera",
    "visual": {
      "type": "diagram",
      "src": "/assets/attributes/camera/framing/full-body.webp",
      "thumbnail": "/assets/attributes/camera/framing/thumb/full-body.webp",
      "alt": {
        "en": "Full human figure inside the camera frame",
        "th": "ตัวแบบเต็มตัวอยู่ภายในกรอบภาพ"
      },
      "focalPoint": "50% 50%"
    }
  },
  "prompt": {
    "default": "full-body shot"
  },
  "enabled": true
}
```

### 4.1 Supported UI Metadata

| Property | Required | Description |
|---|---:|---|
| `ui.control` | No | `select`, `visual-picker`, `swatch`, `segmented`, `slider` |
| `ui.visual.type` | When visual exists | `photo`, `diagram`, `illustration`, `gradient`, `icon` |
| `ui.visual.src` | When visual exists | Full asset path |
| `ui.visual.thumbnail` | No | Optimized grid thumbnail; fallback to `src` |
| `ui.visual.alt.en/th` | Yes for image | Accessible description, not a copy of filename |
| `ui.visual.focalPoint` | No | CSS object-position value |
| `description.en/th` | Recommended | User-facing explanation of visible effect |

Unknown metadata must be ignored safely by old UI code.

## 5. Asset Standard

### 5.1 Directory Pattern

```text
client/assets/attributes/
|-- camera/
|   `-- framing/
|       |-- thumb/
|       |-- extreme-close-up.webp
|       |-- close-up.webp
|       `-- ...
|-- lighting/
|-- pose/
|-- hair/
|-- clothing/
`-- environment/
```

### 5.2 Technical Rules

- Full preview: WebP, recommended `1024x1024`, maximum target 250 KB
- Thumbnail: WebP, recommended `320x320`, maximum target 50 KB
- Use the same aspect ratio within one field
- Use lowercase kebab-case filenames matching the semantic option name
- Do not embed text inside the image; labels are rendered by the UI
- Asset license/source must be documented if not generated specifically for this project
- Broken or absent assets must show a neutral placeholder and preserve selection behavior

### 5.3 Visual Consistency Rules

- One category must use the same subject, wardrobe, background and color treatment
- Change only the property being demonstrated
- Framing examples must keep subject, lens character and background constant
- Lighting examples must keep camera, pose and framing constant
- Hair examples must keep face, camera angle and light constant
- Pose examples should use a neutral silhouette or the same non-identifiable model
- Avoid sexualized examples in general-purpose pickers

## 6. AI Asset Generation Template

### 6.1 Master Variables

```text
{CATEGORY}
{OPTION_ID}
{OPTION_LABEL_EN}
{VISUAL_DIFFERENCE}
{FIXED_SUBJECT}
{FIXED_WARDROBE}
{FIXED_BACKGROUND}
{FIXED_CAMERA}
{FIXED_LIGHTING}
{ASPECT_RATIO}
```

### 6.2 Master Prompt

```text
Create a clean educational reference image for an AI image configurator.
Category: {CATEGORY}
Option: {OPTION_LABEL_EN} ({OPTION_ID})
Clearly demonstrate only this visual difference: {VISUAL_DIFFERENCE}.

Keep these elements identical across every image in this category:
- Subject: {FIXED_SUBJECT}
- Wardrobe: {FIXED_WARDROBE}
- Background: {FIXED_BACKGROUND}
- Camera: {FIXED_CAMERA}
- Lighting: {FIXED_LIGHTING}

Use a neutral, professional, non-branded visual style. No text, labels,
logos, watermarks, borders, collages, extra people, or decorative UI.
Center the demonstration clearly and preserve safe margins for square cropping.
Aspect ratio: {ASPECT_RATIO}.
```

### 6.3 Diagram Prompt Template

```text
Create a minimal technical diagram demonstrating {OPTION_LABEL_EN} for
{CATEGORY}. Use one neutral human silhouette, a clear camera-frame boundary,
and only the marks necessary to explain {VISUAL_DIFFERENCE}. Consistent dark
navy background, cyan primary line, warm yellow highlight, no words, no logo,
no watermark, square composition, crisp vector-like edges.
```

### 6.4 Generation Manifest Template

สร้าง manifest ก่อน generate เพื่อให้ batch มีรูปแบบเดียวกัน:

```json
{
  "category": "camera-framing",
  "version": 1,
  "fixed": {
    "subject": "one neutral adult silhouette standing naturally",
    "wardrobe": "plain fitted neutral clothing",
    "background": "minimal studio background",
    "camera": "eye-level neutral perspective",
    "lighting": "soft balanced studio light",
    "aspectRatio": "1:1"
  },
  "items": [
    {
      "attributeId": "camera.framing_06",
      "filename": "full-body.webp",
      "difference": "the complete subject appears from head to toe"
    }
  ]
}
```

## 7. Ownership

### 7.1 Work Codex/AI Agent Can Implement

- Audit fields and recommend control type per field
- Extend JSON schema and add backward-compatible validation
- Implement reusable Visual Picker, Swatch, Segmented and Slider controls
- Implement desktop dialog/popover and mobile bottom sheet
- Implement search, keyboard navigation, bilingual labels and accessibility
- Implement asset fallback, lazy loading and thumbnail loading
- Preserve selections, locking, randomization, presets, import/export and prompt compilation
- Create asset directories, manifests, placeholder diagrams and metadata templates
- Generate deterministic SVG diagrams through code where suitable
- Write scripts to validate missing assets, dimensions, duplicate IDs and alt text
- Write unit/integration tests and perform responsive browser verification
- Prepare AI image-generation manifests and prompts for each category
- If an image-generation tool is available and approved, generate initial bitmap assets from the reviewed manifest

### 7.2 Work Product Owner/User Must Review or Supply

- Approve visual direction and whether examples use diagram, AI model or product photography
- Approve the representative subject and cultural/brand direction
- Confirm license/ownership for externally supplied images
- Review AI-generated assets for anatomy, bias, safety and correct visual meaning
- Approve credit/API cost before large batch generation
- Select final assets when multiple variants are generated
- Decide whether photographic assets may depict recognizable people or brands

AI can prepare and generate most assets, but final semantic and brand approval remains a human checkpoint.

## 8. Implementation Steps

Each step must be independently reviewable. Do not start the next step until its acceptance checklist is approved when working under staged delivery.

### Step 0: Inventory and Decision Matrix

**Owner:** Codex  
**Status:** Pending

- Export all schema fields, option counts and current control types
- Assign recommended control and visual type per field
- Identify fields that should remain dropdowns
- Produce estimated asset count and generation cost bands

**Acceptance:** A reviewed matrix exists with no field missing.

### Step 1: Metadata Contract and Validator

**Owner:** Codex  
**Status:** Pending

- Add optional visual metadata contract
- Add validation tool for paths, bilingual alt text and duplicate filenames
- Ensure old attributes render unchanged

**Acceptance:** Existing app and tests pass without adding any visual asset.

### Step 2: Reusable Visual Picker Foundation

**Owner:** Codex  
**Status:** Pending

- Build trigger, card grid, search, selected state, clear and custom option
- Add desktop dialog and mobile bottom sheet
- Support keyboard, focus management, Escape and screen readers
- Synchronize with `state.selections` and existing `<select>` behavior

**Acceptance:** A fixture field can switch between dropdown and visual picker without changing generated prompt.

### Step 3: Camera Framing Pilot

**Owner:** Codex + User review  
**Status:** Pending

- Use the nine Camera Framing options as the pilot
- Prefer code-generated diagram assets to avoid AI generation cost
- Add bilingual descriptions and alt text
- Verify normal, headshot and character-sheet modes

**User checkpoint:** Approve diagram style and semantic accuracy.

**Acceptance:** Users can distinguish all framing distances without reading prompt text.

### Step 4: Lighting and Camera Perspective

**Owner:** Codex + User review  
**Status:** Pending

- Add technical diagrams for light direction and camera perspective
- Keep Camera Brand, ISO and similar technical fields as compact selects unless testing indicates otherwise

**User checkpoint:** Approve technical accuracy.

### Step 5: Hair, Face and Body Visual Pickers

**Owner:** Codex prepares system; User approves assets  
**Status:** Pending

- Prepare category manifests and fixed-subject prompts
- Generate or import consistent visual sets
- Add lazy loading because asset count will increase significantly

**User checkpoint:** Approve representation, realism, bias and final asset set.

### Step 6: Clothing, Pose and Environment Gallery

**Owner:** Codex prepares system; User approves assets  
**Status:** Pending

- Add searchable gallery, category filters and larger preview
- Use silhouettes for pose where practical
- Use photos/illustrations for clothing and environment

**User checkpoint:** Confirm commercial style and asset rights.

### Step 7: Scene Builder

**Owner:** Codex  
**Status:** Pending

- Present Scene Story and Photographic Context as guided scene choices
- Suggested flow: context, location, time/weather, activity/story, atmosphere
- Preserve current prompt order and conflict resolution

**Acceptance:** Every selected scene value appears in client preview and authoritative server prompt.

### Step 8: Favorites and Recently Used

**Owner:** Codex  
**Status:** Pending

- Store favorites and recent options locally per user/browser
- Show compact shortcuts without changing attribute definitions
- Provide reset/clear behavior

### Step 9: Performance, Accessibility and QA

**Owner:** Codex + User acceptance test  
**Status:** Pending

- Lazy-load thumbnails and full assets
- Test missing/corrupt images and slow connections
- Test keyboard-only, reduced motion, mobile layout and bilingual switching
- Ensure configurator initial load does not download every full-size asset
- Verify presets, randomization, locks, persistence and import/export

## 9. AI-assisted Asset Workflow

AI can execute the following after the user approves one pilot style:

1. Read all options in a target category.
2. Build a generation manifest using Section 6.4.
3. Detect which properties must remain fixed.
4. Generate one contact-sheet prototype or three representative options.
5. Pause for human visual approval.
6. Generate the remaining batch using the approved master prompt.
7. Normalize dimensions and convert to WebP.
8. Generate thumbnails.
9. Update attribute metadata and alt text.
10. Run asset validation and visually inspect every result.

Do not generate a large paid batch before Step 5 approval. Generation cost must be shown as estimated credits/API calls before execution.

## 10. Out of Scope for Initial Release

- Generating a unique preview image dynamically for every user selection combination
- Training a custom model solely for picker assets
- Replacing all controls in one release
- Automatic acceptance of AI-generated assets without human review
- Cloud asset management/CDN migration
- Usage analytics unless separately approved with privacy requirements

## 11. Global Acceptance Criteria

- A user can understand visual options without knowing photography terminology
- Selecting through a visual control produces the same state and prompt as the equivalent dropdown
- Missing visual metadata never prevents form rendering or image generation
- All controls work in Thai and English
- All interactive controls are keyboard accessible
- Mobile controls meet a minimum 44x44 px touch target
- Full-size visual assets are not downloaded until needed
- Existing preset, randomization, lock, persistence, import/export and prompt behavior do not regress
- Client preview and server-compiled prompt remain equivalent for visual selections

## 12. Progress Tracker

| Step | Deliverable | Owner | Status | Review |
|---:|---|---|---|---|
| 0 | Inventory and control matrix | Codex | Pending | User |
| 1 | Metadata contract and validator | Codex | Pending | Technical |
| 2 | Visual Picker foundation | Codex | Pending | UX/Technical |
| 3 | Camera Framing pilot | Codex + User | Pending | Visual |
| 4 | Lighting and Perspective | Codex + User | Pending | Visual |
| 5 | Hair, Face and Body | Codex + User | Pending | Asset/Representation |
| 6 | Clothing, Pose and Environment | Codex + User | Pending | Commercial/Asset |
| 7 | Guided Scene Builder | Codex | Pending | Functional |
| 8 | Favorites and Recent | Codex | Pending | UX |
| 9 | Performance, accessibility and QA | Codex + User | Pending | UAT |

