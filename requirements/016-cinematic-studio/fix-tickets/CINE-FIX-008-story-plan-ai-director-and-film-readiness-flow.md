# CINE-FIX-008 Story Plan AI Director And Film Readiness Flow

**Priority:** P0
**Status:** Implemented and verified in scope; live provider film qualification pending
**Reported surface:** Setup Story Source -> Story Plan -> Storyboard
**Capability owner:** Cinematic Studio
**Primary role:** Product And Requirement Architect
**Cinematic reviewer:** Cinematic Experience Director
**Implementation reviewers:** UX/UI Product Designer and QA Release Engineer

## 1. Problem

Story Plan generation can return a structurally valid duration, Beat, Scene and
Shot hierarchy while still being unsafe to turn into a film. The current
Project `cineproj_1787841798259_d5rmu2tx` demonstrates the gap:

- the active Story Brief contains duplicated text and ends mid-sentence;
- Creative Direction and Role direction still describe an earlier train-station
  story while the selected Story Brief describes a family cafe;
- the generated Plan notices these conflicts but still returns a draft that a
  user must reconcile manually;
- the story Character name and reusable Character Profile display name are not
  explicitly mapped as role and performer;
- dialogue, voice, visible action and still-image direction are not represented
  as separate authorities;
- a Plan may pass structural validation without proving that each Shot will cut
  smoothly into the next Shot or that Storyboard has one unambiguous visible
  moment to draw.

Passing schema validation is therefore necessary but not sufficient. Story Plan
must become a film-directed contract that is narratively coherent, visually
observable, performable, editable and safe for downstream image and video cost.

## 2. Outcome

Introduce a source-aware AI Director flow that:

1. diagnoses Story Source conflicts before spending an AI operation;
2. generates or reviews one structured Story Plan proposal against explicit
   authority precedence;
3. separates visible action, performance, dialogue, audio and editorial intent;
4. checks screenplay rhythm and cross-Shot continuity before approval;
5. presents actionable blocking issues and warnings without silently rewriting
   approved user work;
6. creates a new reviewable draft and requires explicit owner approval before
   Storyboard;
7. preserves every contract required later by Storyboard and Produce.

The intended user experience is one guided flow:

```text
Check story source
-> Generate or review with AI Director
-> Review story, script and continuity
-> Apply a corrected draft
-> Resolve Film Readiness blockers
-> Approve
-> Storyboard
```

## 3. Scope

### In scope

- deterministic Story Source preflight;
- AI generation of a new Plan and AI review of an existing/manual Plan;
- source conflict resolution proposals;
- structured story, performance, dialogue, audio and transition contracts;
- deterministic post-generation validation;
- AI Director reconciliation findings and recommendations;
- Film Readiness status and approval gate;
- proposal review UX, loading, error and optimistic-version recovery;
- additive schema/version migration and regression coverage.

### Out of scope

- generating Storyboard images or video clips;
- voice cloning, voice casting, lip sync or final audio generation;
- provider-specific video motion instructions;
- automatic approval or destructive replacement of Story Sources or Plans;
- commercial activation of the currently no-charge text qualification flow;
- changing Cast, Character Look, Storyboard, Project Cost, header, footer or
  Stage navigation layouts outside the minimum readiness integration.

## 4. Preservation contract

Preserve unchanged unless an acceptance criterion below explicitly extends it:

- Setup remains the owner of the accepted Story Brief, Creative Direction and
  Story Role Slots;
- Cast remains the owner of Character assignment and bound Character Look;
- Cinematic remains the owner of Plan, Beat, Scene, Shot and continuity state;
- Character Profile and Character Look remain their existing capability owners;
- provider dispatch remains behind Generation and the text provider service;
- Credit state remains behind Credits;
- existing manual authoring, proposal comparison, draft save, approval, Stage
  navigation, Project Cost, `AppFooter`, responsive behavior and actor isolation;
- existing Storyboard visual prompt authority in `CINE-FIX-002` and emotional
  realism authority in `CINE-FIX-004`.

No source, approved Plan, Character, Look, Storyboard asset or generated Job may
be deleted or overwritten by reconciliation.

## 5. Authority hierarchy

Generation and review must use this order when information conflicts:

1. active immutable Story Source Version and explicit owner-confirmed source
   resolutions;
