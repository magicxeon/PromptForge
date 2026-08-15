# Vertical Drama Lead Attribute And Visual Expansion

**Status:** Implemented - product-supplied male face visuals pending manual validation  
**Owner:** Visual Character Builder  
**Sequence:** 012  
**Depends on:** 001-007, 009, 010-003, 010-006  
**Runtime consumers:** Face Creator and Character Sheet; Scene Builder consumes
the resulting Character Reference rather than duplicating these controls

## 1. Goal

Add selectable facial and body attributes that help a non-expert create the
polished leading-character look commonly seen in contemporary vertical drama
productions. The intended result is a photorealistic, attractive and memorable
male or female lead with clear facial structure and camera-readable
proportions.

This is an **option expansion**, not a new Character category, mode, preset or
workflow. New options appear inside the existing fields and use the existing
Visual Character controls:

- Face Shape
- Eyes
- Eyebrows
- Nose
- Lips
- Model Build
- Body Silhouette

The customer-facing family name is **Vertical Drama Lead**. Do not use labels
such as `AI Hero`, `AI Heroine`, `perfect face`, `ideal body` or beauty-ranking
language. Every generated Character is already AI-assisted; the label should
describe the production direction instead.

## 2. Product Boundary

### In scope

- additive semantic Attribute records in existing catalogs;
- male and female leading-character options where anatomy differs materially;
- visual cards produced in the existing Headshot and Character Sheet visual
  languages;
- gender/presentation applicability where an option is explicitly male- or
  female-directed;
- canonical prompt phrases that remain photorealistic and anatomically
  plausible;
- save, restore, prompt compilation and Character Reference lineage using the
  existing Attribute IDs.

### Out of scope

- a new `Vertical Drama`, `Hero` or `Heroine` category;
- a one-click preset that silently selects several fields;
- new Studio navigation or a separate generator;
- hairstyle, makeup, expression, clothing, pose, lighting or environment
  changes;
- copying the identity of an actor, celebrity or supplied example person;
- a Chinese ethnicity override;
- anime, illustration, CGI, doll or beauty-filter output;
- changing existing Attribute IDs or replacing existing visual options.

## 3. Identity And Cultural Rules

`Vertical Drama Lead` describes casting and production aesthetics, not
nationality or ethnicity.

- `Visual Heritage` remains the exclusive guided control for regional facial
  heritage.
- Skin Tone, Age and Character Presentation remain independently selected.
- New options must not contain `Chinese person`, a nationality, skin color or
  an actor name in their prompt text.
- A selected Face Reference remains the higher identity authority.
- A selected Character Reference remains the higher canonical identity/body
  authority according to Reference Processing policy.
- The visual examples supplied by Product are mood and proportion references
  only. Do not ship, trace or derive runtime assets from those images.

## 4. Proposed Attribute Inventory

The inventory intentionally stays small. Two coordinated options per field are
enough to express a male and female lead direction without flooding existing
pickers. Shared anatomical options may be used by either presentation when
they remain semantically appropriate.

### 4.1 Face Shape

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `face.021` | Sculpted Tapered Face | adult male | refined elongated face, defined cheek plane, clean tapered lower face and firm natural jaw without exaggerated V-line narrowing |
| `face.022` | Refined Soft Tapered Face | adult female | refined oval-to-heart facial contour, softly defined cheek plane and a graceful natural taper toward the chin without doll-like proportions |

Face Shape changes the outer facial structure only. It must not change eyes,
nose, lips, hairstyle, age, heritage or expression.

### 4.2 Eyes

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `eyes.014` | Defined Deep Almond Eyes | adult male | balanced almond eyes with a clear upper-lid line, restrained depth and an alert composed gaze shape |
| `eyes.015` | Expressive Refined Almond Eyes | adult female | clear slightly open almond eyes with a refined lid contour and expressive but anatomically natural proportions |

Eyes changes eye geometry only. It must not add eyeliner, colored contacts,
catchlights, gaze direction or emotion.

