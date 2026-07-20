# Headshot - Skin, Appearance and Expression

**Status:** Skin Tone, Skin Texture, Makeup, Freckles, and Expression Pilots Integrated  
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

## Makeup Pilot

The third Skin pilot is `Skin > Makeup` using the shared swatch-card picker contract with abstract makeup cues. It uses the existing makeup attributes from `attributes/007-skin.json`:

| Swatch | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Natural Look (No Makeup) | `skin.makeup_01` |
| 2 | Soft K-Beauty Makeup | `skin.makeup_02` |
| 3 | Editorial Bold Red Lips | `skin.makeup_03` |
| 4 | Gilded Shimmer Eyeshadow | `skin.makeup_04` |

Makeup controls describe styling intensity and accents only. They must not alter age, ethnicity, facial anatomy, skin tone, or head pose.

## Freckles Pilot

The fourth Skin pilot is `Skin > Freckles` using the shared swatch-card picker contract with abstract natural-detail cues. It uses the existing freckles attributes from `attributes/007-skin.json`:

| Swatch | Visual option | Current attribute ID |
|---:|---|---|
| 1 | No Freckles | `skin.freckles_01` |
| 2 | Subtle Light Freckles | `skin.freckles_02` |
| 3 | Prominent Youthful Freckles | `skin.freckles_03` |

Freckles are presented as optional natural details, not blemishes or defects. The UI should communicate density only: none, subtle, and prominent.

## Expression Pilot

The fifth pilot is `Face > Expression` using the shared visual-card picker contract. It uses a generic bald face-outline so users can compare mood without inheriting a gender, hairstyle, beard, makeup, or identity cue from the icon:

| Row | Column | Visual option | Current attribute ID |
|---:|---:|---|---|
| 1 | 1 | Subtle Micro-Expression | `expression.001` |
| 1 | 2 | Slightly Thoughtful | `expression.002` |
| 1 | 3 | Soft Friendly Smile | `expression.004` |
| 2 | 1 | Candid Gentle Laugh | `expression.003` |
| 2 | 2 | Playful Mild Smirk | `expression.008` |
| 2 | 3 | Reflective Mood | `expression.010` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/expression/face-expression/face-expression-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/expression/face-expression/`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/face-expression/contact-sheet-r1.png`

Expression controls emotion only. Options that imply head tilt or a changed camera angle are excluded from the first visual pilot. Expression icons must stay generic so they work for female, male, and future presentation variants.

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

