# Headshot - Skin, Appearance and Expression

**Status:** Skin Tone and Skin Texture Swatch Pilots Integrated  
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

## Skin Tone Pilot

The first Skin pilot is `Skin > Tone` using the shared swatch-card picker contract. It uses the existing tone attributes from `attributes/007-skin.json`:

| Swatch | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Fair skin | `skin.tone_01` |
| 2 | Porcelain skin | `skin.tone_02` |
| 3 | Honey skin | `skin.tone_03` |
| 4 | Warm Olive skin | `skin.tone_04` |
| 5 | Rosy Fair skin | `skin.tone_05` |
| 6 | Translucent Glass skin | `skin.tone_06` |
| 7 | Milky White skin | `skin.tone_07` |
| 8 | Ivory White skin | `skin.tone_08` |
| 9 | Aura Glowing White skin | `skin.tone_09` |

Tone swatches are UI guidance only. They are not exact provider output guarantees and must not be inferred from ethnicity or visual heritage.

## Skin Texture Pilot

The second Skin pilot is `Skin > Skin Texture` using the shared swatch-card picker contract with abstract texture patterns. It uses the existing skin texture attributes from `attributes/007-skin.json`:

| Swatch | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Natural Skin Texture | `skin.text_01` |
| 2 | Dewy Complexion | `skin.text_02` |
| 3 | Healthy Complexion | `skin.text_03` |
| 4 | Even Skin Tone | `skin.text_04` |
| 5 | Soft Smooth Skin | `skin.text_05` |
| 6 | Radiant Smooth Skin (under flash) | `skin.text_06` |

Texture swatches are abstract UI cues, not photographic skin samples. They should communicate finish/texture differences without implying that one skin texture is better than another.

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

