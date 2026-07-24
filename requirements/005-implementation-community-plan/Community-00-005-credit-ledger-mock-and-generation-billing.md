# Community-00-005 Credit Ledger Mock and Generation Billing

**Status:** Ready for implementation - Mock JSON phase  
**Feature type:** Credit foundation for real AI generation  
**Business source of truth:** `requirements/000-business-overview/03-ai-provider-costs-and-credits.md`  
**Architecture source of truth:** `requirements/007-technical-dept/000-master.md`  
**Depends on:** Mock Actor Context, provider registry, generation queue, repository contracts  
**Created:** 2026-07-19  
**Revised:** 2026-07-23

---

## 1. Objective

Implement a migration-ready mock credit system for every real AI image generation.

The implementation must:

- show an authoritative credit estimate before generation;
- reserve credits before a job is accepted into the generation workflow;
- capture the reservation once generation succeeds;
- refund or release the reservation after a technical failure;
- record every balance transition in an append-only ledger;
- charge the active user who requested the generation;
- support comparison jobs as separately priced slots;
- preserve pricing and routing snapshots for audit;
- use local JSON repositories now without coupling domain logic to JSON paths;
- keep contracts ready for a future database, authentication and payment implementation.

This phase is a **mock billing system**, not a payment gateway.

---

## 2. Business Requirements

### 2.1 Credit Meaning

- Use integer credits only.
- Business planning assumes approximately `10 credits = 1 THB`.
- Credit pack purchase and payment processing are outside this phase.
- Mock users receive credits through seed data or an authorized mock grant operation.

### 2.2 Payer Rules

- The active `ActorContext.userId` is always the payer.
- A template creator does not pay when another user uses or remixes the template.
- Client-supplied `username`, `userId`, balance or credit price is not authoritative.
- Community template ownership and credit ownership are independent concerns.

### 2.3 Billing Lifecycle

```text
estimate
  -> reserve
  -> enqueue
  -> provider execution
      -> completed successfully -> capture
      -> technical failure      -> refund
      -> cancelled before call  -> refund
```

Rules:

1. Estimate is computed by the server from provider, model, resolution, quality and reference count.
2. The estimate is locked into a pricing snapshot before reservation.
3. Reservation moves credits from `availableCredits` to `reservedCredits`.
4. The provider must not be called unless reservation succeeded.
5. Capture consumes reserved credits; it must not deduct available credits a second time.
6. Refund moves reserved credits back to available credits.
7. Capture and refund must be idempotent.
8. A user disliking a valid generated result is not refundable.
9. Provider errors, network failures, server failures and cancellation before provider execution are refundable.
10. Moderation or invalid-input failures must store a reason code. If the provider was not charged, refund the reservation.
11. A reservation must have one terminal state: `captured`, `refunded` or `expired`.

### 2.4 Estimate Lock

The estimate shown immediately before Generate must be the estimate reserved for that request.

If a user changes any pricing input after an estimate is issued, the client must request a new estimate. Pricing inputs include:

- provider;
- model;
- resolution or image size;
- aspect ratio;
- quality;
- output count;
- reference count;
- generation mode;
- routing mode.

An estimate expires after a configurable short period. Use 15 minutes for the mock policy.

### 2.5 Comparison Billing

- Every comparison slot is a separate generation and has its own estimate, reservation and ledger chain.
- The UI may show the sum of slot estimates, but the server must retain per-slot pricing snapshots.
- Failure of one slot refunds only that slot.
- A retry creates a new reservation unless it is a technical retry internal to the same job.
- Internal provider retry must not create a second user charge.

---

## 3. Scope

### 3.1 Included

- Versioned mock pricing policy.
- Server-side credit estimate.
- Mock account, reservation and append-only ledger persistence.
- Atomic reserve, capture and refund operations.
- Generation and comparison queue integration.
- Active-user balance display.
- Pre-generation estimate display.
- Insufficient-credit handling.
- Mock grant/recharge for local development.
- Compatibility migration for existing credit JSON and legacy ledger entries.
- Contracts for future Simple and Advanced Provider Routing.

### 3.2 Excluded

- Payment gateway and credit pack checkout.
- Tax, invoice and refund-to-payment-method flows.
- Automatic Simple Mode provider selection.
- Live provider price synchronization.
- Live FX updates.
- Production authentication and authorization.
- Production-grade distributed locking.
- Promotion, subscription and expiring-credit policies.
- Creator revenue sharing.

---

## 4. Pricing Policy

### 4.1 Authority and Versioning

Create a server-owned pricing policy. The current OpenAI orientation-aware policy version is:

```text
mock-2026-07-24-v2
```

Pricing must not be hardcoded in UI components, queue code or provider adapters.

`server/config/providers.json` remains the source of provider/model capability and selection IDs. Its current `creditCost` field is legacy compatibility data and must not be authoritative after this feature is enabled.

The pricing policy must include:

```text
policyVersion
effectiveAt
providerPriceSourceDate
referenceFxThbPerUsd
pricingFxThbPerUsd
fxReviewThresholdPercent
fxReviewConsecutiveDays
operatingSafetyBufferRate
targetGrossMarginRate
creditsPerThbAssumption
creditRoundingIncrement
estimateTtlSeconds
models[]
```

