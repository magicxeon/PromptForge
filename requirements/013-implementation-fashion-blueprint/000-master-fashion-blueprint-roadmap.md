# Fashion Blueprint Master Roadmap

**Status:** MVP prototype implemented; qualification, UX/tracing hardening and
release validation pending

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
| Commercial plan `014` | PostgreSQL, Cloud Storage, durable jobs, payments and routing promotion |
| Reference Processing Pipeline `011` | Shared reference-role authority, Outfit isolation, preprocessing policy and processing lineage |

Fashion Blueprint builds a validated generation plan. It does not call providers,
mutate credits, duplicate Scene Template resolution or create its own result
pipeline.

## 3.1 Implemented MVP Contract

- Customer flow is four decisions: Template, Character, Products, and
  Review/Test/Generate.
- Draft state is actor-scoped and stores durable asset pointers instead of
  embedded image bytes.
- Product Items carry stable client keys, optional SKU/color notes, product
  type, outfit scope, fidelity level, and front/back asset references.
- Simple quality routing and direction packs are versioned JSON policy under
  `server/config/`; Advanced mode reuses the shared Engine component with
  Comparison disabled.
- Quotes carry immutable Template lineage, setup and per-operation
  fingerprints, operation-level credit breakdown, purpose and expiry.
- Full, one-operation Proof, approval, and Continuation contracts reuse the
  same quote/run repositories. Continuation excludes the approved proof
  operation.
- Runs retain Template/version/community lineage, route/pricing snapshots,
  Product Item/shot identity, partial-success state and actor-owned recovery.

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
| Routing | Server-configured qualified Simple route and shared Advanced engine component | Repeat the qualified baseline, hide unqualified Premium and move broader promotion to Commercial Phase2-19 |
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
| `009-fashion-model-qualification-and-routing-optimization.md` | Completed MVP fidelity gate, Gemini Pose Proxy cache, fixed qualified routing and provider strategy baseline |
| `010-professional-scene-builder-guided-experience.md` | Simplified Scene controls, professional recipes, accordion progression, credit presentation and Scene-to-Fashion-ready handoff |
| `011-fashion-blueprint-ux-review-and-production-results-experience.md` | Expert UX review, Review grouping, shared queue/progress, production results and recent Fashion work |
| `012-platform-correlation-tracing-and-credit-recovery.md` | Cross-platform workflow correlation, provider tracing and safe support credit recovery |
| `013-template-pose-proxy-and-dummy-cache.md` | Deferred Python CV, Stable Diffusion/local Docker alternative to the provider-based Pose Proxy processor |

## 5. UX Flow

Customer-visible flow uses four steps. Direction, quality and pricing remain
part of the final review instead of becoming separate mandatory screens:

```text
1 Choose Template
2 Choose Model
3 Add Products
4 Review, Test & Generate
```

The step count describes decisions the customer must make, not every server
operation. Resolve, reference processing, quote, reservation and queue behavior
remain explicit system states inside the four-step journey.

The Model step defaults to the Template's allowed model when available:

```text
Use this Template model (recommended)
Choose another model
Use one of my models
```

A beginner can accept the recommended model with one action and continue
directly to Outfit upload.

Product entry starts as a single-item flow. The UI must not ask `Single or
Bulk?` before the first upload:

```text
Upload first outfit
-> Continue with one outfit
   or
-> Add another outfit (automatically becomes Bulk, maximum five)
```

Progressive controls in Step 4:

- `Adjust pose` expands pose choices.
- `Change environment` expands compatible environments.
- `Advanced` exposes Engine & Target Output and supported reference controls
  with Comparison disabled.
- Quality defaults to the recommended Simple tier.
- Bulk users are offered a billable one-image proof before committing the
  remaining operations.

A sticky `Your setup` summary remains visible across all four steps:

```text
Template + Character + outfit count + outputs + quality + maximum credits
```

It shows only completed selections and immediate actions such as `Edit Template`
or `Change Model`. Do not duplicate the Stepper with a second `What happens
next` list.

### 5.1 Screen And Interaction Contract

**Step 1 - Choose Template**

- Lead with a real final-result preview.
- Show supported products, included output/shot summary, creator attribution
  and a non-binding credit range.
- Selecting a Template advances to Model without another confirmation screen.

**Step 2 - Choose Model**

- Lead with `Use this model` for the valid Template recommendation.
- Keep `Choose another model` and `Use one of my models` secondary.
- One-click acceptance advances focus to Product upload.

**Step 3 - Add Products**

- Front reference is required; back is optional.
- Product tabs/cards expose Ready, Missing image, Uploading and Error states.
- Product type, Outfit scope and fidelity are visible per Product Item.
- `Add another outfit` progressively enables Bulk without resetting Template,
  Model or shared direction.
