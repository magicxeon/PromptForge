# 004 - Full Story, Revisions And Chapter Generation

Screen: UX03. Status: Corrected flow approved for implementation; the earlier
Chapter-first slice is superseded as the UX03 entry. Parent tasks: T03.2, T03.3,
T03.4, T03.5 (Full Story scope), T03.7.
Sources: [003 story](../003-story-authoring-and-revisions.md),
[010 UX03](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic Story authoring; Generation retains text execution. UX/QA review.
Depends on RW00.04 for live Chapter mutations and UX02 create/restore context.
Reading/editor layout can use fixtures; manual writing does not wait for final Looks.

## Scope And Ownership

Follow-up scope is owned by [011](../011-story-chapters-and-shared-characters.md)
and ordered in [packet 012](012-story-chapter-character-integration.md). Chapter
recovery, regeneration Preview/Apply, scoped AI Assist and Chapter revisions remain
Planned; earlier verification below applies only to the previous implementation.

Page components own one Project-level Full Story writer, scoped AI instruction,
proposal state, confirmation, History and the Generate Chapters transition. Chapter
navigation appears after explicit manual entry or Chapter creation; existing work
remains accessible even if the current Full Story is unconfirmed. Reuse Series APIs,
existing text-provider policy and text operation recovery. Versioned revisions are implemented behind
`CinematicApplicationService`, current Generation text services and the Cinematic
repository. Route/API/schema integration is serialized through packet 001.
Character dossier editing is packet 005; optional asset media is packet 006.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW03.01 | Build the Project-level Full Story editor after Project Brief. | One editable Full Story source; no Chapter list before generation; readable Thai wrapping | Verified |
| RW03.02 | Save manual/AI Full Story revisions with draft/conflict recovery. | Brief remains separate; configured ten prior revisions; user draft retained on stale save | Implemented awaiting conflict-recovery verification |
| RW03.03 | Add explicit AI Generate/Revise using the brief, current Full Story and a user instruction. | AI returns a preview/draft; no implicit apply or provider call on entry | Verified with mocked provider |
| RW03.04 | Implement configured Full Story revision rotation and explicit Preview/Restore. | Ten prior revisions by default; referenced production evidence retained; restore creates new head | Verified |
| RW03.05 | Confirm one active Full Story revision and reveal Generate Chapters. | Confirmation never requires Looks; later edits retain the confirmed baseline and mark it outdated | Verified |
| RW03.06 | Generate bounded Chapter proposals from the confirmed Full Story and apply them through the existing Series owner. | Chapter text is separate from Project Brief; no media deletion or duplicate generation on retry | Verified with mocked provider |
| RW03.07 | Connect actual text-operation progress and interrupted-work retry/resume. | Completed text stays visible; no AI call from re-entry; stopped tasks stop spinning | Planned |
| RW03.08 | Verify the corrected flow with focused checks only. | Brief route, Full Story revision/confirm and Chapter generation contracts; affected responsive states only | Verified |
| RW03.09 | Separate first-draft generation from later AI revision controls. | With no saved Full Story, hide Revision Instruction and generate directly from Project Brief; reveal instruction only after the first revision exists | Verified locally |
| RW03.10 | Add explicit Generate and Manual modes to Build Chapters. | Mutually exclusive segmented control; Generate uses confirmed Full Story AI and opens Chapter Writer after persistence succeeds; server-derived existing work changes the action to Continue Chapters; Manual makes no provider request and opens Chapter Writer immediately | Verified locally |
| RW03.11 | Replace the superseded Chapter-first editor with a Chapter Writer over `chapterTitle/chapterStory`. | Add/select/edit/save Chapters without changing Project Brief or Full Story; version and actor checks stay server-owned | Verified locally |
| RW03.12 | Clarify and serialize whole-story Chapter regeneration. | Label names all Chapters; helper explains the confirmed Full Story source and proposal review; one pending Chapter proposal prevents another AI request until Apply or Discard | Verified with focused checks |

## First Review And Closure

Deliver RW03.01-RW03.06 in order: reopen Project Brief, enter Full Story, save or
generate a revision, confirm it, then generate Chapters. Do not display the earlier
Chapter Writer as the default new-Project entry. Manual Chapter entry and Continue
are governed by 011. Do not hold this page
until Expressions or Shot rendering works.
Planned page group: `rewamp-story-ui`. Extend owning `rewamp-story` and
`rewamp-revisions` with actual scoped-apply, 10/11 boundary, pinned evidence and
conflict tests; existing group names alone do not prove those behaviors.
Visual checks include long Thai prose, mobile keyboard and one open assistant panel.

## Feedback And Evidence

### 2026-09-20 - First manual writer slice

- Enter UX03 immediately after New Project creation, replacing the old visible
  Control-level choice and setup-stage wall for this route.
- Provide an owned Chapter list, selected Chapter title/prose editor, explicit save,
  actor-scoped autosave/recovery feedback, Chapter switching and a read-only ordered
  Full Story view. The editable source remains the selected Chapter setup/story source.
- Permit an empty newly added Chapter and create it through the existing atomic Series
  workspace command. Movie remains a valid one-Chapter workspace.
- Reuse the current setup update command, Series workspace API, Query cache, Story
  enhancement preview and stable Project/Chapter IDs. Do not add a second repository,
  text operation or AI call on page entry.
- This slice does not claim Chapter reorder/archive, History rotation, Confirm Story,
  dossier editing or interrupted AI-operation completion. Those stay explicit in
  RW03.02-RW03.06 after the writer layout is reviewed.
- Implemented as `CinematicStoryWriter` on the compatibility `cast` route after
  Project creation. The component reads the bounded Series workspace, edits only the
  active Chapter source, saves before Chapter navigation and uses the existing atomic
  add-Chapter command with a blank story and copied Character bindings. No generated
  Scenes, attempts, timelines or Story Plans are inherited into the new Chapter.
- One-Chapter Movie and failed Series-load fallbacks keep the current Chapter editable.
  Production and Final navigation delegates to the existing stage transition owner;
  Render, Queue and Engine presentation was not changed.
- Focused validation: `node scripts/test-cinematic-video.js rewamp-story-ui` passed
  11 backend and 6 UI/schema tests. TypeScript no-emit and i18n validation passed.
  `node scripts/verify-cinematic-rewamp-story-writer.mjs` passed Thai/English Chapter
  and Full Story views at 390, 820 and 1440 pixels with no horizontal overflow.
  The visual run read an owned local Project and made no provider or paid request.

### 2026-09-20 - Story Setup section hierarchy

- Primary role: UX/UI Product Designer. Product UX review is applied sequentially;
  this is not independent multi-agent sign-off.
- Replace the divider-heavy outline with two keyboard-accessible, rounded disclosure
  sections. Chapters open initially because they control the active document;
  Characters remain collapsed initially so the writing path stays short.
- Keep the active Chapter, Chapter count and Character count visible in disclosure
  summaries. Collapsing either section is presentational only and must not change,
  save or discard authored data.
- Present the selected Chapter editor and Full Story reading view as the primary
  bounded surface. Preserve autosave, explicit Save, Enhance, Chapter switching,
  add-Chapter, loading/error states and Production/Final navigation unchanged.
- Verify keyboard disclosure behavior, focus visibility, Thai/English wrapping and
  no horizontal overflow at 390, 820 and 1440 pixels. This visual refinement must
  make no provider request and must not change Render, Queue or billing behavior.
- Implemented and verified: `rewamp-story-ui` passed 11 backend and 7 UI/schema
  tests. TypeScript, targeted ESLint and i18n validation passed. Thai/English visual
  checks passed at 390, 820 and 1440 pixels, including initial disclosure states,
  collapse/expand behavior, rounded surfaces and no horizontal overflow. The run
  made no provider request and no paid generation.

### 2026-09-20 - Chapter-first implementation superseded

- The two previous review slices remain historical evidence only. Their Chapter
  Writer must not be the page immediately after New Project.
- Correct order is `Project Brief -> Full Story -> Confirm Full Story -> Generate
  Chapters -> Chapter authoring`. Full Story is one Project-level document, not a
  read-only concatenation of pre-existing Chapters.
- Full Story AI supports initial generation from the Project Brief and later revision
  from the current Full Story plus an explicit user instruction. Manual Save, AI
  Apply and Restore create revisions; typing alone does not.
- Confirm records the active revision as a baseline. Generate Chapters is unavailable
  until a revision is confirmed. Generated Chapter prose is stored separately from
  `setup.storyBrief` and cannot erase the Project synopsis.
- Editing after confirmation keeps existing Chapters and media. The UI reports that
  the confirmed baseline is older; regeneration is explicit and never automatic.
- Focused-test policy: run only Full Story domain/API/component tests, the changed
  Brief/library route assertions and affected responsive visual checks. No full
  Cinematic, provider, media or paid-generation suite in this increment.

### 2026-09-20 - Build Chapters modes and canonical Chapter Writer

- Build Chapters now provides mutually exclusive Generate and Manual modes. Generate
  preserves the confirmed-Full-Story AI proposal flow and enters Chapter Writer after
  the generated Chapters are persisted; Manual enters Chapter Writer immediately and
  makes no provider request. Failed generation remains on Full Story with its error.
- Chapter Writer adds, selects, edits and explicitly saves `chapterTitle` and
  `chapterStory` through the existing Series workspace owner. A Chapter update does
  not overwrite Project-level `setup.storyBrief` or the confirmed Full Story.
- The server update command retains actor ownership, expected-version conflict checks
  and the existing repository transaction boundary. No parallel persistence path was
  introduced.
- Focused validation passed: 14 backend tests and 7 UI tests in `rewamp-chapters`,
  targeted ESLint, TypeScript no-emit and i18n catalog validation. Thai/English visual
  checks passed at 390 and 1440 pixels with no overlap or horizontal overflow. The
  visual run made no mutation, provider request or paid generation.
- Navigation regression closed: successful AI Chapter persistence now opens Chapter
  Writer immediately; a failed request remains on Full Story. The focused
  `rewamp-chapters` group passed again with 14 backend and 7 UI tests.
- Existing-work follow-up: the Series workspace must derive whether Chapter work has
  started from the same rule that protects regeneration. More than one Chapter,
  authored Chapter prose, a Chapter generation record or Scene work changes the
  primary action to Continue Chapters. The initial empty Chapter 1 created with a
  Mini Series does not count as started work. While this state is loading, Generate
  remains disabled; a stale-request `cinematic_chapters_already_exist` response
  refreshes the workspace and continues to Chapter Writer instead of surfacing a
  dead-end regeneration error.
- Implemented with `productionProject.chapterWorkStarted`, derived by the Series
  owner from the same predicate used by its regeneration guard. The affected live
  Project returned two Chapters and `chapterWorkStarted: true`; the UI therefore
  presents Continue Chapters without submitting another generation request.
- Follow-up validation passed: 14 backend and 8 UI tests in `rewamp-chapters`, three
  Rewamp schema tests, TypeScript no-emit and i18n catalog validation.

### 2026-09-20 - Corrected Full Story-first slice implemented

- Opening an existing Project now always enters the reusable Project Brief composer;
  creating a draft also returns to that same Brief route. Continuing enters one
  Project-level Full Story document before any Chapter authoring UI.
- Full Story supports manual revisions, AI proposal/revision with a scoped instruction,
  ten prior revisions plus the active head, Preview/Restore and explicit confirmation.
  Project Brief remains the concise synopsis and is never replaced by Chapter prose.
- Generate Chapters appears only for the confirmed active revision. It applies the
  bounded result through the Series owner, stores Chapter title/prose separately and
  reloads existing Chapters on re-entry so the action cannot be repeated accidentally.
- Added `rewamp-full-story` as the focused verification group. It passed 3 backend
  tests and 12 UI tests. Targeted ESLint, TypeScript no-emit and locale-catalog
  validation passed.
- The browser check passed Thai and English at 390 and 1440 pixels for both Project
  Brief and Full Story, with rounded sections and no horizontal overflow. It read an
  owned local Project but performed no mutation, provider request or paid generation.
- RW03.07 interrupted text-operation resume remains planned. Live provider output and
  stale-version recovery remain separate UAT/verification work and are not claimed by
  this slice.

### 2026-09-20 - First-draft assistant state

- Before any Full Story revision exists, Story Assistant is a single-purpose action:
  explain that the first draft is written from the saved Project Brief and show
  `Generate Full Story`. Do not show an empty Revision Instruction control.
- First generation sends the Project Brief and an empty revision instruction through
  the existing Full Story service. It returns an editable proposal and never saves or
  confirms automatically.
- Once the first Full Story revision is saved, reveal Revision Instruction and change
  the action to `Revise Full Story`. Manual writing and Save Revision remain available
  before or after AI generation.
- Implemented with the existing Full Story proposal endpoint and prompt recipe, which
  already pass `setup.storyBrief` as the first-draft source. The initial UI explicitly
  submits an empty revision instruction so hidden stale input cannot affect generation.
- Focused `rewamp-full-story` validation passed 3 backend and 12 UI tests; targeted
  ESLint and locale parity passed. The exact restored Project was visually checked in
  Thai and English at 390 and 1440 pixels: Revision Instruction was absent before the
  first saved Full Story and no provider request was made.

### 2026-09-20 - Build Chapters modes and Chapter Writer

- After Full Story confirmation, Build Chapters exposes one segmented mode control:
  `Generate` and `Manual`. Generate retains the existing bounded AI proposal/apply
  path. Manual performs no AI request and opens the Chapter Writer immediately.
- Generated Chapters and manually authored Chapters share one canonical Series
  workspace. Do not introduce a page-local Chapter store or a second repository.
- Chapter Writer uses `chapterTitle` and `chapterStory`. It must never edit or replace
  `setup.storyBrief` (Project Brief) or any Full Story revision. The initial root
  production unit acts as Chapter 1; additional Chapters use the existing atomic
  Series command with fresh IDs and inherited Project-level context.
- The writer provides a compact Chapter outline, title and prose fields, explicit Save,
  Add Chapter and Back to Full Story. Generate results may continue into the same page.
  Empty manual Chapter prose is valid; AI generation still requires a confirmed Full
  Story and non-empty generated Chapter prose.
- Pending buttons use the shared Momelo Button loading contract: stable dimensions,
  duplicate prevention, `aria-busy` and warning-yellow ProcessingSpinner. Loading must
  not be represented by a white primary-action icon.
- Verify only shared Button loading behavior, Chapter domain/API/component behavior,
  Full Story mode gating and affected Thai/English mobile/desktop states. Do not run
  provider, media, Render, Queue or paid-generation suites.

### 2026-09-21 - Regenerate all Chapters clarification

- The Chapter header action is `Regenerate All Chapters`. It rebuilds Chapter title
  and prose proposals for the complete confirmed Full Story; it does not create
  Scenes, Shots or media and changes nothing until Apply.
- While any Chapter proposal is pending review, re-entry restores that proposal and
  the header action becomes `Review Chapter Proposal`. It must not dispatch another
  AI request. The author must Apply or Discard the current proposal first.
- The server enforces the same single-pending-proposal rule before invoking the text
  provider, so refreshes and later direct API calls cannot create stacked pending
  proposals or consume another generation attempt accidentally. Simultaneous requests
  that both begin before either proposal is persisted remain a separate concurrency
  hardening concern; repository version checks prevent both results from being saved.
- After Apply or Discard, regeneration becomes available again. Applying preserves
  Scene/Shot/Take/media records and marks affected downstream production for review
  through the existing Chapter review state.
- Verify only the Chapter proposal domain path and Chapter Writer component. Do not
  run Scene, media, provider-live, Render, Queue or paid-generation suites.
- Focused evidence: the single matching backend proposal test passed; all four
  `CinematicChapterWriter` component tests passed; locale JSON parsing, server syntax
  and scoped `git diff --check` passed. No aggregate, media or live-provider suite ran.
