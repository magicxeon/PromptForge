# Ordered Implementation Plan

ID: CLSFE-PLAN. Updated: 2026-09-08.
Status: one-image baseline implemented; conditional development acceptance (2026-09-08).
Master: [000](000-master.md). Evidence contract: [009](009-verification-and-release.md).

## Current Runtime Trace

```text
PlaygroundRoute / StudioRoute
 -> shared GenerationExperience + generationApi/apiClient
 -> generationRoutes / GenerationApplicationService
 -> generationRequestService + promptCompiler
 -> existing Reference Processing, Credits, Queue and provider adapters
 -> canonical Job/Group status and History/result projection
```

Current Look preparation is separate and protected:
`PlaygroundImageCharacterPanel -> CharacterLookDialog /
CharacterLookGenerationDialog -> CharacterLookService generation plan ->
GenerationExperience -> explicit review/approval`. New form authoring must not
fake that path's mandatory Profile/Look IDs.

Current downloads in shared viewers use original image links. Character casting
export is a profile-generation/approval operation, not a watermark utility.
Assets ReferenceAssetService already composes wardrobe image assets with Sharp;
that is infrastructure precedent, not permission to bypass reference ownership.

## Delivery Sequence

Each gate is independently reviewable. Update this file with actual command,
result and evidence after the slice, before advancing. No checklist item below
is complete merely because its specification exists.

### G0 Scope And Strategy

- [x] G0.1 Read sources, capture scoped baseline and protect dirty user files.
- [x] G0.2 Resolve D-01: user confirmed one image in the implementation turn.
  If full package is requested later, expand
  001/003/004/005 and this plan BEFORE adding generation fan-out or pricing.
- [x] G0.3 Confirm new-candidate vs approved Look boundary, Download surfaces,
  reference authorization and no change to Seedance/Video.
- [x] G0.4 Confirm logo source and free CPU-export assumption D-03/D-04.
- [x] G0.5 Pin test fixture identities, visual target and no-paid-test budget.

Gate: no unresolved choice may silently affect price, rights or output contract.
Independent favicon work can proceed after explicit implementation authorization
without waiting for D-01; no implementation is authorized by this document alone.

### G1 Definition And Durable Metadata (001)

- [x] G1.1 Introduce pure strict definition schema/default normalization.
- [x] G1.2 Reuse Character identity/age/outfit helpers and authorized handoff.
- [x] G1.3 Define standalone vs selected-profile validation and stable errors.
- [x] G1.4 Add strict optional typed Generation payload and accepted snapshot.
- [x] G1.5 Preserve snapshot through Job, History repository normalizer and API.
- [x] G1.6 Add versioned actor/mode drafts; keep old data readable without backfill.
- [ ] G1.7 Run `definition`, `drafts`, `privacy` and focused schema checks.

Gate: identity conflicts/foreign sources fail; accepted data survives reload;
public snapshots do not expose private definition. No generation call required.

### G2 Playground Navigation And Form Fixtures (002)

- [x] G2.1 Add Image-only segmented control and search-param normalization.
- [x] G2.2 Add controlled shared form, optional details and read-only identity.
- [x] G2.3 Compose existing GenerationExperience extension points; no new page.
- [x] G2.4 Keep ordinary prompt and new form drafts/results independently scoped.
- [ ] G2.5 Add disabled/loading/error/unknown-model states with mocked API data.
- [ ] G2.6 Localize and run `navigation`, `ui-playground`, `layout-playground`.

Gate: old General image and Video remain usable; form can be inspected on three
viewports without authorizing live generation before G3.

### G3 Canonical Prompt, Quote And Generation (003)

- [x] G3.1 Add new versioned recipe; do not modify existing look-sheet.v2.json.
- [x] G3.2 Extend canonical compile/context resolution without forged Look IDs.
- [x] G3.3 Bind definition/recipe/identity/reference fingerprints to quote/submit.
- [x] G3.4 Keep fixed output count and model dimensions consistent with D-01.
- [x] G3.5 Connect shared form and sanitized read-only prompt to existing pipeline.
- [x] G3.6 Preserve queue acceptance, idempotency, Job Center and terminal handling.
- [ ] G3.7 Test successful/failed/duplicate/stale/insufficient-credit cases with mocks.
- [ ] G3.8 Run `prompt`, `generation`, `compatibility`, `types`; record live visual
  quality as unverified until owner-approved UAT, with appropriate exposure gate.

