# Foundation - Domain and Attribute Contract

**Status:** Approved - Ready for Requirement 002  
**Sequence:** 001  
**Depends on:** Existing attribute schema, UI schema, presets, persistence and prompt compiler  
**Audited:** 2026-07-16

## 1. Objective

กำหนด semantic contract กลางก่อนทำ visual assets หรือ UI เพื่อให้ Visual Option, dropdown fallback, saved configuration, presets และ prompt compiler อ้าง field/option เดียวกันตลอดอายุระบบ

Requirement นี้ยังไม่แก้ attribute JSON หรือ application code แต่เป็น source of truth สำหรับ migration และ implementation ในขั้นถัดไป

## 2. Confirmed Product Decisions

- MVP เป็นภาพคนจริงแบบ photorealistic
- รองรับผู้ใหญ่และผู้เยาว์ตั้งแต่ Child ขึ้นไป
- Style เช่น Anime, illustration และ fantasy เป็น filter ภายหลัง ไม่รวมอยู่ใน anatomy taxonomy
- ใช้ Visual Heritage เพื่อควบคุมลักษณะเชื้อสาย/ภูมิภาค โดยแยกจาก nationality และ skin tone
- ตัด, merge หรือย้าย attribute เดิมได้
- ค่าเดิมที่ยังมีประโยชน์หรือยัง migrate ไม่ได้สามารถอยู่ใน legacy dropdown ได้
- ไม่บังคับให้ทุก field เป็น Visual Option; เลือก control ตามความเหมาะสมของข้อมูล

## 3. Audit Sources

ตรวจระบบปัจจุบันจาก:

- `attributes/001-character.json` ถึง `attributes/008-hair.json`
- `attributes/019-expression.json`
- `attributes/spec/ui-schema.json`
- `attributes/spec/attribute-library.json`
- `attributes/spec/presets.json`
- `attributes/spec/prompt-order.json`
- `client/app.js`
- `server/promptCompiler.js`

## 4. Current Inventory

| Source | Current count | Current responsibility | Main issue |
|---|---:|---|---|
| Character | 39 | Gender 4, Age 8, Ethnicity 17, Beauty 10 | Child is under Gender; Teen spans minor/adult; Beauty mixes many axes |
| Face | 17 | Face shape plus jaw, cheek, age, expression and reference lock | No subcategory; unrelated values can appear as Face Shape |
| Eyes | 13 | Shape, eyelid, gaze and eye appearance | Anatomy and expression/gaze are mixed |
| Eyebrows | 7 | Shape, density and grooming | Multiple axes in one field |
| Nose | 6 | Composite nose forms | Usable as visual presets after wording review |
| Lips | 9 | Lip shape plus smile/expression | Anatomy and expression are mixed |
| Skin | 22 | Tone 9, texture 6, makeup 4, freckles 3 | Tone set is heavily fair/beauty biased; finish and lighting are mixed into tone/texture |
| Hair | 32 actual | Length 4, Style 11, Bangs 3, Color 5, Finish 5, Texture 4 | Metadata declares 20; field names differ from UI schema; some values overlap |
| Expression | 20 | Mood and micro-expression | Too many similar choices for first-time users |

Additional contract issues:

- Client and server duplicate `FIELD_TO_CATEGORY_MAP`, allowing drift.
- Saved/exported schema version 4 uses display field names such as `Face Shape` as selection keys.
- Presets store both option ID and prompt value; some are inconsistent with the current library. Example: preset `Smile` may use `lips.005` while the current option ID represents `Thin lips`.
- Some presets place `face.*` IDs in the `Expression` field.
- `008-hair.json` uses an envelope with `meta/entries`, while most older files use a top-level array.
- `020-camera-framing.json` is empty while framing options still exist inside Camera.

These issues make asset production unsafe until field ownership and IDs are normalized.

## 5. Domain Boundaries

