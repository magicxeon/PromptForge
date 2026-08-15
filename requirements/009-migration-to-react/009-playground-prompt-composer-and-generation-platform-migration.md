# 009 Playground, Prompt Composer and Generation Platform Migration

**Status:** Implemented and React-owned; final validation pending
**Depends on:** 001-008

## Implementation Result

`GenerationExperience` is the single provider/reference/estimate/submission
surface used by Playground, Studio and Scene Builder. Its result surface owns
download, History detail, Collection assignment and Community share actions for
completed single-image jobs, and links completed Comparison runs to the shared
Comparison detail workspace. Fashion uses the same provider and actor-owned
reference contracts while retaining its aggregate quote/run coordinator.

## 1. Business Requirement

React must provide one reusable generation platform for Playground, Studio,
Fashion and Scene workflows while preserving provider capabilities, references,
credit estimates, queue status and Comparison ownership.

Playground remains the freeform experience:

```text
write prompt
add supported references
choose normal or Comparison generation
review credit estimate
generate
inspect/download/share result
```

## 2. Existing Canonical Owners

```text
client/generation-controls/
client/playground/
client/prompt-composer/
client/core/generationService.js
client/core/referenceManager.js
client/credits/
client/comparison.js
server/app/routes/generationRoutes.js
server/app/routes/creditRoutes.js
server/app/routes/comparisonRoutes.js
server/domain/generation/
server/domain/credits/
server/providers/
```

Provider capability, reference limits, prompt compilation, pricing,
reservation/capture/refund and queue behavior stay server-owned.

## 3. React Shared Generation Components

```text
web/src/components/generation/
  PromptEditor.tsx
  NegativePromptEditor.tsx
  ReferenceSlotGrid.tsx
  ReferenceSlotCard.tsx
  EngineTargetPanel.tsx
  ProviderModelSelector.tsx
  OutputSettings.tsx
  ComparisonConfigurator.tsx
  CreditEstimate.tsx
  GenerationActionBar.tsx
  JobProgress.tsx
  GenerationResultSurface.tsx
  RecentResults.tsx
```

Use typed mode contracts:

```ts
type GenerationPanelMode =
  | { kind: "single"; providerSelection: true }
  | { kind: "comparison"; slots: ComparisonSlot[] }
  | { kind: "managed"; routingTier: string; providerSelection: false };
```

When Comparison is active:

- normal provider/model controls are absent;
- estimates include enabled slots only;
- Comparison workspace owns results;
- normal result state does not show a contradictory message.

## 4. Reference Contract

Supported roles:

```text
face_reference
character_reference
style_reference
pose_reference
outfit_front
outfit_back
```

The UI must explain each role, validate combinations and hide unsupported roles.
The server remains authoritative for:

- ownership;
- provider count/capability;
- role ordering;
- conflict policy;
- asset resolution.

Reference state contains stable asset/output IDs and preview metadata. Temporary
browser object URLs are revoked. Durable Base64 storage is forbidden.

Browser uploads use this transport:

```text
File -> POST /api/references -> actor-owned AssetRepository record
     -> lightweight /outputs/references/... value in generation state
     -> server ownership check and provider-only Base64 resolution at queue time
```

The upload endpoint accepts only PNG, JPEG and WebP images up to 12 MB, validates
the actual bytes and dimensions, and rejects unknown reference roles. It removes
the file if asset persistence fails. Fashion uses the same domain service through
its `/api/fashion-blueprints/assets` route and isolated namespace.

## 5. Generation State Machine

Represent explicit states:

```text
idle
editing
estimating
ready
submitting
queued
running
partial
succeeded
failed
cancelled/expired when supported
```

Do not infer generation lifecycle from button text or hidden DOM state.

The submission flow:

```text
validate form and references
-> obtain/confirm fresh estimate
-> freeze matching request snapshot
-> submit with idempotency
-> receive job/set ID
-> poll or stream through one job client
-> update result/cache/history
```

Estimate-invalid errors return the user to a recoverable ready state and trigger
a new visible estimate. They must not discard the prompt or references.

## 6. Prompt Composer

Prompt Composer proposes structured inputs and never becomes a second final
prompt compiler.

- proposal review is optional;
- accepted proposal maps into the owning form;
- manual user text remains editable;
- cancellation preserves current form;
- AI-assisted prompting remains feature-flagged;
- Prompt Composer API errors do not disable manual generation.

## 7. Playground Route

Use the directional reference:

```text
requirements/008-implement-adjusment-ui/003-freeform-generation.png
```

Requirements:

- Prompt Editor is the primary input;
- reference role grid is clearly visible;
- active result is large enough to inspect;
- empty result area remains collapsed;
- Go to Prompt and Generate-to-Result scrolling are predictable;
- Output Resolution renders only for capable models;
- credit amount updates before Generate;
- recent results and detail reuse shared media components;
- Comparison opens the shared Comparison workspace.

## 8. API and Polling

Create one React generation client and job hook:

```text
web/src/features/generation/api/
web/src/features/generation/hooks/useGenerationJob.ts
```

Requirements:

- actor-scoped job query key;
- abort on route/actor change;
- bounded backoff;
- distinguish transient failure from actor-not-owner and job-not-found;
- do not poll an undefined ID;
- no simultaneous duplicate pollers for one job;
- terminal state invalidates History and Credit queries.

## 9. Migration Order

1. Provider catalog and output controls.
2. Reference upload/role components.
3. Credit estimate and action contract.
4. Job lifecycle and result surface.
5. Comparison configuration/result integration.
6. Prompt Composer.
7. Playground route cutover.
8. Release shared generation API for Fashion/Studio/Scene.

## 10. Tests

- provider/model capability changes;
- resolution visibility;
- reference role/count/conflict;
- estimate/request equality;
- stale estimate recovery;
- single vs Comparison ownership;
- partial Comparison success;
- job missing/restart/permission behavior;
- actor switch during polling;
- Prompt Composer accept/cancel/error;
- desktop/mobile layout and focus.

Run current provider, reference, credit, comparison and generation tests as
server regressions.

## 11. Exit Criteria

- Playground is React-owned.
- Shared generation components have no Studio-specific global dependency.
- Estimate and request snapshots match.
- References reach provider pipeline under correct roles.
- Generation requests and durable snapshots contain no newly uploaded Base64.
- Polling is actor-safe and leak-free.
- Fashion and later editors can compose the same component contracts.