Gate: estimate and execution match; metadata persists; no regression to old Look,
ordinary Image, Scene, natural-realism scope, or Video trusted source behavior.

### G4 Studio Adapter (004)

- [x] G4.1 Add format selector under existing Studio Character Sheet only.
- [ ] G4.2 Map existing identity/attributes into shared form without silent loss.
- [ ] G4.3 Preserve original draft, config imports/exports and face-reference handoff.
- [x] G4.4 Reuse Generation contract and mark new result as candidate only.
- [x] G4.5 Guard profile/casting/Look actions requiring unsupported layout metadata.
- [ ] G4.6 Run `ui-studio`, `drafts`, `compatibility`, `layout-studio`.

Gate: original three-view approval still works; new output is not assigned the
legacy crop manifest; no Headshot/Scene/Fashion/Cinematic UI redesign.

### G5 Export Core And Branding (005)

- [x] G5.1 Add strict export DTOs, authorized source-owner read contracts and errors.
- [x] G5.2 Define logo path/config/profile/font versions and approved PNG source.
- [x] G5.3 Implement pure document composition and safe filename/metadata handling.
- [x] G5.4 Add bounded Assets facade, authenticated binary endpoint/client helper.
- [x] G5.5 Implement cleanup/cancel/busy responses; no public derivative storage.
- [ ] G5.6 Verify immutable original hashes, actor isolation, invalid PNG/path and
  text/foot/head containment with fixtures before adding user Download controls.
- [ ] G5.7 Run `export`, `privacy`, `layout-export`, `performance`; record actual
  measured latency/memory and safe-budget adjustments, not speculative claims.

Gate: same source/snapshot/config renders the same document content; rendering
cannot dispatch providers, mutate Credits or change original/reference assets.

### G6 Wire Look Sheet Downloads (005)

- [x] G6.1 Connect Download in both new authoring result surfaces and image viewer.
- [x] G6.2 Add progress/error/retry/cancel states via controlled callbacks.
- [x] G6.3 Restore accepted snapshot for History/resumed results; preserve old
  outputs without snapshot and ordinary original-image download behavior.
- [x] G6.4 Test double click, export failure and actor/mode switch during download.
- [ ] G6.5 Run relevant `export`, `privacy`, `ui-playground`, `ui-studio` and layouts.

Gate: logo appears only on downloaded scoped document; errors retry export only.

### G7 Comparison Layout And Export (006)

- [x] G7.1 Extend Comparison owner with authorized pinned-run export projection.
- [x] G7.2 Add side-by-side row/grid and one-column stacked export profiles in
  the same renderer, with resolved layout and policy version in the fingerprint.
- [x] G7.3 Add shared controlled action and private route adapters with valid IDs.
- [ ] G7.4 Test partial count, missing/deleted/foreign sources and changing run.
- [x] G7.5 Check Winner/collection/share/individual downloads are untouched.
- [ ] G7.6 Run `comparison`, `privacy`, `layout-comparison`, `layout-export`.
- [x] G7.7 Define canonical orientation/Auto/fallback rules from whole-run
  metadata, explicit override and versioned client/server parity fixtures.
- [x] G7.8 Add accessible Auto/row/stacked controls to shared image viewers;
  preserve actor scope, paging, zoom/pan/reset/fullscreen and existing actions.
- [ ] G7.9 Verify landscape stacking, portrait/square rows and mixed/unknown
  fallback at three widths. Compare actual exports from desktop/mobile and
  different inspection pages/transforms; verify stacked canvas bounds.

Execute G7.7 -> G7.8 first for image presentation, G7.1 -> G7.2 -> G7.3 for
export contracts/wiring, then G7.4/G7.5/G7.9 and the focused gate G7.6.
Presentation work does not depend on Look Sheet strategy D-01; export requires G5.

Gate: both arrangements remain inspectable; one combined download follows the
selected logical layout with correct order/logo. No public export scope or Video
Comparison changes. Screen-only responsive reflow cannot change downloaded pixels.

### G8 Favicon (007, Independent Slice)

- [x] G8.1 Reuse approved Momelo mark and Vite-managed asset reference.
- [x] G8.2 Add head favicon declaration; optional fallback only if required.
- [ ] G8.3 Verify browser resource/tab, preserve shell/provider icons.
- [ ] G8.4 Run `favicon`, `layout-favicon`; built preview may be deferred with an
  explicit release gap if no isolated build was run. Never edit web/dist manually.

