# Momelo Cinematic Studio - Story Plan Implementation Requirement

> Status: Checkpoints A and B implemented; Checkpoint C remains production-gated
>
> Scope: `Cinematic Studio > 3 Story Plan`
>
> Design input: `_temp/video-media-reconciliation/003-layout-cinematicstudio-story-plan-design-input.md`
>
> Capability owner: Cinematic

> Manual authoring and legacy recovery extension:
> `004-story-plan-manual-authoring-and-legacy-recovery.md`

## 1. Outcome

Replace the Story Plan presentation prototype with a project-backed planning
workspace. A user must be able to review and edit a structured Beat, Scene, and
Shot-skeleton plan, request AI proposals, compare before applying, save drafts,
approve a stable Story Plan Version, and continue to Storyboard only when the
plan is valid.

Story Plan uses the accepted Story Source, Setup intent, stable Role Slots,
active Cast Assignments, and bound Character Looks. It must not reconstruct
these authorities from display labels.

## 2. Preservation contract

Implementation changes only the Story Plan stage and the minimum shared
contracts required by it. Preserve unchanged:

- global sidebar and its persisted state;
- Cinematic workspace header, Stage navigation, Control level, Project Cost,
  and shared `AppFooter`;
- Setup and Cast layouts, fields, autosave, validation, and navigation;
- Character/Profile and Character Look ownership;
- Storyboard, Produce, and Finish behavior except for consuming the approved
  Project-backed Story Plan already owned by Cinematic;
- actor isolation, optimistic Project versioning, and current theme behavior.

Regression tests must assert preserved sibling behavior. A Story Plan redesign
does not authorize moving or deleting unrelated working UI.

## 3. Current behavior to retire

- fixed five-Beat translated fixtures;
- a Scene Director dialog not bound to a selected Scene;
- fixture field values and disabled Save;
- one-click starter plan marked approved immediately;
- hard-coded `5 Credits` presentation;
- plan/Scene AI buttons without a real use case;
- approval without readiness validation.

Compatibility fixtures may remain only in tests that intentionally render
without a Project. Customer Project routes must use persisted Project data.

## 4. Story Plan input contract

The application service supplies one authorized planning context containing:

- Project ID/version, title, format, platform, aspect ratio, target duration,
  genre, audience feeling, pacing, ending intent, and Control level;
- active Story Source Version ID and accepted Story Brief/Creative Direction;
- stable Story Role Slots;
- active Cast Assignment IDs, pinned Character/Profile versions, dossiers,
  identity readiness, rights status, and Look bindings;
- current Story Plan Version, Scenes, Shots, warnings, and stale state;
- explicit narrative constraints extracted from source and direction.

The client never calls an AI provider, Credit repository, Character repository,
or Look repository directly.

New Story Plan writes identify `contractVersion: story-plan-v2`. Legacy writes
without this marker remain readable during migration, receive a compatibility
Beat when absent, and are not a precedent for bypassing v2 approval validation.

## 5. Story structure

### 5.1 Plan

Store objective, logline, emotional arc, Beats, warnings, source/provenance,
approval state, Story Source Version, estimated duration, and estimated Shot
count in each immutable Story Plan Version.

### 5.2 Beat

Each Beat contains stable ID, order, type, title, dramatic purpose, story
change, Cast Assignment IDs, emotional start/end, target duration, linked Scene
IDs, warnings, and status. Beat count is story-dependent and is not fixed to
five.

### 5.3 Scene

Core Scene Director fields:

- title and linked Beat;
- purpose and story change;
- location and time;
- Cast Assignments and Character Looks;
- key action/blocking summary;
- emotional start and end;
- duration, estimated Shot count, and transition intent.

Optional/Advanced fields:

- visual mood/lighting;
- performance, dialogue, and audio intent;
- important props and practical movement constraints;
- transition in/out and continuity entry/exit;
- broad camera language and negative constraints.

Detailed lens, framing, camera angle, and movement remain Shot/Storyboard-owned.
Story Plan may provide seeds but does not require every technical Shot field.

### 5.4 Shot skeleton

