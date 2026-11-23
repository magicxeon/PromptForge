# FE24 implementation — Image preview on port 6502

2026-11-20: user authorized implementation. Scope of this increment: T01–T05 / M1.
Primary: UX/UI Product Designer; root coordinates and implements. Image first,
then Video/Comparison remain the following milestones; production cutover stays separate.

## T01 decisions

- `web-next/`, React/TypeScript/Vite, localhost:6502, same-origin proxy to127.0.0.1:6500.
- One neutral light palette, dark text, restrained teal action, Noto Sans Thai/Poppins.
- Compact model bar, always-visible Prompt, references/settings below; result viewer and
  recent outputs beside it. Mobile Create/Results tabs preserve mounted state.
- Existing Radix controls where required, native labelled form controls for simple choices.
  No package additions solely for the proposed component shortlist. Native image viewer
  implements Fit/100%/bounded zoom/pan; original bytes through canonical authenticated transport.
- Bounded compatibility bridge imports existing public client owners without copying or moving
  sensitive runtime code. No new shared package imports back into either app. This replaces
  the proposed broad extraction for M1. Remove bridge only when a separately reviewed shared
  package extraction preserves both consumers; until then `web/` remains canonical owner.
- Existing ActorProvider, apiClient, schemas, generation/status/history APIs, polling hooks,
  actor storage and ProcessingSpinner are reused. New presentation and draft namespace isolated.
- Development proxy preserves Origin; explicit loopback6502 allowance must be Identity-owned.
  No wildcard, no change to production auth policy, no secrets copied to frontend.
- Image unknown submission needs owner-supported lookup by retained request identity.
  Missing response is not permission to resubmit. Backend prerequisite is part of this increment.
- Recent Image uses existing24-item cursor history; Video/Comparison live in legacy frontend
  until their own increments. No new server storage paths or provider dispatch paths.

## Evidence and remaining checks

M1 isolated Image preview implemented; all business calls use existing canonical clients.
No paid provider calls were made. Execution statuses/reviewer identities live in `task-plan.json`.

### Delivered behavior and boundaries

Image Prompt/reference → model/settings → current quote → explicit submit → observe →
History/original inspection/download. Enter never submits. References retain Replace/Remove,
late upload responses do not revive removed slots, and interrupted uploads become reselectable.
Reference thumbnails can open in the main viewer. Existing role-based reference contract is
preserved; this increment does not invent generic-reference/provider parameters.

Intent is persisted before POST with request ID/estimate ID/input hash. Unknown outcome retains
the identity across reload and only GET-checks; no blind replay. Existing credits/queue settle.
The compiled-prompt debug endpoint stays admin-only; ordinary customers do not depend on it.
API recovery reads via Generation→Credits facade→read-only repository. It never uses the
repository migration path, writes a balance, refunds, or dispatches work. Missing/foreign
mapping is indistinguishable; orphan/conflicting mappings require reconciliation.

New application paths: `web-next/` only; no existing files moved. Root workspace scripts and
package lock updated. Canonical client adds a Zod-validated request lookup; backend public
entry point and explicit local6502 origin reflected in architecture map. Server data paths
unchanged. New browser namespaces `fe24-image` and `fe24-image-intent` use canonical actor/auth
scope. Reference storage keys contain no URL query/credential/image bytes; server rechecks access.

### Checks actually performed

- `node --test test/generationRequestRecovery.test.js test/generationGroup.test.js test/authentication/developmentAdmin.test.js test/authentication/developmentBypass.test.js`:21/21 pass; worker and independent reviewer. Includes file byte/mtime immutability, foreign ownership, orphan/ambiguous mappings and zero reserve/enqueue/provider calls.
- From `web/`, `npx.cmd vitest run src/features/generation/api/imageRequestRecovery.test.ts src/features/generation/api/generationApi.test.ts --configLoader runner`:14/14 pass, independent reviewer.
- `node node_modules/typescript/bin/tsc --project web/tsconfig.app.json --incremental false --noEmit --pretty false`:pass; backend worker.
- `npm.cmd run typecheck --workspace web-next` and `npm.cmd run build:web-next`:pass.
- `node web-next/test/browser-check.mjs`:pass, all API/media intercepted. Root and independent sensitive reviewer verified changed-input price hiding, one POST on double click, unknown reload→lookup without POST, Fit/100%, focus restoration, reauth portal/download suspension, TH/EN390/820/1440 and no horizontal overflow. Root additionally verified regular session customers do not call admin preview, keyboard pan and CDP two-finger pinch from Fit.
- Captures `_temp/fe24/image-{390,820,1440}-{th,en}.png` and `results-390-{th,en}.png`; UX/QA independently inspected820 EN/TH,390 Create and Results. Flat green media in captures is an isolated fixture, not generated provider output.
- TH/EN96-key/interpolation parity passed; source formatted with existing Prettier.
- Windows `npm.ps1` execution policy prevented plain npm; used `npm.cmd` without changing policy. Existing web build-info/Vitest temporary cache permissions avoided with no-incremental/configLoader runner. Playwright CLI unavailable offline; existing Playwright library drove the isolated browser harness.
- Git diff unavailable because workspace lacks Git metadata; no Git management performed. Scoped file/link/JSON checks used instead.

