# Black Comparison Export

Status: implemented and verified; evidence in 029. Owner: Assets, reading Comparison and Generation public facades.

## Image Contract

- Compose authorized originals, never screenshots, thumbnails or regenerated AI.
- Six presets: portrait 2/3 => 2x1/3x1; landscape 2/3 => 1x2/1x3;
  four images always 2x2. Preserve source order and equal image/caption frames.
- Auto derives orientation and ratio from decoded, EXIF-normalized dimensions.
  Mixed/square uses first image ratio with contain and a preview notice.
  Existing viewer override maps to portrait/landscape export frames (3:4/16:9).
  Default export is Auto, independent of responsive viewport or viewer pan/zoom.
- Black #050505, margin 24, gap 16; source frame base portrait height 960,
  landscape width 1280, square 960. Caption minimum 72; footer 64.
- No cropping, rounding image pixels, stretching, sharpening or AI enhancement.
  No upscale by default, including physical pixels at High 2x; low resolution
  is centered and reported. Do not promise additional detail or byte identity.
- Provider 14/18 and model 22/28, semibold, left-aligned below each image.
  Shared caption height; measure actual bundled fonts, wrap grapheme-safely,
  no ellipsis. Up to four width-expansion retries for >4 model lines; reject
  excessive metadata (256 graphemes/field) rather than clipping or faking labels.
- Footer divider and official logo centered with exact `comparison by Momelo`.
  Logo required for Comparison even if optional Look Sheet branding is disabled.
  No website chrome, prompt, price, votes, debug fields or background gradient.
- PNG default / JPEG quality 95; Standard 1x / High 2x. Validate encoded format,
  dimensions and budgets. Preview and Download use the same final encoded bytes.

## Authority And Limits

- Keep MediaExportService as the sole application entry, resolving run and jobs
  through existing owner facades. Client never submits file paths or fetch URLs.
- 2-4 selected completed images. For legacy 5/6-output runs, explicit output
  selection in the dialog is required, not silently truncating to four.
- Existing partially completed runs may export their explicitly shown completed
  outputs; any failure to resolve a selected source fails the whole export.
- Max 8192px/side, 24M output pixels, 16M decoded pixels per image, 64M total,
  30 MiB/source. Keep service aggregate byte/active-operation bounds and timeout.
- Missing fonts/logo, unauthorized/changed files, corrupt/animated images,
  cancellation or resource overflow produce actionable errors, no partial file.
- Media remains private, no-store; metadata headers contain only sanitized
  preset, dimensions and warning codes. No raw private URLs in metadata/logs.
- Original Look Sheet renderer behavior and its config limits stay unchanged.
