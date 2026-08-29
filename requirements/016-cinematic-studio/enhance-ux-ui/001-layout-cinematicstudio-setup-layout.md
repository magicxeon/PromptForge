# Momelo Cinematic Studio — Setup Layout Redesign Specification

> Status: Approved UX/UI requirement for incremental implementation  
> Scope: `Cinematic Studio > Setup` layout plus the Cinematic-only workspace header and global footer policy  
> Source of truth: current implementation contract described in the attached Setup Layout Inventory  
> Principle: improve comprehension and hierarchy without moving Cast, Story Plan, media-provider, or generation responsibilities into Setup

---

## 1. Design outcome

Redesign Setup so a non-filmmaker can prepare a short-film project in one understandable flow:

1. Define where and how long the film will be published.
2. Write the story source that Story Plan will use.
3. Define creative intent without writing technical prompts.
4. Define story roles without selecting actual Character Profiles.
5. Review readiness, save safely, and continue to Cast.

The redesign must preserve every existing field, canonical ID, validation rule, persistence behavior, and downstream dependency.

Setup is **not** a Story Beats editor. It prepares the source and intent; `Story Plan` remains responsible for premise expansion, scenes, beats, and timing.

---

## 2. Required stage ownership

| Stage | Owns | Must not be added to Setup |
|---|---|---|
| Setup | Project facts, Story Brief, Creative Direction, Creative Intent, role slots, authoring mode | Actual Character selection, outfit, performance dossier |
| Cast | Character Profile assignment to `storyRoleSlotId`, outfit, relationship/performance details | Scene sequencing |
| Story Plan | Story source version, premise, conflict, emotional arc, scenes, beats | Image/video provider selection |
| Storyboard | Shot planning, composition, visual continuity, preview frames | Final rendering |
| Produce | Image/video generation, retries, versions, media credits | Source-story authoring |
| Finish | Assembly, audio, subtitle, export | Cast definition |

The stage navigation labels remain exactly:

```text
1 Setup → 2 Cast → 3 Story Plan → 4 Storyboard → 5 Produce → 6 Finish
```

Do not rename `Story Plan` to `Story Beats` in this redesign.

---

## 3. Key problems to correct

| Current problem | Effect | Redesign response |
|---|---|---|
| All subjects appear as one long form | Users cannot see which information matters most | Establish three visual zones: Story Source, Intent, Role Plan |
| Story Brief and Creative Direction have similar visual weight | The primary Story Plan source is not obvious | Make Story Brief the largest control; treat Creative Direction as supporting input |
| Project Cost Summary interrupts Setup content | Planning and media billing feel mixed together | Move cross-stage cost access to the workspace header/drawer |
| Role slots resemble admin rows | Users may think they are selecting actual characters | Present them as story-role cards with explicit “Character selected in Cast” copy |
| Enhance Story can look like a required primary action | Users may think AI enhancement is needed before Cast | Keep it secondary, enabled only after Story Brief has content |
| Simple/Advanced appears at the end of the form | The setting looks like an afterthought | Put Authoring Mode in the page-level control area and explain that it continues to later stages |
| Footer was hidden on creation routes | Theme, language, status, legal, and global navigation controls disappear | Preserve the shared `AppFooter` after Cinematic workspace content |

---

## 4. Recommended desktop layout

### 4.1 Workspace shell

- Retain the Momelo dark theme, left global navigation, top application header, and cyan–violet–pink brand accent.
- Preserve the existing global sidebar exactly as the user configured it. Do not force collapse, expand, replace it with an icon rail, or change its persisted preference when entering or leaving Cinematic Studio.
- Preserve the existing mobile sidebar drawer and navigation behavior.
- Hide the global `Create` button while already inside a creation workflow.
- Preserve the shared App Shell footer on all Cinematic Studio routes. Do not create a Cinematic-specific duplicate.
- Use one document scroll. Do not introduce a nested scroll container around the entire Setup form.
- Maximum workspace width: `1440px`.
- Page padding: `24px` desktop, `16px` tablet, `12–16px` mobile.

### 4.2 Screen hierarchy

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ MOMelo | Cinematic Studio / Project title | Saving/Saved | Cost | Account  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1 Setup ─── 2 Cast ─── 3 Story Plan ─── 4 Storyboard ─── 5 Produce ─── 6 Finish │
├─────────────────────────────────────────────────────────────────────────────┤
│ SETUP                                                                      │
│ Set the creative foundation                         Simple | Advanced      │
├─────────────────────────────────────────────────────────────────────────────┤
│ PROJECT FOUNDATION — Project name | Short Film | Platform | Duration       │
├───────────────────────────────────────────┬─────────────────────────────────┤
│ STORY SOURCE                              │ CREATIVE INTENT                 │
│ Story Brief (primary)                     │ Genre           Audience feeling│
│ counter                     Enhance Story │ Pacing          Ending intent   │
│ Creative Direction (supporting)           │ Intent summary                  │
├───────────────────────────────────────────┴─────────────────────────────────┤
│ STORY ROLE PLAN — mode selector + 1–4 role cards                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status/error notice                              Back | Continue to Cast    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Grid

