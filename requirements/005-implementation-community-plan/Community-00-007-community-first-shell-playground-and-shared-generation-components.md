# Community-00-007 Community-First Shell, Playground and Shared Generation Components

**Status:** Proposed - Ready for Implementation
**Feature type:** Application information architecture and reusable generation UI
**Depends on:** Community-00-002 Actor Context, Community-00-005 Credit Billing,
Community-00-006 Localization, current application shell and generation service
**Must complete before:** Community-01 Community Home, Community-05 Explore and
Community-00-008 Admin/Support UI
**Created:** 2026-07-24

## 1. Business Requirement

ModelPromptForge is expanding beyond one Studio screen. The product needs clear
top-level destinations without duplicating provider, output, reference,
generation or comparison behavior in every feature.

The application must provide:

- Community as the default entry page;
- a medium Create panel on Community Home;
- Studio for guided creation workflows;
- Playground for fully manual prompt and reference generation;
- Library for history, saved templates, characters and collections;
- Credits and Support destinations;
- Admin navigation only for authorized actors;
- reusable generation components shared by Studio and Playground.

This work establishes the product shell and shared component contracts. It does
not implement the full Community feed, payment checkout, support desk or admin
portal.

## 2. Product Navigation Contract

### 2.1 Desktop Information Architecture

```text
Create
  Studio
  Playground

Explore
  Community

Library
  Image History
  Saved Templates
  Characters
  Collections

Account
  Credits
  Support

Restricted
  Admin
```

The visible navigation may use compact section labels, but routes and module IDs
must remain stable. Comparisons are a Playground capability and may also remain
available as a direct deep link while migration is in progress.

### 2.2 Mobile Information Architecture

The primary mobile destinations are:

```text
Community | Studio | Playground | Library | More
```

`More` contains Credits, Support, account/language controls and Admin when
authorized. Do not force every desktop item into the mobile primary bar.

### 2.3 Default Route

```text
/ -> /community
```

Community Home must show:

- a real or empty-state Community feed area;
- a medium Create panel;
- direct actions for Guided Studio, Character Builder, Scene Builder and
  Playground;
- recent or saved content only when the active actor owns or may view it.

The Create panel launches workflows. It must not embed the full Studio form.

## 3. Surface Responsibilities

### 3.1 Studio

Studio owns guided workflows:

- Headshot Grid;
- Character Sheet Builder;
- Scene Builder;
- category and visual-option driven authoring;
- guided/manual Scene Builder authoring already defined in Phase 004.

### 3.2 Playground

Playground is a direct creation surface:

- editable prompt text;
- optional negative prompt;
- reference slots;
- shared Engine and Target Output controls;
- credit estimate before generation;
- Generate action;
- optional multi-model comparison using the existing comparison domain and API.

Playground does not require category or visual-character selections. Future AI
prompt assistance is optional and must not be required for the MVP.

### 3.3 Community

Community owns discovery, save, vote and template entry points. Selecting
`Use Template` or `Use Character` must hand off to Studio or Playground through
an explicit handoff contract. Community must never execute provider calls
directly.

## 4. Shared Component Contract

### 4.1 Component Boundaries

| Component | Responsibility | Initial consumers |
|---|---|---|
| `ApplicationShell` | Route-aware navigation, responsive menu, actor and locale actions | All pages |
| `EngineTargetOutput` | Provider, model, resolution, aspect ratio and supported output settings | Studio, Playground, Comparison |
| `GenerationActionBar` | Estimate, Generate, queued/running state, retry and validation summary | Studio, Playground |
| `ReferenceSlotManager` | Face, character, style, pose and outfit reference inputs | Studio, Playground, template remix |
| `PromptEditor` | Editable prompt and optional negative prompt with guided/manual policy | Scene Builder, Playground |
| `GenerationResultSurface` | Active render state, result preview, lightbox entry, download, copy-prompt and recent results scoped to a generation surface | Studio, Playground |
| `VisualOptionCarousel` | Accessible visual option selection | Character Builder, Clothing |
| `ComparisonLauncher` | Convert current prompt/settings into comparison slots | Playground, Studio |
| `CreditStatus` | Available/reserved credits and active estimate | Shell, generation surfaces |
| `TemplateCard` | Public template summary and Use Template action | Community, Shared Templates, Library |

