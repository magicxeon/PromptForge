# Phase 2 Commercial Platform Master Roadmap

**Status:** Proposed - Awaiting Review  
**Target:** Fashion Selling MVP for Thai small merchants  
**Architecture:** Modular monolith first, replaceable solution modules  
**Updated:** 2026-07-14

## 1. Product Decisions

- Fashion Selling is the first commercial solution.
- Small merchants are the first target users.
- `Project` owns and groups one or more `Collections`.
- A Project may contain products, assets, model profiles, consistency profiles, batches and approved outputs.
- AI models support ready templates, paid template variation and fully custom generation.
- Customers buy understandable packages; internal accounting settles actual operation costs through an immutable credit ledger.
- The complete maximum price must be displayed and confirmed before processing.
- Visual Character Builder in `requirements/003-implementation-visual-character-builder-plan` owns character attributes, visual assets and reusable visual-control contracts.
- Existing Studio Creative Configurator remains the advanced editor and consumes those shared contracts.
- The product evolves from one long screen into an application shell with route-based pages as modules grow.
- Navigation shows only available modules; future or unauthorized modules are not displayed.
- Product concept may use a demo identity, but all service contracts must include actor, ownership and billing boundaries from the beginning.

## 2. Architecture Direction

Use a modular monolith before considering microservices:

```text
Core Platform
  Application Shell, Navigation and Routing
  Identity and Access
  Projects and Ownership
  Assets and Storage
  Collections
  Credits, Pricing and Entitlements
  Jobs, Queue and Provider Gateway
  Module Registry and Audit

Reusable Modules
  Visual Character Builder
  Product Catalog
  Model Profiles
  Consistency Profiles
  Approval Gallery
  Export Presets

Solution Modules
  Fashion Selling
  Product Review (later)
  Storyboard (later)
```

Solution modules must never call image providers, mutate balances or access persistence directly. They create validated plans and invoke core application services.

## 3. Requirement Sequence

| Phase | Requirement | Dependency |
|---|---|---|
| External foundation | Visual Character Builder (`requirements/003-implementation-visual-character-builder-plan`) | Existing application |
| Phase2-02 | Modular Core Architecture, Application Shell and Module Registry | Existing application |
| Phase2-03 | Database Architecture and JSON Migration | Phase2-02 |
| Phase2-04 | Authentication, Sessions and Authorization | Phase2-03 |
| Phase2-05 | Projects, Ownership and Collections | Phase2-03, Phase2-04 |
| Phase2-06 | Assets, Storage and Product Catalog | Phase2-05 |
| Phase2-07 | Credit Ledger and Transaction Integrity | Phase2-03, Phase2-04 |
| Phase2-08 | Packages, Pricing, Checkout and Payments | Phase2-07 |
| Phase2-09 | Subscription, Renewal and Entitlements | Phase2-08 |
| Phase2-10 | Durable Jobs and Batch Orchestration | Phase2-03, Phase2-07 |
| Phase2-11 | Model Profiles and AI Model Creation | Phase2-06, Phase2-10 |
| Phase2-12 | Consistency Profiles and Reference Lineage | Phase2-06, Phase2-11 |
| Phase2-13 | Fashion Selling Consumer Workflow | Visual Character Builder, Phase2-02 through Phase2-12 |
| Phase2-14 | Fashion Shot Packs and Photographer Styles | Phase2-13 |
| Phase2-15 | Approval, Regeneration and Refund Policy | Phase2-10, Phase2-13 |
| Phase2-16 | Marketplace Export Presets | Phase2-15 |
| Phase2-17 | Fashion MVP Integration, Security and Launch | All MVP phases |

## 4. Delivery Gates

### Gate A: Product Prototype

- Visual Character Builder Face Structure pilot accepted.
- Fashion journey and package concepts validated with demo identity and mock pricing.
- No real payments or public launch.

### Gate B: Commercial Foundation

- Database migration reconciled.
- Authentication and ownership enforcement complete.
- Ledger, payment webhook and entitlement tests complete.
- Durable jobs survive process restart.

### Gate C: Fashion Private Beta

- Maximum five products per Project batch.
- One model, one scene and one photographer style per initial batch.
- Three to four outputs per product.
- Human approval required before export.

### Gate D: Public MVP

- Security, backup, restore, monitoring and financial reconciliation passed.
- Terms, privacy, retention, AI disclosure and refund policy published.
- Operational support process exists.

## 5. Cross-cutting Rules

- Every owned record must be scoped by `ownerUserId`, `projectId` or both.
- IDs are opaque and must not be treated as authorization.
- Money uses integer minor units; credits use integer ledger units.
- Balance is derived or transactionally maintained from immutable ledger entries.
- Every external callback and retryable command requires an idempotency key.
- Package confirmation stores an immutable price snapshot.
- Provider credentials and payment secrets remain server-side.
- Personally identifiable and financial data must not be written to normal application logs.
- Modules communicate through documented application-service contracts and domain events.
- Feature flags and entitlements control module availability; UI hiding is not authorization.
- Pages register navigation metadata through the Module Registry; feature modules must not hardcode global menus independently.
- Routes must support deep links, browser Back/Forward and ownership checks before loading protected records.
- List pages use shared pagination, thumbnail and lazy-loading infrastructure rather than loading full datasets or original assets.

### 5.1 Application Navigation Direction

The initial shell exposes only working areas:

```text
Studio
Image History
Comparisons
```

Future phases may register Projects, Assets, Fashion Selling and Account after their modules are implemented. Desktop and mobile may render navigation differently, but both consume the same registry, route and entitlement contracts.

Near-term implementation references:

- Requirement 021 - History Performance, Pagination, Thumbnails and Lazy Preview
- Requirement 022 - Comparison History Dashboard and Application Navigation

## 6. Progress Tracker

| Phase | Status | Review Gate |
|---|---|---|
| Visual Character Builder | Separate 003 plan | Product/UX/Technical |
| Phase2-02 | Proposed | Architecture/Application shell |
| Phase2-03 | Proposed | Data/Migration |
| Phase2-04 | Proposed | Security |
| Phase2-05 | Proposed | Domain/UX |
| Phase2-06 | Proposed | Storage/Product |
| Phase2-07 | Proposed | Financial integrity |
| Phase2-08 | Proposed | Payment/Legal |
| Phase2-09 | Proposed | Subscription |
| Phase2-10 | Proposed | Reliability |
| Phase2-11 | Proposed | Model safety/cost |
| Phase2-12 | Proposed | Consistency |
| Phase2-13 | Proposed | Consumer UX |
| Phase2-14 | Proposed | Commercial content |
| Phase2-15 | Proposed | Operations/refunds |
| Phase2-16 | Proposed | Export quality |
| Phase2-17 | Proposed | Launch approval |