```css
.setup-content {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
  grid-template-areas:
    "foundation foundation"
    "story intent"
    "roles roles";
  gap: 20px;
  align-items: start;
}
```

Recommended visual proportions at `1440px` content width:

- Story Source: approximately `62%`.
- Creative Intent: approximately `38%`.
- Project Foundation and Story Role Plan: full width.

This keeps Story Brief dominant without relegating Creative Intent to a distant lower section.

---

## 5. Workspace header

### 5.1 Content

Left to right:

1. Product eyebrow: `Cinematic Studio`.
2. Project title derived from Project name or `Untitled`.
3. Save state next to the title.
4. Cross-stage `Project cost` button or credit icon.
5. Account controls.

### 5.2 Save states

| State | UI copy | Semantic behavior |
|---|---|---|
| Idle | No persistent text or `Not saved yet` for a new draft | Do not announce repeatedly |
| Saving | `Saving…` + spinner | `aria-live="polite"` |
| Saved | `Saved just now` or `Saved 10:42` | Check icon plus text |
| Offline | `Offline — changes stored on this device` | Cloud-off icon plus text |
| Failed | `Save failed — Retry` | Button and `role="status"`; do not silently return to Idle |

Save state must never rely on animation or color alone.

### 5.3 Project cost access

- Remove the wide Project Cost Summary from the middle of Setup.
- Show a compact cross-stage button in the workspace header: `Project cost`.
- Clicking opens the existing ledger in a right drawer.
- If there is no media operation, show `No media cost yet` in the drawer.
- Enhance Story currently returns `qualification_no_charge`; show this inside Enhance Story, not as a fictional credit number.

---

## 6. Stage navigation

Use a single horizontal stage bar under the workspace header.

States:

- Current: numbered filled circle, strong label, cyan underline, `aria-current="step"`.
- Complete: checkmark with label, navigable when allowed.
- Available: numbered outline circle and muted label.
- Locked: lock icon and explanation tooltip.
- Attention: warning icon plus accessible text.

`Enhance Story` must remain a command inside Setup and must never appear as a stage.

Below `900px`, replace the six full labels with:

```text
Step 1 of 6 · Setup                    View stages
```

---

## 7. Setup page header

Left:

- Eyebrow: `PROJECT SETUP`.
- Heading: `Set the creative foundation`.
- Supporting copy: `Define the story source, creative intent, and roles before choosing your cast.`

Right:

- Authoring Mode segmented control: `Simple | Advanced`.
- Helper tooltip: `This control level continues into Cast and later stages.`

Do not hide Setup fields when the user switches mode in the current release. Persist `mode` and allow later stages to change their level of control. Switching mode must never clear values.

---

## 8. Project Foundation card

### 8.1 Layout

Use one compact full-width card. Desktop field widths:

```text
Project name 44% | Format 16% | Platform 22% | Duration 18%
```

Tablet: Project name full row; remaining facts in three columns or two columns when labels compress.  
Mobile: one column.

### 8.2 Controls and contract

| Attribute | UI | Requirement |
|---|---|---|
| Project name | Text input | Required; maximum 120; blank and whitespace-only block Continue |
| Format | Read-only fact with film icon: `Short Film` | Submit canonical value `short-film`; do not render a disabled-looking low-contrast select |
| Platform | Select | TikTok, YouTube Shorts, Reels, Multi-platform |
| Target duration | Select | 20, 30, 45, 60 seconds only |

Canonical IDs remain:

```text
platform: tiktok | youtube-shorts | reels | multi-platform
durationSeconds: 20 | 30 | 45 | 60
format: short-film
```

Recommended project-name behavior for this release:

- Keep manual Project name required to preserve the existing contract.
- Optionally provide a small `Suggest title` command only after Story Brief contains text.
- Suggestions must not replace text without confirmation.

---

## 9. Story Source card — primary visual area

### 9.1 Header

```text
STORY SOURCE
What happens in this short film?
This becomes the source used to build Story Plan.
```

Place the Enhance command in this header, aligned with Story Brief rather than with the whole page.

### 9.2 Story Brief

