# Shot Video Take Selection

Status: implemented; isolated approval/preview regression checks passed 2026-09-12.
Final evidence and live-UAT boundary: implementation plan 009 and requirement 020.
Owner: Cinematic Produce. Extends 005 review/approval, not a new Generation flow.
Plan: implementation-plan/009-take-review-and-shot-navigation.md.

## Before Implementation

CinematicStageContent initializes the observed task/attempt from the latest video.
AttemptHistory is non-interactive, takes the last eight Shot attempts and does not
filter exclusively to video. Approval already pins approvedVideoAttemptId through
CinematicApplicationService.approveVideoAttempt; prior approved attempts become
superseded. Timeline and ProduceRoughSequence consume the approved source.

## Requirements

1. A Shot exposes its video Takes with stable identity/order, poster, model,
   duration, status and explicit selected-for-use indicator. Filter out still
   generation attempts. Older Takes must remain reachable via a bounded history
   view; do not silently hide everything before the last eight entries.
2. Separate previewedAttemptId (temporary UI selection) from the server-owned
   approvedVideoAttemptId. Clicking Play/Preview changes only the viewer. No
   approval, quote, provider request or Credit mutation follows a preview.
3. Use this Take explicitly approves one eligible completed Take via the existing
   actor/version-checked command. The action applies to the viewed Take, not the
   latest task. Inspect whether superseded Takes are currently eligible for
   reselection; extend the existing command if necessary without bypassing checks.
4. Completed/settled, valid Asset/probe, current packet and reference authority
   remain approval conditions. A historical stale Take may be viewed/downloaded
   if authorized, but cannot silently replace the current approved source.
5. Generating another Take, completing a task, changing preview, navigating or
   refreshing never changes the chosen Take automatically. Retain other Takes.
   On replacement, dependent timeline/master evidence becomes stale through the
   existing dependency contract; do not regenerate or erase historical exports.
6. Latest active task monitoring and duplicate-submit prevention remain independent
   of which historical Take is viewed. Do not create one polling loop per card.
   Project/Shot/actor switching resets transient selection without data leakage.
7. Reuse VideoMediaPlayer/GenerationVideoViewer and shared processing feedback.
   No autoplay on list render. Failed/missing/stale media have clear recovery
   states. Preview and selected-for-use indicators must be visibly distinct.

## Acceptance

Three Takes: preview A/B/C independently, choose B, generate D, retain B as the
timeline source; refresh retains B. Switch to A explicitly and preserve all files.
Verify selecting old eligible Takes, stale/failed/pending/missing cases, >8
entries, project version conflicts, cross-actor denial and no billable operations
from preview/selection. Monitor D while viewing A. Verify selected source agrees
across queue, rough sequence, timeline and any later clip bundle.

No destructive migration, new runtime path, pricing change or automatic approval.