2. Project format, platform, duration, genre, audience feeling, pacing and
   ending intent;
3. active Story Role Slots;
4. active Cast Assignments and pinned Character/Profile versions;
5. locked Character Look versions and rights/readiness state;
6. current working Plan when the operation is `review_current`;
7. optional user direction for the current operation;
8. older Plan versions only as labelled comparison history, never as current
   creative authority.

Display names are not identity authority. A story Character such as `Nara`
must be mapped explicitly to a Cast Assignment such as `played by Ing Ing` and
all Scene/Shot references must persist stable IDs.

When Story Brief and Creative Direction conflict, the service must not choose
silently. It returns a source-resolution blocker with the conflicting fields,
short evidence and available owner actions.

## 6. Story Source preflight

Run deterministic checks before provider dispatch. These checks are free and do
not mutate Project data.

### 6.1 Required checks

- empty or whitespace-only source;
- exact or near-exact repeated paragraphs;
- likely truncation such as an unclosed quote or incomplete terminal sentence;
- conflicting named locations, Character counts and required props between
  Story Brief, Creative Direction and Role Slots;
- stale Role objective, relationship or emotional arc that refers to entities
  absent from the active Story Brief;
- target duration, aspect ratio and platform availability;
- required Cast assignment, identity and locked multi-view Look readiness;
- current Story Source Version and optimistic Project version.

### 6.2 Result model

Each diagnostic contains:

- stable code and severity: `blocking`, `warning` or `info`;
- owning field/path and compared field/path;
- sanitized evidence summary, never a full private prompt in logs;
- recommended recovery action;
- whether a deterministic normalization is available;
- whether owner confirmation is required.

Exact duplicate removal and whitespace normalization may be offered as a
preview, but the accepted Story Source is changed only through the existing
Setup save/version contract after explicit confirmation. Truncation and
semantic conflict always require owner review or an AI repair proposal.

## 7. AI Director operations

Extend the existing Story Plan proposal use case with two explicit modes:

- `generate`: create a new Plan from the resolved active source;
- `review_current`: reconcile the current draft without discarding manual work.

Both modes use the same authorized Project context and return a proposal. They
never apply or approve automatically.

### 7.1 Cost-efficient execution

1. Run deterministic preflight first.
2. Do not call AI while unresolved source blockers make the intended story
   ambiguous.
3. Use one structured AI Director call by default to produce the Plan plus its
   reconciliation and Film Readiness assessment.
4. Run deterministic validation after the call.
5. Offer a second repair/regeneration call only when deterministic validation
   rejects the result or the owner explicitly requests it.
6. Preserve `qualification_no_charge` until the commercial text-operation gate
   defines an immutable quote and Credit lifecycle.

### 7.2 Versioned Prompt Recipes

Upgrade the global `cinematic-story-plan-generate` recipe to a new immutable
version and add a versioned reconciliation recipe only where reviewing an
existing Plan needs distinct instructions. Shared directing rules must have one
configuration owner and must not be copied into React, Project runtime data or
localization catalogs.

The directing rubric must require:

- the smallest Scene/Shot count that tells the story clearly;
- exact target-duration reconciliation;
- visible cause and effect in every Beat;
- restrained, physically performable action and expression;
- dialogue that sounds natural when spoken at the allocated pace;
- intentional pauses, breaths and reaction space;
- continuity of identity, wardrobe, prop, hand state, gaze, screen direction,
  environment, time and lighting;
- camera choices motivated by story rather than decorative movement;
- a clear representative still moment for every Storyboard Shot;
- no invented provider/model settings.

## 8. Film-directed data contract

The existing Plan/Beat/Scene/Shot fields remain readable. Additive fields use a
new contract version and have deterministic legacy defaults.

### 8.1 Plan

In addition to objective, logline and emotional arc, the proposal carries:

- central dramatic question;
- story promise and final payoff;
- spoken language and on-screen-text/subtitle policy;
- dialogue policy: none, sparse, normal or dialogue-led;
- screenplay/read-time summary;
- reconciliation report and Film Readiness result;
- source-resolution decisions and provenance.

### 8.2 Beat

Every Beat identifies:

- purpose and visible story change;
- cause entering the Beat and consequence leaving it;
- emotional start, turn and end in performable language;
- linked Scene IDs and duration budget;
- required Character, prop or information reveal.

An abstract emotion without an observable change is a warning. A Beat without a
cause, consequence or linked Scene is blocking.

### 8.3 Scene

Every Scene identifies:

- entry state and exit state;
- location, time and environment continuity;
- present Cast Assignment IDs and Look IDs;
- objective, obstacle/pressure and decision or change;
- blocking and practical movement;
- performance arc;
- dialogue and audio intent;
- prop, lighting, screen-direction and transition continuity;
- linked Shot IDs and reconciled duration.

### 8.4 Shot

Every Shot must be drawable as one Storyboard panel and executable later as a
video Shot. Store:

- `visibleMoment`: the exact frame-worthy moment the audience sees;
- `subjectAction`: one primary physical action;
- `emotionalTarget`: one dominant observable state;
- `performanceCue`: face, gaze, breath, posture or gesture direction;
- framing, angle, lens intent and one justified camera movement;
- lighting and environment state;
- Cast Assignment and Look IDs;
- prop/hand/eyeline/screen-direction entry and exit anchors;
- transition intent to the next Shot;
- dialogue cues and audio cues as separate structured arrays;
- provider-neutral still prompt seed containing only visible information;
- duration and estimated spoken/action time.

### 8.5 Dialogue and audio

A dialogue cue contains speaker Cast Assignment ID or authorized off-screen
voice role, exact text, delivery intent, start offset, estimated spoken duration
and whether the speaker is visible. An audio cue contains kind, source,
description, start offset and duration.

Dialogue, voice-over, music and ambience never enter the Storyboard still prompt
except for their visible performance consequence. Dialogue text must not cause
subtitles, phone UI text or signage unless on-screen text is explicitly allowed.
The complete cues continue to Produce even when Storyboard excludes them.

### 8.6 Film Script Preview

Derive one chronological Film Script Preview from the structured Plan without a
second AI call. It is a read projection, not another source of truth. For every
Shot it shows:

```text
[timecode in-out]
VISUAL: visible moment, framing and environment
ACTION: subject action and blocking
PERFORMANCE: emotional target and observable cue
DIALOGUE: speaker, exact line and delivery, when present
AUDIO: ambience, sound effect, music or authorized off-screen voice
CUT: outgoing continuity anchor and transition intent
```

The preview must use the Project's intended spoken language and preserve exact
owner-authored dialogue. AI may propose dialogue, but must not translate,
paraphrase or replace accepted dialogue without displaying the change for owner
review. Empty channels are omitted rather than filled with invented content.

## 9. Smoothness and continuity rules

Film Readiness evaluates at least these dimensions:

### Narrative

- every Shot advances information, emotion or decision;
- setup is paid off and the ending answers the central dramatic question;
- no Scene repeats the previous Scene without a new consequence.

### Performance and script

- emotional transitions are gradual or intentionally motivated;
- dialogue matches Character role, relationship and emotional state;
- spoken duration plus required pauses fits the Shot/Scene duration;
- important reactions receive visible screen time;
- no Character speaks or appears without authorized Cast authority.

### Visual and editorial

- every Shot has one unambiguous visible moment;
- adjacent Shot sizes, angles and movements create readable progression;
- screen direction and eyelines do not flip accidentally;
- temporal actions such as a light turning on define before/after anchors or
  separate panels instead of asking one still to show time passing;
- transitions state what visual, movement or audio element carries the cut;
- decorative camera movement and redundant coverage are warnings.

### Continuity and production

- Character identity and Look versions remain stable;
- props, hands, body position, weather, time and practical lights reconcile;
- impossible simultaneous actions, unexplained location jumps and conflicting
  environment states are blocking;
- provider-independent complexity risks are visible before Storyboard/video
  spending.

## 10. Film Readiness result and gate

Return a structured result with overall state:

- `ready`: no blocker; warnings reviewed or accepted;
- `ready_with_warnings`: no blocker; owner acknowledgement required;
- `not_ready`: one or more blockers.

Dimensions are `story`, `script`, `performance`, `visual`, `editorial`, `audio`,
`continuity` and `production`. Each finding identifies the affected
Plan/Beat/Scene/Shot ID, evidence summary and recovery action.

