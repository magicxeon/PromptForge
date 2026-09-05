# 003H - Dynamic Storyboard And Look References

**Owner:** ../012-storyboard-and-look-video-references.md
**Status:** implementation and local verification complete; live qualification deferred

Do not combine first_frame with reference_image. Step 0 is accepted.
No paid provider testing in these steps.

| Step | Change boundary | Verification | Status |
|---|---|---|---|
| 0 | Confirm non-exact opening control for dynamic reference mode | Creator requested dynamic Looks then implementation | Complete |
| 1 | CharacterLook public approved-sheet resolver; Assets byte/probe authority; Cinematic current Shot binding | Approved/revoked/missing/legacy/foreign fixtures | Complete |
| 2 | Video packet provider strategy/config and ordered reference metadata | Prompt authority/order/old-mode parity | Complete |
| 3 | Video reference plan, catalog POC exposure, quote/submit fingerprints, URL-first transport, adapter role checks | Payload and flow suites | Complete |
| 4 | Produce mode selector, dynamic thumbnails and prepared prompt; EN/TH | 17 scoped UI tests; responsive checks below | Complete |
| 5 | Backend/security and QA sequential review; record evidence and remaining provider gate | Focused groups, i18n, build, diff check | Complete locally; live gate open |

## Data Handoffs

1. Project/Scene/Shot -> active assignment IDs and selected Look IDs. Preserve
   established inheritance and reject ambiguous selection.
2. Pinned CharacterLook/version -> approvedSheetAsset via Character Look owner.
   Verify Character usage and current version approval; never trust arbitrary IDs.
3. Owned Assets -> verified original bytes/MIME/dimensions/hash. For legacy Look
   metadata, derive a current quote snapshot without overwriting approval history.
4. Reference set -> ordered purpose/Asset/version/hash/Look binding. Stable content
   identity is independent of signed URL, Base64 or GCS expiry.
5. Reference set + packet + model strategy -> exact configured prompt, count=1+N and
   multimodal_reference. Keep existing first-frame request default compatible.
6. Quote -> mode/source/prompt/settings fingerprint and immutable estimate.
   Submit reruns authorization and content checks; mismatch stops before charge.
7. Generation -> 1+N verified URL-first references, one provider request.
   All provider roles are reference_image; role first_frame is absent.
8. Task -> safe lineage, status, support IDs, settlement and durable preview.
   No automatic approval, source replacement or provider retry.

## Public Contract Boundaries

- CinematicApplicationService owns reference selection and quote/attempt entry.
- CharacterLookService owns pinned Look authorization and approved sheet access.
- Assets owns bounded local media reads/probes and GCS URL preparation.
- CinematicVideoPacketCompiler/configuration owns all provider prompt wording.
- Generation owns reference validation, provider capabilities and task dispatch.
- Credits owns estimates/reservations/settlement without a new pricing path.
- Existing React API/Zod/Query components consume server-derived summaries.

Keep any internal helper in its current capability folder. No new runtime JSON,
parallel queue, direct provider call from Cinematic/React or unrelated refactor.

## Resume Check

Before editing a listed module, read its latest diff: the worktree already has
CINE-FIX-012, Storyboard regeneration changes and user-generated task/Credit data.
Preserve all of them. Mark a substep complete only with recorded test evidence.

## Complexity Packages (Execute In Order)

### A - Authority And Legacy Media

Create a focused CinematicVideoReferencePlanService behind Cinematic's existing
entry point. Extend CharacterLookService's approved-sheet facade, using an Assets
read-only original-file probe. Resolve N current assignments and their pinned
Looks, rejecting missing/ambiguous/foreign/revoked versions. Bound total inputs
by the selected model before reading media. No approval or metadata migration.

### B - Prompt And Paid Dispatch

Add a reference-mode section to the existing provider strategy configuration;
do not create another compiler. Number Image 1 as scene authority and Image 2+
as named role/Look authority; preserve source emotion over sheet pose/smile.
Generation independently validates every Look version/hash and each media's
dimensions. Hash the complete ordered plan for quote parity. Resolve each GCS
URL with same-byte fallback; keep one task and all Credit rules. First-frame
and multimodal wire roles must never mix. Preserve single-image fingerprints.

