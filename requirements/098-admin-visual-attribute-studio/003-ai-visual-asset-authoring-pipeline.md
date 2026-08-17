# 003 - AI Visual Asset Authoring Pipeline

**Status:** Implemented for generated and uploaded candidate approval; manual family qualification remains
**Depends on:** 001, 002 and canonical Generation/Assets capabilities

## Objective

Allow Admin to generate, upload, compare and approve consistent visual assets
for Attribute options without calling an AI provider from the Admin UI.

## Supported Visual Families

- monochrome facial-feature illustration
- hairstyle silhouette/illustration
- body silhouette and proportion diagram
- outfit and garment illustration
- pattern/material/surface swatch
- pose or framing diagram
- uploaded approved visual

Color-only choices should use CSS swatches unless form materially changes.

## Authoring Request

The Admin supplies:

- option draft and intended semantic difference
- visual family and visual style version
- target presentation variant when relevant
- required viewpoints and crop
- optional approved reference image
- number of candidates within a bounded limit

The system derives the generation prompt from a versioned visual-style recipe.
Admin free text may supplement but not replace required constraints.

## Generation Flow

```text
Admin draft
  -> validate semantic option
  -> request asset candidates
  -> Generation application service and Generation Group when output count > 1
  -> queue/progress/error state
  -> Assets repository
  -> deterministic derivatives
  -> candidate comparison
  -> approve one asset set
  -> attach to draft revision
```

## Asset Set

## Upload And Normalize Flow

```text
Admin option draft
  -> upload source image through Assets
  -> validate MIME, dimensions, ownership and safety
  -> apply the selected Field's approved presentation profile
  -> create deterministic preview and thumbnail derivatives
  -> compare in the same candidate workspace as generated images
  -> approve or reject with reviewer notes
  -> attach approved asset set to the option revision
```

Normalization may apply contain/cover presentation, background treatment,
focal point, safe padding and theme-aware mask metadata. It must not silently
redraw or materially alter the Attribute meaning. When an uploaded image cannot
match the established visual family, the UI explains the mismatch and allows
the Admin to replace it or explicitly create a new style-recipe version.

Generated and uploaded candidates share one lifecycle and one approval model.
The source type and processing provenance remain visible in History.

An approved set contains:

- original/master
- preview derivative
- thumbnail derivative
- MIME type, dimensions, byte size and content hash
- focal point or attention crop metadata
- localized alt text
- style/version provenance
- generation job and model reference
- reviewer and approval timestamp

Approved generated visuals are persisted under
`client/outputs/attribute-visuals/<actor-id>/`. Assets owns deterministic WebP
preview and thumbnail derivatives through versioned image-presentation
profiles. Catalog records retain URLs and provenance only.

Uploaded candidate originals are persisted under
`client/outputs/attribute-visual-uploads/<actor-id>/` through the canonical
Reference Asset workflow. Approval verifies actor ownership before producing
the same bounded derivative set used by generated candidates.

Use the existing Generation thumbnail service or Assets image-presentation
owner for reviewed derivatives; do not create an Attribute-local Sharp helper.
Do not embed Base64 in catalog records or durable browser state.

## Visual Consistency Gates

- same framing, scale and line/tonal style within a field
- transparent or prescribed background
- no text, labels, logos or watermark unless the visual family requires them
- clear difference from sibling options
- no unintended identity or protected-trait inference
- age and anatomy safety policy compliance
- visual still understandable at thumbnail size
- text fallback remains available when media fails

## Cost and Failure Handling

- Estimate before execution using the same submitted provider, model,
  resolution, reference count and output count.
- Use an audited Admin/system generation budget through Credits.
- Show queued, processing, completed, failed and cancelled states.
- Preserve failed candidates for support only according to retention policy.
- Retrying uses idempotency and never silently double-charges.

Candidate batches use the existing bounded multi-output Generation contract
(maximum four outputs). The Admin MVP defaults to three candidates. Polling and
terminal failure handling reuse the shared Generation Group/result contracts.

## Acceptance Criteria

- At least one option from each visual family can complete the workflow.
- Three generated variants can be compared without layout shift.
- Approved derivatives and metadata are reproducible and securely served.
- Provider failure leaves the Attribute draft editable.
- Published catalog never references an unapproved or missing asset.
- An uploaded source can be normalized, previewed and approved without manual
  filesystem or manifest edits.
