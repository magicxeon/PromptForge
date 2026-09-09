# Ordered Implementation And Verification

Status: implemented; scoped validation passed on 2026-09-09.

1. [x] Shared ProcessingSpinner + Generation wrapper, Comparison states,
   mechanical current spinner adoption, AGENTS/visual-language policy. Test UI.
2. [x] Assets comparison layout and renderer, six presets, real font measuring,
   black footer, image budgets, PNG/JPEG. Decode synthetic exports in tests.
3. [x] Extend existing export facade/route with ordered output selection/options
   and safe response metadata; preserve Look Sheet. Test access/atomic failure.
4. [x] Gold action + ComparisonExportDialog using same encoded preview/download;
   abort/stale/actor handling, EN/TH, responsive CSS. Test interactions/types.
5. [x] Browser screenshots of processing and export at 390/820/1440, six actual
   exported layouts and representative High/long-caption output. No paid calls.
6. [x] Sequential UX/Backend/privacy/QA review, scoped diff, final evidence.

Runner: `node scripts/test-comparison-export.mjs loading|render|service|ui|types|all`.
Aggregate is explicit, fail-fast, isolated and never generates paid images,
mutates live JSON, starts workers or builds production. Browser runner requires
local Vite + Playwright and uses intercepted API fixtures with real export bytes.
Existing `test/mediaExport.test.js`, ComparisonWorkspace and MediaExportButton
tests remain regression gates. New tests use temp outputs and synthetic markers.

New ownership: `web/src/components/ui/ProcessingSpinner.tsx`,
`web/src/components/media/ComparisonExportDialog.tsx`,
`server/domain/assets/comparisonExportLayout.js`,
`server/domain/assets/comparisonExportRenderer.js`,
`server/domain/assets/exportText.js`; styles in existing media-viewer.
No new runtime data path, repository or parallel generation/export pipeline.

## Validation Evidence

- `node scripts/test-comparison-export.mjs all`: exit 0, 49 tests plus TypeScript.
  Groups: loading 26 (including GenerationResultSurface and LookSheetEnhancement
  siblings), render 4, service/route 10, UI/API 9, types no-emit.
- Renderer checks all six PNG layouts, exact dimensions, source corner markers,
  order, black rails/footer, no enlargement, High JPEG, Thai/long metadata,
  missing fonts/logo, corrupt media and cancellation.
- Service checks owner/run authority, ordered selection, unchanged originals,
  missing selected media failing atomically, safe JPEG/metadata response headers,
  sanitized errors and capacity release. No Generation or Credit mutations.
- Repeated mixed Look Sheet/Comparison rendering exposed a native font-state
  failure during initial testing. Both renderers now share serialized text/font
  registration. Five consecutive service subprocess runs passed, followed by a
  permanent three-round concurrent export regression with byte-repeatability.
  Only up to 16 trusted font paths are retained process-wide, never user text.
- Last small synthetic service baseline: four exports in about 445 ms, sampled
  RSS 77 MiB. This is local evidence, not a production concurrency/load budget.
- `node scripts/verify-comparison-export.mjs`: passed on existing source Vite
  at `http://127.0.0.1:5173`. Prerequisites: installed Playwright Chromium, local
  Vite, bundled fonts and existing fixture assets. `COMPARISON_WEB_ORIGIN` may
  point to another local Vite port. APIs are intercepted; no paid/live requests.
  EN/TH at 390, 820 and 1440: processing icons, reduced motion, dialog bounds,
  no horizontal overflow, decoded preview and byte-identical downloaded file.
- Browser evidence and six photo exports were written outside the repository:
  `C:/Users/punya/AppData/Local/Temp/mpf-comparison-export-TNfrhy`.
  Desktop loading, mobile Thai preview, tablet preview, portrait export and
  stacked export were visually inspected. High/long-caption checks are automated.
- `git diff --check`: passed (existing line-ending warnings only). Requirement,
  architecture and AGENTS ownership updated; no files moved. Existing unrelated
  dirty changes, live JSON, outputs, workers and production bundles were preserved.
- Reviews applied sequentially, not by independent agents. Public/private mode,
  native dialog accessibility, stale/actor preview guards and existing single-image
  and Look Sheet download behavior were included in the scoped review.

Cross-browser native Save behavior and sustained multi-user memory/load remain
manual release checks; do not infer those from Chromium fixture screenshots.
No paid provider UAT or production build was run. The browser fixture does not
replace an end-to-end check against the user's live Comparison data after restart.