### Independent reviewers

- `/root/fe24_sensitive_review`: B1 Security/Backend/Commercial/QA PASS; M1 Security/Backend/Commercial source PASS and scoped mocked-browser QA PASS.
- `/root/fe24_frontend_review`: UX/QA PASS for bounded local Image preview after corrective review and responsive captures. Not full Image UAT.
- `/root/fe24_connection_inventory`: read-only T01 interface/dependency/auth inventory; root implemented the compatibility bridge.
- `/root/fe24_backend_delivery`: B1 implementation and focused checks, not its own final reviewer.

### Limits and next milestones

Initial M1 verification used mocked APIs and made no paid/live provider run. The later launcher
correction below adds actual local backend/browser readiness evidence, without generating media.
Production auth origins/cookies remain configuration-owned; preview does not
automatically approve localhost6502 for production sessions. Login opens the old same-host page
and returns manually. Cross-origin logout is detected on focus/API validation, not immediately
by BroadcastChannel while the preview stays foreground.

Physical-device touch, browser200% text reflow and the complete aspect-ratio/error/UAT matrix
remain unverified; these are required before full production cutover, not claimed passed here.
Bundle builds with a519KB minified entry (~162KB gzip) warning; no arbitrary warning-limit increase.
T06 Video and T07 Comparison use the existing frontend links in this M1 delivery; their new UI
and T08 production cutover are not marked complete. No existing route removed.

### Run

Existing API:port6500. New frontend: `npm.cmd run dev:web-next` at repository root or
`web-next/start-dev.bat`, then `http://localhost:6502`. See `web-next/README.md`.

### Local launcher correction — port6502 already in use

User requested a script under `scripts/` to clear a lingering frontend port. Case C,
one implementer; no application/auth/generation contract change. Root `dev:web-next`
now calls `scripts/start-web-next.mjs`; `scripts/start-web-next.bat` is the Windows entry,
and the old frontend BAT forwards to it. `stop:web-next` clears without relaunching.
Only the exact workspace/node/Vite/config/host/port command is eligible for termination;
the previous launcher is recognized only with this repository's exact normalized Vite
path plus the exact `npm run dev --workspace web-next` ancestor. The Windows helper
checks creation time again before Stop-Process. Unidentified listeners are refused.
Port remains6502 to preserve Identity origins. No backend restarts,
production data operations, Git work or application build are needed for this launcher.
Validation: Node syntax and PowerShell parser passed. Actual legacy frontend PID8036
was identified by repository Vite path and npm workspace ancestry, stopped, and replaced.
Running root `dev:web-next` again replaced only the new marked frontend successfully.
`stop:web-next` then cleared6502. An isolated unrelated TCP listener was refused and
remained alive; the fixture closed itself afterwards. Port left free for the user.
Process inspection initially hit the tool sandbox's CIM access restriction; the same
scoped checks ran outside that sandbox after automatic approval, without changing global
execution policy or permissions. Windows launcher applies Bypass to its helper process
only, matching existing repository launcher conventions. No app tests/build or paid calls.
Architecture map updated for the new scripts-owned launcher; no runtime data paths changed.

### Launcher correction — refused API connection

**Windows BAT restart.** `scripts/start-web-next.bat` now passes `--restart-api`. The launcher replaces an API on 6500 only after identifying this repository's exact local Web Next API command and rechecking process creation time. It waits for API health and auth configuration before opening Vite. The npm command without the flag still reuses a healthy backend. Run the BAT after active jobs finish.

Validation covered Node and PowerShell syntax, simulated acceptance of the workspace API and rejection of an unrelated listener, and read-only identification of the existing development API. The running API was left in place.

