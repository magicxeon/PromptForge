---
name: build-fashion-prompt-recipes
description: Design, implement, evaluate, or review the Momelo Fashion Prompt Recipe Lab. Use when extracting prompt and structured photographic evidence from reference images, comparing two-stage and direct extraction, clustering Fashion styles, creating Recipe invariants and variations, qualifying recipes with generated images, or promoting Lab configuration into the Generation pipeline.
---

# Build Fashion Prompt Recipes

## Required Reading

Before changing the Lab, read:

1. Repository `AGENTS.md`.
2. `requirements/099-technical-dept/000-master.md`.
3. `requirements/015-lab-finetune-prompt/000-master-fashion-prompt-recipe-lab.md`.
4. `requirements/013-implementation-fashion-blueprint/010-professional-scene-builder-guided-experience.md`.
5. The canonical Generation and prompt compiler contracts affected by any
   proposed promotion.

## Operating Rules

- Treat the original image as the evidence authority in every extraction pass.
- Never let Stage 2 accept Stage 1 prose as ground truth.
- Separate visible evidence, interpretation and uncertainty.
- Use structured observations for grouping; never average prompt prose.
- Build recipes from invariants, controlled variations and conflict rules.
- Keep reference authority explicit: Character, Outfit, pose/composition and
  environment must not silently overwrite each other.
- Record provenance and license for every source sample.
- Do not infer sensitive traits or fabricate unsupported metadata.
- Keep raw/private images and generated evaluation media outside Git.
- Never import `lab/` code or files from production runtime modules.
- Promote only immutable, schema-validated configuration with tests and a
  rollback version.

## Workflow

1. Choose one narrowly defined style family.
2. Create a manifest for 20-30 licensed, varied reference images.
3. Run prompt-only extraction and retain the provider response metadata.
4. Run structured extraction from the original image.
5. Run direct image-to-JSON extraction as the baseline.
6. Validate schema and audit missing, invented and contradictory observations.
7. Review low-confidence evidence before clustering.
8. Derive a candidate recipe and provider-neutral deterministic prompt.
9. Generate fixed fixtures at least three times per candidate/provider.
10. Record human scores, credits, latency, errors and reproducibility.
11. Promote only when the candidate meets the documented threshold.

## Review Checklist

- Does every claim trace back to visible evidence?
- Are pose, camera, crop, lighting and environment mutually compatible?
- Does the subject receive the light required by the selected lighting style?
- Does the environment look physically plausible and Fashion-appropriate?
- Are identity and garment authority preserved when references are used?
- Does the recipe avoid unrequested props, accessories and duplicate subjects?
- Is optional AI refinement improving language without changing intent?
- Is the result reproducible enough to support a product preset?
- Can the promoted configuration be rolled back without Lab dependencies?

## Handoff

Report:

- style family and dataset manifest version
- extraction schema and runner versions
- two-stage versus direct-baseline findings
- recipe candidate and conflict rules
- providers, fixtures, run count and scoring summary
- cost, latency and failure observations
- promoted artifact path or reason promotion was rejected
- remaining manual review and licensing risk

