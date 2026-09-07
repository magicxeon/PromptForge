# Technical Debt & Code Quality Master Plan (099-technical-dept)
**ID**: 099-technical-dept-master
**Application**: `ModelPromptForge`

This directory tracks refactoring tasks, technical debt payments, and modularization requirements designed to keep the codebase maintainable, performant, and clean.

## Current Capability Addendum

### Admin Finance (Local Read Workspace And Planning Drafts)

- `requirements/019-implementation-commercial-feature-plan/admin-finance/000-master.md`
  owns the Finance reporting/expense requirement package and small delivery gates.
- `server/domain/finance/FinanceApplicationService.js` owns the Admin Finance
  facade, with focused FinanceInventoryService/FinanceReportService projections.
  The HTTP adapter is `server/app/routes/adminFinanceRoutes.js`.
- Credits supplies a read-only sanitized `getFinanceLedger()` contract through
  CreditApplicationService and CreditAccountRepository. It does not call the
  existing migration-on-read path. No Quote/settlement contract changed.
- Typed planning scopes finance_provider_cost and finance_supplier_agreement
  use the existing AdminConfigurationService/repository and Audit. No Finance
  repository or new data path exists yet. Drafts remain in the existing
  `server/data/admin-configuration/revisions.json` path resolved by paths.js.
- Local Finance is admin-only and hard-denied in production until trusted
  identity/transactional permissions exist. Publication/schedules remain gated.
- FIN-006/007 extend that same owner with supplier billing accounts/funding
  evidence and monthly/yearly reports. Shared Admin Configuration revisions own
  agreement scheduling; funding records do not execute provider payments or
  duplicate customer Credit/payment authority.
- Admin Configuration retains version/draft/publication/schedule ownership under
  Backend 018-010. Credits remains the quote, conversion and settlement authority;
  Generation/AI workflow owners supply durable sanitized usage/attempt evidence.
- Finance UI lives under `web/src/features/admin/` (AdminFinanceRoute,
  FinanceReports/FinanceRates/FinanceDrafts, financeApi/financeSchemas). Route
  registry owns `/admin/finance`; styling is scoped in admin-finance.css and
  translations extend the existing admin namespace. Tests are under test/ and
  the Admin feature; scripts/test-admin-finance.mjs is the focused runner.
- Remaining actual cost/funding repositories and durable publication contracts
  are explicitly planned in Finance FIN-009, not certified by read-view tests.
- FIN-010 Excel exports live beside the Admin Finance components:
  FinanceReportExport and financeReportExcel. They consume the existing authorized
  summary snapshot, lazy-load ExcelJS and download locally; no new API or runtime
  storage owner. Export tests and export-layout are focused script groups.

### Deferred Requirement Coordination

- `requirements/098-pending-features/000-master.md` owns categorized deferred
  item status, reopening conditions and user acceptance records. Domain folders
  remain authoritative for implementation contracts; 098 adds no runtime owner.
- Database/Auth foundation discussion remains owned by commercial plan019,
  especially Phase2-03/04/20, not by the optional presentation backlog.

### Generated Image Publication Guard

- Page-Enhancement requirements 019-022 own derived-image private sharing and
  one image/Template post per owner+Generation result. CommunityShareService is
  the draft/status/publish owner; CommunityPostRepository checks uniqueness in
  its existing atomic create. No new persistence path.
- Shared ShareGeneratedDialog consumes owner-only status via the Community API;
  query identity is actor+Generation ID, with no provider or Credit dependency.
- New posts retain a server-set templateDerived boolean for private-prompt edit
  enforcement even if history later becomes unavailable. Existing posts unchanged.

### Template Input Policy

- Page-Enhancement requirements 016-018 own constrained Create/Edit controls.
- Templates owns `templateInputPolicy.js`, owner settings and immutable schema
  versions via TemplateCoreService. Community owns publication/post linkage.