Every Scene contains at least one ordered Shot skeleton with stable ID, title,
purpose/action, duration, Cast/Look IDs, prompt seed, and optional environment,
framing, camera, blocking, performance, lighting, audio, and continuity seeds.

## 6. User flow

1. Open Story Plan and inspect source/Cast readiness.
2. If no plan exists, choose `Create manually` or `Generate Story Plan`.
3. AI generation returns a proposal and never replaces current content.
4. Compare current and proposed values; Apply or Discard explicitly.
5. Select a Beat to inspect linked Scenes.
6. Open one Scene Director to edit Core fields and optional Advanced fields.
7. Generate Scene Direction only for the selected Scene; review before Apply.
8. Save a Draft without approving it.
9. Resolve validation blockers and review warnings.
10. Approve an immutable Story Plan Version.
11. Continue to Storyboard with stable Scene/Shot/Cast/Look IDs.

Manual edit, reorder, save, compare, split/merge, and approval are free.

## 7. AI proposal contract

Use global versioned Prompt Recipes:

- `cinematic-story-plan-generate`;
- `cinematic-scene-direction-generate`.

The recipe definitions belong under `server/config/prompt-recipes/cinematic/`.
Projects store only recipe and provider provenance, not reusable system prompt
definitions.

AI results are strict structured proposals. Provider errors retain current
draft content. Apply performs a normal optimistic Project write and may fail
with a version conflict without losing the proposal.

### 7.1 Commercial qualification gate

The current text-planning provider workflow is qualified as
`qualification_no_charge`. Until a dedicated text-operation pricing policy,
immutable quote, reservation, capture/refund, and reconciliation contract exist:

- show `Qualification operation - no Credits charged`;
- do not display a fictional estimate;
- do not reserve or deduct Credits;
- do not reuse image/video pricing;
- do not mark the paid operation production-ready.

Paid activation is a later commercial checkpoint and must use the canonical
Credit lifecycle. Removing the hard-coded 5-Credit prototype is mandatory.

### 7.2 Proposal Apply persistence and Scene identity

Generated Story Plan and Scene Direction results remain review proposals until
the owner explicitly selects `Apply proposal`. Apply is not a client-only state
change: it must persist a normal, unapproved Story Plan draft through
`saveCinematicStoryPlan` before closing the proposal dialog.

1. Applying a Story Plan proposal saves its generated Beat, Scene, and Shot IDs
   with `contractVersion: story-plan-v2`, `approved: false`, and the current
   optimistic Project version.
2. Applying a Scene Direction proposal replaces only that Scene in the current
   draft and persists the complete reconciled Story Plan as an unapproved draft.
3. The client calls Scene Direction generation only with a Scene ID returned by
   a successful Project save. A local proposal Scene must never be sent to the
   persisted-Scene endpoint.
4. Apply buttons show a pending state and cannot be submitted twice.
5. On version conflict, authorization failure, or save error, keep the proposal
   dialog and proposal data open, preserve the prior Project/draft, and expose a
   recoverable error. Do not silently close or apply partially.
6. A successful Apply updates the Project query owner through the existing
   `onProjectChanged` contract, then closes the dialog and marks the draft saved.

Acceptance:

- applying a generated Plan and immediately opening one of its Scenes cannot
  produce `cinematic_scene_not_found`;
- persisted `project.scenes` contains the same Scene IDs shown by Story Plan;
- proposal review remains non-destructive until Apply succeeds;
- no approval, provider dispatch, or Credit behavior changes in this correction.

### 7.3 Immediate proposal feedback and Stage version coherence

Story Plan generation and Stage navigation must remain responsive while their
asynchronous work is in progress.

1. Selecting `Generate Story Plan` opens the existing proposal-review dialog
   immediately, before the text-generation request completes.
2. While generation is pending, the dialog uses the shared generation loading
   presentation, exposes an accessible busy/status state, explains that the
   structured proposal is being prepared, and prevents duplicate Apply actions.
3. A successful response replaces the loading state inside the same dialog with
   the proposal review. A provider or transport failure keeps the dialog open,
   preserves the current draft, and shows a recoverable error.