- Item errors are local and actionable; no item is silently discarded.

**Step 4 - Review, Test & Generate**

- Show Template, Model, Product count, output count, quality, optional direction,
  processing warnings, quote expiry and complete credit breakdown.
- Pose/environment controls are collapsed and use Template defaults.
- Simple quality is primary and lists only tiers exposed by the server policy;
  unqualified Premium remains hidden. Advanced is opt-in and Comparison remains
  hidden.
- Single Product may generate directly.
- Bulk shows `Generate one test image` as the recommended action and
  `Generate all` as an explicit alternative.

After a successful proof:

```text
Approve and generate remaining
Adjust setup
Try another test
```

An approved proof counts as its exact Product/shot output and must not be
generated or charged again. It may continue into the remaining Batch only when
the immutable setup fingerprint is unchanged.

### 5.2 Canonical End-to-End Process

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

4. Review optional Direction and choose Quality
   -> keep Template pose/environment defaults or choose allowed overrides
   -> resolve Character/outfit/Template/pose ownership precedence
   -> Simple tier is recommended; Advanced remains opt-in
   -> future Bulk Pose Variation may assign a bounded subtle pose per Product
      Item without changing Character, Outfit, Template scene or visual style

5. Resolve Plan and Quote
   -> server revalidates Template, Character, assets and provider capability
   -> run the canonical Reference Processing Pipeline for every Product Item
   -> bind processed reference count and processing-plan fingerprint
   -> expand Product Items into deterministic shot operations
   -> lock one credit estimate per operation
   -> return aggregate maximum price, warnings and expiry

6. Confirm Proof or Full Run
   -> reject any stale draft/quote
   -> Single or Generate All reserves the accepted operation plan
   -> Bulk proof creates a separate one-operation quote/run for the first
      eligible Product/shot operation
   -> approve proof only when its setup fingerprint still matches

7. Process
   -> submit operations through canonical generation/queue services
   -> capture successful usage and release failed/unused reservation
   -> preserve partial success
   -> continuation quote excludes an already approved proof operation

8. Review Results
   -> group shared result cards by Product Item and shot purpose
   -> download, collect or explicitly share eligible outputs
   -> write actor-scoped history and successful Character usage
```

Every Back/forward/detail journey uses shared navigation context. Switching
actor invalidates the visible draft, handoff and quote before rendering the new
actor's state.

### 5.3 UX And System Impact

| Area | Required impact |
|---|---|
| Navigation/state | Replace six customer-visible steps with four while preserving internal resolve/quote/run states |
| Draft | Persist current step, Template, Model, Product Items, optional direction and separate Simple/Advanced settings actor-scoped |
| Product UX | Infer Single/Bulk from Product Item count; do not persist a competing mode flag |
| Quote | Support full-plan and one-operation proof quotes with clear expiry and credit components |
| Run | Record purpose `proof` or `full`, exact operation IDs and immutable setup fingerprint |
| Continuation | Approving proof quotes only remaining operations and never bills the accepted proof twice |
| Results | Merge approved proof and continuation outputs into one customer-visible campaign grouping |
| Invalidations | Any Template, Model, Product/reference, scope, fidelity, direction, quality, route or recipe change invalidates quote and proof continuation eligibility |
| Components | Reuse Template cards, Character cards, Reference controls, Engine panel, warning UI, credit summary and result media components |
| Responsive UI | Desktop uses sticky summary; mobile exposes the same summary as a collapsible sheet without hiding the primary action |
| Accessibility/i18n | Every state and CTA uses localized text, keyboard focus movement and text in addition to color/status icons |

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
3. Complete `009` qualification benchmark and approve the first Fashion-safe
   Simple routing matrix.
4. Move `004` Simple routing tiers into server configuration and require an
   approved qualification record.
5. Implement the qualified Gemini Lite Pose Proxy and Template cache in `009`;
   retain `013` only as a deferred local-processing alternative.
6. Extend `002` direction packs and resolve optional per-item pose assignments.
7. Extend `005` quote DTO with operation breakdown, expiry and processing
   fingerprints already enforced by the server.
8. Finish `006` shot grouping, recovery and result actions using shared media
   components.
9. Complete `011` expert-reviewed Review/production UX using shared queue and
   result components.
10. Implement the Fashion vertical slice of `012-platform-correlation-tracing-and-credit-recovery.md`
   and prove
   credit recovery before paid pilot operations.
11. Complete `008` automated/manual QA, then enable public entry flags in the
    rollout order.
12. Qualify optional Luna prompt refinement from
    `014-luna-ai-prompt-refinement-provider.md`; deterministic generation remains
    the release fallback and must pass independently.
```

The route may remain visible for internal prototype validation. Public entry
flags must remain closed until step 11 passes.

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
