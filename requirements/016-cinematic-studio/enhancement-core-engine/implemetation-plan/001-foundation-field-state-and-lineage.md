# Package 001 - Foundation, Field State And Lineage

**Requirement checkpoints:** Steps 0-3  
**Runtime risk:** Additive, server-first  
**Status:** Complete

## Dependency Order

1. Run focused baseline tests and record current failures.
2. Add sanitized Cinematic fixtures without production media or runtime IDs.
3. Add schema-validated field manifest and dependency configuration.
4. Add pure manifest loader and dependency-cycle/path validation.
5. Add optional authoring metadata normalization and merge helpers.
6. Extend repository/project normalization additively.
7. Add read-only data-lineage service behind `CinematicApplicationService`.
8. Add authorized route and client Zod/API contract only after domain tests pass.

## Candidate Files

```text
server/config/cinematic/*.json
server/config/cinematic/CinematicConfigLoader.js
server/domain/cinematic/CinematicAuthoringStateService.js
server/domain/cinematic/CinematicDataLineageService.js
server/domain/cinematic/CinematicApplicationService.js
server/repositories/cinematic/CinematicProjectRepository.js
server/app/routes/cinematicRoutes.js
web/src/features/cinematic/schemas/cinematicSchemas.ts
web/src/features/cinematic/api/cinematicApi.ts
test/fixtures/cinematic/
test/cinematicAuthoringStateService.test.js
test/cinematicDataLineageService.test.js
```

## Stop Gates

- Configuration tests pass before Project normalization changes.
- Legacy round-trip tests pass before lineage is exposed over HTTP.
- Lineage reads are deterministic and write-free.
- No UI behavior changes in this package.
