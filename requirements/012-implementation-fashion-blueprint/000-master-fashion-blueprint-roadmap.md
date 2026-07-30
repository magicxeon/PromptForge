# Fashion Blueprint Master Roadmap

**Status:** React prototype implemented; MVP completion and release validation pending

**Canonical implementation:** `web/src/features/fashion-blueprint/`,
`server/domain/fashion-blueprint/`, `server/repositories/fashion-blueprint/`,
and `server/app/routes/fashionBlueprintRoutes.js`. Legacy `client/` modules are
not implementation owners and must not be recreated.
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
- Front reference is required; back is optional. Detail references are reserved
  until Template, Reference Processing and provider contracts expose that role.
- A Template shows an actual final-result preview.
- A Template supplies scene, lighting, composition and a small pose-variation
  pack.
- User may keep the Template environment or choose a compatible curated
  environment.
- Simple Mode tiers: `draft`, `selling_quality`, `premium_campaign`.
- Advanced Mode reuses provider/model/quality/resolution/reference controls.
  AI model Comparison is disabled for the Fashion MVP because outfit batches
  already create multiple billable operations.
- The current prototype produces one output per outfit. MVP shot packs may
  produce multiple outputs only after the immutable Template version exposes a
  validated `outputRecipe`; output count must never be inferred in the client.
- Pricing is calculated and explicitly confirmed before processing.
- Results remain in actor-scoped history and may be downloaded or collected.

## 3. Dependency Map

| Dependency | Use |
|---|---|
| Character Profile `006` | Character selection and canonical reference |
| Visual Character Builder `003` | Character source and attribute contracts |
| Scene Builder `004` | Template variables, slot mapping and hydration |
| Community `005` | Template/Character discovery and attribution |
| Shared generation controls | Engine, references, action and results; Comparison stays disabled |
| Clothing modules | Outfit reference and clothing ownership rules |
| Credits | estimate, reservation, capture and refund |
| `requirements/000-business-overview/06-simple-and-advanced-provider-routing.md` | Simple tier policy and Advanced provider boundary |
| `requirements/000-business-overview/03-ai-provider-costs-and-credits.md` | Credit-rate source and margin assumptions |
| `requirements/Concept/infrastructure-gcloud.md` | Adapter boundary for storage, jobs and secrets |
| User Profile `007` | Creator attribution and navigation to Character owners |
| Navigation/UI adjustment `008` | Studio hierarchy, route context and breadcrumbs |
| Commercial plan `013` | PostgreSQL, Cloud Storage, durable jobs, payments |
| Reference Processing Pipeline `011` | Shared reference-role authority, Outfit isolation, preprocessing policy and processing lineage |

Fashion Blueprint builds a validated generation plan. It does not call providers,
mutate credits, duplicate Scene Template resolution or create its own result
pipeline.

### Current application entry contract

- Customer-facing name: `Fashion Studio`.
- Canonical route: `/create/fashion`.
- Navigation placement: child of `Studio`.
- The React route and navigation entry are registered in
  `web/src/app/routeRegistry/routes.ts`.
- Fashion Studio is its own React route/state owner. It is **not** a Studio
  generation mode and must not mount inside the Studio configurator.
- The route may remain available for internal prototype testing while public
  discovery, Bulk, Advanced and Community Template entry points are controlled
  independently by server-owned feature exposure.
- Existing Home, Studio and detail navigation context must remain intact.

### 3.1 Current Prototype Baseline And Remaining MVP Gaps

| Capability | Current baseline | Required before MVP release |
|---|---|---|
| Template | Community Template post creates an actor-bound Template use session | Filter to Fashion-compatible published versions and display final preview, input contract and version |
| Character | Authorized `fashion_blueprint` handoff is revalidated server-side | Recommended/My/Community picker states and unavailable-default fallback |
| Outfit | One to five front references; back optional; actor-owned asset URLs | Explicit `outfitScope`, clearer per-item validation, optional detail role only after policy support |
| Reference processing | Shared authority plan, deterministic normalization, provider ordering and lineage | Show shared processing preview/warnings in Fashion and run cross-surface E2E |
| Direction | One pose and environment direction per run | Versioned curated packs and optional bounded per-item pose assignment |
| Routing | Simple tier selection and shared Advanced engine component | Move Simple route preferences from code into server configuration |
| Quote | Per-item estimates and aggregate maximum | Display expiry, per-operation breakdown, Template fee and processing warnings |
| Run | Atomic plan reservation, canonical queue and partial status | Cancellation/retry policy, richer grouped results and complete restart recovery test |
| Outputs | One output per Product Item | Template-owned shot recipe and deterministic Product/shot grouping |

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
4 Direction (optional)
5 Quality, Review & Price
6 Generate & Results
```

The Character step defaults to the Template's allowed model when available:

```text
Use this Template model (recommended)
Choose another model
Use one of my models
```

A beginner can accept the recommended model with one action and continue
directly to Outfit upload.

Progressive controls:

- `Adjust pose` expands pose choices.
- `Change environment` expands compatible environments.
- `Advanced` exposes Engine & Target Output and supported reference controls
  with Comparison disabled.
- Bulk upload appears after `Add another outfit`.

The summary remains visible before confirmation:

```text
Template + Character + outfit count + outputs + quality + maximum credits
```

### 5.1 Canonical End-to-End Process

```text
0. Enter Fashion Studio
   -> /create/fashion through the shared shell
   -> restore or create an actor-scoped Fashion draft