Each model pricing record must include:

```text
providerId
modelId
enabled
pricingStatus: priced | unpriced
baseCreditsByResolution
baseCreditsByQuality
referencePricing
providerCostUsd
calculatedMinimumCredits
publishedCredits
commercialOverrideReason
sourceDate
notes
```

For models whose published rate varies by canvas orientation, the policy may also define `baseCreditsByQualityAndAspectRatio`. The server normalizes `1:1` to `square`, a width-larger ratio to `landscape`, and a height-larger ratio to `portrait`. The orientation and quality must be stored in `pricingInputs` and revalidated before reservation, so a preview cannot reserve at a different rate.

If an enabled model has no explicit pricing record:

- do not silently charge `1 credit`;
- return `credit_pricing_unavailable`;
- identify the missing `providerId`, `modelId` and policy version;
- allow generation only after an explicit mock price is added.

### 4.2 Initial Mock Credit Matrix

The implementation must transfer the approved planning values from the business document into the versioned policy.

| Provider | Model ID | Selection | Mock credits |
|---|---|---:|---:|
| Google Gemini | `gemini-3.1-flash-lite-image` | 1K | 45 |
| Google Gemini | `gemini-2.5-flash-image` | default | 55 |
| Google Gemini | `gemini-3.1-flash-image` | 1K | 90 |
| Google Gemini | `gemini-3-pro-image` | 1K / 2K | 180 |
| Google Gemini | `gemini-3-pro-image` | 4K | 320 |
| xAI | `grok-imagine-image` | 1K | 30 |
| xAI | `grok-imagine-image` | 2K | 40 |
| xAI | `grok-imagine-image-quality` | 1K | 70 |
| xAI | `grok-imagine-image-quality` | 2K | 95 |
| ModelArk | `seedream-4-0-250828` | supported resolution | 45 |
| ModelArk | `seedream-5-0-lite-260128` | supported resolution | 50 |
| ModelArk | `seedream-4-5-251128` | supported resolution | 60 |
| ModelArk | `dola-seedream-5-0-pro-260628` | up to 2.36 MP | 60 |
| ModelArk | `dola-seedream-5-0-pro-260628` | above 2.36 MP | 120 |
| OpenAI | `gpt-image-1-mini` | Low / Medium / High square | 10 / 20 / 60 |
| OpenAI | `gpt-image-1-mini` | Low / Medium / High portrait or landscape | 15 / 30 / 90 |
| OpenAI | `gpt-image-1` | Medium / High square | 70 / 275 |
| OpenAI | `gpt-image-1` | Medium / High portrait or landscape | 105 / 410 |
| OpenAI | `gpt-image-1.5` | Medium / High square | 60 / 220 |
| OpenAI | `gpt-image-1.5` | Medium / High portrait or landscape | 85 / 325 |
| OpenAI | `gpt-image-2` | Medium square | 85 |
| OpenAI | `gpt-image-2` | Medium portrait or landscape | 70 |
| OpenAI | `gpt-image-2` | High square / portrait or landscape | 345 / 270 |

OpenAI has no explicit quality selector in the current MVP UI. The provider receives its `auto` default, while the credit policy maps the MVP `standard` quality tier to the documented Medium rate. This is an estimate policy, not a claim that OpenAI's runtime `auto` parameter is a fixed quality guarantee. When an explicit quality control is added, it must submit `low`, `medium`, or `high` and request a fresh estimate before Generate.

Reference surcharges must be configurable and visible in the estimate breakdown:

- Grok Standard: `5 credits` per reference image.
- Grok Quality: `15 credits` per reference image.
- Seedream 4.0, 4.5 and 5.0 Lite: `0 credits` in the initial policy.
- Seedream 5.0 Pro: first reference free, later references use a configurable surcharge.
- Gemini image models: use a configurable per-reference mock surcharge rather than embedding it in code.
- GPT Image 2: mark reference estimation as `estimateConfidence: provisional` until measured token-cost rules are finalized.

Values not explicitly approved in the business document must be represented as named policy configuration with a clear `provisional` note. Do not invent hidden constants in JavaScript.

### 4.3 Rate Derivation and Commercial Assumptions

The initial mock policy must preserve the assumptions from the business source:

| Parameter | Initial value | Purpose |
|---|---:|---|
| Provider price reference date | `2026-07-18` | Identifies the provider price snapshot |
| Reference FX | `33.7594 THB/USD` | Cost reporting and comparison with the source table |
| Internal pricing FX | `35 THB/USD` | Conservative FX used to derive selling credits |
| Operating safety buffer | `15%` | Covers price drift, expected technical overhead and unmeasured small costs |
| Target gross margin | `70%` | MVP unit-economics target |
| Credit value | `10 credits/THB` | Converts minimum retail THB to credits |
| Default rounding increment | `5 credits` | Produces understandable published prices |
| FX review trigger | `>5% for 7 consecutive days` | Requires a new pricing review and policy version |

The implementation must retain both reference FX and pricing FX. They serve different purposes:

