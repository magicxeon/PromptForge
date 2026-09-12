# 003I - Optional First Frame And Looks-Only Implementation Plan

**Owner:** [016-PVP-013](../013-optional-first-frame-and-looks-only.md)
**Status:** Implemented; automated and scoped component visual checks passed; live UAT pending
**Order:** Complete and verify each package before advancing. No paid calls.

## A. Contract And Legacy Defaults

Completed: canonical mode, per-Shot videoReferenceMode/lastFirstFrameMode,
nullable quote image authority and explicit context preview mode. The new
PATCH .../shots/:shotId/video-references delegates to CinematicApplicationService;
no new persistence directory or independent boolean authority.

- [x] Inventory source-required checks in CinematicApplicationService,
  CinematicVideoPacketCompiler, CinematicDataLineageService, Produce readiness,
  route guards, task approval and Timeline consumers; map each to mode semantics.
- [x] Extend canonical mode validation with looks_only. Define per-Shot stored
  selection and last on-mode preference with backward-compatible read defaults.
- [x] Extend public Project/Shot/context/quote/attempt Zod contracts: nullable
  image authority in looks_only, nonempty pinned sheet authority, effective mode
  and actionable blocking reason. Do not make frame modes permissive.
- [x] Tests: legacy default unchanged, invalid modes rejected, per-Shot/actor
  persistence, new no-frame selection, on/off round trip retaining original media.

## B. References And Prompt

Completed: only selected Cast sheets, N-image counts, Image 1 mapping and
authored opening/continuity. Unused image metadata does not enter the semantic
packet fingerprint; real Shot direction and selected Looks still do.

- [x] Extend CinematicVideoReferencePlanService.prepare to allow absent source
  ONLY in looks_only, resolving N sheets through the current public Cast/Look
  facades. Reuse CinematicCastCoverage; preserve explicit no-Cast handling.
- [x] Reuse current catalog multimodal capabilities and Generation trust checks;
  reject unsupported models and missing/ambiguous sheets before reservation.
- [x] Extend packet compilation and prompt policy JSON for scene-from-text
  plus named sheets. Start mapping at Image 1, not Image 2. No first-frame wording,
  hidden Storyboard image or previous-Shot media. Separate effective dependencies
  from unused approved image metadata.
- [x] Tests: zero/one/multiple Cast, ordering/count/capacity, generated versus
  Character Look authority, expiry/owner/scope/hash, prompt mappings, no disabled
  image read/verification, old two-mode prompt and payload parity.

## C. Lifecycle And Financial Gates

Completed: quote/submit/approval/Timeline use effective authority. Per-sheet
Seedance validation now also closes the old mixed-reference loophole where an
untrusted Look could inherit the Storyboard's trust. Historical results are not
rewritten. Task transport diagnostics retain provider_original_url, never the URL.
Active-task guards consult durable terminal status because Attempt projections
can lag polling; a failed task does not permanently freeze the toggle.

- [x] Update CinematicApplicationService context/quote/create/approve to consume
  mode-specific authority through its existing entry points; no null-source crash,
  no fake approval and no bypass of authored plan/Cast readiness.
- [x] Update Generation request validation/VideoCapabilityRegistry for per-sheet
  trusted authority without requiring kind=cinematic_storyboard_source. Preserve
  trusted original URL transport, provider limits and restricted upload policy.
- [x] Bind mode, N sheet references, prompt and output settings to the canonical
  estimate and submitted request. Requote after toggle or active reference change.
- [x] Update lineage/task/Timeline consumers to review approved looks-only clips
  without demanding an unused Storyboard. Reject changed active Shot/Look/packet;
  preserve historical results and unrelated optimistic concurrency protection.
- [x] Tests: no-frame quote -> explicit submit -> mocked provider -> media/settle
  -> explicit approval -> existing Timeline contract; failed/refunded attempts;
  double-click/idempotency; stale quote and active Look change; disabled image
  replacement alone does not invalidate a looks-only clip. No auto submissions.
