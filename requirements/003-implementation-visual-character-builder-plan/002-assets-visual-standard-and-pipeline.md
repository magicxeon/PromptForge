# Assets - Illustrated Set Standard and Pipeline

**Status:** Face Shape Pilot Sliced - Visual Picker Scaffolded  
**Sequence:** 002  
**Depends on:** Approved 001 Foundation Domain and Attribute Contract  
**Updated:** 2026-07-17

## 1. Objective

กำหนด asset workflow แบบ **set-first** สำหรับ Visual Character Builder โดยสร้างภาพหนึ่งแผ่นต่อหนึ่ง category แล้ว slice เป็น runtime icon ราย option ลดจำนวน generation jobs, ลดงานจัดองค์ประกอบซ้ำ และยังแก้เฉพาะ option ด้วย override ได้ภายหลัง

MVP ใช้ภาพเขียนแบบ flat vector-like monochrome แทน photographic tiles รูปแบบภาพจริงสามารถเพิ่มภายหลังจาก prompt และใช้ semantic option IDs ชุดเดิมได้

Requirement นี้กำหนด contract เท่านั้น ยังไม่ implement slicer, CSS mask, manifest loader หรือ UI picker

## 2. Approved Visual Direction

- Flat vector-like beauty/character-creator illustration
- Monochrome charcoal, gray, black or white
- Clean human anatomy; category names must not become literal geometric symbols
- Consistent line weight, scale, alignment and negative space within one set
- Plain removable white background during generation/authoring
- No text, labels, symbols, borders, cell dividers, watermark or logo inside source sheet
- Runtime slices use transparent background and may be recolored through CSS `mask-image`
- One source sheet per category; one runtime asset per option
- Individual override is allowed when only one generated cell is incorrect
- Visual Heritage and Age remain dropdowns and require no illustrated set
- Color choices remain CSS swatches and require no illustrated set

## 3. Why Set-first

The original per-option plan could require 67-85 source images. Set-first changes the production unit:

| Scope | Authoring unit | Runtime output |
|---|---:|---:|
| Face Shape pilot | 1 source sheet | 8 icons |
| Lean Headshot MVP | approximately 7-8 source sheets | approximately 33 icons |
| Expanded taxonomy | additional category sheets only | individual icons as needed |

Runtime remains item-based for accessibility, lazy loading and independent replacement. Only authoring/generation is set-based.

## 4. Authoring and Runtime Structure

```text
visual-assets/character-builder/                 # private authoring workspace
  schemas/
    illustrated-set-manifest.schema.json
  manifests/
    headshot/
      face-structure/
        face-shape.manifest.json
  prompts/
    headshot-v1/
      illustrated-set.master.md
      face-shape.prompt.md
  source-sets/
    headshot-v1/
      face-structure/
        face-shape/
          face-shape-set-r1.png
          overrides/
            heart-r2.png
  reviews/
    headshot-v1/
      face-shape/
        contact-sheet-r1.png
        review-notes.md

client/assets/visual-character-builder/          # public runtime assets only
  headshot-v1/
    manifest.index.json
    face-structure/
      face-shape/
        manifest.json
        preview/
          oval-r1.png
          heart-r2.png
        thumb/
          oval-r1.png
          heart-r2.png
```

Rules:

- Authoring files are outside `client` and are not served by Express.
- Runtime code reads manifests; it never lists directories or guesses filenames.
- Prompt, source sheet, review notes and provenance never ship to the browser.
- Production may move runtime files to object storage/CDN without changing `fieldId` or `optionId`.

## 5. Face Shape Pilot

The supplied 4x2 reference sheet is the approved first visual direction.

### 5.1 Canonical Order

