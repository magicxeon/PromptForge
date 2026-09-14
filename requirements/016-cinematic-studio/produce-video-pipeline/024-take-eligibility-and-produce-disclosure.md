# 024 - Take Eligibility And Produce Disclosure

Status: follow-up implemented with focused checks (2026-09-13); live owner
approval remains pending. Owner: Cinematic Produce.
Extends 014 Take selection and 023 preview synchronization. Does not create a
new Generation, Credit, provider or storage workflow.

## Problem And Scope

Completed, captured Video tasks may retain `provider_queued` in old Project
attempt rows. Produce can consequently show an indefinite spinner or omit the
approval action. Exact video packet hashes also change after prompt-policy
updates, even where the approved source and authored Shot have not changed.
The user needs an honest status/reason for each Take and explicit selection of
historically compatible Takes. Preserve all media and the current approved Take.

Produce also needs compact Video references and role-limited raw compiled prompt.
The adjacent editable Shot context must remain visible to ordinary creators.

## Ordered Tasks

1. Read a bounded, actor-owned set of task statuses for the selected Shot from
   Generation's existing task repository. Merge canonical terminal status,
   billing and technical probe into the Take read model without polling each
   Take or mutating Project/Generation JSON. Missing tasks are unknown, not done.
2. Add one server-owned compatibility assessment shared by review and approval.
   Require the same Shot, approved Storyboard source, reference mode and ordered
   reference plan; a completed, settled, technically verified output. Exact
   packet match stays eligible. For policy-only hash drift, accept only a
   historical immutable receipt whose packet fingerprint equals the Take's
   submitted fingerprint and whose authored fields match the current compiled
   packet. Normalize only known compiler/prompt-policy metadata; never ignore
   timing, identity, blocking, motion, performance, audio or source changes.
   For future Takes retain a compact authored-authority fingerprint at submit.
   Legacy Takes without trustworthy evidence remain preview-only. No automatic
   approval, bulk migration, Credit operation or provider request.
   Reconstruct an already-generated Take's ordered references in review mode:
   current model launch/capability flags govern new generation, not approval of
   an existing captured clip. Review mode still resolves owner-owned assets,
   Cast/Look bindings, count bound and exact historical reference fingerprint.
3. Show each Take's actual processing/completed/failed status and a localized
   approval reason (ready, source changed, direction changed, unverified legacy,
   media/settlement pending, or verification failed). Selected-for-use remains
   distinct from previewed. The button may appear only for a Take whose server
   assessment is ready; approval rechecks all gates under actor/version control.
4. Collapse Video references with a short source/count summary; opening it
   retains the existing toggle, source mode, images and loading feedback.
   Relabel the editable context accurately. Show the raw read-only Compiled
   technical prompt only to admin/support; hide it from other roles without
   removing creator Shot controls or altering the provider prompt sent on submit.
5. Run short focused server, React/i18n and responsive checks. No live jobs,
   paid generation, destructive data changes or worker restart in automated QA.

## Acceptance And Protection

- For the reported Project, Shot 1's receipt-backed older Take can become
  selectable if all source, Cast, Shot and task gates pass; the latest Shot 1
  Take without matching keyframe evidence stays preview-only. Shot 2 remains
  preview-only if its authored duration differs from the submitted packet.
- An old completed task displays Completed even when its Project row says
  `provider_queued`. Failed, missing, unpaid and failed-probe tasks cannot be
  approved. A source or authored Shot edit immediately invalidates eligibility.
- Previewing/expanding a Take never approves it. Concurrent version conflicts,
  actor isolation and server-side source/reference checks remain authoritative.
- EN/TH and ~390/820/1440px layouts remain operable. The reference panel works
  by keyboard. Creator cannot see raw prompt, but can still edit motion direction;
  admin/support can inspect raw prompt. No sibling controls disappear.

Owning code: CinematicApplicationService, CinematicVideoPacketCompiler,
CinematicStageContent, ProduceVideoReferences, VideoTakeList and their existing
contracts/tests. See 099 master for canonical locations. Requirement/UX/QA roles
apply sequentially; independent reviewer execution is not assumed.

## Evidence And Live Boundary

- `node scripts/test-cinematic-video.js take-eligibility`: focused backend,
  reference reconstruction and adjacent approval tests. `node scripts/test-
  cinematic-video.js full` is the explicit later aggregate; no provider call.
- `vitest run --configLoader runner` on CinematicProduceRuntime and VideoTakeList:
  status/reason, recovered button, role gating, reference collapse and old flows.
- `node scripts/validate-i18n-catalogs.js`; TypeScript no-emit app check;
  `node scripts/verify-cinematic-pilot.mjs` fixture browser EN/TH at 390/820/1440.
  The fixture neither approves a live Take nor calls a paid provider.
- Read-only inspection of the reported Project: older Shot 1 Take
  `cineattempt_f7e387de4db52ec140fc` is `ready`; latest Shot 1 Take reports
  `keyframe_changed`; Shot 2 Take reports `shot_changed` (8s submitted versus
  4s authored now). Canonical task rows report completed/captured/passed.
