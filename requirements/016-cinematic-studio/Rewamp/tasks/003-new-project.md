# 003 - New Project And Brief

Screen: UX02. Status: Verified locally; awaiting page review. Parent tasks: T02.6,
T03.1 (entry/draft scope).
Sources: [003 authoring](../003-story-authoring-and-revisions.md),
[010 UX02](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic draft UI and canonical create/text commands; UX/QA review.
Depends on RW00.02-RW00.03 and UX01 navigation. Story destination can initially use
an isolated fixture; live Prepare Story requires the existing text operation contract.

2026-09-21 feedback: earlier verification covers the original brief composer, not
the missing Season/Chapter count controls. Their behavior is now specified in
[011 section 10](../011-story-chapters-and-shared-characters.md#10-setup-targets-and-feedback-acceptance-2026-09-21)
and implemented under [012 SC-F01/F05](012-story-chapter-character-integration.md).
Add optional Seasons and planned Chapter counts to both New Project and saved Brief,
persist/reopen them, and pass the complete target plan to Full Story/Chapter AI.
Saving these settings does not populate generated Chapters. This follow-up is Planned.

## Scope And Ownership

Replace setup presentation with one broad brief composer. Reuse
`CinematicSetupForm` field/default logic, `StoryIntentChoices`, actor-scoped draft
storage and existing create/enhance commands where appropriate. New presentation
belongs under `web/src/features/cinematic/components/`; do not clone the full form.
Optional settings use current server authoring JSON and locale keys. No image
creation or Look selection is a condition of saving the new Project.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW02.01 | Build title/brief composer, Movie/Mini Series, ordered multi-genre/orientation and optional settings disclosure. | One mode; Mini Series default; 1-3 ordered Genres with the first as Primary; configured per-Chapter duration up to 120 seconds; no setup field wall | Verified locally |
| RW02.02 | Wire draft typing, autosave/recovery and Create draft command. | Manual create makes no AI request; failed/offline save retains text; duplicate create prevented | Verified locally |
| RW02.03 | Connect explicit Prepare Story and persist its operation/context before leaving the page. | Optional empty brief accepted; existing estimate behavior; no implicit restart on reload | Verified with mocked text operation; live provider UAT pending |
| RW02.04 | Reopen every owned Project at its Project Brief and restore the same composer/settings used by New Project. | Stable IDs and actor isolation; grouped legacy Chapter records resolve to the root Project Brief; opening a Project never skips the Brief because of its last production stage | Verified locally |
| RW02.05 | Verify manual and AI-entry states and apply page feedback. | R01-R03/R08, Thai/English and three widths; keyboard/settings focus return | Verified locally; awaiting user page review |

## First Review And Closure

First usable slice is RW02.01-RW02.02: type a brief, save, reopen and continue manually.
AI behavior is a second local slice, not required to approve composer readability.
Planned group: `rewamp-new-project`; applicable `rewamp-config`/`rewamp-story` tests
are extended only where draft/operation contracts change. Mock AI; check a pending
operation and interruption without creating a paid Job. S01/S06 and R02/R03 own
behavioral acceptance.

## Feedback And Evidence

### 2026-09-20 - UX02 first reviewable implementation

- Primary role: UX/UI Product Designer. Product UX review was applied sequentially;
  this is not independent multi-agent sign-off.
- `/create/cinematic/new` now opens a writer-first brief composer with title, story
  idea, Movie/Mini Series, genre, orientation and a compact optional Settings area.
  The old setup field wall is not rendered for new Projects.
- Create draft is a manual command and accepts an empty story. Mini Series creation
  atomically creates the Production Project, Season 1 and Chapter 1; Movie storage
  retains the existing standalone shape.
- Prepare story remains an explicit preview/apply operation. On Apply, its bounded
  `enhancementId`, provider/model/response provenance and qualification billing
  state are stored on the initial Story Source, not mixed into editable setup data.
- Country style, story period and audience intent come from server-owned JSON.
  Country and period guidance reach Story enhancement and Story Plan prompts.
- Actor-scoped local recovery remains active while offline; generation actions are
  disabled without discarding typed work. Protected Engine, Render and Queue UI was
  not changed.
- Focused validation: `node scripts/test-cinematic-video.js rewamp-new-project`
  passed 21 backend and 6 UI/schema tests. TypeScript and i18n validation passed.
- Visual verification passed in Thai and English at 390, 820 and 1440 pixels with
  no horizontal overflow. The run made no provider request and no paid generation.
- Remaining page gate: user review of the first screen. Live text-provider UAT and
  the UX03 Story destination remain separate follow-up work. Parent T03.1 dossier
  behavior is tracked in packet 005.

### 2026-09-20 - Genre and Chapter-duration adjustment

- New Projects default to Mini Series while Movie remains available. Existing saved
  drafts retain their selected format.
- Genre becomes an ordered multi-choice with one required selection and a configured
  maximum of three. Position 1 is the Primary Genre supplied to legacy scalar callers;
  all selected Genres remain available to Story enhancement and planning.
- Target duration is explicitly per Chapter and is configuration-owned. Supported
  creation values are 20, 30, 45, 60, 90 and 120 seconds; 120 seconds is the maximum.
- Preserve manual Draft, Prepare Story, actor recovery, format/orientation and
  protected Generation/Render behavior. Verify this adjustment through the existing
  `rewamp-new-project` group and the same Thai/English viewport matrix.
- Implemented and verified: focused validation passed 21 backend and 16 UI/schema
  tests, including the existing Setup form regression. TypeScript and i18n validation
  passed. Visual verification passed in Thai and English at 390, 820 and 1440 pixels
  with no horizontal overflow and no provider request.

### 2026-09-20 - Composer polish and single-mode cleanup

- Give the Story idea writing surface a restrained theme-token glow at rest and
  slightly stronger feedback on hover/focus
  so it reads as the primary imaginative workspace without changing its dimensions.
- Remove the duplicate divider below the ordered Genre control.
- Remove every visible Simple/Advanced Control level selector from Cinematic
  authoring. Retain the persisted compatibility field temporarily so existing
  Projects and provider contracts remain readable during the staged Rewamp.
- Implemented and verified: both obsolete selector components were removed after
  their consumers were disconnected. `rewamp-new-project` passed 22 backend and
  16 UI/schema tests; TypeScript and i18n validation passed. Thai/English visual
  checks passed at 390, 820 and 1440 pixels with no horizontal overflow.

### 2026-09-20 - Collapsible section hierarchy

- Replace the stacked divider treatment around Project essentials and Story settings
  with two consistent bordered sections using the established 8px maximum radius.
- Both sections can expand/collapse from a keyboard-accessible native summary. Project
  essentials opens initially so Format, Orientation and Genres remain on the shortest
  path; Story settings remains collapsed initially.
- Keep a concise live selection summary visible while each section is collapsed.
  Collapsing is presentational only and must not clear or rewrite draft values.
- Remove redundant section/action divider lines while preserving focus visibility,
  autosave, AI consent and responsive behavior.
- Implemented and verified: `rewamp-new-project` passed 22 backend and 17 UI/schema
  tests. TypeScript and targeted ESLint checks passed. Thai/English visual checks
  passed at 390, 820 and 1440 pixels, including collapse/expand behavior, rounded
  borders and no horizontal overflow. No provider request or paid generation ran.

### 2026-09-20 - Corrected Project entry contract

- New Project and an existing Project's default Main view are one Project Brief
  experience. Existing Projects reuse the same composer, configured choices,
  autosave/recovery and responsive layout instead of opening Chapter authoring.
- Creating a draft returns to the saved Project Brief. Selecting a Project from the
  library also opens Project Brief, regardless of its last Production/Final stage;
  those destinations remain available through explicit workspace navigation.
- The existing Project variant replaces create-only commands with explicit Save and
  Continue to Full Story. It must not generate Full Story or Chapters on page entry.
- `setup.storyBrief` remains the concise Project synopsis. It must not be overwritten
  with Full Story prose or generated Chapter prose.
- Focused verification only: composer edit-state component/route assertions and the
  affected Project-library destination. Do not run unrelated media or aggregate suites.
- A grouped Mini Series library row represents the whole Project, not the most recently
  edited compatibility Chapter. Its Brief entry targets the root/first Project record.
  Direct legacy child URLs at `/setup` or `/cast` redirect to that root owner so the
  whole-story Brief and Full Story cannot appear empty merely because a child record
  was created by the superseded Chapter-first flow. This is a non-destructive read/
  navigation repair; never copy empty child text over the root source of truth.
- Implemented against the existing compatibility data without mutation. Project
  library records expose the first/root production unit as `projectId` while retaining
  the latest production unit only inside resume metadata. Direct child `/setup` and
  `/cast` routes resolve to `chapterOrigin.projectId`.
- Focused evidence: 5 repository tests and 21 Project Library/navigation tests passed.
  The exact legacy child `cineproj_1789898986375_68ud7may` was checked in Thai and
  English at 390 and 1440 pixels; it redirected to
  `cineproj_1789887754253_6diarucv` and the Brief textarea matched the stored original
  text. No Project data, provider operation or Credit state was mutated.
