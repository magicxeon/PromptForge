# Shot Batch Generation And Review Lifecycle

**Requirement ID:** `016-PVP-005`  
**Status:** Requirement complete; implementation not started  
**Priority:** P1 after single-Shot qualification

## 1. Objective

Add `Generate eligible set` as one durable, quoted operation over multiple
Shots while preserving the proven single-Shot workflow, individual attempt
history and explicit human approval.

## 2. Eligibility Snapshot

The server prepares one immutable batch candidate from current Project truth.
For every ordered Shot it records one outcome:

- eligible and ready for a new attempt;
- already approved and current;
- already active under another task/group;
- blocked by missing/stale Storyboard source;
- blocked by provider, duration, audio, trust or reference compatibility;
- blocked by insufficient authoring authority.

Only eligible Shots enter the quote. The response includes counts, ordered
blocking findings and an aggregate fingerprint. The client must not derive
eligibility by filtering its cached Project.

## 3. Aggregate Quote

The quote binds:

- Project/version and ordered eligible Shot IDs;
- one selected provider/model and shared supported settings;
- one prepared packet, reference plan and per-Shot quote component per child;
- aggregate Credit amount and pricing-policy version;
- expiry, idempotency scope and batch fingerprint.

Provider/model is selected once for the batch. Per-Shot duration may vary only
when the model and price contract support it. Incompatible Shots are excluded
and explained before consent; no settings are silently changed.

The quote also binds one clip operation tier. Batch does not mix draft and final
children, and it never schedules a hidden final pass after draft completion.

## 4. Durable Group Submission

The client submits the accepted quote once to a Generation-owned group entry
point. The server:

1. validates actor ownership, quote and current fingerprints;
2. creates/reuses one idempotent Generation Group;
3. records a no-charge qualification authorization or reserves the aggregate
   Credit amount through Credits according to the quote policy;
4. creates one ordered child Job/attempt contract for each eligible Shot;
5. dispatches children through bounded concurrency;
6. records child and aggregate terminal state;
7. records each no-charge child or captures/refunds each billable child
   according to canonical policy;
8. reconciles aggregate reservation and final settlement exactly once.

The browser must not loop over the single-Shot endpoint. Single-Shot and batch
must call the same internal child preparation/execution service.

## 5. Concurrency And Backpressure

- Concurrency is server-configured by provider/account, never client-selected.
- Queued children retain order but may complete out of order.
- Provider rate-limit/backoff honors retry-after and does not consume another
  reservation.
- A Project has a bounded number of active video children.
- Duplicate group submission with the same idempotency key returns the original
  Group and does not create new Jobs or reservations.

## 6. Group And Child States

Group summary states:

```text
preparing | quoted | queued | processing | completed
partial_failure | failed | cancelled | reconciliation_required
```

Every child keeps the normal Generation lifecycle and one of these actionable
review states:

```text
waiting | active | ready_for_review | approved | retryable_failure
blocked | stale | reconciliation_required
```

Closing the progress dialog, changing selected Shot or refreshing does not
cancel the Group. The Produce header and Job Center expose the same server state.

## 7. Partial Failure And Retry

- Successful child outputs remain durable and reviewable.
- A failed child does not invalidate or regenerate successful unrelated Shots.
- `Retry failed` creates child retries only for current retryable failures and
  presents a new exact quote where required.
- Previously captured children are not charged again.
- Cancel stops only children not yet accepted by the provider where supported;
  already accepted children follow provider/Credit settlement policy.
- Reconciliation blocks only affected children and aggregate financial closure.

## 8. Project Version Changes

An accepted Group uses its immutable child snapshots. Unrelated Project edits
do not terminate it. When results arrive:

- source/Shot authority still matching becomes `ready_for_review`;
- changed authority marks that child result stale but preserves its history;
- an already-approved unrelated Shot remains approved;
- batch completion never overwrites a newer Project version wholesale.

Child updates use narrow commands or compare-and-merge behavior, not a stale
full Project write.

## 9. Review And Approval

Batch generation does not batch-approve. The user reviews each attempt under
the same criteria and command as single-Shot generation. Approval pins one
attempt and video Asset Version as the current Shot source. Replacing approval
preserves history and marks dependent Timeline/export evidence stale.

## 10. API Shape

The canonical boundary exposes use cases equivalent to:

```text
prepareEligibleVideoSet(projectId, selection)
quoteEligibleVideoSet(projectId, preparationFingerprint)
submitEligibleVideoSet(projectId, quoteId, idempotencyKey)
readVideoSet(projectId, groupId)
retryVideoSetFailures(projectId, groupId, quoteId, idempotencyKey)
```

Route names may follow existing conventions, but HTTP handlers only validate,
translate and delegate. Actor identity comes from `req.actorContext`.

## 11. UI Contract

The confirmation/progress dialog shows:

- provider/model and supported shared settings;
- aggregate Credits and current balance;
- eligible/blocked/active/already-approved counts;
- ordered per-Shot estimate and blocking disclosure;
- one consent action before submission;
- durable child progress after submission;
- retry failed and return-to-Shot recovery actions.

Progress rows remain compact and do not render full prompts or autoplay videos.
For a configuration with no prior Project evidence, the dialog recommends one
test Shot before committing to the full set without making that recommendation
an extra mandatory generation.

## 12. Acceptance

- A five-Shot fixture can submit all eligible Shots with one confirmation.
- The Group survives dialog close, page refresh and server restart.
- One child failure produces partial failure while successful children remain
  reviewable.
- Duplicate submission creates no duplicate provider tasks or Credit effects.
- Retry targets only current failed children.
- Single-Shot generation remains behaviorally and financially unchanged.
- No output is approved automatically.
