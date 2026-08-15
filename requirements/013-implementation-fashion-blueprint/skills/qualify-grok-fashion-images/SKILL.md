---
name: qualify-grok-fashion-images
description: Qualify and tune xAI Grok Imagine image models for Momelo Fashion Blueprint multi-reference generation. Use when fixing the Grok Fashion estimate gate, benchmarking Grok's three-image editing limit, choosing reference order and aspect-ratio behavior, or deciding whether a Grok route can be offered as experimental or Simple Fashion.
---

# Qualify Grok Fashion Images

## Read First

1. `../../009-fashion-model-qualification-and-routing-optimization.md`
2. `../../../011-reference-processing-pipeline/001-config-driven-reference-authority-and-preprocessing.md`
3. `references/source-notes.md`
4. Current Grok provider adapter, public provider catalog and pricing policy

## Entry Gate

Do not evaluate image fidelity until the Fashion quote and generation request
reserve successfully with identical:

```text
provider/model
resolution
aspect ratio
reference count
output count
Template use session
Reference Processing fingerprint
```

Classify an estimate mismatch as `blocked`, not as a model-quality failure.

## Capacity Contract

Current official xAI multi-image editing accepts up to three source images.
The baseline Fashion mapping therefore uses exactly:

```text
IMAGE_0 Template
IMAGE_1 Character
IMAGE_2 Outfit
```

If a plan needs Outfit back/detail or another role:

- do not silently drop it;
- do not exceed the provider limit;
- require an approved Reference Processing derivative that combines related
  garment views into one role-owned reference, or classify the route as
  unsupported for that plan.

## Workflow

1. Resolve the exact Grok Imagine image model and API operation.
2. Use multi-image editing for referenced Fashion composition.
3. Send sources in recorded deterministic order.
4. Set `aspect_ratio` explicitly. Do not rely on the first image's default ratio.
5. Use concise ordered prose that identifies each source:

```text
Create one final fashion photo.
Keep composition from IMAGE_0.
Replace the person with IMAGE_1 identity/body.
Apply only the garment from IMAGE_2.
Preserve ...
Do not ...
```

6. Keep the output count at one for qualification.
7. Run the same strategy at least three times after quote parity is fixed.
8. Score all attempts and capture the provider request ID for diagnosis.
9. Test another image order only as a separately versioned strategy.
10. Keep the route experimental until repeatability and credit gates pass.

## Failure Classification

Include:

```text
estimate_request_mismatch
reference_limit_exceeded
first_image_ratio_leak
template_identity_leak
identity_blending
garment_source_wearer_leak
garment_detail_loss
composition_loss
unexpected_extra_subject
provider_error
```

## Guardrails

- Do not use the inaccessible X article as the only technical source; verify
  transport and limits against official xAI developer documentation.
- Do not send four raw references to a three-reference operation.
- Do not let the first input silently choose output ratio.
- Do not bury Fashion rules in `GrokImagineProvider.js`.
- Do not approve Simple routing from a single successful image.

## Deliverable

Return the standard Requirement 009 evidence plus:

```text
locked-estimate parity result
three-reference mapping
explicit aspect ratio
provider request IDs
unsupported-plan conditions
```