1. Select Template
   -> resolve active immutable Template version
   -> show final-result preview, supported products and included shot recipe

2. Select Model
   -> use Template recommendation, My Models or Community Models
   -> request authorized fashion_blueprint Character handoff
   -> bind reusable Character profile/version and attribution

3. Add Outfit Products
   -> upload front (required), back/detail (optional)
   -> register private owner-scoped reference assets
   -> store only asset/reference IDs in the draft

4. Adjust Direction (optional)
   -> keep Template pose/environment defaults or choose allowed overrides
   -> resolve Character/outfit/Template/pose ownership precedence
   -> future Bulk Pose Variation may assign a bounded subtle pose per Product
      Item without changing Character, Outfit, Template scene or visual style

5. Choose Generation Mode
   -> Simple: Draft, Selling Quality or Premium Campaign
   -> Advanced: provider/model/quality/resolution supported by catalog
   -> Comparison remains off for Fashion MVP

6. Resolve Plan and Quote
   -> server revalidates Template, Character, assets and provider capability
   -> run the canonical Reference Processing Pipeline for every Product Item
   -> bind processed reference count and processing-plan fingerprint
   -> expand Product Items into deterministic shot operations
   -> lock one credit estimate per operation
   -> return aggregate maximum price, warnings and expiry

7. Confirm and Reserve
   -> reject any stale draft/quote
   -> atomically reserve aggregate maximum with one idempotency key
   -> create one Fashion run and operation records

8. Process
   -> submit operations through canonical generation/queue services
   -> capture successful usage and release failed/unused reservation
   -> preserve partial success

9. Review Results
   -> group shared result cards by Product Item and shot purpose
   -> download, collect or explicitly share eligible outputs
   -> write actor-scoped history and successful Character usage
```

Every Back/forward/detail journey uses shared navigation context. Switching
actor invalidates the visible draft, handoff and quote before rendering the new
actor's state.

## 6. Core Plan

```text
FashionBlueprintPlan
- projectId?
- templateVersionId
- characterProfileId
- characterProfileVersionId
- productItems[]
- productItems[].outfitScope: full_look | top_only | bottom_only | single_item
- poseVariationPackVersionId
- environmentSelection
- routingMode: simple | advanced
- qualityTier?
- providerModelSnapshot?
- outputRecipe
- quoteId
- operationEstimateIds[]
- referenceProcessingPlanFingerprintByOperation
- idempotencyKey
```

The server validates all IDs, ownership, provider capability, output count,
reference count and quote consistency before accepting the plan.

### 6.1 Remaining Implementation Order To Minimize Rework

```text
1. Align `001` with Template Core immutable versions and Fashion compatibility.
2. Finish `003` Product Item/outfit-scope UI on the shared Reference controls.
3. Move `004` Simple routing tiers into server configuration.
4. Extend `002` direction packs and resolve optional per-item pose assignments.
5. Extend `005` quote DTO with operation breakdown, expiry and processing
   fingerprints already enforced by the server.
6. Finish `006` shot grouping, recovery and result actions using shared media
   components.
7. Complete `008` automated/manual QA, then enable public entry flags in the
   rollout order.
```

The route may remain visible for internal prototype validation. Public entry
flags must remain closed until step 7 passes.

## 7. Non-Goals

- Jewelry, shoes, bags or non-wearable product preservation
- Automatic garment segmentation or virtual try-on guarantees
- Unlimited bulk runs
- User-authored raw prompts in Simple Mode
- Automatic AI provider router in the first implementation
- Per-item automatic pose variation for Bulk Outfit runs in the first
  implementation; its deferred contract is defined in
  `002-character-pose-and-environment-selection.md`
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

Production enablement belongs to
`requirements/013-implementation-commercial-feature-plan`.

## 9. Exit Criteria

- A beginner completes a one-outfit Simple run without prompt/provider terms.
- A power user completes an Advanced run using the shared engine component.
- Bulk run supports one to five outfits and partial results.
- Displayed quote matches reserved credits and accepted plan.
- Character, garment, pose and environment ownership do not conflict.
- Every operation uses the shared Reference Processing authority projection,
  processed reference count and immutable plan fingerprint.
- Results group correctly by outfit and shot.
