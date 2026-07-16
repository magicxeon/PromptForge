# Foundation - Domain and Attribute Contract

**Status:** Proposed  
**Sequence:** 001  
**Depends on:** Existing attribute schema and prompt compiler

## Objective

กำหนด semantic contract กลางก่อนทำรูปหรือ UI เพื่อให้ Visual Option, saved configuration และ prompt compiler อ้าง option เดียวกันตลอดอายุระบบ

## Scope

- Audit attributes ที่เกี่ยวกับ Headshot
- แบ่ง section และ field responsibility ให้หนึ่ง field ควบคุมหนึ่ง visual axis
- กำหนด stable `attributeId` และ `optionId`
- แยก user-facing label ออกจาก provider prompt value
- กำหนด single-select, multi-select, optional และ required behavior
- กำหนด compatibility และ conflict ระหว่าง options
- ระบุ basic/advanced visibility
- รองรับ bilingual labels และ descriptions

## Headshot Section Boundary

| Section | Owns | Must not own |
|---|---|---|
| Foundation | presentation, age range, visual heritage | face geometry, beauty judgment |
| Face Structure | overall shape, jaw, chin, cheek structure | eyes, nose, lips, camera |
| Facial Features | eyes, brows, nose, lips | makeup, expression, lighting |
| Hair | length, cut, texture, parting, color | wardrobe, wind/scene |
| Appearance | skin tone/texture, freckles, makeup level | ethnicity inference |
| Expression | facial expression and gaze intent | pose, story |
| Guided Output | background and reviewed headshot recipe | character anatomy |

## Required Data Contract

Each option must support:

```json
{
  "id": "face.shape.oval",
  "fieldId": "face.shape",
  "label": { "en": "Oval", "th": "หน้ารูปไข่" },
  "description": { "en": "...", "th": "..." },
  "prompt": { "default": "balanced oval face shape" },
  "tags": ["balanced", "soft-contour"],
  "enabled": true
}
```

Visual filenames and paths must not be stored as semantic IDs.

## Migration Rules

- Preserve an existing ID when meaning remains unchanged.
- Deprecated values require `replacementId` when a safe mapping exists.
- Saved configurations with unknown IDs must show a recoverable warning.
- Client preview and server prompt compiler must resolve the same option IDs.
- Legacy dropdown rendering remains available until each visual section is accepted.

## Deliverables

- Headshot attribute inventory and decision matrix
- Approved section/field list
- ID naming convention
- Compatibility and deprecation rules
- Estimated option and asset count per field

## Acceptance Criteria

- Every MVP option belongs to exactly one field and section.
- No option embeds unrelated camera, lighting, scene or beauty instructions.
- Labels, prompt values and asset references can change independently without breaking saved configurations.
- New UI metadata can be ignored safely by existing rendering code.

