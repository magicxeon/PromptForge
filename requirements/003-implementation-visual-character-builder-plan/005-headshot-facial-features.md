# Headshot - Facial Features

**Status:** Eyes, Eyebrows, and Nose Pilots Sliced and Runtime-Integrated  
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

## Eyes Pilot

The first Facial Features pilot is `Face > Eyes` using the shared visual-card picker contract from Requirement 003. It intentionally includes only visually shape-related options from the current `attributes/003-eyes.json` file:

| Row | Column | Visual option | Current attribute ID |
|---:|---:|---|---|
| 1 | 1 | Almond | `eyes.001` |
| 1 | 2 | Monolid | `eyes.002` |
| 1 | 3 | Double Eyelids | `eyes.003` |
| 1 | 4 | Round | `eyes.004` |
| 2 | 1 | Phoenix | `eyes.005` |
| 2 | 2 | Doe | `eyes.006` |
| 2 | 3 | Puppy | `eyes.007` |
| 2 | 4 | Hooded | `eyes.008` |

`Soft gaze`, `Direct eye contact`, `Looking at camera`, `Looking away` and `Bright eyes` are not part of the Eyes Shape visual set because they describe gaze, expression or eye quality rather than anatomy. They can become a separate gaze/expression control later.

## Eyes Pilot Integration

The approved first-pass eyes sheet has been stored at `visual-assets/character-builder/source-sets/headshot-v1/facial-features/eyes/eyes-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/facial-features/eyes/`.

The shared visual picker registry maps `Face > Eyes` to the generated eyes manifest, so the UI can render the visual-card options with the same interaction pattern as Face Shape. The runtime manifest index now includes both `face.shape` and `eyes.shape` entries.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/eyes/contact-sheet-r1.png`

## Eyebrows Pilot

The second Facial Features pilot is `Face > Eyebrows` using the same shared visual-card picker contract. It uses the existing eyebrow attribute inventory without adding a visual-only placeholder:

| Column | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Straight | `eyebrows.001` |
| 2 | Soft Arched | `eyebrows.002` |
| 3 | Natural Thick | `eyebrows.003` |
| 4 | Thin | `eyebrows.004` |
| 5 | Defined | `eyebrows.005` |
| 6 | Well-Groomed | `eyebrows.006` |
| 7 | Natural | `eyebrows.007` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/facial-features/eyebrows/eyebrows-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/facial-features/eyebrows/`.

The runtime manifest index now includes `face.shape`, `eyes.shape`, and `eyebrows.shape`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/eyebrows/contact-sheet-r1.png`

## Nose Pilot

The third Facial Features pilot is `Face > Nose` using the same shared visual-card picker contract. It uses the existing nose attribute inventory:

| Column | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Small Button | `nose.001` |
| 2 | High Bridge | `nose.002` |
| 3 | Delicate Narrow | `nose.003` |
| 4 | Soft Rounded Tip | `nose.004` |
| 5 | Straight | `nose.005` |
| 6 | Natural | `nose.006` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/facial-features/nose/nose-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/facial-features/nose/`.

The runtime manifest index now includes `face.shape`, `eyes.shape`, `eyebrows.shape`, and `nose.shape`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/nose/contact-sheet-r1.png`

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