| Section | Owns | Must not own |
|---|---|---|
| Foundation | presentation, age range, Visual Heritage | face geometry, beauty judgment, skin tone |
| Face Structure | face outline, jaw, chin, cheek structure | eyes, nose, lips, expression, camera |
| Facial Features | eyes, eyelids, brows, nose, lips | makeup, gaze, expression, lighting |
| Hair | length, cut/style, texture, parting/fringe, color | wardrobe, scene wind, beauty ranking |
| Appearance | skin tone, undertone, detail, finish, freckles, makeup level | heritage inference, lighting recipe |
| Expression | emotion, smile and gaze intent | anatomy, pose, story |
| Guided Output | background and reviewed headshot recipe | character identity or anatomy |
| Style Filter (future) | photorealistic/anime/illustration/fantasy rendering | age, heritage, face geometry |

One field should control one visual axis. A composite preset may select several fields but cannot become a second definition of those options.

## 6. Canonical Contract

### 6.1 Field Definition

```json
{
  "id": "face.shape",
  "sectionId": "face-structure",
  "label": { "en": "Face Shape", "th": "โครงหน้า" },
  "selectionMode": "single",
  "required": false,
  "control": "visual-picker",
  "visibility": "basic",
  "supportsCustomValue": false,
  "optionSource": "face-shape"
}
```

### 6.2 Option Definition

```json
{
  "id": "face.shape.oval",
  "fieldId": "face.shape",
  "label": { "en": "Oval", "th": "หน้ารูปไข่" },
  "description": { "en": "Balanced oval face outline.", "th": "กรอบหน้าโค้งสมดุลคล้ายรูปไข่" },
  "prompt": { "default": "balanced oval face shape" },
  "compatibility": {
    "audienceClasses": ["minor", "adult"],
    "modes": ["headshot", "character-sheet", "normal"]
  },
  "status": "active"
}
```

Visual filename and asset path belong to the visual manifest in Requirement 002, not the semantic option definition.

### 6.3 Canonical Saved Selection

The next configuration schema must stop using translated/display field names as canonical keys:

```json
{
  "schemaVersion": 5,
  "characterBuilderVersion": 1,
  "selections": {
    "character.age": { "optionId": "character.age.adult_24_27" },
    "character.visual_heritage": { "optionId": "heritage.southeast_asian.thai" },
    "face.shape": { "optionId": "face.shape.oval" }
  }
}
```

The implementation may choose a later schema number if another migration lands first, but it must increment from the current version 4.

## 7. Foundation Target Taxonomy

### 7.1 Character Presentation

**Field ID:** `character.presentation`  
**Control:** segmented control  
**Assets:** none required

Initial options:

- `character.presentation.feminine`
- `character.presentation.masculine`
- `character.presentation.unspecified`

Prompt wording is age-aware. For example, feminine presentation resolves to `girl` for a child and `woman` for an adult. The option must not hardcode `woman` or `man` independently from Age.

Current `Female` and `Male` IDs receive migration aliases. Current `Child` must leave Gender entirely. `Non-binary` is removed from the MVP and has no automatic replacement because mapping identity to Androgynous appearance would change meaning.

### 7.2 Age Range

**Field ID:** `character.age`  
**Control:** dropdown; optional grouped visual summary may be added later  
**Assets:** none required for MVP

Proposed ranges:

| Option ID | User label | Audience class |
|---|---|---|
| `character.age.child_06_09` | Child (6-9) | minor |
| `character.age.preteen_10_12` | Preteen (10-12) | minor |
| `character.age.teen_13_17` | Teen (13-17) | minor |
| `character.age.young_adult_18_23` | Young Adult (18-23) | adult |
| `character.age.young_adult_24_27` | Young Adult (24-27) | adult |
| `character.age.adult_28_29` | Late Twenties (28-29) | adult |
| `character.age.adult_30_39` | Adult (30-39) | adult |
| `character.age.mature_40_49` | Mature Adult (40-49) | adult |
| `character.age.mature_50_59` | Mature Adult (50-59) | adult |
| `character.age.senior_60_plus` | Senior (60+) | adult |