### G9 Targeted Release Review (009)

- [x] G9.1 Review exact scoped diff and requirement/acceptance traceability.
- [x] G9.2 Check planned/new paths against architecture, typed schemas and locales.
- [x] G9.3 Run focused compatibility and the explicit `all` only when requested.
- [ ] G9.4 Run explicit fixture `uat` per page; visually inspect exports, not DOM only.
- [ ] G9.5 Record owner-approved live image quality separately; no automatic Video UAT.
- [x] G9.6 Document logo replacement, limits, rollback and unresolved release gates.
- [x] G9.7 Mark only implemented-and-verified requirements complete; report gaps.

## Existing Modules To Extend

| Area | Current canonical paths / responsibility |
|---|---|
| Playground | `web/src/features/playground/routes/PlaygroundRoute.tsx`, `components/PlaygroundImageCharacterPanel.tsx` |
| Studio | `web/src/features/studio/routes/StudioRoute.tsx`, `studioModePolicy.ts`, existing config and attribute helpers |
| Shared generation | `web/src/components/generation/GenerationExperience.tsx`, result surface/grid, `web/src/components/media/GenerationImageViewer.tsx` |
| Client transport | `web/src/features/generation/api/generationApi.ts`, `schemas/generationSchemas.ts`, `web/src/lib/api/apiClient.ts` |
| Character identity | `server/domain/character-profiles/characterIdentityMetadata.js`, `CharacterUsageService.js`, `CharacterLookService.js` |
| Image pipeline | `server/domain/generation/GenerationApplicationService.js`, `generationRequestService.js`, `promptCompiler.js`, `server/app/routes/generationRoutes.js` |
| Durable history | `server/repositories/generation/GenerationResultRepository.js`, `HistoryRepository.js`, record normalizer and authorized DTO |
| Comparison | `server/domain/comparisons/ComparisonOrchestrator.js`, `web/src/components/comparisons/ComparisonWorkspace.tsx`, private detail and existing image viewer adapters; source-policy layout contract reused for exports |
| Assets | Existing `server/domain/assets/` image infrastructure and owner-authorized source facades |
| Bootstrap/config | `server/app/createApp.js`, `server/config/paths.js`, `web/index.html`, current brand SVG |

Before each edit recheck current paths; older role/source documents contain
stale 017-backend, 018-commercial and 098-pending names. Current owners are
018-implementation-backend, 019-implementation-commercial-feature-plan and
097-pending-features. Do not move their files as part of this work.

## Implementation File Map

| Proposed path | Owner / why needed |
|---|---|
| `web/src/components/profiles/CharacterLookSheetForm.tsx` | Controlled form reused by two feature adapters |
| `web/src/features/profiles/schemas/lookSheetDefinitionSchemas.ts` | Typed authoring boundary beside current Profile schemas |
| `server/domain/character-profiles/LookSheetDefinitionService.js` | Focused pure definition/identity policy consumed through Generation; no CRUD/queue |
| `server/config/prompt-recipes/character-looks/document-sheet.v1.json` | New recipe preserving existing Look v2 contract |
| `server/domain/assets/MediaExportService.js` | Public authorized export facade |
| `server/domain/assets/imageExportRenderer.js` | Internal pure composition/branding; reuse Sharp |
| `server/config/mediaExports.js` | Validated logo/profile/bounds configuration |
| `server/app/routes/mediaExportRoutes.js` | Thin authenticated binary export adapter |
| `web/src/lib/api/mediaExportApi.ts` | Shared typed caller using apiClient, no source/price policy |
| `client/assets/brand/momelo-export-mark.png` | Default PNG derived from existing approved mark |
| `web/src/styles/character-look-sheet-form.css` | Only if shared tokens/utilities cannot express scoped responsive styles |
| `scripts/test-look-sheet-exports.mjs` | Selectable focused + explicit aggregate runner |
| `scripts/verify-look-sheet-exports.mjs` | Fixture-driven browser/export layout groups |
| `test/lookSheetDefinition.test.js`, `test/lookSheetGeneration.test.js`, `test/mediaExport.test.js` | Backend definition/lifecycle/export isolated fixtures |
| Colocated shared-form and feature tests | Client navigation, drafts, UI and callback preservation |

Names may be refined before implementation when a current module already owns
the responsibility; update this table/import consumers instead of adding wrappers.
No source files move. Existing EN/TH namespaces should be extended; add a new
namespace/manifest entry only if actually necessary. Runtime prompts never enter i18n.