- `referenceFxThbPerUsd` reproduces provider-cost tables for audit;
- `pricingFxThbPerUsd` derives the conservative selling floor;
- runtime generation uses the published credits in the locked policy, not a live FX calculation.

Provider cost must be represented as components:

```text
providerCostUsd =
  outputImageCostUsd
  + textInputCostUsd
  + referenceImageCostUsd
  + partialOrIntermediateCostUsd
  + expectedTechnicalRetryAllocationUsd
```

Technical retry allocation is a pricing-planning cost. A specific user must not be charged a second time when the platform performs an internal technical retry for the same reservation.

Commercial derivation:

```text
providerCostThbAtReferenceFx =
  providerCostUsd * referenceFxThbPerUsd

providerCostThbForPricing =
  providerCostUsd * pricingFxThbPerUsd

bufferedProviderCostThb =
  providerCostThbForPricing * (1 + operatingSafetyBufferRate)

minimumRetailThb =
  bufferedProviderCostThb / (1 - targetGrossMarginRate)

rawMinimumCredits =
  minimumRetailThb * creditsPerThbAssumption

calculatedMinimumCredits =
  ceil(rawMinimumCredits / creditRoundingIncrement)
  * creditRoundingIncrement
```

At a 15% buffer and 70% target gross margin, minimum retail is approximately `3.83x` the provider cost after FX conversion.

The published price is selected as follows:

```text
publishedCredits =
  approved value from the Initial Mock Credit Matrix
```

The calculated minimum is an audit and review value. The approved matrix remains authoritative because commercial pricing can deliberately:

- choose the upper end of an approved pricing range;
- round to a clearer customer-facing value;
- include uncertainty in reference-token cost;
- preserve consistent price tiers between nearby models;
- apply a temporary launch price.

When `publishedCredits` differs from `calculatedMinimumCredits`, the pricing record must include:

```text
commercialOverrideReason
approvedBy
approvedAt
```

Do not silently overwrite the approved matrix with a recalculated value.

### 4.4 Worked Rate Examples

#### Grok Imagine Standard 1K

```text
Provider output cost       = 0.020 USD
Pricing FX cost            = 0.020 * 35 = 0.70 THB
Buffered cost              = 0.70 * 1.15 = 0.805 THB
Minimum retail             = 0.805 / 0.30 = 2.6833 THB
Raw minimum credits        = 2.6833 * 10 = 26.833
Rounded minimum            = 30 credits
Published mock price       = 30 credits
```

References are added separately according to the Grok Standard reference rule.

#### Seedream 5.0 Lite

```text
Provider output cost       = 0.035 USD
Pricing FX cost            = 0.035 * 35 = 1.225 THB
Buffered cost              = 1.225 * 1.15 = 1.40875 THB
Minimum retail             = 1.40875 / 0.30 = 4.6958 THB
Raw minimum credits        = 4.6958 * 10 = 46.958
Rounded minimum            = 50 credits
Published mock price       = 50 credits
```

#### Gemini 3 Pro Image 1K/2K

```text
Provider output cost       = 0.134 USD
Pricing FX cost            = 0.134 * 35 = 4.69 THB
Buffered cost              = 4.69 * 1.15 = 5.3935 THB
Minimum retail             = 5.3935 / 0.30 = 17.9783 THB
Raw minimum credits        = 17.9783 * 10 = 179.783
Rounded minimum            = 180 credits
Published mock price       = 180 credits
```

These examples are acceptance fixtures for the pricing-policy test. Calculations should use decimal-safe arithmetic or integer minor units so floating-point drift cannot change a rounded credit tier.

### 4.5 Reference-Image Rate Calculation

Reference pricing must use the same FX, buffer, margin and rounding assumptions, but it must remain a separate estimate component.

Examples from the business source:

| Provider | Provider reference cost | Initial handling |
|---|---:|---|
| Seedream 4/4.5/5 Lite | Free under current provider table | `0 credits` |
| Seedream 5 Pro | First free, then `0.003 USD/image` | Tiered rule in policy |
| Gemini 3 Pro | `0.0011 USD/image` | Per-reference policy rule |
| Gemini Flash Image | Token based, usually under `0.02 THB/1K image` | Provisional per-reference rule |
| Grok Standard | `0.002 USD/image` | Approved `5 credits/reference` |
| Grok Quality | `0.010 USD/image` | Approved `15 credits/reference` |
| GPT Image 2 | Token based; approximately `1.18 THB` square or `1.77 THB` portrait | Measured/provisional breakdown |

The estimate breakdown must expose:

```text
referenceCount
freeReferenceCount
billableReferenceCount
referenceUnitCredits
referenceCredits
referencePricingMode: free | fixed | tiered | measured | provisional
```

For a measured provider such as GPT Image 2:

- estimate conservatively before generation;
- lock the displayed estimate for the user;
- do not deduct an invisible post-generation surcharge;
- store actual provider usage separately for margin analysis;
- adjust a future pricing-policy version instead of modifying the completed ledger.

### 4.6 Price Review and Policy Publication

Provider prices and rate assumptions are configuration, not live request inputs.

