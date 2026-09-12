# Fallback And Named Images Delivery

Status: implementation and isolated validation complete; paid user UAT pending.
Owners: [016](016-local-look-sheet-url-fallback.md),
[017](017-multiple-named-start-images.md). No live data migration or paid generation.

## Ordered Tasks

- [x] T1 Implement signed URL expiry recognition and local sheet-only transport in
  TrustedGeneratedSourceService; share with Cinematic and Playground. Retain
  provenance and content checks; preserve safe transport diagnostics.
- [x] T2 Extend named general-image purpose, plan validation, prompt legend and
  fingerprints. Ensure one-frame versus all-reference semantics and count parity.
- [x] T3 Extend Playground versioned draft and source selection. Reuse frame
  pickers in a cohesive multi-image component; names/add/remove and model guards.
- [x] T4 Domain/flow tests with realistic metadata-only Asset hashes; expiry,
  negative security cases, multiple transport, quote/reserve/dispatch and sanitization.
- [x] T5 UI/schema/types/i18n and browser responsive verification with isolated
  fixtures. Do not start a paid task or modify live user records.
- [x] T6 Review scoped diff and record exact evidence and residual live UAT gaps.

## Validation Entry Points

Extend scripts/test-playground-video-references.mjs with fallback/named-images
focused groups and include them in explicit all. Existing contract, trusted,
regression, ui, types and layout groups remain available. Run
node scripts/test-cinematic-video.js references for Cinematic reference parity.
Visual runner uses source Vite (separate free port if needed) and intercepted
APIs; record screenshots for desktop/tablet/mobile. Aggregate must fail on error.
Provider acceptance and visual likeness are separate optional paid user UAT.

## Architecture And Rollout

No new provider pipeline, Credit owner, runtime path, polling loop or persistent
reference cache. New UI belongs to web/src/features/playground/components;
resolver remains server/domain/generation. Retain server-owned validation on every
submission and no client-supplied arbitrary base64 fallback. Restart backend and
rebuild served frontend before live UAT; do not interrupt active paid jobs.

## Evidence

T1-T4: fallback 5, named-images 2, named-looks 3 focused tests passed. Full
Playground all aggregate passed including 31 trusted, 22 contract, 104 regression,
55 UI tests and TypeScript. Some focused groups overlap with the aggregate.
Cinematic references: 21 passed. i18n passed.

T5: actual React workspace with intercepted APIs passed EN/TH at 390/820/1440px
for ordinary and trusted Start images. Tested previews, add/select/cancel/remove,
rename/requote, draft reload, one-frame restoration, duplicate exclusions and no
overflow/unresolved translation keys. Screenshots: OS temp
mpf-video-references-layout-mWOAwf (trusted), mpf-video-references-layout-LqrjvO
(ordinary). Desktop and mobile visually inspected.

Read-only real-source smoke check: reported Cast jobs job_1789050437763_gv14a11r4
and job_1789050227063_p2qxfawi9 both resolve through the actual service to base64
with fallbackCode=trusted_look_url_expired. Decoded bytes: 2073126 and 2045571;
SHA-256 matches both pinned originals. No provider call, Credit or runtime write.

T6: scoped Backend/security and QA review performed sequentially, not independently.
Final all aggregate and npm.cmd run build:web passed. Build required permission
to update the existing TypeScript cache files; existing large-chunk warning remains.
One intermediate aggregate run timed out in the existing CharacterLookDialog
approval test; the final rerun passed all 55 UI tests without changing that test.
This intermittent timing failure remains a test reliability risk.
Adjacent named Look Sheet browser checks passed EN/TH at 390/820/1440px:
mpf-video-references-layout-3no2kR. i18n and git diff --check passed.
No runtime data paths changed and no live backend/worker restart was performed.
Restart the backend after active jobs finish to load the new resolver.
Base64 acceptance and visual quality on Seedance remain paid user UAT, not proven here.