### 4.3 Eyebrows

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `eyebrows.008` | Structured Straight Brows | adult male | naturally full straight brows with a restrained outer taper and clean structure |
| `eyebrows.009` | Refined Soft-arc Brows | adult female | naturally defined brows with a gentle low arc and a clean tapered tail |

Eyebrows changes brow shape and density only. It must not imply anger,
surprise, makeup or a different age.

### 4.4 Nose

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `nose.007` | Sculpted Straight Bridge | adult male | clean straight bridge with a naturally defined base and proportionate tip, strong but not oversized |
| `nose.008` | Refined Straight Nose | adult female | slim natural straight bridge with a softly defined proportionate tip, never pinched or surgically exaggerated |

Nose changes nose geometry only. It must not alter face width, heritage or
camera perspective.

### 4.5 Lips

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `lips.013` | Clean Defined Lips | adult male | balanced natural lips with a clean contour, restrained upper-lip definition and proportionate lower-lip volume |
| `lips.014` | Soft Defined Bow Lips | adult female | softly defined cupid's bow with balanced natural fullness and a clean relaxed contour |

Lips changes resting anatomy only. It must not add lipstick, gloss, an open
mouth or a smile.

### 4.6 Model Build

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `body.build.vertical-drama-male-lead` | Lean Broad-shouldered Lead Build | adult male | tall-looking lean adult frame, naturally broad structured shoulders, tapered torso, balanced muscle definition and long proportional limbs without bodybuilding exaggeration |
| `body.build.vertical-drama-female-lead` | Elegant Slender Lead Build | adult female | elongated slender adult frame, graceful shoulder line, narrow natural waist and long proportional limbs while preserving the separately selected body silhouette |

Model Build controls frame and body-mass impression. It must preserve the
independently selected Body Silhouette and must not encode clothing, pose,
height in centimeters or sexualized anatomy.

### 4.7 Body Silhouette

| Proposed ID | Customer label | Applicability | Isolated prompt meaning |
| --- | --- | --- | --- |
| `body.silhouette.vertical-drama-male-lead` | Tapered Leading-man Silhouette | adult male | anatomically natural upper-body V taper with broad shoulders, a proportionate chest and narrower waist and hips, preserving balanced legs and realistic posture |
| `body.silhouette.vertical-drama-female-lead` | Balanced Leading-woman Silhouette | adult female | anatomically natural balanced curves, gently defined waist, proportionate upper torso and hips, and an elegant continuous body line without exaggeration |

Body Silhouette controls the broad outer contour only. It must not duplicate
Model Build wording or introduce a fixed bust, weight, garment or pose.

## 5. Compatibility Matrix

The options are designed to work independently. Product may recommend a
combination in documentation, but runtime must not auto-select the rest of the
family when one card is chosen.

| Field | Male coordinated option | Female coordinated option |
| --- | --- | --- |
| Face Shape | Sculpted Tapered Face | Refined Soft Tapered Face |
| Eyes | Defined Deep Almond Eyes | Expressive Refined Almond Eyes |
| Eyebrows | Structured Straight Brows | Refined Soft-arc Brows |
| Nose | Sculpted Straight Bridge | Refined Straight Nose |
| Lips | Clean Defined Lips | Soft Defined Bow Lips |
| Model Build | Lean Broad-shouldered Lead Build | Elegant Slender Lead Build |
| Body Silhouette | Tapered Leading-man Silhouette | Balanced Leading-woman Silhouette |

Rules:

- selecting one option never mutates another field;
- existing options remain visible and unchanged;
- changing Character Presentation clears an incompatible hidden selection
  through the existing reconciliation path;
- saved configurations retain semantic IDs, not family names or filenames;
- custom prompts remain optional and do not become part of these Attribute
  records.

## 6. Canonical Ownership And Placement

