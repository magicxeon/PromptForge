# Momelo Cinematic Studio — Cast & Wardrobe UX/UI Design Specification

> Implementation-ready redesign for Stage 2 of Cinematic Studio.
>
> Stage sequence: `Setup → Cast → Story Plan → Storyboard → Produce → Finish`
>
> This specification preserves the shared Cinematic Studio header, stage
> navigation, global sidebar, Project Cost entry point, and bottom action bar.
> Only the content area of the Cast stage is redesigned.

## 0. Current-system reconciliation and implementation checkpoints

This requirement is an additive redesign over the existing Cinematic Cast
workflow. It must not create a second Cast repository, Character chooser,
Character Look store, upload path, or Project-stage mutation.

### 0.1 Canonical owners retained

| Concern | Canonical owner used by this redesign |
|---|---|
| Story Role Slots and planning source | `CinematicProject.setup.storyRoleSlots` and `castPlanningMode` |
| Project Cast assignment and dossier | Cinematic API/domain through `upsertCinematicCast` |
| Character eligibility, identity version and reusable rights | Character Profile capability and the existing Character directory APIs |
| Character Look draft/version lifecycle | Character Profile capability and `CharacterLookDraftDialog` |
| Project wardrobe binding | Cinematic API/domain through `upsertCinematicWardrobeLook` |
| Project navigation, save state and Project Cost | Existing Cinematic workspace shell |

The React implementation remains under `web/src/features/cinematic/`. Shared
Character Look authoring remains under `web/src/features/profiles/`; Cinematic
may invoke it but must not fork its persistence contract.

### 0.2 Compatibility rules

- Existing Cast records remain readable. Normalized role-label matching may be
  used only as a compatibility fallback; all new writes use `storyRoleSlotId`.
- Existing Character chooser filtering, face-first media selection, bounded
  pagination, pending confirmation, and failure retention remain protected.
- Existing Character Look drafts and approved Look versions remain usable.
- Simple/Advanced state, selected role, and active detail tab are actor- and
  Project-scoped presentation state. They never alter reusable Character data.
- The redesign does not modify the global sidebar. It reuses the Cinematic
  header, Stage navigation, Project Cost entry point, and footer established by
  Setup.

### 0.3 Production gates

The first implementation checkpoint may provide the complete deterministic
Cast and source-draft experience. It must keep the following unavailable until
their canonical workflows exist:

- AI wardrobe generation;
- paid three-view Character Look preparation;
- Character Look approval or publication;
- Scene-level Look assignment before Story Plan has created Scenes;
- fabricated Credit estimates or fixed-price operation docks.

Unavailable operations use honest explanatory states and do not accept input
that cannot be persisted.

### 0.4 Delivery checkpoints

1. Protect existing assignment, chooser, Character Look, stage navigation, and
   error-retention behavior with regression tests.
2. Add the Role readiness strip and role-aware Project Cast master list without
   changing server persistence.
3. Add the selected Character identity header and Direction, Wardrobe, and
   Continuity tabs over current Cast and Look data.
4. Remove prototype-only fixture Characters, fixed Credit UI, and false
   production readiness from committed Projects.
5. Verify English/Thai, keyboard/focus behavior, themes, and responsive layouts
   at approximately 390px, 820px, and 1440px.

Implementation status is recorded per checkpoint. A completed visual checkpoint
does not imply that a production-gated operation is implemented.

---

## 1. Outcome

The page must help a non-filmmaker answer three questions in order:

1. Which story roles from Setup still need a Character?
2. How should each assigned Character behave in this project?
3. Which approved wardrobe Look will preserve visual continuity?

The page is complete when every required Story Role Slot has one eligible Cast
Assignment and each required assignment has a usable identity authority.
Wardrobe warnings may remain visible, but an unapproved Look must never be
presented as production-ready.

The page must not:

- create or recalculate Story Role Slots;
- edit the reusable Character Profile;
- silently assign one Character to multiple roles;
- silently create a fifth role;
- approve, publish, or charge for a Look draft;
- fabricate a Credit estimate;
- edit Scene order or Shot direction.

---

## 2. Shared Cinematic shell — preserve unchanged

Reuse the exact shell established on the Setup page:

- Momelo global header and account controls;
- global left sidebar;
- Cinematic project title and save state;
- `Project cost` trigger in the workspace header;
- stage navigation with `Cast` active;
- desktop, tablet, and mobile stage-navigation behavior;
- bottom action bar visual style and placement;
- dark theme, typography, border system, cyan–purple–pink accent gradient;
- global marketing footer remains hidden inside Cinematic Studio.

