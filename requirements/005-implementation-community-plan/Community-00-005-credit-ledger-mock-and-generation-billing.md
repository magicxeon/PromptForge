# Community-00-005 Credit Ledger Mock and Generation Billing

**Status:** Proposed - Awaiting Review  
**Feature type:** Credit foundation for real AI generation  
**Depends on:** Actor Context, generation service, provider registry  
**Created:** 2026-07-19

## 1. Business Requirement

Community remix and template reuse will increase generation usage. Before public launch, every real AI generation must pass through a credit lifecycle that is visible, auditable and refundable for technical failures.

This starts as a mock ledger during JSON MVP and later migrates to database/payment integration.

## 2. System Design

### 2.1 Credit Lifecycle

```text
estimate -> reserve -> enqueue -> provider accepted/completed -> capture
                                  -> technical failure -> refund
```

Rules:

- Active user pays for generation.
- Template owner does not pay when another user remixes.
- Estimate must be shown before generate.
- Reservation must happen before provider call.
- Capture/refund must be idempotent.
- Ledger is append-only.

### 2.2 Schema

### CreditAccount

```text
id
userId
availableCredits
reservedCredits
status
updatedAt
```

### CreditLedgerEntry

```text
id
schemaVersion
userId
operationType: grant | reserve | capture | refund | adjustment
amountCredits
balanceAfter
reservedAfter
relatedJobId
relatedTemplateId
providerId
modelId
pricingPolicyVersion
reason
idempotencyKey
createdAt
```

### CreditReservation

```text
id
userId
jobId
amountCredits
status: reserved | captured | refunded | expired
providerId
modelId
pricingPolicyVersion
createdAt
updatedAt
expiresAt
```

### 2.3 Provider Routing Compatibility

Requests should already support:

```text
routingMode: simple | advanced
qualityTier
requestedProviderId
requestedModelId
resolvedProviderId
resolvedModelId
estimatedCredits
pricingPolicyVersion
```

Automatic Simple routing is deferred. The first implementation can resolve to the current selected provider/model, but the request shape must be ready.

## 3. Software Development Specification

### Server Files

```text
server/credits/CreditAccountRepository.js
server/credits/CreditLedgerRepository.js
server/credits/CreditPolicyService.js
server/credits/CreditReservationService.js
server/credits/creditRoutes.js
server/routing/ProviderRoutingPolicyService.js
server/generationRequestService.js
server/queueManager.js
```

### Client Files

```text
client/credits/creditApi.js
client/credits/creditBalanceBadge.js
client/credits/creditEstimatePanel.js
client/core/generationService.js
client/scene-builder/sceneReplacementChecklist.js
```

## 4. Implementation Plan

1. Add mock credit account and ledger JSON.
2. Add estimate endpoint.
3. Add reserve/capture/refund service.
4. Wire generation request creation to reserve credits.
5. Wire queue success/failure to capture/refund.
6. Display estimate near Generate button.

## 5. Testing

```text
TC-00-005-001 estimate advanced provider/model
TC-00-005-002 insufficient balance blocks generation
TC-00-005-003 reserve then capture updates ledger
TC-00-005-004 technical failure refunds reservation
TC-00-005-005 repeated capture with same idempotency key does not double-charge
TC-00-005-006 Bob pays for Bob remix of Alice template
```