| Concern | Owner |
| --- | --- |
| Face Shape semantic records | `attributes/002-face.json` |
| Eyes semantic records | `attributes/003-eyes.json` |
| Eyebrows semantic records | `attributes/004-eyebrows.json` |
| Nose semantic records | `attributes/005-nose.json` |
| Lips semantic records | `attributes/006-lips.json` |
| Model Build and Body Silhouette records | canonical Body catalog currently consumed by `attributes/spec/ui-schema.json`; implementation must extend the active catalog without duplicating an existing semantic record |
| Field placement | existing fields in `attributes/spec/ui-schema.json`; no new field or group |
| Authoring assets and manifests | `visual-assets/character-builder/` existing Headshot and Character Sheet families |
| Runtime visual assets | `client/assets/visual-character-builder/` existing field folders |
| Visual rendering | shared `web/src/components/visual-options/VisualOptionPicker.tsx` path |
| Applicability/reconciliation | existing Studio attribute model and mode policy |
| Prompt compilation | canonical Generation prompt compiler paths |

No new route, provider, repository, workflow service, Credit path or visual
component is required.

## 7. Visual Character Asset Contract

### 7.1 Existing visual families only

Extend the current source sheets/manifests for:

```text
headshot-v1/face-structure/shape
headshot-v1/facial-features/eyes
headshot-v1/facial-features/eyebrows
headshot-v1/facial-features/nose
headshot-v1/facial-features/lips
character-sheet-v1/body/body-build
character-sheet-v1/body/body-silhouette-female
character-sheet-v1/body/body-silhouette-male
```

Do not introduce a `vertical-drama` runtime asset category. The family tag may
appear in authoring metadata and tests, but each asset belongs to its anatomical
field.

### 7.2 Isolation rules

- Use newly authored, copyright-safe line art or diagrams.
- Keep the same neutral template, angle, scale, crop, line weight and expression
  within each field.
- Change only the property represented by that field.
- Face visual cards must remain readable at the existing 74x74 compact mask
  size.
- Body cards use the restored shared compact mask-card treatment and theme
  tokens; no white bitmap panel or Body-only component.
- Male and female body visuals use their existing gender-specific manifests.
- Visuals must work in Momelo Neon, Pearl Editorial and Electric Studio through
  `recolorMode: mask` and shared semantic theme tokens.
- The Product reference images are not source assets and must not be committed,
  traced or used as public derivatives.

### 7.3 Visual review checkpoint

Before runtime publication, produce one review contact sheet containing:

- five male facial cards plus male build and silhouette;
- five female facial cards plus female build and silhouette;
- current neighboring options for comparison, so Product can detect options
  that are visually indistinguishable or overly exaggerated.

Approval must confirm semantic clarity at compact size before slicing runtime
assets.

## 8. Prompt Composition Rules

- Each Attribute contributes one compact anatomical phrase.
- Do not compile the phrase `Vertical Drama Lead` itself; compile only selected
  anatomy.
- Do not repeat `attractive`, `handsome`, `beautiful`, `perfect`, `Chinese`,
  `doll-like`, `CGI` or `AI-generated` across field prompts.
- Prompt order remains Face Shape, Eyes, Eyebrows, Nose, Lips, Model Build and
  Body Silhouette according to the existing compiler's canonical ordering.
- Provider overrides are added only when provider qualification shows a real
  semantic mismatch; do not duplicate identical provider strings initially.
- Identity/reference authority can suppress conflicting anatomy through the
  existing Reference Processing contract.
- Character Sheet must preserve the same selected anatomy across front, exact
  side and back views without normalizing the body toward an average shape.

## 9. Applicability And Safety

- Initial release applies to adult male and adult female presentations only.
- Minor flows must not retain hidden adult-only build/silhouette values.
- Options use neutral anatomical language and remain non-sexualized.
- No option may encode nudity, cleavage, underwear, fetish styling or body
  ranking.
- Body visuals use the approved modest casting reference language.
- Existing server-side age and applicability validation remains authoritative;
  UI filtering alone is insufficient.

## 10. Implementation Sequence

1. Confirm labels, IDs, isolated prompt meanings and adult applicability.
2. Check the active Body catalog owner and avoid duplicate records across
   legacy `Body Shape`, canonical `Body Silhouette` and `Model Build` aliases.
