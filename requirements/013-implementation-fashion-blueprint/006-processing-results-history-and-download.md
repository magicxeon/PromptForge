# Processing, Results, History and Download

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Actor-owned recovery, grouped operations and result actions implemented; validation pending

Grouped polling shows each product status/result and partial failures. Canonical
QueueManager history remains authoritative; completed items expose Download,
Add to Collection, and Share controls.

## 1. Business Requirement

After confirmation, users can understand progress, inspect outputs by outfit,
recover from partial failure and download useful images without losing work.

## 2. Run Structure

```text
FashionBlueprintRun
  -> Product Item
      -> Shot Operation
          -> Generation Job/Attempt
          -> Result Asset
```

Run states:

```text
queued | processing | partially_completed | completed | failed | cancelled
```

## 3. Active Processing UX

- Navigate/scroll to the shared active render surface after submission.
- Show overall progress and per-outfit status.
- Preserve successful results while other operations continue/fail.
- Poll authoritative status using existing generation/history service.
- Provide `Back to setup` without cancelling accepted work.
- Explain credit release/refund with user-facing stable error codes.
- Distinguish `Test image` from `Batch generation` in status copy.
- After proof completion, present `Approve and generate remaining`,
  `Adjust setup` and `Try another test` without obscuring the result.

Reuse:

- `web/src/components/generation/GenerationResultSurface.tsx`
- `web/src/components/generation/GenerationQueueStatus.tsx`
- TanStack Query history/run polling and actor-scoped APIs
- shared media detail/viewer components
- existing collection/save/share actions where permitted

The expert-reviewed layout, queue placement, empty/progress states, accepted-run
scroll behavior and compact recent Fashion results are owned by
`010-fashion-blueprint-ux-review-and-production-results-experience.md`.

Every run, operation, generation job and related credit record must carry the
correlation contract defined by
`010-platform-correlation-tracing-and-credit-recovery.md`. Trace events support
diagnosis; the Fashion run and Credit ledger remain the business sources of
truth.

The current `FashionRunResults` prototype is embedded in
`FashionBlueprintRoute.tsx`. Extract it only when adding Product/shot grouping,
and pass normalized result items into shared presentation. It must not copy the
Studio or Playground result surface.

## 4. Result Grouping

```text
Outfit 1 / SKU
  Cover | Fit | Detail | Lifestyle
Outfit 2 / SKU
  Cover | Fit | Detail | Lifestyle
```

Each result shows:

- shot purpose
- status
- charged credits when relevant
- download
- keep/add to Collection
- approve/reject when commercial approval feature is enabled
- regenerate with a fresh quote when billable

An approved proof occupies its original Product/shot position in the same
grouping as continuation results. The UI may label it `Approved test`, but it
must not create a duplicate card when the remaining Batch completes.

If setup changes after proof generation, keep the proof in History and show it
as not applicable to the current setup. Never remove a paid output merely
because continuation eligibility was invalidated.

## 5. Download

MVP:

- download individual result
- download selected successful results (pending)
- deterministic filename using sanitized Product/SKU and shot key

Later commercial export presets are owned by
`requirements/013-implementation-commercial-feature-plan/Phase2-16-marketplace-export-presets.md`.

## 6. History

History record includes:

```text
fashionBlueprintRunId
templateVersionId
characterProfileVersionId
productItemKey/productId
shotKey
poseKey
generation settings snapshot
quote/credit references
referenceProcessingLineage
templateUseContext
runPurpose: proof | full | continuation
proofContext?
continuationOfProofRunId?
```

History remains owner-scoped. Sharing is an explicit action through Community.

Every submitted generation request includes:

```text
sourceType: fashion_blueprint
fashionBlueprintRunId
fashionOperationId
productItemKey
characterProfileContext
```

The existing Character usage service records Fashion usage only after a
successful eligible output. Failed, rejected or cancelled operations do not
increase Character popularity.

## 7. Acceptance Tests

- Refresh/restart preserves accepted run and completed results.
- Partial failure does not hide successful outputs.
- Results group under correct outfit/shot.
- Download never exposes another actor's asset.
- Empty/queued/result states do not overlap or display contradictory text.
- Mobile result groups remain navigable and image details open correctly.
- Every successful result retains Template version/use session, Character
  version, Product Item, outfit scope and Reference Processing lineage.
- Restart recovery never creates a second charge or duplicate job for an
  already accepted operation.

## 8. Implementation Plan

1. Normalize Fashion operations into shared result/media item contracts.
2. Extract Product/shot grouping from the route without copying generic media
   actions.
3. Persist sufficient operation lineage for refresh/server-restart recovery.
4. Add deterministic individual/selected download behavior and filenames.
5. Test queued, partial, failed, completed, mobile viewer and cross-actor asset
   access states.