| Row | Column | Option ID | English label | Thai label |
|---:|---:|---|---|---|
| 1 | 1 | `face.shape.oval` | Oval | หน้ารูปไข่ |
| 1 | 2 | `face.shape.square` | Square | หน้าเหลี่ยม |
| 1 | 3 | `face.shape.round` | Round | หน้ากลม |
| 1 | 4 | `face.shape.diamond` | Diamond | หน้ารูปเพชร |
| 2 | 1 | `face.shape.rectangular` | Rectangular | หน้าทรงสี่เหลี่ยมผืนผ้า |
| 2 | 2 | `face.shape.heart` | Heart | หน้ารูปหัวใจ |
| 2 | 3 | `face.shape.inverted_triangular` | Inverted Triangular | หน้าสามเหลี่ยมกลับหัว |
| 2 | 4 | `face.shape.long` | Long | หน้ายาว |

`Hearth` is treated as a spelling error. The canonical label and slug are `Heart` and `heart`.

### 5.2 Anatomical Meaning

- `Heart` means a broader upper face tapering through the jaw to a soft narrow chin. It must not have a heart-shaped notch or literal heart outline.
- `Diamond` means the cheekbone area is widest while forehead and jaw are narrower. It must remain a natural human contour.
- `Inverted Triangular` means a broader upper face tapering to a narrower jaw/chin. It must not be a literal triangle.
- `Square` and `Rectangular` retain softened anatomical corners rather than geometric right angles.
- `Long` is an elongated human face, not a capsule symbol.

These descriptions are semantic constraints for all future prompts and manual corrections.

## 6. Source Sheet Profiles

### 6.1 Preferred Generated Set

For a new 4x2 set:

| Property | Standard |
|---|---|
| Canvas | 2048 x 1024 |
| Grid | 4 columns x 2 rows |
| Logical cell | 512 x 512 |
| Background | uniform pure white |
| Line/fill | single charcoal/black tone |
| Safe area | at least 48 px inside each cell |
| Format | PNG, sRGB |

For a 3x3 category, use 1536 x 1536 so each logical cell remains 512 x 512.

### 6.2 Supplied or Irregular Set

An accepted source sheet does not need exact grid dimensions if the manifest supplies explicit pixel bounds for each item. Before publishing:

1. record actual source width/height
2. define one rectangle per option
3. crop each rectangle
4. normalize content into a square 512 x 512 master slice
5. align visual center/baseline using the field profile

This allows the supplied Face Shape image to be used without regenerating it solely to reach 2048 x 1024.

## 7. Runtime Asset Profiles

| Profile | Dimensions | Format | Purpose |
|---|---:|---|---|
| Master slice | 512 x 512 | transparent PNG | approved normalized source |
| Preview | 256 x 256 | transparent PNG/WebP | picker detail/large card |
| Thumbnail | 128 x 128 | transparent PNG/WebP | compact grid |

For line art, PNG may be smaller and cleaner than photographic WebP. The future build tool should compare output size/quality and use the manifest-declared format consistently for the field.

Runtime assets must:

- remove the white source background to alpha
- retain antialiased edges without white fringe
- preserve a stable visual center and padding
- contain no labels or decorative marks
- support CSS mask recoloring when `recolorMode` is `mask`

## 8. Recoloring Contract

MVP uses one-color alpha artwork:

```css
.visual-option-icon {
  background-color: var(--visual-option-color);
  mask: var(--visual-option-url) center / contain no-repeat;
  -webkit-mask: var(--visual-option-url) center / contain no-repeat;
}
```

Rules:

- Use alpha shape as the mask; runtime source color is not meaningful.
- Default, hover, selected and disabled states change CSS color, not image files.
- Multi-tone shading is deferred because one mask cannot preserve independent tones.
- A future two-color system requires separate primary/accent layers or SVG variables and is a new manifest capability.

## 9. Manifest Contract