Create a new immutable `policyVersion` when any of these changes:

- provider output price;
- reference-input price;
- internal pricing FX;
- buffer or target margin;
- resolution/quality mapping;
- rounding strategy;
- approved commercial override.

Review process:

1. Update source provider costs and source date.
2. Recalculate the minimum credit table.
3. Compare calculated and currently published credits.
4. Record override reasons.
5. Run pricing fixtures and provider/model coverage validation.
6. Publish a new policy version.
7. Keep the previous policy readable for existing estimates, reservations and ledger audit.

Do not mutate the meaning of an existing policy version.

### 4.7 Runtime Estimate Formula

```text
estimatedCredits =
  baseOutputCredits
  + resolutionOrQualityAdjustment
  + referenceCredits
  + outputCountAdjustment
```

For the first mock implementation:

- `outputCount` defaults to `1`;
- batch output multiplies output pricing by output count;
- technical provider retries do not multiply user credits;
- prompt text cost may remain `0` but must appear as a zero-valued breakdown item;
- all totals are rounded up to integer credits.
- runtime calculation uses `publishedCredits` from the locked policy;
- runtime does not recalculate FX, margin or commercial rounding.

---

## 5. Routing Compatibility

Automatic Simple Routing is deferred, but billing contracts must already support:

```text
routingMode: simple | advanced
qualityTier
generationMode
requestedProviderId
requestedModelId
resolvedProviderId
resolvedModelId
referenceCount
pricingPolicyVersion
```

The client estimate fingerprint and the server reservation parity check must use
the same canonical fields: `routingMode`, `qualityTier`, `generationMode`,
provider, model, resolution, aspect ratio, quality, reference count and output
count. A Playground request must preserve `generationMode: playground` through
the generation route; it must not be reclassified from the legacy Studio `mode`
field during reservation.

For this phase:

- `advanced` resolves to the provider/model selected by the user;
- `simple` may resolve to the current default provider/model without optimization;
- no new automatic price/quality routing algorithm is required;
- billing must always use the resolved provider/model;
- requested and resolved selections must both be preserved for audit.

Canonical routing result:

```json
{
  "requestedProviderId": "gemini",
  "requestedModelId": "gemini-3.1-flash-lite-image",
  "resolvedProviderId": "gemini",
  "resolvedModelId": "gemini-3.1-flash-lite-image",
  "routingMode": "advanced",
  "qualityTier": "standard",
  "pricingPolicyVersion": "mock-2026-07-24-v2",
  "estimatedCredits": 45,
  "estimateConfidence": "locked",
  "fallbackApplied": false,
  "warnings": []
}
```

---

## 6. Canonical Data Contracts

### 6.1 CreditAccount

```json
{
  "schemaVersion": 2,
  "userId": "usr_demo",
  "availableCredits": 2000,
  "reservedCredits": 0,
  "status": "active",
  "lifetimeGrantedCredits": 2000,
  "lifetimeCapturedCredits": 0,
  "createdAt": "2026-07-23T00:00:00.000Z",
  "updatedAt": "2026-07-23T00:00:00.000Z"
}
```

Invariants:

- balances are non-negative integers;
- `availableCredits` cannot fall below zero;
- `reservedCredits` equals the sum of active reservations for the user;
- balance changes occur only through repository transaction methods.

### 6.2 CreditEstimate

```json
{
  "estimateId": "est_...",
  "userId": "usr_demo",
  "pricingPolicyVersion": "mock-2026-07-24-v2",
  "routing": {
    "routingMode": "advanced",
    "requestedProviderId": "gemini",
    "requestedModelId": "gemini-3.1-flash-lite-image",
    "resolvedProviderId": "gemini",
    "resolvedModelId": "gemini-3.1-flash-lite-image"
  },
  "pricingInputs": {
    "resolution": "1K",
    "aspectRatio": "6:8",
    "quality": null,
    "referenceCount": 1,
    "outputCount": 1,
    "generationMode": "scene"
  },
  "breakdown": {
    "baseOutputCredits": 45,
    "referenceCredits": 1,
    "textCredits": 0,
    "adjustmentCredits": 0,
    "totalCredits": 46
  },
  "estimateConfidence": "locked",
  "createdAt": "2026-07-23T00:00:00.000Z",
  "expiresAt": "2026-07-23T00:15:00.000Z"
}
```

The server must compare the locked pricing inputs with the generation request before reservation. A mismatch returns `credit_estimate_stale`.

### 6.3 CreditReservation

```json
{
  "schemaVersion": 1,
  "reservationId": "rsv_...",
  "estimateId": "est_...",
  "userId": "usr_demo",
  "requestId": "req_...",
  "jobId": "job_...",
  "amountCredits": 46,
  "status": "reserved",
  "pricingSnapshot": {},
  "relatedTemplateId": null,
  "comparisonSetId": null,
  "comparisonRunId": null,
  "comparisonSlotId": null,
  "createdAt": "2026-07-23T00:00:00.000Z",
  "updatedAt": "2026-07-23T00:00:00.000Z",
  "expiresAt": "2026-07-23T00:15:00.000Z",
  "capturedAt": null,
  "refundedAt": null,
  "terminalReason": null
}
```

