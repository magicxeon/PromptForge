# UI - Shared Visual Controls and Interaction

**Status:** Shared Visual Picker Scaffolded  
**Sequence:** 003  
**Depends on:** 001, 002

## Objective

สร้าง renderer และ interaction components กลางที่ใช้ซ้ำทุก section โดยเปลี่ยนชนิด control จาก schema/manifest ไม่สร้าง component ใหม่ต่อ option หรือ category

## Implementation Contract

Current implementation scaffolds the first shared renderer through `client/visual-controls/visualOptionControls.js`. `client/app.js` only keeps thin integration wrappers so the main application flow remains compatible. Face Shape is the first fixture field. Additional visual fields should register a config entry, manifest URL and option mapping in the shared visual-control module rather than duplicating renderer code.

Each visual field is declared once:

```js
{
  key: "Face::Face Shape",
  group: "Face",
  field: "Face Shape",
  controlType: "visual-card-picker",
  manifestUrl: "/assets/visual-character-builder/headshot-v1/face-structure/face-shape/manifest.json",
  optionMap: {
    "face.shape.oval": "face.002"
  }
}
```

Rules:

- `key` must be `{group}::{field}` and match the existing UI schema.
- `manifestUrl` points to a runtime public manifest under `client/assets/visual-character-builder`.
- `optionMap` maps stable visual semantic IDs to the current attribute IDs used by prompt compilation.
- The existing dropdown remains in the DOM and is the source of truth for saved state, presets, import/export and prompt preview.
- The visual picker dispatches a normal `change` event on the dropdown instead of compiling prompt text itself.
- Missing manifest means the field renders as the original dropdown only.
- Missing option mapping renders a disabled missing-state card and never blocks the dropdown.

## Supported Controls

| Control | Use case |
|---|---|
| Visual card picker | Face shape, eyes, nose, lips, hair style |
| Diagram picker | Geometry, framing, body silhouette |
| Swatch | Hair, eyes, skin and clothing color |
| Segmented control | Small mutually exclusive sets |
| Labeled slider | Continuous intensity with clear endpoints |
| Searchable gallery | Large future libraries |
| Upload/reference control | User-owned face or clothing image |
| Compact select fallback | Missing visual or advanced technical value |

## Interaction Pattern

- Main section shows selected summary and compact option grid.
- Large option sets open a desktop dialog or mobile bottom sheet.
- Card contains visual, plain-language label and selected state.
- Detail view may show larger preview and short effect description.
- Controls support Clear, Reset section and restore default.
- Advanced terminology is hidden behind optional details.
- Selection updates the same state used by existing prompt compilation.

## Shared States

- default
- hover
- keyboard focus
- selected
- disabled/incompatible
- loading
- missing asset fallback
- deprecated saved value

State styling must not rely on color alone.

## Responsive and Accessibility

- Stable grid dimensions prevent layout shifts while images load.
- Full previews lazy-load; initial section loads thumbnails only.
- Keyboard supports arrow navigation, Home/End and Enter/Space selection for visual card pickers.
- Dialog and bottom sheet manage focus correctly.
- Images use manifest alt text; decorative assets use empty alt.
- Thai and English labels fit without overlapping controls.
- Reduced motion is respected.

## Current Fixture

Face Shape uses `visual-card-picker` and the approved eight-option manifest:

```text
client/assets/visual-character-builder/headshot-v1/face-structure/face-shape/manifest.json
```

The runtime picker currently uses CSS mask recoloring and thumbnail assets. The dropdown remains visible as a compact fallback during MVP review.

## Compatibility

- Existing dropdown remains a fallback renderer.
- Existing locks, randomization and presets address semantic IDs.
- UI does not compile provider prompt fragments itself.
- Missing visual metadata does not prevent field rendering.
- Custom values are allowed only for fields explicitly declaring support.

## Acceptance Criteria

- One fixture field can switch between dropdown and visual picker with identical saved state and prompt meaning.
- Every shared state is visually testable.
- Adding a manifest-backed option does not require HTML or component changes.
- Mobile and desktop expose equivalent selection capability.

