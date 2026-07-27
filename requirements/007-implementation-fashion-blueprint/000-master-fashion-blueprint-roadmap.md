# Fashion Blueprint Master Roadmap

**Status:** Proposed for implementation before the commercial infrastructure cutover  
**Goal:** Give non-technical fashion sellers a short, predictable workflow that
turns clothing references into e-commerce-ready model images.

## 1. Product Promise

```text
Choose a finished-look Template
-> choose a reusable Character
-> upload one outfit or up to five outfits
-> optionally adjust pose/environment
-> choose quality
-> see maximum price
-> generate, review and download
```

The user does not need to write a prompt, understand providers or configure a
camera in Simple Mode.

## 2. MVP Decisions

- Focus: wearable fashion for e-commerce.
- Supported initial product types: tops, bottoms, dresses and clothing sets.
- Single upload: one outfit.
- Bulk upload: maximum five outfits per Blueprint run.
- Front reference is required; back/detail are optional.
- A Template shows an actual final-result preview.
- A Template supplies scene, lighting, composition and a small pose-variation
  pack.
- User may keep the Template environment or choose a compatible curated
  environment.
- Simple Mode tiers: `draft`, `selling_quality`, `premium_campaign`.
- Advanced Mode reuses provider/model/quality/resolution/reference/comparison
  controls.
- Initial pack produces three or four outputs per outfit according to Template
  version.
- Pricing is calculated and explicitly confirmed before processing.
- Results remain in actor-scoped history and may be downloaded or collected.

## 3. Dependency Map

| Dependency | Use |
|---|---|
| Character Profile `006` | Character selection and canonical reference |
| Visual Character Builder `003` | Character source and attribute contracts |
| Scene Builder `004` | Template variables, slot mapping and hydration |
| Community `005` | Template/Character discovery and attribution |
| Shared generation controls | Engine, references, action, results, comparison |
| Clothing modules | Outfit reference and clothing ownership rules |
| Credits | estimate, reservation, capture and refund |
| Commercial plan `008` | PostgreSQL, Cloud Storage, durable jobs, payments |

Fashion Blueprint builds a validated generation plan. It does not call providers,
mutate credits, duplicate Scene Template resolution or create its own result
pipeline.

## 4. Requirement Sequence

| Requirement | Purpose |
|---|---|
| `001-fashion-blueprint-template-contract.md` | Final preview, recipe, slots and versioning |
| `002-character-pose-and-environment-selection.md` | Character binding and simple variation controls |
| `003-outfit-upload-single-and-bulk.md` | Product references and validation |
| `004-simple-and-advanced-generation-modes.md` | Beginner tiers and power-user controls |
| `005-quote-credit-and-generation-plan.md` | Deterministic price and execution plan |
| `006-processing-results-history-and-download.md` | Queue, progress, review and output |
| `007-component-reuse-and-module-architecture.md` | File ownership and reuse boundaries |
| `008-fashion-blueprint-qa-and-release-gates.md` | E2E, safety and rollout |

## 5. UX Flow

Default collapsed flow:

```text
1 Template
2 Character
3 Outfit
4 Quality & Price
5 Generate
```

Progressive controls:

- `Adjust pose` expands pose choices.
- `Change environment` expands compatible environments.
- `Advanced` exposes Engine & Target Output and reference controls.
- Bulk upload appears after `Add another outfit`.

The summary remains visible before confirmation:

```text
Template + Character + outfit count + outputs + quality + maximum credits
```

## 6. Core Plan

```text
FashionBlueprintPlan
- projectId?
- blueprintTemplateVersionId
- characterProfileVersionId
- productItems[]
- poseVariationPackVersionId
- environmentSelection
- routingMode: simple | advanced
- qualityTier?
- providerModelSnapshot?
- outputRecipe
- quoteId
- idempotencyKey
```

The server validates all IDs, ownership, provider capability, output count,
reference count and quote consistency before accepting the plan.

## 7. Non-Goals

- Jewelry, shoes, bags or non-wearable product preservation
- Automatic garment segmentation or virtual try-on guarantees
- Unlimited bulk runs
- User-authored raw prompts in Simple Mode
- Automatic AI provider router in the first implementation
- Character royalty/payout
- Video generation
- Full image editor/retouching

## 8. Commercial Handoff

The feature may first run on current repository adapters for development, but its
contracts must migrate unchanged to:

- PostgreSQL-owned Projects, Products, Plans, Quotes and Jobs
- private Cloud Storage assets
- Cloud Tasks and Cloud Run Worker
- real authentication and payment-backed credits

Production enablement belongs to `requirements/008-implementation-commercial-feature-plan`.

## 9. Exit Criteria

- A beginner completes a one-outfit Simple run without prompt/provider terms.
- A power user completes an Advanced run using the shared engine component.
- Bulk run supports one to five outfits and partial results.
- Displayed quote matches reserved credits and accepted plan.
- Character, garment, pose and environment ownership do not conflict.
- Results group correctly by outfit and shot.

