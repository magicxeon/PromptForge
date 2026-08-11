# Popular Outfit And Male Facial Hair Visual Expansion

**Status:** Implemented; automated and product visual validation pending  
**Owner:** Visual Character Builder  
**Related:** `003-ui-shared-visual-controls-and-interaction.md`,
`005-headshot-facial-features.md`,
`010-004-001-outfit-base-mvp-options.md`,
`010-006-visual-assets-and-manifest-contract.md`,
`010-011-modular-clothing-architecture-and-scope.md`  
**Runtime consumers:** Face Creator, Character Sheet and Scene Builder guided
attributes where reference authority permits editing

## 1. Goal

Expand the Visual Character Builder with commercially useful choices that a
non-expert can recognize and select without writing a prompt:

1. five additional popular male Outfit Base options;
2. five additional popular female Outfit Base options; and
3. five distinct adult male Facial Hair options.

The additions must look current, polished and suitable for the professional
Fashion Scene recipes. They extend the canonical Attribute and visual-manifest
systems; they must not create a component-specific option list or revive the
deprecated monolithic `Outfit Preset` contract.

## 2. Canonical Ownership

| Concern | Canonical owner |
|---|---|
| Outfit and Facial Hair semantic IDs and prompt phrases | Attribute catalogs under `attributes/` |
| Field ordering, visibility and control type | `attributes/spec/ui-schema.json` |
| Authoring source sheets and review evidence | `visual-assets/character-builder/` |
| Runtime thumbnails and manifests | `client/assets/visual-character-builder/` |
| Reusable visual-card rendering | existing React Visual Option components |
| Final prompt ordering and conflict handling | canonical Generation prompt compiler |

No new provider call, generation workflow, Credit path or feature-local visual
picker is introduced.

## 3. Popular Outfit Expansion

### 3.1 Male options

| Attribute ID | Customer label | Canonical prompt meaning |
|---|---|---|
| `outfit.base.male.chore_jacket_chinos` | Chore Jacket and Chinos | brand-free lightweight chore jacket over a plain crew-neck top with relaxed straight chinos |
| `outfit.base.male.overshirt_pleated_trousers` | Overshirt and Pleated Trousers | clean relaxed overshirt over a fine-knit or plain top with softly pleated straight trousers |
| `outfit.base.male.minimal_bomber_tapered_pants` | Minimal Bomber and Tapered Pants | unbranded minimal bomber jacket over a plain top with clean tapered pants |
| `outfit.base.male.denim_jacket_wide_trousers` | Denim Jacket and Wide Trousers | simple denim jacket over a plain crew-neck top with relaxed wide-leg trousers |
| `outfit.base.male.camp_collar_tailored_shorts` | Camp-collar Shirt and Tailored Shorts | relaxed camp-collar short-sleeve shirt with clean knee-length tailored shorts |

### 3.2 Female options

| Attribute ID | Customer label | Canonical prompt meaning |
|---|---|---|
| `outfit.base.female.square_neck_knit_tailored_trousers` | Square-neck Knit and Tailored Trousers | modest fitted square-neck knit top with high-waist straight tailored trousers |
| `outfit.base.female.oversized_blazer_tailored_shorts` | Oversized Blazer and Tailored Shorts | relaxed unbranded blazer over a fitted plain top with clean mid-thigh tailored shorts |
| `outfit.base.female.cropped_cardigan_bias_midi_skirt` | Cropped Cardigan and Midi Skirt | waist-length knit cardigan with a clean bias-cut midi skirt |
| `outfit.base.female.denim_jacket_wide_trousers` | Denim Jacket and Wide Trousers | simple denim jacket over a fitted plain top with high-waist wide-leg trousers |
| `outfit.base.female.sleeveless_knit_pleated_midi_skirt` | Sleeveless Knit and Pleated Midi Skirt | modest sleeveless high-neck knit top with a softly pleated midi skirt |

### 3.3 Outfit rules

- These are `Outfit Base` selections, not immutable complete looks.
- Primary/secondary color, pattern, material and surface controls remain
  independently editable when compatible.
- Uploaded Outfit Front/Back references retain higher authority and override
  the selected Outfit Base through the existing reference contract.
- Prompt phrases describe garment construction and silhouette without fixed
  color, brand, logo, copyrighted design, accessory, footwear or environment.
- The visual asset may use restrained neutral colors for readability, but those
  colors must not silently enter the prompt.
- Every option must remain modest, opaque, anatomically plausible and usable in
  front, side and back Character Sheet views.
- Existing Outfit Base IDs, saved drafts and Template snapshots remain valid.

## 4. Adult Male Facial Hair

### 4.1 New field

Add `Facial Hair` to the Face section after `Lips`. It uses the shared visual
card grid and is visible only when the active Character Presentation is male
and the derived audience class is adult.

`None / Clean-shaven` is a reset state and does not count as one of the five
new styles. Switching to a non-applicable presentation or minor age clears a
stored Facial Hair selection rather than retaining a hidden prompt value.

### 4.2 Options

| Attribute ID | Customer label | Canonical prompt meaning |
|---|---|---|
| `facial_hair.designer_stubble` | Designer Stubble | even short designer stubble following the natural jaw and upper-lip growth |
| `facial_hair.chevron_moustache` | Chevron Moustache | groomed medium-width chevron moustache with clean cheeks and chin |
| `facial_hair.trimmed_goatee` | Trimmed Goatee | neatly trimmed connected moustache and chin goatee with clean cheek lines |
| `facial_hair.short_boxed_beard` | Short Boxed Beard | short groomed boxed beard with a defined natural cheek and neckline |
| `facial_hair.full_groomed_beard` | Full Groomed Beard | full but controlled groomed beard with natural density and a clean silhouette |

