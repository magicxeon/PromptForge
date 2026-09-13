# 005 - Bounded Video Recovery And Stable Activity

Status: Backend and Produce explicit recheck implemented; focused checks passed
(2026-09-13). Full requirement closure awaits integrated browser/UAT evidence.

## Authorized Implementation Plan

Responsive evidence follow-up authorized (2026-09-13): own only the existing
scripts/verify-cinematic-pilot.mjs plus this evidence document. Primary QA;
apply UX/security checks sequentially. Add --recovery-only without changing the
full or --media-only flows. Use existing local frontend 6501, intercept all API
traffic, and hold a same-task recheck response to inspect cooldown, pending,
click-once and retained older-media states in EN/TH at 390/820/1440. No runtime
UI/compiler edits, backend calls, paid work, live data mutation or server restart.
Validate button/source identity, accessible state, bounds/overlap and screenshots.

Follow-up authorization (2026-09-13): user temporarily assigns
CinematicStageContent.tsx and focused Produce tests to this owner. Primary UX;
QA and Backend/security reviews applied sequentially, not independent agents.
Extend only Produce submission identity and its existing recovery alert. Capture
actor/Project/Scene/Shot plus request payload in mutation variables; obsolete
actor/Project/unmounted callbacks must not populate caches or refresh another
workspace. Late Shot acceptance retains its original scope. Wire an explicit
same-task recheck, preserving preview/drafts and using backend budget/cooldown.
No compiler, pricing, provider replay, parent runner or master 050 edits.
Acceptance: delayed Shot/Scene/Project/actor responses; same-task recheck success,
cooldown/exhaustion/error, in-flight duplicate prevention and retained older Take.
Run the short Produce group added to scripts/test-video-recovery.mjs, then scoped
types/lint; record browser/UAT gaps separately.

Workstream 1 of Cinematic 050 is authorized now. Primary: Backend Platform
Architect (canonical charter is under requirements/018-implementation-backend/roles/).
Reviewers: QA and UX, applied sequentially with limited review independence;
authorization and existing Credit invariants receive a separate security gate.
Skills: implement-generation-workflow, verify-release-regressions, review-product-ux.
No new Credit transitions, submission replay, paid calls, live mutations or restarts.

1. Persist stage policy, start/deadline, error budget and next eligible check in
   existing Video task records. Add internal pure Generation recovery rules and
   server configuration; no new runtime data path. Preserve legacy timestamps.
2. Deduplicate status/copy execution and bound startup batches. Reuse getAndPoll
   and the existing task route for explicit same-task recheck, with durable
   cooldown/count and no automatic-budget reset. Preserve settlement owner.
3. Publish read-only effective activity/review state to detail and Job Center.
4. Run focused isolated tests, then sequential QA/security review. Commands:
   node scripts/test-video-recovery.mjs recovery|activity|ui|all. The runner will
   own these selectable groups and explicit aggregate. Prerequisites: installed
   repo Node dependencies; all adapters mocked and repositories temporary.

Cause trace: pollTask retries provider errors and media_retry_pending without
elapsed cutoff/backoff; resumeRecoverable repeats the same path. Concurrent
detail/startup calls can both poll/copy. Reconciliation is already terminal and
preserves unknown billing, so local cutoff must reuse it, not fail/refund.
Baseline is deterministic repeated-error fixtures, not a claim about live tasks.

## Ownership And Evidence

Generation owns execution and recovery through VideoGenerationApplicationService,
VideoProviderTaskService and VideoProviderTaskRepository. Credits retains sole
settlement authority. GenerationJobCenterService projects their state; it must
not poll a provider, dispatch work or settle Credits as a side effect of a read.
This extends 003, not a second recovery service or queue.

Current pollTask retains retryable failures as provider_processing, and retryable
output-copy failures as media_retry_pending. The inspected service has no durable
elapsed-time/retry cutoff for these paths. resumeRecoverable lists recoverable
tasks and polls them again. The user's intermittent loading symptom still needs
a focused trace: unbounded recovery is a gap, not proof of every UI flicker cause.

## Required Behavior

1. Put bounded recovery policy in the existing server configuration capability,
   with stage/provider overrides where necessary. Establish defaults from existing
   recorded durations and provider contracts; do not invent one short universal
   timeout. Cover submission uncertainty, provider waiting, retryable errors and
   output copying separately.
