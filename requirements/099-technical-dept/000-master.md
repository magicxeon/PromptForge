# Technical Debt & Code Quality Master Plan (099-technical-dept)
**ID**: 099-technical-dept-master
**Application**: `ModelPromptForge`

This directory tracks refactoring tasks, technical debt payments, and modularization requirements designed to keep the codebase maintainable, performant, and clean.

## Current Capability Addendum

### Series, Seasons And Chapter Workspaces (2026-09-12)

Owner: Cinematic enhancement-core-engine/026-028 supersedes 022 runtime deferral.
CinematicApplicationService remains the public facade; internal
CinematicSeriesService owns structure rules. CinematicProjectRepository atomically
mutates owner-scoped Series and Chapter Projects in the existing cinematicProjects
envelope. cinematicProjectRecord owns the shared new-Project factory. Additive
seriesMembership/chapterOrigin fields preserve existing routes and production IDs.
No new runtime file, database migration, provider path, Credit or media owner.
React SeriesWorkspaceControls/SeriesManagerDialog and cinematicSeries schemas/API
live in the Cinematic feature; actor/project Query ownership refetches on changes
and has no polling. Bounded workspace read: 24 Seasons and 120 Chapter summaries.
Validation owners: scripts/test-cinematic-series.mjs and verify-cinematic-series.mjs.
Shared live Series Bible/AI season planning and season movie assembly remain future.

### Cinematic Pilot Authoring, Takes And Clip ZIP (2026-09-12)

Owner: Cinematic produce-video-pipeline/014-021, plan 009. Generation's existing
VideoCapabilityRegistry exposes firstFrameEnabled from SEEDANCE_FIRST_FRAME_ENABLED
(default false). Quotes/submissions reject disabled Seedance frames before billing.
Cinematic context/reference/packet/timeline owners add text_only for no-Cast Shots.
Existing Project storage retains stills, modes and approvedVideoAttemptId; no new
runtime directory, backfill, Credit owner or provider dispatch path is introduced.

Scene.cinematicOpening and Shot.audioDirectionVersion=1 are additive fields in
the existing Cinematic Project/plan contracts. Opening guidance lives in
server/config/cinematic/story-authoring.v1.json. Versioned audio rendering keeps
unmodified legacy packets stable. React authoring owns DialogueSoundEditor and
DialogueSoundSummary; Produce owns VideoTakeList and ClipBundleDownload. Shared
StoryboardSequenceBoard owns whole-card hit areas and source-mode icon previews.

CinematicApplicationService prepares selected-clip manifests and delegates file
validation/ZIP streaming to server/domain/assets/VideoClipBundleService.js.
The existing cinematicRoutes register GET/POST projects/:projectId/clip-bundle.
Archives contain at most 128 clips / 128 MiB media plus ZIP overhead. Server
streams without retained archives; browser uses a bounded authenticated Blob.
Manifest Query keys include actor/project/version, refetch on open, GC after 60s;
no new polling or transport cache. Existing Assets storage stays authoritative.
Validation: scripts/test-cinematic-video.js and scripts/verify-cinematic-pilot.mjs.
Series/Season/Chapter remains design-only under enhancement-core-engine/022.

### Look Sheet URL Fallback And Named Start Images (2026-09-12)

Owner: Cinematic playground-video-reference-poc/016-018. Generation's
TrustedGeneratedSourceService resolves expired original URLs to identical local
Look Sheet bytes via VideoReferenceAssetContent, shared by Cinematic and Playground.
No persistent Base64, transport cache, new provider pipeline or runtime data path.
VideoReferencePlan owns the additive image_reference purpose and neutral name
mapping. Playground's VideoImageReferenceSources reuses its existing pickers;
PlaygroundVideoWorkspace actor draft v6 migrates legacy single images to named
arrays. Validation extends scripts/test-playground-video-references.mjs.

### Optional Cinematic First Frame (2026-09-12)

Produce-video-pipeline/013 and plan 003i extend CinematicApplicationService's
existing context/quote/attempt/approval contract with looks_only. The
updateShotVideoReferences use case and thin Shot video-references PATCH store
videoReferenceMode/lastFirstFrameMode in existing Project JSON. No migration,
new runtime directory, provider pipeline or Credit owner is introduced.
Reference planning stays in CinematicVideoReferencePlanService; prompt policy is
video-packet-policy.v2.json. Generation derives real per-sheet trusted authority
and resolves each original URL privately. Timeline/lineage ignore unused frame
dependencies without fabricating image approval.

