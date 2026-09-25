# 013 - Scene Environment And Shot First Frame

Date: 2026-09-22. Status: EF01-EF03 delivered; live UAT and EF04-EF05 remain open.
Owner: Cinematic. Primary: UX/UI Product Designer. Review lenses: Cinematic and
QA, applied sequentially by the implementation agent, not independent agents.
Parents: 006 assets, 007 Scene Overview, 008 Shot Writer, 009 Render integration.
References: ../004-production-assets-and-reference-planning.md and
../005-shot-production-and-final.md remain the asset/execution authorities.

## Requirements

- A Scene owns shared location, time, weather, lighting and Environment selection.
  Project Assets may reuse the location across Scenes. Each Shot owns its framing,
  cast placement, opening action and optional First Frame.
- Recommended order: Scene text -> Shot plan -> optional Scene Environment image
  -> Shot First Frame -> Video. Environment can be created earlier; no writing
  or Shot planning prerequisite requires a generated image.
- Start with one master Environment image. Additional action/reverse/detail views
  are explicit additions only when needed. New views derive from the selected
  master and require review; they are not guaranteed consistent 3D geometry.
- Shot references inherit the Scene image, with explicit replace/OFF planned in
  the asset packet. A camera change does not create a new Scene or new Environment.
- First Frame combines saved Shot opening intent, selected Scene view, visible
  Character Looks, optional Expression and relevant Props. Never render the
  closing action as the opening state. Existing prior-Take last-frame extraction
  remains an alternative, unavailable when no eligible prior video exists.
- First Frame is optional when the configured provider/mode supports references
  or direct video. A composition reference is not an exact first-frame guarantee.
  Do not add an approval requirement for direct video without a selected frame.
- Generation remains explicit and uses the existing estimate/submit/approval
  owners. Opening a tool does not generate media. Old images/Takes remain intact.

## UX/UI

### Scene Environment Modal Follow-Up (2026-09-25)

The modal is a three-stage workspace: (1) write/review/save Scene direction,
(2) choose image engine and explicitly generate, (3) inspect the latest render
and select a Project image. The current selected image belongs in stage 3, not
ahead of authoring. Desktop may show generation and review side by side; mobile
keeps the same reading/action order in one column. Keep estimate, Queue,
error/retry, manual gallery Refresh, pagination and explicit image selection.
Do not automatically approve a generated image or change Credit/provider rules.

After a completed Job, refresh the Project and gallery. If the completed image
is not yet listed, reconcile the gallery for that Job with a small bounded retry
window, stopped on match or dialog close. This covers preview indexing lag
without an unbounded Scene-specific poll. Reopening always fetches fresh images.

Tasks: (1) restructure only SceneEnvironmentControl and scoped CSS/i18n,
(2) add focused tests for stage order, retained actions, successful completion
and delayed gallery visibility, (3) inspect TH/EN at mobile/tablet/desktop and
record any unavailable visual check. No paid generation in automated checks.

Status: implemented. The dialog now places direction before Engine/Generate,
then latest result, selected image and Project gallery. Completed Job gallery
reconciliation is limited to the immediate refresh plus two 1.5-second checks
and stops on image match or dialog close. Manual Refresh and explicit selection
remain available. No new i18n keys, API or runtime storage were added.
`SceneEnvironmentControl.test.tsx` passed 11/11; web TypeScript passed. The
`scene-gallery` browser fixture passed EN/TH at 390/820/1440 with no dialog
overflow or Engine-model/review overlap. Screenshots were inspected. No paid
provider render or live Project mutation was performed; live image-index timing
remains a user UAT check. UX and QA roles were applied sequentially in one
agent session, without an independent reviewer process.

Scene Overview: a named Environment section between Scene prose and Shot rows,
with existing thumbnail, Generate/Choose tool and reference toggle. Scene prose
must be saved before Environment mutations; explain the pending save inline.

Scene Environment dialog: place a secondary `Generate scene description` action
in the `Location, set and lighting` heading. It reads the actor-owned Project,
Chapter, selected Scene, adjacent Scene and Shot context, then returns one bounded
environment-only image prompt. The proposal replaces only the local textarea
draft; it does not save, submit image generation, reserve Credits or change the
selected Environment. A failed proposal preserves the current text. While the
proposal is pending, show the shared ProcessingSpinner, disable competing prompt
actions and expose an accessible localized status. The user reviews/edits, saves,
then explicitly generates the image through the existing workflow.

Shot Writer: keep the single timeline document. Below its save footer place a
two-column visual section: inherited Scene Environment and Shot First Frame.
Show authenticated contain previews, empty states and optional/selected/review
status. Open existing image tools from First Frame and restore writer focus on
close. Never expose the legacy attribute editor as another editable authority.
At mobile width stack Environment then First Frame; controls wrap and remain
keyboard accessible. Use existing theme tokens and TH/EN translations.

## Ordered Work

| Task | Deliverable | Acceptance | Status |
|---|---|---|---|
| EF01 | Scene Environment entry using SceneEnvironmentControl; refreshed actor/project cache | Same selected Scene; persisted image and OFF; no dispatch on open | UI implemented; live generation/persistence UAT pending |
| EF01a | Context-aware Scene description proposal in the Environment dialog | Draft-only result; existing text survives errors; no image/Credit dispatch | Implemented and focused automated verification passed |
| EF02 | Shot visual section, inherited preview and existing First Frame workspace | Same Shot after close; stable preview; unsaved/offline states | Implemented; live generation UAT pending |
| EF03 | Saved shotDocument -> canonical still/video preparation | Opening state only; no competing legacy fields; versions/fingerprint/quote agree | Implemented and focused automated verification passed |
| EF04 | Environment pack views and per-Shot replace/OFF | Stable view/state IDs, inheritance, explicit image cost | Planned under packet 006 |
| EF05 | Writer -> Video Render -> writer | Direct video without frame gate; correct Shot/Take; preserve queues | Planned under packet 009 |

