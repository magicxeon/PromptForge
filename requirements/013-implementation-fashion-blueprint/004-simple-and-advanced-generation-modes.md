# Simple and Advanced Generation Modes

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Configured Simple routing and shared Advanced Engine implemented; validation pending

Simple tiers resolve provider/model on the server. Advanced mode reuses the
shared React Engine control and the public provider capability catalog.

## 1. Business Requirement

Beginners choose an outcome tier. Power users retain direct provider control.
Both modes use one pricing, generation and result pipeline.

## 2. Simple Mode

Visible choices:

```text
Draft
Selling Quality
Premium Campaign
```

Request contract:

```text
routingMode: simple
qualityTier
```

Template version, references, output count and pricing policy are resolved from
the server-side Fashion draft/plan. The client may display them but does not
submit them as trusted Simple routing inputs.

The server maps each tier to an approved provider/model policy. Automatic
multi-provider optimization is deferred; the first version may use a fixed
configured route per tier.

Simple UI hides:

- provider/model names as required input
- raw resolution/reference strategy
- comparison slots
- prompt editor

It may show a plain-language quality, wait-time and credit description.

## 3. Advanced Mode

Reuse `web/src/components/generation/EngineTargetPanel.tsx` with Fashion
props/callbacks:

- provider
- model
- quality
- supported output resolution
- references and capability warnings
- Fashion-owned output/batch summary

Required component options:

```text
comparison: false
allowComparison: false
```

Fashion batch means one to five Product Items expanded into deterministic shot
operations. It does not mean AI model Comparison. A later requirement may add
comparison as a separately quoted capability, but it is outside the initial
Fashion MVP.

Request:

```text
routingMode: advanced
requestedProviderId
requestedModelId
quality
resolution
```

Reference/output counts are never trusted Advanced inputs. They are computed
from the resolved Fashion operations and canonical Reference Processing plan;
pricing policy version is returned by the server estimate and quote rather than
chosen by the client.

Unsupported controls remain hidden based on provider catalog capability.

## 4. Shared State Contract

```text
FashionGenerationSettings
- routingMode
- qualityTier?
- providerId?
- modelId?
- quality?
- resolution?
- operationEstimateIds[]
- quoteId?
```

Switching modes:

- preserves each mode's last valid settings actor-scoped
- invalidates stale estimate
- does not mutate Template, Character or Product Items
- requires a new quote before Generate

## 5. Server Authority

- Provider/model capabilities come from server provider catalog.
- Tier routes/pricing come from versioned server configuration.
- Client labels are descriptive only.
- Server validates estimate against submitted plan.
- Fallback requires a new warning/quote unless accepted policy explicitly allows
  an equivalent route.

The current prototype still defines `QUALITY_ROUTE_PREFERENCES` inside
`FashionBlueprintService.js`. Move that table to
`server/config/fashion-quality-tiers.json` and resolve it through a domain
`FashionRoutingPolicyService` before public MVP release. Provider IDs, model
IDs and pricing must not be duplicated in React.

## 6. Files

```text
web/src/features/fashion-blueprint/routes/FashionBlueprintRoute.tsx
web/src/components/generation/EngineTargetPanel.tsx
web/src/features/generation/api/generationApi.ts
server/domain/fashion-blueprint/FashionRoutingPolicyService.js
server/config/fashion-quality-tiers.json
test/fashionGenerationMode.test.js
```

## 7. Acceptance Tests

- Beginner completes Simple flow without seeing provider controls.
- Advanced panel matches Studio/Playground shared component behavior.
- Tier/model change invalidates estimate.
- Unsupported resolution is hidden and rejected if forged.
- Simple and Advanced requests produce the same downstream plan shape.
- Pricing policy is never hardcoded in client.
- Fashion does not read or mutate Studio route/store state.
- Fashion does not use the global Studio estimate as the billable quote.

## 8. Shared Estimate Isolation

Fashion owns a TanStack Query/Mutation quote resource keyed by actor and plan
hash. It displays aggregate operation cost from `FashionBlueprintQuote`;
Studio and Playground keep their own generation estimate resources. Shared
presentation components receive estimate values and callbacks as props and
must not read a global estimate controller.

Actor switching clears Query cache and any actor-owned Fashion draft, mode
preference and quote. A quote is invalidated when Template session, Character,
Product Item, outfit scope, direction, route, resolution or output recipe
changes.

## 9. Implementation Plan

1. Add and validate `server/config/fashion-quality-tiers.json`.
2. Resolve Simple routes through `FashionRoutingPolicyService`; remove the
   in-code model table.
3. Keep Advanced controls on the shared `EngineTargetPanel` with Comparison
   disabled and unsupported capabilities hidden.
4. Version actor-scoped Simple/Advanced draft preferences without persisting a
   quote as reusable state.
5. Test unavailable preferred routes, forged capabilities and mode-switch quote
   invalidation.
