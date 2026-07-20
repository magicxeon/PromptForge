# Headshot - Hair and Color

**Status:** Hair Length, Presentation-Aware Cut / Style, Texture, Parting / Fringe, and Color Pilots Integrated  
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

## Hair Length Pilot

The first Hair pilot is `Hair > Length` using the shared visual-card picker contract. It uses the existing length attribute inventory from `attributes/008-hair.json`:

| Column | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Buzz Cut | `hair_001` |
| 2 | Short Hair | `hair_002` |
| 3 | Long Hair | `hair_003` |
| 4 | Extra Long Hair | `hair_004` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/hair/length/hair-length-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/hair/length/`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/length/contact-sheet-r1.png`

Hair length intentionally does not decide cut/style, texture, finish, parting/fringe, or color. Those remain separate semantic axes.

## Hair Cut / Style Pilot

The second Hair pilot is `Hair > Cut / Style` using the shared visual-card picker contract. It uses reviewed cut/style options from `attributes/008-hair.json` and filters the visible set by selected character presentation for MVP.

| Row | Column | Visual option | Current attribute ID |
|---:|---:|---|---|
| 1 | 1 | Ponytail | `hair_008` |
| 1 | 2 | Messy Bun | `hair_009` |
| 1 | 3 | French Braid | `hair_010` |
| 1 | 4 | Layered Hush Cut | `hair_022` |
| 2 | 1 | Long Loose Waves | `hair_023` |
| 2 | 2 | Side-swept Hair | `hair_024` |
| 2 | 3 | Wet Look Hair | `hair_025` |
| 2 | 4 | Wolf Cut | `hair_026` |
| 3 | 1 | Crew Cut | `hair_029` |
| 3 | 2 | Side Part | `hair_030` |
| 3 | 3 | Undercut | `hair_031` |
| 3 | 4 | Pompadour | `hair_032` |
| 4 | 1 | Quiff | `hair_033` |
| 4 | 2 | Textured Crop | `hair_034` |
| 4 | 3 | Caesar Cut | `hair_035` |
| 4 | 4 | Short Curly Crop | `hair_036` |

Presentation filtering for MVP:

- Female character selection shows the feminine/unisex first-pass set: `hair_008`, `hair_009`, `hair_010`, `hair_022`, `hair_023`, `hair_024`, `hair_025`, `hair_026`.
- Male character selection shows the masculine first-pass set only: `hair_029`, `hair_030`, `hair_031`, `hair_032`, `hair_033`, `hair_034`, `hair_035`, `hair_036`.
- Unspecified or custom gender selection may show all cut/style options until the character presentation contract is formalized.

`Straight Hair`, `Wavy Hair`, and `Curly Hair` are not part of this visual set because they describe hair texture rather than cut/style. They should be handled by the `Hair > Texture` control.

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/hair/cut-style/hair-cut-style-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/hair/cut-style/`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/cut-style/contact-sheet-r1.png`

Implementation note: the UI field-to-subcategory filter must map `Cut / Style` to `Style`, `Texture` to `Hair Texture`, and `Parting / Fringe` to `Bangs` so hair axes do not fall back to the full hair catalog.

## Hair Texture Pilot

The third Hair pilot is `Hair > Texture` using the shared visual-card picker contract. It uses the existing texture attributes from `attributes/008-hair.json`:

| Column | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Silky Smooth Hair | `hair.text_01` |
| 2 | Coarse & Thick | `hair.text_02` |
| 3 | Soft Glossy Waves | `hair.text_03` |
| 4 | Frizzy & Voluminous | `hair.text_04` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/hair/texture/hair-texture-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/hair/texture/`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/texture/contact-sheet-r1.png`

Texture controls should communicate strand density, smoothness, wave pattern, gloss, and flyaways. They must not replace the separate `Hair > Cut / Style` or `Hair > Length` controls.

## Hair Parting / Fringe Pilot

The fourth Hair pilot is `Hair > Parting / Fringe` using the shared visual-card picker contract. It combines parting and bangs/fringe options because both answer how hair sits around the forehead:

| Row | Column | Visual option | Current attribute ID |
|---:|---:|---|---|
| 1 | 1 | Center Part | `hair_037` |
| 1 | 2 | Side Parting | `hair_038` |
| 1 | 3 | Swept Back | `hair_039` |
| 2 | 1 | Curtain Bangs | `hair_011` |
| 2 | 2 | Blunt Bangs | `hair_012` |
| 2 | 3 | See-through Bangs | `hair_027` |

The source sheet is stored at `visual-assets/character-builder/source-sets/headshot-v1/hair/parting-fringe/hair-parting-fringe-set-r1.png` and sliced into runtime assets under `client/assets/visual-character-builder/headshot-v1/hair/parting-fringe/`.

Review contact sheet:

- `visual-assets/character-builder/reviews/headshot-v1/parting-fringe/contact-sheet-r1.png`

Parting / Fringe should stay independent from `Hair > Cut / Style`, `Hair > Length`, and `Hair > Texture`. If a future style option strongly implies bangs, prefer a compatibility rule rather than duplicating the visual option.

## Hair Color Pilot

The fifth Hair pilot is `Hair > Color` using a swatch-card picker rather than raster source sheets. It uses the existing color attributes from `attributes/008-hair.json`:

| Swatch | Visual option | Current attribute ID |
|---:|---|---|
| 1 | Jet Black | `hair_013` |
| 2 | Dark Brown | `hair_014` |
| 3 | Platinum Blonde | `hair_015` |
| 4 | Copper | `hair_016` |
| 5 | Reddish-orange | `hair_021` |
| 6 | Reddish Brown | `hair_040` |
| 7 | Dark Blond | `hair_041` |
| 8 | Reddish Mahogany | `hair_042` |
| 9 | Burgundy | `hair_043` |
| 10 | Red Wine | `hair_044` |
| 11 | Golden Blond | `hair_045` |
| 12 | Golden Brown | `hair_046` |
| 13 | Chocolate Brown | `hair_047` |
| 14 | Ash Blond | `hair_048` |
| 15 | Grey | `hair_049` |
| 16 | Ash Green Blond | `hair_050` |
| 17 | Intense Blue | `hair_051` |

Color swatches are defined directly in the shared visual control registry because color is better represented by CSS swatches than generated bitmap assets. The existing custom color picker remains available for advanced base/highlight color overrides.

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

