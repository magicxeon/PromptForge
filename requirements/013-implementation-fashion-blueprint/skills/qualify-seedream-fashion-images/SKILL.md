---
name: qualify-seedream-fashion-images
description: Qualify and tune BytePlus ModelArk Seedream image models for Momelo Fashion Blueprint multi-reference generation. Use when benchmarking Seedream 4.x or 5.x, designing concise image-indexed Fashion prompts, preventing character sheets or image sets, reconciling model-specific size and streaming parameters, or deciding whether a Seedream route is qualified or experimental.
---

# Qualify Seedream Fashion Images

## Read First

1. `../../009-fashion-model-qualification-and-routing-optimization.md`
2. `../../../011-reference-processing-pipeline/001-config-driven-reference-authority-and-preprocessing.md`
3. `references/source-notes.md`
4. Current ModelArk provider adapter, public provider catalog and pricing policy

## Authority Contract

Keep the same role ownership. Seedream prompt optimization must not let the
Template person or Outfit wearer become the Character.

## Workflow

1. Resolve the exact Seedream endpoint/model ID. Treat 4.0, 4.5, 5.0 Lite and
   5.0 Pro as separate candidates.
2. Verify model-specific supported sizes, streaming behavior and reference
   limits from current API documentation.
3. Force a single final image:
   - use the model's single-image operation;
   - set `sequential_image_generation` to `disabled` where supported/required;
   - never use phrases such as `a set`, `a series` or multiple views.
4. Keep English prompt projection concise and below the documented 600-word
   recommendation.
5. Identify every image and retained element explicitly:

```text
Use Image 1 only for scene, pose and framing.
Replace its person with Image 2 identity, skin and body.
Dress that person in Image 3 garment.
Generate one single full-frame photo.
```

6. State fixed elements and exact edit targets. Avoid vague pronouns.
7. Prefer concise coherent natural language over repeated ornate keywords.
8. Explicitly prohibit contact sheets, casting sheets, split screens, labels
   and multiple views because a three-view Character source can trigger them.
9. Set output size/resolution using parameters supported by the exact model;
   also describe the intended vertical composition where documentation requires
   natural-language ratio guidance.
10. Run at least three attempts per model/strategy and score every result.

## Strategy Experiments

Benchmark separately:

```text
seedream-indexed-prose-v1
  concise Image 1/Image 2/Image 3 authority prose

seedream-edit-command-v1
  direct replacement command followed by fixed-element constraints
```

Do not add longer prompts until evidence identifies a missing instruction.

## Failure Classification

Include:

```text
template_identity_leak
character_sheet_reproduction
multi_image_output
outfit_wearer_leak
garment_detail_loss
composition_loss
aspect_ratio_mismatch
unsupported_size
unsupported_stream_parameter
reference_count_mismatch
pricing_breakdown_mismatch
```

## Guardrails

- Do not share one unverified prompt strategy across every Seedream version.
- Do not use unsupported `guidance_scale` for current 4.x/5.x models.
- Do not allow automatic sequential generation in a one-output Fashion plan.
- Do not exceed the quote's processed reference count.
- Do not add Seedream-specific Fashion rules to the transport adapter.
- Do not qualify a model that repeatedly copies the Character's three-view
  layout or Template identity.

## Deliverable

Return the standard Requirement 009 evidence plus:

```text
single/sequential generation parameters
streaming setting
size/resolution request
prompt word count
indexed role mapping
returned image count and dimensions
```

