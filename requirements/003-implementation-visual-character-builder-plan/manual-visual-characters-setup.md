# Manual Visual Characters Setup

Purpose: document the manual workflow for adding new visual character-builder options before an admin configuration tool exists.

This manual covers options such as face shapes, eyes, eyebrows, noses, lips, expressions, hair styles, hair colors, skin tones, makeup, freckles, and future character/clothing visual controls.

## Principles

- One visual option must map to one stable attribute ID.
- The visible label, icon, prompt phrase, and UI mapping must describe the same concept.
- Users should not need technical image-generation vocabulary to understand the option.
- Prompt wording should be concise and reusable across providers.
- Visual assets can be improved later without changing the attribute ID.
- Avoid deleting existing IDs after release; disable or migrate them instead.

## File Layers

Every visual option usually touches three layers.

| Layer | Purpose | Example |
| --- | --- | --- |
| Attribute JSON | Semantic option and prompt phrase | `attributes/006-lips.json` |
| Authoring visual asset manifest | Source sheet, slice grid, runtime profile, layout position | `visual-assets/character-builder/manifests/.../*.manifest.template.json` |
| Runtime visual asset manifest | Browser-loaded thumb URLs only for published options | `client/assets/visual-character-builder/.../manifest.json` |
| UI option mapping | Connects visual option ID to attribute ID | `client/visual-controls/visualOptionControls.js` |

Some options also need tests or filtering rules.

| Case | Extra Work |
| --- | --- |
| Hair cut/style | Gender/presentation filtering |
| Hair color | Swatch item and cleanup test |
| Expression | Headshot gaze safety cleanup |
| Skin/makeup | Natural/no-makeup cleanup check |
| Legacy replacement | Migration or fallback rule |

## Asset Storage Policy

Keep authoring assets and runtime assets separate.

| Storage Area | Include in App Runtime | Purpose |
| --- | --- | --- |
| `visual-assets/character-builder/source-sets/...` | No | Large source sheets for slicing and future corrections |
| `visual-assets/character-builder/reviews/...` | No | Contact sheets for manual visual QA |
| `visual-assets/character-builder/manifests/...` | No | Authoring contract for source sheet and option mapping |
| `client/assets/visual-character-builder/.../thumb/...` | Yes | Compact icons loaded by the browser UI |
| `client/assets/visual-character-builder/.../manifest.json` | Yes | Runtime manifest used by the visual picker |

Do not publish `source-sets` or `reviews` as browser runtime assets. They are working files for the asset pipeline.

For Character Sheet visual controls, the runtime should generate only `thumb` assets by default. Add `preview` or `master` runtime profiles only when a shipped UI feature needs larger images, such as zoom, detail inspection, or an admin asset editor.

Headshot visual controls may still use older `master`/`preview`/`thumb` profiles until that pipeline is optimized separately. New Character Sheet manifests should stay thumb-only.

## ID Naming

### Attribute ID

Use the existing family pattern.

| Category | Pattern | Example |
| --- | --- | --- |
| Face shape | `face.###` | `face.021` |
| Eyes | `eyes.###` | `eyes.009` |
| Eyebrows | `eyebrows.###` | `eyebrows.008` |
| Nose | `nose.###` | `nose.007` |
| Lips | `lips.###` | `lips.013` |
| Expression | `expression.###` | `expression.020` |
| Hair legacy/main | `hair_###` | `hair_052` |
| Hair texture | `hair.text_##` | `hair.text_05` |
| Skin tone | `skin.tone_##` | `skin.tone_10` |
| Skin texture | `skin.text_##` | `skin.text_07` |
| Makeup | `skin.makeup_##` | `skin.makeup_06` |
| Freckles | `skin.freckles_##` | `skin.freckles_04` |

Do not reuse a removed ID for a different visual meaning.

### Visual Option ID

Use a readable namespace for UI/manifest mapping.

| Category | Pattern | Example |
| --- | --- | --- |
| Face shape | `face.shape.{slug}` | `face.shape.soft_square` |
| Eyes | `eyes.shape.{slug}` | `eyes.shape.upturned` |
| Lips | `lips.shape.{slug}` | `lips.shape.downturned` |
| Expression | `expression.face.{slug}` | `expression.face.cozy_smile` |
| Hair cut/style | `hair.cut_style.{slug}` | `hair.cut_style.bob_cut` |
| Hair color | `hair.color.{slug}` | `hair.color.coffee_latte` |
| Skin tone | `skin.tone.{slug}` | `skin.tone.warm_beige` |

