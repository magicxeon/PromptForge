# Unified Story Plan Direction And Visual Repair

**Status:** Implemented and verified  
**Capability owner:** Cinematic Story Plan  
**Primary role:** Product And Requirement Architect  
**Reviewers:** UX/UI Product Designer and QA Release Engineer  
**Triggered skills:** `design-cinematic-experience`, `review-product-ux`, `verify-release-regressions`  
**Implementation package:** `implemetation-plan/009-unified-story-plan-direct-review-and-visual-repair.md`

## 1. User Outcome

A creator presses one `Generate Plan` button and receives one reviewable,
Storyboard-ready proposal. The system generates the narrative plan, performs
professional AI direction, validates every proposed Shot as a still keyframe,
repairs eligible visual issues and reports what changed before one final Apply.

The creator must not understand or manually invoke separate AI Director and
visual-repair operations to obtain a usable first proposal.

## 2. Confirmed Problem

The current screen exposes `Generate Plan` and `Review with AI Director` as
separate primary operations even though the Story Plan recipe already acts as a
professional director. Deterministic film readiness checks presence and timing,
but it does not close common still-image contradictions before Storyboard.

Examples include:

- unexplained wetness inside an interior location;
- an action that is not observable in a still image;
- duplicated exact moment and visible action;
- face, gaze or tear direction in a hand-only insert;
- temporal camera movement expressed as current still composition;
- a future prop action leaking into the current keyframe;
- a blanket no-text rule conflicting with authorized diegetic text on a prop.

Repairing those problems only after opening Storyboard produces repeated paid
or time-consuming retries and makes the creator move backward through stages.

## 3. Canonical One-Button Flow

```text
Generate Plan
  -> source and Cast preflight
  -> AI story, Beat, Scene, Shot and script generation
  -> AI Director self-review
  -> deterministic visual-contract validation for every Shot
  -> bounded AI repair of eligible fields
  -> deterministic revalidation
  -> film and Storyboard readiness summary
  -> one final Apply generated plan confirmation
```

`Review with AI Director` and a separate `AI Repair` primary action are removed
from the Story Plan screen. The existing Scene Director remains available for
later manual or expert refinement; it is not part of the first-time happy-path
requirement.

## 4. Proposal And Progress Modal

The modal opens before the network request starts and remains the single surface
for pending, blocked, failed and completed outcomes.

It presents these stages:

1. Story source and Cast checked;
2. Story Plan generated;
3. AI Director review completed;
4. visual contracts validated;
5. eligible visual issues repaired or explicitly skipped;
6. Storyboard readiness verified.

During the existing synchronous request the UI may show the workflow as
processing with remaining stages queued; it must not fabricate server timing or
claim a specific stage completed before the response confirms it. The completed
proposal carries the actual stage outcomes.

The final modal includes:

- Beat, Scene, Shot and runtime totals;
- readiness state and unresolved findings;
- repair-round count;
- issue and repair totals;
- expandable repair detail grouped by Scene and Shot;
- field path, concise original value, repaired value and reason;
- an expandable film-script preview;
- `Discard proposal` and one `Apply generated plan` action.

The UI must never render raw objects, internal localization keys or unbounded
prompt payloads in repair detail.

## 5. Visual Quality Contract

Validation is deterministic and provider-independent. It evaluates the
normalized proposed Plan and the same keyframe compiler used by manual and
batch Storyboard generation.

Each finding contains:

```text
code
severity: blocking | warning
repairable
sceneId
shotId
fieldPaths[]
summary
recommendation
```

The first implementation must cover at least:

- `unexplained_interior_weather`;
- `multiple_visible_actions`;
- `duplicate_moment_and_action`;
- `non_visual_action`;
- `framing_performance_mismatch`;
- `motion_instruction_in_still`;
- `future_prop_action_leakage`;
- `diegetic_text_conflict`;
- existing missing authority, Cast, Look and future-emotion compiler findings.

Deterministic validation may identify and describe a semantic problem but must
not perform broad string rewriting. Semantic repair belongs to the AI repair
pass followed by deterministic revalidation.

## 6. Bounded AI Repair

- Repair runs only when repairable visual findings exist.
- It runs at most two rounds.
- It stops when no repairable finding remains, no accepted field changes were
  produced, or the finding count did not improve.
- Repair receives the current generated proposal and exact findings.
- Repair may change only the allowlisted visual, performance and continuity
  fields required by a finding.
- The server merges allowlisted fields; it never trusts the provider to preserve
  protected authority merely because the prompt requested it.

Protected throughout repair:

- Story objective, Beat order and Scene/Shot counts;
- stable proposal structure and duration allocation;
- Cast Assignment IDs and Character Look IDs;
- dialogue and audio cue ownership and timing;
- Character aliases;
- Project aspect ratio and target duration;
- existing approved media and Generation attempts;
- user-authored Project Setup and Cast records.

The repair merge records every accepted field change. Provider changes outside
the allowlist are discarded.

## 7. Apply And Recovery

- AI never applies or approves a Plan automatically.
- Apply continues through the existing atomic `PUT /story-plan` use case.
- The proposal carries the expected Project and Story Source versions.
- A version conflict retains the proposal and reports a recoverable error.
- A blocked source preflight remains resolvable in the same modal.
- A provider or repair failure retains the current persisted Plan unchanged.
- A proposal with deterministic blocking findings cannot be applied.
- Warnings remain visible and may be applied as the existing readiness policy
  permits.

