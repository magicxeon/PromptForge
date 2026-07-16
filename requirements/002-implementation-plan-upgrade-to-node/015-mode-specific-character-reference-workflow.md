# 15. Mode-specific Character Reference Workflow

**Status:** Implemented  
**Scope:** Headshot, Character Sheet, Normal and future Story Mode  
**Updated:** 2026-07-13

## 1. Objective

ลดความซ้ำซ้อนและความสับสนของ reference controls โดยแยก UX ตามวัตถุประสงค์ของ generation mode แต่ใช้ reference/asset contract กลางชุดเดียวกันภายในระบบ

ผลลัพธ์ที่ต้องการ:

- Character Sheet Mode ใช้ Face Match Reference สำหรับกำหนดเอกลักษณ์ใบหน้า
- ไม่แสดง `Enable character-sheet reference image (Up to 2 slots)` ใน Character Sheet Mode เพราะซ้ำซ้อนกับ Face Match
- Story Mode แสดง `Character Reference` เพื่อรับ Character Sheet, Face Reference หรือทั้งสองประเภท
- Reference สอง slots ใน Story MVP หมายถึงสองภาพของตัวละครเดียวกัน ไม่ใช่ตัวละครสองคน
- รองรับการเลือก reference จาก Project/History ในอนาคตโดยไม่ต้องอัปโหลดไฟล์เดิมซ้ำ

## 2. Problem Statement

ปัจจุบัน Character Sheet Mode มีทั้ง Face Match Reference และ Character Sheet Reference control ทำให้ผู้ใช้ไม่ทราบว่า:

- ต้องอัปโหลดใบหน้าที่ control ใด
- Character Sheet Reference ต่างจาก Face Match อย่างไร
- หากเปิดทั้งสองส่วน ระบบให้ความสำคัญกับภาพใด
- สอง slots หมายถึงสองมุมของคนเดียวกันหรือสองตัวละคร

หากนำ control เดิมไปใช้ใน Story Mode โดยไม่กำหนด reference role ระบบอาจผสม identity, เสื้อผ้า หรือรูปร่างจากคนละภาพอย่างไม่ตั้งใจ

## 3. Terminology

| Term | Meaning |
|---|---|
| Face Reference | ภาพอ้างอิงใบหน้าสำหรับรักษา identity และลักษณะใบหน้า |
| Character Sheet Reference | ภาพอ้างอิงตัวละครเต็มตัวหรือหลายมุม ใช้รักษารูปร่าง เสื้อผ้า ทรงผม และภาพรวมตัวละคร |
| Character Reference | ชื่อ UX ใน Story Mode ซึ่งครอบ Face Reference และ Character Sheet Reference |
| Reference Slot | ช่องภาพเพิ่มเติมของตัวละครเดียวกัน ไม่ใช่ช่องแทนตัวละครคนละคน |
| Canonical Reference | ภาพอ้างอิงที่ผู้ใช้ยืนยันเป็นแหล่งหลักของตัวละคร |

## 4. Mode Policy

### 4.1 Headshot Mode

แสดง:

- Face Match Reference
- สูงสุดสองภาพของบุคคลเดียวกันตาม provider/model capability

ไม่แสดง:

- Character Sheet Reference
- Style/Pose controls ที่ mode ไม่รองรับหรือทำให้ขัดกับ fixed headshot layout

Face Reference ใช้รักษาใบหน้า ขณะที่ layout, framing และ background ยังคงถูกกำหนดโดย Headshot Mode

### 4.2 Character Sheet Mode

แสดง:

- Face Match Reference
- Character attributes
- Body, hair, clothing และ appearance configuration

ไม่แสดง:

- `Enable character-sheet reference image (Up to 2 slots)`

Workflow:

```text
Face Reference
  + Character Attributes
  + Body/Hair/Clothing
  -> Generate Character Sheet
```

Face Reference ต้องมีคำอธิบาย:

> ใช้รักษาเอกลักษณ์ใบหน้า ส่วนรูปร่าง เสื้อผ้า และมุมมองของ Character Sheet จะสร้างจากค่าที่กำหนด

### 4.3 Normal Mode

คง reference controls ตามความสามารถเดิม:

- Face Match
- Style Match
- Pose Match

ต้องใช้ shared reference contract เดียวกับ mode อื่น และไม่สร้าง state รูปแบบใหม่โดยไม่จำเป็น

### 4.4 Story Mode

แสดง section ชื่อ:

```text
Character Reference
ใช้ Character Sheet หรือภาพใบหน้าของตัวละคร
```

Reference source options:

```text
○ ไม่ใช้ Reference
○ ใช้ Face Reference
○ ใช้ Character Sheet
○ ใช้ทั้ง Character Sheet และ Face Reference
```

MVP รองรับตัวละครหนึ่งคนต่อ Story frame ก่อน

Workflow:

```text
Character Reference
  + Story Scene
  + Action/Pose
  + Environment
  + Camera/Framing
  -> Generate Story Frame
```