## Prompt Phrase Rules

Keep phrases short and descriptive.

Good:

```text
soft square face
downturned lips
short textured crop hairstyle
coffee latte brown hair
subtle friendly expression
```

Avoid:

```text
very very beautiful perfect face with amazing details
heart-shaped face literally shaped like a heart
eyes looking away from camera
hair displaying brilliant specular light reflections off healthy luminous waves
```

Headshot prompt phrases must avoid:

- `off-camera`
- `looking away`
- strong head tilt language
- sexualized body/fashion language for child-safe cases
- overly glossy beauty language for natural/no-makeup cases

## Asset Standards

### Recommended Manual Batch

For shape-like options, create a master sheet and slice it.

Recommended batch size:

| Batch | Use Case |
| --- | --- |
| 2x2 | Small additions or corrections |
| 3x3 | Best MVP batch size |
| 4x4 | Only when the category is stable |

Recommended style:

- clean vector-like drawing
- front-facing, centered
- neutral black/gray line art
- no background texture
- no brand/watermark
- same scale across all cells
- enough padding to survive card crop

### Icon Size

Use a larger source image and let the UI scale down.

Recommended source:

| Asset Type | Source Size |
| --- | --- |
| Master sheet | 2048-4096 px wide |
| Individual authoring override icon | 512x512 px |
| Runtime thumb target | 128x128 px |
| UI display size | 96-160 px displayed |

For future tinting, prefer transparent PNG or SVG-like black/gray artwork. If PNG is used, keep strong contrast so CSS filters/tints still look clean.

Runtime profile guidance:

```json
"runtimeProfiles": {
  "thumb": { "width": 128, "height": 128, "format": "png" }
}
```

Use this thumb-only profile for Character Sheet visual controls unless there is a concrete shipped UI need for a larger asset.

## Manual Addition Workflow

### 1. Define the Option

Write the concept first.

Checklist:

- English label
- Thai label if needed
- Visual option ID
- Attribute ID
- Prompt phrase
- Category/subcategory
- Gender/presentation filter if relevant
- Whether the option is MVP, experimental, or hidden

Example:

```text
Label: Downturned Lips
Visual option ID: lips.shape.downturned
Attribute ID: lips.013
Prompt phrase: downturned lips
Category: lips
Subcategory: Lips
```

### 2. Add Attribute JSON

Add a new entry to the matching `attributes/*.json` file.

Example shape:

```json
{
  "id": "lips.013",
  "category": "lips",
  "label": {
    "en": "Downturned Lips",
    "th": "ริมฝีปากมุมตก"
  },
  "ui": {
    "control": "select",
    "group": "Lips"
  },
  "prompt": {
    "default": "downturned lips",
    "gpt-image": "downturned lips"
  },
  "tags": ["lips"],
  "enabled": true
}
```

Notes:

- Keep `prompt.default` and `prompt.gpt-image` aligned unless a provider needs safer wording.
- Use `enabled: false` for staged options that should not appear yet.
- Keep labels short enough for compact cards.

### 3. Add or Update Visual Assets

If the option is image-based:

1. Add the option to a master sheet or individual icon.
2. Place the source sheet in `visual-assets/character-builder/source-sets/...`.
3. Update the authoring manifest in `visual-assets/character-builder/manifests/...`.
4. Slice runtime thumbs into `client/assets/visual-character-builder/...`.
5. Check the contact sheet in `visual-assets/character-builder/reviews/...`.
6. Check that the icon is centered and readable at UI card size.

If the option is swatch-based:

1. No image is required.
2. Add swatch colors to the visual control config.

Example hair color item:

```json
{
  "optionId": "hair.color.coffee_latte",
  "slug": "coffee-latte",
  "swatch": { "colors": ["#6a432c", "#b98255"] },
  "alt": {
    "en": "Coffee latte brown hair color swatch",
    "th": "Coffee latte brown hair color swatch"
  }
}
```

### 4. Update Manifest

For visual-card-picker categories, add the item to the manifest.

Example:

```json
{
  "optionId": "lips.shape.downturned",
  "slug": "downturned",
  "row": 1,
  "column": 1,
  "assetRevision": 1,
  "reviewStatus": "source-selected",
  "alt": {
    "en": "Downturned lips icon",
    "th": "Downturned lips icon"
  }
}
```

The `optionId` must match the UI mapping in `visualOptionControls.js`.

Runtime manifests in `client/assets/.../manifest.json` are generated by the slicer. Do not hand-edit runtime manifests unless debugging.

### 5. Update UI Mapping