Approval remains deterministically authoritative. AI scores cannot approve or
block by themselves. The server blocks approval on objective conditions such
as unresolved source conflict, missing links, invalid duration, unauthorized
Cast/Look, missing visible moment, invalid dialogue speaker, impossible timing
or broken continuity anchors. Subjective findings remain warnings.

An approved Plan must be current for the active Story Source and must set
`activeStoryPlanVersionId`. A Project status of `planned` without an active
approved Plan is an invalid readiness projection and must not authorize
Storyboard.

## 11. Proposal review experience

Reuse the existing proposal dialog and shared loading/error presentation. Do
not redesign sibling Story Plan sections.

1. Selecting Generate or Review opens the dialog immediately.
2. Progress communicates real stages:
   - checking source;
   - directing story and script;
   - checking continuity and timing;
   - preparing review.
3. If preflight finds a blocker, show the issue before provider dispatch and
   offer a focused route to the owning Setup/Cast field.
4. Proposal review groups information into:
   - Story and duration;
   - Script and performance;
   - Scene/Shot continuity;
   - Film Readiness issues.
5. Show before/proposed values for changed owner-authored fields.
6. `Apply corrected draft` persists a new unapproved Plan Version.
7. Discard leaves the Project unchanged.
8. Apply failure keeps the proposal open and recoverable.
9. Approval remains a separate explicit command after the applied draft passes
   the server gate.

The Review dialog includes the derived Film Script Preview so the owner can
read the intended film from beginning to end before Apply or approval. It must
not introduce a second editable copy of Shot data.

### 11.1 Manual-authoring parity

Manual Story Plan and Scene Director remain first-class paths. Core manual
fields expose visible moment, action, emotional target and continuity anchors.
Dialogue/audio cues and detailed camera/performance controls may use Advanced
progressive disclosure. Saving manual changes updates the same structured
contract and derived Film Script Preview used by AI proposals. A manual user
must never be forced to call AI merely to satisfy Film Readiness.

The dialog and issue navigation must remain operable at approximately 390px,
820px and 1440px without hidden actions, nested scrolling traps or horizontal
overflow.

## 12. State and error matrix

| State | Required behavior |
|---|---|
| deterministic preflight running | open dialog, show status, no provider call yet |
| source blocker | no AI dispatch; preserve draft; link to recovery |
| AI generation running | preserve current Plan; disable duplicate submit |
| provider/transport failure | keep dialog and draft; retry safely |
| malformed AI result | reject proposal; show stable recoverable error |
| deterministic post-check failure | show affected IDs; do not allow Apply until repaired/regenerated |
| valid proposal | allow explicit Apply as a new draft |
| optimistic version conflict | refetch once; never overwrite concurrent edits |
| applied draft | Storyboard remains blocked pending approval |
| ready draft | allow explicit approval |
| source changes after approval | mark Plan/downstream work stale through existing rules |

## 13. API and ownership contract

- Extend the canonical Story Plan proposal endpoint/use case with an operation
  mode; do not add a second feature-local provider pipeline.
- `CinematicApplicationService` supplies the actor-authorized current Project
  context and persists applied drafts.
- `CinematicStoryPlanService` owns prompt recipe loading, provider invocation,
  proposal normalization and provenance behind Generation's text boundary.
- Pure deterministic preflight/readiness helpers belong to the Cinematic domain
  and are reused by Generate, Review and approval.
- React uses `apiClient`, Zod response schemas and actor-relative Query keys.
- Raw private Story text and provider responses are not written to normal logs.
- Proposal and readiness records include recipe ID/version/fingerprint and
  Story Source Version ID.

## 14. Migration and compatibility

- Introduce an additive Story Plan contract version; continue reading
  `story-plan-v2` and legacy Plans.
- Derive safe defaults for new fields when opening older Plans, but mark missing
  Film Readiness evidence as `not_evaluated`, never `ready`.
- Do not backfill or approve historical Plans automatically.
- Applying reconciliation creates a child draft of the currently selected Plan
  and preserves parent/version provenance.
- Existing Storyboard assets remain history; they become stale only through the
  existing dependency rules after an approved authority changes.

