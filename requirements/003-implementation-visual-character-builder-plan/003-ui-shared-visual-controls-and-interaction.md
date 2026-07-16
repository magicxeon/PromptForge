# UI - Shared Visual Controls and Interaction

**Status:** Proposed  
**Sequence:** 003  
**Depends on:** 001, 002

## Objective

สร้าง renderer และ interaction components กลางที่ใช้ซ้ำทุก section โดยเปลี่ยนชนิด control จาก schema/manifest ไม่สร้าง component ใหม่ต่อ option หรือ category

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
- Keyboard supports arrow navigation where appropriate, Enter/Space selection and Escape close.
- Dialog and bottom sheet manage focus correctly.
- Images use manifest alt text; decorative assets use empty alt.
- Thai and English labels fit without overlapping controls.
- Reduced motion is respected.

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

