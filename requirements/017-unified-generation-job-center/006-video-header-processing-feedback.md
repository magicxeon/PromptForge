# 006 - Video Header Processing Feedback

Status: Backend/header implemented and focused checks passed (2026-09-13).
Full cross-surface closure awaits parent integration/UAT.

## Authorized Implementation Plan And Trace

Workstream 2 of Cinematic 050 is authorized now; roles/skills and safety boundaries
follow 005. Preserve header siblings, navigation, media and drafts at all widths.
Implement after the shared recovery projection, then verify service/schema/hook/
indicator fixtures with node scripts/test-video-recovery.mjs activity|ui|all.
Browser checks use intercepted data only at 390/820/1440 in EN/TH where available.

Confirmed code causes: CinematicStageContent's accepted Video mutation sets the
task cache and selection but omits actor Job Center invalidation; embedded Simple
uses this same runtime. PlaygroundVideoWorkspace already invalidates it.
useGenerationJobCenter stops intervals when cached activeCount is zero.
GenerationJobCenterService counts after source and visible truncation; an older
Video can disappear behind 24 recent tasks. The indicator maps reconciliation to
failed and hides cached items on fetch error. These are code/fixture findings,
not verified causes of every reported live flicker.

Parent integration (excluded CinematicStageContent.tsx): on accepted response,
invalidate queryKeys.generationJobCenter(actorId). Recheck UI must invoke the
same task's explicit recovery contract, update ['video-task', actorId, taskId],
invalidate Job Center and refresh Project without changing selected Take/drafts.
Backend/header work does not edit the excluded Cinematic files or prompt normalizer.

## Scope And Owners

Extend 002's global tracker, not a Cinematic-only header or polling loop.
GenerationJobCenterService remains the actor-scoped projection; AppShell mounts
GenerationJobCenterIndicator using useGenerationJobCenter. ProcessingSpinner is
already used here and remains the only processing icon.

The current global query stops interval polling when its cached activeCount is
zero. Accepted submissions must invalidate that shared actor query to discover
new work. Playground already does this; audit Cinematic Produce and embedded
Simple acceptance paths before claiming the exact regression cause. Also inspect
status projection and bounded-list counting. A component icon change alone is
not an adequate fix for an undiscovered task.

## Acceptance

1. After accepted Video submission from Cinematic or Playground, invalidate the
   existing actor Job Center query through the canonical acceptance integration.
   Show actual queued/processing/copying work without requiring focus/reload or
   staying on the creation page. Do not count quote preparation as accepted work.
2. Use 005's shared lifecycle to count active work consistently. Recent-item display
   limits must not falsely report idle while an older active task exists. Keep
   server reads bounded; extend existing list/count contracts if necessary, not
   unbounded browser fetching or another cache.
3. Keep the yellow shared processing indicator stable while tasks remain active.
   Completion, failure, cancellation and review-required cutoff stop spinning.
   A fetch failure is not proof of idle or failed generation: preserve known data
   and expose connection uncertainty without a full-page loading cycle.
4. Keep generation status distinct from background isFetching. Preserve existing
   previews, navigation, controls and drafts during refetch. Never invent percentage
   progress. Review-required must not be presented as confirmed provider failure.
5. Actor switching clears old activity and notification state. Resume/view uses the
   owning context when available; preserve Playground and existing Image/group/
   Comparison behavior. No extra polling interval or financial mutations here.
6. Verify active Video from every accepted-submit surface, idle-to-active discovery,
   more recent items than the visible limit, mixed Image/Video, route changes,
   network failure/reconnect, cutoff/late recovery and no duplicate terminal toast.
   Use intercepted data for EN/TH at 390, 820 and 1440px; preserve header siblings.

## Ordered Tasks

Backend/header tasks verified after 005's lifecycle contract stabilized:

1. Reproduce the missed activity with isolated acceptance/projection fixtures.
2. Connect existing invalidation and fix projection/count semantics if confirmed.
3. Adjust localized status presentation only where needed; shared icon is reused.
4. Run focused Job Center service/hook/indicator checks plus scoped browser checks.

Primary implementation: Backend for acceptance/projection, then scoped UX review
and QA. This does not authorize provider submission, worker restarts or new
polling infrastructure. Coordinating schedule: Cinematic enhancement-core-engine/050.

## Scoped Evidence And Parent Handoff

Activity projection now prioritizes active/review records and counts Video before
the 24-row source limit and final visible pagination. Queue counts distinct active
Jobs/Groups beyond its 50-row snapshot page. Cinematic tasks resume their existing
/create/cinematic/:projectId/produce owner route; Playground routing is preserved.
Review-required stops the spinner but remains discoverable with a warning, never
a confirmed-failure label. Cached rows remain on connectivity failure; background
isFetching is not a second generation spinner. Hook interval pauses during an
in-flight fetch/retry. Actor notification memory resets and is capped at 128 rows;
Query GC is five minutes, existing actor key and active-only 3s interval retained.
Reduced motion now also disables the header's pre-existing CSS animation override.

Focused validation: activity nine passed; UI eleven passed, including canonical
idle-to-active invalidation, actor switch, bounded network retries, cached error,
review cutoff, warning notification deduplication and off-page review count.
Parent confirmed Cinematic accepted-submit invalidation is now added to its
excluded component; this owner did not edit it. Embedded Simple uses that runtime.

Browser: node scripts/verify-video-job-center.mjs passed EN/TH at 390, 820 and
1440 using a temporary local-only Vite preview, intercepted actor/Job Center API
and denied external/backend traffic. Twelve active/review screenshots under
C:/Users/punya/AppData/Local/Temp/mpf-video-job-center-y0kePe. Mobile Thai review
and desktop English active screenshots visually inspected; all six layouts
assert no horizontal overflow, panel bounds, preserved error rows and reduced
motion. This is isolated indicator/header placement, not complete AppShell or
accepted Cinematic/Playground submission UAT. Preview was shut down afterward.
The initial Thai fixture failure was missing UTF-8 charset, corrected in the
fixture; it was not an application locale defect.

App/config TypeScript passed using node node_modules/typescript/bin/tsc -p
web/tsconfig.app.json --noEmit --incremental false --pretty false, and equivalent
tsconfig.node.json. npm.cmd run typecheck:web could not write pre-existing
node_modules/.tmp build info (EPERM). Scoped git diff --check passed. No paid
calls, live mutations or worker restarts. UI source additions use shell EN/TH
catalogs; no new namespace, media owner or polling service.

Scoped ESLint passed for generation/job-center, videoGenerationApi.ts and
videoGenerationSchemas.ts. Remaining scope gaps are full AppShell sibling layout,
actual accepted-submit UI integration and explicit recheck button UAT, not the
isolated header projection/processing states verified here.
