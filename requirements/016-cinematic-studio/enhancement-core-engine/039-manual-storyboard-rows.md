# Simple Manual Storyboard Rows

Owner: Cinematic, parent 038. Status: implemented; focused API/UI checks passed.

## Interaction Contract

1. After Cast, Simple opens Storyboard directly. Its rail omits Story Plan and
   Produce. Advanced keeps all six stages. Legacy links to Simple Plan/Produce
   resolve to its Storyboard workspace; no hidden approval loop.
2. Add Scene explicitly creates one blank editable Scene/Shot through the
   existing facade. No AI call, approval or media generation. Bound project row
   creation to 24 Scenes and preserve all existing IDs and Take history.
3. Each row has two clearly separated, unframed sections: first-frame image and
   video. Desktop uses two columns; tablet/mobile stacks image before video.
   Provide a scene title, large image prompt, visible Cast/Look selection and
   Faceless toggle. Image and video results stay next to their owning action.
4. Manual video events have start/end time and description. Clock starts at 0:00
   independently in each clip. Add/remove events, max 12; preserve authored order,
   with nonnegative start, end > start, no overlap, and end <= selected Shot length.
   Preserve the full submitted text, never silently shorten it. Provider duration
   and prompt budgets still apply and remain visible before paid dispatch.
5. Image prompt controls the opening instant, not the end of video action.
   Manual event text is only a VIDEO instruction. Do not inject future states
   from Scene descriptions or later rows into the first frame.
6. Save is explicit and preserves a dirty draft on failure/version conflict.
   Generation requires saved applicable inputs. No invisible auto-enhancement.
   Keep dirty drafts when changing rows; require saving before mode/stage/Chapter
   switches and warn before browser unload. Never silently truncate the manual
   image prompt: preserve it or reject an over-budget composition before dispatch.
7. Reuse current model/output controls, real estimates, yellow ProcessingSpinner,
   source approval, video reference controls, Take preview/selection and download.
   A manual clip is not automatically approved as a selected Take after rendering.
8. Existing Advanced multi-Shot Scenes appear as clip rows with existing hierarchy
   labels. Saving one row must not flatten the Scene or replace sibling Shots.
   Switching modes never clears fields. Existing Dialogue & Sound data is retained.

## Canonical API And State

- POST /api/cinematic/projects/:projectId/simple-scenes:
  expectedVersion plus idempotencyKey; returns CinematicProject with one new row.
- PATCH /api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/manual-storyboard:
  expectedVersion, expectedShotVersion, title, imagePrompt, durationMs,
  castAssignmentIds, wardrobeLookIds and videoActionTimeline.
- PATCH same Shot /storyboard-settings: expectedVersion, expectedShotVersion,
  storyboardFaceless boolean. Future generation settings only, no source relabel.
- Shot additions: manualStoryboard boolean, manualStillAuthority boolean, storyboardFaceless boolean,
  videoActionTimeline [{startMs,endMs,description}]. Unknown/malformed intervals
  fail with a stable error. No text interpretation service or separate billing.
- manualStillAuthority is true for newly created manual rows. On existing Advanced
  Shots, editing only the video timeline preserves the existing still compiler
  authority until the image prompt or Cast/Looks changes. No destructive migration.
- cinematicManualStoryboard accompanies the authoritative generation context,
  estimate and request so the canonical prompt composer preserves manual still
  text instead of applying the Advanced generated-prose section truncation.
- Existing APIs remain the only image batch, video context/quote/submit/approval,
  clip bundle and Finish entry points. Defaults and wording live under existing
  server/config/cinematic ownership. Do not fabricate a Story Plan approval.

## Verification

Focused groups: manual normalization/version/source preservation; still toggle
and metadata; video packet temporal/face authority; real client schema response
parity; Simple navigation and inline actions; desktop/tablet/mobile screenshots.
No paid generation or live Project mutation in automated checks. Full aggregate
is explicit and separate from user-controlled video visual UAT.
