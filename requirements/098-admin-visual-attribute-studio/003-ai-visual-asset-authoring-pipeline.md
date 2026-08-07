# 003 - AI Visual Asset Authoring Pipeline

**Status:** Planned  
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
  -> Generation application service
  -> queue/progress/error state
  -> Assets repository
  -> deterministic derivatives
  -> candidate comparison
  -> approve one asset set
  -> attach to draft revision
```

## Asset Set

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

Use Sharp through the shared image-processing owner for derivatives. Do not
embed Base64 in catalog records or durable browser state.

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

- Estimate before execution.
- Use an audited Admin/system generation budget through Credits.
- Show queued, processing, completed, failed and cancelled states.
- Preserve failed candidates for support only according to retention policy.
- Retrying uses idempotency and never silently double-charges.

## Acceptance Criteria

- At least one option from each visual family can complete the workflow.
- Three generated variants can be compared without layout shift.
- Approved derivatives and metadata are reproducible and securely served.
- Provider failure leaves the Attribute draft editable.
- Published catalog never references an unapproved or missing asset.