Add the visual option ID to attribute ID mapping in:

```text
client/visual-controls/visualOptionControls.js
```

Example:

```js
optionMap: {
  "lips.shape.downturned": "lips.013"
}
```

For swatches, add both:

- `optionMap`
- `items`

### 6. Add Filtering Rules If Needed

Hair cut/style uses presentation filtering.

If adding a feminine cut:

- add it to the feminine/unisex allowed list
- ensure it does not appear for male-only mode unless intended

If adding a masculine cut:

- add it to the masculine allowed list
- verify female mode behavior

If adding unisex:

- decide whether it appears in both lists

### 7. Run Checks

Recommended checks:

```bash
node --check client/app.js
node --check client/visual-controls/visualOptionControls.js
npm run test:prompt-cleanup
```

If assets were sliced:

```bash
npm run visual-assets:check
```

For Character Sheet assets:

```bash
npm run visual-assets:check:character-sheet
node scripts/slice-visual-assets.js --slice --field=body.silhouette.female
node scripts/slice-visual-assets.js --slice --field=body.silhouette.male
```

If the option changes semantic prompt behavior, add or update a prompt cleanup test case.

### 8. Visual QA

Check the UI at actual display size.

Confirm:

- selected state is visible
- label is not clipped
- icon is centered
- icon is distinguishable from nearby options
- mobile card layout still works
- selected option appears in Live Prompt Preview
- generated prompt phrase is not duplicated

## Effort Estimate

| Change Type | Estimated Manual Effort |
| --- | --- |
| Add one hair color swatch | 5-15 minutes |
| Add one lips/eyes/nose/face icon with ready asset | 15-30 minutes |
| Add one hair style icon with ready asset | 30-60 minutes |
| Add 3x3 master sheet and slice | 45-120 minutes depending on cleanup |
| Add new category from scratch | 0.5-2 days |

Most time is spent on naming consistency and visual QA, not code.

## Recommended Batch Workflow

Use batch mode for anything image-based.

1. Decide 6-9 options for the category.
2. Generate or draw one 3x3 master image.
3. Review the master image before slicing.
4. Slice into individual icons.
5. Add attribute entries.
6. Add manifest entries.
7. Add UI mappings.
8. Run checks.
9. Review contact sheet.
10. Review Live Prompt Preview.

This avoids repeatedly editing the same JSON and mapping files.

For gender-specific Character Sheet controls, prefer separate source sheets and runtime manifests per gender while keeping one UI field. Example:

| Gender | Source Sheet | Runtime Folder |
| --- | --- | --- |
| Female | `source-sets/character-sheet-v1/body/body-silhouette/body-silhouette-set-r1-female.png` | `client/assets/visual-character-builder/character-sheet-v1/body/body-silhouette-female` |
| Male | `source-sets/character-sheet-v1/body/body-silhouette/body-silhouette-set-r1-male.png` | `client/assets/visual-character-builder/character-sheet-v1/body/body-silhouette-male` |

The UI field should filter both dropdown options and visual manifest variant by selected Gender, then fall back to the generic manifest when no adult gender is selected.

## Future Admin Configuration Model

When admin configuration exists, it should manage the same conceptual layers.

Suggested admin fields:

| Field | Purpose |
| --- | --- |
| Attribute ID | Stable semantic ID |
| Visual option ID | Stable UI/manifest ID |
| Category | Attribute family |
| Subcategory | Field-level grouping |
| English label | UI text |
| Thai label | UI text |
| Prompt phrase | Provider-neutral prompt text |
| Provider prompt overrides | Optional provider-specific phrases |
| Tags | Cleanup/filtering |
| Gender/presentation visibility | Hair/body/clothing filtering |
| Asset upload | Icon or master sheet |
| Swatch values | Color-based controls |
| Enabled status | Publish/unpublish |
| Migration target | Replacement ID for deprecated options |

Admin save should validate:

- no duplicate attribute ID
- no duplicate visual option ID
- prompt phrase is not empty
- option ID exists in manifest mapping
- asset exists or swatch exists
- disabled options are not selected by new users
- deprecated options have migration behavior

## Known Current Manual Risks

- Hair visual state can miss selected `Cut / Style` or `Color` after refresh/reselect in some cases.
- Client/server cleanup logic is currently duplicated and must stay aligned.
- Some legacy `ui.group` values, such as lips using `Lips`, differ from the rendered schema group `Face`.
- Prompt snapshot tests cover compiler behavior, not every browser UI state.

These should be revisited before building the admin configuration tool.