### 4.2 State Ownership

Reusable components must receive state and callbacks. They must not create a
second global Studio state.

```text
EngineTargetOutputInput
- providerId
- modelId
- resolution
- aspectRatio
- quality
- outputCount
- providerCapabilities
- validationErrors
- onChange(nextGenerationSettings)

GenerationActionBarInput
- generationSettings
- promptState
- referenceSlots
- estimateState
- jobState
- disabledReason
- onGenerate()
- onRetry()

ReferenceSlotManagerInput
- slots[]
- slotPolicies[]
- actorContext
- onSlotChange(slotId, normalizedReference)

GenerationResultSurfaceInput
- surface: `studio` | `playground`
- resultState: latest result, recent completed results and current job state
- comparisonActive
- onResultStateChange(nextResultState)
- showRecentRenders
- showHandoffActions
```

`client/core/studioState.js` remains the compatibility source for Studio during
migration. New components should accept explicit inputs so a later centralized
store can replace it without rewriting component DOM.

### 4.3 Shared Service Rules

- Credit estimates come only from the existing credit estimate controller and
  server pricing policy.
- Generation calls go through `client/core/generationService.js`.
- Provider/model capabilities come from the existing provider configuration.
- References use `client/core/referenceManager.js` and canonical slot mapping.
- Comparison uses existing comparison APIs; no provider calls from the client.
- Localization uses `client/core/i18nService.js`; no new inline language maps.
- Components emit events or callbacks and do not navigate by changing location
  directly.

## 5. Software Design

### 5.1 Client Ownership

```text
client/shell/
  navigationRegistry.js
  router.js
  applicationShell.js
  applicationLayout.js

client/generation-controls/
  engineTargetComparisonPanel.js
  generationActionBar.js
  referenceSlotManager.js
  promptEditor.js
  generationResultSurface.js

client/playground/
  playgroundPage.js
  playgroundController.js
  playgroundState.js

client/community/
  communityHomePage.js
  communityCreateLauncher.js

client/credits/
  creditBalanceBadge.js
  creditEstimateController.js

client/visual-controls/
  visualOptionControls.js
```

The new `client/generation-controls/` folder is approved as the owner of
cross-feature generation UI. Feature orchestration remains in Studio,
Playground or Community modules. The shared folder must contain no Community
feed or Studio category logic.

### 5.2 Existing Files to Modify

```text
client/index.html
  register browser-native scripts in dependency order
  retain only stable mount points for shared components

client/app.js
  orchestrate Studio and initialize shared generation controls
  remove direct ownership of reusable component rendering as it migrates

client/shell/navigationRegistry.js
  register Community, Studio, Playground, Library, Credits, Support and Admin
  define order, group, route, localization key and authorization predicate

client/shell/router.js
  redirect / to /community
  preserve browser Back/Forward and route state

client/shell/applicationShell.js
  render grouped desktop and compact mobile navigation
  hide unauthorized modules rather than rendering disabled links

client/core/generationService.js
  remain the single client generation submission path

client/core/referenceManager.js
  remain the canonical reference normalization path

client/comparisons/comparisonApi.js
  remain the comparison transport boundary

client/style.css
  add shell and component styles until feature stylesheet extraction is approved
```

### 5.3 Browser-Native Module Loading

The project currently has no build tool. Components must use the established
IIFE/global namespace pattern and be loaded before their feature consumers.

```text
core services
-> shared generation controls
-> feature controllers
-> shell
-> app bootstrap
```

Use one namespace:

```text
window.ModelPromptForgeGenerationControls
```

Each component registers a named factory/controller on that namespace. Do not
create one unrelated global per component.

## 6. Input, Process and Output

### 6.1 Community Create Handoff

Input:

```text
workflowId
optional templateId
optional characterId
optional sourcePostId
actorContext
```