- Label: `Story Brief`.
- Required marker and helper text: `Describe the beginning, change or conflict, and ending direction.`
- Textarea: 5 visible rows desktop, minimum height `148px`, resizable vertically.
- Live counter: `333 / 600`.
- Counter belongs at the bottom-right of the field group, not floating above unrelated content.
- Empty placeholder:

```text
Example: A woman waiting for the last train receives a message that forces her
to choose between leaving the city and confronting someone from her past.
```

The placeholder is an example only; the visible label remains permanent.

### 9.3 Enhance Story command

- Button label: `Enhance Story`.
- Secondary outline style with a small sparkle icon.
- Disabled while Story Brief is empty or whitespace-only.
- When disabled, helper tooltip: `Add a Story Brief first.`
- When ready, supporting text: `Compare an AI-refined version before applying.`
- It must never visually compete with `Continue to Cast`.

### 9.4 Creative Direction

- Label: `Creative Direction` with `Optional` badge.
- Helper: `Add visual language, dialogue constraints, or storytelling rules the system should preserve.`
- Textarea: 4 visible rows; maximum 800.
- Live counter at the bottom-right.
- Include expandable `What belongs here?` examples:
  - restrained dialogue
  - photorealistic vertical drama
  - avoid flashback
  - cool platform light changing to a warm ending

Do not put Character Profile, outfit, image/video provider, model, or seed controls here.

---

## 10. Creative Intent card

### 10.1 Purpose

Creative Intent should help users direct Enhance Story and Story Plan without having to write prompt terminology.

Header:

```text
CREATIVE INTENT
How should the story feel?
```

### 10.2 Layout

Desktop: a two-by-two field grid.  
Tablet/mobile: one column if any label or selected value becomes compressed.

| Attribute | Default | Options / canonical ID |
|---|---|---|
| Genre | Drama | Drama `drama`, Romance `romance`, Comedy `comedy`, Thriller `thriller`, Fashion `fashion` |
| Audience feeling | Moved | Moved `moved`, Excited `excited`, Curious `curious`, Uplifted `uplifted`, Surprised `surprised` |
| Pacing | Balanced | Slow `slow`, Balanced `balanced`, Fast `fast` |
| Ending intent | Resolved | Resolved `resolved`, Hopeful `hopeful`, Twist `twist`, Cliffhanger `cliffhanger` |

Use selects for the current contract. Do not turn these into multi-select chips because each field accepts exactly one canonical value.

### 10.3 Plain-language intent summary

Below the controls, show a quiet summary card that updates immediately:

```text
Drama · balanced pacing · designed to leave viewers moved · resolved ending
```

This summary is explanatory only and does not add a new field.

### 10.4 Advanced-mode details

Current Simple and Advanced modes expose the same Setup attributes. Do not invent new required inputs. In Advanced mode only:

- keep the same fields and values;
- show canonical effect helper copy, such as `Used by Enhance Story and Story Plan`;
- expose no provider or generation settings.

---

## 11. Story Role Plan

### 11.1 Purpose and copy

Header:

```text
STORY ROLE PLAN
Which roles exist in the story?
Define roles here. Choose the actual Momelo Characters in Cast.
```

This wording must remain visible so role slots are not mistaken for Character selection.

### 11.2 Planning mode control

Label: `How should roles be planned?`

Options:

| Label | ID | Behavior |
|---|---|---|
| AI recommends roles | `ai-recommended` | Starts with no slots; Analyze Story Roles proposes the smallest visible cast of 1–4 slots and blocks Continue until explicitly applied |
| One character | `solo` | Creates one Required slot named Lead |
| Two characters | `duo` | Creates Required Lead and Second Character slots |
| Define manually | `manual` | Starts with one Required Lead, exposes a 1–4 Character count, preserves existing slots while resizing, and permits add/remove/edit |

Prefer a select or four compact radio cards. Do not use character avatars because Character Profiles have not been selected.

### 11.3 Role-card presentation

