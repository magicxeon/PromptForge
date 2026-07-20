# Community-11 Credit Deduction and Provider Routing Foundation

**Status:** Proposed - Awaiting Review  
**Feature type:** Billing foundation, credit ledger and future provider routing contract  
**Depends on:** Provider registry, generation queue, `requirements/000-business-overview/03-ai-provider-costs-and-credits.md`  
**Created:** 2026-07-19

## 1. Business Requirement

Real AI generation must deduct credits in a predictable and auditable way. Community remix and template flows will increase generation volume, so credit handling must be centralized before public launch.

The goal is not to build a full payment system in this phase. The goal is to create a reliable credit ledger and request lifecycle:

```text
estimate -> reserve -> provider generation -> capture or refund
```

## 2. Product Scope

Included:

- Credit balance display for active user.
- Credit estimate before generation.
- Credit reservation when generation starts.
- Credit capture when provider accepts or completes the job according to policy.
- Credit refund when technical/provider failure occurs.
- Audit ledger for every credit mutation.
- Support for Scene Builder, Community Use Template and normal Studio generation.

Deferred:

- Payment gateway checkout.
- Subscription billing.
- Creator revenue sharing.
- Marketplace template fee split.
- Dynamic real-time provider price updates.
- Fully automated provider routing.

## 3. Credit Ledger Contract

```text
CreditLedgerEntry
- id
- userId
- operationType: grant | reserve | capture | refund | adjustment
- amountCredits
- balanceAfter
- relatedJobId
- relatedTemplateId
- providerId
- modelId
- pricingPolicyVersion
- reason
- createdAt
```

Rules:

- Ledger is append-only.
- Balance is derived or reconciled from ledger.
- Generation should not start if available balance is lower than required reservation.
- Technical failures refund reserved credits.
- Successful output disliked by user is a new generation, not an automatic refund.

## 4. Simple and Advanced Provider Routing Contract

### Simple Mode

Simple Mode hides provider complexity from users.

```text
User intent -> quality tier -> platform-selected provider/model -> fixed/blended credit estimate
```

Simple Mode in this phase only defines the routing contract. The first implementation may still use the provider selected in UI until quality/cost data is stable.

### Advanced Mode

Advanced Mode lets users pick provider/model directly.

```text
User-selected provider/model/resolution/reference count -> exact credit estimate -> reservation
```

Advanced Mode must show estimated credit cost before generation.

### Routing Request Contract

```text
ProviderRoutingRequest
- userId
- generationMode: headshot | character_sheet | scene_builder | freestyle
- routingMode: simple | advanced
- requestedProviderId
- requestedModelId
- qualityTier
- resolution
- aspectRatio
- referenceCount
- safetyMode
- templateId
```

### Routing Result Contract

```text
ProviderRoutingResult
- providerId
- modelId
- routingMode
- pricingPolicyVersion
- estimatedCredits
- estimateConfidence
- warnings
- fallbackApplied
```

## 5. Integration Points

Credit deduction must integrate with:

- `server/generationRequestService.js`
- `server/queueManager.js`
- provider registry/model capability catalog
- Scene Builder template generation
- Community `Use Template` / remix generation
- comparison generation slots

Community must not deduct credits directly. It creates a generation request and the generation service performs credit reservation/capture.

## 6. Software Development Specification

### Server Files

```text
server/credits/CreditLedgerRepository.js
server/credits/CreditBalanceService.js
server/credits/CreditPolicyService.js
server/credits/CreditReservationService.js
server/credits/creditRoutes.js
server/routing/ProviderRoutingPolicyService.js
server/routing/providerRoutingContracts.js
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
client/comparisons/comparisonDashboard.js
```

### Process

1. Client requests estimate for selected generation settings.
2. Server returns estimated credits and pricing policy version.
3. User confirms generation.
4. Server reserves credits before enqueue.
5. Queue/provider completes generation.
6. Server captures reserved credits on success or refunds on technical failure.
7. History stores credit cost snapshot for audit and user display.

## 7. Impact

- Prevents uncontrolled provider spending when Community remix increases usage.
- Gives users predictable credit cost before generation.
- Creates a clean boundary for future payment packs and creator marketplace revenue sharing.
- Adds a dependency on user/actor context, so production launch still requires real user management.

## 8. Testing

Automated:

```text
TC-11-001 estimate returns credits for advanced selected provider/model
TC-11-002 reserve fails when balance is insufficient
TC-11-003 reserve then capture creates two ledger entries
TC-11-004 technical failure refunds reservation
TC-11-005 community remix uses generation service credit path, not direct deduction
TC-11-006 simple routing returns a stable fallback route without auto-routing provider calls
```

Manual:

1. Switch to Alice with mock credits.
2. Generate a Scene Builder image and confirm balance changes.
3. Trigger a failed provider request and confirm credits refund.
4. Use a shared template as Bob and confirm Bob pays credits, not the template owner.

## 9. Implementation Plan

### User Review Required

- This phase builds credit ledger and hooks, not payment checkout.
- Simple provider routing is a policy contract only.
- Advanced provider selection remains user-controlled.
- Community remix generation pays from the active user's balance.

### Proposed Changes

- Add credit ledger repository and service.
- Add estimate/reserve/capture/refund API.
- Add generation request lifecycle hooks.
- Add UI credit estimate near Generate buttons.
- Add provider routing contracts and static policy file.

### Release Gate

Do not enable public Community remix until generation requests have a credit reservation path and technical failures can refund credits.