```json
{
  "schemaVersion": 1,
  "manifestId": "headshot.face-structure.face-shape",
  "fieldId": "face.shape",
  "sectionId": "face-structure",
  "visualStyleVersion": "headshot-illustrated-v1",
  "assetFamily": "illustrated-set",
  "recolorMode": "mask",
  "sourceSheet": {
    "filename": "face-shape-set-r1.png",
    "revision": 1,
    "rows": 2,
    "columns": 4,
    "sliceStrategy": "explicit-bounds",
    "width": null,
    "height": null
  },
  "runtimeProfiles": {
    "master": { "width": 512, "height": 512, "format": "png" },
    "preview": { "width": 256, "height": 256, "format": "png" },
    "thumb": { "width": 128, "height": 128, "format": "png" }
  },
  "items": [
    {
      "assetId": "visual.face.shape.oval",
      "optionId": "face.shape.oval",
      "slug": "oval",
      "row": 1,
      "column": 1,
      "sourceBounds": null,
      "assetRevision": 1,
      "overrideFilename": null,
      "focalPoint": "50% 50%",
      "alt": {
        "en": "Outline of an oval human face shape",
        "th": "เส้นโครงหน้ามนุษย์รูปไข่"
      },
      "reviewStatus": "source-selected"
    }
  ]
}
```

The actual file dimensions and `sourceBounds` are filled when the source image exists in the workspace.

## 10. Override Contract

If one cell is incorrect:

```text
source-sets/.../face-shape-set-r1.png
source-sets/.../overrides/heart-r2.png
```

The manifest updates only that item:

```json
{
  "optionId": "face.shape.heart",
  "assetRevision": 2,
  "overrideFilename": "heart-r2.png"
}
```

Build priority:

```text
approved override
  -> source sheet slice
  -> text/placeholder fallback
```

An override must follow the same 512 x 512 content alignment and monochrome visual contract. It does not require a new category sheet revision.

## 11. Prompt Pattern for New Sets

### 11.1 Shared Illustrated-set Prompt

```text
Create one clean source sheet for a visual character builder.
Category: {FIELD_LABEL}.
Layout: exactly {COLUMNS} columns by {ROWS} rows, one option centered in each
equal cell, ordered left-to-right and top-to-bottom according to the supplied
manifest.

Style: elegant flat vector-like beauty-app illustration, monochrome charcoal
line/fill artwork on a perfectly uniform white background. Use consistent
stroke weight, scale, baseline, padding and negative space. Every cell must be
independently sliceable.

For each option, change only {VISUAL_AXIS}. Keep all shared anatomy and layout
properties stable. Interpret category names as natural human anatomy, never as
literal geometric symbols.

No text, label, letter, number, caption, border, divider, logo, watermark,
shadow, gradient, texture, decorative mark or extra icon.
```

### 11.2 Face Shape Constraints

The Face Shape prompt must include the anatomical meanings in Section 5.2 and explicitly forbid literal heart, diamond, square, rectangle or triangle outlines.

### 11.3 Style Reference

- New category prompts reference the approved `headshot-illustrated-v1` Face Shape set for line weight, canvas treatment, spacing and visual polish.
- Reference controls style only; field-specific anatomy comes from its own option descriptions.
- Do not copy labels, arrangement or irrelevant anatomy from another category.

## 12. Contributor Handoff

Before image work, Engineering supplies:

1. category manifest
2. exact option order
3. one Master Prompt plus option-specific meanings
4. recommended canvas/grid dimensions
5. source sheet filename
6. override filenames when correction is requested

The user supplies one category sheet, not one file per option. The user may slice manually, but the intended pipeline performs deterministic slicing and derivative generation.

The user does not need to create preview and thumbnail files. Engineering reports only cells that fail technical or semantic review.

## 13. Build Pipeline Requirements

The future build tool must:

1. validate manifest schema and option IDs
2. read the source sheet dimensions
3. validate row/column uniqueness and explicit bounds
4. crop each cell or use its approved override
5. remove uniform white background with soft antialiased alpha
6. normalize each icon to the declared 512 x 512 alignment profile
7. generate preview and thumbnail derivatives
8. strip EXIF/GPS and unnecessary metadata
9. calculate source and derivative hashes
10. generate runtime field manifest and global manifest index
11. create a labeled review contact sheet outside runtime assets
12. publish through temporary files and atomic rename
13. never overwrite a published revision

The existing `sharp` dependency may be reused. Visual assets remain a separate pipeline from generated-image history thumbnails.

Suggested future commands:

```text
npm run visual-assets:check
npm run visual-assets:slice -- --field face.shape
npm run visual-assets:contact-sheet -- --field face.shape
```

These commands are scaffolded for the Face Shape pilot:

```text
npm run visual-assets:check
npm run visual-assets:slice -- --field=face.shape
npm run visual-assets:contact-sheet -- --field=face.shape
```

`visual-assets:slice` requires the selected source sheet at:

```text
visual-assets/character-builder/source-sets/headshot-v1/face-structure/face-shape/face-shape-set-r1.png
```

The current slicer supports grid-based 4x2 slicing first. Explicit per-item bounds remain available in the manifest when the selected source sheet needs manual crop correction.

## 14. Validation

### Blocking

- duplicate/missing option IDs
- duplicate row/column assignment
- missing source sheet or approved override
- bounds outside source canvas
- wrong option count for declared grid
- source cell containing text, label, border or unrelated mark
- runtime icon with opaque white background when mask mode is required
- missing bilingual alt text
- unsafe SVG/embedded external resources in future vector sources
- published URL changed without revision increment
- path traversal outside approved roots

### Warning

- inconsistent line thickness or visual scale
- anatomy too similar to another option
- anatomy interpreted as a literal geometric shape
- unusual padding/focal alignment
- edge halo after background removal
- unused source or override file

### Human Review

- semantic meaning is understandable
- differences remain visible at 128 x 128
- anatomy is believable and not misleading
- visual language matches the approved set
- option order and labels match the manifest

## 15. Runtime and Fallback

- Load only the active field manifest and visible thumbnails.
- Resolve all URLs through the runtime manifest.
- Reserve stable square dimensions to prevent layout shift.
- Missing/broken icon shows a neutral placeholder and text label.
- Asset failure never removes the semantic option or blocks generation.
- Legacy dropdown values require no icon.
- Selected state uses CSS color and border/state indicators, not a duplicate selected image.

## 16. Versioning

- `visualStyleVersion` changes when the whole illustration language changes.
- Source sheet revision changes when the category sheet changes.
- Item `assetRevision` changes when one slice/override changes.
- Semantic meaning changes require a new `optionId`.
- Published runtime URLs are immutable.
- Runtime manifest/index may revalidate and point to newer immutable revisions.

## 17. Production and Database Migration

Near production:

- authoring manifests import into versioned asset tables
- source sheets and overrides move to private object storage
- runtime slices move to public object storage/CDN
- database stores `assetId`, `optionId`, style version, sheet/item revision, bounds, hashes, status and URLs
- user configuration continues referencing `optionId`, never a source sheet coordinate or filename
- rollback changes the published manifest pointer instead of mutating historical files

File-based manifests remain valuable for review, source control and environment bootstrap.

## 18. Security and Rights

- Strip metadata from raster outputs.
- Reject SVG scripts, external URLs, embedded HTML and event handlers.
- Record rights/source for non-project artwork.
- Do not automatically turn user uploads into shared Visual Options.
- Public runtime manifests do not expose local source paths, prompts, reviewer identity or internal provider payloads.
- Generated sets should be original and use references for visual direction, not direct copying.

## 19. Approved Pilot Decisions

Approved on 2026-07-17:

1. MVP uses illustrated monochrome set assets instead of photographic option tiles.
2. Authoring is set-first and runtime remains item-based.
3. Face Shape uses a 4x2 source sheet with eight options in Section 5.1 order.
4. White source background is converted to transparent alpha for runtime recoloring.
5. Individual override may replace one incorrect slice.
6. Future categories reuse this set as the style reference.

The supplied image is selected as the pilot visual source/reference. Slicing implementation is scaffolded. Before producing runtime slices, the image must exist as a workspace source file at the approved source path.

## 20. Acceptance Criteria

- One category source sheet can produce independently addressable runtime icons.
- Face Shape order and semantic IDs are fixed and documented.
- Heart/Diamond/Inverted Triangular remain human anatomy, not literal shapes.
- Runtime icons can change color using CSS without duplicate colored files.
- One incorrect cell can be replaced without regenerating the category sheet.
- Missing slices preserve text fallback and generation behavior.
- Authoring sources remain outside the public web root.
- The contract can migrate to database/object storage without changing user configuration IDs.
