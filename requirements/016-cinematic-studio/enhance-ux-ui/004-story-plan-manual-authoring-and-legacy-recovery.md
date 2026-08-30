# Cinematic Story Plan - Manual Authoring And Legacy Recovery

> Status: Implemented; owner functional closeout pending
>
> Capability owner: Cinematic
>
> Parent: `003-layout-cinematicstudio-story-plan-design.md`
>
> Primary role: Product and Requirement Architect
>
> Reviews: Cinematic Experience and UX/UI Product Design

## 1. Problem

Existing Projects may contain legacy Story Beats without `targetDurationMs` or
`sceneIds`, while persisted Scenes may have no `beatId`. The current Story Plan
renders these Beats as `0.0s`, exposes no selectable Scene, and hides the empty
plan action because Beats technically exist. Users cannot inspect a Beat or
repair the plan manually.

The Story Plan must remain usable without AI. Every visible Beat must be
selectable, explain its readiness, and provide a path to create or repair its
Scene and Shot structure.

## 2. Preservation boundary

Change only Story Plan-owned content, dialogs, styles, schemas, and tests.
Preserve the global sidebar, workspace header, stage rail, Control level,
Project Cost, footer, Setup, Cast, Storyboard, Produce, Finish, actor isolation,
theme behavior, AI proposal contracts, and Credit behavior.

Legacy recovery is a client-side draft projection until the owner explicitly
saves. Opening a Project must never mutate persisted data.

## 3. Sectioned implementation plan

### Section A - Legacy recovery projection

1. Detect Beats with missing/empty Scene links and Scenes with missing/unknown
   Beat IDs.
2. Link orphan Scenes deterministically by existing order to the first eligible
   Beat.
3. Recompute each Beat's `sceneIds` and duration from linked Scenes.
4. Mark the projected draft dirty/recovery-required without saving it
   automatically.
5. Show a recovery notice with a clear `Review and save` action.
6. Keep stable legacy Beat, Scene, and Shot IDs.

Acceptance:

- the existing Project no longer shows every Beat as an unexplained `0.0s`;
- the linked Scene is reachable;
- untouched legacy data is not written during page load.

### Section B - Beat selection and Beat Details dialog

1. Make the complete Beat summary a semantic button with visible hover, focus,
   selected, warning, and ready states.
2. Open a Beat Details dialog for the selected Beat.
3. Edit type, title, dramatic purpose, visible story change, emotional start,
   and emotional end.
4. Display derived duration, Scene count, and linked Scene list.
5. A duration with no Scene is shown as `Duration required`, not a bare `0.0s`.
6. Each linked Scene has an explicit `Edit Scene` action that opens the existing
   selected-Scene Director.
7. Dialog focus is trapped and restored to the triggering Beat.

Acceptance:

- every Beat is keyboard and pointer selectable;
- Save updates only the local Story Plan draft;
- Scene Director always opens the Scene selected from that Beat.

### Section C - Manual Beat and Scene structure

1. `Add Beat` creates one editable Beat with a stable client ID.
2. An empty plan retains `Create manually`; a structurally incomplete legacy
   plan exposes `Repair structure` instead of becoming a dead end.
3. `Add Scene` from Beat Details creates one Scene linked to that Beat and one
   Shot skeleton.
4. New Scene duration uses remaining Project duration when available; otherwise
   it uses the minimum editable starter duration.
5. Move Beat earlier/later and Move Scene earlier/later are keyboard-operable.
6. Removing a Beat or Scene requires confirmation. Removing the last Beat,
   last Scene, or last Shot is blocked with a recovery explanation.
7. Beat removal is blocked while it owns Scenes unless those Scenes are removed
   or reassigned explicitly.

Acceptance:

- a user can build a complete Plan without calling AI;
- no Scene is orphaned after an action;
- order keys and link arrays are derived consistently before Save.

### Section D - Shot skeleton completion

1. Extend the existing Scene Director Shot skeleton list; do not create a
   parallel Shot editor.
2. Support Add Shot, title and duration editing, Move earlier/later, and Remove
   with confirmation.
3. Scene duration is always derived from child Shot duration.
4. New Shots inherit authorized Scene Cast/Look IDs and start in `draft`.
5. Detailed Storyboard prompt/provider controls remain outside this dialog.

Acceptance:

- every Scene retains at least one Shot;
- Shot order and Scene duration remain consistent;
- Storyboard receives stable ordered IDs after approval.

### Section E - Validation and recovery navigation

Validate and identify:

- Beat without Scene;
- orphan Scene or unknown Beat;
- Scene without Shot;
- invalid or duplicate IDs;
- empty required Beat/Scene/Shot labels;
- Shot duration outside 0.25-60 seconds;
- Scene duration different from child Shot total;
- Project runtime outside one-second tolerance;
- missing Required Cast and stale Story Source.

Validation items must name the affected Beat/Scene and focus or open the exact
editor when actionable. Draft Save remains available for incomplete work;
Approval and Storyboard continuation remain blocked.