Bottom actions on this stage:

- secondary: `Back to Setup`;
- primary: `Continue to Story Plan`;
- the primary action is disabled only while a required role has no eligible
  Character assignment or a save mutation is pending;
- blocker text appears immediately to the left of the actions;
- do not use the prototype copy `Presentation checkpoint`.

---

## 3. Page information architecture

### 3.1 Stage heading

```text
CAST & WARDROBE
Choose who plays each role
Assign approved Characters, guide their performance, and prepare one primary Look.
```

Right side:

- segmented control: `Simple` / `Advanced`;
- short helper text changes with mode;
- changing mode never clears data.
- use the same shared Control Level component and right-aligned heading pattern
  as Setup; never render a separate full-width Control Level row below the Cast
  heading.

Simple mode exposes:

- role assignment;
- identity readiness;
- objective;
- emotional baseline;
- personality traits;
- performance direction;
- one primary wardrobe Look;
- continuity lock.

Advanced mode additionally exposes:

- motivation;
- pressure / fear;
- key relationship;
- dialogue style;
- intentional Scene-level Look-change controls, clearly labelled as available
  after Story Plan when Scenes exist.

### 3.2 Role readiness strip

Place a full-width readiness surface immediately below the heading. It is the
first decision surface, not a decorative summary.

The Project Cast master panel separately shows two explicit counts:

- `Characters in project`: the current persisted Cast Assignment count;
- `Planned roles`: the current `storyRoleSlots.length` from Setup.

Never substitute one count for the other. A legacy Project may correctly show
Characters in use while Planned roles is zero.

Example fixture:

```text
Planned cast                                  1 of 2 required assigned
2 roles from Setup · AI recommendation        One role needs a Character

[Lead · Required · Assigned]  Alice
Drives the final decision      Change Character

[Second Character · Required · Needs Character]
Forces the Lead to decide      Choose Character
```

Required content:

- source-aware label: `Recommended roles` for `ai-recommended`; `Planned roles`
  for `solo`, `duo`, and `manual`;
- total role count from `storyRoleSlots.length` only;
- required assigned count;
- short status sentence;
- one compact role card per Story Role Slot, maximum four;
- role label, required/optional badge, story function, assigned state, portrait
  and Character name when assigned;
- relationship hint in a disclosure row or tooltip only when present;
- `Choose Character` or `Change Character` action on every role card;
- accessible status text; color alone is insufficient.

Card ordering:

1. required unassigned;
2. required assigned;
3. optional unassigned;
4. optional assigned;

Preserve the approved Setup role order within each group. Do not reorder after
the user has started editing the page unless the user explicitly sorts.

Special states:

- zero roles: explain that no role plan was created and offer `Back to Setup`;
- all required assigned: success text `Required cast is ready`;
- all required assigned but an identity is still being prepared: keep the
  assignment progress complete, show the separate preparation blocker, and do
  not describe the role as missing a Character;
- optional unassigned: neutral text; never block Continue;
- removed/replaced role after assignments: show an impact-review banner before
  detaching anything.

### 3.3 Main workspace — master/detail

Desktop uses two columns below the readiness strip:

```text
┌──────────────────────────┬────────────────────────────────────────────┐
│ Project cast             │ Selected Character                       │
│ 320 px                   │ flexible                                 │
│                          │ [Direction] [Wardrobe] [Continuity]        │
│ Character cards          │ active detail panel                       │
│ + Add Character          │                                            │
└──────────────────────────┴────────────────────────────────────────────┘
```

Grid at a 1440px content viewport:

- gap: 16px;
- master column: `minmax(288px, 320px)`;
- detail column: `minmax(0, 1fr)`;
- both columns start on the same baseline;
- avoid nesting the entire detail workspace inside multiple decorative cards.

The `Add Character` action targets the next unassigned role, prioritizing
required roles. If all roles are assigned, it becomes disabled with helper text
`All planned roles are assigned`. It never creates an extra role.

---

## 4. Project Cast master list

### 4.1 Section header

```text
Project cast
2 planned roles
[+ Add Character]
```

### 4.2 Cast card

Each card contains:

- current Character Profile featured image, resolved dynamically through the
  authorized Character media endpoint, 72×88px desktop;
- the pinned canonical face/version remains the AI identity authority and must
  not be substituted with the presentation image during Generation;