4. Stage navigation is owned by the `/stage` mutation. Navigating between
   persisted stages must not create a redundant Setup autosave solely because
   the active Stage changed.
5. The workspace synchronizes its optimistic-version reference whenever the
   canonical Project query receives a newer Project version.
6. When a Stage-only navigation receives `cinematic_version_conflict`, the
   client refetches the authorized Project and retries the Stage mutation once
   with the latest version. It must not loop and must not use this recovery to
   overwrite concurrent Setup edits.
7. Successful recovery updates the canonical Project query before navigation;
   unrecovered errors remain visible and the current route is retained.

Regression acceptance:

- the proposal dialog is visible while the AI request promise is still pending;
- proposal content appears without closing and reopening the dialog;
- returning from Storyboard to Story Plan after a Project version increment
  does not submit the stale version twice;
- existing proposal Apply persistence, Setup autosave, Cast, Storyboard,
  Project Cost, Stage rail, and footer behavior remain unchanged.

## 8. UI ownership and components

Reuse the existing Cinematic shell, shared fields, Dialog, Confirm Dialog,
Button, status, loading, toast, and operation presentation. Story Plan feature
components may include:

```text
StoryPlanStage
|- StoryPlanReadinessSummary
|- StoryPlanOverview
|- StoryBeatBoard
|  |- StoryBeatCard[]
|  `- StorySceneCard[]
|- StoryPlanInspector
|  |- DurationSummary
|  |- StoryPlanValidationSummary
|  `- StoryPlanGenerationPanel
|- SceneDirectorDialog
|  |- SceneCoreFields
|  |- SceneAdvancedFields
|  `- SceneShotSkeletonList
|- StoryPlanProposalDialog
|- StoryPlanApprovalDialog
`- StoryPlanVersionStatus
```

Component names may change during implementation, but business rules stay in
the Cinematic application service and provider dispatch stays behind the text
generation service.

## 9. Required dialogs

- Scene Director: selected Scene context, editable Core/Advanced fields, dirty
  guard, Save, and Generate Scene Direction;
- Story Plan proposal review: current/proposed summary and explicit Apply or
  Discard;
- Scene proposal review: selected Scene only;
- approval confirmation: counts, duration, warnings, source version;
- destructive confirmation for removing a Beat/Scene with dependencies;
- unsaved-change confirmation;
- version conflict recovery when server Project version has advanced.

The first checkpoint may implement proposal review as a structured summary
rather than per-field cherry-picking. Automatic apply is forbidden.

## 10. Validation and readiness

Approval and Storyboard continuation are blocked when:

- no active Story Source exists or the plan source is stale;
- a Required role lacks an active Cast Assignment;
- a Beat has no linked Scene or a Scene has no Beat;
- a Scene has no Shot skeleton;
- Scene/Shot IDs are missing or duplicated;
- Shot duration is outside 0.25-60 seconds;
- Scene duration differs from child Shot total;
- total duration exceeds the configured tolerance;
- a Scene/Shot references unknown Cast or a Look owned by another Cast member;
- an explicit Creative Direction constraint is violated;
- an optimistic version conflict is unresolved.

Identity/Look preparation may be a planning warning but remains a Storyboard
generation blocker. The UI must state the difference.

## 11. Responsive and accessibility contract

- Desktop keeps Beat/Scene scanning and plan status simultaneously available
  without nested whole-page scrolling.
- Tablet preserves order and selection when panels stack.
- Mobile uses list-to-detail or a full-height Scene sheet and provides an
  explicit return to the Beat sequence.
- Reorder has keyboard Move earlier/Move later actions in addition to drag.
- Dialog focus is trapped/restored; validation actions move focus to the exact
  item; reduced motion is respected.
- Status and chart information is available as text and not color-only.
- No horizontal overflow at approximately 390px, 820px, or 1440px.

## 12. Delivery checkpoints

### Checkpoint A - contract and deterministic UI

- typed Story Plan/Beat/Version schemas;
- Project-backed Beats/Scenes and duration summary;
- readiness and validation;
- manual Draft and approval separation;
- functional selected-Scene Director;
- no fixture or hard-coded Credit in Project routes.