- Template Pose Proxy owns verified source-version preparation reuse.
- Shared policy fields: `web/src/components/templates/`; typed owner API belongs
  to `web/src/features/templates/`. No new storage capability or provider path.

### Template Scene Workspace

- Requirement: Page-Enhancement-Requirements/015-template-scene-workspace.md.
- Scene Builder owns TemplateScenePanel and Scene route composition; Profiles
  owns CharacterLibraryPicker, authorized handoff and recent-ID selection state.
- Controlled picker lives in web/src/components/profiles; existing Character
  repository lists own optional name search. No new Generation/provider path.

### Public Template Detail And Creations

- Requirement: `requirements/005-implementation-community-plan/Page-Enhancement-Requirements/014-template-detail-and-creations.md`
- Read facade: `CommunityShareService.getTemplateDetail`, internally delegated
  to `server/domain/community/CommunityTemplateDetailService.js`.
- HTTP: `communityShareRoutes.js`; frontend route and preview are owned by
  `web/src/features/community/`. Direct URL: `/explore/templates/:postId`.
- Uses existing public-post and Generation history reads; no Generation,
  Template execution, reference, Credit or publication mutation path is added.

### Unified Generation Job Center

- Requirement: `requirements/017-unified-generation-job-center/000-master.md`
- Domain projection: `server/domain/generation/GenerationJobCenterService.js`
- HTTP route: `server/app/routes/generationJobCenterRoutes.js`
- React tracker: `web/src/features/generation/job-center/`
- This is a read/navigation projection only. Image Queue, Generation Groups,
  Video Provider Tasks, History, Comparisons, and Credits retain lifecycle
  ownership.

---

## 1. Refactoring Goals
*   **Modularize `client/app.js`**: Split the giant monolithic file into smaller, focused modules based on functional concerns under `client/core/`.
*   **Reorganize `server/`**: Separate runtime data, domain logic, repositories, route registration, middleware, and provider integrations.
*   **Maintain Clean Global State**: Maintain `window.ModelPromptForgeState` as a unified state source of truth.
*   **Canonical React Runtime**: React + TypeScript + Vite under `web/` owns all
    customer browser routes. Legacy browser modules are retained only as
    decommission evidence until the final validation/observation gate.
*   **Improve Code Maintainability**: Allow developers to locate bugs and implement enhancements in focused service files without causing merge conflicts.

---

## 2. Refactoring Checklist

*   **[Step 1: Modularize Client-Side Monolith](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/001-client-refactor-modularization.md)**
    *   Separate core state, constants, and mappings.
    *   Modularize reference managers and the prompt compiler.
    *   Decompose form renderer, persistence, and service layers (history, collection, generation, lightbox).
    *   Reduce `client/app.js` to an entry point bootstrap script.
    *   Update script imports in `client/index.html` in correct dependency order.

*   **[Step 2: Reorganize Server Folder, Runtime Data, and Domain Modules](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-server-folder-reorganization.md)**
    *   Move runtime JSON files under `server/data/`.
    *   Add a central server path resolver.
    *   Standardize JSON read/write through a shared repository file store.
    *   Group domain services by business capability.
    *   Extract repositories and route modules in safe phases.
    *   Final cleanup removes root-level compatibility re-export files and old data path fallbacks.
    *   Sub-phases:
        *   [002-001 Data Relocation And Path Resolver](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-001-server-data-relocation-and-path-resolver.md)
        *   [002-002 Shared JSON Store And Repository Write Contract](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-002-shared-json-store-and-repository-write-contract.md)
        *   [002-003 Domain And Repository Folder Extraction](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-003-domain-and-repository-folder-extraction.md)
        *   [002-004 Route Extraction And Server Bootstrap Cleanup](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-004-route-extraction-and-server-bootstrap-cleanup.md)
        *   [002-005 Cleanup Documentation And Final Validation](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/002-005-cleanup-documentation-and-final-validation.md)

