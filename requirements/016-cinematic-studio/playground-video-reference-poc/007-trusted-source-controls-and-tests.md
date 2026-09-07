# 007 Controls And Verification

- Reuse existing Dialog primitives and authenticated media. Playground owns one
  generated-output picker for both slots, paginated, actor/model scoped.
- Restricted models render only Choose generated image, selected original local
  preview and Remove; no Character library, approved-look picker, upload or URL.
- Display model, source mode, expiry, remaining validity and reason when blocked.
  Explain trust lifetime vs URL availability. Server alone decides eligibility.
- Switching models never silently changes selected provider or sends stale upload
  selections. Keep other-model sources in their existing draft fields; separate
  trusted selections store only source IDs and safe preview/expiry, not URLs.
- Invalidate selected eligibility on model/actor changes and after terminal task;
  live server quote/submit remains authoritative even if browser status is stale.
- EN/TH, keyboard/Escape/focus, 390/820/1440, no sibling redesign or source changes
  in Image/Cinematic. Existing source controls remain for other providers/models.

Verification groups under scripts/test-playground-video-references.mjs:
trusted (capture/repository/domain/route policy, negative legacy/API cases), ui,
contract (nonrestricted existing paths), regression, types and layout. Explicit
all aggregates isolated groups; live POC is user-triggered only.
Required negative cases: foreign/deleted, timestamp absent/future/expired,
wrong model/mode/account, forged URL/upload, mode switch, unreadable/changed URL,
mixed roles, stale quote, original URL leakage and provider privacy rejection.
Manual UAT after backend restart: generate supported Seedream 5.0 Lite/Pro image
without references, select its original output in one slot, inspect quote and one
provider result; then repeat with a newly generated I2I output and pair of eligible
originals. No provider acceptance guarantee and no image/provider auto replacement.
