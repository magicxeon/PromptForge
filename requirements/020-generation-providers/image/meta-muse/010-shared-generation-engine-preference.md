# 010 - Shared Image Generation Engine Preference

Status: Implemented and offline-verified
Date: 2026-09-05
Capability owner: Generation client workflow
Primary: Product And Requirement Architect
Reviewer: Product UX and QA

## Outcome

Remember the last provider and model explicitly selected by each actor and use
that pair as the initial choice when the actor enters another compatible image
Generation mode. Users should not repeatedly select the same engine while
moving between Playground and Studio workflows.

## State Contract

- Store only `provider` and `model` in versioned actor-scoped browser storage.
- Do not persist prompts, references, estimates, Jobs, prices or media.
- Persist on an explicit provider/model selection, not on automatic fallback,
  catalog loading, quote failure or provider submission.
- Keep the preference global to compatible image Generation experiences so it
  can follow the actor between Playground and Studio.
- Actor switching resets in-memory engine state before reading the next
  actor's preference.
- Caller-owned `initialEnginePreference` takes precedence and disables shared
  preference writes for that mounted workflow. This preserves Cinematic
  Storyboard's accepted-render-only policy.

## Restore And Fallback

The shared resolver validates, in order:

1. explicit workflow-owned initial preference, otherwise stored actor choice;
2. the same provider's eligible default and remaining models;
3. the catalog default provider and eligible models; and
4. remaining eligible providers and models.

Eligibility includes surface, generation mode, release state, reference count
and aspect ratio. An automatic fallback does not replace the stored explicit
choice, allowing Muse selected in Face Creator to remain available when the
actor returns after visiting a reference-required workflow.

## Acceptance Criteria

1. A provider/model selected in Playground restores in compatible Studio Face
   Creator and vice versa.
2. Muse selected in Face Creator does not appear in Character Sheet or Scene
   Builder; those modes receive an eligible fallback.
3. A reference-incompatible stored model falls back without dropping the
   reference.
4. Two actors never read each other's engine preference.
5. Removed or disabled catalog entries never create an invalid selection.
6. Existing Comparison slot preferences and Cinematic Storyboard preference
   ownership remain unchanged.

## Implementation Result

- Added `imageEnginePreference.ts` under the Generation feature owner using
  the existing versioned actor-scoped storage adapter.
- `GenerationExperience` restores the caller-owned preference first or the
  shared actor preference otherwise, then resolves it through the filtered
  server catalog and current reference/aspect constraints.
- Only explicit Provider/Model changes write the preference. Automatic
  initialization and compatibility fallback do not overwrite it.
- A caller-owned `initialEnginePreference` suppresses shared writes, preserving
  Cinematic Storyboard's accepted-render-only contract.
- Unit tests cover normalization, incomplete values and actor isolation;
  resolver and shared component regressions cover compatibility fallback and
  existing consumers.