2. Preserve stage start/deadline, policy provenance and retry budget across process
   restarts. Ordinary polls, browser visits and reconnects do not renew a deadline.
   Backoff has a next eligible check time; retry exhaustion and elapsed cutoff
   are separate reasons. A healthy long render is not a retry failure.
3. Startup recovery, selected-task reads and explicit recovery use the same
   execution entry point and eligibility decision. Bound batch size/concurrency,
   deduplicate concurrent polls/copies, and do not start a replacement generation.
4. At cutoff stop automatic execution polling/copy retries and expose a stable
   review-required reason through existing reconciliation contracts. Local cutoff
   does not prove provider cancellation, failure or absence of a billable output.
5. Preserve task/provider IDs, reservation, usage evidence, references, media and
   Take history. Never delete, resubmit, capture or refund solely because the local
   deadline elapsed. Preserve 003's startup ownership and refunded-capture rules.
6. An authorized explicit status recheck targets the SAME provider task, is bounded,
   and does not reset automatic recovery forever. Late completion can recover its
   result through existing media/settlement owners without duplicate capture or
   overwriting an explicitly selected Take. Missing provider IDs require review,
   not speculative resubmission. Expose financial conflicts honestly.
7. Publish the same automatic-monitoring/terminal decision to Job Center and
   detail consumers. Review-required work stops the generation spinner but stays
   discoverable. Background refetch preserves visible media and user drafts;
   connectivity loading is distinct from processing. Do not hide an active job
   just to make the UI appear idle.
8. Legacy tasks derive initial deadlines from existing durable timestamps, not
   migration/restart time. Missing or inconsistent evidence requires review.
   Use additive existing task storage; no new runtime file or bulk live mutation.

## Ordered Tasks And Acceptance

Tasks 1-4 implemented/verified within this backend ownership. Coordinating order:
Cinematic enhancement-core-engine/050; parent retains cross-surface UI closure.

1. Trace lifecycle and query causes using isolated interrupted-task fixtures;
   document stage timings, policy defaults, status transitions and old-task rules.
2. Add policy and pure recovery eligibility through the existing Generation owner;
   apply it consistently to startup, polling and copy recovery.
3. Project stable activity state and implement the bounded explicit recheck through
   the existing application contract, including authorization and financial guards.
4. Verify fake-clock restart, deadline equality, backoff, repeated transient errors,
   stale writes, parallel detail/startup checks, missing provider ID, late success,
   refunded reservation conflict and retained playable output. No paid generation,
   worker restart or live-data cleanup in automated checks.

Primary implementation: Backend. Required gates: QA plus Commercial review before
any financial-state behavior changes; security review for recheck authorization.
Apply reviews sequentially if independent agents are unavailable. Reuse owning
VideoProviderTaskService, VideoGenerationApplicationService, Job Center and Credit
tests in small groups; add selectable recovery groups to existing runners only
after finding the closest owner. Freeze exact runnable commands in that task.

Rollout uses additive records and versioned policy. Rollback must not reactivate
already cut-off tasks or reinterpret reconciliation as refund permission. No
retention policy, pricing activation, Image replay or generic queue rewrite.

## Implementation Evidence (2026-09-13)

- Recovery policy v1 persists stage, budget/provenance, start/deadline, next check,
  cumulative stage error count, check token and explicit recheck count/cooldown.
  Task revision guards stale results. Existing JSON store only; no bulk backfill.
- Submission uncertainty has a 15-minute review budget; missing provider ID on
  an execution recovery immediately requires review. Provider waiting: 24 hours,
  eight transient errors; media: one hour, six transient errors. Healthy polls
  consume no error budget. Backoff starts at 5s/10s, capped at 5m. Explicit review
  rechecks: three total, 60s cooldown, no deadline/error-budget renewal.
- Calibration evidence: read-only aggregate of local completed tasks showed 29
  ModelArk records at 32-1781s and one Gemini record at 40s. ModelArk adapter's
  existing individual HTTP timeout is 180s. The 24h/1h budgets are conservative
  operational review thresholds, not verified provider deadlines or billability
  evidence; sparse provider data remains a tuning risk. No provider web claim.
- Existing pollTask is shared by startup/detail/recheck. At most 24 eligible
  startup rows, four in-process provider/copy flights, one flight per task/file.
  Single-process settlement coalesces and rereads owner state; Credit transition
  predicates are unchanged. No refund/capture on local cutoff. No provider replay.
