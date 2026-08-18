# Cinematic Admin, Support And Observability Contract

**Status:** Bounded Admin/Support project, provider-task and capability read
models implemented; audited recovery commands remain owned by Requirement 017
and are not yet exposed
**Owners:** Cinematic read models with Admin, Support and Observability
**Primary role:** Backend Platform Architect
**Reviewers:** Commercial Financial Integrity, QA And Release Engineer
**Skills:** `implement-generation-workflow`, `review-commercial-integrity`,
`verify-release-regressions`

## 1. Outcome

Admin and Support shall be able to locate, explain, moderate and recover a
Cinematic operation without direct file edits, without exposing private media,
and without creating alternate Generation or Credit mutation paths.

This requirement integrates with `requirements/017-implementation-backend/`.
Requirement 017 owns shared Admin/Support screens, cases, commands, approvals
and audit behavior. Cinematic supplies bounded read projections and owner
commands for its own Project/Scene/Shot/attempt state.

## 2. Operational Search

Authorized staff can search by exact or bounded filter using:

- Project, Scene, Shot, attempt and export IDs;
- Generation Group, Job and provider task IDs;
- Asset/checksum and derived poster/thumbnail IDs;
- quote, reservation, settlement and reconciliation IDs;
- request, correlation, support reference and Support Case IDs;
- owner user ID, lifecycle status, provider/model, operation, date range and
  moderation state.

Disabled, failed, archived and partially completed records remain searchable.
Search results are cursor-paged and return safe metadata, not raw prompts,
private references or signed media URLs.

## 3. Admin Read Model

The Cinematic operational detail view joins by stable IDs and shows:

1. owner, Project stage and active immutable versions;
2. Scene/Shot/attempt hierarchy and stale/approval reasons, including
   `source_changed` and `source_unavailable`;
3. Character Version, wardrobe, approved Storyboard Asset Version and
   reference-plan lineage;
4. provider/model/rate version, request capability snapshot and provider task;
5. Queue wait, processing, media-copy and total duration;
6. quote, reserved/captured/refunded Credits and reconciliation state;
7. output Asset, poster/thumbnail derivatives and retention state;
8. sanitized error, retry eligibility and safe support reference;
9. moderation/public visibility only when an exported Asset is shared;
10. related Case, command, approval and audit events.

The projection may be eventually consistent for display, but every mutation
must re-authorize and re-read canonical owner state.

## 4. Administrative Controls

### 4.1 Provider and pricing controls

Admin may, through the versioned runtime-configuration lifecycle in Requirement
017-010 and existing provider/pricing owners:

- enable/disable a qualified video operation by provider/model/cohort;
- stop new submissions while preserving read/review/export access;
- inspect capability and qualification evidence;
- publish an effective-dated provider rate version;
- preview the effect on representative quotes before activation;
- expire a promotional rate without changing accepted quotes.

Provider/model capability, pricing and customer exposure are separate states.
A priced model is not automatically qualified or enabled. Editing or saving a
draft never changes customer-facing behavior; activation is manual or scheduled
and accepted quotes remain pinned to their original versions.

### 4.2 Support recovery controls

Support commands use Requirement 017 Case/preview/approval contracts to:

- retry an eligible failed operation with preserved idempotency;
- reconcile an unknown provider or settlement outcome;
- refund or compensate according to authorized Credit policy;
- restore a Project pointer to an existing durable successful attempt;
- re-copy recoverable provider media before retention expiry;
- cancel an undispatched operation when supported;
- disable or moderate an exported/shared Asset through its owner.

No command edits JSON, balance, Job status or provider task ID manually.

## 5. Correlation And Log Contract

Every request and asynchronous child propagates or links:

```text
requestId
correlationId
actorId
projectId / sceneId / shotId / attemptId
generationGroupId / jobId
providerOperationId / providerTaskId
quoteId / reservationId / settlementId
assetId / exportId
supportCaseId / supportCommandId when applicable
```

Structured events cover `accepted`, `reserved`, `enqueued`,
`provider_submitted`, `provider_processing`, `provider_succeeded`,
`media_copied`, `settled`, `refunded`, `failed`, `cancelled`,
`reconciliation_required` and `recovered`.

Logs record safe fingerprints and schema/rate/reference-policy versions. Normal
logs exclude raw private prompts, Base64, access tokens, signed URLs and private
reference bytes. Debug prompt evidence, when explicitly enabled, follows the
existing restricted output/log policy and retention instead of standard logs.

## 6. Failure And Recovery Matrix

| Failure point | Customer state | Financial state | Admin/Support action |
|---|---|---|---|
| Validation before reservation | blocked with stable error | no reservation | inspect capability/reference reason |
| Reservation failure | draft preserved | no debit | inspect quote/balance; no retry command required |
| Enqueue failure after reservation | failed recoverable | refund or release | verify idempotent release |
| Provider rejected/non-billable | failed | refund | inspect provider evidence, retry if eligible |
| Provider timeout/unknown | reconciliation required | reservation held by policy | reconcile provider task before financial command |
| Provider success/media copy failed | recovery required | no final capture until durable boundary | re-copy or reconcile retention risk |
| Partial Generation Group | successes reviewable | settle children independently | retry only failed children |
| Export assembly failed | source clips preserved | operation-specific settlement | retry same export idempotently |
| Process restart | Project remains resumable | no duplicate settlement | recover durable Jobs and poll once |

## 7. Admin UX Integration

- Add Cinematic filters and lineage sections to shared Admin/Support views; do
  not create a separate admin shell.
- Status chips distinguish Project, Generation, financial and moderation state.
- Every command opens preview with target, expected effects, Credits, risk,
  required evidence and approval requirement.
- Toast confirms accepted commands; persistent status remains in the Case or
  command timeline after the toast disappears.
- Loading, empty, partial trace, unauthorized, conflict, command-in-progress,
  success and unknown-outcome states are explicit.
- The customer-facing Cinematic application remains operational if Admin read
  projections are unavailable.

## 8. Retention And Privacy

- Project/media/log retention is explicit by media role and lifecycle.
- Staff media access is purpose-limited, audited and resolved through Assets.
- Private Character/reference media is not exposed by joined read models.
- Export sharing and moderation remain separate from private Project access.
- Deletion/retirement uses owner policies and preserves financial/audit evidence
  as legally and operationally required.

## 9. QA And Acceptance

- One safe reference traces a paid Shot from Project through provider task,
  Asset and financial terminal outcome.
- Support can compare the current approved Storyboard source with the source
  consumed by any video attempt and explain why a clip or export is stale
  without opening private raw prompts.
- Duplicate Support commands cannot duplicate Generation, refund or capture.
- Partial completion retains successful children and exposes failed children.
- A promotional rate expiry does not alter an accepted quote.
- Unauthorized user, Support and Admin roles receive the correct bounded view
  and cannot execute disallowed commands.
- Admin read-model outage does not block customer creation or accepted Jobs.
- Disabled provider/model prevents new matching submissions while existing
  Projects and results remain readable.
- Raw prompts/private references do not appear in standard logs or search.
- Every tested terminal operation has one explainable financial outcome and a
  support reference.
