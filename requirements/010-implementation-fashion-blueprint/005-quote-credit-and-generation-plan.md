# Quote, Credit and Generation Plan

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Architecture-aligned; implementation pending

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
creditEstimateId
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
- operationEstimateIds[]
- operationCount
- outputCount
- referenceCountByOperation
- estimatedCredits
- maximumCredits
- expiresAt
- warnings[]
```

Quote expiry must not outlive any operation estimate. Use the earliest locked
operation-estimate expiry as the Fashion quote expiry.

Inputs affecting the hash:

- Template/version
- Character/version
- Product Items and reference roles
- pose/environment
- Simple tier or Advanced provider settings
- output count/resolution

Any change invalidates the quote.

The route snapshot is resolved by the server. In Simple Mode it records the
provider/model selected by the versioned tier policy; the client does not submit
a trusted provider route. Each operation estimate must lock the exact provider,
model, resolution, reference count and output count that will later be sent to
the generation pipeline. This is required by the current
`CreditReservationService` stale-estimate validation.

## 4. Credit Lifecycle

```text
calculate -> display -> confirm -> reserve maximum
-> submit operations
-> capture successful eligible usage
-> release unused/failed eligible reservation
```

- Bulk reserves maximum for all accepted operations.
- Partial success captures successful operations and releases eligible remainder.
- No direct balance mutation in Fashion modules.
- Duplicate confirmation uses the same idempotency key and plan.

### 4.1 Aggregate Reservation Contract

The existing credit service reserves one generation request/job. Fashion
confirmation needs a canonical batch/plan extension in the **credit domain**,
not direct ledger calls from Fashion:

```text
CreditReservationService.reservePlan({
  userId,
  quoteId,
  planId,
  operations: [{ operationId, estimateId, requestId, jobId }],
  idempotencyKey
})
```

Required behavior:

1. Re-read every persisted estimate.
2. Verify actor, expiry, route and pricing inputs.
3. Atomically verify/reserve the aggregate maximum.
4. Return operation reservation allocations.
5. Let canonical queue completion capture successful allocations.
6. Release failed, cancelled or unused allocations idempotently.

If the credit repository cannot reserve the plan atomically, bulk Fashion must
remain disabled. Sequential reserve-after-submit is not an acceptable paid
workflow because it can produce a partially accepted run before affordability
is known.

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
generationRequestService / QueueManager
```

Required implementation ownership:

```text
server/domain/fashion-blueprint/FashionBlueprintService.js
server/domain/fashion-blueprint/FashionQuoteService.js
server/domain/fashion-blueprint/FashionPlanHash.js
server/domain/fashion-blueprint/FashionRunService.js
server/repositories/fashion-blueprint/FashionBlueprintQuoteRepository.js
server/repositories/fashion-blueprint/FashionBlueprintRunRepository.js
server/domain/credits/CreditReservationService.js
server/repositories/credits/CreditAccountRepository.js
server/app/routes/fashionBlueprintRoutes.js
```

`FashionRunService` may use the canonical generation context/queue option
helpers and injected `QueueManager`; it must not call an HTTP generation route,
provider adapter or ledger repository directly.

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
- Fashion MVP never submits Comparison slots; aggregate price is based only on
  accepted Product/shot operations.
- Every operation request exactly matches its locked estimate inputs.
