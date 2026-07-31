---
name: qualify-openai-fashion-images
description: Qualify and tune OpenAI GPT Image models for Momelo Fashion Blueprint multi-reference generation. Use when benchmarking OpenAI image models, designing OpenAI-specific Template/Character/Outfit prompt projection, selecting input fidelity and quality, classifying identity or garment failures, or deciding whether an OpenAI route can enter a Fashion Simple tier.
---

# Qualify OpenAI Fashion Images

## Read First

1. `../../009-fashion-model-qualification-and-routing-optimization.md`
2. `../../../011-reference-processing-pipeline/001-config-driven-reference-authority-and-preprocessing.md`
3. `references/source-notes.md`
4. Current OpenAI provider adapter, public provider catalog and pricing policy

## Authority Contract

Never change the canonical Fashion authority:

```text
Template -> pose, camera, framing, environment, lighting
Character -> identity, face, hair, skin tone, body proportions
Outfit -> garment construction, color, pattern, material, details
```

OpenAI-specific work may change image order, edit/generation operation, prompt
projection, quality and supported fidelity parameters. It must not move
authority between roles.

## Workflow

1. Resolve the exact API model ID and capabilities from the current provider
   catalog. Do not infer behavior from a marketing name.
2. Use an image-edit/multi-image workflow when references are supplied.
3. Start from the canonical structured reference brief and project it into
   concise ordered prose:

```text
Goal: one final photorealistic fashion photograph
Base composition: what IMAGE_0 contributes
Character replacement: what IMAGE_1 contributes
Garment transfer: what IMAGE_2 contributes
Keep invariant
Change only
Output constraints
```

4. Explicitly separate what changes from what remains invariant. Restate
   identity, skin, body, scene and garment invariants where drift is costly.
5. Require realistic garment fit, drape, folds, occlusion, lighting and shadow
   integration. Reject pasted-on clothing.
6. Select `input_fidelity` only when the exact model supports it:
   - test `high` for identity-sensitive `gpt-image-1` and `gpt-image-1.5`;
   - do not send unsupported `input_fidelity` to newer models whose catalog
     declares it unavailable.
7. Keep output size and quality in the benchmark record.
8. Run the same private benchmark fixture at least three times per candidate
   strategy and score every output using Requirement 009.
9. Record retry count and total credits, not only the best image.
10. Recommend `qualified`, `experimental`, `failed` or `blocked`. Do not edit
    Simple routing until score, quote parity and repeatability gates pass.

## Strategy Experiments

Benchmark these as separate versioned hypotheses:

```text
openai-base-template-v1
  IMAGE_0 Template as composition base
  IMAGE_1 Character replacement authority
  IMAGE_2 Outfit garment authority

openai-base-character-v1
  IMAGE_0 Character as identity base
  Template described/applied as composition target
  Outfit applied as garment-only edit
```

The second strategy is allowed only when the transport and reference pipeline
can preserve the Template's composition without falsely treating Template
identity as authoritative. Never choose a strategy from one attractive output.

## Failure Classification

Classify at least:

```text
template_identity_leak
character_identity_drift
skin_tone_drift
body_proportion_drift
garment_source_wearer_leak
garment_detail_loss
template_composition_loss
multi_panel_output
text_or_watermark_added
quote_request_mismatch
unsupported_parameter
```

## Guardrails

- Do not assume a newer OpenAI model is configured or priced in Momelo merely
  because the documentation recommends it.
- Do not copy Fashion prompt logic into `OpenAIProvider.js`.
- Do not pass raw private images into benchmark documentation.
- Do not use one giant decorative prompt. Prefer a clear edit specification.
- Do not optimize only for face similarity while losing garment or Template
  composition.
- Do not qualify `gpt-image-1-mini` from cost alone.

## Deliverable

Return:

```text
provider/model ID
strategy ID/version
reference order
quality/input-fidelity/size
three-run score table
failure classes
credits and retries
qualification recommendation
known limitations
required config/test changes
```