### Section F - responsive and regression gates

1. Desktop keeps the Story board and inspector scannable.
2. Tablet stacks without losing selected state.
3. Mobile Beat and Scene actions wrap without horizontal overflow; dialogs use
   a practical full-height layout.
4. English/Thai keys and interpolation remain compatible.
5. Automated tests cover legacy recovery, Beat selection, manual Scene/Shot
   creation, duration derivation, draft/approval separation, and sibling stage
   preservation.

### Section G - Authoring dialog form visibility correction

Radix Dialog content is rendered through a Portal outside
`[data-testid="cinematic-workspace"]`. Workspace-scoped input styling therefore
does not reach Beat Details or Scene Director, causing editable controls to
appear as unframed text. Correct the presentation without changing the Story
Plan workflow or persisted data contract.

1. Apply one Cinematic authoring-dialog form class to Beat Details and Scene
   Director instead of duplicating control styles in each dialog.
2. Every text input, number input, textarea, and select must have a visible
   surface, strong border, readable value, practical padding, and stable minimum
   height in all supported themes.
3. Labels remain above their controls with stronger contrast than supporting
   copy. Editable values must not look like read-only body text.
4. Hover and keyboard focus must strengthen the border and show the canonical
   focus ring without moving the layout.
5. Shot skeleton rows must visually group their index, editable fields, and
   order/remove actions. Desktop may use columns; tablet/mobile stack controls
   without clipping or horizontal page overflow.
6. Preserve dialog title, context badges, advanced disclosure, AI direction,
   actions, close behavior, Story Plan layout, and all sibling stages.

Acceptance:

- a user can immediately identify every editable field before focusing it;
- existing values remain readable and controls retain native keyboard behavior;
- Beat Details and Scene Director use the same form treatment;
- no global input selector or non-Cinematic dialog is changed;
- regression coverage asserts the authoring-dialog contract and existing save,
  close, add, reorder, and remove behavior remains available.

## 4. Component reuse map

```text
CinematicStageContent / StoryPlanStage
|- StoryBeatCard (extended semantic interaction)
|- BeatDetailsDialog (new, Cinematic-owned)
|  `- existing Button and Dialog primitives
|- SceneDirectorDialog (extended Shot skeleton actions)
|- ConfirmDialog (existing destructive confirmation)
|- StoryPlanProposalDialog (preserved)
|- SceneDirectionProposalDialog (preserved)
`- StageFooter / Project Cost / shell (preserved)
```

No new provider, repository, Credit, or persistence pipeline is permitted.
Saving continues through `saveCinematicStoryPlan` and the canonical Cinematic
application service.

## 5. State and error matrix

| State | Presentation | Allowed actions |
|---|---|---|
| Empty | Manual/AI start actions | Create manually, Generate |
| Legacy incomplete | Recovery notice and affected items | Inspect, repair, save draft |
| Draft incomplete | Named validation issues | Edit, add, remove, reorder, save draft |
| Draft ready | Ready status | Save draft, approve |
| Approved | Approved version | Inspect or create a new draft revision |
| Source stale | Blocking warning | Review against current source, save new draft |
| Save conflict | Non-destructive error | Reload current Project and retry manually |
| AI unavailable | Existing draft retained | Continue manually |

## 6. Delivery order and rollback

Implement Sections A through F in order. Each section receives focused tests
before the next section starts. Rollback is code-only: legacy data is not
migrated on read, so removing the recovery projection cannot corrupt storage.
Any explicit Save produces a normal `story-plan-v2` version through the current
optimistic Project write contract.

## 7. Validation commands

```powershell
node --test test/cinematicApplicationService.test.js test/cinematicStoryPlanService.test.js
npm.cmd run test --workspace web -- src/features/cinematic
npm.cmd run typecheck:web
npm.cmd run i18n:validate
```

Manual verification belongs in
`_temp/test-case/cinematic-story-plan-manual-authoring-recovery-th.md`.

## 8. Implementation record (2026-08-30)

- Section A implemented with a non-persisting recovery projection and explicit
  recovery notice.
- Section B implemented with selectable Beat summaries and a Beat Details
  dialog linked to the existing Scene Director.
- Section C implemented with Beat/Scene add, move, guarded remove, and stable
  manual IDs.
- Section D implemented by extending the existing Shot skeleton list with add,
  title, purpose, duration, move, guarded remove, and derived Scene duration.
- Section E implemented in both client readiness and the server v2 approval
  gate. Approved continuation now rejects incomplete or structurally recovered
  legacy plans.
- Section F automated coverage and headless visual verification at 390px,
  820px, and 1440px are implemented. Real legacy-Project save and approval
  evidence remains required before closeout.
- Section G implemented one Portal-safe authoring form contract for Beat Details
  and Scene Director. Scene Director was visually verified with 26 controls at
  390px, 820px, and 1440px: every control resolved a visible one-pixel border
  and input surface, and neither the page nor dialog had horizontal overflow.
  Evidence: `_temp/scene-director-form-{390,820,1440}.png`.
