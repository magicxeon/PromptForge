# CINE-FIX-010 - Scene Director Simple And Advanced Authoring

**Status:** Implemented and verified  
**Priority:** P0  
**Owner:** Cinematic Studio Story Plan  
**Primary role:** Cinematic Experience Director  
**Reviewers:** UX/UI Product Designer, QA Release Engineer  
**Skills:** `design-cinematic-experience`, `review-product-ux`,
`verify-release-regressions`

## 1. Problem

Scene Director currently exposes the complete film contract at once. The
contract is appropriate for AI proposals and expert direction, but ordinary
users must understand Scene purpose, entry/exit continuity, performance,
blocking, every Storyboard moment, dialogue/audio and Shot continuity before
they can save useful manual work. This makes manual Story Plan authoring feel
specialist-only even when the user knows the visible story they want.

Reducing the persisted contract is not acceptable. Storyboard and Produce need
stable Scene/Shot/Cast/Look IDs plus visible moment, action, emotional target,
continuity and timing authority. The solution is progressive disclosure over
one canonical contract, not separate Simple and Advanced schemas.

## 2. Outcome

Scene Director exposes two authoring modes:

- `Simple`: the shortest understandable path for title, setting, visible story
  change, ending state, Scene emotion, Cast/Look and essential Shot moments;
- `Advanced`: the current complete Scene, Shot, continuity, dialogue, audio,
  performance and lighting contract.

Both modes edit the same in-memory `CinematicScene`. Switching modes never
creates, replaces or deletes a Scene or Shot. Saving Simple fills only missing
required downstream fields and preserves all existing AI/manual Advanced
authority.

## 3. Canonical Ownership

- React progressive disclosure remains in the Cinematic feature.
- `CinematicApplicationService` and the existing Story Plan save endpoint keep
  ownership of persistence, optimistic versioning and immutable Plan versions.
- Film Readiness remains the approval gate.
- Storyboard continues to consume the canonical approved Scene/Shot contract
  through `storyboardGenerationAdapter.ts`.
- Generation, Credits, Character, Look and Asset ownership do not change.
- No second Scene schema, Simple endpoint, provider call or browser persistence
  contract may be introduced.

## 4. Simple Fields

### 4.1 Scene essentials

Simple shows:

1. Scene title;
2. location and time;
3. visible story change;
4. visible state at the end of the Scene;
5. ending emotional target;
6. Scene Cast and approved Look selection.

Scene purpose, objective, pressure, entry state, emotional start, blocking,
transition, lighting, performance, audio, props, screen direction and detailed
continuity remain available in Advanced.

### 4.2 Storyboard moments

Every Shot remains visible in Simple with:

1. stable order and title;
2. exact visible moment;
3. primary physical action;
4. dominant emotional target;
5. duration;
6. existing add, reorder and guarded remove actions.

Performance cue, continuity entry/exit, transition, dialogue and audio remain
in Advanced. Cast and Look selection at Scene level continues to propagate to
its Shots through the existing contract.

## 5. Simple Completion Rule

On Simple save, a pure client adapter returns a complete canonical Scene. It
may fill a missing value from existing visible authority in this order:

- Scene purpose from story change, then title;
- Scene entry from the first Shot visible moment;
- Scene exit from the last Shot visible moment or story change;
- emotional start/end from the nearest authored Shot emotional target;
- Shot purpose from visible moment or subject action;
- Shot visible moment and subject action from each other only when one is
  missing;
- Shot emotional target from Scene emotional end/start;
- performance cue from existing Scene performance or the Shot emotional target;
- continuity entry from the previous Shot exit, Scene entry or visible moment;
- continuity exit from the next handoff, Scene exit or subject action;
- transition from existing Scene intent, otherwise a neutral cut;
- missing Shot Cast/Look IDs from the selected Scene Cast/Look IDs.

The adapter is fill-missing-only. It must not overwrite AI-authored camera,
lighting, dialogue, audio, performance, continuity or any other populated
Advanced value. Advanced save sends the edited canonical Scene unchanged.

## 6. AI Contract

- Generate Scene Direction continues through the current canonical proposal
  endpoint.
- AI proposals contain the complete Advanced Scene/Shot contract.
- Applying a proposal persists the same Story Plan draft contract used today.
- Reopening in Simple shows its essential projection; switching to Advanced
  reveals all AI-generated values.
- AI failure leaves both Simple edits and hidden Advanced values intact.