Age is one field. Do not add an independent `Child` gender/presentation value.

The current Teenager (15-19) option crosses the legal boundary and cannot be silently mapped. It becomes a warned legacy value until the user reselects an age range.

### 7.3 Visual Heritage

**Field ID:** `character.visual_heritage`  
**User label:** `Visual Heritage` / `เชื้อสายและลักษณะเชิงภูมิภาค`  
**Control:** grouped searchable dropdown  
**Assets:** no portrait icons in MVP

Visual Heritage guides visible regional ancestry. It is not nationality, citizenship, culture, clothing or skin tone.

Proposed grouped values:

| Group | Initial detail options |
|---|---|
| Unspecified | Not specified |
| Southeast Asian | General Southeast Asian, Thai, Vietnamese, Filipino, Malay |
| East Asian | General East Asian, Chinese, Japanese, Korean, Taiwanese |
| South Asian | General South Asian |
| West Asian / Middle Eastern | General West Asian / Middle Eastern |
| African / African Diaspora | General African / African Diaspora |
| European | General European, Nordic / Scandinavian |
| Latin American | General Latin American / Hispanic; wording requires product review |
| Mixed Heritage | Asian-European mixed, Mixed heritage, Custom |

Rules:

- Do not use national flags as ethnicity icons.
- Do not infer skin tone, eye shape, hair texture or beauty direction from heritage.
- A detailed option compiles one heritage phrase; do not compile both parent and child phrases redundantly.
- `Singaporean` and `Malaysian` current values are nationality-like and have no safe automatic appearance mapping. Preserve them as legacy dropdown values until the user reselects; a future culture/nationality field may own them.
- MVP supports one selected heritage direction plus optional Custom. Multi-heritage composition is deferred until prompt behavior is tested.

### 7.4 Beauty

The current `Beauty` field is removed from the basic character foundation because its ten options mix age, heritage, anatomy, makeup, expression and fashion direction.

Migration policy:

- Do not auto-map `Beautiful young Asian` or `Cute doll-like Asian` into anatomy.
- `Natural`, `Editorial`, `Mature`, `Youthful`, `Sharp` and similar values become legacy-only until future Style/Appearance presets are defined.
- Existing saved values remain inspectable through an Advanced legacy dropdown and can compile their stored prompt during the compatibility window.
- Minor configurations must never compile legacy adult beauty directions.

## 8. Headshot Field Decision Matrix