Allowed transitions:

```text
reserved -> captured
reserved -> refunded
reserved -> expired
```

No terminal state may transition again.

### 6.4 CreditLedgerEntry

```json
{
  "schemaVersion": 2,
  "ledgerEntryId": "clg_...",
  "userId": "usr_demo",
  "operationType": "reserve",
  "amountCredits": 46,
  "availableDelta": -46,
  "reservedDelta": 46,
  "availableAfter": 1954,
  "reservedAfter": 46,
  "reservationId": "rsv_...",
  "estimateId": "est_...",
  "relatedJobId": "job_...",
  "relatedTemplateId": null,
  "providerId": "gemini",
  "modelId": "gemini-3.1-flash-lite-image",
  "pricingPolicyVersion": "mock-2026-07-24-v2",
  "idempotencyKey": "reserve:req_...",
  "reasonCode": "generation_reserved",
  "actorUserId": "usr_demo",
  "createdAt": "2026-07-23T00:00:00.000Z",
  "metadata": {}
}
```

Ledger operations:

| Operation | Available delta | Reserved delta |
|---|---:|---:|
| `grant` | `+N` | `0` |
| `reserve` | `-N` | `+N` |
| `capture` | `0` | `-N` |
| `refund` | `+N` | `-N` |
| `adjustment` | explicit | explicit |

`amountCredits` is always a positive face value. Delta fields carry the sign.

The ledger is append-only. Corrections require a new `adjustment` entry.

---

## 7. Persistence and Migration Design

### 7.1 Physical Store

Continue using:

```text
server/data/credits/database.json
```

Do not create another root-level credit JSON file.

The versioned mock store should contain:

```json
{
  "schemaVersion": 2,
  "accounts": [],
  "estimates": [],
  "reservations": [],
  "ledgerEntries": []
}
```

All mutation must use:

```text
server/repositories/json/jsonFileStore.js
```

Domain services must not resolve or own raw filesystem paths.

### 7.2 Legacy Migration

The current file uses:

```text
users.{username}.credits
creditLedger[]
```

Implement an idempotent migration/normalization path:

1. Resolve the legacy username through `MockUserRepository`.
2. Convert it to canonical `userId`.
3. Create one account per user with legacy credits as `availableCredits`.
4. Preserve old ledger entries as readable legacy records.
5. Convert legacy types for canonical reads:
   - `generation_charge` -> `capture_legacy`
   - `generation_refund` -> `refund_legacy`
   - `lost_job_refund` -> `refund_legacy`
   - `recharge` -> `grant_legacy`
6. Do not replay old entries against the migrated balance.
7. Mark migration metadata so the same conversion cannot run twice.
8. Do not discard the existing demo balances or ledger history.

The repository interface must expose canonical records even while legacy records remain readable.

### 7.3 Atomicity

For JSON MVP, account, reservation and ledger changes must occur inside one `mutateJsonFile` transaction.

Do not:

- update the balance in one write and append the ledger in another;
- let `CreditManager` mutate JSON directly;
- let QueueManager calculate a credit price;
- create parallel credit storage owned by different services.

---

## 8. Server Architecture

### 8.1 Existing Files to Reuse

```text
server/domain/credits/CreditManager.js
server/repositories/credits/CreditAccountRepository.js
server/repositories/credits/CreditLedgerRepository.js
server/app/routes/creditRoutes.js
server/domain/generation/generationRequestService.js
server/domain/generation/QueueManager.js
server/app/routes/generationRoutes.js
server/app/createApp.js
server/config/paths.js
server/config/providers.json
```

Do not build a second credit subsystem. Refactor the existing `CreditManager` into a compatibility facade that delegates to canonical services/repositories.

### 8.2 New Server Files

```text
server/config/credit-pricing-policy.json
server/domain/credits/CreditPricingPolicyService.js
server/domain/credits/CreditReservationService.js
server/domain/credits/creditErrors.js
```

Only add a schema validator file if the repository already uses that pattern:

```text
server/domain/credits/creditContracts.js
```

Do not create:

```text
server/credits/
server/routing/
server/creditRoutes.js
```

### 8.3 Repository Responsibilities

Extend the existing credit repositories instead of adding duplicates.

`CreditAccountRepository` must own atomic mutation methods:

```text
getAccountByUserId(userId)
reserveCredits(input)
captureReservation(input)
refundReservation(input)
grantCredits(input)
adjustCredits(input)
```

`CreditLedgerRepository` must own read/query methods:

```text
listByUserId(userId, pagination)
findByIdempotencyKey(key)
getJobBillingSummary(jobId)
```

If reservation queries become too large for `CreditAccountRepository`, a dedicated repository may be introduced only under:

```text
server/repositories/credits/CreditReservationRepository.js
```

It must still participate in the same atomic JSON transaction.

### 8.4 Domain Responsibilities

`CreditPricingPolicyService`:

- loads and validates the pricing policy;
- resolves provider/model pricing;
- calculates estimates and breakdowns;
- rejects unpriced combinations;
- emits immutable pricing snapshots.

