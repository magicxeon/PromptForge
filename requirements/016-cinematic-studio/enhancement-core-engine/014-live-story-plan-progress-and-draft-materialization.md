# Live Story Plan Progress And Draft Materialization

**Status:** Implemented and verified
**Capability owner:** Cinematic Story Plan orchestration
**Primary role:** Cinematic Experience Director
**Reviewers:** UX/UI Product Designer and QA Release Engineer
**Implementation package:** `implemetation-plan/013-live-story-plan-progress-and-draft-materialization.md`

## 1. Outcome

`Generate Plan` must expose the stage the server is actually executing instead
of leaving `Check Story source and Cast` marked as processing for the entire
synchronous request. A successful operation must materialize the generated
Beat, Scene and Shot structure as a new editable Draft automatically. It must
never approve that Draft or replace prior versions destructively.

## 2. Live Progress Contract

The existing proposal POST remains the canonical operation. Browser clients may
request an event-stream response from the same endpoint; JSON response behavior
remains available for existing clients and tests.

The server emits only real stage transitions:

1. `source_preflight` while Story source and Cast are checked;
2. `plan_generation` while the text provider generates the Plan and Director
   review payload;
3. `director_review` while the returned review is normalized;
4. `visual_validation` during deterministic keyframe validation;
5. `visual_repair` only while an eligible AI repair call is running, otherwise
   `skipped`;
6. `storyboard_readiness` while final film and Storyboard readiness is compiled.

The active stage alone uses a spinning process icon. Completed stages use a
check icon; queued stages use a passive clock. The UI must not estimate or
fabricate completion. A non-sensitive keep-alive may preserve the connection
during a long provider call.

## 3. Draft Materialization

- After a non-blocked proposal returns, the client immediately saves its Plan
  through the existing atomic `PUT /story-plan` workflow with `approved:false`.
- The generated Draft contains every Beat, Scene and Shot from the proposal.
- Existing Plan versions remain available as history and the active approved
  Plan is not silently replaced.
- The completed modal remains available for reviewing workflow and repair
  evidence, then closes through `Continue editing`.
- If Draft persistence fails, retain the proposal and expose one explicit retry
  action. Do not call either AI provider again.
- Blocked proposals and failed provider operations never mutate Project state.

## 4. Compatibility

- No prompt, model, fallback, reference, Generation, Queue or Credit contract
  changes.
- No additional AI request is introduced by progress reporting or Draft save.
- Actor identity remains attached through the canonical API client.
- Streaming errors use the same sanitized code, message and details as JSON
  errors.
- Closing or losing the browser stream does not create a partial Story Plan.

## 5. Acceptance Criteria

1. The long-running icon advances to `plan_generation` while Terra or Gemini is
   executing and to `visual_repair` during an actual repair call.
2. Only one stage is marked `processing` at a time.
3. Skipped repair remains visibly skipped.
4. Existing non-stream JSON callers retain the same proposal response.
5. A successful Generate operation saves all generated Scenes and Shots as a
   Draft without a second Apply confirmation.
6. Draft save failure is recoverable without regenerating or losing proposal
   evidence.
7. Focused server route/service, API stream and Cinematic UI tests pass.

## 6. Implementation Evidence

Implemented on 2026-09-04 through the canonical Story Plan proposal endpoint
and existing Story Plan persistence use case:

- the proposal POST supports opt-in server-sent progress while preserving its
  JSON response contract;
- all six workflow stages are emitted at their actual service boundaries;
- the existing modal renders one spinner for the active stage, check/skip
  outcomes for finished stages and elapsed time without fabricated progress;
- a successful, non-blocked proposal is persisted once with `approved:false`;
- persistence failure keeps the proposal available for a save-only retry.

Verification evidence:

- Story Plan service and route tests: 16 passed;
- shared API stream parser, Cinematic schema and UI tests: 64 passed;
- TypeScript typecheck passed;
- scoped ESLint passed with zero errors and existing non-blocking warnings;
- server syntax checks, i18n catalog validation and the production Web build
  passed.

Interactive provider timing and responsive browser inspection remain manual
checks because automated verification must not dispatch another paid text
generation request.
