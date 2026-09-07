# 003 Focused Verification And Manual POC

Implement scripts/test-playground-video-references.mjs with contract, ui, types,
layout and explicit all groups. Never start workers or issue paid requests.

Contract: first-frame one image; scene+Look exactly two ordered references;
Look-only one reference; no mixed roles/foreign files/missing images/version
mismatch; changed hash/revoked Look rejected before reservation; quote/dispatch
count parity; existing Cinematic and legacy video tests.

UI: reuse picker, actual display vs reference images, approved default/manual
replacement, no-Look error recovery, actor/late upload isolation, retained model,
unsupported mode reason, quote staleness and duplicate/active-task prevention.
Layout: intercepted APIs at 390/820/1440, preview images render, no page overflow,
no real uploads/provider calls; image Playground remains untouched.

Manual POC (user only): inspect input images, model, transport mode, resolution,
duration/audio, roles/count and exact quote. Submit one clip; collect task ID,
provider request ID, status/error and output if completed. Compare original image
hashes with submitted references. A moderation rejection is evidence, not a reason
to edit the person's appearance or switch provider automatically.

## Verification Evidence (2026-09-07)

- `node scripts/test-playground-video-references.mjs contract`: 17 passed.
  Ordered scene/Look and first-frame payloads, original upload bytes, URL-first
  transport/fallback parity, invalid dimensions, actor/hash/version protection.
- `node scripts/test-playground-video-references.mjs regression`: 58 passed.
  Existing Character Look, catalog, application, routes and provider-task behavior.
- `node scripts/test-playground-video-references.mjs ui`: 22 passed.
  Shared picker, approved/default/uploaded sheet, late actor response, unsupported
  model retention, expired quote refresh, duplicate guard and terminal support IDs.
- `node scripts/test-playground-video-references.mjs types`: passed.
- Scoped ESLint, `node scripts/validate-i18n-catalogs.js`, and
  `git diff --check`: passed. Existing Engine test logs its pre-existing missing
  i18next test instance warning; no assertion failures.
- `node scripts/test-playground-video-references.mjs layout`: 6 checks passed.
  EN/TH at 390/820/1440, both bitmap previews loaded, zero horizontal page
  overflow or clipped reference buttons, source switching keeps exact role/count.
  Screenshots inspected at desktop/mobile; tablet measurements and capture passed.
  Artifacts: C:/Users/punya/AppData/Local/Temp/mpf-video-references-layout-agoV3P/.
  Synthetic references use an existing local bitmap; they are not real approved
  Character or provider-qualification evidence. All API mutations except fixture
  quote are blocked. No backend workers, GCS uploads or paid submissions started.

## Re-run And Remaining Gates

Use each group above for fast checks; `node scripts/test-playground-video-references.mjs all`
runs contract/regression/UI/types, not the whole repository. Layout is separate
and requires Vite on localhost:5173, or set VIDEO_LAYOUT_ORIGIN to a local Vite URL.
Its API fixtures isolate the check from live runtime data.

Backend localhost:6500 returned ECONNREFUSED at handoff. After starting/restarting
the normal application, verify real owned approved Look selection and the chosen
Seedance model's current catalog exposure/quote before the user-run one-clip POC.
No feature flag, pricing, provider activation or paid-routing gate was changed.
Old open quotes may require refresh because Character attribution is now bound
into the request fingerprint. Production Seedance qualification remains pending.

Review decision: conditional pass for the implemented deterministic POC controls;
not a live-provider acceptance claim. Product/Backend/QA reviews were applied
sequentially by one agent, not independently. Image Playground and shared picker
source were not redesigned. BytePlus support investigation remains pending.
