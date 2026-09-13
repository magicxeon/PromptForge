# 022 - User-Controlled Take Duration

Status: Planned / requirement only (2026-09-13). Not implemented.

## Product Decision

Story Plan timing is a default and directing recommendation, not a mandatory
minimum for each video Take. Users may choose a shorter or longer supported
duration directly in Produce and Generate again without returning to Story Plan.
Creative-quality rules advise; only necessary technical, ownership and commercial
integrity constraints disable submission. Do not replace one unnecessary lock
with mandatory warning acknowledgement or a new approval dialog.

Scope: per-Take duration in Cinematic Produce and its shared embedded Simple
video controls. This is not a global removal of validation or an authorization
to change unrelated settings, pricing, prompts or existing project data now.

## Ownership And Current Gap

- Primary: Product And Requirement Architect. Implementation needs Backend and
  QA review of quote/submit parity; Commercial review if billable contracts
  change, and scoped UX review for controls. Apply reviews sequentially rather
  than claiming independent agents when unavailable.
- Existing owner: CinematicApplicationService quote/create commands and
  CinematicVideoPacketCompiler. Generation owns provider duration reconciliation,
  dispatch and task state; Credits owns estimates/reservations/settlement.
- React owner: CinematicProduceRuntime inside CinematicStageContent.tsx.
  Its current effects reset chosen duration from Shot duration, require it to
  cover the whole planned Shot, and reset it when the latest attempt changes.
- Server preparation and usable-range calculations currently use shot.durationMs.
  Merely unlocking the dropdown would leave prompt, quote and trim inconsistent.
- Extend these canonical contracts. No new provider path, polling loop, client
  capability table, billing service or runtime storage file.

## Behavior

1. Initialize each Shot's Take draft from its planned duration using the selected
   model's real capability catalog. If the default is not directly supported,
   choose a supported initial suggestion through existing reconciliation.
2. After explicit user selection, retain that choice while changing other controls,
   refreshing project/query data, receiving task updates or completing a Take.
   Preserve per-Shot draft choices when switching Shots within the workspace;
   actor switching must not expose another actor's choices. Use existing scoped
   draft ownership; do not create new persistence solely for this requirement.
3. Let users select any valid model-supported duration, both below and above the
   Story Plan duration. No minimum equal to the planned Shot duration. If switching
   models makes an explicit choice unsupported, show the constraint and allow a
   supported choice; do not silently overwrite user intent or silently dispatch
   a different duration.
4. Selection applies to the next Take only. It does not change Story Plan,
   approved Storyboard, source selection, existing Take durations or timeline.
   Duration-only edits require neither new still generation nor reapproval.
5. On duration change, derive a new execution packet with consistent requested
   timing and obtain a fresh quote automatically. Reject stale quote responses;
   enable Generate after the current selection has a valid affordable quote.
   Do not generate automatically when selection changes.
6. Selected usable duration, physical provider render duration and any opening
   buffer are distinct. With White Previs, preserve the existing lead-in policy
   and show the actual billable duration. A buffer is not extra usable dialogue
   time. Unsupported buffer/render combinations remain a technical constraint.
7. Every prompt duration instruction, fingerprint, estimate, submitted request,
   attempt record, media trim/preview and download must describe that Take's
   selected timing consistently. Never tell the provider to perform eight seconds
   of action while requesting a four-second Take, or silently trim a longer Take
   back to the Story Plan's original length.
8. Keep original dialogue and manual timeline data intact. Warn when speech or
   authored events may not fit. Do not shorten words, speed up speech, rescale
   authored timestamps, delete events or run AI rewrite without explicit action.
   Out-of-range creative events may remain advisory in reference/text direction;
   truly invalid structured provider timing must be identified precisely, not
   misreported as a general Story Plan duration lock.
9. New Generate creates a new Take using the existing lifecycle. Preserve every
   prior image/Take and the selected-for-use Take. Do not select the newest Take
   for final assembly automatically. A later timeline edit uses the selected
   media's actual usable range and never reads beyond available media.

## Advisory Versus Blocking

| Condition | Treatment |
| --- | --- |
| Selected duration differs from Story Plan or recommended 4/6/8 seconds | Allowed; do not disable Generate. |
| Speech/action estimate exceeds chosen duration | Concise optional warning, no required acknowledgement. |
| Pacing, gaze or reaction may be weak | Direction advice, not a submission gate. |
| Project target and proposed Take length differ | Allowed; no automatic Project or timeline rewrite. |
| Invalid/nonfinite duration or actual model limit | Block with specific supported values and recovery. |
| Required source missing, unauthorized or materially stale | Preserve existing mode-aware authority checks. |
| Quote pending, expired or mismatched; insufficient Credits | Preserve existing price parity and affordability checks. |
| Submission pending, duplicate request or unresolved financial state | Preserve existing lifecycle/idempotency safeguards. |

Do not falsely label an overridden timing estimate as verified. Advisory status
and permission to submit are distinct. Do not add POC notices, modal explanations
or workflow barriers unrelated to the selected operation.

## Requirement Reconciliation

- This supersedes any assumption in 003 or timing reconciliation that each new
  Take must cover the entire Story Plan duration. Actual source/quote authority
  and final-media technical validity remain required.
- enhancement-core-engine/047 still improves AI default planning and detects
  weak timing. Its estimated-overload findings must not become forced repair,
  forced duration changes or approval/Generate locks for an explicit user choice.
  Automatic direction repair may improve a generated proposal but may not run
  on a user's duration edit without a requested AI operation.
- 014 continues to own preview versus selected Take. Preserve existing 043 White
  Previs usable-range semantics with the newly selected Take duration as input.
- Reference layout 046, dialogue-direction plan 048 and Seedance pricing
  activation remain separately scoped. No unrelated lock cleanup is authorized.

## Ordered Tasks And Acceptance

All tasks remain pending until implementation is requested.

1. Trace default versus explicit Take timing through UI, packet, quote, request,
   attempt and usable-range readers. Add fixtures for Plan=8s/Take=4s and
   Plan=4s/Take=8s before changing contracts.
2. Extend the canonical per-Take timing contract, preserving old records and
   immutable quotes. Add pure tests for buffer, reference authority and actual
   model limits; keep Story Plan and media ownership unchanged.
3. Update scoped duration controls and draft behavior. Requote after changes;
   query/task refresh must not reset explicit choices. No sibling UI redesign.
4. Make creative timing findings advisory in this flow. Check prompt, quote,
   submission and trim parity with mocked providers; confirm old Takes survive
   and genuine technical/financial failures still block before dispatch.
5. Run focused test groups and responsive EN/TH checks for changed controls at
   about 390, 820 and 1440px. Record the evidence and remaining manual UAT gap.

Extend existing cinematicVideoPacketCompiler, cinematicApplicationService,
CinematicProduceRuntime and produceReadModel tests, plus Generation/Credit parity
tests only where contracts change. Add a selectable duration group to the existing
scripts/test-cinematic-video.js runner; preserve its explicit aggregate entry.
Record exact commands during implementation. Tests use isolated fixtures and
must not submit paid jobs, mutate live projects or restart workers.

Acceptance includes switching Shots and models, stale quote races, pending jobs,
short/long Takes, White Previs buffers, preserved manual text and timestamps,
retained old approvals/media and user-selected final Take. Rollback must preserve
attempt timing metadata and never delete user work.

## Current Delivery

Documentation only. No code/configuration changes, test runs, price changes,
server restarts or live project edits for this request.
