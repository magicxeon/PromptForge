# Simple and Advanced Generation Modes

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** React MVP implemented; routing policy expansion deferred

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

Reuse `client/generation-controls/engineTargetComparisonPanel.js` with Fashion
options/callbacks:

- provider
- model
- quality
- supported output resolution
- references and capability warnings
- Fashion-owned output/batch summary

Required component options:

```text
showComparison: false
showActiveRun: false
legacyStudioIds: false
```

Fashion batch means one to five Product Items expanded into deterministic shot
operations. It does not mean AI model Comparison. A later requirement may add
comparison as a separately quoted capability, but it is outside the initial
Fashion MVP.

Request:

```text
routingMode: advanced
providerId
modelId
quality
resolution
referenceCount
outputCount
```

Reference/output counts are checked against the resolved plan; pricing policy
version is returned by the server estimate and quote rather than chosen by the
client.

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

## 6. Files

```text
client/fashion-blueprint/fashionGenerationMode.js
client/fashion-blueprint/fashionQualityTierPicker.js
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
- Fashion does not read or mutate Studio `window.state`.
- Fashion does not use the global Studio estimate as the billable quote.

## 8. Shared Estimate Isolation

The current shared `generationActionBar.js` defaults to the legacy global
`window.creditEstimateController`. Before Fashion mounts it, extend the shared
component to accept an injected estimate adapter/controller while retaining the
legacy default for Studio and Playground:

```text
estimateController?
  getState()
  subscribe(listener)
  updateEstimate(inputs)
```

Fashion injects a Fashion quote adapter that displays aggregate operation cost
from `FashionBlueprintQuote`. This prevents Studio, Playground and Fashion from
overwriting each other's estimate state.