Process:

1. Validate route and actor access.
2. Build a versioned handoff payload.
3. Navigate to Studio or Playground.
4. Hydrate only compatible fields.
5. Show validation/replacement requirements before generation.

Output:

```text
WorkflowHandoff
- schemaVersion
- sourceRoute
- targetRoute
- workflowId
- actorUserId
- templateId
- characterId
- sourcePostId
- createdAt
```

### 6.2 Playground Generation

Input:

```text
prompt
negativePrompt
generationSettings
referenceSlots
optional comparisonModels
```

Process:

1. Validate prompt, model settings and references.
2. Request or refresh the server credit estimate.
3. Require a valid estimate before Generate.
4. Submit through the normal generation or comparison service.
5. Route job status and result into the existing render/history flow.

Output:

```text
GenerationRequest or ComparisonRequest
jobId or comparisonSetId
locked credit estimate
history entry owned by active actor
```

### 6.3 Shared Generation Result Surface

Studio and Playground must render the same reusable `GenerationResultSurface`.
The component owns presentation only; generation, provider calls, queue polling,
credit reservation and history persistence remain in the existing generation
service and server queue domain.

Required states:

| State | Required presentation |
|---|---|
| Idle | Collapse the render surface to a compact header. Do not reserve a blank preview area; provide a nearby `Go to prompt` action. A previously completed Playground result remains visible when available. |
| Preparing / queued / running | A loading preview, provider/model and job status. |
| Partial | The latest streaming image preview when the provider emits one. |
| Completed | Large image preview, Open Detail / Lightbox entry, Download, Copy Prompt, provider/model and duration metadata. |
| Failed | Human-readable error and technical detail when safely available; the previous completed result remains available through Recent Renders. |
| Comparison active | Do not present a stale single-image result as the current comparison output. Show a concise handoff state; the existing Comparison Workspace owns multi-model results. |

`Recent Renders` is actor-scoped and surface-scoped in the first pass. It stores a
small capped list of completed Playground result metadata in
`model_prompt_forge_playground_<actor>_v2`; it is not a replacement for the
server-owned History library. Each thumbnail opens the existing Lightbox.

The generation bootstrap publishes browser events named
`modelpromptforge:generation-status` with `{ type, surface, jobId, job, error }`.
The component may consume these through its caller, but it must not poll jobs,
call providers or modify the credit ledger itself.

#### Human Interaction Rules

1. Do not show several mutually exclusive result messages at once. The result
   surface renders exactly one primary state: collapsed idle, loading, partial
   preview, completed image, failed state, or comparison handoff.
2. When no image has been generated, collapse the result surface so the prompt
   editor remains the primary next action. `Go to prompt` scrolls to the prompt
   editor with the sticky navigation offset respected by the browser.
3. A normal Generate action scrolls to the result surface before submitting;
   the surface expands when the generation lifecycle emits `submitted` or
   `queued`. It must not navigate the user to Studio.
4. A failure keeps the error readable in the result surface and offers `Go to
   prompt`; it must not overwrite a completed image in Recent Renders.
5. Comparison mode must show only its concise handoff state in the single-image
   surface. The comparison workspace owns progress and multi-model result cards.

## 7. Implementation Plan

### Phase A: Shell Contract

1. Extend the navigation registry with route groups and access predicates.
2. Add Community as the default route.
3. Update the shell for desktop/mobile navigation.
4. Keep legacy `/comparisons` and existing deep links working.
5. Add localization keys for every new route and action.

### Phase B: Shared Generation Controls

1. Extract Engine and Target Output rendering and events.
2. Extract the Generate/estimate action bar.
3. Wrap existing reference controls behind `ReferenceSlotManager`.
4. Extract prompt editor behavior without changing prompt compilation.
5. Replace Studio call sites incrementally and retain behavior parity.

### Phase C: Playground