### 4.3 Facial Hair rules

- Facial Hair changes hair growth only; it must not alter face shape, jaw
  anatomy, age, ethnicity, skin tone, expression or hairstyle.
- Color follows the selected base hair color by default. A future beard-color
  override may be added without changing these IDs.
- Thumbnails use the same neutral adult male face, crop, angle and expression;
  only facial hair changes between cards.
- Each style must remain distinct at compact card size and must not rely on its
  label to communicate the difference.
- Face Reference and Character Reference authority disables Facial Hair when
  the reference owns face identity, unless a future explicit override policy
  allows it.
- Existing characters without the field compile exactly as clean-shaven/no
  facial-hair instruction; no migration writes are required.

## 5. Visual Asset Production Contract

Create three reviewed source sheets:

```text
visual-assets/character-builder/source-sets/character-sheet-v1/outfit/
  outfit-base-male/outfit-base-male-popular-r2.png
  outfit-base-female/outfit-base-female-popular-r2.png

visual-assets/character-builder/source-sets/headshot-v1/facial-features/facial-hair/
  facial-hair-set-r1-male.png
```

Recommended sheet layouts:

- male outfits: one row of five equal full-outfit cells;
- female outfits: one row of five equal full-outfit cells;
- Facial Hair: one row of five equal close face cells.

Authoring manifests belong under the existing Character Sheet and Headshot
manifest families. Runtime publication targets are:

```text
client/assets/visual-character-builder/character-sheet-v1/clothing/outfit-base-male/
client/assets/visual-character-builder/character-sheet-v1/clothing/outfit-base-female/
client/assets/visual-character-builder/headshot-v1/facial-features/facial-hair/
```

Outfit assets follow the current illustrated/mask visual language and preserve
the current card focal point. Facial Hair assets follow the Headshot
monochrome-mask language with enough line weight and fill to remain readable at
74x74 pixels. Runtime assets publish optimized thumbnails and only the preview
size already required by the current UI; source sheets and contact sheets stay
outside the browser runtime.

## 6. UI And Responsive Behavior

- Reuse the current wrapping Visual Option grid; no carousel.
- Options continue onto new rows so all choices are visible in one expanded
  category.
- Existing 10px form/button radius and theme tokens apply.
- Selected, hover, keyboard focus, disabled, loading and missing-asset fallback
  states match other Visual Character categories.
- Labels must fit at desktop and mobile widths without changing card geometry.
- Filtering changes the visible applicable options, never the underlying
  canonical Attribute IDs.
- Scene Builder consumes the same Outfit Base catalog and visual manifests as
  Character Sheet. When a Character handoff does not carry a presentation
  selection, Scene Builder shows the combined female and male outfit visuals;
  selecting a presentation immediately filters the cards to that presentation.

## 7. Implementation Sequence

1. Add and validate semantic Attribute records and localized labels.
2. Add `Facial Hair` to UI schema, prompt category mapping and applicability
   policy.
3. Add authoring manifest templates and source-sheet prompt briefs.
4. Generate the three source sheets and review contact sheets.
5. After visual approval, slice and publish runtime assets/manifests.
6. Register manifests in the existing indexes without adding component code.
7. Validate save/restore, gender/age transitions, reference lockout and final
   prompt output in Face Creator, Character Sheet and Scene Builder.

Attribute and text fallback may be implemented before assets are approved, but
runtime manifest entries must not point to missing files.

## 8. Validation And Acceptance

- Exactly five new male and five new female Outfit Base IDs are selectable.
- All ten outfits are visually distinct from the existing six-per-presentation
  catalog and compile their intended garment silhouette.
- Exactly five adult male Facial Hair styles plus a clean-shaven reset are
  available under the applicability rules.
- Female and minor flows do not display or compile stale Facial Hair.
- Visual cards wrap consistently and no label or image is clipped.
- Every runtime manifest item maps to an enabled canonical Attribute ID.
- Missing visual assets fall back to selectable text without blocking
  generation.
- Outfit references and Character/Face reference authority continue to win over
  conflicting guided controls.
- Attribute bundle, visual manifest, prompt policy, React component and
  TypeScript validation pass before release.

## 9. Product Review Checkpoint

Before implementation, Product should approve:

1. the ten outfit silhouettes and customer-facing names;
2. whether the Facial Hair set should remain adult-male-only for MVP;
3. the three source-sheet visual direction previews; and
4. whether neutral illustrated assets are sufficient or a second photorealistic
   preview family is worth its runtime and maintenance cost.

The owner may generate the three source sheets from the prompt briefs after the
semantic inventory is approved. Do not generate or slice final assets before
this checkpoint, because changing one Outfit ID or silhouette afterward would
require repeating source, crop, review and manifest work.

## 10. Implementation Record

Implemented on 2026-08-09:

- added ten canonical Outfit Base records and five Facial Hair records;
- added adult-male applicability, stale-selection cleanup and server-side
  prompt enforcement;
- extended the visual slicer contract so one field manifest can retain its
  original source sheet while adding reviewed items from a later source sheet;
- generated and published three source sheets, 15 previews and 15 thumbnails;
- registered Facial Hair in the Headshot runtime manifest index; and
- added focused prompt/applicability/visual-registry test coverage.
- exposed the shared Character Sheet Outfit Base visuals in Scene Builder,
  including the no-presentation Character Reference fallback.

Manual Product validation remains required for silhouette preference, compact
thumbnail readability and responsive card wrapping before this requirement is
marked complete.