`CreditReservationService`:

- validates estimate ownership and expiry;
- validates request/estimate pricing-input parity;
- reserves credits;
- binds reservation to a job;
- captures or refunds by terminal job outcome;
- applies idempotency keys;
- expires abandoned reservations.

`CreditManager`:

- remains temporarily for compatibility;
- delegates all new operations;
- must stop owning `database.json`;
- must not retain direct `jsonFileStore` mutation after migration.

### 8.5 Identity and Authorization

- Resolve payer from `req.actorContext.userId`.
- Never trust `username` or `userId` in estimate/generation bodies.
- Existing username-based methods may remain as deprecated compatibility adapters only.
- Mock grant endpoint must be disabled outside local development or require an admin ActorContext.
- A regular user can read only their account and ledger.

---

## 9. API Contracts

### 9.1 Get Account

```http
GET /api/credits/account
```

Response:

```json
{
  "account": {
    "userId": "usr_demo",
    "availableCredits": 2000,
    "reservedCredits": 0,
    "status": "active"
  }
}
```

Keep `GET /api/credits` temporarily as a compatibility alias.

### 9.2 Estimate

```http
POST /api/credits/estimate
Content-Type: application/json
```

Request:

```json
{
  "routingMode": "advanced",
  "qualityTier": "standard",
  "generationMode": "scene",
  "requestedProviderId": "gemini",
  "requestedModelId": "gemini-3.1-flash-lite-image",
  "resolution": "1K",
  "quality": null,
  "referenceCount": 1,
  "outputCount": 1
}
```

Response:

```json
{
  "estimate": {
    "estimateId": "est_...",
    "pricingPolicyVersion": "mock-2026-07-24-v2",
    "estimatedCredits": 46,
    "estimateConfidence": "locked",
    "breakdown": {},
    "expiresAt": "2026-07-23T00:15:00.000Z"
  },
  "account": {
    "availableCredits": 2000,
    "canAfford": true
  }
}
```

### 9.3 Generate

The existing generation endpoint must receive:

```json
{
  "estimateId": "est_...",
  "requestId": "req_...",
  "routingMode": "advanced",
  "pricingPolicyVersion": "mock-2026-07-24-v2"
}
```

Server flow:

1. Resolve ActorContext.
2. Reconstruct pricing inputs from the normalized generation request.
3. Validate the locked estimate.
4. Create job identity.
5. Reserve credits atomically.
6. Enqueue the job with `reservationId` and pricing snapshot.
7. Return job and billing summary.

If enqueue fails after reserve, refund immediately using the same request context.

### 9.4 Ledger

```http
GET /api/credits/ledger?cursor=...&limit=25
```

Return current actor entries only unless actor is authorized admin.

### 9.5 Mock Grant

```http
POST /api/credits/mock-grants
```

This route is local-development-only. It must:

- require an idempotency key;
- record a `grant` ledger event;
- never accept an arbitrary target user from an ordinary user;
- replace or deprecate unrestricted `/api/credits/recharge`.

### 9.6 Error Contract

Use stable error codes:

```text
credit_account_not_found
credit_account_inactive
credit_insufficient
credit_pricing_unavailable
credit_estimate_not_found
credit_estimate_expired
credit_estimate_stale
credit_reservation_not_found
credit_reservation_conflict
credit_operation_already_settled
credit_mock_grant_forbidden
```

Example:

```json
{
  "error": {
    "code": "credit_insufficient",
    "message": "Insufficient credits for this generation.",
    "details": {
      "requiredCredits": 90,
      "availableCredits": 45
    }
  }
}
```

---

## 10. Generation and Queue Integration

### 10.1 Generation Route

Modify `server/app/routes/generationRoutes.js` to replace:

```text
modelConfig.creditCost || 1
```

with server pricing estimate/reservation validation.

The route must not accept a client-computed credit amount.

### 10.2 Generation Request Service

Extend normalized queue options with:

```text
requestId
estimateId
reservationId
pricingSnapshot
routingSnapshot
payerUserId
```

Strip obsolete client price fields or retain them only as non-authoritative telemetry.

### 10.3 Queue Manager

Modify `server/domain/generation/QueueManager.js`:

- remove direct price calculation;
- remove direct `creditManager.deduct(...creditCost...)`;
- require a valid reservation for billable jobs;
- capture on successful terminal completion;
- refund on refundable terminal failure;
- preserve reservation status in job status/history metadata;
- make repeated terminal processing harmless.

Recommended idempotency keys:

```text
reserve:{requestId}
capture:{reservationId}
refund:{reservationId}:{reasonCode}
grant:{requestId}
```

### 10.4 Crash Recovery

On server startup or queue recovery:

- find `reserved` records whose job no longer exists or whose reservation expired;
- refund them with `reservation_expired` or `job_missing_after_restart`;
- never refund captured reservations;
- log recovery through the ledger.

This may be implemented as a small startup reconciliation method called by `server/server.js`; keep business logic in the credit domain, not bootstrap.

---

## 11. Client Design

### 11.1 New Client Module

Create:

```text
client/credits/creditApi.js
client/credits/creditEstimateController.js
client/credits/creditBalanceBadge.js
```