- Job Center reads project expiry without mutation; execution persists cutoff.
  Actor activity counts precede display limits, with only 24 projected rows
  retained. The JSON adapter must still read its existing whole source document;
  database/distributed concurrency remains deferred, not claimed solved.
- New owners: server/config/videoRecoveryPolicy.js,
  server/domain/generation/VideoTaskRecovery.js, test/videoTaskRecovery.test.js,
  scripts/test-video-recovery.mjs. Existing repository/application/routes extended.
  Architecture master updated; no moved files or new runtime data paths.

Validation: recovery group 35 passed (30 provider/recovery/route plus five existing
application lifecycle tests); activity group nine passed. New fixtures cover
deadline equality/restart, exponential backoff/exhaustion, policy snapshot,
missing/invalid legacy evidence, partial media, concurrent/stale work, concurrency
cap, explicit cooldown/exhaustion, ownership, late capture and refunded conflict.
Commands: node scripts/test-video-recovery.mjs recovery; activity; all.
Aggregate all also passed before the final additional concurrency assertion;
the final recovery group was rerun after that assertion. No paid/live execution.

Broader exploratory node --test test/videoGenerationApplicationService.test.js
had three failures outside recovery: both imported=true multimodal Look cases
reject source_authority_invalid, and the missing-credential fixture encounters
incomplete Storyboard authority first. Existing focused lifecycle cases all pass.
Those quote/reference fixtures are parent-owned follow-up, not suppressed by
changing production authority or claiming the broad suite green.

Parent subsequently authorized fixture-only baseline reconciliation. Importing
the staged VideoGenerationApplicationService in-memory reproduced the same
25-pass/3-fail result, excluding this round's prompt/recovery edits. The matrix
and credential-order cases assume restricted source policy, while current default
configuration is open. Pin their injected VideoCapabilityRegistry sourcePolicy
to the restricted fixture policy; retain all forged/hash/revocation/no-billing
assertions. Do not add fabricated immutable Asset metadata or weaken runtime
checks. Separate existing open-policy imported-Look authority failure is reported
to parent for capability-owner remediation; these legacy fixtures do not certify
that open-policy path.

Fixture reconciliation result: node --test test/videoGenerationApplicationService.test.js
now passes 28/28. Production source authorization is unchanged. Existing full
recovery group remains 35/35. Restricted-policy fixture injection is the only
agent edit to that test file beyond pre-existing/concurrent work.

Sequential QA/security review: owner-scoped recheck, no billing-policy change,
same provider task, retained outputs/reservations and no source deletion verified.
Review is not a separately executed independent-agent certification.

Parent contract: getVideoTask(taskId, { recheck: true }) uses existing GET
/api/generation/video/tasks/:taskId?recheck=true (private/no-store, strict flag,
actor authorization). Only expose explicit action when recheckAllowed; disable
while in flight. It may return reviewRequired again; never auto-loop the flag.
Use recovery.explicitNextCheckAt/count for cooldown/budget, refresh the same task
cache and Job Center and Project without selecting a different Take or clearing
media/drafts. Financial reconciliation conflicts remain unavailable for recheck.

## Produce Follow-Up Evidence (2026-09-13)

Cause reproduced in focused React tests: pending mutation options follow the
new render. The old onSuccess closure used current selectionScope and actorId,
binding Shot A acceptance to Shot B. Submission now captures actor/Project/Scene/
Shot, scope, quote/request payload and idempotency key before dispatch. A captured
workspace lifetime is invalidated on actor/Project changes and unmount; callbacks
also compare the active actor before any cache write, invalidation or refresh.
Late same-Project acceptance retains original scope and actor-scoped Job Center
invalidation. Pending/error feedback cannot migrate to another Shot or actor.

Current source had no task-status recovery button. Added the explicit command
inside the existing provider-recovery alert, preserving its source-repair action.
It calls getVideoTask(taskId, { recheck: true }) once with mutation retry disabled,
updates the same actor/task cache and refreshes Job Center/Project. Backend
recheckAllowed controls availability; count and next eligible time are visible.
One cleanup-bound timer performs an ordinary status read at a future cooldown
expiry to refresh server eligibility, never another explicit provider recheck.
No deadline/budget renewal, replacement submission, approval or Credit operation.
Review-required is labeled honestly rather than failed; retained media, selected
older Take and unsaved motion direction survive recheck.

