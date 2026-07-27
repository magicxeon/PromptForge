# Technical Debt & Code Quality Master Plan (007-technical-dept)
**ID**: 007-technical-dept-master
**Application**: `ModelPromptForge`

This directory tracks refactoring tasks, technical debt payments, and modularization requirements designed to keep the codebase maintainable, performant, and clean.

---

## 1. Refactoring Goals
*   **Modularize `client/app.js`**: Split the giant monolithic file into smaller, focused modules based on functional concerns under `client/core/`.
*   **Reorganize `server/`**: Separate runtime data, domain logic, repositories, route registration, middleware, and provider integrations.
*   **Maintain Clean Global State**: Maintain `window.ModelPromptForgeState` as a unified state source of truth.
*   **No Build Tool Dependency**: Keep using browser-native scripts and IIFEs loaded in order via `client/index.html` to avoid adding build complexity (Vite/Webpack).
*   **Improve Code Maintainability**: Allow developers to locate bugs and implement enhancements in focused service files without causing merge conflicts.

---

## 2. Refactoring Checklist

*   **[Step 1: Modularize Client-Side Monolith](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/001-client-refactor-modularization.md)**
    *   Separate core state, constants, and mappings.
    *   Modularize reference managers and the prompt compiler.
    *   Decompose form renderer, persistence, and service layers (history, collection, generation, lightbox).
    *   Reduce `client/app.js` to an entry point bootstrap script.
    *   Update script imports in `client/index.html` in correct dependency order.

*   **[Step 2: Reorganize Server Folder, Runtime Data, and Domain Modules](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-server-folder-reorganization.md)**
    *   Move runtime JSON files under `server/data/`.
    *   Add a central server path resolver.
    *   Standardize JSON read/write through a shared repository file store.
    *   Group domain services by business capability.
    *   Extract repositories and route modules in safe phases.
    *   Final cleanup removes root-level compatibility re-export files and old data path fallbacks.
    *   Sub-phases:
        *   [002-001 Data Relocation And Path Resolver](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-001-server-data-relocation-and-path-resolver.md)
        *   [002-002 Shared JSON Store And Repository Write Contract](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-002-shared-json-store-and-repository-write-contract.md)
        *   [002-003 Domain And Repository Folder Extraction](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-003-domain-and-repository-folder-extraction.md)
        *   [002-004 Route Extraction And Server Bootstrap Cleanup](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-004-route-extraction-and-server-bootstrap-cleanup.md)
        *   [002-005 Cleanup Documentation And Final Validation](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-005-cleanup-documentation-and-final-validation.md)

*   **[Step 3: Template Reference Control Visibility](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/003-template-reference-controls-visibility.md)**
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
| Persistence interfaces and adapters | `server/repositories/<capability>/` |
| Shared atomic JSON implementation | `server/repositories/json/` |
| Runtime JSON state | `server/data/<capability>/` |
| Request actor/security middleware | `server/middleware/` |
| AI provider adapters and registry | `server/providers/` |
| Paths, provider metadata, and server configuration | `server/config/` |

Server placement rules:

*   `server/` root may contain the bootstrap file and architecture-owned top-level folders only.
*   Do not add root compatibility re-export files for moved modules.
*   A route should coordinate HTTP input/output and delegate business behavior.
*   A domain module should not hard-code runtime JSON paths.
*   Data access should be replaceable without rewriting route or domain contracts.

### 4.2 Client

| File responsibility | Canonical location |
|---|---|
| Application bootstrap and top-level wiring | `client/app.js` |
| Shared state, persistence, rendering, generation, and reference services | `client/core/` |
| Localization runtime services and locale preference | `client/core/` |
| Feature-specific behavior | `client/<feature>/` |
| Scene Builder modules | `client/scene-builder/` |
| Clothing modules | `client/clothing/` |
| Comparison modules | `client/comparisons/` |
| Reusable cross-feature generation UI | `client/generation-controls/` |
| Navigation and application shell | `client/shell/` |
| Reusable visual option controls | `client/visual-controls/` |
| Runtime application assets | `client/assets/<feature>/` |
| Self-hosted third-party browser libraries | `client/assets/vendor/<library>/` |
| Translation manifests, schemas, and locale catalogs | `client/i18n/` |
| Generated image output | `client/outputs/` |
| Main HTML shell and script ordering | `client/index.html` |
| Global styling until a feature stylesheet boundary is introduced | `client/style.css` |

Client placement rules:

*   Keep `client/app.js` as orchestration code; move reusable feature logic into its owning module.
*   Extend an existing feature folder before creating another cross-feature global module.
*   Browser-native scripts must be registered in dependency order in `client/index.html`.
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
| Cross-project architecture and technical debt plans | `requirements/007-technical-dept/` |

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