Responsibilities:

- request estimates;
- cache only the active estimate ID and expiry;
- invalidate estimate when pricing inputs change;
- render available/reserved credits;
- render estimate breakdown near Generate;
- disable Generate when estimate is loading, expired, unavailable or unaffordable;
- refresh account after reserve and terminal settlement.

Do not duplicate pricing calculations in the browser.

### 11.2 Existing Client Changes

Modify:

```text
client/core/generationService.js
client/index.html
client/comparison.js
client/scene-builder/sceneReplacementChecklist.js
```

Use the shared estimate controller for Studio, Scene Builder, template remix and comparison. Do not implement separate billing logic per mode.

### 11.3 Localization

Add credit UI strings to:

```text
client/i18n/locales/en/credits.json
client/i18n/locales/th/credits.json
```

Register the `credits` namespace through the existing i18n service. Do not embed new English/Thai strings directly in JavaScript.

Required concepts:

```text
available credits
reserved credits
estimated cost
pricing unavailable
insufficient credits
estimate expired
technical failure refund
```

---

## 12. File-Level Implementation Plan

### Phase A - Policy and Contracts

1. Add `server/config/credit-pricing-policy.json`.
2. Add policy validation and estimate calculation in `CreditPricingPolicyService.js`.
3. Add canonical credit errors.
4. Cover every enabled provider/model or mark it explicitly `unpriced`.
5. Do not change queue behavior in this phase.

Gate:

- policy loads;
- model ID matching uses `server/config/providers.json`;
- no enabled model silently resolves to one credit.

### Phase B - Repository and Legacy Migration

1. Extend `CreditAccountRepository.js` with canonical accounts and atomic mutation.
2. Extend `CreditLedgerRepository.js` with canonical ledger reads.
3. Add reservation persistence through the owning credit repository.
4. Add idempotent legacy normalization.
5. Refactor `CreditManager.js` to delegate.

Gate:

- old demo balances are preserved;
- reserve/capture/refund invariants pass;
- duplicate idempotency keys cause no second balance change.

### Phase C - API and Generation Integration

1. Extend `creditRoutes.js`.
2. Update `generationRoutes.js`.
3. Update `generationRequestService.js`.
4. Update `QueueManager.js`.
5. Add startup reservation reconciliation.
6. Wire dependencies only through `server/app/createApp.js`.

Gate:

- provider cannot execute without successful reservation;
- successful job captures once;
- failed job refunds once;
- comparison slots settle independently.

### Phase D - Client Integration

1. Add `client/credits/` modules.
2. Register scripts in dependency order.
3. Replace static `estimatedCredits || 1` display with estimate API output.
4. Integrate all generation modes.
5. Add localized messages.

Gate:

- active-user switch refreshes the account and invalidates another user's estimate;
- Generate cannot submit an expired or unaffordable estimate;
- UI never calculates the authoritative total.

### Phase E - Cleanup and Documentation

1. Deprecate unrestricted mock recharge.
2. Remove queue reliance on provider `creditCost`.
3. Document mock policy version and provisional prices.
4. Update master roadmap status only after tests and UI smoke checks pass.

---

## 13. Testing Specification

Create or extend:

```text
test/creditPricingPolicy.test.js
test/creditRepository.test.js
test/creditReservationService.test.js
test/creditGenerationBilling.test.js
test/creditComparisonBilling.test.js
test/creditLegacyMigration.test.js
```

Required cases:

| ID | Case | Expected |
|---|---|---|
| TC-005-RATE-001 | Derive Grok Standard 1K floor | `30 credits` using configured FX, buffer, margin and rounding |
| TC-005-RATE-002 | Derive Seedream 5 Lite floor | `50 credits` |
| TC-005-RATE-003 | Derive Gemini 3 Pro 1K/2K floor | `180 credits` |
| TC-005-RATE-004 | Published price differs from calculated floor | Override metadata is required |
| TC-005-RATE-005 | Existing policy version is referenced by old reservation | Old snapshot remains readable and unchanged |
| TC-005-RATE-006 | FX review threshold is reached | Review is reported; runtime price is not silently changed |
| TC-005-001 | Estimate priced provider/model | Correct policy version and breakdown |
| TC-005-002 | Unpriced enabled model | `credit_pricing_unavailable` |
| TC-005-003 | Reference surcharge | Total reflects provider reference policy |
| TC-005-004 | Insufficient balance | Reservation and enqueue rejected |
| TC-005-005 | Reserve | Available decreases; reserved increases |
| TC-005-006 | Capture | Reserved decreases; no second available deduction |
| TC-005-007 | Technical failure refund | Reserved decreases; available restored |
| TC-005-008 | Duplicate reserve request | One reservation and one reserve ledger event |
| TC-005-009 | Duplicate capture callback | One capture only |
| TC-005-010 | Capture then refund attempt | Rejected without balance mutation |
| TC-005-011 | Expired reservation | Refunded once by reconciliation |
| TC-005-012 | Actor spoof in request body | Active ActorContext remains payer |
| TC-005-013 | Bob remixes Alice template | Bob is charged; Alice is unchanged |
| TC-005-014 | Comparison with three slots | Three independent reservations |
| TC-005-015 | One comparison slot fails | Only failed slot is refunded |
| TC-005-016 | Enqueue fails after reserve | Immediate refund |
| TC-005-017 | Legacy credit file migration | Balance/history preserved, migration runs once |
| TC-005-018 | Active user switch | Client reloads correct balance and estimate |

