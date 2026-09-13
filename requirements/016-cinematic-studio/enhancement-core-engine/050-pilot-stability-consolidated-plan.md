# 050 - Pilot Stability: Consolidated Requirements And Delivery Order

Status: Scoped implementation delivered (2026-09-13). Focused automated/browser
evidence is recorded below. 049 semantic fallback and general visual contradiction
checks remain open; paid-provider quality/real speech remain user UAT.

Execution allocation: Generation worker owns recovery/header (1-2); Cinematic
direction worker owns Plan review and reference layout (5,7); primary integration
owner handles selection/timing and prompt (3-4,6). Three active owners work on
disjoint files where possible; shared timing/prompt integration follows dependency
order. Focused commands initially: node --test test/videoProviderTaskService.test.js,
node --test test/cinematicVideoPacketCompiler.test.js, node --test
test/cinematicApplicationService.test.js; frontend uses root Vitest with web cwd
and --configLoader runner on CinematicProduceRuntime.test.tsx. No paid calls.

## Outcome And Ownership

Finish the pending pilot usability and direction corrections without duplicating
state, prompt, polling or Generation workflows. This document owns sequencing and
reconciliation; linked requirements remain the behavior owners.

Primary role: Product And Requirement Architect. Review at execution gates:
Backend/QA for lifecycle, selection and timing contracts; Cinematic/Generative
Cinematic Production for dialogue and reference-aware prompts; scoped UX/QA for
changed controls. Commercial and security gates apply to recovery/authorization
or financial changes. Activate only the roles needed for each small task, normally
one primary and at most two reviewers at once; perform additional mandatory gates
sequentially. Two workers implemented distinct scopes; recovery owner then reviewed
parent timing and async scope, and direction owner reviewed parent prompt guards.
These are scoped independent reviews, not full independent release certification.

Skills for implementation, only at their matching task: implement-generation-workflow,
design-cinematic-experience, direct-generative-cinematic-production,
review-generative-media-pipeline, review-product-ux and verify-release-regressions;
review-commercial-integrity when financial contracts are touched.

## Scope Reconciliation

- Seven workstreams below form this round. Prompt simplification using Storyboard
  evidence is part of 049, not an eighth optimizer or a new compiler.
- This schedule supersedes older "primary next" / separately parked scheduling
  text for 046-049 and Produce 022-023. The user's next instruction authorized
  execution; per-task evidence rather than authorization determines completion.
- AI duration is a suggested default. User-selected supported Take duration wins;
  speech/performance warnings are advisory without mandatory acknowledgement.
- Actual provider payload limits, ownership, mode-aware source checks, current
  quotes, affordability and duplicate/settlement protection remain necessary gates.
  Do not replace one creative lock with another readiness or approval lock.
- Do not treat the current internal 4,000-character setting as a verified Seedance
  API limit. Audit documented limits, units and downstream truncation in 049 first.
- Preserve the completed Plan-version-only keyframe fingerprint correction in
  Produce 003. Do not redo it, remove material-staleness checks, or require a new
  image/approval solely because a Take duration changed.
- Preserve current Simple one-row/one-clip and Advanced flows, facial treatment,
  Scene images, reference toggles/order, selected Takes, downloads and old media.
  No automatic live Plan repair, new rendering, source removal or model switching.

## Delivery Order

Priority follows shared-code dependencies and blocking risk, not screen order.
Do not finish a task by running every repository test; attach focused evidence
before advancing. No estimate of hours is implied by this ordering.

