# CINE-FIX-005 Storyboard Batch Project Status And Engine Preference

**Priority:** P0
**Status:** Implemented; owner revalidation pending
**Reported surface:** Storyboard Generate All and Cinematic Project reload

## Incident

Submitting a Storyboard batch successfully reserved Credits and enqueued child
Generation Jobs, then persisted the undocumented Project status
`storyboarding`. The Project response schema rejects that value, so the owner
sees `The Cinematic Project could not be loaded` while accepted Jobs continue
under Generation ownership.

The Generate All dialog also resets provider and model selection whenever the
surface remounts, adding avoidable setup work and increasing the chance of an
expensive model being selected unintentionally.

## Ownership And Recovery Contract

1. Cinematic owns Project, Scene, Shot and approval readiness state.
2. Generation owns batch and child Job queued, processing and terminal state.
3. Credits owns every accepted child reservation and settlement. Recovery must
   never submit, reserve, capture or refund an operation again.
4. Project status remains `planned` while any Storyboard Shot lacks an approved
   source. It becomes `storyboard_ready` only when every Shot has an approved
   source.
5. The repository maps the legacy undocumented `storyboarding` value to
   `planned` at its compatibility boundary. The next normal Project mutation
   persists the canonical value without requiring a second storage path.
6. Existing batch IDs, child Job IDs, results and Credit records remain intact.

## Engine Preference Contract

1. Store the latest Storyboard Generate All provider/model as a versioned,
   actor-scoped UI preference through the existing persistence helper.
2. The preference is shared across Cinematic Projects for the same actor and
   must not leak when the actor changes.
3. On dialog open, restore the provider/model only when both still exist in the
   current server catalog. Otherwise use the current catalog defaults.
4. Resolution, aspect ratio, model capability and price continue to come from
   the current catalog and quote. Do not persist or reuse an old quote.
5. Changing provider/model updates the preference. Submission continues to use
   the visible selection and fresh per-Shot estimates.

## Acceptance Tests

- Registering a Storyboard batch leaves the Project in a schema-supported
  status and creates each Shot attempt once.
- A legacy `storyboarding` record loads as `planned` without changing Job or
  Credit state.
- Approving one of multiple Shots keeps the Project `planned`; approving all
  Shots changes it to `storyboard_ready`.
- Generate All restores a valid saved provider/model for the same actor.
- An invalid or removed saved model falls back to the provider catalog default.
- Actor A's selection is not returned for Actor B.
- Existing Storyboard batch, Generation Group, idempotency and approval tests
  continue to pass.

## Incident Evidence

- Project: `cineproj_1787841798259_d5rmu2tx`
- Batch: `ggrp_1788103676797_ouyhsm2b`
- Child Jobs include `job_1788103676797_1vqpupji1`,
  `job_1788103676797_7998zx4md`, `job_1788103676797_j95e504fk` and
  `job_1788103676797_hm2psu5c8`.
- At diagnosis, three children were completed and one was processing. No
  recovery submission was issued.

## Implementation Evidence (2026-08-30)

- The retained Generation Group reached `completed` with 4 completed children,
  0 failed children and one captured Credit settlement per child. All four
  output URLs are present; no replacement batch was submitted.
- The Project API now returns canonical status `planned`, version 121 and all
  four retained child Job IDs for the affected owner.
- Browser recovery verification loaded 6 Storyboard cards with 6 preview
  images and no Project schema error.
- Browser verification changed the Generate All provider without submitting,
  closed the dialog and confirmed the same provider was restored after reopen.
- Cinematic domain regression passed 24/24 tests. Full Web regression passed
  95 files / 340 tests before the final removed-provider negative case; the
  focused preference suite was rerun after that case. Production Web build
  passed.
- The repository-wide `npm test` command remains red from unrelated baseline
  failures: the Character Sheet prompt-cleanup fixture, stale professional-role
  paths and direct Node execution of Vitest TypeScript files. The owning
  Cinematic and correctly routed Web suites pass.
