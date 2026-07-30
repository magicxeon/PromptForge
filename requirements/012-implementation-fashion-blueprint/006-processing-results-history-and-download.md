# Processing, Results, History and Download

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** React MVP implemented; final validation pending

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

Reuse:

- `generationResultSurface.js`
- history polling and actor-scoped APIs
- result lightbox/detail components
- existing collection/save/share actions where permitted

`generationResultSurface.js` remains the shared result-card/lightbox owner.
`fashionRunResults.js` provides only the Product Item/shot grouping adapter and
passes normalized result items into shared presentation. It must not copy the
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

## 5. Download

MVP:

- download individual result
- download selected successful results
- deterministic filename using sanitized Product/SKU and shot key

Later commercial export presets are owned by
`requirements/011-implementation-commercial-feature-plan/Phase2-16-marketplace-export-presets.md`.

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