| Order | Owning requirement | Change and reason for order |
| --- | --- | --- |
| 1 | [Job Center 005](../../017-unified-generation-job-center/005-bounded-video-recovery.md) | Bound interrupted-task recovery first. Stabilize the shared lifecycle and preserve unknown billable work before any UI consumes new terminal/activity semantics. |
| 2 | [Job Center 006](../../017-unified-generation-job-center/006-video-header-processing-feedback.md) | Restore global Video activity using the same lifecycle and accepted-submit invalidation. No second poller or spinner implementation. |
| 3 | [Produce 023](../produce-video-pipeline/023-shot-take-preview-synchronization.md) | Fix Shot/Take selection and stale responses. Establish the actor/project/scene/shot/attempt scope used by the next task's drafts and quote results. |
| 4 | [Produce 022](../produce-video-pipeline/022-user-controlled-take-duration.md) | Make supported Take duration user-controlled end to end: draft, packet, quote, submit, usable range and download. Do not just unlock a dropdown. |
| 5 | [047](047-dialogue-timing-and-performance-readiness.md) / [048](048-dialogue-direction-implementation-plan.md) | Improve AI default dialogue timing, emotion, gaze and listener coverage. Review after final time allocation; preserve user overrides and existing Plans. |
| 6 | [049](049-final-prompt-budget-preflight.md) | Compose and optimize the final prompt after timing/direction contracts stabilize. Reuse one preparation path for early checks and final quote/dispatch; simplify static reference-backed detail without losing authority or temporal meaning. |
| 7 | [046](046-storyboard-reference-layout.md) | Polish only the reference-image area using final shared states: consistent thumbnails/names, aligned source controls, accessible responsive layout. Final scoped UX review covers all changed surfaces. |

Orders 1-2, 3-4 and 5-6 are cohesive coding passes, not permission for large
unreviewed changes. Order 7 has no dependency on AI output quality, but doing the
final presentation pass once avoids repeated layout and localization edits.

## Small Ordered Tasks

### 0. Baseline And Contract Inventory

- [x] Capture isolated fixtures for stuck recovery, missed header activity, Shot/
  Take mismatch, duration reset, long Thai apology and final prompt overflow.
- [x] Trace each failure before choosing an implementation fix. Preserve distinction
  between inspected gaps and unconfirmed causes; do not mutate the user's Project.
- [x] Audit actual prompt limits/count units and the Generation input truncation
  path early; inventory shared selection, activity and duration fields once.
- [x] Assign existing test files/runners to the focused groups below. Document
  precise runnable commands and prerequisites before starting each code task.

### 1-2. Recovery And Global Status

- [x] Implement stage-aware persistent cutoff/backoff and bounded same-task recovery
  in the existing Generation owner; preserve Credit reconciliation and task history.
- [x] Verify startup/detail concurrency, no replay and no double settlement with
  fake clocks/adapters. Finalize the shared active/review/terminal projection.
- [x] Wire accepted Video submissions to existing Job Center invalidation and
  status presentation; verify idle-to-active and cutoff-to-review without flicker.

### 3-4. Selection And User-Controlled Take Timing

- [x] Stabilize selected Shot/Take identity independently of latest active-job
  monitoring. Verify actual media currentSrc, outgoing audio and stale responses.
- [x] Reuse that scope for per-Shot duration drafts; stop background data resetting
  an explicit supported duration. Keep preview distinct from selected-for-use Take.
- [x] Thread selected timing through packet/quote/request/attempt/usable media once;
  validate White Previs buffer and stale-quote handling in the same integration pass.

### 5-6. AI Direction And Final Prompt Preparation

- [x] Add language-aware advisory timing and visible performance checks to the
  existing AI Plan/direction review, including post-allocation review and bounded
  authorized repair. Manual Take changes do not invoke AI automatically.
- [ ] Build reference-aware compact execution sections in existing still/video
  composers. Resolve duplicate policies, distinguish initial versus later states,
  and retain exact dialogue, temporal action, Look mappings and reference numbering.
- [ ] Expose canonical dry-run results at after-plan/row-edit checkpoints; recompute
  only affected inputs. Recheck final assembled payload before quote/dispatch.
  Delivered: input-keyed final preview/quote and bounded provisional Project-version
  preflight. Incremental per-Shot early reuse remains open under 049.
- [ ] Validate invariant-preserving deterministic optimization first; bounded AI
  fallback requires existing authorized text budget. Unknown limits are not a
  fabricated hard-cap pass/fail; isolate genuine technical errors to that request.

### 7. Scoped UX And Handoff

- [x] Adjust the reference area without moving sibling tabs, results, media actions,
  facial controls, engine settings or sticky quote/Generate actions.