Render each role as a readable card, not a full-width admin table row.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ROLE 01          Lead                              [Required ▼]     │
│ Character selected in Cast                                         │
│ Details ▾   Story function · Relationship hint      Remove (manual)│
└─────────────────────────────────────────────────────────────────────┘
```

Desktop:

- Up to two role cards per row when card width remains at least `420px`.
- Use one column when there is only one slot or the viewport is narrow.

Mobile: always one column.

### 11.4 Role fields

| Field | Editing behavior |
|---|---|
| Role slot ID | Hidden; stable; never editable or displayed as an identifier |
| Role name | Editable; maximum 80; blank blocks Continue |
| Importance | Required/Optional select; always visible with text and icon |
| Story function | Required editable field in Manual; show inside `Details` and read-only when AI supplied |
| Relationship hint | Show inside `Details`; read-only when AI supplied in this release |
| Objective | AI recommendation seeds the Cast dossier; visible inside `Details` |
| Emotional arc | AI recommendation seeds the Cast emotional baseline; visible inside `Details` |
| Personality traits | Up to six playable traits; AI recommendation seeds the Cast dossier |
| Performance direction | Restrained, playable direction; AI recommendation seeds the Cast dossier |
| Character count | Manual mode only; compact 1–4 control; resizing preserves existing slots in order |
| Add role | Manual mode only; disabled at four slots with explanation |
| Remove role | Manual mode only; confirmation only if already bound in Cast |

Recommendation: keep `storyFunction` and `relationshipHint` visible through progressive disclosure, but do not introduce editable controls until server validation and Cast ownership are explicitly defined.

### 11.5 Empty states

AI-recommended before Enhance:

```text
No roles recommended yet.
Enhance the Story Brief to receive role suggestions, or choose another planning mode.
```

Manual mode:

```text
No story roles yet. Add the first role to continue.
[+ Add role]
```

Every planning mode requires at least one named role and at least one Required role before Continue. AI recommendation with zero slots blocks Continue and exposes `Analyze Story Roles`. Manual role names that are blank also block.

### 11.6 AI role-analysis rules

- Reuse the canonical Story Enhancement operation; do not create a parallel role-analysis endpoint.
- Recommend only visibly present people who require stable Character identity.
- Do not create Cast slots for an unreadable notification sender, an off-screen voice, a mentioned person, an implied memory, or background crowd unless that person visibly appears.
- Choose the smallest cast that can tell the supplied story, bounded to 1–4 roles.
- Applying role analysis updates only `castPlanningMode` and `storyRoleSlots`; it must not overwrite Story Brief or Creative Direction.
- Applying full Story Enhance may update Story Brief, Creative Direction, and Role Plan together after explicit review.
- Required roles block Cast progression until an approved Character is assigned. Optional roles may remain unassigned.

### 11.7 Text-analysis Credit gate

The current qualification runtime remains `qualification_no_charge`; the UI must not invent a Credit amount. Before enabling customer-paid role analysis:

1. Credits owns a server quote for the exact provider/model and text-analysis operation.
2. The estimate is low, configuration-driven, immutable at consent, and never hard-coded in React.
3. Story, Creative Direction, Setup intent, and analysis version form the request fingerprint.
4. A fingerprint cache hit reuses the prior result without duplicate charge.
5. Submission is idempotent; provider failure refunds the reservation through the canonical Credit workflow.
6. The dialog shows estimate, cache/no-charge status, progress, success, and actionable failure before paid release.

### 11.8 Revisiting Setup after Cast

When Apply or a mode change would replace/remove role slots that already have Character assignments:

1. Do not mutate immediately.
2. Open `Review role changes` dialog.
3. Show Existing role → Proposed role → Assigned Character impact.
4. Allow Keep existing role, Replace and unassign, or Cancel.
5. Preserve stable IDs for unchanged roles.
6. Never silently delete a Character Profile; only remove the project binding.

---

## 12. Enhance Story dialog redesign

### 12.1 Dialog size and structure

Desktop: modal width `min(1120px, calc(100vw - 48px))`, maximum height `calc(100dvh - 48px)`.  
Mobile: full-screen dialog.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Enhance Story Brief                                      Close      │
│ AI assistance · Qualification · No charge                           │
├───────────────────────────────┬──────────────────────────────────────┤
│ ORIGINAL                      │ ENHANCED PREVIEW                     │
│ Read-only Story Brief         │ Editable Enhanced Story Brief       │
│                               │ 333/600                              │
├───────────────────────────────┴──────────────────────────────────────┤
│ STORY INSIGHTS: Premise | Conflict | Emotional arc | Ending          │
│ RECOMMENDED ROLES: 1–4 role cards                                   │
│ Candidate scenes (preview only) ▾   Warnings ▾                       │
├──────────────────────────────────────────────────────────────────────┤
│ Changes: Brief + Creative Direction + Role Plan     Cancel | Apply  │
└──────────────────────────────────────────────────────────────────────┘
```

### 12.2 States

| State | Required UI |
|---|---|
| Initial | Original visible; Enhanced Preview empty; `Generate preview` enabled |
| Loading | Progress in preview panel; Generate disabled; original remains readable |
| Success | Enhanced Brief editable; Apply enabled; insights and roles visible |
| Error | Dialog remains open; inline `role="alert"`; `Try again` available |
| Applied | Apply all supported outputs atomically, close dialog, show `Story enhancement applied` status |
| Cancelled | Close without changing Setup |