- A cloned, in-memory Project/Task call to the existing approveVideoAttempt
  command selected the receipt-backed Shot 1 Take. No live Project file changed.
- Current Seedance catalog may disable Look references for new jobs. Historical
  review reconstructs and compares the same ordered owner-owned references
  without reapplying that new-job switch. It does not unlock generation.

No project JSON migration, automatic Take selection, provider submission or
Credit transition. On a live system the user still explicitly selects a ready
Take; a concurrent Project edit or missing reference remains a server rejection.

## Follow-Up: Reachable Approval And Manual Duration Override

The live owner-scoped Produce context for Project
`cineproj_1789050713436_vfjpcrx6` reports Shot 1's older Take
`cineattempt_f7e387de4db52ec140fc` as `ready`, but the UI previews its newer,
blocked Take by default and also waits for a second task read before showing the
approval button. Shot 2's `cineattempt_39a211800f5bfb6ddce1` differs from the
current Shot only in planned duration (submitted 8000 ms, authored 4000 ms).
Both tasks are completed/captured/probe-passed. Neither Take is to be selected
or approved automatically.

Ordered follow-up tasks:

1. Let the owner preview the newest `ready` historical Take by default when
   the latest Take is blocked, without changing `approvedVideoAttemptId`.
   Render the normal Use Take action from the server's `ready` assessment,
   including its task/media checks; a second task fetch must not hide it.
   An explicit user preview always wins over this initial default.
2. Add a narrowly typed `planned_duration` manual override to the existing
   owner-scoped approval command. Offer it only when an immutable submitted
   packet/receipt and the current packet differ **only** in
   `timing.plannedDurationMs`. Require an explicit confirmation carrying both
   duration values and current Project version. Revalidate task completion,
   settlement, probe, approved Storyboard source, keyframe, Cast/Look reference
   plan and all other authored packet fields server-side. No override for a
   missing receipt, changed identity/reference/source, failed task or arbitrary
   direction/audio change. Reject stale confirmations.
3. Audit the explicit exception on the approved Attempt with actor, timestamp,
   previous/current duration and receipt/packet fingerprints. Clear only the
   selected Attempt's old `packet_changed` projection after successful approval;
   existing timeline dependencies become stale and require reassembly. The
   selected video retains its original duration; Finish may trim it later.
4. Provide the owner-facing manual path: select Shot 2's Take, read the 8s/4s
   difference, confirm Use Take with duration override. Document the equivalent
   approved API request for support diagnostics. Never recommend hand-editing
   Project JSON or bypassing Generation/Credit checks.
5. Check Shot 1 normal approval, Shot 2 explicit override, rejection matrix,
   selected/preview distinction, EN/TH and mobile/desktop with focused tests.
   Automated checks use cloned data only; live approval remains the user's action.

Acceptance: Shot 1 exposes a normal Use Take action on arrival. Shot 2 exposes
only a confirmed duration-only override. Both actions survive refresh after
approval, while source/keyframe/reference/settlement/probe violations remain
blocked and no provider or Credit operation runs.

### Manual Override Procedure

1. Open Produce, Scene 1 / Shot 2. Select Take
   `cineattempt_39a211800f5bfb6ddce1`. The review must say duration-only
   override available: submitted 8s, current Shot 4s. Inspect the clip.
2. Click **Use Take with duration override**, read the confirmation, then
   confirm. This is an editorial choice; the 8s video is not shortened. Trim
   it later in Finish if the Shot should play for 4s. Shot 1 instead uses the
   normal **Use this Take** on `cineattempt_f7e387de4db52ec140fc`.
3. Refresh and check `approvedVideoAttemptId`, selected Take and Timeline.
   Reassemble a stale Timeline before export. If the button is absent, inspect
   the Take reason; do not hand-edit `projects.json`.

Support can perform the **same** owner-scoped command via the existing route
after a read-only `produce-context` GET confirms `duration_override_available`
and supplies the current `projectVersion` and `durationOverride` values. In the
local mock-actor environment only, the request shape is:

```http
POST /api/cinematic/projects/{projectId}/scenes/{sceneId}/shots/{shotId}/video-attempts/{attemptId}/approve
x-mpf-user-id: {ownerUserId}
Content-Type: application/json

{"expectedVersion":338,"manualOverride":{"kind":"planned_duration","submittedDurationMs":8000,"currentDurationMs":4000}}
```

`338` is an example snapshot version, not a constant: read it again immediately
before POST. A 409 means the evidence/version changed; recheck the context, do
not replay blindly. The server records `approvalOverride` on the selected
Attempt with actor, timestamp, both durations and receipt fingerprint. The
command never generates media or mutates Credits.

Focused evidence: backend take-eligibility runner 54/54; Produce runtime UI
55/55; TypeScript no-emit, i18n parity and the EN/TH Cinematic pilot browser
checks passed. Read-only local Project inspection found Shot 1 `ready` and Shot 2
`duration_override_available`. Both approval commands also succeeded against
separate in-memory clones of that Project and its completed task records; no
live Project, task or Credit record was changed. The API listener
on port 6500 was unavailable at final verification, so live browser approval
is still an explicit UAT step after normal server startup.