| Current content | Target field | Decision | MVP control | Initial asset estimate |
|---|---|---|---|---:|
| Female/Male | `character.presentation` | Rename and make age-aware | Segmented | 0 |
| Non-binary | none | Remove; imported configuration requires reselection | Migration warning | 0 |
| Child under Gender | `character.age` | Move; clear presentation if unknown | Dropdown | 0 |
| Age ranges | `character.age` | Keep/split legal boundary | Dropdown | 0 |
| Ethnicity | `character.visual_heritage` | Group, rename, preserve unsafe mappings as legacy | Searchable dropdown | 0 |
| Beauty | future style/appearance presets | Remove from basic UI | Legacy dropdown | 0 |
| Oval/Square/Round/Diamond/Rectangular/Heart/Inverted Triangular/Long | `face.shape` | Keep existing meanings, add approved missing shapes and normalize IDs | Illustrated visual picker | 8 runtime slices from 1 source set |
| V-line/Soft/Defined jaw | `face.jawline` | Move/split from Face Shape | Visual picker | 3-4 |
| High cheekbones | `face.cheek_structure` | Move; add neutral alternatives | Visual picker | 3 |
| Chin geometry | `face.chin` | Add new reviewed set | Visual picker | 3 |
| Youthful/Natural/Symmetrical face | age/style/legacy | Remove from geometry | Legacy dropdown | 0 |
| Gentle expression | `expression.mood` | Move to Expression | Visual picker | shared |
| Locked Facial Match | reference workflow | Remove from Face Shape | Reference control | 0 |
| Doll-like face/details | future Style Filter | Remove from anatomy MVP | Legacy dropdown | 0 |
| Almond/Round/Phoenix/Doe/Puppy | `eyes.shape` | Normalize; review composite names | Visual picker | 4-5 |
| Monolid/Double/Hooded | `eyes.eyelid` | Split from eye shape | Visual picker | 3 |
| Soft/direct/look away gaze | `expression.gaze` | Move from Eyes | Segmented/visual | 0-3 |
| Bright eyes | guided output/legacy | Remove from anatomy | Legacy dropdown | 0 |
| Brow shape/density/grooming | `brows.shape`, `brows.density` | Split axes | Visual picker | 6 |
| Nose options | `nose.shape` | Keep as user-friendly composite presets | Visual picker | 5-6 |
| Lip anatomy | `lips.shape` | Keep and normalize | Visual picker | 5 |
| Smile/neutral in Lips | `expression.mood` | Move to Expression | Visual picker | shared |
| Skin Tone | `skin.tone`, optional `skin.undertone` | Replace fair-biased set with inclusive swatches | Swatch | 0 |
| Skin Texture | `skin.detail`, `skin.finish` | Split physical detail from finish/light | Visual/segmented | 3-6 |
| Makeup styles | `appearance.makeup_level` | Reduce to level; styles deferred | Segmented | 0-3 |
| Freckles | `skin.freckles` | Keep; remove age judgment | Visual/toggle | 3 |
| Hair Length | `hair.length` | Keep | Visual picker | 4 |
| Hair Style | `hair.style` | Normalize and deduplicate | Visual picker | 6-8 |
| Hair Texture | `hair.texture` | Keep separate from style | Visual picker | 4 |
| Bangs/Parting | `hair.parting_fringe` | Merge field naming, not option meaning | Visual picker | 4-5 |
| Hair Color | `hair.base_color`, `hair.highlight_color` | Convert to swatches | Swatch | 0 |
| Hair Finish | `hair.finish` | Keep small basic set; advanced styles deferred | Segmented/dropdown | 0-3 |
| 20 expressions | `expression.mood` | Reduce basic set; retain advanced dropdown | Visual picker + dropdown | 6 |

The full matrix represents approximately 67-85 possible runtime option slices before MVP reduction. Requirement 002 changes authoring to category source sets, so these slices do not require 67-85 separate generation jobs. The Lean MVP should target approximately 7-8 source sets, beginning with one Face Shape set. No batch generation may use the matrix as a final manifest.

## 9. Minor Safety Contract

`audienceClass` is derived on the server from `character.age`:

```text
child_06_09, preteen_10_12, teen_13_17 -> minor
all 18+ ranges                              -> adult
legacy ambiguous age                       -> unresolved
```

For `minor`:

- NSFW and sensual fields are forbidden regardless of UI state.
- Adult beauty, seductive expression and adult commercial styling cannot compile.
- Child and Preteen makeup is fixed to none/natural for MVP.
- Teen makeup is limited to none/natural; stronger styles are deferred.
- Expressions use a reviewed safe subset.
- Randomization, presets, imports and remix must pass the same server validation.
- Legacy values that cannot be proven safe are dropped with a visible validation reason, not silently retained.

For `unresolved` legacy age:

- Configuration may be viewed and edited.
- New generation requires age reselection when any age-sensitive option is present.

## 10. Migration Contract

### 10.1 Migration Status

Every old option receives one status:

- `preserve`: semantic meaning remains valid
- `replace`: deterministic replacement ID exists
- `split`: old value maps to more than one new field and requires explicit logic
- `legacy-only`: retained in fallback UI; no new selection in basic flow
- `remove-unsafe`: cannot compile for the selected audience class