### 12.3 Output presentation

Show these outputs:

- Enhanced Story Brief — editable before Apply.
- Premise — read-only insight.
- Central conflict — read-only insight.
- Emotional arc — read-only insight.
- Ending — read-only insight.
- Candidate scenes — collapsed, clearly labeled `Preview for Story Plan`; do not create Story Plan scenes from this dialog.
- Recommended roles — role name, Required/Optional, story function.
- Warnings — expandable alert list.
- Creative Direction — show proposed value/change summary even though Apply remains atomic.

Do not expose provider/model provenance as a primary user control. It may appear in a technical details disclosure if the product already supports provenance.

### 12.4 Apply behavior

Preserve the current atomic Apply contract:

- Enhanced Story Brief replaces Story Brief.
- Proposed Creative Direction is applied when present.
- Recommended role slots replace the current role plan.
- `castPlanningMode` becomes `ai-recommended`.
- Original Setup values remain unchanged until Apply.

Before Apply, display exactly what will change. If existing Cast bindings are affected, route through `Review role changes` instead of applying silently.

---

## 13. Bottom action area

Use an inline action section at the end of Setup content. It must remain in the
normal document flow and must not float or stick over fields. The cross-stage
Project Cost Summary remains the only sticky bottom summary in the workspace.

Left:

- Validation/save notice when needed.
- Example: `Project name and Story Brief are required.`

Right:

- Secondary `Back` only when navigation history requires it.
- Primary `Continue to Cast`.

Behavior:

- Continue is enabled only when Project name and Story Brief are non-blank and project creation is not in progress, matching the current contract.
- When disabled, show nearby text explaining why; never rely on disabled styling alone.
- On click, run all blocking validation, focus the first invalid field, and show a validation summary when multiple errors exist.
- Add bottom content padding equal to the action bar height.

The action bar must not contain Simple/Advanced; that control belongs in the Setup page header.

---

## 14. Validation and error handling

### 14.1 Blocking rules

| Field | Rule | Suggested message |
|---|---|---|
| Project name | Required; ≤120 | `Enter a project name of 120 characters or fewer.` |
| Story Brief | Required; ≤600 | `Enter a Story Brief of 600 characters or fewer.` |
| Creative Direction | ≤800 | `Creative Direction must be 800 characters or fewer.` |
| Duration | 20, 30, 45, or 60 only | `Choose an available target duration.` |
| Role slots | Maximum 4 | `A short film can contain up to 4 story roles.` |
| Role name | Non-blank when a slot exists | `Enter a name for this story role.` |

### 14.2 Non-blocking states

- Story has not been enhanced.
- AI recommendation contains no slots.
- Creative Direction is empty.
- Optional role has no Character assignment.

Do not present non-blocking conditions as red errors.

### 14.3 Save failure

Show status notice:

```text
The Cinematic Project could not be saved
<API error message safe for the user>
[Retry]
```

Preserve all local inputs. Do not navigate to Cast after a failed new-project creation.

---

## 15. State and persistence requirements

Persist the existing schema version 3 values:

```text
clientDraftId, projectName, format, platform, durationSeconds,
storyBrief, creativeDirection, genre, audienceFeeling, pacing,
endingIntent, mode, castPlanningMode, storyRoleSlots,
activeStage, updatedAt
```

Rules:

- New drafts remain actor-scoped in local storage.
- Existing projects autosave approximately 600ms after editing stops.
- Switching actor must never expose another actor’s draft.
- Switching Simple/Advanced must preserve all values.
- Stable `storyRoleSlotId` values must survive editing and reorder.
- Saving Story Brief/Creative Direction must preserve the immutable Story Source Version behavior.
- When a saved story source changes and Story Plan already exists, show a non-blocking stale-plan warning and require regeneration/reconciliation in Story Plan; do not silently rewrite it from Setup.

---

## 16. Responsive behavior

### Desktop — `≥1200px`

- Full stage labels.
- Project Foundation in one row.
- Story Source and Creative Intent in `62/38` columns.
- Story Role cards use one or two columns depending on available width.
- Sticky bottom action bar.

### Tablet — `768–1199px`

- Condensed stage navigator.
- Project Foundation: Project name full width, remaining controls in two columns.
- Story Source and Creative Intent may remain two columns only if each is at least `360px`; otherwise stack.
- Creative Intent fields use two columns, then one column below `820px` if labels compress.
- Role cards one column.

### Mobile — `<768px`

