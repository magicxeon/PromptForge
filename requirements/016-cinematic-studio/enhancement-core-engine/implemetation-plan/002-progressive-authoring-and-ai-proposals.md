# Package 002 - Progressive Authoring And AI Proposals

**Requirement checkpoints:** Steps 4-6  
**Runtime risk:** Material Cinematic UI and proposal workflow  
**Status:** Complete

## Dependency Order

1. Characterize existing Simple/Advanced behavior with tests.
2. Extract controlled field groups, Cast/Look selector and Shot sequence editor.
3. Keep current API orchestration and compatibility exports during extraction.
4. Project Simple/Advanced visibility from the public field manifest.
5. Replace client-only hidden completion with server-normalized additive completion.
6. Extend Scene proposal contract with requested field paths and locked paths.
7. Return field-level proposal provenance and merge outcomes.
8. Reuse one proposal-state shell for loading/error/conflict/apply where contracts match.

## Candidate Files

```text
web/src/features/cinematic/components/CinematicDialogs.tsx
web/src/features/cinematic/components/CinematicStageContent.tsx
web/src/features/cinematic/components/sceneDirectorSimpleContract.ts
web/src/features/cinematic/components/authoring/
web/src/features/cinematic/api/cinematicApi.ts
web/src/features/cinematic/schemas/cinematicSchemas.ts
server/domain/generation/CinematicStoryPlanService.js
server/domain/cinematic/CinematicApplicationService.js
server/config/prompt-recipes/cinematic/scene-direction.*.json
client/i18n/locales/*/cinematic.json
```

## Stop Gates

- Switching mode mutates no persisted data.
- Simple save retains every populated Advanced value.
- AI cannot replace locked or unselected user values.
- Version conflict keeps proposal and draft recoverable.
- Existing Cast, Look, Stage and Story Plan actions remain reachable.
- Responsive checks pass at 390px, 820px and 1440px before package closure.
