# Studio Realism And Video Reference Hardening

Date: 2026-09-07. Status: implemented and deterministically verified; live UAT pending.
Primary: Product Requirement Architect. Backend and QA review sequentially;
review independence is limited. Skills: review-generative-media-pipeline,
implement-generation-workflow, review-product-ux, verify-release-regressions.

## Delivery Order

1. [x] [001 Studio realism](001-studio-natural-realism.md): deterministic compiler
   profile and scope/identity/layout tests. No paid AI call.
2. [x] [002 Video selection](002-video-reference-selection.md): server authority,
   reference alternatives, existing History picker contract, focused UI tests.
3. [x] [003 Git hygiene](003-runtime-git-hygiene.md): ignore rules, index-only
   runtime cleanup, read-only guard. Never remove local runtime files.
4. [x] Run focused checks and responsive layout checks; record evidence here.

## Evidence And Review

Final commands: `node scripts/test-studio-video-hardening.mjs all`,
`node scripts/test-playground-video-references.mjs layout`,
`node scripts/test-playground-video-references.mjs layout-trusted`,
`npm.cmd run i18n:validate`, `npm.cmd run build:web`, `git diff --check`.

- Realism: Studio allowlist, profile version, idempotent application, distance
  details, preservation instructions, optional refinement and sheet persistence.
- Video: ownership/deleted/private-artifact guards, canonical Character source,
  mutual exclusion, original-byte hashing, quote/submit parity and post-quote
  revocation. Existing Seedance trusted-only and Cinematic tests still pass.
- UI: generated picker provider diversity, pagination/retry, Character/Look
  replacement and existing Job Center/Look lifecycle tests pass.
- Layout: generic and trusted checks pass in EN/TH at 390, 820 and 1440px.
  Generic screenshot evidence: `%TEMP%/mpf-video-references-layout-dkGj9x`;
  trusted: `%TEMP%/mpf-video-references-layout-vrJeAK`. No clipping/overflow,
  both previews loaded. APIs intercepted; no paid provider execution.
- `npm.cmd run build:web` passed after allowing TypeScript cache writes;
  existing >500kB bundle warning remains outside this scope.
- 36 runtime files removed from index only; all 36 verified present on disk.
  Only README remains tracked under server/data. No runtime schema/path change.
- Sequential Backend/QA review, not an independent reviewer. Release decision:
  deterministic implementation ready; visual realism and provider moderation
  qualification remain user-run UAT. Fresh-clone identity bootstrap remains a
  separate MVP foundation dependency, not supplied from private local records.

Each step extends canonical owners; no new provider dispatch, pricing, queue,
storage service or polling. No database migration or unrelated page redesign.
Architecture ownership remains generation, playground, character-profiles and
existing config/prompt-recipes. Scripts belong to scripts/, tests to test/.

## Validation Plan

`node scripts/test-studio-video-hardening.mjs realism|video|ui|hygiene|types|all`
provides short isolated groups and an explicit aggregate for UAT preparation.
Layout: existing `node scripts/test-playground-video-references.mjs layout`
against a running local UI with intercepted APIs, at desktop/tablet/mobile.
No runner may issue paid generation, restart workers or mutate live JSON.
User-run A/B image quality and live video moderation are separate pending UAT.

## Pending External Qualification

Case 1: user reports text-only Seedream output -> Seedance video succeeded.
Case 2: image-reference-derived output rejected with
`InputImageSensitiveContentDetected.PrivacyInformation` on `content[1]`.
Request ID: `021788782867851f9cb936a41ab283113693068986f31c39807e2`.
User will contact BytePlus about Asset Library/access. This is evidence for one
attempt, not proof that all Seedance references are unsupported. Keep existing
trusted-source, expiry and capability checks; do not invent Asset authorization,
register assets, upload to a new service or promise moderation acceptance.