React Cinematic state/useShotVideoReferences.ts owns the shared server mutation
for Storyboard and Produce, with existing actor identity and Project refresh.
ProduceVideoReferences is controlled presentation. Preview mapping extends the
existing storyboardGenerationAdapter; it is not a trust validator. No browser
media persistence, new cache or polling loop. scripts/test-cinematic-video.js
is the aggregate gate; existing reference-layout runner owns scoped visual QA.

### Direct Generated Cast And Provisional Image 2.5 Pricing

2026-09-09: Cinematic workflow-redesign/008-011 supersedes the generated Wardrobe
entry below. CinematicApplicationService.upsertCastAssignment owns the source
union; internal CinematicGeneratedCastService delegates source authority to
Generation/TrustedGeneratedSourceService and original Asset import to Assets.
An intrinsic project Look supports scene/shot selection without a Character
Profile or CharacterLook. Existing project JSON gains sourceType/generatedSheet;
no new runtime file or destructive backfill. The old import HTTP route is retired;
historical Character Looks remain resolvable.

GeneratedLookSourceField moves from Profiles/components to
web/src/components/generation/GeneratedLookSourceField.tsx; Cast's
GeneratedCastDialog consumes it with the existing Generation source API.
No new polling, persistent browser media or signed-URL exposure. The existing
bounded source page/query ownership remains unchanged.

Image provider/008 extends measured baselines with configurable provisional
pixel/quality/reference assumptions. server/config/openAIImage25.js owns output
dimensions shared by provider dispatch and Credits; no duplicated size mapping.
Immutable quote, actual usage cost and old reserved charge remain separate.

### Image 2.5 Measured Pricing

2026-09-09: Provider image/007 supersedes the test-tariff statements below.
Credits/OpenAIImage25Pricing is an internal pure calculator for measured quote
baselines and modality-specific usage costs. CreditPricingPolicyService pins
rates/evidence; CreditReservationService validates retired test quotes at all
reservation entry points and adds usage cost metadata at capture without
changing the confirmed charge. Queue passes usage through CreditApplicationService.
CreditAccountRepository.getReservationForOwner is a read-only, actor-scoped
snapshot lookup; existing capture ledger metadata holds the cost evidence.
No new persistence path, migration, prompt storage, cache or polling. Finance
inventory exposes token rates; monthly cash/cost reconciliation remains separate.

### Shared Processing And Comparison Black Export

2026-09-09: CLSFE 025-029 owns shared UI ProcessingSpinner, reused by the
Generation loading wrapper and current spinner consumers. Comparison export
stays in Assets/MediaExportService, with internal comparisonExportLayout and
comparisonExportRenderer modules; imageExportRenderer retains Look Sheet behavior.
Assets/exportText serializes native font registration/text rendering for both
exports. Its process-lifetime registry contains at most 16 trusted font paths,
no user text/media; font deployment changes require process restart. No polling.
ComparisonExportDialog owns transient encoded preview/download state, never AI
dispatch or private persistent media. New focused tests and scripts own validation.
No new repository, runtime data path, original-media modification or polling.

### Image 2.5 Testing And Generated Cast Sheets

2026-09-09: Provider image/006 supersedes the prior development-only release
block in image/005. Existing ProviderRegistry internal_testing flags open the
two Image 2.5 models; Credits owns a versioned 1-Credit/output test tariff and
production denial at quote/reservation. No actual cost is fabricated.

Character Look workflow-redesign/006-007 owns generated-sheet import through
CharacterLookService.importGeneratedSheet and its thin character-profile route.
Generation's TrustedGeneratedSourceService owns describeOwnedImage and private
resolveOwnedImage; Assets' CinematicWardrobeAuthorityService imports the original
through AssetRepository's opt-in source deduplication. Looks retain generated_import
provenance, manual identity confirmation, and whole-sheet references with no crops.
CinematicVideoReferencePlanService/VideoGenerationApplicationService preserve
trustedGenerationId and revalidate it before private original-URL dispatch.

