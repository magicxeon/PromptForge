# Technical Debt & Code Quality Master Plan (099-technical-dept)
**ID**: 099-technical-dept-master
**Application**: `ModelPromptForge`

This directory tracks refactoring tasks, technical debt payments, and modularization requirements designed to keep the codebase maintainable, performant, and clean.

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
| Persistence interfaces and adapters | `server/repositories/<capability>/` |
| Character Profile lifecycle, casting, sharing and usage | `server/domain/character-profiles/`, `server/repositories/character-profiles/`, `server/data/character-profiles/` |
| Fashion Blueprint planning, quotes, runs and assets | `server/domain/fashion-blueprint/`, `server/repositories/fashion-blueprint/`, `server/data/fashion-blueprint/` |
| Canonical Template definitions, immutable versions, use sessions and usage events | `server/domain/templates/`, `server/repositories/templates/`, `server/data/templates/` |
| Private Template Pose Proxy preparation, cache lifecycle and readiness | `server/domain/template-pose-proxy/`, `server/repositories/template-pose-proxy/`, `server/data/template-pose-proxy/` |
| Shared uploaded generation reference validation and storage | `server/domain/assets/`, `server/repositories/assets/`, `server/data/assets/` |
| Cross-surface reference authority, preprocessing plans and processor orchestration | `server/domain/reference-processing/`, configured by `server/config/reference-processing-policy.json` |
| Canonical Attribute definitions, revisions, compatibility and published releases | `server/domain/attribute-catalog/`, `server/repositories/attribute-catalog/`, `server/data/attribute-catalog/` |
| Cross-workflow correlation context, sanitized trace events and support trace lookup | `server/middleware/`, `server/domain/observability/`, `server/repositories/observability/`, `server/data/observability/` |
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
| Admin Attribute authoring and catalog operations | `web/src/features/admin/attributes/` |
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
| Professional agent roles, routing policy and Skill plans | `requirements/015-professional-agent-orchestration/` |
| Professional role charters and repository-local Skills | `requirements/015-professional-agent-orchestration/roles/`, `requirements/015-professional-agent-orchestration/skills/` |
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

Every implementation handoff must report:

```text
new files and their owning capability
moved files and updated import consumers
runtime data paths introduced or changed
architecture documentation changes, when applicable
validation commands the user should run
```
