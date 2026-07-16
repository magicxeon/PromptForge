# Headshot - Skin, Appearance and Expression

**Status:** Proposed  
**Sequence:** 007  
**Depends on:** 001-006

## Objective

เพิ่มรายละเอียดผิว การแต่งหน้า และอารมณ์อย่างเป็นกลาง ปลอดภัย และไม่ทำให้ผู้ใช้ต้องเข้าใจศัพท์ beauty photography

## MVP Fields

- Skin tone family
- Skin texture/finish
- Freckles or selected natural details
- Makeup level
- Expression
- Gaze intent when required

## Product Rules

- Skin tone is not inferred from ethnicity or visual heritage.
- Labels must not rank skin tone, texture or age by quality.
- Natural details should not be presented as defects.
- Makeup level controls makeup, not age, ethnicity or facial anatomy.
- Expression controls emotion only and must not alter head pose.
- Default expression is neutral-friendly and provider-safe.

## Control Strategy

- Skin tone: reviewed inclusive swatches with plain-language labels
- Texture/finish: small visual or segmented set
- Freckles/details: optional visual cards or toggles
- Makeup level: segmented control or labeled slider
- Expression: Visual Option cards using one fixed identity

## Asset Rules

- Expression assets keep anatomy, hairstyle, camera and lighting fixed.
- Skin texture comparisons require consistent close crop and exposure.
- Swatch colors are UI guidance, not a claim of exact generated output.
- CSS recoloring must not be used to simulate photographic skin examples.

## Acceptance Criteria

- Users can choose appearance without value-laden language.
- Expression does not introduce pose or scene instructions.
- The UI clearly communicates that provider output may vary from a swatch.
- Prompt compiler emits compatible appearance and expression fragments in a deterministic order.