### 7.1 Multi-Pass Timeout Recovery

The unified operation may contain one complete Plan generation call followed by
up to two repair calls. It must not reuse the former single-pass 60-second
assumption for every stage without recovery behavior.

- initial Plan generation and visual repair have separate bounded timeout
  policies;
- the initial generation default allows up to 120 seconds because it returns
  the complete structured film Plan;
- each repair call has a separate 90-second default and remains limited by the
  existing maximum of two rounds;
- an initial generation timeout returns a retryable stage-specific error and
  leaves the persisted draft unchanged;
- a repair timeout after a valid Plan exists stops further repair, retains the
  valid generated Plan and exposes the timeout as workflow evidence;
- deterministic validation and readiness still run against the retained Plan;
- Apply remains blocked only by blocking findings, not merely because an
  optional warning-level repair timed out;
- no automatic retry may silently add provider calls or extend the bounded
  operation.

## 8. Simple And Advanced UX

Simple mode shows one primary `Generate Plan` command and concise final totals.
Advanced mode may expose complete repair findings and field changes, but it uses
the same proposal and save contract. No second Plan format or AI pipeline is
introduced.

The Scene Director's per-Scene AI action remains available after Apply for
intentional user refinement. It is not presented as a required next step when
the unified proposal is ready.

## 9. Existing Behavior To Preserve

- Story source conflict resolution;
- Story Plan manual authoring and Save draft;
- Beat and Scene editing, ordering and removal rules;
- Scene Director Simple/Advanced editing;
- field-level Scene Direction proposal behavior;
- Cast and approved Look authority;
- target duration and portable video timing guidance;
- Storyboard keyframe v2 compiler and fingerprints;
- manual and Generate All parity;
- Credits, Queue, providers and media Generation workflows;
- approved Storyboard and Produce outputs until a new Plan is actually applied.

## 10. Acceptance Criteria

1. The Story Plan screen exposes one primary AI operation named `Generate Plan`.
2. Its modal opens before dispatch and communicates the complete workflow.
3. A successful response contains confirmed stage outcomes, initial findings,
   repair rounds, accepted changes and remaining findings.
4. Every proposed Shot is evaluated through the canonical keyframe compiler.
5. Repair changes only allowlisted fields and preserves Cast, Looks, timing,
   dialogue, audio and structure.
6. Repair stops after at most two rounds and never loops indefinitely.
7. Apply remains one explicit atomic confirmation and is disabled for blockers.
8. Repair details are expandable, readable and responsive in every theme.
9. Existing manual Story Plan, Scene Director and Storyboard workflows pass
   regression tests.
10. The sanitized cafe fixture detects and repairs interior wetness while
    preserving rain outside, and verifies the remaining keyframe contract no
    longer contains the contradiction.
11. Initial generation receives its dedicated bounded time budget and reports a
    retryable `plan_generation` timeout without changing persisted work.
12. A repair timeout retains the generated Plan, marks visual repair stopped,
    displays the interruption and remaining findings, and performs no later
    repair call.

## 11. Validation

- Visual quality service unit tests for every required finding;
- repair allowlist, structure preservation, stopping and maximum-round tests;
- Story Plan service tests for clean, repaired, blocked and provider-failure
  proposals;
- route and Zod contract tests for additive workflow evidence;
- React tests for immediate modal, one button, completed stages, expandable
  before/after detail, blocker state and atomic Apply;
- focused Cinematic server and Web tests after each checkpoint;
- TypeScript, i18n parity, targeted lint, production build and `git diff --check`;
- browser inspection at approximately 390px, 820px and 1440px in default,
  fashion and creative themes;
- no image/video provider call or Credit mutation is required for validation.

## 12. Implementation Evidence

Implemented on 2026-09-03 through the canonical Cinematic Story Plan proposal
workflow:

- `Generate Plan` now owns source/Cast preflight, Plan generation, AI Director
  review, deterministic keyframe validation, bounded visual repair and final
  readiness reporting;
- the separate Story Plan `Review with AI Director` primary action was removed,
  while per-Scene Director refinement remains available;
- every proposed Shot is evaluated through the canonical Storyboard keyframe
  compiler plus generic cross-field visual checks;
- repair is limited to exact finding-owned field paths, runs for at most two
  rounds and records accepted before/after evidence;
- Cast, Look, duration, dialogue, audio, aliases, structure and persisted media
  remain protected from repair;
- the proposal modal opens before dispatch, renders six truthful stages and
  keeps Apply explicit and disabled while blockers remain.

Verification evidence:

- Cinematic and Storyboard server regression: 108 tests passed;
- complete Web regression: 100 files and 384 tests passed;
- TypeScript project typecheck passed;
- focused ESLint completed with zero errors; existing component-file warnings
  remain non-blocking;
- i18n catalog parity and production build passed;
- default, fashion and creative theme inspection passed at 1440px, 820px and
  390px without dialog horizontal overflow.

Paid-provider visual qualification remains intentionally outside this package.
One real Story Plan generation should still be used to judge artistic quality,
but it is not required to prove orchestration, repair bounds or data safety.

Timeout recovery was verified after the first live unified-flow timeout:

- initial generation now has a 120-second default and returns a retryable
  `plan_generation` error without changing the draft;
- each visual repair call has a separate 90-second default;
- repair timeout retains the valid Plan, records sanitized interruption
  evidence, stops later repair rounds and continues deterministic readiness;
- legacy proposals remain valid and non-timeout provider failures retain their
  existing hard-failure behavior.