Client API ownership moves to `web/src/features/generation/api/trustedVideoSources.ts`.
The old Playground module is a temporary re-export for existing callers/tests;
remove it after those imports are migrated, with TrustedVideoSources regressions
passing. Profiles' `GeneratedLookSourceField.tsx` owns the inline paginated source
field in CharacterLookDialog, reusing existing actor-scoped Query keys and media.
Cast > Wardrobe exposes a third direct source command opening generated mode;
Upload/AI and existing approval/binding recovery retain their entry points.
No new polling/cache, repository, runtime data path, media rewrite or backfill.
New validation owners: `test/generatedCastSheet.test.js`,
`scripts/test-generated-cast-sheets.mjs` and `scripts/verify-generated-cast-sheets.mjs`.
Existing Image 2.5 and Look Sheet verification runners also cover test exposure.

### OpenAI Image 2.5 And Editorial Look Sheets

2026-09-09: Provider image/005 owns Sunburst/Flare additions to existing
OpenAIProvider and provider catalog. Credits policy stores token-rate evidence;
production customer-paid routing remains unavailable pending consumption/retail approval.
No guessed per-image rates or new provider pipeline.

CLSFE 022-024 activate `server/config/prompt-recipes/character-looks/document-sheet.v2.json`
through existing LookSheetDefinitionService. New snapshots pin preset/layout/text
policy; both preset versions remain readable. Assets' existing renderer preserves
v1 headings and avoids duplicate v2 text. No runtime storage path, original-media
mutation or trusted reference policy change. `scripts/test-openai-image25.mjs`
owns provider checks; existing Look Sheet runner gains editorial groups.

### Look Sheet Momelo Enhancement

2026-09-09 dynamic-render addendum: CLSFE 017-021 own document-only adult
validation, catalog ratio transitions and media-first form presentation.
`web/src/features/generation/hooks/useLookSheetRender.ts` coordinates the existing
Generation API contracts; Profiles' Enhancement panel is now presentation-only.
It reuses durable enhancement operations and canonical image requests, with actor
draft operation/image-request IDs for recovery. No new server storage or wallet.
Studio paid enhancement exposure remains unchanged pending explicit approval.

Execution addendum 2026-09-08: implementation authorized. Generation owns
`LookSheetEnhancementService.js` and private `PromptEnhancementRepository.js`;
the latter uses configured `DATA_FILES.promptEnhancements` under
`server/data/generation/promptEnhancements.json`, never public assets. Records
are bounded (5,000; fail closed at capacity); prompt artifacts expire after 30
days, and expired private text is purged on mutation while settlement evidence
is retained. Single API writer is required, matching current JSON wallet scope.
Credits owns `TextEnhancementPricing.js` and text quote/reservation facade methods.
Provider request preparation stays behind PromptRefinementService/OpenAITextProvider.
The Profiles editor owns enhancement selection; GenerationExperience exposes a
builder render contract, not another generation pipeline. Tests use temp storage.

- [CLSFE-ME 011-016](../016-cinematic-studio/character-look-sheet-generation/form-and-export/011-momelo-enhancement-master.md)
  own prominent Character Prompt, Natural Realism and separately quoted AI
  rewriting. Runtime implementation and isolated regression checks are delivered;
  paid provider UAT and production multi-writer readiness remain open.
- GenerationApplicationService remains the public use-case owner; existing
  PromptRefinementService/provider handles AI, Character Profiles owns normalized
  identity/definition, and Credits alone owns text quote/reserve/settlement/recovery.
- Private Generation records use `server/repositories/generation/PromptEnhancementRepository.js`
  and `DATA_FILES.promptEnhancements` as described above. No public route serves this store.
- Shared form and Profiles adapter stay in their current locations. Existing
  Look Sheet runner includes explicit enhancement groups. No second compiler,
  wallet, global Playground realism switch or automatic paid Studio operation.

### Planned Character Look Sheet Forms And Media Exports

- [CLSFE requirements and plan](../016-cinematic-studio/character-look-sheet-generation/form-and-export/000-master.md)
  own the proposed Playground Image submode and Studio format. Documentation
  only; generation strategy still needs confirmation and no runtime is changed.
- Character Profiles owns definition/identity rules; existing Generation owns
  prompt/quote/Queue/History and Credits owns settlement. Standalone authoring
  is not an auto-created approved Character or Community Template.
