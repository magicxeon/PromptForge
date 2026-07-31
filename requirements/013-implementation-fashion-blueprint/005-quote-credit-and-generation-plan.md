# Quote, Credit and Generation Plan

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Public quote, Proof/Continuation, atomic reservation and recovery contracts implemented; validation pending

### Single-product review rule

When the resolved plan contains one Product Item, Review does not offer
`Test one product first`. A proof would duplicate the full operation, so the UI
forces `quotePurpose: full`. Proof and Continuation remain available only when
the plan has at least two Product Items.

### Insufficient-credit interaction

When atomic Fashion reservation returns `credit_insufficient`, the React route
opens the shared `CreditExhaustedDialog` already used by Studio and Playground.
The dialog displays the locked quote maximum and current available balance,
offers the credit account route, and exposes the existing mock grant action only
for mock actors. The inline run error is suppressed for this code so the user
does not receive duplicate failure messages.

The implementation creates one locked estimate per product and reserves all
accepted operation credits atomically through `reservePlan` before enqueue.
Deterministic plan/job IDs and idempotency prevent duplicate submission.

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
outfitScope
providerRoute
referenceCount
referenceProcessingPlanFingerprint
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
- referenceProcessingPlanFingerprintByOperation
- estimatedCredits
- maximumCredits
- templateCreditComponent
- expiresAt
- warnings[]
```

Quote expiry must not outlive any operation estimate. Use the earliest locked
operation-estimate expiry as the Fashion quote expiry.

Inputs affecting the hash:

- Template/version
- Character/version
- Product Items and reference roles
- Outfit scope and allowed garment overrides
- pose/environment
- Simple tier or Advanced provider settings
- output count/resolution
- Reference Processing policy version and resolved plan fingerprint

Any change invalidates the quote.

The route snapshot is resolved by the server. In Simple Mode it records the
provider/model selected by the versioned tier policy; the client does not submit
a trusted provider route. Each operation estimate must lock the exact provider,
model, resolution, reference count and output count that will later be sent to
the generation pipeline. This is required by the current
`CreditReservationService` stale-estimate validation.

For each Product Item, `FashionGenerationContext` must resolve Template,
Character and Outfit references through
`prepareGenerationReferences()` before estimating. Quote and Run independently
recompute that plan. The locked estimate and submitted generation request must
contain the same `referenceProcessingPlanFingerprint`; a mismatch is
`credit_estimate_stale` and no job is enqueued.

### 3.1 Character identity dispatch

For Fashion operations that combine a person-bearing Template baseline, a
selected Character and a person-worn Outfit upload:

1. The approved Character version is the only identity/body authority.
2. Use its canonical three-view casting image as the Character identity source.
   Do not use an inferred face crop; manual Gemini trials show the complete
   Character source preserves face, skin tone and proportions more reliably.
3. Dispatch in the stable order Template, Character, Outfit Front and optional
   Outfit Back. Compile a structured JSON authority brief against these exact
   provider image indexes.
4. Outfit controls garment only and must suppress its wearer.
5. Template controls composition, pose intent, environment and lighting only.
   Its person identity, skin tone, body proportions, hair and clothing are
   explicitly prohibited by the structured authority brief.
6. The queue must reject arbitrary derivative paths. Only exact URLs authorized
   from the validated Character version may be read.

Regression coverage must assert provider order:

```text
IMAGE_0 template -> IMAGE_1 character three-view
-> IMAGE_2 outfit front -> optional IMAGE_3 outfit back
```

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
FashionGenerationContext
CreditReservationService
generationRequestService / QueueManager
```

Required implementation ownership:

```text
server/domain/fashion-blueprint/FashionBlueprintService.js
server/domain/fashion-blueprint/FashionQuoteService.js
server/domain/fashion-blueprint/FashionPlanHash.js
server/domain/fashion-blueprint/FashionRunService.js
server/domain/fashion-blueprint/FashionGenerationContext.js
server/repositories/fashion-blueprint/FashionBlueprintQuoteRepository.js
server/repositories/fashion-blueprint/FashionBlueprintRunRepository.js
server/domain/credits/CreditReservationService.js
server/repositories/credits/CreditAccountRepository.js
server/app/routes/fashionBlueprintRoutes.js
```

