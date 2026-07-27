# Phase 2 Commercial Platform Master Roadmap

**Status:** Proposed - Awaiting Review  
**Target:** Fashion Selling MVP for Thai small merchants  
**Architecture:** Modular monolith first, replaceable solution modules  
**Updated:** 2026-07-26

## 1. Product Decisions

- Fashion Selling is the first commercial solution.
- Small merchants are the first target users.
- `Project` owns and groups one or more `Collections`.
- A Project may contain products, assets, model profiles, consistency profiles, batches and approved outputs.
- AI models support ready templates, paid template variation and fully custom generation.
- Customers buy understandable packages; internal accounting settles actual operation costs through an immutable credit ledger.
- The complete maximum price must be displayed and confirmed before processing.
- Visual Character Builder in `requirements/003-implementation-visual-character-builder-plan` owns character attributes, visual assets and reusable visual-control contracts.
- Character Profile in `requirements/006-implementation-character-profile` owns
  named reusable Characters, canonical casting exports and Character usage
  lineage.
- Fashion Blueprint in `requirements/009-implementation-fashion-blueprint` owns
  the beginner-facing Template-to-result workflow and shared-component
  composition.
- Existing Studio Creative Configurator remains the advanced editor and consumes those shared contracts.
- The product evolves from one long screen into an application shell with route-based pages as modules grow.
- Navigation shows only available modules; future or unauthorized modules are not displayed.
- Product concept may use a demo identity, but all service contracts must include actor, ownership and billing boundaries from the beginning.
- One-time credit packs are the first paid model. Subscription is optional after
  paid-MVP validation and must not delay launch.
- Simple and Advanced routing contracts are required, but automatic Simple-mode
  provider routing is deferred until benchmark and margin data are sufficient.

### 1.1 Authoritative References

- Product, pricing and unit economics:
  `requirements/000-business-overview/`
- Production infrastructure:
  `requirements/Concept/infrastructure-gcloud.md`
- Current repository ownership:
  `requirements/009-technical-dept/000-master.md` and `AGENTS.md`
- Commercial sequencing:
  this folder and `Phase2-01-commercial-readiness-and-gcp-alignment.md`

The Google Cloud specification supersedes the historical
DigitalOcean/Supabase/R2 topology in the infrastructure-cost overview. The old
document remains useful for cost categories and retention assumptions, not for
implementation topology.

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

Production uses Firebase Hosting, separate Cloud Run API/Worker services, Cloud
Tasks, Cloud SQL PostgreSQL and private Cloud Storage. The current browser-native
Vanilla JavaScript client remains valid; adopting React/Vite is not part of this
phase.

## 3. Requirement Sequence

| Phase | Requirement | Dependency |
|---|---|---|
| External foundation | Visual Character Builder (`requirements/003-implementation-visual-character-builder-plan`) | Existing application |
| External foundation | Character Profile (`requirements/006-implementation-character-profile`) | Visual Character Builder, Community |
| External foundation | Fashion Blueprint (`requirements/009-implementation-fashion-blueprint`) | Character Profile, Scene Builder, Community |
| Phase2-01 | Commercial Readiness and Google Cloud Alignment | Existing application, GCP concept |
| Phase2-02 | Modular Core Architecture, Application Shell and Module Registry | Phase2-01 |
| Phase2-03 | Database Architecture and JSON Migration | Phase2-02 |
| Phase2-04 | Authentication, Sessions and Authorization | Phase2-03 |
| Phase2-05 | Projects, Ownership and Collections | Phase2-03, Phase2-04 |
| Phase2-06 | Assets, Storage and Product Catalog | Phase2-05 |
| Phase2-07 | Credit Ledger and Transaction Integrity | Phase2-03, Phase2-04 |
| Phase2-08 | Packages, Pricing, Checkout and Payments | Phase2-07 |
| Phase2-10 | Durable Jobs and Batch Orchestration | Phase2-03, Phase2-07 |
| Phase2-11 | Model Profiles and AI Model Creation | Phase2-06, Phase2-10 |
| Phase2-12 | Consistency Profiles and Reference Lineage | Phase2-06, Phase2-11 |
| Phase2-13 | Fashion Blueprint Commercial Integration | Fashion Blueprint, Phase2-02 through Phase2-08, Phase2-10 through Phase2-12 |
| Phase2-14 | Fashion Shot Packs and Photographer Styles | Phase2-13 |
| Phase2-15 | Approval, Regeneration and Refund Policy | Phase2-10, Phase2-13 |
| Phase2-16 | Marketplace Export Presets | Phase2-15 |
| Phase2-17 | Fashion MVP Integration, GCP Security and Launch | All required MVP phases |
| Phase2-09 | Subscription, Renewal and Entitlements | Deferred until one-time paid MVP is stable |

