# Headshot - Face Structure Pilot

**Status:** Pilot Asset and Visual Picker Scaffolded  
**Sequence:** 004  
**Depends on:** 001-003

## Objective

ใช้ Face Structure เป็น implementation pilot ของ visual language, set slicing, override pipeline และ shared picker ที่อนุมัติไว้ใน Requirement 002 ก่อนสร้าง category set อื่น

## MVP Fields

- Face Shape
- Jawline
- Chin
- Cheek Structure

Face Shape pilot uses the approved eight-option 4x2 order from Requirement 002: Oval, Square, Round, Diamond, Rectangular, Heart, Inverted Triangular and Long.

## Visual Isolation Rules

- Use one consistent front-facing head/neck line-art template across the field.
- Keep ear position, neck, line weight, scale, baseline, padding and background treatment unchanged.
- Change only the outer face contour and jaw/chin geometry named by the option.
- Keep every contour anatomically plausible; never draw category names as literal geometric symbols.
- Avoid beauty ranking such as ideal, perfect or unattractive.

## Pilot Deliverables

- Face Shape set manifest and explicit slice bounds
- Authoring folder structure and slicing command
- Master Illustrated-set Prompt and per-option anatomical meanings
- One approved 4x2 source set plus optional per-item overrides
- Eight normalized transparent runtime slices and derivatives
- Reconstructed contact sheet for semantic comparison
- Working visual picker connected to semantic IDs through legacy-compatible attribute IDs
- Written review notes and approved visual style version

## Review Questions

- Can users distinguish options without reading specialist terms?
- Are ears, neck, scale and alignment consistent across all eight slices?
- Do Heart, Diamond and Inverted Triangular remain believable human contours rather than literal symbols?
- Is the difference strong enough to understand but not caricatured?
- Does each contour remain clear at the 128 x 128 runtime thumbnail size?

## Gate

Do not begin Facial Features or mass Face Structure asset production until the product owner approves:

- line-art style and anatomical plausibility
- visual style
- crop and background
- difference strength
- UI card size and selected state

## Acceptance Criteria

- Each approved slice demonstrates one face-shape option while retaining the shared line-art template.
- Prompt compilation uses the selected semantic option, not information inferred from the image.
- Missing pilot assets fall back to a selectable text state.
- The approved set pattern can be reused by other illustrated Headshot Visual Options.