For the reported Project, acceptance expects a corrected child draft rather
than mutation of Plan v12. The corrected draft follows the cafe Story Brief,
contains no train-platform authority, maps Nara to the selected Cast Assignment,
preserves the approved Look, separates the father's recorded message from still
prompts and remains unapproved until owner review.

## 15. Implementation plan

### Step 1 - Deterministic source preflight (P0)

1. Define diagnostic codes, severity and source-resolution schema.
2. Implement pure duplicate, truncation, conflict and readiness checks.
3. Add current-Project fixture coverage without provider calls.
4. Expose preflight through the canonical Story Plan context/proposal flow.

**Gate:** ambiguous source blocks dispatch and no existing draft changes.

### Step 2 - Film-directed schemas and compatibility (P0)

1. Add versioned Plan/Beat/Scene/Shot, dialogue/audio cue and readiness schemas.
2. Add legacy defaults and Zod parity.
3. Extend normalization without changing stable IDs or duration allocation.
4. Add speaker, Cast/Look and entry/exit continuity validation.

**Gate:** old Plans still load; new contracts reject invalid authority.

### Step 3 - AI Director recipe and service (P0)

1. Add the versioned directing rubric and recipe changes.
2. Send resolved current authority and label historical context explicitly.
3. Support `generate` and `review_current` through one service boundary.
4. Return proposal, reconciliation findings, Film Readiness and provenance.
5. Keep qualification billing behavior unchanged.

**Gate:** the cafe fixture produces no station entities and all timings reconcile.

### Step 4 - Deterministic post-generation reconciliation (P0)

1. Validate structure, duration, dialogue timing, still-prompt separation and
   continuity anchors after AI output.
2. Reject malformed/unsafe proposals before Apply.
3. Reuse the same validators during approval.
4. Prevent `planned`/active-Plan projection inconsistency.

**Gate:** Apply and approval cannot disagree about Film Readiness blockers.

### Step 5 - Proposal review UX (P1)

1. Extend the existing dialog, loading and error components.
2. Add Generate/Review operation choice and staged status.
3. Present changes and findings by Story, Script, Continuity and Readiness.
4. Add focused recovery navigation and explicit Apply/Discard.
5. Preserve manual edit, Stage shell, cost summary and footer.

**Gate:** keyboard and responsive checks pass at mobile, tablet and desktop.

### Step 6 - Approval and downstream handoff (P0)

1. Require current source, current applied draft and deterministic readiness.
2. Persist immutable approved Plan/version authority.
3. Confirm Storyboard receives stable visible moments, Cast/Look IDs and visual
   continuity while Produce retains dialogue/audio/temporal cues.
4. Mark only dependent downstream work stale after later approved changes.

**Gate:** one approved Plan can reconstruct Storyboard and Produce inputs without
reading an unstructured AI response.

### Step 7 - QA and rollout (P0)

1. Run focused domain, provider-service, React and schema tests after each Step.
2. Run full Web/typecheck/i18n and relevant server suites before closure.
3. Manually test Thai and English stories at 390px, 820px and 1440px.
4. Qualify one sparse-dialogue and one two-Character conversational short.
5. Record remaining provider-quality risks separately from deterministic pass.

## 16. Acceptance criteria

1. A duplicated or likely truncated Story Brief is diagnosed before AI dispatch.
2. Conflicting Story Brief and Creative Direction cannot be resolved silently.
3. Generate and Review preserve current work until explicit Apply succeeds.
4. The default successful path uses one AI Director operation.
5. Every Beat has cause, visible change and consequence.
6. Every Scene has entry/exit state, Cast/Look authority and reconciled timing.
7. Every Shot has one visible moment, action, emotional target and continuity
   entry/exit anchor.
8. Dialogue fits allocated time and references an authorized speaker or
   off-screen voice role.
9. Dialogue/audio are available to Produce but excluded from still-image prompts.
10. A chronological Film Script Preview reconstructs visual, action,
    performance, dialogue, audio and cut intent without duplicating authority.
11. Manual authoring can produce and approve the same film-directed contract
    without calling AI.
12. Camera and transitions form a readable sequence without contradictory
    screen direction or gratuitous movement.