- [x] Backend review covers authorization/security; Commercial review confirms
  existing reservation/capture/refund invariants. QA gate precedes UI enablement.

## D. Storyboard And Produce UI

Completed: shared ProduceVideoReferences + ToggleSwitch/ProcessingSpinner and
Cinematic state/useShotVideoReferences.ts. Only explicit changes persist; the
unconfigured/no-frame compatible-model proposal causes no paid action or write.
Storyboard thumbnails are pinned selection previews, not a claim of current
provider eligibility. Quote/submit remain the authoritative validation boundary.

- [x] Extend existing selected-Shot First Frame section with Use First Frame;
  preserve preview/history/Approve and restore last on-mode when re-enabled.
- [x] Automatically display the selected Shot's pinned sheets when off/no frame,
  without opening a new Character selection flow or adding global Cast.
- [x] Make route navigation, ProduceReadinessHeader, ProduceShotQueue and Generate
  gating consume mode-aware context. Keep Storyboard progress separate from Video
  readiness. Existing image generation remains optional and reachable.
- [x] Extend ProduceVideoReferences and CinematicStageContent to show actual
  transmitted inputs, exact prompt, mode warning, loading and fresh quote.
- [x] EN/TH and shared components/spinner; test empty, invalid, pending, failed,
  completed, off/on, reload, unsupported provider and explicit retry states.
- [x] Scoped component browser screenshots/interaction at 390/820/1440px, keyboard focus and theme
  checks. Verify no overlay/overflow, no disappeared image, no hidden extra image.

## E. Regression Runner And UAT

Extend existing scripts/test-cinematic-video.js; do not create another aggregate
workflow. Add focused cases to references/payload/flow/ui and include adjacent
readiness/approval/lineage contracts in full. Runner must fail on errors and must
not generate paid media, mutate live data or start/restart workers.

Planned commands after implementation (dependencies installed):

```text
node scripts/test-cinematic-video.js references
node scripts/test-cinematic-video.js payload
node scripts/test-cinematic-video.js flow
node scripts/test-cinematic-video.js ui
node scripts/test-cinematic-video.js full
node scripts/test-cinematic-directed-openings.mjs types
node scripts/validate-i18n-catalogs.js
```

Extend the existing isolated reference-layout browser runner to exercise the
actual changed controls with mocked APIs, not a copied markup demo. Record exact
commands, source dev server prerequisite, screenshot paths and any unverified
viewport. No production build or paid UAT is implied by a successful unit run.

| Acceptance | Minimum evidence |
|---|---|
| No First Frame | No Storyboard approval needed; N sheets; manual Generate |
| Existing frame OFF | Same file/approval retained; no image fetch/dispatch |
| Frame ON again | Same approved image restored; fresh quote |
| Newly approved image while OFF | Stays OFF; no implicit input switch |
| First-frame mode without approval | Blocked as before |
| Multiple characters | Correct named mapping and N images only |
| Missing sheet or unsupported model | Clear reason; no charge/fallback |
| Seedance | Each included sheet uses valid original URL; no upload/Base64 fallback |
| Historical rejection | Source remains selectable; task outcome preserved |
| Prompt | Scene direction retained; no sheet collage or false exact-frame claim |
| Integrity | Changed active inputs stale; disabled frame not an active dependency |
| Reopen/navigate | Per-Shot choice consistent; no actor leakage |
| Video approval/Timeline | Works with nullable image authority; legacy unchanged |

Live UAT, separately authorized: use a trusted sheet already owned by the creator,
choose a supported Seedance model, inspect prompt/references and quote, then submit
one clip manually. Observe identity, opening composition, no sheet layout leakage,
motion and continuity. Record provider error/acceptance and actual cost; never
claim this mode resolves privacy moderation from mocked evidence.