- role label and required/optional badge;
- Character display name;
- identity status: `Identity ready`, `Needs preparation`, `Unavailable`, or
  `Rights changed`;
- active primary Look summary;
- current Scene commitment count; before Story Plan, use `Scenes not planned`
  rather than `0 Scenes`;
- selected state with cyan outline and left indicator;
- menu actions: `Change Character`, `Remove assignment`, `Open Character`.

`Remove assignment` requires confirmation and removes only the Project Cast
Assignment. It never deletes, archives, or changes the reusable Character
Profile. The Story Role Slot remains and returns to its unassigned state. If a
Scene, Shot, or bound wardrobe Look in the approved Story Plan references the
assignment, removal is blocked with an impact summary; the system must not
cascade-delete planned work.

Do not label a reusable Character's profile personality as the project role.
Role and Character identity remain visually distinct.

### 4.3 Unassigned role card

Show unassigned required and optional role slots in the same list so the user
does not need to compare two different areas.

```text
Second Character · Required
No Character assigned
Forces the Lead to decide
[Choose Character]
```

Selecting the card opens the Character chooser. It has no empty dossier.

### 4.4 Default selection

- select the first required unassigned role when one exists;
- otherwise select the first assigned Character;
- preserve the last selected `storyRoleSlotId` after refresh;
- when a Character chooser closes successfully, select the new assignment;
- do not switch selection because background data refreshed.

---

## 5. Selected Character detail workspace

### 5.1 Identity authority header

Always visible above the tabs:

- portrait;
- Character display name;
- bound Story Role Slot label;
- `Identity ready` or blocking state;
- pinned Character Profile version, secondary metadata;
- link `View Character profile`;
- helper text: `Changes here affect this film only.`

If identity is not eligible, replace the detail tabs with a focused readiness
panel:

```text
This Character is not ready for production
An approved identity pack and reusable rights are required.
[Prepare Character] [Choose another Character]
```

Return from `Prepare Character` to the same project, role, and tab.

### 5.2 Tabs

Use three tabs:

1. `Direction`
2. `Wardrobe`
3. `Continuity`

Tabs reduce the vertical form length while keeping the ownership model clear.
Persist active tab per project and selected role.

On mobile, use a sticky horizontally scrollable tab bar. All labels remain
fully readable; do not replace labels with icons only.

---

## 6. Direction tab

### 6.1 Intro

```text
Character direction
Guide this Character's behavior in this film without changing the reusable profile.
```

### 6.2 Simple mode field order

1. Story role — read-only label from the Story Role Slot; changing it belongs
   in Setup;
2. Emotional baseline — select;
3. Objective — textarea;
4. Personality traits — token input, not comma-only free text;
5. Performance direction — textarea.

Recommended layout:

- two columns for Story role and Emotional baseline;
- Objective full width;
- Personality traits full width;
- Performance direction full width;
- field description below label, validation below control.

Fixture:

```text
Story role: Lead
Emotional baseline: Guarded
Objective: Reach Mira before the last train and ask for an honest new beginning.
Traits: Patient, sincere, emotionally direct
Performance direction: Open posture and measured approach. Hold warmth without
a broad smile until the final beat.
```

### 6.3 Advanced disclosure

Append:

- Motivation;
- Pressure / fear;
- Key relationship;
- Dialogue style.

If a field is not persisted by the current API, render it read-only with
`Not saved yet` and do not imply persistence. Prefer hiding unavailable fields
until the contract is connected rather than accepting data that can be lost.

### 6.4 Saving behavior

- autosave after 800ms of inactivity for local dossier fields;
- show `Unsaved`, `Saving…`, `Saved`, `Offline`, or `Save failed` in the identity
  header;
- retain explicit secondary action `Save now` only after a failure or conflict;
- remove the full-width `Save Character direction` button from normal success
  flow;
- prevent duplicate writes while a mutation is pending;
- version conflict opens a compare/reload notice and keeps local values.

---

## 7. Wardrobe tab

### 7.1 Purpose

The tab chooses one approved production authority for the selected Character.
It distinguishes reusable approved Looks from source drafts and paid generation
attempts.

### 7.2 Primary Look summary

At the top, show the current binding:

- Look preview or garment icon;
- Look name;
- source: Character default, uploaded draft, or Character Look;
- lifecycle/readiness badge;
- coverage: Front, Front + Back, or Multi-view;
- scope: Film-wide default or named Scenes;
- continuity lock;
- actions: `Change Look`, `View details`, `Remove binding`.