### 10.2 Initial Mapping Decisions

| Current ID/value | Target | Migration |
|---|---|---|
| `character.001` Female | feminine presentation | replace |
| `character.002` Male | masculine presentation | replace |
| `character.002_nb` Non-binary | none | remove; do not compile and require presentation reselection |
| `character.003` Child | age 6-9 + unspecified presentation | split |
| `character.004_teen` Teenager 15-19 | none | legacy-only; user must choose minor/adult range |
| Existing 20-23 through 60+ ages | corresponding new age range | replace |
| Thai/Japanese/Korean/Chinese/Vietnamese/Taiwanese/Filipino | grouped Visual Heritage detail | replace |
| Singaporean/Malaysian | none | legacy-only; nationality-like ambiguity |
| Eurasian/Nordic/European/African/Middle Eastern/South Asian/Southeast Asian | grouped Visual Heritage | replace after wording review |
| Latina/Hispanic | Latin American group | replace only after terminology approval |
| Beauty options | future preset or none | legacy-only |
| Core face shapes | `face.shape.*` | preserve through alias/replacement |
| Face expression/style/reference values | owning section/workflow | move or legacy-only |
| Eye gaze values | `expression.gaze.*` | replace/move |
| Lip smile/expression values | `expression.mood.*` | replace/move |

### 10.3 Runtime Behavior

- Import reads schema version before applying aliases.
- Migration operates on option IDs first and stored prompt values only as fallback evidence.
- A migration report lists replaced, dropped, unresolved and legacy-only selections.
- Unknown IDs remain visible as recoverable legacy text and are never silently changed to the first option.
- Presets must be migrated through the same function as user configurations.
- Client preview and server compiler consume the same normalized semantic selection contract.
- During transition, adapters may read old display field names but new saves write stable field IDs.

## 11. Compatibility and Conflict Rules

- Age and presentation resolve prompt wording together.
- Visual Heritage never sets skin tone, eye shape, hair texture or nationality.
- Face reference authority may override anatomical fields but does not delete saved choices.
- Selecting an anatomical option cannot add expression, makeup, camera or lighting instructions.
- Hair compatibility uses semantic IDs, not English labels such as `Long Hair`.
- Color fields do not require duplicate hairstyle assets.
- Style Filter cannot mutate canonical anatomy selections.
- Basic and Advanced controls write to the same field ID; they are alternate views, not duplicate state.

## 12. Implementation Deliverables for Later Steps

Before Requirement 002 starts asset production, implementation planning must produce:

- machine-readable field registry
- complete old-to-new option migration table
- preset migration report
- server-derived audience classification validator
- normalized client/server field-category lookup from one source
- final per-field option inventory and asset count

## 13. Approved Product Decisions

Approved on 2026-07-16:

1. Age starts at 6 years for the first MVP; younger children are deferred.
2. Visual Heritage uses grouped terminology. Singaporean/Malaysian remain legacy values where automatic mapping is unsafe.
3. `Non-binary` is removed from the MVP. Existing values require explicit reselection and are never mapped to Androgynous automatically.
4. The basic expression set contains approximately six choices; remaining safe expressions appear under Advanced.
5. Beauty options become legacy-only until a separate Style/Appearance Filter requirement is approved.

## 14. Acceptance Criteria

- Every Headshot MVP value has exactly one owning field and section.
- Adult/minor classification is deterministic and enforced by the server.
- Visual Heritage is independent from nationality, skin tone and anatomy.
- Current flat mixed-axis fields have an explicit keep/move/split/deprecate decision.
- Existing configurations and presets have a migration or visible legacy fallback path.
- Removed or ambiguous identity values require explicit reselection and are never silently remapped.
- Requirement 002 may begin, but no mass Visual Option generation starts before its prototype review gate.