## 7. Storyboard And Produce Handoff

Before approval, Film Readiness must still find:

- one exact visible moment per Shot;
- one primary physical action per Shot;
- one emotional target per Shot;
- Scene and Shot continuity entry/exit authority;
- stable Scene, Shot, Cast Assignment and Character Look IDs;
- reconciled Scene/Shot durations;
- dialogue/audio cues retained for Produce while excluded from still prompts.

Simple mode does not weaken the approval gate. It only prepares missing
canonical values so a manual user can satisfy the same gate without AI.

## 8. Interaction And Responsive Requirements

- Reuse the established `CinematicControlLevel` segmented control.
- The Project control level is the dialog default; changing it through Scene
  Director uses the existing Project mode callback when available.
- Mode controls remain keyboard operable with `aria-pressed` state.
- Dialog close, Generate, Save, Shot ordering/removal and Cast/Look actions
  remain available in their established positions.
- Simple contains no nested Advanced disclosure panels.
- At approximately 390px, 820px and 1440px, fields use responsive one/two-column
  grids with no horizontal overflow or inaccessible footer action.
- Thai/English parity and all current themes are required.
- No Story Plan page, header, footer, Project Cost or sibling Stage redesign is
  authorized by this ticket.

## 9. Implementation Plan

1. Add this requirement and ticket index entry.
2. Add a pure fill-missing-only Simple Scene completion helper.
3. Pass the existing Project control level into Story Plan and Scene Director.
4. Add the Simple/Advanced segmented control to Scene Director.
5. Render the bounded Simple Scene and Shot fields while preserving the current
   complete Advanced editor.
6. Route Simple save through the completion helper and Advanced save directly
   through the canonical Scene draft.
7. Add i18n and responsive styles scoped to Scene Director.
8. Test mode visibility, mode-switch preservation, Simple completion,
   Advanced preservation and Storyboard prompt compatibility.
9. Run focused Cinematic tests, full React tests, typecheck, i18n validation,
   build and available desktop/mobile route checks.

## 10. Acceptance Criteria

- `DIR-01`: Scene Director opens in the Project's Simple/Advanced control level.
- `DIR-02`: Simple displays only the bounded essential Scene and Shot fields.
- `DIR-03`: Advanced preserves the complete editor implemented before this
  ticket.
- `DIR-04`: switching modes preserves every populated canonical field.
- `DIR-05`: Simple save fills missing Storyboard/Film Readiness authority but
  never overwrites populated Advanced authority.
- `DIR-06`: manually authored Simple Scenes can be saved and approved without
  calling AI when all visible essentials are present.
- `DIR-07`: AI Scene proposals still persist complete Advanced data.
- `DIR-08`: Storyboard prompt compilation receives the same stable IDs, Cast,
  Look, visible moment, action, emotion and continuity contract.
- `DIR-09`: dialogue/audio remain available to Produce and excluded from
  Storyboard still prompts.
- `DIR-10`: existing Scene/Shot add, reorder, remove, Save, Generate, dialog and
  optimistic Story Plan behaviors remain operational.
- `DIR-11`: no unrelated Cinematic layout or workflow changes.

## 11. Deferred Evidence

Live user testing should compare completion and correction rates between Simple
and Advanced. That evidence may tune labels or default mode later, but must not
fork the canonical contract or silently weaken Film Readiness.

## 12. Verification Evidence

- Pure Simple completion tests verify fill-missing-only behavior, preservation
  of AI/expert fields and visible-field readiness.
- Scene Director component tests verify default mode, bounded Simple fields,
  complete Advanced fields, parent-controlled mode switching without draft
  loss and canonical Simple save output.
- Storyboard adapter tests verify Cast, Look, emotion, visible action,
  continuity and prompt authority remain compatible.
- Focused React regression: 58 tests passed.
- Backend Story Plan, Film Readiness, persistence and Storyboard contract: 36
  tests passed.
- TypeScript, i18n validation and production build passed.
- Playwright browser checks at 1440px, 820px and 390px found no body or dialog
  horizontal overflow; both Simple and Advanced remained operable.
- Full React regression passed 363 of 364 tests in the concurrent run. One
  unrelated Character Look test timed out only in the full run and passed all
  13 tests when rerun independently.
- Repository-wide lint retains pre-existing errors in Admin and Video API test
  files. Scoped Cinematic lint completed with no errors.