3. Add semantic Attribute records and localized English/Thai labels.
4. Extend existing visual authoring manifests without adding a category.
5. Create copyright-safe source visuals and the comparison contact sheet.
6. Wait for Product visual approval.
7. Slice/publish runtime masks through the existing visual asset script.
8. Register new manifest items in the existing visual registry mappings only
   where semantic-to-Attribute mapping is required.
9. Validate applicability, restore/reconciliation and prompt composition.
10. Visually verify compact cards in all three themes at desktop and mobile.

## 11. Automated Validation

Required coverage:

- Attribute IDs are unique and enabled;
- no new UI group/category is introduced;
- every runtime manifest item maps to exactly one enabled Attribute ID;
- adult male and female flows expose only applicable lead options;
- presentation changes clear incompatible selections;
- each selection compiles exactly one isolated prompt phrase;
- existing options and saved selections remain valid;
- Face/Character Reference authority still suppresses conflicting controls;
- shared Visual Option cards render mask assets and theme-selected states;
- missing visual assets retain text/dropdown fallback;
- Attribute bundle, React tests and TypeScript checks pass.

## 12. Manual Product Validation

Generate at least these cases using the same provider/model and neutral casting
conditions:

1. coordinated adult male lead selections;
2. coordinated adult female lead selections;
3. each face option changed individually against a neutral baseline;
4. each body option changed individually against a neutral baseline;
5. a non-Chinese Visual Heritage selection using these options, confirming the
   production look does not override heritage;
6. a Character Sheet confirming consistent front/side/back anatomy;
7. Momelo Neon, Pearl Editorial and Electric Studio card presentation.

Score each generated case for:

- intended feature fidelity `/5`;
- identity/heritage preservation `/5`;
- photorealism `/5`;
- anatomical plausibility `/5`;
- no unintended makeup, hairstyle, expression or age change `pass/fail`;
- no doll, CGI or celebrity resemblance `pass/fail`.

## 13. Acceptance Criteria

- Users can construct the intended leading-character look using existing
  categories only.
- No one-click family selection or hidden cross-field mutation exists.
- New visual cards match the original shared Visual Character pattern and all
  themes.
- Male and female coordinated choices are distinguishable without relying only
  on labels.
- The result remains photorealistic, culturally independent, copyright-safe and
  anatomically plausible.
- Existing Attribute options, references, drafts and prompt compilation do not
  regress.

## 14. Product Checkpoint Before Implementation

Product must approve:

1. the feature family name `Vertical Drama Lead`;
2. the fourteen proposed Attribute labels and isolated meanings;
3. adult-only applicability for the initial release;
4. the contact-sheet visual direction; and
5. whether the coordinated male/female combinations are recommendations in
   documentation only, as specified, or should become explicit presets in a
   future separate requirement.

Implementation must not begin asset publication until this checkpoint is
approved.

## 15. Implementation Record

Implemented on 2026-08-12 after Product approved implementation:

- added fourteen additive semantic options across the existing Face Shape,
  Eyes, Eyebrows, Nose, Lips, Model Build and Body Silhouette fields;
- retained Visual Heritage as the independent owner of ethnicity and did not
  add a category, preset or hidden cross-field selection;
- added centralized adult male/female applicability filtering and stale
  selection reconciliation in the Studio attribute model;
- enforced the same applicability tags in the server prompt compiler so hidden
  or stale values cannot enter Generation prompts;
- published copyright-safe code-native line-art masks through the existing
  Headshot and Character Sheet manifest families;
- exposed Model Build through the shared Visual Option registry without
  replacing any existing option or visual asset;
- expanded the Sharp visual validator's canonical Attribute sources to include
  the active Face catalogs and Fashion Commerce Body catalog; and
- added focused React and server regression coverage for filtering,
  reconciliation, prompt suppression and visual manifest resolution.

