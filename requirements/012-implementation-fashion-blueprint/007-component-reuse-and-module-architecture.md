# Component Reuse and Module Architecture

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** React/server architecture aligned; component extraction remains incremental

The canonical client owner is `web/src/features/fashion-blueprint/`. Fashion
composes Template Core, Character Profile, Reference Processing, Credits,
Generation, Collections and Community. It owns only Fashion plan orchestration,
Product Item state and grouped Fashion presentation.

## 1. Non-Duplication Principle

- Do not create another Template repository, use-session runtime or replacement
  resolver.
- Do not create another Character authorization contract.
- Do not create another reference authority matrix or preprocessing pipeline.
- Do not create another provider gateway, prompt compiler, queue or credit
  ledger.
- Do not copy Studio state or result components into Fashion.
- Shared components receive values, capability options and callbacks; they do
  not own Fashion business state.

## 2. Canonical Reuse Map

| Need | Canonical owner |
|---|---|
| Template definitions, immutable versions and use sessions | `server/domain/templates/`, `web/src/features/templates/` |
| Template/Community preview | `web/src/components/media/MediaCard.tsx`, Template components |
| Character card and authorized handoff | `web/src/components/profiles/CharacterCard.tsx`, Profiles API |
| Engine/model controls | `web/src/components/generation/EngineTargetPanel.tsx` with Comparison disabled |
| Reference upload/preview/scope | `web/src/components/generation/ReferenceSlotGrid.tsx` and Reference components |
| Reference authority and derivatives | `server/domain/reference-processing/` |
| Generate action styling | shared `Button` and generation command components where contracts match |
| Generic result media/detail | shared generation/media components |
| Collection and sharing actions | Collection picker and Community share dialogs |
| API actor header and Zod boundary | `web/src/lib/api/apiClient.ts`, Fashion schemas |
| Routing and breadcrumbs | React route registry and layout components |
| Credits | existing credit estimate/reservation domain |
| Generation/provider execution | existing generation domain and QueueManager |
| Localization | `react-i18next`, `client/i18n/locales/*/fashion-blueprint.json` |

Fashion may add adapters that convert a Product Item or run operation into a
shared component contract. Adapters stay small and contain no provider, pricing
or ownership decisions.

## 3. Current React Owner

```text
web/src/features/fashion-blueprint/
  api/fashionBlueprintApi.ts
  schemas/fashionSchemas.ts
  routes/FashionBlueprintRoute.tsx
```

`FashionBlueprintRoute.tsx` currently owns prototype orchestration. Extract a
component only when a cohesive section becomes independently testable or is
reused:

```text
components/FashionTemplateStep.tsx
components/FashionCharacterPicker.tsx
components/FashionProductList.tsx
components/FashionDirectionControls.tsx
components/FashionQuoteSummary.tsx
components/FashionRunResults.tsx
state/fashionDraft.ts
```

These are target ownership names, not instructions to create empty wrappers.
Do not split state across components without one route-level reducer/store
contract. Actor-owned draft persistence must use
`web/src/lib/persistence/`; server state remains in TanStack Query.

The route is registered at `/create/fashion` in
`web/src/app/routeRegistry/routes.ts`. Fashion is a Studio navigation child but
not a Studio generation mode.

## 4. Current Server Owner

```text
server/domain/fashion-blueprint/
  FashionAssetService.js
  FashionBlueprintService.js
  FashionGenerationContext.js
  FashionPlanHash.js
  FashionQuoteService.js
  FashionRunService.js

server/repositories/fashion-blueprint/
  FashionBlueprintQuoteRepository.js
  FashionBlueprintRunRepository.js

server/data/fashion-blueprint/
  quotes.json
  runs.json

server/app/routes/fashionBlueprintRoutes.js
```

Planned modules are created only when their behavior is implemented:

```text
server/domain/fashion-blueprint/FashionRoutingPolicyService.js
server/domain/fashion-blueprint/FashionDirectionResolver.js
server/domain/fashion-blueprint/FashionCharacterRecommendationService.js
server/config/fashion-quality-tiers.json
```

Do not create `FashionBlueprintTemplateRepository`; Template Core already owns
definitions and immutable versions. Do not create a Fashion asset repository;
uploaded references use the shared Asset repository.

## 5. Canonical Execution Direction

```text
Fashion React route
  -> Fashion API/Zod schema
  -> fashionBlueprintRoutes
  -> FashionBlueprintService resolves normalized plan
  -> Template Core resolves immutable use session
  -> Character Usage validates destination authorization
  -> FashionGenerationContext builds canonical generation context
  -> Reference Processing resolves authority/order/derivative/fingerprint
  -> Credit service estimates and reserves operation plan
  -> QueueManager dispatches through provider adapter
  -> History/Template/Character lineage records successful output
```

Quote and Run both call `FashionGenerationContext`; they must not build
references differently. Final prompt compilation remains in the canonical
generation domain.

## 6. Data And Migration Boundaries

Development adapters:

- quotes/runs use repository contracts over atomic local JSON;
- outfit uploads use actor-owned Asset records;
- processed derivatives use actor-owned Asset metadata and shared cache;
- no domain or route reads a raw JSON path.

Commercial migration replaces adapters without changing DTO intent:

- PostgreSQL for Projects, Product Items, Quotes, Runs and Operations;
- private Cloud Storage for source/processed assets;
- durable job orchestration for operations;
- real authentication and payment-backed credits.

Production must fail closed if mock identity, local public assets or JSON
persistence are active. Commercial work is owned by
`requirements/013-implementation-commercial-feature-plan/`.

## 7. Dependency Rules

```text
Fashion UI -> Fashion API
Route -> Fashion domain
Fashion domain -> Template/Character/Reference/Credit/Generation services
Domain services -> repository contracts
Queue -> provider adapters
```

- Core Template, Character, Reference, Credit and Generation modules do not
  import Fashion.
- Fashion domain does not import provider implementations or credit
  repositories.
- React source does not import legacy `client/app.js` or browser globals.
- Capability and pricing metadata remain server-authoritative.

## 8. Implementation Sequence

1. Freeze Fashion DTO/Zod schemas and actor-scoped draft contract.
2. Complete Template compatibility/version lineage.
3. Complete Product Item asset ID and outfit-scope contract.
4. Move Simple route policy to server configuration.
5. Add direction resolver and optional deterministic item assignments.
6. Extend quote/run public summaries without changing canonical execution.
7. Extract grouped result component and add recovery behavior.
8. Run automated, desktop/mobile and cross-actor release gates.

## 9. Architecture Acceptance Tests

- no Fashion module imports provider adapter or ledger repository;
- no second Template, Character or Reference authorization policy exists;
- Quote and Run produce the same reference-processing fingerprint per operation;
- actor switch clears Fashion draft/quote/query data;
- route never trusts body owner ID, credit total or capability;
- deep link and Sidebar navigation resolve the same React route;
- unsupported controls remain hidden and server-forged values are rejected;
- JSON and future database adapters satisfy the same repository contract;
- Studio, Playground and Fashion estimate state remains isolated;
- no Base64 is stored in draft, quote, run, Template or history records.