1. Add Playground state and page controller.
2. Compose shared prompt, reference, engine and generation controls.
3. Add `Compare Models` through the existing comparison API.
4. Persist Playground state under its own versioned key, separated by actor.
5. Verify normal generation history remains actor-scoped.
6. Extract `GenerationResultSurface` under `client/generation-controls/`, then
   mount it in Playground and migrate Studio through the same public contract in
   a compatibility-safe follow-up. Playground must never navigate to Studio just
   to submit or view a normal generation.
7. Capture the canonical Playground payload synchronously before temporary
   Studio compatibility state is restored. Publish lifecycle events using the
   captured `generationSurface`, not mutable current route state.

### Phase D: Community Home Launcher

1. Add Community page mount and empty/loading/error states.
2. Add the medium Create panel.
3. Route launcher actions through a versioned handoff.
4. Add template and character handoff hooks without implementing the full feed.

### Phase E: Cleanup

1. Remove duplicated provider/model/output event handlers after all consumers use
   shared controls.
2. Remove duplicated credit labels and estimate requests.
3. Document component APIs and script order.
4. Confirm no provider call, credit mutation or raw reference normalization was
   copied into UI components.

## 8. Impact and Migration Concerns

- Extract one component at a time to avoid resetting current Studio state.
- Provider/model changes must invalidate stale credit estimates.
- Route changes must not reopen comparisons with an undefined set ID.
- Actor switching must clear or reload actor-scoped Playground and Library data.
- Template mode must continue hiding incompatible Face/Style/Pose controls.
- Localization must cover dynamically rendered component labels.
- Shared controls must render provider capability differences without exposing
  unsupported fields.
- `EngineTargetOutput` must display Output Resolution only when the selected model exposes a
  non-empty `capabilities.resolutions` list. On every render surface, unsupported resolution
  controls must be hidden and cleared rather than left as an empty dropdown.
- Existing generated history and Scene Builder snapshots require no data
  migration.

## 9. Testing

### Automated

```text
TC-00-007-001 / redirects to /community
TC-00-007-002 unauthorized actor cannot see Admin navigation
TC-00-007-003 provider/model change invalidates the prior credit estimate
TC-00-007-004 Studio and Playground produce the same canonical generation settings
TC-00-007-005 reference slots normalize identically in both surfaces
TC-00-007-006 Playground generation uses the existing generation service
TC-00-007-007 comparison launch creates valid slots without direct provider calls
TC-00-007-008 actor switch isolates Playground persisted state
TC-00-007-009 Community Create handoff hydrates only compatible target fields
TC-00-007-010 locale change updates shell and shared controls
TC-00-007-011 Playground shows queued, partial, completed and failed states without navigating to Studio
TC-00-007-012 Playground result opens the shared Lightbox and supports download/copy prompt
TC-00-007-013 Playground recent renders are isolated by actor and never replace server History
```

### Manual UI

1. Open `/` and confirm Community Home appears.
2. Use the Create panel to open Studio, Character Builder, Scene Builder and
   Playground.
3. Change provider/model in Studio and Playground and confirm settings and credit
   estimates update consistently.
4. Generate from Playground and confirm Active Render, queue and History work.
5. Keep the user on `/playground` while a normal generation is queued and
   completed. Verify the Playground result panel updates, opens Lightbox and
   preserves a small actor-scoped recent list after route changes.
6. Launch a comparison and confirm each model uses its own estimate.
7. Switch actor and confirm Library/History/Playground state changes.
8. Verify mobile navigation and browser Back/Forward.

## 10. Acceptance Criteria

- Community is the default product entry.
- The Create panel reaches every enabled creation workflow.
- Studio and Playground share Engine/Target Output and generation infrastructure.
- Playground supports manual prompt, references, generation and comparison.
- Playground displays its own result surface while reusing the same result
  component contract as Studio; a single-image result never masquerades as a
  comparison result.
- Navigation remains understandable as Community, billing, support and admin grow.
- Admin appears only for authorized actors.
- No component duplicates provider calls, credit logic or reference normalization.
- New files follow the project structure in
  `requirements/007-technical-dept/000-master.md`.
- No requirement identifier in this foundation sequence is deeper than
  `Community-00-000`.