An approved version shows `Approved · Ready for Storyboard`.
A source-ready draft shows `Draft · Preparation required` and cannot be
presented as final wardrobe authority.

### 7.3 Look library

Below the current binding, show a compact selectable grid/list:

- `Character wardrobe` default Look;
- eligible approved Character Looks;
- draft/review Looks labelled but not bindable as final authority;
- create tile `Upload wardrobe references`.

Each Look card includes:

- preview;
- Look name;
- official/private indicator when relevant;
- version and readiness status;
- coverage;
- selected state;
- primary action appropriate to status:
  - approved: `Use this Look`;
  - draft/review: `Continue preparation`;
  - retired/superseded: disabled with explanation.

### 7.4 Upload wardrobe references

Open the Create Character Look dialog described in section 10. Saving creates a
private, free, `source_ready` draft. On success, return to this tab, place the
new draft first, and show `Draft saved — preparation is still required`.

The shared dialog preserves the surrounding Cast workspace and supports three
explicit source patterns:

- `Full Look`: one required image containing the complete coordinated outfit;
- `Separate Pieces`: required upper and lower garment images, with optional
  outerwear, footwear and accessory images;
- `Complete Character Look Sheet`: one user-owned sheet containing the approved
  front, exact-side, back and canonical-face regions.

Changing this dialog must not redesign, remove or reposition the Cast heading,
role-readiness surface, dossier tabs, Stage actions, Project Cost summary,
navigation or any other established sibling UI. Existing shared components are
extended through props and callbacks rather than copied into a Cinematic-only
fork.

### 7.5 AI wardrobe suggestion

Use the same Create Character Look dialog with `AI Suggestion` selected. The
server resolves the current Project, Cast Assignment and active Story source,
then applies the versioned global recipe under
`server/config/prompt-recipes/cinematic/`. The Project remains the source of
story and Cast context; the accepted private Character Look draft stores the
structured suggestion and recipe provenance. Neither record owns or duplicates
the global prompt pattern.

The suggestion includes Look name, complete wardrobe direction, garment-piece
breakdown, palette, materials, movement constraints, continuity notes, Scene
scope, rationale and warnings. The user may edit the proposed name and wardrobe
direction before saving a private Character Look draft.

For initial qualification this text analysis reports
`qualification_no_charge`. It never silently generates media. Character Look
Sheet preparation remains a separate exact quote → lock → submit operation.
No fabricated Credit amount or paid operation appears before that workflow is
connected.

The Cinematic variant places an analysis surface before `Look name`:

```text
Story-aware wardrobe analysis
Uses the saved Story, selected role, performance direction and available Scenes.
[Analyze story and suggest wardrobe]
```

Choosing the `AI Suggestion` segment does not run analysis. The user presses the
button explicitly. While running, the shared action shows progress and prevents
duplicate requests. Success fills the editable fields and changes the action to
`Regenerate suggestion`. Failure preserves existing edits, presents a safe
inline error and changes the action to `Try analysis again`.

The UI invokes the shared Cinematic API callback supplied to the Character
Profile-owned dialog. Provider selection, Prompt Recipe loading and structured
output validation remain server-owned through
`CinematicWardrobeSuggestionService` and the shared text-provider boundary.
No client component imports or calls a provider adapter.

---

## 8. Continuity tab

### 8.1 Identity continuity

Read-only checklist:

- approved Character Profile Version pinned;
- canonical face authority available;
- canonical body authority available;
- reuse rights valid;
- stale dependency state.

### 8.2 Wardrobe continuity

Controls:

- checkbox: `Lock the primary Look after Storyboard approval`;
- active Look summary;
- readiness and coverage;
- explanatory text that lock occurs after approval, not immediately.

Advanced mode adds:

- `Allow intentional Look changes by Scene` toggle;
- disabled helper state before Scenes exist:
  `Scene-level Looks become available after Story Plan creates Scenes.`

Do not show placeholder Scene counters as production commitments.

### 8.3 Readiness checklist

Use status rows with text labels:

```text
✓ Required role assigned
✓ Identity authority ready
! Primary Look draft needs preparation
— Scene continuity available after Story Plan
```

This is informative. Only required role assignment and eligible identity block
Continue at this stage unless the product contract explicitly changes.

---

## 9. Character chooser dialog

### 9.1 Dialog structure

Desktop: max-width 1040px, max-height 84vh.