The saved document is the authority for new Shots. One pure Cinematic document
compiler projects its OPENING into the still contract and its timed PERFORMANCE
AND TIMELINE events into the video packet without persisting duplicate attribute
fields. Legacy Shots without a document retain the existing compiler path.

Reference authority for Cinematic Scene stills is ordered through Reference
Processing configuration: selected Scene Environment first, then each assigned
Character Look. Provider capacity remains enforced before Credit reservation or
Queue acceptance; a model that cannot retain all required references must fail.

## Focused Verification

- UI tests: SceneOverview, ShotWriter and StoryboardShotDialog only.
- TypeScript no-emit for changed props/contracts.
- Read-only Playwright Scene/Shot scripts at 390/820/1440 in TH/EN; inspect images.
- Test new document read-only display, disabled submission reason, inherited
  Environment and preserved saved text/navigation. Do not run paid generation.
- Existing Engine, Queue, estimate and Credit behavior are reused, not redesigned.

## Evidence

- `Generate scene description` is positioned beside the Environment direction
  heading and stacks above the textarea at narrow widths. It sends current
  Project/Chapter/Scene/adjacent-Scene/Shot context through the existing text
  provider, returns an environment-only English image prompt, and updates only
  the local draft. Save and image Generate remain separate explicit actions.
- Proposal errors retain the user's current draft. Project and Scene optimistic
  versions are checked before the AI request, and the read-only proposal does not
  mutate Project state, register a Generation Job or enter the Credit lifecycle.

- The canonical Shot document compiler maps `OPENING` to First Frame and the
  timed `PERFORMANCE AND TIMELINE` events to Video. New manual Shot templates
  include `OPENING`; older inline-heading documents remain readable through a
  compatibility parser and opening-state fallback.
- Cinematic Scene reference order is configuration-owned: Scene Environment
  first, followed by assigned Character Looks. Existing provider capacity and
  required-reference checks still gate submission before Credit reservation.
- Editing only the Shot title preserves an approved Storyboard source and Take.
  Changing Shot direction or duration invalidates the derived media authority,
  retains old evidence, and marks the old Take stale instead of deleting it.

- `node scripts/test-cinematic-video.js rewamp-visuals`: 102 backend tests and 33
  UI tests passed. Coverage includes the Scene description proposal/API and its
  success/error draft states, Shot-document parsing, opening/timeline
  separation, First Frame and Video compilation, title-only Take preservation,
  changed-authority invalidation, Scene reference order, recipe policy,
  SceneOverview, ShotWriter and StoryboardShotDialog. The explicit `rewamp-all`
  aggregate includes this group; it was not run for this focused delivery.
- Read-only compatibility inspection of `server/data/cinematic/projects.json`
  found two saved Shot documents; both parsed with timed events. Neither uses an
  explicit `OPENING`, so the compatibility fallback derives time zero from Scene
  context plus the first event. New templates and AI proposals require `OPENING`.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false -p web/tsconfig.app.json`:
  passed.
- `node scripts/verify-cinematic-authoring-visuals.mjs`: fixture-only Playwright,
  TH/EN at 390/820/1440. No horizontal overflow or browser exceptions; Shot keeps
  one textarea. Screenshots inspected for Scene/Shot readability and wrapping.
  Requires installed Playwright Chromium and Vite dependencies. Uses a temporary
  loopback Vite server, mocked API reads and temporary screenshot output; rejects
  API mutations, closes browser/server, never starts workers or paid generation.
- Live API at localhost:6500 was unavailable. No live Project data changed and
  no paid generation or asset approval was exercised. Authenticated media and
  selected-image states still need live UAT; fixture screenshots cover empty states.
- Review was sequential, not an independent UX/QA subagent review.

## Changed Ownership

- `CinematicSceneOverview.tsx`: Scene Environment section and selected Scene entry.
- `CinematicShotWriter.tsx`: Environment/First Frame previews and tool actions.
- `CinematicStudioRoute.tsx`: reuse existing tools, actor-scoped refresh and return.
- `CinematicShotDocumentCompiler.js`: one non-persistent projection from the
  writer document into still-opening and timed-video authority.
- `StoryboardKeyframeContractCompiler.js` and `CinematicVideoPacketCompiler.js`:
  consume that projection while preserving the legacy Shot path.
- Reference Processing policy/registry: configurable Cinematic Scene ordering
  with Environment before Character Looks; provider capacity remains canonical.
- `CinematicApplicationService.js`: media fingerprint invalidation after Shot
  document changes while retaining stale evidence and preserving title-only edits.
- `StoryboardShotDialog.tsx`: optional return-to-document integration; old callers
  keep their existing editor behavior.
- `web/src/styles/cinematic.css` and TH/EN cinematic catalogs: scoped layout/copy.
- Matching component tests and `scripts/test-cinematic-video.js`: focused group.
- `scripts/verify-cinematic-authoring-visuals.mjs`: isolated responsive verification.
- No persistence schema, runtime data path, provider dispatch or Credit change.

## Next Implementation

1. Run one user-approved live First Frame trial and inspect the actual provider
   image. Automated checks prove deterministic authority, not visual quality.
2. EF05: connect the same Shot to existing video generation, preserving optional
   First Frame/direct video capability, Take history, Engine and Queue.
3. EF04 follows as an incremental asset enhancement: multiple Environment views
   and explicit per-Shot view/OFF. No automatic extra billable view generation.

EF04-EF05 are not completed by showing their future entry points.