- Planned shared controlled form belongs in `web/src/components/profiles/`.
  Feature adapters stay under Playground and Studio; typed definitions under
  Profiles and existing Generation API schemas. No separate client pipeline.
- Planned Download composition belongs to `server/domain/assets/` through a
  MediaExportService facade, a thin route under `server/app/routes/`, config in
  `server/config/` and default PNG artwork under `client/assets/brand/`.
  Generation/Comparison source authorization remains behind owning facades.
- Reuse existing Sharp infrastructure for bounded CPU exports. No independent
  GPU service, new data repository, original-media rewrite or Seedance policy
  change is part of the initial scope. Favicon reuses the existing web brand mark.
- Proposed `scripts/test-look-sheet-exports.mjs` will own focused groups and
  explicit aggregate checks; it is not created by the documentation delivery.

### Named Video Look Sheets

- Cinematic Playground reference POC requirement 014 owns named Look lists.
- Playground VideoLookSheetSources composes existing ordinary/trusted pickers;
  PlaygroundVideoWorkspace owns actor-draft v5 arrays and videoReferenceSelection
  owns their ordered request projection.
- Generation VideoReferencePlan owns validated names, fingerprints and prompt
  mapping; VideoGenerationApplicationService enforces model capacity before source
  loading, then existing source services retain owner/trusted transport authority.
- Optional characterName persists in existing sanitized task references. No new
  repository/data path or capability gates. Existing focused video-reference runner
  includes named-looks and explicit layout-named/layout-named-trusted checks.

### BytePlus Pricing Reconciliation

- Provider requirements image/004 and video/004 own pixel cost tiers and dated
  token-rate discounts. Credits remains the sole estimator/reservation owner.
- Credits/BytePlusImagePricing.js reuses the existing exported provider output
  size resolver; no duplicate size table, provider dispatch or new runtime store.
- Existing quote breakdowns retain rate evidence. Finance inventory reads the
  canonical configs; public VideoCapabilityRegistry DTOs exclude raw rate data.
- scripts/test-byteplus-pricing.mjs provides isolated focused and aggregate gates.

### Route Scroll Navigation

- React migration requirement 020 owns document scroll navigation. AppShell mounts
  components/layout/RouteScrollManager; lib/navigation/returnNavigation and
  ContextBackLink keep return entry identity and actor-safe URLs.
- Bounded in-memory entry positions and temporary DOM observers belong to this
  single navigation owner, not feature pages. No runtime data or API changes.
- scripts/test-route-scroll.mjs owns focused unit/browser and explicit all gates.

### Character Profile Maintenance

- Community Page Enhancement 038-041 and implementation Plan 036 own original
  sheet fallback, confirmed owner deletion and explicit My images cover selection.
- Existing CharacterProfileService/SharingService and ProfileRepository remain
  canonical. Display-only sheet endpoints do not replace generation references.
  The existing profiles JSON gains deletion time/actor/previous-state tombstone
  fields; Audit receives sanitized events. No new runtime store or migration.
- Profile reads exclude deleted records by default. The existing usage completion
  handler may include tombstones only to retain historical accepted-work stats.
  Look mutations/media reauthorize through existing CharacterUsageService.
- DeleteCharacterDialog is feature-owned under web/src/features/profiles/components;
  CharacterFeaturedImagePicker stays shared and receives state/callbacks. The
  focused runner is scripts/test-character-profile-maintenance.mjs. Existing
  publication-profile layout verification covers the new owner states.

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
## Studio Realism And Video Reference Hardening

Current bounded plan: [studio-realism-video-hardening/000-master.md](studio-realism-video-hardening/000-master.md).
Generation owns the Studio-only recipe/compiler policy; Playground owns Video
selection UI. Existing Character/History authorities validate references.
Runtime Git hygiene is maintenance-only and does not move persistence ownership.

## Character Document Sheet And Image Exports (2026-09-08)

Owner: `requirements/016-cinematic-studio/character-look-sheet-generation/form-and-export/`.
Profiles owns `LookSheetDefinitionService.js`, the versioned
`server/config/prompt-recipes/character-looks/document-sheet.v1.json`, client
`lookSheetDefinitionSchemas.ts` and `CharacterLookSheetExperience.tsx`.
The controlled form is `web/src/components/profiles/CharacterLookSheetForm.tsx`;
its limited responsive overrides are `web/src/styles/character-look-sheet-form.css`.
Playground/Studio reuse it through GenerationExperience; no parallel queue,
reference resolver or Credit lifecycle. `server/config/lookSheetDocumentPolicy.js`
owns the production-off exposure flag. Generation's existing compiler facade
also serves the actor-only, non-Template `/api/generation/look-sheet-preview`.