```text
[Header: Choose a Character for Lead                         Close]
[Search] [Gender] [Age] [Ethnicity] [Source]
[Scrollable results grid]
[Previous] Page 1 of n [Next]             [Cancel] [Use Character]
```

Header, filters, and footer remain visible; only results scroll.

### 9.2 Filters and pagination

- Character-name search;
- Gender: All, Female, Male;
- Age: All, 18–19, 20–29, 30–39, 40–49, 50+;
- Ethnicity from identity facets;
- Source: All, My Characters, Community;
- bounded server pagination;
- preserve filter state and selection between pages.

### 9.3 Candidate card

- face-first thumbnail;
- display name;
- short personality summary;
- ownership/source;
- readiness state;
- selected outline, check mark, and `aria-selected=true`;
- ineligible cards remain visible only when a useful preparation action exists;
  otherwise exclude them from results.

### 9.4 Actions and states

- `Use Character` disabled until an eligible candidate is selected;
- persistence must complete before closing;
- loading uses skeleton cards;
- no results provides `Clear filters`;
- load/persistence failures retain selection and filters;
- return focus to the invoking role action after cancel;
- after success, move focus to the selected Character identity header.

---

## 10. Create Character Look dialog

This is the shared Character Profile-owned Look workflow used from both the
Character page and Cinematic Cast. It uses a segmented source selector:

```text
[AI Suggestion] [Upload Wardrobe]
```

`Upload Wardrobe` supports either a garment source or one complete Character
Look Sheet. `AI Suggestion` and Upload converge on the same draft and approval
contract; they are not separate dialogs.

Fields:

- Look name, required, maximum 100 characters;
- Garment role: Full look, Upper garment, Lower garment;
- Front reference, required;
- Back reference, optional at source-draft time;
- hidden source Character Profile ID;
- hidden pinned Character Profile Version ID;
- idempotency key generated on save.

When `Complete Character Look Sheet` is selected, show one upload tile instead
of front/back garment tiles. The preview must use `contain`, display the full
sheet and identify the expected front, side, back and face regions. Saving the
sheet is free. The user must confirm ownership and layout coverage before the
same explicit action creates the reviewed and approved private Look Version.

When `Garment source` is selected, Full Look uses one required upload. Separate
upper/lower garment roles remain available only through progressive disclosure.
Saving retains source-ready status and does not silently generate media.

The AI Suggestion mode collects story/role-aligned direction and presents its
operation readiness honestly. It must not fabricate an estimate, dispatch a
provider or claim that a Character Look exists until the canonical Generation
and Credit operation is qualified.

When opened from Cinematic Cast, AI Suggestion must visibly include the explicit
story-analysis action before the Look fields. When opened from Character Profile
without a Project, the same dialog keeps manual Wardrobe direction available and
shows a context note instead of a non-functional analysis control.

Upload tiles show:

- accepted file types and size policy from the canonical Asset uploader;
- preview, replace, remove, upload progress, and failure state;
- ownership acknowledgement;
- front/back view labels that remain visible after preview.

Required notice before the actions:

```text
Saving this Look draft is free. A separate quote, three-view generation,
review, and approval are required before it can be used as Storyboard or video
wardrobe authority.
```

For a complete user-uploaded Sheet, replace that notice with:

```text
Uploading and approving your own complete Character Look Sheet is free. Momelo
will store one source Asset and derive view crops when a Scene needs them.
```

Actions:

- `Cancel`;
- `Save Look draft`;
- no Credit icon or amount;
- wait for uploads and draft persistence before closing;
- preserve inputs after upload or save failure.

---

## 11. Footer readiness and stage transition

The preserved bottom action bar contains a compact status area.

Blocked example:

```text
Cast incomplete
Assign a Character to Second Character before continuing.
                       [Back to Setup] [Continue to Story Plan — disabled]
```

Ready example:

```text
Required cast ready
2 of 2 required roles assigned. Wardrobe drafts can be prepared later.
                       [Back to Setup] [Continue to Story Plan]
```

If multiple blockers exist, state the count and list them in an expandable
`Review issues` panel. Do not show a generic disabled button without an
explanation.

Continue behavior:

1. flush pending autosave;
2. validate required role assignments by stable `storyRoleSlotId`;
3. validate assignment eligibility and rights;
4. persist the current stage readiness snapshot;
5. navigate to Stage 3 Story Plan;
6. on failure, remain on Cast and focus the first actionable issue.

---

## 12. State and validation rules

### 12.1 Role readiness