*   **[Step 3: Template Reference Control Visibility](file:///d:/development/ModelPromptForge/requirements/099-technical-dept/003-template-reference-controls-visibility.md)**
    *   Hide standard reference controls when Scene Template replacements own the workflow.
    *   Prevent stale normal-mode Face/Style/Pose flags from entering template generation payloads.

## 3. Current Server Architecture After Step 2

```text
server/
  app/                 Express app composition and route registration
  config/              Path and provider configuration
  data/                Local JSON runtime state only
  domain/              Business behavior grouped by capability
  middleware/          Express middleware
  providers/           AI provider adapters and provider registry
  repositories/        Storage adapters and shared JSON file store
  server.js            Bootstrap, env loading, listen, startup warmers
```

Rules after cleanup:

*   Runtime JSON belongs under `server/data/`.
*   Root-level compatibility re-export files should not be reintroduced.
*   Route modules receive dependencies from `server/app/createApp.js`.
*   Domain modules should use repository contracts for JSON state.
*   New JSON writes should use `server/repositories/json/jsonFileStore.js`.

## 4. Project-Wide File Placement Reference

This section is the source of truth referenced by the repository-level `AGENTS.md`. Every new or moved file must have a clear owner in this map.

### 4.1 Server

| File responsibility | Canonical location |
|---|---|
| Process bootstrap, environment loading, HTTP listen | `server/server.js` |
| Express composition and dependency wiring | `server/app/createApp.js` |
| Capability-oriented HTTP endpoints | `server/app/routes/` |
| Shared route error translation | `server/app/` |
| Business rules and orchestration | `server/domain/<capability>/` |
| Credit workflow facade and internal Credit policy | `server/domain/credits/CreditApplicationService.js`, `server/domain/credits/` |
| Generation submission facade and Queue lifecycle | `server/domain/generation/GenerationApplicationService.js`, `server/domain/generation/QueueManager.js` |
| Generation Group persistence and child status aggregation | `server/repositories/generation/GenerationGroupRepository.js`, `server/data/generation/groups.json` |
| Guarded video capability catalog, durable provider-task lifecycle and actor task reads | `server/domain/generation/VideoCapabilityRegistry.js`, `server/domain/generation/VideoProviderTaskService.js`, `server/repositories/generation/VideoProviderTaskRepository.js`, `server/app/routes/videoGenerationRoutes.js` |
| Persistence interfaces and adapters | `server/repositories/<capability>/` |
| Character Profile lifecycle, casting, sharing, usage and reusable private Character Look versions | `server/domain/character-profiles/`, `server/repositories/character-profiles/`, `server/data/character-profiles/`; Look state is owned by `CharacterLookService.js`, `CharacterLookRepository.js` and `looks.json`, while Cinematic stores only pinned authorized bindings |
| Fashion Blueprint planning, quotes, runs and assets | `server/domain/fashion-blueprint/`, `server/repositories/fashion-blueprint/`, `server/data/fashion-blueprint/` |
| Cinematic Project, Story Plan, Scene, Shot, continuity, Storyboard keyframe contract, Produce video packet and Finish timeline orchestration | `server/domain/cinematic/`, including `StoryboardKeyframeContractCompiler.js`, `CinematicVideoPacketCompiler.js` and `CinematicTimelineCompiler.js`; configuration lives under `server/config/cinematic/`, persistence under `server/repositories/cinematic/` and `server/data/cinematic/`; provider tasks remain in Generation and financial state remains in Credits |
| Canonical Template definitions, immutable versions, use sessions and usage events | `server/domain/templates/`, `server/repositories/templates/`, `server/data/templates/` |
| Private Template Pose Proxy preparation, cache lifecycle and readiness | `server/domain/template-pose-proxy/`, `server/repositories/template-pose-proxy/`, `server/data/template-pose-proxy/` |
| Shared uploaded generation reference validation and storage | `server/domain/assets/`, `server/repositories/assets/`, `server/data/assets/` |
| Durable cinematic video Asset copy, poster derivative and safe Community video publication | `server/domain/assets/CinematicVideoAssetService.js`, `server/domain/assets/VideoPosterService.js`, `server/domain/community/CommunityVideoShareService.js`; Community post state remains in `server/repositories/community/` |
| Cross-surface reference authority, preprocessing plans and processor orchestration | `server/domain/reference-processing/`, configured by `server/config/reference-processing-policy.json` |
| Canonical Attribute definitions, revisions, compatibility and published releases | `server/domain/attribute-catalog/`, `server/repositories/attribute-catalog/`, `server/data/attribute-catalog/` |
| Cinematic Project, Cast, Story, Scene, Shot, continuity and timeline orchestration | `server/domain/cinematic/`, `server/repositories/cinematic/`, `server/data/cinematic/`, `server/app/routes/cinematicRoutes.js` |
| Cross-workflow correlation context and sanitized Admin trace composition | `server/middleware/`, `server/domain/observability/`, `server/domain/admin/AdminInvestigationService.js`; a durable observability event repository remains a production migration item |
| Versioned Admin runtime-configuration drafts and immediate Provider/Model availability controls | `server/domain/admin-configuration/`, `server/repositories/admin-configuration/`, `server/data/admin-configuration/`; `ProviderControlApplicationService.js` owns master/workflow override commands, while Image, Video and AI Text consumers enforce `ProviderAvailabilityPolicyService.js` before new work is accepted |
| Admin operational read models, reversible staff presentation and guarded User status commands | `server/domain/admin/`, `server/repositories/admin/`, `server/data/admin/`, `server/domain/identity/AdminIdentityService.js`; owner lifecycle evidence remains in Generation, Credits, Community and Cinematic |
| Support Case lifecycle, links, notes and optimistic versioning | `server/domain/support/`, `server/repositories/support/`, `server/data/support/`; production adapter moves to PostgreSQL without changing the service contract |
| Bounded process-local performance timing and slow-request measurement | `server/domain/observability/PerformanceTelemetry.js`, `server/middleware/requestPerformanceMiddleware.js` |
| Shared atomic JSON implementation | `server/repositories/json/` |
| Runtime JSON state | `server/data/<capability>/` |
| Request actor/security middleware | `server/middleware/` |
| AI provider adapters and registry | `server/providers/` |
| Paths, provider metadata, and server configuration | `server/config/` |
| Isolated prompt and visual research | `lab/<experiment>/` |

Server placement rules:

*   `server/` root may contain the bootstrap file and architecture-owned top-level folders only.
*   Do not add root compatibility re-export files for moved modules.
*   A route should coordinate HTTP input/output and delegate business behavior.
*   A domain module should not hard-code runtime JSON paths.
*   Data access should be replaceable without rewriting route or domain contracts.
*   Experimental code under `lab/` must not be imported by production runtime
    modules. Promote reviewed, versioned configuration into its canonical owner
    with schema validation and tests.
*   Large/private Lab datasets, raw provider responses, generated images and
    experiment output remain local and must be excluded from Git.

### 4.2 Frontend

| File responsibility | Canonical location |
|---|---|
| React bootstrap and app providers | `web/src/main.tsx`, `web/src/app/` |
| React navigation metadata | `web/src/app/routeRegistry/` |
| React routes and feature orchestration | `web/src/features/<feature>/` |
| Character Profile and reusable Character Look owner UI/application boundary | `web/src/features/profiles/`; the shared source-draft dialog belongs in `web/src/features/profiles/components/` and may be invoked by Cinematic without creating Cinematic-owned Look persistence |
| Cinematic Studio routes, stage orchestration, story/Shot/timeline UI and actor draft adapters | `web/src/features/cinematic/`; shared Generation, media, Credit and theme presentation remains under its current shared owner |
| Unified Playground image/video route orchestration and actor-scoped mode drafts | `web/src/features/playground/`; provider dispatch remains in Generation and shared media/result UI remains under existing shared owners |
| Community typed image/video publication, feed and post presentation | `web/src/features/community/`; durable delivery remains in Assets and generation remains in Generation |
| Admin and Support operational workspace, Provider/Model controls, User detail, Cinematic operations and Attribute authoring | `web/src/features/admin/`; `/admin/providers` is the unified read/mutation surface, shared presentation stays in `web/src/features/admin/components/`, API/schema boundaries stay in the feature, owner commands remain server-side capability contracts |
| Template serialization and client contracts | `web/src/features/templates/` |
| Reusable Template presentation and replacement controls | `web/src/components/templates/` |
| Reusable React UI and workflow components | `web/src/components/` |
| Shared normal-generation result grid and group polling | `web/src/components/generation/GenerationResultGrid.tsx`, `web/src/features/generation/hooks/useGenerationGroup.ts` |
| Shared API, identity, i18n and telemetry adapters | `web/src/lib/` |
| Actor-aware query keys and shared polling policy | `web/src/lib/api/queryKeys.ts`, `web/src/lib/api/pollingPolicy.ts` |
| Request/correlation propagation and safe support references | `web/src/lib/api/`, `web/src/lib/telemetry/` |
| Semantic theme resolution and actor preference | `web/src/lib/theme/`, `web/src/styles/themes.css` |
| Actor-scoped draft and handoff persistence | `web/src/lib/persistence/` |
| Server-owned feature exposure client | `web/src/lib/permissions/` |
| Design tokens and global responsive styling | `web/src/styles/` |
| Canonical UI visual language and agent guidance | `requirements/Knowledge/ui-design-system-and-visual-language.md` |
| Runtime application assets | `client/assets/<feature>/` |
| Translation manifests, schemas, and locale catalogs | `client/i18n/` |
| Generated image output | `client/outputs/` |
| Legacy browser source pending post-validation deletion | `client/` excluding retained data/assets |

Frontend rules:

* Every browser route has React as its only runtime owner.
* React source must not import legacy `window.ModelPromptForge*` modules.
* Server API/domain/repository contracts remain authoritative.
* Browser image uploads are persisted through the shared server asset domain;
  React generation state stores lightweight actor-owned references, not Base64.
* New customer functionality is implemented once under `web/`.
* `client/i18n`, `client/assets`, and `client/outputs` remain retained runtime
  data boundaries; other legacy client files are not implementation precedents.

Client placement rules:

*   Keep route orchestration inside its React feature owner.
*   Extend an existing feature/component owner before adding another global abstraction.
*   `client/i18n/` contains source-controlled UI translations, never runtime user data or AI prompt text.
*   Browser libraries installed through npm but served without a build tool must be copied to `client/assets/vendor/<library>/` before use.
*   Generated output is runtime data and must not be treated as a source asset.

### 4.3 Assets, Scripts, Tests, and Requirements

| File responsibility | Canonical location |
|---|---|
| Character Builder source sheets and authoring manifests | `visual-assets/character-builder/` |
| Sliced assets consumed by the application | `client/assets/visual-character-builder/` |
| Migration and maintenance utilities | `scripts/` |
| Automated tests and fixtures | `test/` and `test/fixtures/` |
| Business and implementation requirements | `requirements/<phase-or-domain>/` |
| Professional agent routing, cross-project Product/QA roles and artifact map | `requirements/015-professional-agent-orchestration/` |
| External image, video and text provider contracts, pricing evidence and qualification | `requirements/020-generation-providers/` |
| Domain professional role charters | Owning requirement under `requirements/<domain>/roles/` |
| Repository-wide discoverable Codex Skills | `.agents/skills/<skill-name>/` |
| Directory-scoped agent instruction deltas | Nearest justified `AGENTS.md` below the repository root |
| Cross-project architecture and technical debt plans | `requirements/099-technical-dept/` |

### 4.4 New Folder Decision Rule

Create a new folder only when all of the following are true:

1. No existing folder owns the capability.
2. The new capability contains or is expected to contain more than one cohesive module.
3. Its dependency direction is clear.
4. Its runtime data location is separate from its functional code.
5. This document is updated in the same change set.

For a single small module, place it in the nearest existing capability folder and avoid speculative hierarchy.

### 4.5 Required Final Check

Playground video reference ownership addendum (2026-09-07):
`server/domain/generation/PlaygroundVideoReferenceService.js` is internal to
VideoGenerationApplicationService. It resolves versioned Playground source plans
through Character/Assets authorities; it does not own dispatch or Credit mutations.
`web/src/features/playground/components/PlaygroundVideoSources.tsx` and
`videoReferenceSelection.ts` own the source controls and client selection mapping,
reusing Profiles' CharacterLibraryPicker. Scoped styling lives in
`web/src/styles/playground-video-references.css`. No runtime storage path changes;
existing registered reference Assets and actor-scoped Playground draft v3 apply.
Focused checks: `scripts/test-playground-video-references.mjs` and
`scripts/verify-playground-video-references.mjs`; owning requirements:
`requirements/016-cinematic-studio/playground-video-reference-poc/`.

Presentation ownership addendum (2026-09-07): CommunityTemplateDetailService owns
both single-family detail and bounded Gallery preview reads through
CommunityShareService. Profiles owns characterDisplayImage.ts and featured-work
summary projection; shared DisplayMediaImage is controlled presentation only.
Provider mark runtime assets belong to client/assets/providers/. No new runtime
data store, provider entry point or Generation reference authority is introduced.
See community Page-Enhancement requirement023 and implementation-plan034.

Trusted generated-source amendment (2026-09-07):
`server/config/trustedGeneratedSources.js` owns the source allowlist and lifetime
policy, exposed for restricted Playground models by VideoCapabilityRegistry.
`server/domain/generation/TrustedGeneratedSourceService.js` owns capture,
eligibility, listing projection, original URL verification and rejection evidence.
QueueManager delegates capture after original image persistence; video callers
use VideoGenerationApplicationService, never a second provider/credit pipeline.
`server/repositories/generation/TrustedGeneratedSourceRepository.js` owns the
private `server/data/generation/trustedGeneratedSources.json` via config/paths.js
and atomic JSON storage. It is keyed by generation ID and owner ID; original
signed URLs are never public History, task DTO or browser draft fields.
`GET /api/generation/video/trusted-sources` exposes only owner-scoped safe data,
24 records per history page, with existing cursor semantics and no-store.
React owner: Playground's `api/trustedVideoSources.ts` and
`components/TrustedVideoSources.tsx`, using actor-scoped TanStack Query, existing
Dialog/media primitives and draft v4. No new polling/cache owner. Existing
PlaygroundVideoSources continues to own other-model uploads/Character controls.
See Playground POC 004-008. These amendments supersede v3/no-new-storage claims
in the earlier addendum only for the trusted generated-source capability.

Playground reference completion addendum (2026-09-07):
`TrustedGeneratedSourceService` owns eligible-only filtering before History
pagination, backed by `TrustedGeneratedSourceRepository.listForOwner`; the HTTP
route exposes only the bounded `eligibleOnly` flag. Credits owns the shared
development POC override for both `cinematic_video` and `playground_video`, while
retaining provider cost evidence. Profiles' Character type policy now exposes
the canonical `playground_image` handoff destination; Community projection
normalization preserves it, and Playground consumes the handoff through the
shared CharacterLibraryPicker. The actor-scoped Image Playground draft is schema
version 2 and stores the selected Character summary/handoff metadata without
Base64. Character Look creation remains owned by the existing Profile dialogs
and services. Focused and aggregate checks remain under
`scripts/test-playground-video-references.mjs`.

Every implementation handoff must report:

```text
new files and their owning capability
moved files and updated import consumers
runtime data paths introduced or changed
architecture documentation changes, when applicable
validation commands the user should run
```