Assets owns `MediaExportService.js`, `imageExportRenderer.js`,
`server/config/mediaExports.js` and `server/app/routes/mediaExportRoutes.js`.
It reads authorized original images through Generation's
`GenerationExportSourceService.js` and ComparisonOrchestrator.getExportProjection.
Comparison owns client `comparisonLayout.ts` and server `comparisonLayout.js`;
both are checked against `test/fixtures/comparison-layout-v1.json` policy v1.
`MediaExportButton.tsx` and `web/src/lib/api/mediaExportApi.ts` own shared binary
Download interaction/transport, without provider or commercial logic.
Brand export PNG is `client/assets/brand/momelo-export-mark.png`, derived from the
existing Web Momelo SVG. Favicon remains owned by `web/index.html`.

No source moves, new runtime JSON path, public derivative store or dependency.
Optional accepted snapshot stays in existing Generation Job/History records.
Drafts use actor-scoped schema v1 per `look-sheet-playground` / `look-sheet-studio`;
only bounded form fields and selected Character/version IDs are retained.
Export buffers exist only during the request, bounded by 64 MiB source bytes,
40 MP per source, 16 MP output, two active exports and a 15-second deadline.
Cancellation stops between native operations; the current Sharp operation uses
the remaining deadline (one-second timeout granularity).
Preset query is one immutable server-recipe entry per browser QueryClient,
invalidated by reload/deployment; no feature-local polling or image cache.
Focused checks: `scripts/test-look-sheet-exports.mjs`;
per-page fixture layouts: `scripts/verify-look-sheet-exports.mjs`.

## Cinematic Directed Openings (2026-09-10)

Owner: `requirements/016-cinematic-studio/enhancement-core-engine/017-023`.
Versioned authoring choices/limits and text-model defaults live in
`server/config/cinematic/story-authoring.v1.json` and `text-model-policy.v1.json`,
validated by `server/config/cinematicStoryConfiguration.js`. Existing policy
facades preserve environment overrides and keep credentials private. The existing
public Cinematic authoring manifest projects safe choices; no second catalog API.
Recipes `cinematic/story-plan.v8.json`, `scene-direction.v7.json` and
`story-enhancement.v1.json` stay under `server/config/prompt-recipes/`.

Cinematic owns `CinematicCastCoverage.js` and `CinematicImageCastReferences.js`
under `server/domain/cinematic/`. They define explicit coverage and at most six
named, actor-authorized sheet bindings. Generation prepares/revalidates sources;
Reference Processing remains the owner of order/count/capacity/fingerprint.
Queue dispatch consumes that plan, not a separate Cinematic provider pipeline.
The Video application derives trusted Storyboard Job IDs from immutable Assets
and resolves provider-original URLs privately through the existing trust facade.

React `StoryIntentChoices.tsx` belongs to Cinematic components. Scene Director,
proposal merging, single/batch Storyboard and GenerationExperience extend their
existing contracts. Responsive checkbox overrides stay scoped in cinematic.css.
No new cache, polling owner, runtime data directory or file move. Additive arrays,
castMode, artDirection and openingFrameVersion stay in existing Project records;
bounded named sheet bindings stay in existing Generation requests/Jobs. No
Base64 or signed original URL is added to client drafts or named bindings.

Validation owners: `test/cinematicDirectedOpeningConfiguration.test.js`,
`test/cinematicDirectedOpenings.test.js` and existing capability tests;
`scripts/test-cinematic-directed-openings.mjs` is the focused/aggregate entry;
`scripts/verify-cinematic-directed-openings.mjs` is isolated browser QA.
Series/Season/Chapter is documented but has no runtime/schema implementation yet.

Story Country Style follow-up (Cinematic enhancement-core-engine/024) uses the
same authoring JSON/normalizer and Setup persistence. Flag assets are local under
client/assets/cinematic/flags; ThemeSelect accepts optional decorative icons.
TrustedGeneratedSourceService owns Look Sheet category classification and filters
through the GenerationResultRepository history predicate before pagination.
No additional storage, provider dispatch, cache or polling owner is introduced.