```ts
type CastPlanningMode = 'ai-recommended' | 'solo' | 'duo' | 'manual';
type RoleImportance = 'required' | 'optional';

interface StoryRoleSlot {
  id: string;
  label: string;
  importance: RoleImportance;
  storyFunction?: string;
  relationshipHint?: string;
}

interface CastAssignment {
  id: string;
  storyRoleSlotId: string;
  characterProfileId: string;
  characterProfileVersionId: string;
  displayName: string;
  portraitUrl?: string;
  identityReady: boolean;
  rightsValid: boolean;
  active: boolean;
}
```

Required assigned count:

```ts
const requiredSlots = storyRoleSlots.filter(
  (slot) => slot.importance === 'required',
);

const assignmentByRole = new Map(
  castAssignments
    .filter((a) => a.active)
    .map((a) => [a.storyRoleSlotId, a]),
);

const eligibleAssignmentByRole = new Map(
  castAssignments
    .filter((a) => a.active && a.identityReady && a.rightsValid)
    .map((a) => [a.storyRoleSlotId, a]),
);

const requiredAssigned = requiredSlots.filter((slot) =>
  assignmentByRole.has(slot.id),
).length;

const canContinue =
  requiredAssigned === requiredSlots.length
  && requiredSlots.every((slot) => eligibleAssignmentByRole.has(slot.id))
  && !hasPendingMutation;
```

Retain normalized role-label fallback only in the compatibility adapter. New UI
and writes must use `storyRoleSlotId`.

### 12.2 View state

```ts
interface CastStageViewState {
  controlLevel: 'simple' | 'advanced';
  selectedStoryRoleSlotId?: string;
  activeDetailTab: 'direction' | 'wardrobe' | 'continuity';
  chooserFilters: CharacterChooserFilters;
  dossierSaveState: 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'failed' | 'conflict';
  pendingMutation: boolean;
}
```

Persist `controlLevel`, `selectedStoryRoleSlotId`, and `activeDetailTab` locally
per project. Do not persist dialog-open state.

### 12.3 Look authority

Only a Look Version with `approved` status and valid Character/Profile linkage
may become the final Storyboard or Produce wardrobe authority.

```text
identity_ready
+ wardrobe_sources_ready
+ provider_reference_plan_supported
+ approved_look_version
= cast_look_ready
```

Show stale or superseded dependencies before Story Plan. Never silently replace
a pinned approved version with a newer draft.

---

## 13. Component map

```text
CastStagePage
├─ CinematicWorkspaceHeader              // shared
├─ CinematicStageNavigation              // shared; Cast active
├─ CastStageHeading
│  └─ ControlLevelSegmentedControl
├─ RoleReadinessStrip
│  └─ StoryRoleStatusCard[]
├─ CastMasterDetail
│  ├─ ProjectCastPanel
│  │  ├─ AddCharacterButton
│  │  └─ CastRoleCard[]
│  └─ SelectedCharacterWorkspace
│     ├─ CharacterIdentityHeader
│     ├─ CharacterDetailTabs
│     ├─ DirectionPanel
│     ├─ WardrobePanel
│     └─ ContinuityPanel
├─ CinematicBottomActionBar              // shared
├─ CharacterChooserDialog
└─ CreateCharacterLookDialog
```

Reuse existing shared controls for fields, status tags, uploads, dialog shells,
toasts, and error notices. Do not fork a Cinematic-only upload component or
Character repository.

---

## 14. Responsive behavior

### Desktop — 1200px and above

- full stage navigation;
- role cards in a 2–4 column row depending on count;
- 320px master column plus flexible detail;
- detail tabs remain visible while scrolling within the page; no nested scroll
  container unless the viewport height is exceptionally short;
- bottom action bar may be sticky if it does not cover fields at 200% zoom.

### Tablet — 768px to 1199px

- shared compact Stage selector from Setup;
- role readiness cards use a two-column grid;
- master list appears above the detail workspace;
- Cast cards use a horizontal scroll list only when all actions remain keyboard
  reachable; otherwise use a two-column grid;
- detail tabs full width;
- bottom actions remain in one row when space permits.

### Mobile — approximately 390px to 767px

- global sidebar uses the existing drawer;
- compact Stage selector;
- heading and Simple/Advanced control stack;
- role readiness becomes a vertical list;
- use list-to-detail navigation:
  - default view: role/Cast list;
  - selecting assigned Character opens a full-width detail view;
  - detail header includes `Back to cast`;