- `Step 1 of 6 · Setup` control.
- Every field and role card one column.
- Simple/Advanced fills width below the page heading.
- Enhance Story dialog becomes full screen.
- Bottom action has a full-width Continue button and safe-area padding.
- No horizontal overflow at `320px` CSS width.
- Textareas remain fully visible above the sticky action bar when focused and the software keyboard is open.

---

## 17. Visual design system

Retain the existing Momelo neon identity but reduce noise.

### Hierarchy

- Use cyan for current stage, active focus, and selected structural control.
- Reserve cyan–violet–pink gradient for `Continue to Cast` and selected Authoring Mode only.
- Enhance Story uses outline/secondary treatment.
- Use neutral raised surfaces to separate subjects; avoid strong borders around every internal row.
- Do not use glow for counters, disabled format, save state, or role importance.

### Suggested tokens

```css
--studio-canvas: #070A12;
--studio-surface-1: #0D1422;
--studio-surface-2: #111B2C;
--studio-border: #26344D;
--studio-text: #F5F7FB;
--studio-text-secondary: #AAB6C8;
--studio-text-muted: #8290A6;
--studio-cyan: #20D7FF;
--studio-violet: #806BFF;
--studio-pink: #F035A7;
--studio-success: #45D79A;
--studio-warning: #F2B94B;
--studio-danger: #FF6B7C;
```

### Accessibility targets

- Normal text contrast: at least `4.5:1`.
- Large text contrast: at least `3:1`.
- UI component/focus contrast: at least `3:1` where applicable.
- Pointer target: never below WCAG 2.2’s `24×24 CSS px` minimum without a valid exception; target `40px+` control height for this product.
- Focus indicator: clearly visible, at least a `2px` perimeter-equivalent treatment.
- Support 200% zoom and text reflow.
- Do not use placeholder as the only label.
- Required/Optional, status, errors, and current stage must not rely on color alone.

---

## 18. Component map

Adapt names to the repository’s existing conventions and reuse current primitives.

```text
CinematicSetupPage
├─ CinematicWorkspaceHeader
│  ├─ ProjectIdentity
│  ├─ SaveStatus
│  └─ ProjectCostDrawerTrigger
├─ CinematicStageNavigation
├─ SetupPageHeader
│  └─ AuthoringModeControl
├─ SetupForm
│  ├─ ProjectFoundationCard
│  │  ├─ ProjectNameField
│  │  ├─ FormatFact
│  │  ├─ PlatformSelect
│  │  └─ DurationSelect
│  ├─ StorySourceCard
│  │  ├─ StoryBriefField
│  │  ├─ EnhanceStoryTrigger
│  │  └─ CreativeDirectionField
│  ├─ CreativeIntentCard
│  │  ├─ GenreSelect
│  │  ├─ AudienceFeelingSelect
│  │  ├─ PacingSelect
│  │  ├─ EndingIntentSelect
│  │  └─ IntentSummary
│  ├─ StoryRolePlanCard
│  │  ├─ CastPlanningModeControl
│  │  ├─ StoryRoleCard × 0..4
│  │  └─ AddRoleButton
│  ├─ SetupValidationSummary
│  └─ SetupActionBar
├─ EnhanceStoryDialog
├─ ReviewRoleChangesDialog
└─ ProjectCostDrawer
```

Do not create a new parallel form state if `CinematicStudioRoute.tsx` already owns the normalized Setup model. Extract presentation components while retaining one source of truth.

---

## 19. Codex implementation instructions

### Files to inspect first

```text
web/src/features/cinematic/routes/CinematicStudioRoute.tsx
web/src/features/cinematic/components/CinematicDialogs.tsx
web/src/features/cinematic/schemas/cinematicSchemas.ts
web/src/features/cinematic/state/cinematicDraftStorage.ts
server/domain/cinematic/CinematicApplicationService.js
server/domain/generation/CinematicStoryEnhancementService.js
server/providers/OpenAITextProvider.js
requirements/016-cinematic-studio/001-cinematic-studio-screen-and-interaction-flow.md
requirements/016-cinematic-studio/002-cinematic-project-story-shot-and-continuity-contract.md
requirements/016-cinematic-studio/003-cinematic-generation-credit-and-media-contract.md
```

### Implementation order

Implement and validate the following checkpoints in order. A later checkpoint
must not begin by replacing the state or component contracts established by an
earlier checkpoint.

#### Checkpoint 1 — Cinematic workspace header and footer

1. Preserve the existing sidebar state, width, navigation, persistence, and
   mobile drawer behavior without modification.
2. Add the Cinematic workspace header presentation using the existing project
   title and save state.
3. Move Project Cost access into the workspace header and reuse the existing
   cost read model in a drawer; do not create another ledger.