The prior launcher started Vite only, leaving `/api/auth/config` proxied to a stopped
API6500. Case C: restore the intended one-command local startup. The launcher now reuses
healthy API6500, or starts canonical `server/server.js` when the port is free, using
`developmentApiEnvironment` and unchanged server-owned .env/auth policy. It waits for
both health and the auth-config contract before opening Vite. An occupied unhealthy
API is never killed; startup fails clearly. A newly started shared API stays alive across
frontend restarts/stop; its startup log is stored under the printed OS temporary path.
No application UI, credentials, authorization, billing policy or provider dispatch changed.
Acceptance: cold start, warm reuse without duplicate API, real auth/me/catalog through6502,
and actual browser load without API mocks/proxy refusal.

Validation passed:
- Cold start from stopped6500: launcher started the real backend, health/auth-config became
  ready, then Vite6502 started. Auth config200 with contractVersion1 through both6500 and6502.
- Actual Chromium opened `http://localhost:6502` without API interception. Auth config, me,
  providers, history and job-center all returned200; Prompt visible,22 model options loaded,
  Generate correctly disabled for empty Prompt, zero browser/API/network errors.
- Warm relaunch stopped/replaced only the known frontend and logged API reuse. The API retained
  PID16976 with exactly one listener owner, proving no duplicate backend or restart.
- `node --check scripts/start-web-next.mjs` passed;
  `node --test test/authentication/developmentStartup.test.js` passed3/3.
- No Generate POST, provider invocation, env/secret edit, Git work or app build. Backend and
  frontend left running for the user. Earlier mocked M1 evidence remains separately scoped.

### FE24-U1 — provider menu, prompt expansion, Fit and window return