- tabs horizontally scroll but keep text labels;
- dialog becomes a full-screen sheet;
- filters collapse into `Filters (n)`;
- footer stacks status, primary button, then secondary button;
- no horizontal page overflow at 390px.

---

## 15. Accessibility

- minimum pointer target 24×24 CSS px; use 44px height for primary controls;
- all role cards, Cast cards, tabs, Look cards, and dialog results are keyboard
  reachable with visible focus;
- selected and readiness states use text plus icon, never color alone;
- segmented control uses radio-group semantics;
- tabs implement the ARIA tabs pattern;
- card selection does not hide separate action names from screen readers;
- field errors use `aria-invalid` and `aria-describedby`;
- live region announces autosave and assignment success without stealing focus;
- dialogs trap focus, restore focus on close, and keep a visible title;
- maintain readable contrast for muted text and cyan borders against the dark
  surface;
- sticky content must not obscure focused controls at 200% zoom;
- portrait images use meaningful alt text such as `Portrait of Alice` or empty
  alt when the adjacent visible name already supplies the same information.

---

## 16. Analytics events

```text
cinematic_cast_stage_viewed
cinematic_cast_control_level_changed
cinematic_cast_role_selected
cinematic_cast_character_chooser_opened
cinematic_cast_character_filter_changed
cinematic_cast_character_assigned
cinematic_cast_character_changed
cinematic_cast_character_removed
cinematic_cast_dossier_autosave_succeeded
cinematic_cast_dossier_autosave_failed
cinematic_cast_detail_tab_changed
cinematic_cast_look_bound
cinematic_cast_look_draft_opened
cinematic_cast_look_draft_saved
cinematic_cast_continue_blocked
cinematic_cast_continued_to_story_plan
```

Do not send objective, pressure/fear, relationship, dialogue, or other creative
free text in analytics payloads. Use IDs, source, status, count, and duration.

---

## 17. Acceptance criteria

1. Shared header, sidebar, stage navigation, Project Cost trigger, and bottom
   action bar match Setup.
2. `Cast` is active; Back navigates to Setup and Continue navigates to Story
   Plan only after validation.
3. Role readiness is the first page decision surface.
4. Role count comes only from `storyRoleSlots.length`, maximum four.
5. Required and optional roles are visibly distinct.
6. Required unassigned roles disable Continue and name the blocker.
7. Optional unassigned roles never block Continue.
8. Add Character targets the next required unassigned role and never creates an
   unplanned role.
9. Assignment writes use stable `storyRoleSlotId`.
10. The selected Character header identifies the pinned identity authority and
    states that project direction does not edit the reusable profile.
11. Direction, Wardrobe, and Continuity are separate tabs.
12. Simple/Advanced switching preserves all data.
13. Dossier fields autosave with visible text state and retain values on error.
14. Only eligible approved Character versions can satisfy role readiness.
15. Approved and draft Looks cannot be confused visually or semantically.
16. Saving an uploaded Look creates a free private source draft and does not
    generate, approve, publish, or charge.
17. AI wardrobe suggestion analyzes the canonical Project and Cast context
    through a versioned global Prompt Recipe, returns an editable structured
    proposal, and shows no fabricated Credit amount.
18. Character chooser preserves filters and selection across server pagination.
19. Dialog persistence completes before closing; failure retains context.
20. Removed/replaced Setup roles trigger impact review rather than silent
    orphaning.
21. Desktop, tablet, and 390px mobile render without horizontal overflow.
22. Interactive state is understandable without color and supports keyboard
    operation.
23. Scene-level Look controls are honestly disabled until Scenes exist.
24. No prototype-only `UX preview`, `Presentation checkpoint`, fixed 4-Credit
    dock, or false production status remains.
25. The Project Cast panel shows Character Assignment count separately from
    Setup Role Slot count, including legacy Projects with zero planned roles.
26. Cast presentation uses the current authorized Character Profile featured
    image while Generation retains the pinned canonical face/version authority.
27. An owner can remove an unused Project Cast Assignment after confirmation;
    this does not delete the reusable Character Profile or its Setup Role Slot.
28. Removal is blocked without a cascade when a Scene, Shot, or bound wardrobe
    reference still depends on the Cast Assignment.
29. Upload Wardrobe and AI Suggestion open the same Character Look dialog with
    the appropriate mode selected.
30. Full Look requires one image; Separate Pieces requires upper and lower
    images and accepts optional outerwear, footwear and accessory images.