Concurrency test:

- submit two reservations against a balance that can afford only one;
- exactly one succeeds;
- account never becomes negative.

UI smoke test:

1. Switch to Demo User.
2. Select a priced provider/model.
3. Confirm estimate and balance are visible.
4. Add a reference and confirm estimate updates where applicable.
5. Generate and confirm available/reserved balances transition.
6. Simulate a technical failure and confirm refund state.
7. Run a comparison and confirm total plus per-slot settlement.

---

## 14. Impact and Risks

### High-Impact Files

```text
server/domain/generation/QueueManager.js
server/app/routes/generationRoutes.js
server/domain/credits/CreditManager.js
server/repositories/credits/CreditAccountRepository.js
client/core/generationService.js
client/comparison.js
```

### Main Risks

- Double charge from repeated queue completion.
- Lost credits when enqueue fails after reserve.
- Double refund after server restart.
- Client/server estimate mismatch.
- Incorrect payer during template remix.
- Comparison aggregate hiding a failed slot settlement.
- Legacy JSON migration replaying historical charges.
- Direct JSON mutation bypassing repository locks.

### Required Mitigations

- Idempotency key on every mutation.
- Single atomic store mutation per balance transition.
- Locked pricing snapshot.
- ActorContext-derived payer.
- Explicit reservation state machine.
- Startup reconciliation.
- Legacy migration marker.
- No `creditCost || 1` fallback.

---

## 15. Instructions for Google Gemini Antigravity AI

Gemini Antigravity must follow this execution protocol.

### 15.1 Before Editing

1. Read this entire requirement.
2. Read `requirements/007-technical-dept/000-master.md`.
3. Inspect all existing files listed in Section 8.1.
4. Inspect `server/config/providers.json` and use its exact provider/model IDs.
5. Inspect `git status` and preserve unrelated user changes.
6. Produce a short implementation plan mapped to Phases A-E.
7. Do not start by generating new parallel modules with guessed paths.

### 15.2 Architecture Rules

- Reuse and refactor existing credit repositories and `CreditManager`.
- Put domain logic under `server/domain/credits/`.
- Put persistence adapters under `server/repositories/credits/`.
- Put routes under `server/app/routes/`.
- Put runtime JSON under `server/data/credits/`.
- Resolve data files through `server/config/paths.js`.
- Use `jsonFileStore.js` for JSON mutation.
- Keep `server/server.js` limited to startup/bootstrap.
- Register dependencies through `server/app/createApp.js`.
- Do not create root-level compatibility wrappers.
- Do not hardcode pricing in UI, queue or provider adapters.

### 15.3 Delivery Method

Implement one phase at a time:

1. Complete the phase.
2. Show changed files.
3. Explain input, process and output.
4. Identify compatibility impact.
5. Add or update tests for that phase.
6. Continue only when the phase gate is satisfied.

Do not combine the credit feature with unrelated refactoring.

### 15.4 Mandatory Decisions

Gemini must not ask the following questions again; the answers are fixed:

- Storage: use the existing versioned JSON credit store through repositories.
- Payer: active ActorContext user.
- Pricing: server-owned versioned mock policy.
- Rate derivation: internal pricing FX, 15% buffer, 70% target margin and configured rounding are used when publishing a policy.
- Runtime rate behavior: use locked `publishedCredits`; never recalculate FX or margin during a generation request.
- Pricing updates: create a new immutable policy version; never rewrite an old reservation's price.
- Queue charging: reservation before provider execution, capture on success, refund technical failure.
- Simple Routing: contract only; automatic optimization deferred.
- Payment: out of scope.
- Missing price: block with `credit_pricing_unavailable`; never fallback to one credit.
- UI pricing: display server estimate; do not calculate it.
- Legacy data: preserve and migrate idempotently.

### 15.5 Required Implementation Report

At completion, report:

- files added and modified;
- pricing combinations implemented and combinations marked unpriced;
- legacy migration behavior;
- API contract changes;
- queue settlement behavior;
- idempotency strategy;
- tests added;
- test commands for the project owner to run;
- remaining provisional pricing assumptions;
- any requirement deviation, with reason.

---

## 16. Definition of Done

This requirement is complete only when:

- every generation path uses a server estimate and reservation;
- no queue path deducts a raw `creditCost`;
- no missing model price falls back to one credit;
- active user is the authoritative payer;
- success captures exactly once;
- technical failure refunds exactly once;
- comparison slots settle independently;
- ledger and balances remain consistent after restart recovery;
- legacy demo balances and ledger history remain available;
- UI shows server estimate and current active-user balance;
- mock grants are restricted;
- all automated tests pass;
- manual UI smoke test passes;
- implementation follows the documented project structure.