Implementation should follow dependency readiness, not numeric filename alone.
Phase2-09 is intentionally implemented after the first paid-MVP evidence unless
the Product Owner changes the revenue model.

## 4. Delivery Gates

### Gate A: Product Prototype

- Visual Character Builder Face Structure pilot accepted.
- Character Profile casting export and private handoff accepted.
- Fashion Blueprint Simple single-outfit prototype accepted.
- Fashion journey and package concepts validated with demo identity and mock pricing.
- No real payments or public launch.

### Gate B: Commercial Foundation

- Database migration reconciled.
- Authentication and ownership enforcement complete.
- Ledger and payment webhook tests complete.
- Durable jobs survive process restart.
- One vertical API -> Cloud Tasks -> Worker -> Provider -> Cloud Storage path is
  proven in staging.

### Gate C: Fashion Private Beta

- Maximum five products per Project batch.
- One model, one scene and one photographer style per initial batch.
- Three to four outputs per product.
- Human approval required before export.

### Gate D: Public MVP

- Security, backup, restore, monitoring and financial reconciliation passed.
- Terms, privacy, retention, AI disclosure and refund policy published.
- Operational support process exists.
- Firebase Hosting, Cloud Run, Cloud SQL, Cloud Tasks, Cloud Storage, secrets and
  alerts are reproducible through Terraform.

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
- Production API and Worker are stateless and never depend on container-local
  files for durable state.
- Cloud Tasks payloads contain identifiers/routing metadata, not images,
  snapshots or Base64.
- Provider and payment side effects are invoked only after server authorization,
  quote validation and idempotency checks.
- Production must fail closed if a mock actor, JSON transactional repository or
  local asset adapter is configured.

### 5.1 Application Navigation Direction

The current shell exposes working areas such as:

```text
Community
Studio
Image History
Comparisons
Playground
```

Commercial pages may register Projects, Assets, Fashion Selling, Credits and
Account only after their server authorization and persistence are ready.
Desktop and mobile may render navigation differently, but both consume the same
registry, route and entitlement contracts.

## 6. GCP Work-Package Mapping

| Infrastructure work package | Commercial owner |
|---|---|
| WP-01 Repository assessment | Phase2-01 |
| WP-02 Frontend deployment separation | Phase2-01, Phase2-17 |
| WP-03 Container and Cloud Run | Phase2-01, Phase2-17 |
| WP-04 PostgreSQL and migration | Phase2-03 |
| WP-05 Credit ledger and idempotency | Phase2-07, Phase2-08 |
| WP-06 Cloud Storage assets | Phase2-06 |
| WP-07 Cloud Tasks worker | Phase2-10 |
| WP-08 Observability and cost | Phase2-07, Phase2-10, Phase2-17 |
| WP-09 CI/CD and IaC | Phase2-17 |
| WP-10 Load, failure and recovery test | Phase2-17 |

## 7. Progress Tracker

| Phase | Status | Review Gate |
|---|---|---|
| Visual Character Builder | Separate 003 plan | Product/UX/Technical |
| Character Profile | Separate 006 plan | Identity/reuse/privacy |
| Fashion Blueprint | Separate 009 plan | Consumer UX/plan contract |
| Phase2-01 | Required first | Architecture/GCP decision |
| Phase2-02 | Proposed | Architecture/Application shell |
| Phase2-03 | Proposed | Data/Migration |
| Phase2-04 | Proposed | Security |
| Phase2-05 | Proposed | Domain/UX |
| Phase2-06 | Proposed | Storage/Product |
| Phase2-07 | Proposed | Financial integrity |
| Phase2-08 | Proposed | Payment/Legal |
| Phase2-09 | Deferred for paid MVP | Subscription |
| Phase2-10 | Proposed | Reliability |
| Phase2-11 | Proposed | Model safety/cost |
| Phase2-12 | Proposed | Consistency |
| Phase2-13 | Proposed | Consumer UX |
| Phase2-14 | Proposed | Commercial content |
| Phase2-15 | Proposed | Operations/refunds |
| Phase2-16 | Proposed | Export quality |
| Phase2-17 | Proposed | Launch approval |