4. Hide only the global `Create` command while the active route is under
   `/create/cinematic`; preserve the shared `AppFooter` and its `app-footer`
   wrapper after the Cinematic workspace.
5. Add App Shell regression coverage proving non-Cinematic routes retain the
   Create command, footer, and current sidebar behavior.

#### Checkpoint 2 — Setup information hierarchy

1. Preserve the existing schema and event handlers; add layout wrappers first.
2. Move Authoring Mode into Setup header without changing its state ownership.
3. Convert Format into an accessible read-only fact while submitting `short-film`.
4. Build Project Foundation and the Story Source/Creative Intent desktop grid.
5. Replace role rows with reusable role cards while retaining stable IDs and
   `storyRoleSlotId` downstream linkage.
6. Keep Enhance Story atomic Apply behavior and its existing provider boundary.
7. Add an explicit Save draft command that flushes the canonical autosave path;
   it must not introduce a parallel persistence workflow.

#### Checkpoint 3 — Responsive, accessibility, and recovery

1. Add tablet/mobile breakpoints and sticky action spacing.
2. Add offline/save-failed states without weakening current autosave.
3. Verify keyboard order, focus visibility, 200% reflow, field error linkage,
   stage-navigation semantics, and screen-reader save announcements.
4. Run schema, route, dialog, draft-storage, Cast-binding, App Shell, and
   localization parity tests.

### Do not change

- Existing sidebar expansion state, preference key, navigation groups, desktop
  width, or mobile drawer behavior.
- Stage order or label `Story Plan`.
- Platform or duration option IDs.
- Single-value Creative Intent contracts.
- Required Project name and Story Brief validation.
- `storyRoleSlotId` linkage.
- Maximum four roles.
- Atomic Enhance Apply behavior unless requirements are updated first.
- `qualification_no_charge` behavior.
- Provider ownership boundaries.

---

## 20. Acceptance criteria

### Layout and comprehension

- At `1440×900`, Project Foundation, Story Brief, Creative Intent, and at least the Story Role Plan header are visible without the footer or Project Cost overlay covering workspace content.
- Story Brief is the strongest form control after the page heading.
- Creative Direction reads as optional supporting input.
- A first-time user can tell that role cards are story roles and actual Characters are selected in Cast.
- Enhance Story appears secondary to Continue.

### Contract preservation

- All Setup attributes serialize exactly as before.
- Simple/Advanced switching loses no values.
- Solo creates one Required Lead slot.
- Duo creates Required Lead and Second Character slots.
- Manual permits 1–4 role slots with stable IDs and a compact Character-count control.
- Every planning mode requires one named Required role before Continue.
- AI analysis recommends only visible Character roles and may return the smallest cast of one.
- AI role-only Apply preserves the user's Story Brief and Creative Direction.
- AI role dossier fields flow into the matching Cast Assignment when a Character is selected.
- AI Apply sets `ai-recommended` and replaces slots only after confirmation when existing Cast binding is affected.
- Continue remains blocked only by the established blocking validation and project-creation state.

### Enhance Story

- Original Story Brief is always visible during comparison.
- Generated preview never changes Setup before Apply.
- Enhanced Brief is editable and limited to 600 characters.
- Proposed Creative Direction, insights, roles, candidate-scene preview, and warnings are visible without implying they are all Story Plan records.
- Error leaves the dialog open and retains the original input.
- No fabricated credit number is displayed.

### Responsive and accessibility

- No horizontal overflow at `320px` width.
- All fields and role actions are keyboard accessible.
- Reflow remains usable at 200% zoom.
- Sticky action bar never covers a focused field.
- Errors are connected to controls using `aria-describedby` and `aria-invalid`.
- Save status is announced politely.
- Required/Optional and all state changes use text or icon plus text, not color alone.
- Entering or leaving Cinematic Studio never changes the persisted sidebar
  preference and never forces the sidebar into another state.

### Test states

Verify at minimum:

```text
new empty draft
valid unsaved draft
saving / saved
offline changes
save failed
AI-recommended with zero roles (Continue blocked)
AI role-only analysis with Story Brief preserved
AI one-person story that does not create an off-screen sender role
solo / duo / manual roles
four-role limit
Enhance initial / loading / success / error
revisit Setup after Cast assignment
Story Plan stale after Story Source edit
dark-theme keyboard focus
Thai and English maximum-length content
```

---

## 21. Mockup content fixture

Use the following fixture when creating visual mockups and UI tests:

```text
Project name: Before the Last Train
Format: Short Film
Platform: YouTube Shorts
Duration: 20 seconds

Story Brief:
In 20 seconds, a young woman waits alone on a nearly empty urban platform,
gripping a black phone as the clock nears the last train. A silent notification
arrives. She chooses neither the train nor the past: she pockets the phone,
exhales, and walks toward the warm station exit.

Creative Direction:
Photorealistic vertical drama with restrained performance and minimal dialogue.
Begin in cool blue-hour light and end in a warm pool of station light. Keep the
train on camera-left and avoid flashbacks.

Genre: Drama
Audience feeling: Moved
Pacing: Balanced
Ending intent: Hopeful
Authoring mode: Simple
Cast planning mode: AI recommends roles

Role 1: Lead · Required
```

---

## 22. References

- [W3C — Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C — How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [W3C — Understanding Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [GOV.UK Design System — Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [Material Design 3 — Progress indicators](https://m3.material.io/components/progress-indicators/overview)

---

## 23. Implementation record — 2026-08-29

Implementation followed the incremental checkpoints in Section 19. The global
sidebar remains the existing App Shell component and its expansion preference,
navigation groups, desktop behavior, and mobile drawer were not modified.

### Checkpoint 1 — Cinematic workspace header and footer boundary: complete

- Added `CinematicWorkspaceHeader` for the project title, save state, and the
  compact Project Cost trigger.
- Added an App Shell route policy that hides the global Create command while
  preserving the shared global footer inside Cinematic Studio.
- Kept the existing sidebar mounted and unchanged for every Cinematic route.
- Added the `/create/cinematic/new` browser deep-link to the canonical frontend
  route ownership configuration.

Evidence:

- `CinematicWorkspaceHeader.test.tsx`
- `AppShellRoutePolicy.test.ts`
- `frontendRouteOwnership.test.js`

### Checkpoint 2 — Setup information hierarchy and persistence: complete

- Replaced the old inline Setup composition with the reusable
  `CinematicSetupForm` while retaining the existing draft schema and API path.
- Grouped Project Foundation, Story Source, Creative Intent, and Story Role Plan
  according to the approved visual reference.
- Added an explicit Save draft command that flushes the canonical persistence
  path; autosave remains active.
- Added actor- and project-scoped Setup recovery storage for offline edits and
  resynchronization after connectivity returns.
- Kept Short Film as the current read-only format fact and preserved all option
  IDs, role-slot IDs, role limits, validation, and downstream Cast linkage.

Evidence:

- `CinematicSetupForm.test.tsx`
- `cinematicDraftStorage.test.ts`
- `CinematicUxPrototype.test.tsx`

### Checkpoint 3 — Responsive, accessibility, and regression gate: complete

- Desktop uses the two-column Story Source and Creative Intent hierarchy.
- Tablet stacks the main content while retaining the existing App Shell mobile
  navigation behavior and a compact Stage selector.
- Mobile uses one column, full-width actions, and a non-sticky final action bar
  so controls are not covered.
- Save states include saving, saved, offline, and failure icon-plus-text states.
- The Stage rail exposes one semantic stage list instead of rendering duplicate
  desktop and mobile lists.

### Checkpoint 4 — AI and manual role planning: complete

- Added explicit AI role analysis that reuses the canonical Story Enhancement
  operation and applies Role Slots without replacing Story Brief or Creative
  Direction.
- AI mode with no roles now blocks Continue instead of allowing an incomplete
  Cast contract.
- Restricted recommendations to visible people who need stable Character
  identity; off-screen senders, messages, voices, mentions, and crowds do not
  become roles unless visibly present.
- Added Manual Character count 1–4 while preserving stable existing Role Slots.
- Added objective, emotional arc, personality traits, and performance direction
  to the bounded Role Slot contract and seed them into the Cast dossier.
- Retained `qualification_no_charge`; production Credit quoting remains gated by
  Section 11.7 and no client Credit amount was fabricated.

Evidence:

- `CinematicSetupForm.test.tsx`
- `StoryEnhanceDialog.test.tsx`
- `CinematicUxPrototype.test.tsx`
- `openAITextProvider.test.js`
- `cinematicStoryEnhancementService.test.js`
- `cinematicApplicationService.test.js`

Visual verification:

- Desktop: `1440×900`
- Tablet: `820×1180`
- Mobile: `390×844`
- No unintended horizontal overflow or sidebar replacement was observed.

Automated validation:

```text
Targeted Cinematic/App Shell suite: 37 tests passed
Web TypeScript build: passed
Vite production build: passed
i18n catalog parity: passed
Frontend route ownership: passed
```

The approved implementation changes only the Cinematic workspace header,
preserves global-footer visibility within Cinematic routes, and changes
Cinematic Setup content.
Any future sidebar redesign requires a separate requirement and regression gate.
