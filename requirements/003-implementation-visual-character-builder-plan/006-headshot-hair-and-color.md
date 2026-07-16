# Headshot - Hair and Color

**Status:** Proposed  
**Sequence:** 006  
**Depends on:** 001-003 and approved Headshot visual style

## Objective

ให้ผู้ใช้ประกอบทรงผมจากแกนที่เข้าใจง่ายและเห็นผลชัด โดยหลีกเลี่ยงรายการทรงผมซ้ำซ้อนจำนวนมาก

## MVP Fields

- Hair Length
- Hair Style / Cut
- Hair Texture
- Parting / Fringe
- Base Hair Color
- Optional Highlight Color

Finish, elaborate updo, trend libraries and fashion-specific hair direction are deferred unless required by a reviewed preset.

## Composition Rules

- Length, style, texture and parting are separate semantic axes.
- Compatibility rules disable combinations that cannot coexist meaningfully.
- Presets may select multiple hair fields but do not create duplicate option definitions.
- Hair color uses swatches and provider-safe color descriptions.
- Custom hex color is optional advanced behavior; UI must also expose a readable color name/family.

## Visual Asset Strategy

- Hair form fields use consistent photographic or illustrated Visual Options.
- Keep face identity, expression, camera, light and background fixed.
- Use a crop that shows the complete hair silhouette for every option in the same field.
- Do not generate every hairstyle in every color for MVP.
- Recolorable silhouettes may explain abstract shape, but final photographic meaning must not rely on CSS recoloring.

## UI Requirements

- Hair form selection appears separately from color selection.
- Incompatible options explain the conflict in plain language.
- A small set of reviewed presets may provide quick starts.
- The summary displays the combined hair result without exposing raw prompt fragments by default.

## Acceptance Criteria

- Users can change color without changing hairstyle selection.
- Asset count grows by shape options, not by the Cartesian product of shape and color.
- Saved configurations preserve separate hair axes.
- Prompt output contains no conflicting style, texture or parting instructions.