13. Subjective AI findings cannot replace deterministic approval rules.
14. Applying a proposal creates a new unapproved child Plan Version.
15. Storyboard is unavailable until the exact current Plan is approved.
16. An active approved Plan ID is present whenever readiness reports `planned`.
17. The reported cafe Project can be corrected without deleting v12, replacing
    its Cast/Look or reusing stale train-story imagery.
18. Existing Setup, Cast, Storyboard, Produce, Credits, header, footer, Stage
    navigation, localization and responsive behavior remain covered.

## 17. Automated verification

Required focused coverage includes:

- exact duplicate and unclosed-quote source diagnostics;
- cafe-versus-station conflict fixture;
- no provider call while preflight is blocked;
- one-call happy path and explicit repair retry;
- AI response schema rejection and current-draft preservation;
- Beat/Scene/Shot duration and link reconciliation;
- Character alias-to-Cast ID mapping;
- dialogue speaker and read-time validation;
- deterministic Film Script Preview ordering and timecodes;
- owner-authored dialogue language and exact-text preservation;
- manual-authoring parity without provider dispatch;
- dialogue/audio exclusion from Storyboard still prompts;
- prop, hand, screen-direction, Look and lighting continuity findings;
- apply creates draft, approval creates active immutable version;
- optimistic conflict recovery and actor isolation;
- legacy Plan `not_evaluated` compatibility;
- adjacent Cinematic shell and manual authoring regressions.

Suggested commands after implementation:

```text
node --test test/cinematicApplicationService.test.js
node --test test/cinematicStoryPlanService.test.js
npm run test --workspace web -- src/features/cinematic/components/CinematicUxPrototype.test.tsx
npm run typecheck:web
npm run validate:i18n --workspace web
```

## 18. Manual film qualification rubric

Before closure, the Cinematic reviewer must be able to answer yes to each item:

- Can the story be understood without reading internal field labels?
- Does every cut preserve or intentionally change attention and screen direction?
- Are Character decisions visible rather than explained only in prose?
- Does dialogue sound natural at normal performance speed?
- Is there room for breath, reaction and motivated silence?
- Can each Storyboard card depict one exact moment?
- Can Produce reconstruct motion, dialogue, ambience and transition intent?
- Do identity, wardrobe, prop, weather, light and emotional state remain coherent?
- Does the ending visually and emotionally pay off the opening promise?

## 19. Rollback

- Feature-gate the new operation modes and contract version.
- If rollout fails, retain the existing v1 proposal flow and all saved Plans.
- Do not downgrade, delete or auto-approve drafts created by the new flow.
- A rollback disables new generation/review controls but keeps additive data
  readable and preserves actor-owned work.

## 20. Implementation record

Implemented on 2026-09-01:

- added deterministic Story-source preflight before provider dispatch, including
  duplicate, truncation, role, location and Story/Creative Direction conflict
  diagnostics;
- added versioned Story Plan and Scene Direction prompt recipes plus strict
  structured provider output for Beats, Scenes, Shots, dialogue, audio and
  continuity;
- added Generate and Review-with-AI-Director operations that open immediately,
  preserve current work and apply proposals only after explicit confirmation;
- added deterministic Film Readiness and chronological Film Script Preview;
- kept generated and reviewed Plans as inactive drafts until deterministic
  approval succeeds, then required that exact active version for Storyboard;
- extended manual Beat, Scene and Shot authoring with the same visible-action,
  performance and continuity contract used by AI proposals;
- passed the approved directing contract to Produce while excluding dialogue and
  audio instructions from Storyboard still-image prompts;
- preserved existing Cinematic shell, Stage navigation, Cast/Look ownership,
  Credits ownership, header, footer and adjacent workflow actions.

Verification evidence:

- focused server Cinematic suites: 42 tests passed;
- full Web Vitest suite: 95 files and 358 tests passed;
- Web TypeScript no-emit validation passed;
- isolated production Web build passed;
- Story Plan and Scene Director were visually checked without horizontal
  overflow at 390px, 820px and 1440px;
- root `node --test` remains red from pre-existing repository-wide failures,
  including missing professional-role artifacts, Fashion expectation drift and
  Node discovering Web TypeScript tests without Vitest. These failures are not
  treated as ticket closure evidence and were not changed by this ticket.

Remaining qualification:

- run one sparse-dialogue and one two-Character live provider film through
  Storyboard and Produce, recording generated Job IDs and continuity findings.