- [ ] Verify changed states in Simple/Advanced and EN/TH at 390, 820 and 1440px;
  include pending, failed, cutoff, stale responses, empty media and long labels.
- [x] Record each focused check, remaining provider-quality UAT and exact changed
  behavior. Aggregate regression is an explicit later action, never paid generation.

## Validation Boundaries

Use existing Generation/Job Center tests and Cinematic runners; add selectable
groups there only when missing. Planned groups: recovery, header-activity,
preview-selection, take-duration, dialogue-timing/direction, prompt-budget and
reference-layout. These names are a plan, not a claim that commands already exist.

Backend fixtures use fake adapters/clocks and isolated repositories. UI fixtures
use intercepted responses. Protect actor isolation, settled/refunded reservation
conflicts, old Take history, source fingerprints, exact prompt/quote parity,
reference on/off counts and Image/Comparison behavior. No automatic restart,
cleanup, API submission or paid UAT in these checks. Implementation validation
uses short explicit groups; no full repository or paid aggregate run was started.

## Deferred Separately

Seedance usage-based Credit activation remains under
[provider 005](../../020-generation-providers/video/005-seedance-25-usage-based-credit-activation.md)
and [plan 006](../../020-generation-providers/video/006-seedance-25-credit-implementation-plan.md).
Do not activate prices while repairing recovery or Take timing. No new Series/
Chapter, model qualification, exact-speech service or general UI redesign here.

## Implementation Evidence

| Workstream | Focused evidence / status |
| --- | --- |
| 1 Recovery | 35 isolated lifecycle checks; same-task deadlines/backoff/recheck and no duplicate settlement. Video application 28 passed. Job Center 005 owns details. |
| 2 Header | Activity 9 and UI 11 passed; EN/TH 390/820/1440 intercepted header states. Job Center 006 records screenshots and AppShell scope limits. |
| 3-4 Preview/timing | Produce 48 passed, take-duration runner 77 passed, shared engine/viewer/read-model 9; White Previs/bundle 9. Real browser currentSrc, outgoing pause and empty media passed. |
| 5 Director | 52 scoped timing/service/metadata/localization checks; current-version advisory opt-in, exact dialogue and legacy approval preserved. See 047/048. |
| 6 Prompt | 61 budget/keyframe/compiler/entry checks including primary-composition-versus-style invariant passed. Provisional actor/read-only failure isolation passed. General contradiction/authorized semantic fallback not complete. |
| 7 Reference UI | 24 component checks; EN/TH, three themes at 390/820/1440; named rows, preview containment, on/off count parity and sibling controls. See 046. |

Runners (existing dependencies required, no paid calls):

- node scripts/test-video-recovery.mjs recovery
- node scripts/test-video-recovery.mjs activity
- node scripts/test-video-recovery.mjs ui
- node scripts/test-video-recovery.mjs produce
- node scripts/test-cinematic-video.js take-duration
- node scripts/test-cinematic-video.js prompt-budget
- node scripts/test-cinematic-video.js preview-selection
- node scripts/test-cinematic-directed-openings.mjs (use its documented selectable groups)
- node scripts/verify-cinematic-pilot.mjs --media-only
- node scripts/verify-cinematic-pilot.mjs --recovery-only
- node scripts/verify-cinematic-pilot.mjs
- node scripts/verify-video-job-center.mjs

Browser requires existing local Vite (CINEMATIC_WEB_ORIGIN defaults to 6501).
Pilot fixtures intercept API traffic; Simple's unrelated Image engine is deliberately
unavailable in that fixture, not certified by the Produce screenshots. Layout 046
separately verifies the image/reference workspace. Full real AppShell plus accepted
live submission/provider rendering remains UAT, not implied by isolated success.

Primary compiler checks, browser media proof, TypeScript and scoped diff checks
are recorded alongside owner evidence. No application workers were restarted,
live Projects edited, media removed or Seedance pricing activated. Existing backend
processes must reload the new code before real user UAT; tests never restart them.
New static configs/helpers/UI owners are mapped in architecture 099. No moved files
or new runtime storage path. Recovery metadata and Take ranges are additive in
their existing task/Project records.
