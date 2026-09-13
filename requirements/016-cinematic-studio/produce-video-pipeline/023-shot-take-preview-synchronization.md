# 023 - Shot And Take Preview Synchronization

Status: Implemented (2026-09-13); focused component and browser checks passed.

## Outcome And Scope

Selecting a Shot must switch the center media review to that Shot. Selecting
another video Take within a Shot must switch to that exact Take. Selection,
highlight, title, poster, video and media actions must never disagree.

Reported symptoms: clicking a different Shot leaves the center video unchanged;
clicking Takes in a Shot with multiple generated videos also fails to switch the
displayed video. Treat these as two regression cases in the existing workflow,
not a request to add a second player or generation flow.

Scope: Cinematic Produce queue, Take list and center preview, including shared
embedded Simple consumers where applicable. This extends
[014](014-shot-video-take-selection.md), preserving temporary preview versus
explicit selected-for-use Take semantics.

## Ownership And Inspection Targets

- Document primary: Product And Requirement Architect. Implementation owner:
  existing Cinematic Produce frontend, with UX and QA review.
- CinematicProduceRuntime in CinematicStageContent.tsx currently owns Shot,
  preview selection, active-task monitoring and historical-task queries.
- Inspect its previewAttempt, awaitingProjectRefresh, previewTaskId, viewedTask
  and activeAsset derivation together. Do not assume changing the selected label
  proves that the underlying media source changed.
- Reuse ProduceShotQueue, VideoTakeList, ProduceMediaReview, VideoMediaPlayer and
  GenerationVideoViewer. Investigate player source updates and async selection
  races before choosing a fix; current root cause is not yet confirmed.
- Keep API calls and actor-scoped TanStack Query ownership unchanged. No new
  polling loop, provider call, Credit path or runtime storage file.

## Selection Contract

1. Use coherent actor/Project/Scene/Shot/attempt identity for media selection.
   On Shot change, reset or restore only a valid selection belonging to that Shot
   according to the existing default-preview policy. Never carry another Shot's
   task, poster or output as a fallback under the new Shot title.
2. Clicking a Take selects that exact attempt. The active preview indicator and
   actual video source must change together, independently of the latest generated
   task and the approvedVideoAttemptId used for final assembly.
3. Rapid A -> B -> C selection must leave C visible even if A/B fetches complete
   later. Ignore obsolete results and player events for current selection; a
   background task update or project refresh must not replace an explicit preview.
4. Pause the outgoing video/audio when switching media. Correctly replace the
   player source and reset playback position for a new Take; no audio from the
   previously selected Shot and no forced autoplay merely from selection.
5. Center video, keyframe/compare views, fullscreen viewer, poster, title, Take
   metadata and preview-related download actions must resolve from the same
   selection. Keep the Shot's source image associated with the selected Shot.
6. A Shot without a playable video shows its own keyframe or existing empty state.
   A selected pending/failed/missing Take shows that Take's state and available
   recovery, never another Take's video disguised as the selected result.
7. Loading a newly selected source may use the shared processing indicator.
   Background refetch for an already playable selection must not repeatedly
   blank the player, reset playback or make the whole page flicker.
8. Monitoring an active generation remains independent of previewing historical
   Takes. Preserve duplicate-submit safeguards and terminal task handling, but
   never route the monitored task's media into the viewer unless it is selected.
9. Keep authorized previous-plan Take previews reachable and correctly labeled
   through their existing history entry. Do not pretend a historical Take belongs
   to a current Shot or switch current Shot authoring state to a deleted Shot.
10. Switching actor/Project clears incompatible transient selection and cached
    media bindings. No cross-actor media or stale media-control URLs may leak.

## Preservation

- Preview clicks do not Generate, approve a Take, select it for final assembly,
  reserve Credits, change duration, rewrite Story Plan or invalidate Storyboard.
- Preserve all old videos/images, pagination and history, approved source, selected
  final Take and existing authorization checks. No deletion or data migration.
- Preserve reference controls, duration drafts, quote/Generate controls, source
  modes and existing navigation. Do not redesign sibling sections to fix selection.
- If the shared player needs a change, scope it to correct source identity and
  verify other consumers; do not create a feature-specific player fork.

## Ordered Tasks And Acceptance

Tasks authorized and implemented under enhancement-core-engine/050.

1. Reproduce with two Scenes, multiple Shots and at least three distinct Takes
   in one Shot. Trace selected identity through query data and actual player src;
   test both cached and delayed responses before editing.
2. Correct owning selection/async derivation and player source lifecycle as needed.
   Preserve active-task monitoring and existing default-preview behavior.
3. Verify center/compare/fullscreen/actions stay synchronized, pending/error/empty
   states are honest, and previous-plan history remains accessible.
4. Run small focused component regressions, then scoped browser checks. Record
   evidence rather than claiming that labels alone prove playback changed.

Acceptance checks:
- Select Shot A then B: highlight/title/poster/video src all identify B; A audio stops.
- Within B select Take 1/2/3: each distinct media source is inspectable and preview
  changes do not alter the selected-for-use Take or latest-task monitoring.
- Simulate rapid selection and late fetch/player callbacks; last user selection wins.
- Switch to no-video, pending, failed and missing-media cases; no stale video leak.
- Refresh task/project data while playing an older Take; selection and playback
  remain stable when its actual source has not changed.
- Verify actor/Project isolation, authorized previous-plan previews, >8 Takes and
  unchanged media approval/download behavior.
- Check EN/TH and affected controls at roughly 390, 820 and 1440px, including
  keyboard selection and fullscreen/compare mode. No layout regression.

Extend existing CinematicProduceRuntime.test.tsx, VideoTakeList.test.tsx and
owning media-player tests as needed. Add a selectable preview-selection group
to scripts/test-cinematic-video.js, preserving its explicit aggregate entry.
Record exact commands/prerequisites during implementation. Use fixture/intercepted
responses, not paid jobs or live Project writes. Browser verification must inspect
video currentSrc/source identity and playback, not just screenshots.

## Current Delivery

The shared VideoMediaPlayer remounts only when the actual URL changes and pauses
the outgoing element. Unchanged sources retain playback. Produce derives active
task scope directly from the selected Shot, keeps explicit historical preview
separate, and captures submission actor/Project/Scene/Shot before dispatch.
Late acceptance cannot rebind a task to another Shot or actor. Historical query
refresh no longer blanks existing media. Preview never approves or selects a Take
for assembly. All existing source, download and approval actions remain.

Evidence: Produce 48/48 passed, including distinct media elements/URLs, empty Shot,
delayed submit, actor/Project/unmount, retained older Take and draft, and recovery.
Shared viewer/engine/read-model nine passed. node scripts/verify-cinematic-pilot.mjs
passed EN/TH at 390/820/1440 (navigation, >8 Takes, adjacent controls, ZIP consent).
Its --media-only group creates disposable canvas-recorded fixture media and checks
actual currentSrc, old element pause, empty selection and viewport bounds. It does
not depend on title changes as proof. Screenshots: temporary mpf-cinematic-pilot-
k9ugRM (media) and mpf-cinematic-pilot-pLZl4e (Produce) directories.
Runner: node scripts/test-cinematic-video.js preview-selection. No live mutation,
paid generation, server restart or alternate player/polling workflow.
