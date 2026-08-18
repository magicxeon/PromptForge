# 017 Unified Generation Job Center

## Status

MVP implementation complete; manual browser validation remains. This capability adds one actor-scoped read and
tracking boundary over existing Generation workflows. It does not replace the
Image Queue, Generation Groups, Comparisons, Video Provider Tasks, History, or
Credits.

## Problem

Long-running generation must continue when a user leaves its creation route.
When the user returns, the active work or completed output must remain visible.
Today Video persists its provider task ID, while Image routes keep active job,
group, and comparison IDs only in component state. There is also no bounded
actor-scoped view of all currently active media work.

## Capability Owner

- Domain owner: `server/domain/generation/GenerationJobCenterService.js`
- HTTP owner: `server/app/routes/generationJobCenterRoutes.js`
- Client query/tracker owner: `web/src/features/generation/job-center/`
- Existing workflow owners remain unchanged:
  - Image execution: `GenerationApplicationService` and `QueueManager`
  - Multi-output: `GenerationGroupRepository`
  - Video execution: `VideoGenerationApplicationService`
  - Results: `HistoryRepository`
  - Credits: Credit capability

## Invariants

1. Job Center is a projection and navigation capability, never a second Queue.
2. It must not reserve, capture, refund, dispatch, retry, or cancel work.
3. Every item is actor-scoped on the server; client filtering is not authority.
4. Normal payloads contain no raw prompt, Base64 data, provider secret, private
   reference payload, or internal provider response.
5. One app-shell query owns global polling. Feature routes may continue polling
   their selected job for detailed progress.
6. Polling is bounded and stops when no active item remains. Window focus and
   reconnect trigger a refresh.
7. Image route pointers are actor- and surface-scoped and contain IDs only.
8. Existing estimate/reserve/enqueue/settle/history behavior cannot change.
9. Backend restart must not automatically replay Image work until a durable,
   idempotent provider execution envelope is approved.

## Delivery Order

1. `001-unified-job-projection-and-api.md`
2. `002-route-resume-and-global-tracker.md`
3. `003-restart-recovery-and-reconciliation.md`
4. `004-regression-and-release-gate.md`

## Definition Of Done

- An actor can list their active and recent Image, group, and Video work through
  one API without seeing another actor's work.
- Leaving and returning to an Image creation route restores the current job,
  group, or comparison result surface.
- The app shell shows a compact active/completed status and links to the owning
  surface or result.
- Polling is bounded and actor switching clears the previous actor projection.
- Existing Image, comparison, multi-output, Video, History, and Credit tests
  remain green.

## Implementation Evidence (2026-08-18)

- Added the actor-scoped projection API and bounded app-shell polling owner.
- Added Image job/group/comparison route pointers without persisting prompts or
  reference payloads.
- Reused the existing durable Video task pointer and invalidation path.
- Added completion/failure notifications and compact global status navigation.
- Added stale Image-group reconciliation without automatic provider replay.
- Automated affected regression suites pass; see
  `004-regression-and-release-gate.md` for evidence and remaining manual checks.