### Checkpoint B - structured AI proposals

- Prompt Recipes and text provider methods;
- Story Plan and selected Scene proposal endpoints;
- loading/error/proposal review/apply;
- explicit `qualification_no_charge` presentation.

### Checkpoint C - commercial activation (gated)

- text-operation pricing source and policy;
- exact quote and expiry;
- reservation/capture/refund/reconciliation;
- insufficient balance, replay, duplicate, and partial-failure tests;
- Admin draft/publish pricing controls.

Checkpoint C is not implied complete by A or B.

## 13. Acceptance criteria

1. A Project Story Plan renders persisted Beats, Scenes, Shots, and duration.
2. Fixed fixture Beats do not appear on a customer Project route.
3. Scene Director opens the selected Scene and Save updates only that Scene.
4. Core fields are visible and Advanced fields are progressively disclosed.
5. Saving a draft does not approve it.
6. Approval creates an immutable approved Story Plan Version.
7. Setup changes mark the approved plan stale and prevent silent continuation.
8. Generate Story Plan returns a reviewable proposal and does not auto-apply.
9. Generate Scene Direction scopes its proposal to the selected Scene.
10. AI failure leaves current manual work intact.
11. Qualification operations show no-charge status and no fictional Credits.
12. Validation identifies the affected Beat/Scene/Shot and a recovery action.
13. Required unassigned roles block approval; optional roles do not.
14. Storyboard receives stable IDs and approved source/version authority.
15. Existing Setup, Cast, Character Look, Storyboard, Produce, Project Cost,
    footer, theme, actor, and responsive behaviors have regression coverage.
16. English and Thai catalogs remain interpolation-compatible.
17. Focus and dialog behavior work by keyboard at mobile, tablet, and desktop.

## 14. Validation commands

```text
node --test test/cinematicApplicationService.test.js
node --test test/cinematicStoryPlanService.test.js
npm run test --workspace web -- src/features/cinematic/components/CinematicUxPrototype.test.tsx
npm run typecheck:web
```

Do not mark Checkpoint C complete until its independent commercial and QA gates
pass.

## 15. Implementation record (2026-08-30)

Implemented:

- project-backed Story Plan v2 schemas, immutable draft/approval versions, and
  legacy-read compatibility;
- deterministic manual starter Plan with one Beat, Scene, and editable Shot
  skeleton reconciled to the Project target duration;
- selected-Scene Director with Core, Advanced, Shot title, and Shot duration
  editing; Scene duration is derived from child Shots;
- global versioned Story Plan and Scene Direction Prompt Recipes;
- server-owned AI proposal endpoints with strict structured output, authorized
  Cast/Look filtering, and no persistence before explicit Apply;
- successful Story Plan and Scene Direction Apply now persists an unapproved v2
  draft before closing review, while save failure keeps the proposal available;
- readiness, stale-source, required-Cast, duration, draft, approval, loading,
  and error presentation;
- English/Thai localization and responsive Story Plan/Director layouts;
- regression tests for Project versioning, v2 approval validation, proposals,
  legacy behavior, sibling Cinematic stages, and removal of the prototype
  Credit amount.

Deferred intentionally:

- Checkpoint C text-operation pricing, quote, Credit reservation/capture/refund,
  reconciliation, and Admin pricing publication;
- richer Beat/Scene split, merge, reorder, destructive confirmation, and
  per-field proposal cherry-picking;
- independent browser verification at 390px, 820px, and 1440px remains a manual
  closeout activity.

## 16. Story Plan gate correction (CINE-FIX-001, 2026-08-30)

- The Story Plan footer now distinguishes a newer working draft that needs
  approval from structural/source/Cast/duration issues that need review.
- Qualification no-charge copy is operation metadata, not a warning and not a
  validation issue.
- A saved newer draft keeps Storyboard blocked until that exact working
  structure is approved; an older approved Plan cannot authorize newer Scene
  IDs.
- Approved current Plans retain the existing enabled Next-stage behavior.
