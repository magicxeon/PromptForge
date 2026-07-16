# Phase 2-16 Marketplace Export Presets

**Status:** Proposed - Platform Specifications Must Be Verified Before Implementation

## 1. Business Requirement

Small merchants export approved images for target channels without manually understanding dimensions, aspect ratios, filenames or safe areas.

## 2. Export Preset Contract

- Preset ID/version and target channel
- Output dimensions/aspect ratio
- File type and quality
- Safe-area/crop policy
- Background requirements
- Maximum file size
- Naming convention
- Watermark/brand overlay policy if enabled

Examples include marketplace product image, Instagram post/story, TikTok cover, Facebook ad and web banner. Exact current platform requirements must be researched from primary platform documentation during implementation.

## 3. Export Flow

```text
select approved outputs -> choose target preset
-> preview crop/safe area -> render derivatives
-> validate -> package files and manifest -> download
```

Export derivatives do not replace originals.

## 4. Product/Project Organization

- Group export folders by SKU/Product.
- Deterministic sanitized filenames.
- Include optional manifest mapping Product, source result and preset version.
- Export only resources authorized within the Project.

## 5. Processing

- Small synchronous exports may complete immediately.
- Large exports use durable non-image-generation jobs.
- Export processing is separately priced only if product policy requires it; quote before charging.
- Avoid upscaling or destructive crop without warning.

## 6. Acceptance Criteria

- Only approved outputs export by default.
- Preview matches final crop and safe area.
- Original result remains unchanged.
- Export manifest identifies source and preset version.
- Invalid/oversized output is reported per file without corrupting the full package.
- Platform presets are versioned and their source/spec verification date is documented.

