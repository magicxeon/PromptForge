# Multiple Named Video Look Sheets

Status: scoped implementation verified; paid likeness UAT remains pending.
Owner: Playground Video through Generation.
Primary: Product Requirement Architect; Backend and QA review sequentially.
UX, reference privacy and commercial parity checks included in those reviews.
Skills: implement-generation-workflow, review-product-ux,
review-generative-media-pipeline. No independent reviewer available.

## Scope

Extend the current video source controls for every model whose effective catalog
supports multimodal references. Multiple sheets require ordered-reference support
AND a sufficient referenceImageLimit. Single-reference models still allow one
sheet and an optional name. Do not change capability/qualification/pricing gates,
provider adapters, cinematic Cast/Shot ownership or Generation/Credit entry points.
Keep first-frame, Character picker, upload, History selection and approved Looks.

## Rules

- Ordered plan: optional scene image first, then one or more distinct Look Sheets.
  First frame in image_to_video remains a single image, without extra sheets.
- Optional characterName (trimmed, max 80 characters, no control characters) on
  each Look. Empty name uses Character 1, Character 2 in deterministic order.
  Reject duplicate nonempty names (case insensitive) to avoid ambiguous mapping.
- Server compiles an explicit reference-index/name legend into the execution
  prompt. Treat names as quoted data, not instructions or verified identity.
  Bind names/order to reference and request fingerprints used by quote/submit.
- All references count toward the catalog limit. Never truncate to fit after a
  model switch: preserve selections and block generation with the existing reason.
- Character selection and Look uploads/generated images remain mutually exclusive.
  Legacy approved Look attribution is preserved; validate each approved Look via
  its owning Character service. No new multi-character reuse-rights bypass.
- Seedance trusted_generated_only remains generation-ID-only: no upload, Character
  browse, arbitrary URL, Base64 or transport fallback. Validate EACH image's owner,
  eligibility, expiry, content hash and credential scope at quote and submission.
- Duplicates (including scene/Look duplicates) and overflow fail server-side.
  No persistence of signed URLs or Base64. Actor-scoped draft arrays bounded to 12.
- Legacy single-sheet drafts migrate without losing names/references. Keep legacy
  API plan versions compatible; new optional metadata does not reprice old snapshots.

## Ordered Tasks

- [x] M1 Extend canonical reference normalization/validation and prompt legend;
  expand trusted/ordinary plan validation with unchanged source authority.
- [x] M2 Add bounded named Look arrays, migrate single selections, and build the
  same ordered reference plan for quote/submit. Reuse current source pickers.
- [x] M3 Add/remove/replace controls and optional name fields, localized labels;
  retain source status, errors and sibling generation UI. Desktop/tablet/mobile.
- [x] M4 Focused contract/trusted/UI/type checks through the existing
  scripts/test-playground-video-references.mjs runner. Add a short named-looks
  group and include it in explicit all; no paid calls or live data writes.

## Verification

Two/three sheets, scene + sheets at cap, overflow/model switch, reorder/rename
fingerprints, duplicate names/sources, default aliases, expired/foreign trusted
sources, Character conflict, no Seedance upload, actor/draft isolation, canonical
provider order and Credit parity. Existing single-reference tests must still pass.
Visual checks at 390/820/1440px; record any unavailable viewport explicitly.
Live multi-character likeness/association is pending owner UAT, not proven by
contract tests. No paid generation or production build/restart without need.

## Delivery Evidence (2026-09-08)

- named-looks: 3 focused tests passed (three ordered references, no-scene default
  aliases, rename/reorder fingerprints, duplicate/invalid names, expiry and parity).
- Existing contract group: 19 passed; trusted group: 22 passed; regression group:
  99 passed. These are focused groups, not a full-system run.
- UI group: 53 passed after final selection/draft changes. TypeScript noEmit and
  scoped frontend ESLint passed. Existing test-only i18next warning remains.
- layout-named and layout-named-trusted: each passed EN/TH at 390/820/1440px,
  real React UI with isolated API/media fixtures. Verified three loaded previews,
  no horizontal overflow/clipped buttons/unresolved name/count placeholders,
  rename requotes, add/cancel/remove and switching to first-frame mode. Existing
  layout-trusted single-sheet regression also passed at the same six variants.
- Screenshots: OS temp mpf-video-references-layout-NSnj4E (trusted) and
  mpf-video-references-layout-ELF7AI (ordinary); desktop/mobile visually inspected.
- Reuse existing `scripts/test-playground-video-references.mjs` with groups
  named-looks|contract|trusted|regression|ui|types|layout-named|layout-named-trusted.
  `all` explicitly aggregates isolated automated groups, not paid/provider UAT.
  Browser groups require the local Vite server (default http://127.0.0.1:5173).
- New component: web/src/features/playground/components/VideoLookSheetSources.tsx.
  Existing draft v5 migrates v2/v3/v4; no runtime data files moved or rewritten.
  Existing task reference metadata adds optional characterName; actor/source
  authorization remains server-owned. No provider/model gates or Credit rates changed.
- No paid generation, API credentials, live billing or provider quality test used.
  Backend must reload changed server code before real UAT; do not restart active Jobs.
