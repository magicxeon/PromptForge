# 008 - Muse Playground Comparison Mode

Status: Implemented and offline-verified; creator live Comparison check pending
Date: 2026-09-05
Primary: Product And Requirement Architect
Reviewers: Commercial Integrity, Product UX and QA, applied sequentially by
the same agent; no independent review claimed.
Skills: implement-generation-workflow, review-commercial-integrity,
review-generative-media-pipeline, review-product-ux,
verify-release-regressions.
Depends on: 007 Playground-only development testing

## Outcome

Allow `muse-image-1.0` to be selected as one of two to four AI Comparison
slots in Playground after the creator's successful single-image check. Keep
Muse in `internal_testing`; one visually pleasing result is useful evidence but
does not qualify production routing or other generation surfaces.

Comparison is a mode within the `playground` generation surface. It is not a
new surface and does not authorize Muse in Studio, Fashion or Cinematic.

## Scope

- Reuse the existing Comparison configurator, estimate/create endpoints,
  Comparison Orchestrator, Generation queue, result stage and History.
- Treat a server-resolved `testingRoutingEnabled: true` as selectable in
  Comparison, even while public paid routing remains false.
- Apply the current draft's reference count and aspect ratio to every slot.
  Muse remains unavailable when references exist or the ratio is unsupported.
- Forward `generationSurface: playground` through Comparison validation so the
  same Provider Registry surface policy used by single generation is enforced.
- Preserve actor-scoped slot preferences only while the selected models remain
  routable in the current catalog/environment.
- Keep one provider request per slot and `n: 1` for Muse.

## Non-Scope

- No production promotion, Studio/Fashion/Cinematic exposure or video use.
- No Muse references, edits, native multi-image requests, fallback provider,
  automatic retry or prompt changes.
- No change to other provider prices, default model order, Comparison result
  layout, polling, winner selection, sharing or History contracts.

## Workflow And Ownership

```text
Playground Comparison controls
  -> POST /api/comparisons/estimate
  -> ComparisonOrchestrator / ComparisonValidator
  -> ProviderRegistry.resolveSelection(..., { generationSurface: playground })
  -> Credit estimate per slot
  -> signed aggregate estimate
  -> POST /api/comparisons
  -> reserve each slot before enqueue
  -> GenerationApplicationService.submitPreparedOperation
  -> provider dispatch / terminal capture or refund / Comparison result
```

Generation remains the provider/queue owner. Credits remains the estimate,
reservation, capture and refund owner. Comparison owns slot validation,
aggregate estimate, grouping and result state. Shared React components only
project server catalog capability and emit slot changes.

## Business And Error Rules

1. Muse is selectable only when the public catalog resolves
   `testingRoutingEnabled: true`; production and staging remain fail-closed.
2. Provider and model selectors use one shared availability rule. A provider
   is disabled only when all of its models are unavailable for the current
   reference count and aspect ratio.
3. Changing provider selects its first currently valid model. No unsupported
   default may be inserted silently.
4. A stale stored Muse slot is discarded when the current catalog no longer
   permits it; valid slots for the active actor remain restorable.
5. Estimate and submit both bind the same surface, slots, aspect ratio,
   references, model IDs, per-slot estimate IDs and aggregate token.
6. Muse contributes 15 Credits per selected slot. The displayed and signed
   total is the sum of all current server estimates, never client catalog math.
7. Reservation occurs independently per slot before its queue admission.
   Successful slots capture once; failed slots refund once; partial results
   remain available under the existing Comparison lifecycle.
8. Missing credentials, restricted environment, unsupported references or
   ratio, stale estimate and insufficient Credits retain visible existing
   errors and create no hidden provider fallback.

## Implementation Steps

1. Add this requirement and retain 007 as the single-image activation record.
2. Reuse `imageModelUnavailableReason` in the Comparison configurator for
   provider/model availability, reference and ratio checks.
3. Pass the common reference count and aspect ratio from EngineTargetPanel to
   the Comparison configurator.
   Hide exact pixel dimensions when any selected slot is aspect-ratio-only;
   keep the common aspect-ratio control visible.
4. Normalize actor-scoped stored slots against current routability so a
   development-only Muse choice cannot survive into a blocked environment.
5. Pass `context.generationSurface` to Provider Registry in Comparison
   validation. Do not weaken the registry allowlist.
6. Add server tests for Playground acceptance and missing/Cinematic/production
   rejection; add UI tests for selectable Muse, reference blocking and stored
   preference cleanup.
7. Run the focused Muse, Comparison, Credit, React, i18n, build and responsive
   checks without a live provider request.

## Acceptance Criteria

- Playground Comparison can select Muse in any eligible slot.
- Muse remains disabled when the draft contains a reference.
- Muse is rejected by the server when the surface is absent or not Playground,
  even if a client tampers with its payload.
- A two-slot quote containing one Muse slot includes exactly 15 Muse Credits
  plus the other slot's current authoritative quote.
- A Comparison containing Muse does not claim exact output pixel dimensions
  that the provider does not guarantee.
- Submitting the signed quote keeps one reservation and one Job per slot.
- Existing providers and single-image Muse generation retain behavior.
- UI remains operable in all themes at 390, 820 and 1440 pixels without a new
  Comparison layout or duplicate workflow.

## Creator Check After Offline Verification

In `/create/playground`, enable Compare models, select Muse in one slot and an
existing text-to-image model in another, use one output with no references,
and verify the aggregate quote before Generate. Confirm both queue rows,
independent progress, side-by-side results, Comparison detail and History.
This is a creator-owned paid test; the agent does not submit it.

## Implementation Checkpoint

- Comparison provider/model options now use the shared model availability rule
  for development routing, references and aspect ratios. Provider changes and
  Add model choose a currently valid model rather than a blocked default.
- EngineTargetPanel forwards the common request constraints and suppresses
  exact pixel dimensions when any slot is aspect-ratio-only. Muse slots carry
  a compact localized Internal test disclosure.
- Actor-scoped stored slots discard models that are no longer routable in the
  current environment. No Job, estimate, prompt or reference state was added
  to browser persistence.
- Comparison reference preparation and final validation both pass the compiled
  `generationSurface` into Provider Registry. The signed estimate fingerprint
  now also binds that surface.
- No provider price, adapter payload, Queue lifecycle, result layout, History
  contract or non-Playground Muse allowlist changed.

### Validation

- `node scripts/test-meta-muse.js`: 29 tests passed, including a Playground
  Comparison estimate through reference preparation with 15 Credits per Muse
  slot and a 30-Credit two-slot authoritative total.
- Comparison server suite: 23 tests passed for surface enforcement, signed
  estimate binding, persistence, partial settlement, History recovery and
  Community projection.
- Focused React suite: 17 tests passed for Muse selection, reference blocking,
  actor preference cleanup and existing Playground behavior.
- `npm.cmd run build --workspace web`: passed.
- `node scripts/validate-i18n-catalogs.js`: passed.
- `node scripts/test-meta-muse-layout.js`: passed at 390/820/1440px in
  default/fashion/creative themes with all APIs mocked; mobile and desktop
  screenshots were inspected. No live provider request was sent.

Remaining evidence is the creator-owned paid run with Muse plus another model:
confirm the displayed aggregate estimate before submit, independent queue
rows, both terminal results, History entries and actual Credit settlement.
