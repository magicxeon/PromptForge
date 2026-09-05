# Provider Management Architecture

**Status:** Canonical architecture reference  
**Applies to:** Image, Video and AI Text provider/model selection across Momelo

## 1. Purpose

Momelo separates provider transport code from product workflows. Provider
adapters know how to call an external API, while Generation, Credits,
Reference Processing, Cinematic and other product capabilities retain their
business rules.

This document records the provider-management source of truth and the runtime
control hierarchy. It prevents Playground, Comparison, Studio, Fashion or
Cinematic from creating independent provider enablement rules.

## 2. Current Provider Layers

```text
React feature
  -> server public provider/capability catalog
  -> owning application service
  -> provider availability policy
  -> capability and request validation
  -> Credit estimate/reservation where applicable
  -> Generation Queue or durable Video task
  -> provider adapter
  -> external provider API
```

### 2.1 Static catalogs

- Image provider/model capabilities: `server/config/providers.json`.
- Video provider/model capabilities: `server/config/cinematic-video-models.json`.
- AI Text provider/model defaults: focused policy modules under
  `server/config/`, including Cinematic Story Plan, prompt refinement,
  story enhancement, wardrobe suggestion and Attribute localization.
- Image and video pricing remain owned by Credits configuration and services.

Static catalogs describe what an adapter and qualified provider integration can
do. Runtime Admin controls may narrow this capability but must never widen it.

### 2.2 Registries and adapters

- `server/providers/ProviderRegistry.js` resolves Image selections and exposes
  the Image catalog.
- `server/providers/providerAdapters.js` maps Image adapter IDs to focused
  provider implementations.
- `server/providers/ProviderFactory.js` creates an Image adapter only at Queue
  dispatch time.
- `server/domain/generation/VideoCapabilityRegistry.js` resolves Video model
  capabilities.
- `server/providers/VideoProviderAdapterRegistry.js` resolves Video transport
  adapters.
- Provider implementation files remain isolated under `server/providers/`.

Provider adapters own authentication headers, provider payload translation,
submit/poll behavior, response decoding and provider-error normalization. They
do not own pricing, product surface exposure, UI state or workflow fallback.

### 2.3 Canonical workflow owners

- Image submission and Queue lifecycle:
  `GenerationApplicationService` and `QueueManager`.
- Video quote, submission, polling and settlement:
  `VideoGenerationApplicationService` and `VideoProviderTaskService`.
- Comparison owns slot grouping but delegates generation execution.
- Fashion owns Blueprint planning and qualification but delegates execution.
- Cinematic owns authored Shot and continuity state but delegates media
  generation.
- Credits owns estimate, reservation, capture and refund.

No React feature calls an external provider directly.

## 3. Runtime Provider Control

Runtime availability is an overlay owned by Admin Configuration. It is not a
replacement for static capability or qualification catalogs.

```text
Static capability
  AND credential/configuration readiness
  AND pricing/qualification eligibility
  AND Provider master control
  AND Model master control
  AND Workflow control
  = effective availability
```

### 3.1 Precedence

Highest priority appears first:

1. Provider master `disabled` blocks every model and every workflow using that
   provider.
2. Model master `disabled` blocks that model in every workflow.
3. Workflow `disabled` blocks the exact provider/model/workflow combination.
4. Static capability, qualification, pricing and credentials still apply.
5. An Admin `enabled` override cannot restore unsupported or unqualified
   behavior.

This precedence is fail-closed and evaluated again on the server. Hiding an
option in React is presentation, not authorization.

### 3.2 Workflow keys

Provider controls use stable workflow keys rather than page URLs:

```text
playground.image
playground.video
comparison.image
studio.face
studio.character_sheet
studio.scene
fashion.image
cinematic.storyboard_image
cinematic.produce_video
internal.template_pose_proxy
ai.prompt_refinement
ai.story_enhancement
ai.story_plan
ai.scene_direction
ai.wardrobe_suggestion
ai.attribute_localization
```

Routes may change without changing these policy identities.

### 3.3 Accepted work

Disabling a Provider, Model or Workflow blocks new preview/quote/submit work.
It does not silently replace a model, cancel an accepted Job, mutate an
accepted quote or interrupt a provider task already submitted. Existing work
continues through its pinned routing and normal Credit settlement lifecycle.

## 4. Admin Control Plane

The Admin provider workspace is the only mutation UI for runtime provider
availability.

- Provider master switch controls all Image, Video and AI Text use.
- Model master switch controls the model across every customer and internal
  workflow.
- Workflow controls support narrower operational containment.
- Support is read-only; Admin mutation requires a reason and optimistic
  version.
- Every command appends immutable history and an Audit event.
- Secrets and raw provider payloads are never returned.

Admin controls store only overrides. They do not copy or edit static model
capabilities, pricing or provider credentials.

## 5. Customer Catalog Behavior

Public catalogs omit globally disabled Provider/Model choices and may filter
workflow-disabled choices for a requested surface. A stale browser selection
can remain visible briefly, but server preview, quote and submit fail with a
stable `provider_runtime_disabled` error and the exact disabled scope.

The client must not silently switch and submit another paid model. Users choose
a replacement from the refreshed catalog.

## 6. Persistence and Deployment

Local development uses the Admin Configuration repository boundary and the
shared atomic JSON store. Production activation remains gated by staff
authentication and durable transactional persistence. Static config remains
the bootstrap fallback: absence of an override means `inherit`, preserving
existing behavior.

The runtime service keeps a bounded in-process snapshot for synchronous
registry checks. Successful Admin mutations atomically persist first and then
replace that snapshot. Process startup loads the latest valid snapshot. A
missing state file means no override; malformed persisted state fails startup
instead of silently restoring disabled Providers.

## 7. Extension Checklist

When adding a Provider, Model or provider-backed workflow:

1. Add the provider/model to its static catalog or focused text policy.
2. Register the transport adapter behind the canonical registry.
3. Assign a stable workflow key.
4. Pass the workflow identity through preview/quote/submit validation.
5. Expose the model in the Admin inventory without exposing credentials.
6. Add a targeted master-disable and workflow-disable test.
7. Preserve accepted-job routing and Credit behavior.