The authored SVG diagrams intentionally remain code-native rather than
AI-generated raster derivatives. Product must still perform the compact-card,
three-theme and generated-image checks in sections 12 and 13 before this
requirement is marked complete.

## 16. Visual Asset Correction R2

Product review found that the first code-native diagrams used strokes and
geometry that were materially heavier than the established Headshot and
Character Sheet visual families. Revision 2 corrects the visual presentation
without changing Attribute IDs, labels, prompts, applicability or saved
selection contracts.

### 16.1 Shared visual language

- Existing approved raster cards are the layout and density reference. New
  diagrams must use the same centered composition, generous negative space and
  compact-card readability.
- Code-native mask art uses a transparent canvas, black source strokes and the
  existing `recolorMode: mask` contract so the shared Visual Option component
  applies the active theme color.
- Facial feature strokes target `2-2.25px` on a `128 x 128` view box. Body
  diagrams target `2px`. Heavy icon-style outlines, filled facial features and
  doubled contours are prohibited.
- Supplied product images may inform abstract geometry only. They must not be
  traced, embedded, shipped or used as identity assets.

### 16.2 Feature-specific correction

- **Sculpted Tapered Face:** retain the established face-outline card layout;
  show a longer upper face, readable cheek plane, clean jaw transition and a
  restrained tapered chin without an extreme V-line.
- **Defined Deep Almond Eyes:** use the approved Hooded-eye card as the scale,
  spacing and line-weight reference while preserving a distinct almond opening,
  restrained upper-lid depth and natural iris placement.
- **Sculpted Straight Bridge:** follow the established nose-card placement;
  depict a straight bridge, proportionate alar base and controlled natural tip
  with partial contour lines rather than a heavy enclosed icon.
- **Clean Defined Lips:** follow the established lip-card scale and use separate
  light upper, center and lower contours. The mouth must remain relaxed and
  anatomically natural.
- Eyebrow and body diagrams receive the same line-weight correction so the
  coordinated family does not mix incompatible illustration styles.

### 16.3 Revision and validation

- Extension manifest records use `assetRevision: 2` while retaining stable
  option IDs and runtime URLs.
- The R2 assets must be checked in Momelo Neon, Pearl Editorial and Electric
  Studio. Selection, hover and disabled states must remain readable without a
  white raster box or hard-coded theme color.
- Compact-card comparison must confirm that the new face, eyes, nose, lips,
  brows, Model Build and Body Silhouette do not appear heavier than adjacent
  legacy visual options.

## 17. Product-supplied Visual Rollout R3

Product rejected the provisional code-native R2 drawings as insufficiently
faithful. The initial release therefore uses only files explicitly supplied in
`.tmp/visual-images`. An Attribute remains available when it has no approved
image, but it is shown only in the existing text select until Product supplies
and approves its visual.

### 17.1 Approved initial visuals

The following adult-male options have Product-supplied raster visuals:

| Attribute | Supplied source |
| --- | --- |
| Sculpted Tapered Face | `Sculpted-Tapered-Face.png` |
| Defined Deep Almond Eyes | `Defined-Deep-Almond-Eyes.png` |
| Structured Straight Brows | `Structured-Straight-Brows.png` |
| Sculpted Straight Bridge | `Sculpted-Straight-Bridge.png` |
| Clean Defined Lips | `Clean-Defined-Lips.png` |

Canonical authoring copies live under
`visual-assets/character-builder/source-sets/headshot-v1/product-approved/vertical-drama-lead-r3/`.
Normalized runtime copies live in the owning field's existing
`master/`, `preview/`, and `thumb/` folders under
`client/assets/visual-character-builder/headshot-v1/`.
The `.tmp` folder is an intake location only and is not a runtime dependency.

### 17.2 Text-only options

Until a matching Product-approved file is supplied, these options must not use
a generated drawing, legacy-image substitution or fallback image:

- all five adult-female Vertical Drama facial options;
- Lean Broad-shouldered Lead Build;
- Elegant Slender Lead Build;
- Tapered Leading-man Silhouette; and
- Balanced Leading-woman Silhouette.

