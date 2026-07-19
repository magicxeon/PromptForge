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
