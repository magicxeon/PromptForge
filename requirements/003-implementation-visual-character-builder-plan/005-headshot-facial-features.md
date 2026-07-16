# Headshot - Facial Features

**Status:** Proposed  
**Sequence:** 005  
**Depends on:** Approved Face Structure pilot

## Objective

เพิ่มการเลือกส่วนประกอบใบหน้าที่เข้าใจง่าย โดยคง identity และภาพมาตรฐานเดียวกันเพื่อให้ผู้ใช้เปรียบเทียบผลของแต่ละ option ได้ตรงประเด็น

## MVP Fields

- Eye Shape
- Eyelid
- Eyebrow Shape
- Nose Shape
- Lip Shape

Eye color is a swatch and must not require a duplicate image set unless the chosen visual style cannot communicate it accurately.

## Scope Rules

- One field controls one anatomical axis.
- Size and shape must not be combined unless the provider cannot represent them independently.
- Eye options must not silently change makeup, gaze or expression.
- Lip options must not silently add lipstick or a smile.
- Brow options must not embed emotional expression.
- Avoid medical terminology unless no plain-language equivalent exists.

## Asset Production

Each field uses the approved Headshot visual style but may adjust focal crop consistently for that entire field. A field-specific crop must be declared in its manifest.

Production proceeds one field at a time:

1. approve option inventory
2. prepare Master Visual Prompt inheritance
3. produce three representative prototypes
4. review semantic isolation
5. complete the field
6. validate and integrate

## UI Requirements

- Plain-language label appears first.
- Optional detail explains the visible effect without prompt jargon.
- Selected features appear in a character summary grouped by field.
- Resetting one field does not reset other facial selections.

## Acceptance Criteria

- Options remain distinguishable at thumbnail size.
- Assets within each field keep all unrelated visual properties fixed.
- Every selected option maps to exactly one semantic ID and prompt value.
- No field requires custom UI code beyond the shared controls.

