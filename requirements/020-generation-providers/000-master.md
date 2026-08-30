# Generation Providers - Master Requirement

Status: Active canonical requirement owner  
Last updated: 2026-08-30  
Primary role: Backend Platform Architect  
Required reviewers: QA Release Engineer; Commercial Financial Integrity for
pricing or paid exposure; Generative Media Pipeline reviewer for capability or
qualification changes

## 1. Purpose

This folder is the canonical requirement owner for external AI provider
integration across image, video, and text-generation support. It consolidates
provider architecture, adapters, capability catalogs, pricing evidence,
qualification, promotion, observability, and rollback without moving product
workflow ownership out of Playground, Studio, Fashion, Cinematic, Community,
Credits, or Generation.

## 2. Ownership Boundary

Provider requirements own:

- external API and SDK evidence;
- server-side credentials and endpoint configuration;
- adapter request/response normalization;
- provider/model capability declarations;
- provider-specific error and usage translation;
- model pricing evidence and provider cost basis;
- operation qualification and staged promotion;
- provider observability, health, disabling, and rollback.

Provider requirements do not own:

- product-specific screens or navigation;
- final prompt business rules;
- queue, History, Comparison, or Job Center lifecycle;
- Credit ledger, reservation, capture, or refund behavior;
- Character, Template, Outfit, or reference authority;
- Fashion, Cinematic, Playground, or Studio workflow orchestration.

Those capabilities consume provider contracts through their canonical public
entry points.

## 3. Requirement Map

### Architecture

- [Modular Image Provider Contract](architecture/001-modular-image-provider-contract.md)

### Image Providers

- [Provider Registry And Grok Imagine](image/001-provider-registry-and-grok-imagine.md)
- [Provider Pricing Catalog And Value Ranking](image/002-provider-pricing-catalog-and-value-ranking.md)
- [BytePlus ModelArk Seedream Provider](image/003-byteplus-modelark-seedream-provider.md)
- [Meta Muse Provider Set](image/meta-muse/000-meta-muse-image-provider-master.md)

### Video Providers

- [Video Provider Pricing And Credit Model](video/001-video-provider-pricing-and-credit-model.md)
- [Video Generation Provider Contract](video/002-video-generation-provider-contract.md)
- [Gemini Omni Flash Interactions Video Provider](video/003-gemini-omni-flash-interactions-provider.md)

### Text Providers

- [Luna AI Prompt Refinement Provider](text/001-luna-ai-prompt-refinement-provider.md)

### Cross-Product Qualification

- [Fashion Model Qualification And Routing](qualification/001-fashion-model-qualification-and-routing.md)

## 4. Canonical Runtime Integration

```text
server/config/providers.json or operation-specific capability registry
  -> provider/model capability resolution
  -> Generation-owned application entry point
  -> server/providers adapter
  -> normalized output or provider task
  -> Generation persistence and terminal lifecycle
  -> Credits settlement through the Credits capability
```

- Image adapters and the image catalog use `server/providers/ProviderRegistry.js`
  and `server/providers/providerAdapters.js`.
- Video adapters use the Generation-owned video capability and provider-task
  contracts.
- Text enhancement providers remain optional stages behind their owning
  Generation service.
- React surfaces consume server catalogs. They never call providers directly or
  duplicate model capability tables.

## 5. Adding A Provider

Every new provider set must include these steps, split into files when the
integration is substantial:

1. **Evidence gate** - official docs, verified endpoint, model IDs, limits,
   output/error schema, retention, region, and pricing date.
2. **Adapter contract** - canonical runtime placement, supported operations,
   normalized result, timeout, retry/idempotency, and safe diagnostics.
3. **Catalog and secret contract** - stable IDs, environment names, aliases,
   capabilities, defaults, and disabled/internal exposure.
4. **Pricing and commercial gate** - server-owned versioned pricing; no guessed
   customer-paid routing.
5. **Product exposure** - existing shared components consume the catalog; no
   provider-specific product workflow unless the API requires a real capability
   distinction.
6. **Qualification** - general and operation-specific quality evidence are
   separate gates.
7. **QA and rollback** - mocked automated tests, authorized manual tests,
   observability, disable path, and historical readability.

## 6. Compatibility Rules

1. Adding a provider must not change existing defaults, model ordering, prices,
   qualifications, prompts, or controls unless explicitly required.
2. Unsupported capabilities remain absent or false and must be rejected before
   dispatch; never silently discard a user selection.
3. Multi-output uses the canonical Generation Group contract unless native
   batching has verified parity and billing semantics.
4. Provider fallback after a locked quote is forbidden without explicit
   re-quote and user consent.
5. API key presence alone must not enable customer-paid routing.
6. Historical jobs, outputs, and Credit snapshots remain readable after a model
   is disabled.
7. Automated tests use mocked transport and never spend provider funds.

## 7. Product Dependencies

- Playground and Studio own their generation UX and consume the image catalog.
- Fashion Blueprint owns Fashion workflows but consumes the qualification gate
  in this folder.
- Cinematic Studio owns story/Shot workflows but consumes the video provider
  and pricing contracts in this folder.
- Credits owns estimates, reservations, settlement, refunds, and immutable
  pricing snapshots.
- Admin owns draft/publish/scheduled configuration and operational inspection.

## 8. Migration Record

This folder consolidates provider-specific requirements previously located
under Requirements 002, 009, 013, and 016. Product masters retain links to these
documents, but new provider requirements must be created here.

The move changes documentation ownership only. It does not move runtime source,
change APIs, alter model exposure, or authorize provider implementation.

## 9. Master Acceptance Criteria

- Every provider requirement has one discoverable canonical path.
- Product requirements link to provider contracts rather than copying them.
- Runtime capability and pricing remain server-owned.
- Financial, security, reference, and operation qualification gates remain
  explicit.
- All moved-document references resolve and no old canonical path remains.