Files: CinematicStageContent.tsx, CinematicProduceRuntime.test.tsx, existing EN/TH
cinematic catalogs, scripts/test-video-recovery.mjs (new produce group), this doc.
No new/moved files, runtime paths, compiler edits or master/parent runner edits.
Command: node scripts/test-video-recovery.mjs produce -> 48/48 passed (13 new
regressions plus 35 existing Produce checks). Tests cover delayed Shot/Scene
acceptance, actor/Project/unmount isolation, same-task explicit recovery,
in-flight duplicate prevention, older Take/draft retention, exhausted/financial/
cooldown states, one ordinary eligibility refresh, and transport failure.
The prior reconciliation assertion now targets Generate's accessible disabled
reason because both the recovery alert and Generate correctly show that reason.
TypeScript app check with --noEmit --incremental false passed. Scoped ESLint
has no errors; pre-existing unrelated warnings remain. No live or paid calls.
New recovery-control responsive/full-AppShell browser UAT remains unverified;
parent's media-player browser evidence does not by itself close that UI gap.

Final scoped diff check and six new EN/TH keys/interpolation parity passed.
ESLint reports zero errors and eight existing warnings outside this follow-up.
Read-only parent review: four focused checks passed for provisional actor-owned
preflight, selected Take execution timing, bounded legacy fingerprint acceptance,
and shorter manual timeline cutoff without acceleration. The prior manual-timing
P1 is addressed in the inspected parent diff. No compiler/backend changes made
during this follow-up; this limited review is not full prompt/backend certification.

## Recovery Browser Evidence (2026-09-13)

Added --recovery-only to the existing scripts/verify-cinematic-pilot.mjs.
Command: node scripts/verify-cinematic-pilot.mjs --recovery-only. Prerequisite:
existing Vite frontend at http://127.0.0.1:6501 (CINEMATIC_WEB_ORIGIN may override
with localhost/127.0.0.1). This branch does not start/restart any server or worker.
All browser APIs are intercepted; only fixture GETs and quote POSTs are allowed.
The two media sources are browser-generated WebM blob URLs, not private/live media.

EN/TH x 390/820/1440: cooldown click sends nothing; a keyboard-triggered explicit
recheck is held pending; duplicate click sends nothing; exactly one same-task
?recheck=true occurs. Returned cooldown is disabled with 1/3 budget visible.
Original player node/currentSrc, nonblank decoded pixels, selected older Take,
unsaved direction and button node remain intact. One Project refresh occurs.
Reduced-motion spinner, alert/button bounds, text fit and no overlap/horizontal
overflow pass in all six cases. Fixture eligibility is advanced explicitly with
an ordinary query refresh; automatic expiry timing is covered by the React test.

Browser gate FAIL: all six cases expose a 42px -> 36px pending button-height
shift. The idle RotateCcw has its default 24px size; pending ProcessingSpinner
is size-4 (16px). Desktop/tablet width also changes with the pending label
(EN: 138.0625px -> 135.71875px; TH: 170.609375px -> 156.140625px).
Parent owns the production fix: align icon sizes
and reserve a stable command width while retaining mobile full-width behavior.
Assertions retain these failures rather than weakening layout acceptance.
No production UI/CSS edits made by this script-only owner.

Inspected full desktop/pending and Thai mobile/returned screenshots, including
legible control crops. Latest artifacts:
C:/Users/punya/AppData/Local/Temp/mpf-cinematic-pilot-ekSbuz
(36 screenshots and recovery-evidence.json with six cases and intercepted paths).
The existing full branch passes (artifacts mpf-cinematic-pilot-yBZLIm), as does
--media-only (mpf-cinematic-pilot-aiqCqE). Scoped diff check passes. Responsive
evidence collection is complete, but the layout defect requires correction and
a green recovery-only rerun before this gap can be marked closed. Full live
AppShell/paid-provider UAT remains separate and was not performed.

### Recovery Control Layout Correction

Parent corrected the measured shift: idle and pending icons are both size-4;
the command reserves h-10/w-52 with max-w-full and shrink-0. No other control
changed. node scripts/verify-cinematic-pilot.mjs --recovery-only now PASSES
EN/TH at 390/820/1440, including the unchanged strict height/width assertions,
one explicit recheck, cooldown, retained media/draft and reduced motion.
Final artifacts: C:/Users/punya/AppData/Local/Temp/mpf-cinematic-pilot-otHtQA.
This closes the isolated responsive recovery-control defect above. Full live
AppShell/provider UAT remains separate. No live mutation or restart.