31. Changes to Character Look authoring preserve every unrelated Cast, Setup,
    navigation, Stage action, Project Cost and responsive behavior, with
    regression coverage for the preserved contracts.
32. A complete uploaded Character Look Sheet uses one durable source Asset and
    one validated crop manifest; it does not require three duplicate uploads.
33. A user-uploaded complete Sheet can be reviewed and approved without a
    Generation Job or Credit charge.
34. Existing three-Asset approved Look Versions remain selectable and bindable.
35. The complete multi-view sheet is not sent as the default Video reference;
    approved Scene media remains the Video first-frame authority.

---

## 18. Mockup fixture

Use the following deterministic content for design and QA:

- Project: `Cinematic E05 — Before the Last Train`;
- stage: Cast active;
- planning source: AI recommendation;
- roles: 2 required;
- Lead: assigned to `เหมยลี่` / Alice, identity ready;
- Second Character: unassigned, required;
- selected role: Lead;
- control level: Simple;
- active tab: Direction;
- primary Look: `Evening arrival`;
- Look state: approved and continuity-ready;
- objective, traits, and performance direction use the fixture in section 6;
- Continue disabled because Second Character is unassigned;
- no Credit amount displayed.

---

## 19. Design references

- [W3C WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C WCAG 2.2 — Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [GOV.UK Design System — Task list](https://design-system.service.gov.uk/components/task-list/)
- [GOV.UK Design System — Tag](https://design-system.service.gov.uk/components/tag/)
- [Material Design 3 — Dialog guidelines](https://m3.material.io/components/dialogs/guidelines)
- [Material Design 3 — Layout breakpoints](https://m3.material.io/foundations/layout/breakpoints)

---

## 20. Implementation record — 2026-08-29

### 20.1 Delivered deterministic checkpoint

- Reconciled the redesign with the current Cinematic Project, Cast Assignment,
  Character Profile, and Character Look contracts; no parallel repository or
  API entry point was introduced.
- Added Setup-derived Role readiness, stable `storyRoleSlotId` assignment,
  required-role validation, and next-unfilled-role targeting.
- Added the responsive Project Cast master list and selected Character detail
  area with Direction, Wardrobe, and Continuity tabs.
- Added debounced project-only dossier autosave state while preserving the
  existing Cast mutation and error-retention path.
- Kept Character Look authoring in the existing Character Profile dialog and
  project binding in the existing Cinematic wardrobe mutation.
- Removed the Cast-stage prototype badge, presentation-checkpoint copy, fixed
  Credit operation dock, and false ready state for missing Looks.
- Identity readiness now comes from the server-authorized identity snapshot.
  An assigned but unprepared Character increments role-assignment progress,
  remains labelled `Identity preparation required`, and cannot pass the
  separate Continue-readiness gate.
- Added English and Thai strings and theme-token styling for the new states.
- Corrected long Project-title wrapping on mobile without changing the shared
  sidebar or other Cinematic stages.
- Added separate `Characters in project` and `Planned roles` counts so legacy
  Projects no longer imply that assigned Characters came from Setup roles.
- Changed Cast thumbnails and the selected dossier portrait to the current
  authorized Character Profile featured-image endpoint. The pinned canonical
  face and Character Profile version remain unchanged for generation.
- Added confirmed removal of an unused Project Cast Assignment through the
  existing Cinematic application service. Removal leaves the reusable
  Character Profile and Setup Role Slot intact, and is rejected when Story
  Plan, Shot, or wardrobe references still depend on the assignment.

### 20.2 Validation evidence

- Focused Cast and Character picker regression: 26 tests passed.
- Cinematic application service contract suite: 18 tests passed.
- Full React Cinematic feature suite: 53 tests passed across 9 files.
- `npm run typecheck:web`: passed.
- `npm run build:web`: passed.
- Playwright visual inspection used Alice's existing Cast Project at 390px,
  820px, and 1440px. All three widths had equal document/client width and no
  horizontal overflow after the mobile-title correction. The current featured
  images resolved at every width, the separate counts read `2 Characters` and
  `0 planned roles` for the legacy Project, and the destructive confirmation
  was inspected without mutating runtime Project data.

### 20.3 Intentionally still gated

- AI wardrobe generation and any associated estimate or Credit settlement;
- paid three-view Character Look preparation;
- Character Look approval/publication;
- Scene-level Look assignment before Story Plan creates Scenes;
- analytics event delivery listed in section 16.

These gates remain requirement work, not hidden or simulated production
features. The deterministic Cast and source-draft checkpoint may be tested now.
