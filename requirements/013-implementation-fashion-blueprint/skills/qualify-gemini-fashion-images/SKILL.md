---
name: qualify-gemini-fashion-images
description: Qualify and tune Google Gemini Nano Banana image models for Momelo Fashion Blueprint multi-reference generation. Use when benchmarking Gemini image models, deciding whether Lite or full Nano Banana can preserve Template/Character/Outfit roles, designing Gemini-specific relationship prompts and image ordering, or approving a Gemini route for a Fashion Simple tier.
---

# Qualify Gemini Fashion Images

## Read First

1. `../../009-fashion-model-qualification-and-routing-optimization.md`
2. `../../../011-reference-processing-pipeline/001-config-driven-reference-authority-and-preprocessing.md`
3. `references/source-notes.md`
4. Current Gemini provider adapter, public provider catalog and pricing policy

## Authority Contract

Preserve:

```text
Template -> composition and scene
Character -> identity, skin and body
Outfit -> garment
```

Provider strategy can change projection and image order only.

## Model Gate

- Treat Nano Banana 2 Lite as unsuitable for automatic Fashion
  multi-reference routing unless a future official capability and Momelo
  benchmark prove otherwise.
- Use Nano Banana 2 or a qualified higher-capability model for the three-role
  benchmark because official guidance identifies full Nano Banana 2 as the
  multi-reference consistency workhorse.
- Do not infer qualification from the maximum reference count. Capacity and
  role fidelity are separate gates.

## Workflow

1. Resolve the exact Gemini model ID and capability snapshot.
2. Verify object/character/style reference limits for that model.
3. Start the prompt with a strong operation verb such as `Create`, `Replace` or
   `Compose`.
4. Express the multimodal relationship explicitly:

```text
Use IMAGE_0 only for ...
Replace its person with the exact Character from IMAGE_1 ...
Dress that Character with the garment from IMAGE_2 ...
Create one final scenario ...
```

5. Use stepwise instructions for the complex three-role composition.
6. Describe the desired positive scene and output first. Use concise explicit
   prohibitions for critical failures such as identity blending, multiple
   views, text and casting clothes.
7. Include photographic camera/framing language where Template composition
   needs reinforcement.
8. Set aspect ratio and supported image size through provider parameters, then
   record them in evidence.
9. Run at least three identical attempts per strategy and score all outputs.
10. Keep follow-up conversational editing out of the baseline qualification.
    Baseline must measure one accepted billable operation.

## Strategy Template

```text
Operation
Reference relationships
  IMAGE_0 = Template composition only
  IMAGE_1 = Character identity only
  IMAGE_2 = Outfit garment only
New scenario/output
Preserve
Critical prohibitions
```

Test structured JSON and concise ordered prose as distinct strategy versions.
Do not assume JSON is superior without benchmark evidence.

## Failure Classification

Include:

```text
lite_multi_reference_overload
template_identity_leak
identity_blending
character_skin_or_body_drift
outfit_wearer_leak
garment_detail_loss
template_composition_loss
contact_sheet_output
unexpected_text
reference_limit_exceeded
```

## Guardrails

- Do not route Lite into Simple Fashion because it is cheap.
- Do not send more role references than the exact model supports.
- Do not describe every negative before stating the intended image.
- Do not use conversational retries to hide a weak first-pass route.
- Do not place this strategy inside the Gemini transport adapter.

## Deliverable

Return the standard Requirement 009 evidence plus:

```text
object/character/style reference counts
projection format
image relationship wording
image size/aspect-ratio parameters
first-pass versus follow-up result distinction
```

