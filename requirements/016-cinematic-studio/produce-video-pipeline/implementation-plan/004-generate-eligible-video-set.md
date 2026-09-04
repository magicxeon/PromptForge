# Package 004 - Generate Eligible Video Set

**Plan ID:** `016-PVP-IP-004`  
**Status:** Pending  
**Requirement owners:** `../005`, `../008`, `../010`  
**Primary capability:** Cinematic orchestration through Generation Groups  
**Reviewers:** Commercial Integrity, UX/UI, QA

## 1. Goal

Generate multiple eligible Shots with one provider/model choice and one consent
while retaining one canonical child lifecycle, exact aggregate pricing,
partial-failure recovery and individual review.

## 2. Expected Existing Touchpoints

- `server/domain/cinematic/CinematicApplicationService.js`
- `server/domain/generation/VideoGenerationApplicationService.js`
- `server/domain/generation/QueueManager.js`
- `server/repositories/generation/GenerationGroupRepository.js`
- `server/repositories/generation/VideoProviderTaskRepository.js`
- `server/app/routes/cinematicRoutes.js`
- `web/src/features/cinematic/api/cinematicApi.ts`
- `web/src/features/cinematic/schemas/cinematicSchemas.ts`
- Produce components introduced in Package 002
- `web/src/components/generation/GenerationQueueStatus.tsx`
- current `test/generationGroup.test.js`, Cinematic and Credit suites

## 3. Steps

### 004.1 Extract canonical child executor

Refactor only as needed so single-Shot and future batch children use one
internal prepare/dispatch/completion contract. Preserve the public single-Shot
API and prove payload/financial parity before adding Group behavior.

### 004.2 Server-prepared eligibility

Prepare the ordered eligible/already-approved/active/blocked snapshot and
fingerprint from current Project truth. Return per-Shot reasons and no mutation.

### 004.3 Aggregate quote

Quote only eligible child snapshots using one provider/model and shared
supported settings. Bind per-child and aggregate totals, policy versions and
expiry. Bind one preview/draft/final operation tier and schedule no hidden
second pass. Commercial tests prove aggregate reconciliation.

### 004.4 Durable Group and bounded dispatch

Create/reuse one Group by idempotency key, create ordered child records, record
one no-charge qualification authorization or reserve once according to the
approved quote policy, and dispatch with server/provider concurrency. Do not
dispatch from React.

### 004.5 Partial terminal and retry behavior

Persist aggregate status, preserve successes, classify retryable children and
create a new bounded quote/idempotent retry for failures only. Handle version
changes with narrow per-Shot updates.

### 004.6 Confirmation/progress UI

Implement one dialog with provider/model, counts, aggregate/per-Shot Credits,
blocking findings, consent, durable child progress and retry. Closing the dialog
does not cancel and Project reload restores it.
When no attempt has proven the selected configuration for this Project, present
the normal single-Shot path as the recommended test before full submission.

## 4. Tests

- one complete five-Shot fixture and mixed eligibility;
- aggregate quote/fingerprint and quote expiry;
- duplicate submit/retry and concurrent request idempotency;
- bounded concurrency, rate limit and child completion out of order;
- partial failure, cancel and reconciliation;
- Project version change without full-record overwrite;
- aggregate reservation and per-child capture/refund math;
- dialog close/reopen/refresh, status rows and focus;
- single-Shot lifecycle parity and protected UI regressions.

## 5. Exit Gate

- One five-Shot internal Group survives refresh/restart and completes with a
  truthful aggregate state.
- Partial failure and retry affect only failed current children.
- No output is auto-approved and every child appears in normal attempt history.
- Credits and provider-task idempotency pass independent review.

## 6. Stop Conditions

- Group implementation requires a browser loop or a second child workflow.
- Aggregate reservation cannot reconcile partial outcomes deterministically.
- Project updates can overwrite newer unrelated Shot changes.
- Provider concurrency/rate limits are unbounded or client-controlled.

## 7. Rollback

Hide the batch feature policy and retain Groups/children as readable Jobs.
Single-Shot generation remains the production path. Never delete successful
Assets or financial evidence created by an internal batch.