Story versus role operation follow-up (Cinematic enhancement-core-engine/025)
adds validated purpose to the existing Generation story-enhancement facade.
The provider selects story-enhancement.v1.json or story-role-analysis.v1.json
and its corresponding structured output schema. Cinematic's
state/applyStoryEnhancement.ts owns purpose-specific draft application; it does
not create another server workflow. No new persistence, endpoint or cost policy.

## Simple Production And Sketch Composition (2026-09-12)

Cinematic enhancement-core-engine/029-033 owns this additive package. Cinematic's
existing Setup/Stage components provide Simple/Advanced views over the same
Project. Missing role preparation uses the existing story-enhancement facade.
Series runtime is now owned by enhancement-core-engine/026-028; the earlier
deferred-Series statement above is historical, not the current runtime status.

Storyboard prompt policy owns sketch style. Generation derives style metadata
in queue options and persists it in existing History; Storyboard Asset approval
adopts server-derived provenance. CinematicVideoReferencePlanService supplies
sketch_composition followed by existing Look mappings. Generation validates and
loads the immutable sketch through the existing verified Asset loader, then sends
reference_image, never first_frame. Video packet policy owns photoreal execution.
The disabled Seedance first-frame policy and Look authority rules remain intact.

Generation.getStoredTaskSummaries is the public bounded, owner-filtered read for
Cinematic Take reconciliation; no direct cross-capability repository mutation.
Previous-plan previews use existing task queries. No additional polling/cache.
Playground preferences/drafts and Produce preferences retain actor ownership;
attachment layout extends existing shared source controls and spinner.

No runtime data path or module move. Additive metadata stays in existing History,
Assets and actor-scoped preferences. New isolated tests remain under test/ and
owning selectable/browser runners under scripts/. Validation and manual pilot
prerequisites are documented in enhancement-core-engine/029.

### Open Generated Sources (034)

`server/config/generated-reference-policy.json` plus its validated loader
`generatedReferencePolicy.js` owns allowAnyProvider and blockedSources. Configuration
is read once per process; a content-derived policy version invalidates stale source
selections after restart. Existing TrustedGeneratedSourceService is the single
authorized list/prepare/resolve facade for generated Cast/Looks, including local
originals from other image providers; its legacy API name remains for compatibility.
No new reference cache, repository, polling path or private-data directory.

Local original transport does not confer provider-trusted provenance. Only selected
registered adapters receive verified bytes after quote/reservation. Source-provider
blocks are checked in the list and again at prepare/submit; upload ownership is
unchanged. Image age is no longer an eligibility rule; signed URL expiry falls back
to existing local bytes. Nullable legacy expiry fields remain readable without live
backfill. Credit, quote, auth-token and task expiry are not changed.

ProviderRegistry exposes source openness for Storyboard notices; image adapters
still enforce reference count/format. Muse's existing allowed surfaces/modes now
include reference-free Cinematic scene/Look Sheet generation. No Fashion exposure.
Shared source controls remove expiry UI without a layout redesign. Validation uses
existing test-generated-cast-sheets and verify-generated-cast-sheets runners; owning
requirements and commands are recorded in enhancement-core-engine/034.

Storyboard approval recovery (034 follow-up) uses the explicit
GenerationResultRepository.findStoryboardSourceForOwner read contract. History
remains authoritative; missing rows may resolve through completed, captured,
owner-matched Cinematic scene children in the existing Generation Groups store.
The Asset service still verifies local output bytes and creates its immutable
record. No History backfill, new runtime path or provider dispatch occurs.
Legacy child results without sketch metadata are never automatically relabeled.

Inline Storyboard editing (enhancement-core-engine/035) adds StoryboardShotEditor
under Cinematic components. It reuses authoring/ShotSequenceEditor in direction-only
mode and the existing version-checked Shot PATCH, retaining approved media while
marking downstream packets stale. Plan continues reading project.scenes.
ReferenceSlotGrid exposes an opt-in generated Look chooser for Playground general
Image; GeneratedLookSourceField owns category-filtered listing, and existing
upload/reference callbacks retain slot, actor and provider-capability ownership.
No new runtime data path or cross-capability mutation is introduced.