These Attributes remain selectable through the standard text dropdown and
continue to compile their existing prompt meanings. Removing a visual must not
remove, disable or mutate the semantic Attribute.

### 17.3 Runtime behavior

- Product-supplied source PNG files are normalized into transparent line-art
  masks (`recolorMode: mask`). The drawing, card chrome, text, focus, selection
  and disabled states all follow the active theme exactly like legacy options.
- A manifest item-level `recolorMode` overrides the manifest default so an
  approved raster can coexist with legacy mask images in the same field.
- The shared compact and large visual-card media frames size raster images to
  `100%` by `100%` with `object-fit: contain`. Product PNGs must never render
  at their intrinsic dimensions and expose only a cropped blank corner.
- Every approved manifest record declares its canonical semantic `attributeId`
  directly. The Headshot manifest index and loader use rollout revision `v=3`
  so a browser session cannot keep the pre-rollout manifest set for 30 minutes.
- Extension revision is `3`. The provisional R2 SVG records and files are not
  runtime fallbacks and must not return after the Sharp slicing workflow runs.
- Future visuals are added one Attribute at a time only after Product places
  and approves the corresponding source file.

### 17.4 New approved-image intake

For every future visual, Product supplies black or dark line art on a white or
near-white square canvas. The source may be larger than the runtime card, but
must contain one centered feature, no text, no border and no unrelated marks.

1. Copy the approved source into a versioned folder under
   `visual-assets/character-builder/source-sets/<style>/product-approved/`.
2. Add one record to `runtime-manifest-extensions.json` with the semantic
   `attributeId`, stable `optionId`, incremented `assetRevision`, source path,
   and `processing: line-art-mask`.
3. Run `npm run visual-assets:import-approved`.
4. The shared Sharp importer removes the white background, derives alpha from
   line darkness, trims the drawing, fits it into the same 82% safe area as
   existing options, and writes `master`, `preview`, and `thumb` PNG files.
5. The runtime manifest uses `recolorMode: mask`; theme color comes from the
   shared Visual Option component. Never point the UI directly at the intake
   PNG.

The import command updates only approved extension visuals. It does not
re-slice or require re-review of existing visual sheets.

Generated runtime records omit optional `attributeId` when a legacy option is
resolved through the registry mapping. They must never serialize
`attributeId: null`, because the browser schema intentionally accepts only a
canonical string or an absent property and would reject the entire field
manifest.

## 18. Face Creator Regression Contract

Product testing found that incremental fixes could preserve one facial field
while silently dropping another, and that an early-twenties age could conflict
with the legacy `Mature sophisticated elegance` Beauty direction. Face Creator
is therefore protected as one coordinated contract rather than a collection
of isolated option tests.

- Selecting Face Shape, Eyes, Eyebrows, Nose and Lips in sequence must preserve
  every earlier selection in controlled React form state.
- The client preview and canonical server compiler must retain all five facial
  anatomy phrases together for both adult-male and adult-female Vertical Drama
  combinations.
- The contract test must load the real Attribute IDs and prompt phrases for the
  server boundary so a catalog rename, mapping error or disabled option fails
  validation rather than silently reducing the prompt.
- `Early Twenties (20-23)` owns apparent facial maturity. A legacy Beauty option
  may retain refined sophistication, but its compiled phrase must not request a
  mature face and must include an explicit early-twenties facial-age guard.
- An adult male Headshot or Character Sheet with no Facial Hair selection uses
  a clean-shaven default. A deliberate Facial Hair selection replaces that
  default and remains authoritative.
- Existing female and minor applicability filtering remains unchanged.

Required automated gates are the controlled Face form interaction test, the
client preview matrix and the catalog-backed server compilation matrix. These
tests are additive to visual-manifest tests; passing a visual card test alone
does not prove prompt completeness.

The canonical product-level manual regression is
`013-face-character-scene-manual-validation.md`. It must be run in order so a
Face failure is not confused with Character packaging or Scene reference
dispatch.