`FashionRunService` may use the canonical generation context/queue option
helpers and injected `QueueManager`; it must not call an HTTP generation route,
provider adapter or ledger repository directly.

The `/resolve` endpoint currently returns route/quality/resolution information
only. Before it becomes the authoritative pre-quote preview, extend its response
with a sanitized plan summary rather than exposing internal prompts or private
reference values.

## 6. UX

Review displays:

- outfit count
- outputs per outfit and total outputs
- Character and Template
- quality mode/tier
- estimated/maximum credits
- current available credits
- warnings and quote expiry
- AI generation and Template usage credit components
- per-operation reference count and processing warnings when actionable

Single Product shows one direct Generate action. Bulk shows:

```text
Generate one test image -- <proof credits>
Generate all -- <full-plan maximum credits>
```

Both actions require their own current valid quote and sufficient credits.
Neither displayed amount is calculated by the client.

### 6.1 Proof Before Batch Contract

The optional test image is a real, billable generation operation, not a free
preview:

```text
FashionProofContext
- parentPlanHash
- setupFingerprint
- productItemKey
- shotKey
- operationId
- quoteId
- runId
- status: quoted | processing | completed | approved | superseded
```

Rules:

1. The server chooses the first eligible primary/cover operation from the
   resolved plan; the client cannot forge a cheaper operation.
2. Proof uses the same immutable Template, Character, Product reference,
   Reference Processing fingerprint, direction, quality and provider route as
   the proposed Batch.
3. Proof has its own estimate, reservation, capture/refund and idempotency key.
4. A successful proof is charged normally and remains in History even if the
   customer does not continue.
5. `Approve and generate remaining` creates a new continuation quote containing
   only operations not already satisfied by the approved proof.
6. The accepted proof is grouped into final campaign results and is never
   regenerated or charged a second time.
7. Any plan-hash input change marks the proof `superseded`; it remains viewable
   but cannot reduce a later Batch quote.
8. `Try another test` is a new billable operation/attempt and must not silently
   replace or refund a successful prior proof.

The Review UI must make the current charge, remaining potential charge and
already-paid proof explicit:

```text
Test completed             10 credits paid
Remaining operations       40 credits maximum
Due on approval            40 credits maximum
```

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
- Quote and Run reject a changed Reference Processing fingerprint before queue
  submission.
- Template usage credits are included once per output and the combined total is
  reserved atomically.
- Plan hash includes Template version, Character version, outfit scope,
  reference identities, direction assignment and output recipe.
- Proof quote contains exactly one server-selected eligible operation.
- Approved proof is excluded from continuation reservation and capture.
- Changed setup prevents proof reuse and requires a new full/continuation quote.
- Repeated proof approval returns the same continuation plan and cannot enqueue
  or charge duplicate operations.

## 8. Implementation Plan

1. Extend normalized plan/quote/run DTOs and Zod schemas with immutable version,
   operation and processing summary fields, plus
   `quotePurpose: full | proof | continuation`.
2. Resolve Template, Character and references once through
   `FashionGenerationContext` for each Quote operation.
3. Recompute the same context during Run and compare the locked estimate,
   Template pricing and processing fingerprint.
4. Atomically reserve every accepted operation before the first enqueue.
5. Extend the existing `FashionQuoteService` to select one deterministic proof
   operation and derive a continuation from the same normalized plan.
6. Extend the existing `FashionRunService` and Run repository record with proof
   status and continuation lineage. Do not create a second queue, credit path or
   proof-only repository.
7. Build the four-step React reducer/route flow so each setup change clears the
   active quote and marks any completed proof inapplicable to the changed draft.
8. Reuse the shared result surface for proof review and merge an approved proof
   with continuation result groups by stable operation ID.
9. Add stale scope/reference/version, proof idempotency, duplicate-charge,
   concurrent submission, partial settlement and restart-recovery tests.