## Data, Rollout And Rollback

- Documentation delivery changes no runtime data. Future optional snapshots use
  existing Generation History (`DATA_FILES.history`), not a new sheet database.
- Profile/Look data changes only through existing explicit authorized workflows.
- Export temporary data is private, bounded and cleaned; no persistent public
  export directory or signed-URL record is introduced by this phase.
- No PostgreSQL/cloud migration is needed for these authoring/download slices.
- Preserve original recipe/format while new preset is gated until required tests
  and media evidence pass. Unknown/disabled mode routes return to ordinary Image.
- Rollback removes/disables new entry/action while preserving original media,
  accepted optional metadata and old draft compatibility; no destructive migration.
- Rollback export independently of generation; do not regenerate paid originals.

## Evidence Ledger

| Gate | Implementation | Automated | Visual/live | Notes |
|---|---|---|---|---|
| G0 | scoped, D-01 confirmed | ownership/diff read | user one-image decision | no paid calls |
| G1 | implemented | definition 3; generation 10 | form reload in both surfaces | full selected-identity reload matrix still open |
| G2 | implemented | form 2; compatibility UI | EN/TH 390/820/1440 filled form + reload | new mode only; General/Video protected |
| G3 | implemented, production gated | generation 10; prompt compatibility 17; Credit 1; private preview route | no paid UAT | canonical quote fingerprint and duplicate-reservation dispatch guard |
| G4 | explicit form adapter implemented | profile compatibility 16; shared workspace checks | EN/TH 390/820/1440 | automatic existing attribute/face import is P-08 |
| G5 | implemented | export 6; source/path/cancel/byte bounds | actual sheet/row/stacked PNG inspected | 322-368 ms / 3 small fixtures, 63-66 MiB RSS; not max-load qualification |
| G6 | implemented | Download 3; History schema and result compatibility | result/History live API UAT open | double click, retry and actor abort tested |
| G7 | implemented | layout 9 including shared server/client cases; export off-page fixture | EN/TH 390/820/1440 Auto + manual override | terminal/private/image only; public and Video untouched |
| G8 | implemented | favicon 1 | browser head asset checked | production build/tab screenshot not certified |
| G9 | conditional development acceptance | focused groups, types, server syntax | fixture evidence, not provider evidence | remaining gates below; no independent reviewer available |

Checked task boxes indicate implemented focused slices, not whole-feature
production certification. Unchecked verification tasks remain open; do not
close them based on a nearby unit test. Historical documentation-only audit
below is retained for provenance and superseded by this implementation ledger.

### Runtime Files Added Beyond The Initial Proposed Map

- Profiles: `web/src/features/profiles/components/CharacterLookSheetExperience.tsx`.
- Generation: `server/domain/generation/GenerationExportSourceService.js`,
  `server/config/lookSheetDocumentPolicy.js`.
- Comparison: `server/domain/comparisons/comparisonLayout.js`,
  `web/src/features/comparisons/comparisonLayout.ts` and colocated test;
  `test/fixtures/comparison-layout-v1.json` is a shared policy fixture.
- Shared media: `web/src/components/media/MediaExportButton.tsx` and its test.
- QA: `test/lookSheetPreviewRoutes.test.js`, `test/momeloFavicon.test.js`.
- No file moves and no new live JSON path. Existing optional Job/History fields
  carry accepted snapshots; exports use memory only and never overwrite sources.

### Actual Commands And Evidence (2026-09-08)

Use `node scripts/test-look-sheet-exports.mjs <group>` individually:
`definition`, `generation`, `form`, `export`, `privacy`, `download`, `comparison`,
`favicon`, `compatibility-prompt`, `compatibility-profile`, `compatibility-credit`,
`compatibility-billing`, `compatibility-groups`, `compatibility-ui`, `types`.
`all` is the explicit later aggregate; it was not
run as a whole-site test. Node dependencies must already be installed.
The privacy group repeats export checks intentionally when validating its gate.

`node scripts/verify-look-sheet-exports.mjs playground|studio|comparison`
uses the running Vite origin `http://127.0.0.1:5173`, mocks APIs and blocks external
requests and unrecognized mutations. It never needs a paid provider or live JSON.
The pipe above means choose one argument, not a literal shell command.
This runner checks EN/TH at 1440, 820 and 390, filled form restoration after
reload, prompt preview, overflow and Comparison override/preserved downloads.