No new capability, service or runtime directory is planned. Extend existing
Project/Shot and attempt records additively. Archive no media and erase no history.
Review was sequential, not independent. Product is primary; Backend/security and
QA reviewed the cross-layer contract, with UX and Commercial checklist passes
required by the UI and billable reference changes. No concurrent agents were used.

## Execution Evidence (2026-09-12)

- references: 21 tests passed, including no-source/disabled-source, ordered sheets,
  no-Cast, mode persistence, quote/submit parity, clip approval and Timeline,
  actual direction changes, and terminal-task recovery.
- flow: 42 tests passed. New cases exercise both first-frame-plus-Look and
  Looks-only using real Generation validation with mocked Credits/provider;
  assert no disabled Storyboard Asset read, no first/last-frame payload, original
  URL transport, exact counts, revocation/content mismatch and no-charge failures.
- full: 136 backend + 40 React/contract tests passed. Existing timeline, lineage,
  pricing, idempotency, refund, media failure and shared controls are included.
- TypeScript: node scripts/test-cinematic-directed-openings.mjs types passed.
- Locale catalogs: node scripts/validate-i18n-catalogs.js passed.
- git diff --check passed (unrelated existing CRLF notices only).
- Browser: node scripts/test-cinematic-video-reference-layout.js passed against
  source Vite at http://localhost:6501. Actual shared controls in EngineTargetPanel,
  on/off, keyboard Space, restored on-mode, two/three images, yellow spinner and
  pending disable checked at 390/820/1440px in default/fashion themes.
  Screenshots: C:/Users/punya/AppData/Local/Temp/cinematic-reference-layout-g9uZhl/.

Remaining verification: full authenticated project navigation and paid provider
acceptance/visual continuity require user UAT; the browser run is a scoped mocked
component fixture, not a live full-project or production-build claim. Frontend
source server was started without backend workers; restart the normal dev backend
before trying the new endpoint. Runtime JSON was not edited or backfilled.

### Prompt-Only Follow-Up (2026-09-12)

1. Requirement clarified: looks-only starts with "Use character look sheet
   references"; first-frame mode wording remains unchanged.
2. Updated only looksOnlyMode.promptPrefix in video-packet-policy.v2.json.
3. No tests run for this follow-up, as explicitly requested. Manual prompt
   inspection and generation are pending user UAT; prior evidence above predates
   this wording update. Restart the backend to reload its prompt configuration.

### Retry Lock And Notice Follow-Up (2026-09-12)

- Primary: UX implementation owner; scoped to Produce task observation/recovery
  and shared VideoEngineTargetPanel notice. No provider/Credit contract change.
- Keep fetching the durable task ID after packet_changed; approval still requires
  a current attempt/packet. This prevents stale processing snapshots from locking
  Generate after reference changes when the real task has already failed.
- Treat historical rejection as attempt history, not a new quote/source failure.
  No Storyboard recovery button in looks-only; retry copy refers to references.
- Remove Development POC notice from the shared video engine; preserve estimates.
- Implemented; no automated, browser or paid tests run at user request. Live
  button recovery is not verified in this follow-up; user UAT pending.

### Live Quote Diagnosis (2026-09-12)

- Owner: Generation's Cinematic reference validation. No pricing or storage change.
- Actual Produce context permits looks_only. Inspecting the built page with
  Seedance 2.5 reproduced "The generated Cast sheet changed." at quote time.
- Both selected Cast Assets have matching metadata.contentHash, generation binding
  and preview URL, but no top-level contentHash. Normalize the canonical stored
  hash in memory before existing source validation and authority construction.
- No migration, replacement sheet or re-selection required. Actual mismatches
  remain blocked. Removed the model selector's appended POC suffix as requested.
- No test suite or paid generation run. Diagnosis used persisted metadata, current
  context and the page's normal quote request. Post-fix UAT remains pending;
  restart the backend to load the corrected validator.
