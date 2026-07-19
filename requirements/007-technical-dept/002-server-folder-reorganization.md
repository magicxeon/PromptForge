# Step 2: Server Folder Reorganization Master Plan

## 1. Goal

Reorganize `server/` so runtime data, domain logic, repositories, route registration, middleware, and provider integrations are easy to find and safe to change.

This is a technical debt sequence, not a single large refactor. Implement one sub-requirement at a time.

## 2. Why This Matters

The project is moving from a local single-user prototype toward:

- Mock users and future real authentication.
- Community posts, gallery, templates, remix flow.
- Credit deduction and future payment.
- Admin/support/audit workflows.
- Future database migration.

The current `server/` folder mixes JSON data and functional code at the same level, which makes the next phases risky.

## 3. Final Target Structure

```text
server/
  app/
    createApp.js
    routes/
    routeErrors.js
  config/
    paths.js
    providers.json
    provider-config.schema.json
  data/
    identity/
    generation/
    collections/
    credits/
    community/
    comparisons/
    migrations/
  domain/
    generation/
    collections/
    credits/
    community/
    comparisons/
    identity/
    scene-templates/
    clothing/
  repositories/
    json/
    identity/
    generation/
    collections/
    credits/
    community/
    comparisons/
  middleware/
  providers/
  server.js
```

## 4. Sub-Requirements

Implement in this order:

1. [002-001 Data Relocation And Path Resolver](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-001-server-data-relocation-and-path-resolver.md)
2. [002-002 Shared JSON Store And Repository Write Contract](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-002-shared-json-store-and-repository-write-contract.md)
3. [002-003 Domain And Repository Folder Extraction](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-003-domain-and-repository-folder-extraction.md)
4. [002-004 Route Extraction And Server Bootstrap Cleanup](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-004-route-extraction-and-server-bootstrap-cleanup.md)
5. [002-005 Cleanup Documentation And Final Validation](file:///d:/development/ModelPromptForge/requirements/007-technical-dept/002-005-cleanup-documentation-and-final-validation.md)

## 5. Non-Negotiable Rules

- Do not implement every phase in one pass.
- Do not delete runtime JSON files without explicit user approval.
- Do not change public API URLs or response shapes unless a phase explicitly says so.
- Preserve mock user isolation.
- Preserve current no-build local server behavior.
- Keep compatibility wrappers/re-exports while imports are being migrated.
- Use central paths and shared JSON writer before moving more functional modules.

## 6. High-Level Acceptance

The full sequence is done when:

```text
Runtime JSON lives under server/data.
All data paths are centralized.
JSON writes use one shared writer.
Domain logic is grouped by capability.
Repositories are grouped by storage concern.
server/server.js becomes mostly bootstrap and route registration.
Generation, history, credits, collections, comparisons, mock users, and Scene Template sharing still work.
```