Browser evidence directories in the local OS temporary directory:
- `mpf-look-sheet-playground-HnexDo`: final mobile header wrapping correction.
- `mpf-look-sheet-studio-0US56j`: final filled new form, desktop/tablet/mobile.
- `mpf-look-sheet-comparison-Q3G6jr`: Auto stacked and existing three-item paging.
- `mpf-export-evidence-PakEpR`: decoded sheet/row/stacked PNGs inspected earlier.

Syntax checks were run on all changed/untracked server JS. TypeScript no-emit
passed. Existing prompt, profile lifecycle, Credit and shared UI suites passed;
this is sequential self-review, not independent QA or live provider qualification.
Final compatibility UI has 27 checks, billing 1 and multi-output Groups 4.
The existing Group fixture lacked `assertRuntimeAvailable` from the current
registry contract; its mock was extended and gate invocation asserted. Production
Group code was not changed to bypass that check. EN/TH key/interpolation parity
and `git diff --check` passed; no aggregate or paid Generation was run.
Final package link audit passed (34 local Markdown links). Git status confirms
no changes under live `server/data`, `client/outputs` or package manifests.

### Operator Configuration And Remaining Gates

- Set `LOOK_SHEET_DOCUMENT_ENABLED=false` to roll back authoring exposure.
  Production defaults disabled; development defaults enabled. Restart the normal
  server after changing environment/recipe, and reload to clear the static preset
  query. Disabled/unknown new-mode URLs fall back to ordinary Image/original Sheet.
- Default mark: `client/assets/brand/momelo-export-mark.png`. To replace it, put
  a PNG in that directory and set `MOMELO_EXPORT_LOGO_PATH` to its relative filename.
  Bump `MOMELO_EXPORT_LOGO_VERSION`; configure `MOMELO_EXPORT_LOGO_ENABLED`,
  `MOMELO_EXPORT_LOGO_WIDTH`, `MOMELO_EXPORT_LOGO_INSET`, `MOMELO_EXPORT_LOGO_OPACITY`.
  Paths escaping the brand directory are rejected, including resolved links.
- Export uses accepted name/age/situation, never later edits, and the original
  generated image contained in the document. Preview, trusted URL and source bytes
  remain unchanged. Rendering is free CPU work and cannot mutate Credits.
- Limits: 64 MiB combined source bytes, 40 MP each input, 16 MP output, 2 active
  requests globally / 1 per actor, 15-second deadline. Native Sharp cancellation
  is bounded by remaining timeout, not instantaneous. No durable derivative cache.
- Image Comparison uses whole pinned run, 2..6 completed owned images, contain
  layout, captions and bottom-right logo. Manual layout is run-local; stacked
  wheel scrolls the page, Ctrl/Meta-wheel zooms; touch supports vertical scrolling.
- P-08 remains deferred rather than silently migrating old Studio drafts.
- Open release evidence: paid one-image visual/identity/age rubric; live backend
  quote-to-History-to-download flow; full selected-Character reload/actor matrix;
  max-size/concurrent export soak; cross-OS font fallback (Thai glyphs verified,
  Latin fallback appearance may differ); alternate themes and production favicon
  build preview. Do not equate fixture screenshots with these gates.
- Backend port 6500 was unavailable during verification. Existing Vite 5173 was
  used without restarting workers; `web/dist` and live data were left untouched.

### Documentation Validation (2026-09-08)

- PowerShell read-only audit passed: 11 package documents, 35 existing local
  link targets, 12 sampled current owner paths, and Tasks/Acceptance sections
  for all seven implementable child requirements.
- At the initial documentation audit, all 110 checklist entries remained open (requirement tasks, plan tasks and
  release gates; this is not a count of unique implementation tasks).
- `git diff --check -- requirements` passed. New untracked package files were
  checked for trailing whitespace separately because Git diff omits them.
- Sequential requirement gap review is recorded in 008. D-01 remains open.
- No Node test, browser, production build, provider call or live data mutation
  was run; this delivery changed Markdown documentation only.

### Comparison Layout Addendum (2026-09-08)

Requirement 006 now covers Auto, side-by-side and stacked image layouts on screen
and in Download. Master, export request/fingerprint, G7 tasks and QA matrix were
reconciled in the same documentation-only change. All added tasks remain pending.
The previous row/grid-only export rule is superseded; D-01 and other unrelated
Look Sheet decisions are unchanged. No source code, rendering, Node test or
provider execution is claimed by this addendum.
