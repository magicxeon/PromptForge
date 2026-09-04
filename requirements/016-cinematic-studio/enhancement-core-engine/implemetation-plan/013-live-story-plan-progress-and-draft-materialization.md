# Implementation 013: Live Story Plan Progress And Draft Materialization

**Status:** Completed
**Owning requirement:** `../014-live-story-plan-progress-and-draft-materialization.md`

## Step 1: Emit Real Service Stages

- Add an optional internal progress callback to Story Plan generation.
- Emit source, provider generation, review, validation, repair and readiness
  transitions at their real execution boundaries.
- Keep progress observational and unable to alter Plan output.

## Step 2: Stream Without Forking The Endpoint

- Add opt-in event-stream handling to the existing proposal POST.
- Preserve JSON behavior when event streaming is not requested.
- Stream sanitized progress, result and error events plus bounded keep-alives.

## Step 3: Reuse The API Boundary

- Add a schema-validated event-stream helper to the shared API client.
- Parse progress and final proposal through their owning Zod schemas.
- Preserve actor headers and standard `ApiError` behavior.

## Step 4: Present Actual Progress

- Feed live server stages into the existing proposal modal.
- Show one spinning icon only on the active stage.
- Show elapsed waiting time without claiming fabricated percentages.

## Step 5: Save The Generated Draft

- Persist a successful proposal immediately through the existing Story Plan
  save use case with `approved:false`.
- Refresh Project and local Draft state before offering `Continue editing`.
- Retain a retry-save action if persistence fails.

## Step 6: Verify

- Service stage-order and skipped-repair tests.
- JSON and event-stream route parity tests.
- Shared stream parser tests.
- UI active-icon, automatic Draft save and save-recovery tests.
- Existing Cinematic, schema, TypeScript and scoped lint gates.

## Result

All six steps are complete. The server emits bounded SSE progress from the same
proposal operation, the shared API client validates each event, and the modal
shows a spinner only for the current stage. Successful output is saved through
the existing `PUT /story-plan` contract as an editable Draft containing the
generated Beats, Scenes and Shots. Save recovery never repeats the AI call.

Focused evidence: 16 server tests and 64 Web tests passed, TypeScript passed,
server syntax checks and i18n validation passed, the production Web build
passed and scoped ESLint completed with zero errors.
