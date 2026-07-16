# Headshot - Guided Output and Generation

**Status:** Proposed  
**Sequence:** 008  
**Depends on:** 004-007

## Objective

แปลง character selections เป็น headshot ที่พร้อม generate โดยใช้ guided presets ซ่อนรายละเอียด camera, lens และ lighting ที่ไม่จำเป็นจากผู้ใช้ทั่วไป

## Guided Output Controls

MVP exposes only:

- background family
- output mood or use case
- aspect ratio
- provider/model
- provider-supported output resolution

Technical camera, lens, lighting and quality instructions come from reviewed Headshot recipes. Advanced Studio may expose them separately but cannot silently conflict with the guided recipe.

## Headshot Recipes

Initial recipe candidates:

- Clean Identity
- Commercial Beauty
- Soft Editorial
- Professional Profile

Each recipe defines defaults for framing, camera perspective, lighting, background behavior and quality direction. Recipe IDs are saved separately from character anatomy selections.

## Review Screen

Before generation, show:

- visual summary by section
- plain-language character description
- output recipe and background
- provider/model and estimated credit cost
- reference images that will be sent
- validation warnings and automatic compatibility adjustments

Raw compiled prompt is available as an advanced inspection view, not the primary editing method.

## Generation Contract

- Client sends semantic selections and selected recipe ID.
- Authoritative server compilation validates IDs and compatibility.
- Provider adapter receives the compiled prompt and provider-specific options.
- Generated history stores configuration snapshot, recipe version, provider and model.
- Provider/model fallback must not mutate the saved character definition.

## Acceptance Criteria

- A user can complete generation without typing prompt text.
- Technical defaults produce a complete prompt pattern.
- Unsupported provider resolution receives a valid model-specific fallback or clear correction.
- History can reconstruct the visible selections used for the result.

