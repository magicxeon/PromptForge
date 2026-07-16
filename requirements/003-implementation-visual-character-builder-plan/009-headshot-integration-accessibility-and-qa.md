# Headshot - Integration, Accessibility and QA

**Status:** Proposed  
**Sequence:** 009  
**Depends on:** 001-008

## Objective

กำหนด release gate ของ Headshot MVP ให้ visual workflow ทำงานร่วมกับ state, presets, prompt compiler, providers และ accessibility เดิมอย่างครบถ้วน

## Integration Scope

- Save and restore by mode
- Presets and randomization
- Field locks
- Import/export configuration
- History and regenerate
- Comparison flow where supported
- Provider/model capability validation
- Prompt preview and authoritative server compilation
- Feature flag and legacy dropdown fallback

## Persistence Rules

- Store semantic IDs, schema version and recipe version.
- Do not store localized labels as canonical values.
- Do not require an asset file to restore a selection.
- Unknown/deprecated IDs remain visible as recoverable warnings.
- Configuration migrations are deterministic and testable.

## Performance Budget

- Initial Studio load must not fetch every visual asset.
- Load thumbnails for the active/open section only.
- Lazy-load preview assets on demand.
- Reserve image dimensions to avoid layout shift.
- Cache immutable versioned assets.
- Contact-sheet/admin assets must not ship in the user bundle.

## QA Matrix

- desktop and mobile
- Thai and English
- mouse, touch and keyboard
- normal, loading, missing and corrupt asset
- reduced motion
- saved legacy configuration
- provider with pixel dimensions
- provider with resolution presets
- generation success, moderation failure and provider validation error

## Human Visual QA

Automated checks cannot approve semantic correctness. Every completed field requires a human-reviewed contact sheet confirming:

- only the intended property changes
- no anatomy artifacts or misleading examples
- representation and terminology are acceptable
- crop and contrast work at actual UI size

## Release Acceptance

- Headshot can be completed end to end without prompt typing.
- Existing advanced generation paths remain functional.
- Missing assets do not block selection, restore or generation.
- Automated contract/integration checks pass.
- Product owner accepts every MVP visual field.

