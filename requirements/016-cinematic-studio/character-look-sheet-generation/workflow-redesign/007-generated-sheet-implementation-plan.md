# Generated Sheet: Ordered Implementation And Validation

Status: implemented, isolated validation and sequential review passed; live
provider UAT pending. No live generation or production build in aggregate checks.
Dependencies: Image 2.5 testing requirement 020/image/006 is delivered first;
Cast import does not depend on OpenAI, and keeps Seedance source policy intact.

1. [x] Generation source facade: expose owned source validation by stable ID;
   keep secret provider URL server-only, use existing eligibility/content rules.
2. [x] Profiles import facade/route: authorize pinned Character, validate source,
   create/reuse Look Asset, idempotent draft then review with generated_import
   provenance and full-sheet references. Recheck on approval/resolution.
3. [x] Cinematic dispatch: route imported ModelArk Look through original trusted
   source transport, preserve normal Storyboard/GCS and other-provider behavior.
   Rejection bookkeeping addresses original source IDs, not imported assets.
4. [x] Client API schemas and fourth source mode: select/name/confirm, review,
   approve and existing film-binding recovery. Keep adjacent modes/actions.
   Add the direct Generated sheet command to Cast's source group and cover
   it alongside existing upload/AI entry and approved-Look binding tests.
5. [x] Localized loading/empty/error/expiry/identity states; theme token styling,
   2-column source controls at desktop/tablet, compact mobile layout.
6. [x] Focused backend: owner/expiry/hash/rejection/scope, duplicate/partial
   import, no crop assumptions, approval provenance, transport no fallback.
7. [x] Focused frontend: selection, confirmation, API payload, failure retry,
   existing three sources/Review and EN/TH key parity. Typecheck.
8. [x] Browser fixture checks 390/820/1440, source/review/loading/empty/error.
9. [x] Update requirement evidence and scoped diff review before handoff.

Runner: `node scripts/test-generated-cast-sheets.mjs domain|transport|ui|binding|types|all`.
All groups fail on errors, use isolated fixtures/temp storage, no live credentials,
no provider generation, no live JSON writes or worker restarts. Separate live UAT:

- Choose actual owned Seedream 5.0 sheet, confirm identity/views, Review, Approve
  and use in film. Verify assigned pinned Look/version and whole-sheet preview.
- In Produce select a supported multimodal ModelArk model, appropriate approved
  Storyboard plus Look; inspect quote and explicitly generate once. Record task
  and provider moderation/quality outcome. Never mark this passed from fixtures.
- Expired source: replace with a newly generated eligible original; no local-copy
  bypass. Unsupported model keeps its existing blocked state.

New files live under existing Profiles components, tests and scripts ownership.
Runtime stores remain existing Assets, Character Looks and trusted-source JSON;
no new store, migration or backfill is needed. Rollback removes the source entry
but retains imported provenance and historical media/usage.

## Verification Evidence (2026-09-09)

- Aggregate runner passed: domain 32, transport 32, UI 19, binding 6 tests;
  TypeScript passed. Binding is a selectable focused subset of the existing
  Cinematic UX suite, not a claim that all Cinematic regressions were run.
- Domain evidence includes concurrent/partial retry, retired draft replacement,
  foreign/deleted/rejected/expired sources, changed bytes, credential scope,
  manual approval assurance and private original-URL failure without fallback.
- Transport evidence covers original versus imported Looks, forged source IDs,
  quote/submit parity and unchanged Storyboard/provider and Credit lifecycle.
- `node scripts/verify-generated-cast-sheets.mjs` passed EN/TH at 390/820/1440:
  real Cast source command group, selection, review, approve callback and
  loading/empty/error states. Whole-sheet contain and no crop strip verified.
  Screenshots: OS temp folder `mpf-generated-cast-0K7Y18`; browser APIs/media are
  isolated fixtures, not evidence of generated image quality or paid acceptance.
- Browser prerequisites: existing source Vite server and Playwright Chromium.
  Set `CAST_SHEETS_WEB_ORIGIN` for a different local port (default 5174).
  `CAST_SHEET_VISUAL_FILE` optionally supplies a local visual fixture.
- Related prerequisite: `node scripts/test-openai-image25.mjs all` passed 25
  checks; its separate browser `image25` group confirms both Generate buttons.
- Backend/security, UX and QA reviewed sequentially, not independently. Scoped
  diff check passed. No raw provider URLs, live-store edits or paid calls.
- Remaining live gap: backend 6500 was not available. Run the normal development
  startup script when idle, then execute the manual UAT above with consent to
  provider charges. No claim of qualification for untested Seedance variants.