## 5. Story Reference Priority

เมื่อมีทั้งสองประเภท:

1. Character Sheet เป็น primary reference สำหรับรูปร่าง สัดส่วน เสื้อผ้า ทรงผม และภาพรวม
2. Face Reference เป็น secondary reference สำหรับ identity และรายละเอียดใบหน้า
3. Structured character attributes ใช้เติมข้อมูลที่ reference ไม่ชัดเจน
4. Story scene/action/camera controls เปลี่ยนฉากและการแสดงโดยไม่ตั้งใจเปลี่ยน identity

UI ต้องอธิบายหน้าที่ของแต่ละ reference อย่างชัดเจน:

- `Character Sheet`: รักษารูปร่าง เครื่องแต่งกาย และภาพรวมตัวละคร
- `Face Reference`: รักษาเอกลักษณ์และรายละเอียดใบหน้า

Provider adapter เป็นผู้แปลง role เหล่านี้ให้เข้ากับ API ของ provider แต่ละราย

## 6. Slot Semantics

### 6.1 Story MVP

สอง slots หมายถึง reference ของตัวละครเดียวกัน เช่น:

- Slot A: ใบหน้าตรงหรือ Character Sheet หลัก
- Slot B: ใบหน้าด้านข้าง ภาพเต็มตัว หรือ reference เพิ่มเติมของคนเดิม

UI ต้องแสดงข้อความ:

> ภาพทั้งสองช่องต้องเป็นตัวละครคนเดียวกัน

### 6.2 Multiple Characters

การรองรับตัวละครหลายคนไม่ใช้ Slot A/B แทนคนละตัวละคร แต่ต้องใช้โครงสร้าง Character records แยกกัน:

```text
Story Characters
  Character 1
    Character Sheet
    Face References

  Character 2
    Character Sheet
    Face References
```

Multiple-character Story generation เป็น out of scope สำหรับ MVP นี้ และต้องมี requirement แยกสำหรับ:

- Character-to-reference mapping
- Prompt role and spatial placement
- Provider reference limits
- Identity mixing prevention
- Per-character consistency and lineage

## 7. Shared State Contract

ภายในระบบใช้ reference collection กลางแทน state เฉพาะ control:

```json
{
  "characterReferences": [
    {
      "id": "reference_001",
      "characterId": "character_001",
      "role": "character_sheet",
      "assetId": "asset_sheet_001",
      "source": "project_asset",
      "priority": "primary"
    },
    {
      "id": "reference_002",
      "characterId": "character_001",
      "role": "face_identity",
      "assetId": "asset_face_001",
      "source": "upload",
      "priority": "secondary"
    }
  ]
}
```

Supported roles:

- `face_identity`
- `character_sheet`
- Existing non-character roles such as `style` and `pose` remain separate

During the current pre-database phase, `assetId` may map to temporary upload/base64 data or an existing history job. The contract must allow future migration to Project Assets without changing Story/Character Sheet UI behavior.

## 8. Generation Payload

Client sends role-aware references rather than relying only on slot names:

```json
{
  "mode": "story",
  "characterReferences": [
    {
      "role": "character_sheet",
      "slot": "A",
      "characterKey": "primary_character",
      "assetId": "asset_sheet_001"
    },
    {
      "role": "face_identity",
      "slot": "B",
      "characterKey": "primary_character",
      "assetId": "asset_face_001"
    }
  ]
}
```

Server requirements:

- Validate mode and allowed roles
- Validate that Story MVP references use one `characterKey`
- Validate ownership/source accessibility
- Resolve references server-side where possible
- Enforce provider/model reference count and media limits
- Build role-specific prompt instructions
- Preserve lineage in history/result metadata

## 9. Provider Capability Handling

Provider/model capabilities may differ. Add a normalized capability contract:

```json
{
  "maxCharacterReferences": 2,
  "supportsFaceIdentityReference": true,
  "supportsCharacterSheetReference": true,
  "supportsMixedCharacterReferenceRoles": true
}
```

Behavior:

- Detect incompatible selections before credit deduction/provider request when possible
- Never silently discard a selected reference
- If mixed roles are unsupported, explain available alternatives
- If only one image is supported, ask the user to choose primary reference or use a documented combination strategy
- Do not promise exact identity, body or clothing consistency

## 10. UX Requirements

### 10.1 Mode Switching

- Character Sheet Mode hides Character Sheet Reference control
- Story Mode shows Character Reference control
- Hidden controls must not leave stale active state or payload references
- Switching back restores only compatible saved state for that mode
- State remains separated by generation mode according to existing persistence behavior

### 10.2 Source Selection

Story Character Reference supports:

- Upload new image
- Select from Project/Character Library when Project system exists
- Select an eligible Character Sheet from History during transitional implementation

Selected source displays thumbnail, type, source and remove/replace action

### 10.3 Accessibility

