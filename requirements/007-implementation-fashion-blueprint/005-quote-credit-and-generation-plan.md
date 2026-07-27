# Quote, Credit and Generation Plan

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

The customer sees the complete maximum cost and included outputs before any
billable work starts.

## 2. Plan Contract

```text
FashionBlueprintPlan
- id?
- actorUserId (server-derived)
- projectId?
- templateVersionId
- characterProfileVersionId
- productItems[]
- poseVariationPackVersionId
- environmentSelection
- generationSettings
- operations[]
- outputCount
- quoteId
- status: draft | quoted | confirmed | submitted
- idempotencyKey
```

Each operation identifies:

```text
productItemKey
shotKey
poseKey
referenceAssetIds[]
providerRoute
estimatedCredits
```

## 3. Quote

```text
FashionBlueprintQuote
- id
- planHash
- pricingPolicyVersion
- templateVersionId
- routeSnapshot
- operationCount
- outputCount
- referenceCountByOperation
- estimatedCredits
- maximumCredits
- expiresAt
- warnings[]
```

Inputs affecting the hash:

- Template/version
- Character/version
- Product Items and reference roles
- pose/environment
- Simple tier or Advanced provider settings
- output count/resolution

Any change invalidates the quote.

## 4. Credit Lifecycle

```text
calculate -> display -> confirm -> reserve maximum
-> submit operations
-> capture successful eligible usage
-> release unused/failed eligible reservation
```

- Comparison counts only enabled slots.
- Bulk reserves maximum for all accepted operations.
- Partial success captures successful operations and releases eligible remainder.
- No direct balance mutation in Fashion modules.
- Duplicate confirmation uses the same idempotency key and plan.

## 5. API

```text
POST /api/fashion-blueprints/resolve
POST /api/fashion-blueprints/quotes
POST /api/fashion-blueprints/runs
GET  /api/fashion-blueprints/runs/:id
```

Routes translate HTTP and delegate to:

```text
FashionBlueprintService
FashionQuoteService
CreditReservationService
GenerationRequestService / JobOrchestrator
```

## 6. UX

Review displays:

- outfit count
- outputs per outfit and total outputs
- Character and Template
- quality mode/tier
- estimated/maximum credits
- current available credits
- warnings and quote expiry

`Generate` is enabled only for a current valid quote and sufficient credits.

## 7. Acceptance Tests

- Changing any plan hash input rejects stale quote.
- Duplicate run submission returns same run.
- Concurrent runs cannot overspend.
- Partial success reconciles capture/release exactly.
- Forged client credit total is ignored.
- Comparison quote includes enabled slots only.

