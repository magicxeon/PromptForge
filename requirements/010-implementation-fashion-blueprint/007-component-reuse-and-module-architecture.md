# Component Reuse and Module Architecture

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Architecture gate implemented

The canonical client owner is `web/src/features/fashion-blueprint/`. It reuses
React Template/Character cards, reference slots, engine controls, buttons,
surfaces, collection picker, and Community sharing dialog.

## 1. Principle

Fashion Blueprint composes existing platform capabilities. New modules own only
Fashion-specific workflow, plan resolution and product-item presentation.

## 2. Reuse Map

| Need | Reuse |
|---|---|
| Character discovery/detail | Character Profile and Community components |
| Template media/detail | Community media cards/lightbox where compatible |
| Engine/model (Comparison disabled) | `generation-controls/engineTargetComparisonPanel.js` |
| References | `generation-controls/referenceSlotManager.js` |
| Generate action | `generation-controls/generationActionBar.js` |
| Results | `generation-controls/generationResultSurface.js` |
| Outfit upload behavior | `clothing/outfitReferenceController.js` |
| Visual options | `visual-controls/visualOptionControls.js` |
| API actor header | `core/apiClient.js` |
| Routing | `shell` router |
| Credits | existing credit estimate/reservation domain |
| Generation | existing generation service/domain |
| Public sharing | Community share APIs/policies |
| i18n | `core/i18nService.js` |

Shared components receive options, state and callbacks. They do not create a
second Studio state or call providers.

Current shared-component extensions required before Fashion mounts:

- `engineTargetComparisonPanel.js`: use existing injected catalog/state
  callbacks with `showComparison: false`.
- `generationActionBar.js`: add injected estimate-controller support while
  preserving its legacy default.
- `referenceSlotManager.js`: add an optional async upload/registration adapter
  so Fashion receives asset IDs instead of persisting Base64.
- `generationResultSurface.js`: accept normalized Fashion result items; grouping
  remains in Fashion.

## 3. New Client Owner

```text
client/fashion-blueprint/
  fashionBlueprintPage.js
  fashionBlueprintState.js
  fashionBlueprintApi.js
  fashionBlueprintPersistence.js
  fashionTemplateCatalog.js
  fashionCharacterPicker.js
  fashionCharacterRecommendation.js
  fashionOutfitList.js
  fashionDirectionControls.js
  fashionGenerationMode.js
  fashionQuoteSummary.js
  fashionRunResults.js
  fashionBlueprintController.js
```

Rules:

- `client/app.js` wires route/bootstrap only.
- State is actor-scoped and versioned.
- Fashion state is independent from Studio `window.state`; it is keyed by the
  active actor and draft/project ID.
- Do not copy Studio HTML/CSS into this folder.
- Register scripts in dependency order.
- Reusable additions belong in their current shared owner, not Fashion.

## 4. New Server Owner

```text
server/domain/fashion-blueprint/
  FashionBlueprintService.js
  FashionBlueprintTemplateService.js
  FashionCharacterRecommendationService.js
  FashionDirectionResolver.js
  FashionReferenceAssetService.js
  FashionProductService.js
  FashionQuoteService.js
  FashionRunService.js
  FashionRoutingPolicyService.js

server/repositories/fashion-blueprint/
  FashionBlueprintTemplateRepository.js
  FashionBlueprintQuoteRepository.js
  FashionBlueprintRunRepository.js
  FashionProductRepository.js

server/app/routes/fashionBlueprintRoutes.js
server/config/fashion-quality-tiers.json
```

Routes are registered through `server/app/createApp.js`.

## 4.1 Shell and Route Activation

The existing disabled `fashion-studio` item in
`client/shell/navigation.config.json` becomes enabled only with the complete
page implementation. At activation:

```text
route: /create/fashion
moduleId: fashion-blueprint
navigation parent: Studio
```

Modify:

```text
client/shell/navigation.config.json
client/shell/navigationRegistry.js
client/shell/applicationShell.js
client/index.html
server/app/createApp.js
```

Do not set a Studio `workflowIntent.mode` for Fashion. The current
`mode: guided` placeholder is invalid because Studio supports only its existing
mode chips. Fashion gets its own Page Outlet activation while continuing to use
the same Global Header, Sidebar, breadcrumbs and contextual back behavior.

## 5. Data Adapter Strategy

Development-first:

- repository contract
- atomic local JSON adapter under `server/data/fashion-blueprint/`
- no direct data-file access from domain/routes

Commercial migration:

- PostgreSQL adapter under same repository contract
- private assets through AssetStorage/Cloud Storage
- durable run/jobs through commercial job orchestrator

Production must fail closed if JSON persistence/local assets/mock identity are
active.

## 6. Dependency Direction

```text
Fashion UI -> Fashion API
Route -> Fashion domain service
Fashion domain -> repository/core service interfaces
Core generation/credit/assets -> providers/storage adapters
```

Core/Community/Character modules must not import Fashion UI/domain.

Fashion operations enter the canonical server generation pipeline as structured
generation contexts. Final prompt compilation remains owned by
`server/domain/generation/promptCompiler.js` and queue option normalization
remains owned by `server/domain/generation/generationRequestService.js`.
Fashion-specific services resolve recipes and ownership; they do not maintain
provider prompt forks.

## 7. Architecture Tests

- shared component options hide unsupported controls
- no Fashion module imports provider adapter or credit repository
- actor switch clears Fashion draft/quote
- route does not trust body owner ID
- invalid/circular dependency is absent
- JSON and future PostgreSQL adapters pass repository contract tests
- Fashion deep link and Sidebar/Create-menu navigation resolve the same page
  without changing Studio mode.
- Studio, Playground and Fashion estimates remain isolated.
