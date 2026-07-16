# Assets - Visual Standard and Pipeline

**Status:** Proposed  
**Sequence:** 002  
**Depends on:** 001 Foundation Domain and Attribute Contract

## Objective

สร้าง visual pattern, folder structure และ handoff workflow เดียวกันทั้งระบบ เพื่อให้ asset ที่สร้างโดย AI, Codex หรือผู้ใช้สามารถวางลงระบบได้โดยไม่ต้องแก้ UI เฉพาะรายการ

## Canonical Folder Structure

```text
client/assets/visual-configurator/
  shared/
    placeholders/
    ui-icons/
  headshot/
    face-structure/
      face-shape/
        manifest.json
        source/
        preview/
        thumb/
      jawline/
      chin/
      cheek-structure/
    facial-features/
      eyes/
      eyebrows/
      nose/
      lips/
    hair/
      length/
      style/
      texture/
      parting-fringe/
    appearance/
      skin/
      makeup/
      expression/
  character-reference/
    body-shape/
    clothing/
    patterns/
```

`source/` may be excluded from production delivery when source files are large. Runtime code loads only `preview/` and `thumb/`.

## Naming Pattern

```text
{option-slug}.webp
{option-slug}.png
{option-slug}.svg
```

Example:

```text
preview/oval.webp
thumb/oval.webp
```

Filename uses lowercase kebab-case and is declared in the manifest. Semantic identity remains `face.shape.oval`.

## Asset Profiles

| Profile | Size | Format | Purpose |
|---|---:|---|---|
| Thumbnail | 320 x 320 | WebP | Grid browsing |
| Preview | 768 x 768 | WebP | Detail view |
| Recolorable icon | viewBox or 256 x 256 | SVG or transparent PNG | CSS color/mask |
| Source | At least 1024 x 1024 | Working format | Crop and future export |

All images within one field use the same aspect ratio, focal point strategy, background and safe area.

## Recoloring Rules

- Prefer SVG with `currentColor` for code-safe icons.
- Monochrome transparent PNG may use CSS `mask-image`.
- Do not recolor photographic face, hair or skin assets with CSS.
- Use CSS swatches for pure color choices.
- Produce separate images only when color changes texture, highlight or material appearance materially.

## Manifest Contract

Each field has one `manifest.json`:

```json
{
  "schemaVersion": 1,
  "fieldId": "face.shape",
  "visualStyleVersion": "headshot-v1",
  "profile": "photographic-option",
  "dimensions": { "thumb": [320, 320], "preview": [768, 768] },
  "items": [
    {
      "optionId": "face.shape.oval",
      "filename": "oval.webp",
      "alt": { "en": "Oval face structure", "th": "โครงหน้ารูปไข่" },
      "focalPoint": "50% 42%"
    }
  ]
}
```

## Prompt Pattern for Asset Creation

Every category receives:

- one immutable Master Visual Prompt
- fixed subject, crop, camera, light, background and rendering style
- one per-option `visualDifference`
- negative constraints preventing text, logos, collage and unintended changes
- a generation manifest recording prompt version and review status

Only `visualDifference` may change between options in the same field.

## Asset Workflow

1. Engineering publishes option inventory and empty manifest.
2. Engineering writes Master Visual Prompt and three representative option prompts.
3. Create a three-to-five-image prototype set.
4. Product owner approves visual direction and semantic clarity.
5. Produce the remaining field assets.
6. Crop/normalize into approved profiles.
7. Place files using manifest filenames.
8. Run asset validation.
9. Perform human contact-sheet review.
10. Mark manifest items approved.

## Validation

Validator must report:

- missing or extra files
- wrong dimensions/aspect ratio
- duplicate option IDs or filenames
- missing bilingual alt text
- unsupported format or excessive file size
- manifest option not found in attribute data
- attribute visual option not found in manifest

## Acceptance Criteria

- A contributor can place correctly named assets without editing application code.
- A broken or absent image has a neutral fallback and does not block selection.
- Asset generation cannot start as a large batch before prototype approval.
- Asset source, prompt version and approval status are traceable.