### C - Produce And Regression

Add an opt-in reference mode in the existing render panel, not a new modal.
Keep default single-image mode for compatibility. Show reference thumbnails,
names/count and the exact quoted prompt. Switching mode requires a new quote;
do not silently drop missing Looks or change provider. Use EN/TH, scoped styles
and existing authenticated thumbnail controls. Run only focused A/B/C tests and final build.

Optional scoped browser script: `scripts/test-cinematic-video-reference-layout.js`
uses the existing Vite server, the real reference selector inside the shared
render frame, mocked media/actor responses, and 390/820/1440px viewports in both
default and fashion themes. It makes no provider calls or runtime data writes.
This is component-layout evidence, not a live full-Produce qualification.

### D - Provider Qualification (Deferred)

Additional Look Sheets retain their actual provenance; they are not certified
trusted Seedream outputs by association. The new route is development POC only.
No promise that adding images fixes privacy rejection. Creator reviews price
and initiates any paid live test separately.

## Verification Record - 2026-09-05

- `node scripts/test-cinematic-video.js references`: 16 passing tests, ~0.5s.
- `node scripts/test-cinematic-video.js payload`: 25 passing tests, ~0.2s.
- `node scripts/test-cinematic-video.js flow`: 36 passing tests, ~0.7s;
  unchanged task preview/settlement and GCS coverage.
- `node scripts/test-cinematic-video.js ui`: 17 passing tests, ~5.7s.
- `node --test test/cinematicApplicationService.test.js`: 32 passing adjacent tests.
- `npm.cmd run build --workspace web`: TypeScript and Vite production build pass.
- New optional catalog flag remains optional in TypeScript to preserve existing
  provider models, shared controls and typed fixtures.
- Eight new EN/TH keys and interpolation parity checked; `git diff --check` passes.
- Browser script passes selector interaction, thumbnail loading and overflow at
  390/820/1440px in default/fashion themes. Six screenshots captured; representative
  mobile light and desktop dark images visually reviewed. Scope is the real
  component/shared render frame with mocked APIs, not a live full-Produce run.
- Current project/first Shot read-only check: 2 references in documented order,
  pinned approved Look, verified original Look hash and 3,005-character configured
  prompt, with both numbered mappings and naturalism intact. No paid calls.
- Backend/security and QA reviews performed sequentially by the implementation
  agent, not independent agents. No mandatory Asset Library or source replacement.
- No new runtime JSON path. Existing GCS storage is reused. Task records gain
  optional safe reference bindings/transport diagnostics; no signed URLs/Base64.
- Backend port 6500 was not running during final checks. Frontend Vite 6501 was
  available. Start/restart the normal backend before creator live testing.

### Owning Files Added

- Assets: `server/domain/assets/VideoReferenceAssetContent.js` (bounded original
  file probe), reused by approved Character Look resolution and existing transport.
- Cinematic: `server/domain/cinematic/CinematicVideoReferencePlanService.js`
  (private orchestration helper behind CinematicApplicationService).
- Produce UI: `web/src/features/cinematic/components/produce/ProduceVideoReferences.tsx`
  (shared Select and authenticated thumbnails; no provider or Credit calls).
- QA: `test/cinematicVideoReferencePlan.test.js` and optional browser script
  `scripts/test-cinematic-video-reference-layout.js`.

### Creator Smoke Test

1. Start/restart backend, refresh Produce, choose the existing approved Shot.
2. Select Seedance 2.5 with the existing development POC toggle enabled.
3. Select `Storyboard + Character Looks`. Confirm Image 1 is Storyboard and
   Image 2+ names only the Shot's current Characters and their approved Looks.
4. Open technical prompt; check ordered image instructions and review the quote.
5. Only then generate one clip. Confirm progress and either completed preview
   or the actual provider error/request ID. Approval remains explicit.
6. Single first-frame mode remains available; no new Storyboard generation needed.
