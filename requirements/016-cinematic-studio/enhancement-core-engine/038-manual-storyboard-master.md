# Manual Storyboard And Complete Video Faces

Status: implemented and offline-validated, 2026-09-13. Live provider visual UAT pending.
Primary: Product Requirement Architect. Implementation lenses: Backend and UX;
Generative Cinematic Production for prompt authority; QA after integration.
Skills: review-product-ux, direct-generative-cinematic-production,
implement-generation-workflow and verify-release-regressions as their gates apply.

## Scope And Reconciliation

The approved Simple flow is Setup -> Cast -> Storyboard rows -> Finish/download.
One new row is one Scene containing one Shot and one selected output clip, with
independent Generate First Frame and Generate Video actions in the same row.
Multiple Takes remain available. Story Plan and a separate Produce step are not
required in Simple. Advanced remains unchanged and shares the same Project IDs,
Scene/Shot records, generation facade, media, quotes, actor and Credit ownership.

This supersedes 033's visible Simple Story Plan/approval step and 037's mandatory
faceless rendering for all new stills. It does not relax real reference authority,
provider capability, quote/submit parity, explicit media approval or financial
checks. Faceless is a still-generation choice, NOT the Seedance first_frame gate.
Actual first_frame stays disabled as configured; composition uses reference_image.

Requirements: [039](039-manual-storyboard-rows.md),
[040](040-optional-faceless-and-video-faces.md).
Ordered execution/evidence: [041](041-manual-storyboard-implementation-plan.md).
Do not backfill or delete old images/Takes. Existing multi-Shot Scenes are shown
as separate clip rows without splitting/rewriting the existing Scene hierarchy.
Series/Season/Chapter controls and existing Advanced editing remain available.

## Ownership

CinematicApplicationService owns row creation/save and still options through
versioned actor-scoped mutations. Focused normalization belongs in
server/domain/cinematic/CinematicManualStoryboard.js. Data remains in existing
cinematic Projects, adding Shot.manualStoryboard, manualStillAuthority, videoActionTimeline and
storyboardFaceless. Storyboard/Video compilers consume their respective inputs.
No new repository, persistent media copies, queue, polling owner or Credit service.

React's SimpleStoryboardWorkspace owns row editing/presentation. Reuse the
existing StoryboardShotDialog generation owner in an embedded presentation and
CinematicProduceRuntime in an embedded, explicitly scoped Shot presentation.
No feature-local provider calls. The two actions show their own real estimates,
pending/errors and results; neither action automatically invokes the other.

## Preservation Gates

- New Simple rows need only an image prompt to create a still and a nonempty
  manual action timeline to create video. Hidden film-school fields do not block.
- Missing selected Cast/Look authority and an unavailable/unapproved chosen image
  remain actionable blockers, not automatic reference removal.
- Save image/identity changes marks only dependent work stale, never deletes it.
  Video timing edits do not invalidate unchanged first-frame composition.
- Switching Simple/Advanced, Faceless or tabs never generates, approves or charges.
- New manual operations use optimistic versions and cannot rewrite another Scene.
- Model output quality is manual UAT; no promise that prompt wording guarantees faces.
