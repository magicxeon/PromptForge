# Component Reuse and Module Architecture

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Required architecture gate

## 1. Principle

Fashion Blueprint composes existing platform capabilities. New modules own only
Fashion-specific workflow, plan resolution and product-item presentation.

## 2. Reuse Map

| Need | Reuse |
|---|---|
| Character discovery/detail | Character Profile and Community components |
| Template media/detail | Community media cards/lightbox where compatible |
| Engine/model/comparison | `generation-controls/engineTargetComparisonPanel.js` |
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
```

Rules:

- `client/app.js` wires route/bootstrap only.
- State is actor-scoped and versioned.
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
  FashionProductService.js
  FashionQuoteService.js
  FashionRoutingPolicyService.js

server/repositories/fashion-blueprint/
  FashionBlueprintTemplateRepository.js
  FashionBlueprintRunRepository.js
  FashionProductRepository.js

server/app/routes/fashionBlueprintRoutes.js
server/config/fashion-quality-tiers.json
```

Routes are registered through `server/app/createApp.js`.

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

## 7. Architecture Tests

- shared component options hide unsupported controls
- no Fashion module imports provider adapter or credit repository
- actor switch clears Fashion draft/quote
- route does not trust body owner ID
- invalid/circular dependency is absent
- JSON and future PostgreSQL adapters pass repository contract tests