- Controls have labels and descriptions in Thai/English
- Upload/remove/source selectors support keyboard operation
- Thumbnail has meaningful alt text
- Error messages identify the affected slot and role
- Minimum mobile touch target is 44x44 px

## 11. Prompt Compilation

Prompt compiler must treat references as generation instructions, not ordinary free-text attributes.

Conceptual role instructions:

- Face identity: preserve recognizable facial identity while allowing story expression, camera and lighting changes
- Character Sheet: preserve character design, body proportions, hairstyle and clothing details while adapting pose and scene

Requirements:

- Client preview and authoritative server behavior remain aligned
- Role instructions are provider-safe and versioned where necessary
- Character Sheet Mode does not accidentally include Story Character Reference instructions
- Reference instruction does not overwrite explicit story action or environment

## 12. Migration and Compatibility

Existing state may contain:

- Face reference slots A/B
- Character Sheet reference checkbox and slots
- Parent history job IDs
- Base64/local output references

Migration rules:

1. Character Sheet Mode retains compatible face references.
2. Character Sheet-specific reference checkbox/state is disabled and removed from generation payload.
3. Story Mode may import eligible old Character Sheet references into `character_sheet` role after explicit user confirmation.
4. Never reinterpret two existing slots as two different characters.
5. Import/export configuration supports a schema version and safely ignores legacy incompatible values.

## 13. Error Cases

- Character Sheet and Face Reference depict different people
- Two slots appear to represent different characters
- Unsupported file, missing asset or inaccessible history result
- Provider supports fewer references than selected
- Reference exceeds request/size limits
- Character Sheet is a collage that provider cannot interpret reliably
- User changes mode while upload is pending
- Reference is removed but stale parent job ID remains

The system must clear invalid state consistently from UI, local persistence and generation payload.

## 14. Out of Scope

- Multiple named characters in one Story frame
- Automatic identity verification between slots
- Guaranteed facial or clothing fidelity
- Automatic Character Sheet parsing into separate front/side/back files
- Training/fine-tuning a character model
- Project Character Library implementation before Project/Database phases

## 15. Implementation Steps

### Step 1: Reference Audit

- Map current Face Match, Style Match, Pose Match and Character Sheet reference controls
- Document state, localStorage, payload and provider mapping
- Identify duplicate event listeners and stale-state risks

### Step 2: Shared Role-aware Contract

- Add normalized reference roles and provider capability contract
- Preserve backward compatibility during transition
- Add payload/server validation

### Step 3: Character Sheet Mode Simplification

- Hide/remove duplicate Character Sheet Reference control
- Retain Face Match controls
- Clear incompatible legacy state and payload fields
- Update bilingual help text

### Step 4: Story Character Reference UI

- Add source type selection
- Add up to two same-character slots
- Add upload/history source support appropriate to current architecture
- Add clear/replace and validation behavior

### Step 5: Provider and Compiler Integration

- Resolve role-aware references
- Enforce model capability limits
- Add prompt/reference role handling
- Persist result lineage

### Step 6: Persistence and Import/Export

- Store reference state per mode
- Add configuration schema version/migration
- Prevent incompatible state leakage across modes

### Step 7: QA

- Test Face-only, Sheet-only, mixed and no-reference Story cases
- Test Character Sheet Mode with Face Match only
- Test mode switching, removal, refresh and configuration import
- Test OpenAI/Gemini capability differences
- Test streaming and non-streaming OpenAI paths

## 16. Acceptance Criteria

- Character Sheet Mode no longer displays duplicate Character Sheet Reference controls
- Face Match remains available and is the only identity reference UI in Character Sheet Mode
- Story Mode accepts Face Reference, Character Sheet or both
- Story MVP allows references for one character only
- Both slots are clearly defined as the same character
- Hidden/incompatible references are not sent in generation payload
- Provider limits are detected before generation when possible
- Selected references are never silently dropped
- Client/server preserve correct role-specific behavior and lineage
- Mode switching, refresh and import/export do not restore stale incompatible references
- Existing Normal/Headshot reference behavior does not regress

## 17. Open Decision Before Implementation

Confirm whether the first Story implementation will:

1. Support one character per frame only (recommended), or
2. Introduce multiple named Character records immediately through a separate expanded requirement

Until changed by review, this requirement assumes option 1.

## 18. Implemented Structure Notes

- Character Sheet and Headshot modes expose Face Match while Style/Pose controls are hidden and disabled by mode policy.
- Story Mode uses the existing `normal` mode identifier and exposes a dedicated Character Sheet Reference upload with two same-character slots.
- Character references use independent client state, payload fields, queue resolution and provider inputs; they no longer share Style Match storage.
- Server normalizes mode-specific reference flags and strips the legacy `useReferenceImage` flag before prompt compilation.
- OpenAI and Gemini receive Character Sheet references before Face/Style references so character design remains the primary context.
- History records `referencedCharacterJobIds` separately and the lightbox lineage renders Character parents with a `C` badge.
- Character Sheet prompt compilation no longer emits the legacy generic reference instruction.
