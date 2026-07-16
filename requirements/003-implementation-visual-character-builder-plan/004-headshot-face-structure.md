# Headshot - Face Structure Pilot

**Status:** Proposed - First Visual Pilot  
**Sequence:** 004  
**Depends on:** 001-003

## Objective

ใช้ Face Structure เป็น pilot เพื่ออนุมัติ visual language, crop, asset pipeline และ shared picker ก่อนผลิตภาพจำนวนมากใน category อื่น

## MVP Fields

- Face Shape
- Jawline
- Chin
- Cheek Structure

Final option names and counts must come from the 001 inventory. Initial pilot should use only three to five visually distinct Face Shape options.

## Visual Isolation Rules

- Use the same neutral adult subject identity across one field.
- Keep hairstyle pulled away from the face and unchanged.
- Keep expression neutral, head level and camera front-facing.
- Keep skin, makeup, light, lens, background and crop unchanged.
- Change only the geometry named by the option.
- Avoid beauty ranking such as ideal, perfect or unattractive.

## Pilot Deliverables

- Face Shape manifest
- Master Visual Prompt
- Per-option `visualDifference` prompts
- Three-to-five prototype assets
- Contact sheet for semantic comparison
- Working visual picker connected to semantic IDs
- Written review notes and approved visual style version

## Review Questions

- Can users distinguish options without reading specialist terms?
- Does hairstyle obscure the outer face contour?
- Did the generator unintentionally change age, ethnicity, expression or makeup?
- Is the difference strong enough to understand but not caricatured?
- Does thumbnail crop remain clear at the actual UI size?

## Gate

Do not begin Facial Features or mass Face Structure asset production until the product owner approves:

- subject and representation
- visual style
- crop and background
- difference strength
- UI card size and selected state

## Acceptance Criteria

- Each approved image demonstrates one face-structure axis.
- Prompt compilation uses the selected semantic option, not information inferred from the image.
- Missing pilot assets fall back to a selectable text state.
- The approved pattern can be reused by all photographic Headshot Visual Options.