Approved scope: [UX section8](001-ux-and-screen-components.md#8-approved-interaction-correction--fe24-u1-2026-11-20).
Case F only for the shared Identity boundary; primary UX, scoped QA and independent
Security review. Root is sole implementer. Existing references/settings/quote/
Generate/activity/history and Video/Comparison links remain in place.

Implemented:
- Reuse canonical `GenerationModelPicker` through `web-next/src/lib/canonical.ts`:
  provider categories, model search, selected model and keyboard flow. New preview
  styles/catalog labels only; shared picker implementation and provider catalog
  remain authoritative. No new dependency or copied model capability table.
- New `features/playground/components/PromptEditor.tsx` owns inline and expanded
  editing of the same draft, text selection, count, Escape/Close and focus return.
  No new Save or Generate action in the modal; TH/EN catalogs remain aligned.
- ImageViewer attaches ResizeObserver to the actual inline/portal surface and
  resets manual zoom on both expanded transitions. Retains Fit/100%/pan/pinch,
  original download and small-image no-upscale behavior. The initial browser
  check caught portal measurement occurring before the surface mounted; callback
  ref attachment fixes that case, and the regression now checks measured Fit.
- Canonical ActorProvider coalesces focus/visibility checks and compares full
  Actor/config. actorStore owns one bounded revalidation barrier; apiClient waits
  before private dispatch and JSON/blob/stream publication, preserving original
  request epoch/cancellation. No replay, query invalidation or media URL revocation
  for unchanged sessions. Hard invalidation unmounts private presentation and
  clears old actor/mode/authority state or failed-resolution drafts. Private401
  bypasses the background wait and invalidates immediately; rejected Login keeps
  its existing exception. Explicit logout/identity invalidation remains hard.

Source owners: existing FE24 and shared Identity/API. No moved files, new runtime
data paths, backend authorization/provider/billing changes or Git operations.
Architecture map's shared API/Identity row and AUTH-005 explicitly document the
new barrier and reconcile AUTH-T13A's old hide-on-every-focus behavior.

Focused evidence (2026-11-20):
- `npx.cmd vitest run src/lib/auth/ActorProvider.test.tsx src/lib/api/apiClient.test.ts --configLoader runner`
  from `web/`:35/35 pass, including same-session singleflight, actor/role/security
  changes, guest, changed CSRF, stale success/failure, timeout/unmount, waiting
  mutation cancellation, decoded JSON/blob isolation, SSE pause/resume and
  private401 during a delayed check. Existing picker suite:13/13 pass unchanged.
- `node web-next/test/browser-check.mjs`:pass. All API/media mocked; provider
  category/search/keyboard selection, prompt draft/selection/focus/no-submit,
  TH/EN390/820/1440 bounds, measured Fit after100% on expand and collapse, existing
  pan/pinch, unknown-request recovery, once-only submit and explicit private portal
  gating. Screenshots under `_temp/fe24/`; representative screenshots inspected.
- Window-return baseline: focus/visibility hard-resolved identity and discarded
  displayed media. After correction: paired events produce one identity check,
  same object URL/zoom/expanded dialog, zero extra media downloads. Barrier owner
  is Identity, one in-memory promise per active check,10s timeout, released on
  confirmation/hard invalidation/unmount; no new persistent cache or polling loop.
- Actual Chromium against `http://localhost:6502` and real API6500 (no mocks):22
  image models across5 providers, prompt modal retains text on switching to another
  page and returning, no loading overlay, zero browser errors and zero Generate
  POSTs. No live provider invocation or Credits spend. Frontend/API left running.
- `npm.cmd run build:web-next`:pass. Entry580.89KB /182.66KB gzip; existing500KB
  bundle warning remains visible. Bundle optimization is outside this correction.

Physical-device keyboard/assistive-tech checks and the broader production-cutover
UAT matrix remain outside this scoped preview verification.

Independent reviewer `/root/fe24_focus_security`:Security PASS, scoped QA PASS and
scoped UX PASS. The reviewer independently executed35 Identity/API tests and
reviewed the four interaction sources, browser assertions and six representative
TH/EN screenshots across390/820/1440. Browser execution/build remain root-run
evidence, not claimed independently rerun. The identified delayed401 handling was
corrected and verified before acceptance. TH/EN101-key/interpolation parity and
affected owner paths passed. FE24-U1 is complete; no remaining required work in
these four corrections. Later Video/Comparison migration is unchanged.

## FE24-CV — Comparison and Video preview (2026-11-20)

User authorized implementation of006/007. Primary: UX/UI implementation;
Backend, Commercial, Security and QA review cover existing sensitive boundaries.
Root owns shell/Comparison/shared presentation/docs; `fe24_cv_video` owns new
Video presentation and its scoped browser check; `fe24_cv_backend` owns canonical
request-recovery additions. Independent review: `fe24_focus_security`.
See task-plan.json for acceptance/review disposition; no Git or paid generation.

Delivered behavior:
- Local6502 navigation is Image → Comparison → Video, with `/` redirecting to
  `/image`. Drafts are separate; handoffs carry identityScope, reject mismatches,
  clear router state after consumption, and require explicit application.
- Comparison has capability-driven provider/model slots, stable IDs, enable/reorder,
  ratio intersection, resolution from canonical quotes, enabled-slot-only totals,
  durable request intent, unknown lookup, per-slot status, successful images,
  zoom/download, rename (100-character owner limit), winner and bounded history.
  Partial/all-failed runs retain status/logs without empty media cards.
- Video has existing typed text/image/Character-look inputs, upload/generated/
  trusted/approved-Look sources, config-driven duration slider or selector,
  ratio/resolution/audio, durable intent and canonical quote/consent/task monitoring.
  Failed source indexes map through the submitted plan; renaming retains rejection,
  replacing an asset clears its old rejection, and remove-during-upload ignores
  late replies. Activity inspection does not unlock an active submission.
- Recent Video contains only completed tasks with assets. Native same-origin
  playback/seek/fullscreen/download uses original files. Media Retry is local,
  never resubmits generation or loops identity refresh; current retried player
  is paused and src cleared at unmount/identity invalidation.
- Both submissions retain their stable request key for every uncertain HTTP
  failure; status recovery is GET-only. Existing Credit confirmation preferences
  remain authoritative. Stale/expired quotes cannot authorize a different input.

Owner contracts and placement:
- ComparisonOrchestrator/Repository and comparisonRoutes own new read-only
  `GET /api/comparisons/policy` and `GET /api/comparisons/requests/:requestId`.
  `submitComparison` accepts an optional fifth idempotency-key argument, preserving
  old callers. VideoGenerationApplicationService/videoGenerationRoutes own new
  `GET /api/generation/video/requests/:requestId` using existing durable mapping.
  Foreign/unknown keys disclose no asset; lookup has no provider polling, dispatch,
  reservation/capture/refund or new storage location.
- New Comparison files: `web-next/src/features/comparisons/{routes,components,hooks,state}/`.
  New Video files: `features/playground/{routes/VideoWorkspace.tsx,hooks/useVideoWorkspace.ts,
  state/videoDraft.ts,components/VideoSources.tsx}`, `components/media/VideoViewer.tsx`.
  Shared shell uses `app/WorkspaceNavigation.tsx`; styles/locales split by workspace.
- Browser draft/intent features: `fe24-comparison`, `fe24-comparison-intent`,
  `fe24-video`, `fe24-video-intent`, schemaVersion1 through actor-scoped storage.
  Only input metadata/relative storage keys/version IDs persist, never file bytes.
  Existing server data/output locations unchanged; no moved files. Architecture
  map updated for implemented presentation, new public reads and locale ownership.

Scoped evidence:
- Backend worker:33 focused Node tests,21 canonical API Vitest tests, old-web
  TypeScript and7 JS syntax checks pass. Independent reviewer reran recovery/local
  admin9 tests and API21 tests before Backend/Commercial/Security/scopedQA acceptance.
- `node --test test/authentication/privateMedia.test.js`:12 pass, including
  private original/poster/video ownership, bounded/suffix Range, guest/foreign,
  deleted assets and authority revocation during bounded streaming.
- Video state tests:6 pass (duration lists, source-plan authority, persistence,
  cooldown). TypeScript checked through the final production build.
- `node web-next/test/comparison-video-check.mjs`:pass. Fully intercepted APIs;
  slots/disabled totals, consent cancel/confirm, double-click, expired/out-of-order
  quotes in both modes, lost-response/reload lookup, partial/all-failed results,
  winner/zoom, Video seek/fullscreen/media retry, retried-node cleanup, foreign
  handoff rejection on all three routes and explicit identity gate. TH/EN at
  390/820/1440 plus CSS200% layout/reflow; captures under `_temp/fe24-cv/`.
  Uses installed FFmpeg to finalize a generated synthetic WebM fixture's seek index.
- `node web-next/test/video-sources-check.mjs`:pass. Intercepted mixed upload
  success/failure, per-file retry, removal/late success, multiple rejection indexes,
  rename versus replacement and Image→Video confirm/cancel/reload/no auto-submit.
- `node web-next/test/browser-check.mjs`:existing Image regression pass,
  including private portal/focus, prompt/model controls, Fit/zoom and unknown recovery.
- `node web-next/test/live-preview-check.mjs`:real Chromium/API6500 through6502,
  read-only:2 initial Comparison slots,10 Video catalog models, policy/read-only
  unknown lookups200,0 mutations and0 browser errors. API restarted only after
  confirming active job count0 and exact process ownership; services left running.
- `npm.cmd run build:web-next`:pass. Entry781.92KB /231.26KB gzip; Vite's existing
  500KB chunk warning remains visible. No warning-limit change or unrelated tuning.

Limits: no paid generation or provider qualification claimed; native physical-device,
screen-reader and actual browser-toolbar zoom checks remain in broader cutover UAT
(CSS200% reflow was checked here). Video first/last-frame and audio/video-reference
inputs await an end-to-end typed DTO; Image Comparison only, no Video Comparison.
Video Recent is12 tasks with a link to the old workspace, not unlimited pagination.
Trusted-only Image handoff checks the first bounded source page; older eligible
images remain available via the paginated source picker. Default production frontend
and advanced old-workspace actions remain unchanged; T08 cutover needs separate approval.

Final review: `/root/fe24_focus_security` independently reviewed source, assertions
and representative captures: Backend, Commercial, Security, UX and scoped QA PASS.
The final200% Comparison finding was corrected with a result-container breakpoint
and contained button wrapping; browser assertions now check action bounds inside
each card, not just page overflow. Final browser rerun and build pass after that
correction. Browser/build/private-media/live-smoke execution is implementation-thread
evidence, not claimed independently rerun by the reviewer. TH/EN key/interpolation
parity:workspace107/comparison38/video111. Local requirement links and execution
plan structure checked. FE24-CV-B and FE24-CV-UI complete for the preview scope;
no required implementation work remains in this delivery.

## Comparison history parity correction — 2026-11-20

Implemented006§8: preview mosaics, configurable five-set lazy history, independent
history modal, complete slot gallery, submitted settings and canonical metadata/
export controls. Active authoring draft and current results remain intact.
Configuration: `web-next/src/features/comparisons/config/comparison-ui.json`.
Canonical list helper accepts optional pageSize while legacy callers retain18.
Architecture map updated; no runtime-data migration or moved files.

Focused browser acceptance,3 canonical export tests, typecheck/build and live
read-only five-card/four-image smoke passed. TH/EN390/820/1440 and CSS200% covered;
evidence and limits in006§8, captures under `_temp/fe24-history/`.
This correction used one implementer and sequential UX/QA review; earlier
independent reviews above do not claim review of this new change. No paid
generation or live export mutation was performed. Existing build chunk warning
remains; no required history-correction work remains.

## Playground route loading

The default Image route starts with the main bundle. Comparison and Video load their own route modules when opened, with the existing processing indicator during loading. Production build entry size dropped from 951.25 kB to 844.00 kB before gzip and from 283.44 kB to 253.37 kB after gzip. The Vite large-chunk warning remains. The browser fixture covers direct route access, tab navigation, draft handoffs, and Image, Comparison and Video operations.
