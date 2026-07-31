# Platform Correlation Tracing And Credit Recovery

**Parent:** `000-master-fashion-blueprint-roadmap.md`
**Status:** Requirement ready for observability/log-tracing expert review; implementation pending
**Scope:** Cross-platform foundation, first E2E adopter is Fashion Blueprint

## 1. Purpose

One customer action may currently produce:

```text
HTTP requests
-> Fashion plan and quote
-> multiple credit estimates and reservations
-> Fashion run and operations
-> generation jobs
-> provider requests
-> results
-> credit capture or refund
```

The system has many useful domain IDs and an HTTP `requestId`, but it does not
yet provide one durable support reference that joins the complete workflow.
This makes it unnecessarily difficult to diagnose a failed image, prove what
was charged, issue a safe refund or retry an operation for a customer.

This requirement introduces a platform-wide correlation contract. It does not
replace domain IDs, audit events or future distributed tracing.

## 2. Business Requirement

For every accepted billable workflow, Support must be able to start with one
customer-safe reference and answer:

- who initiated the workflow;
- which quote and pricing policy were accepted;
- which credit reservations, captures and refunds occurred;
- which Template, Character and reference-processing policy versions were used;
- which run, operation and generation job handled the work;
- which provider/model was called and what provider request ID was returned;
- which outputs succeeded or failed;
- whether retry, refund or manual adjustment is still allowed;
- whether an earlier recovery action already occurred.

The same trace must support single-image generation, Comparison, Studio,
Playground, Template use and Fashion Blueprint. Fashion is the first complete
multi-operation acceptance scenario.

## 3. Identifier Model

### 3.1 Canonical hierarchy

```text
correlationId      one customer intent/workflow across async boundaries
  requestId         one inbound HTTP request
  quoteId           one immutable accepted price proposal
  planId            one normalized execution plan
  runId              one Fashion/Comparison/batch execution
    operationId      one billable output operation
      jobId           one queue generation job
      attemptId       one provider-dispatch attempt
      providerRequestId provider-owned request reference, when available
  estimateId
  reservationId
  ledgerEntryId
```

Other lineage IDs such as Template version/use session, Character version,
Reference Processing fingerprint and asset IDs remain domain references linked
to trace events.

### 3.2 ID semantics

- `correlationId` is the customer/support reference for one workflow and uses a
  stable opaque prefix such as `cor_`.
- `requestId` continues to identify one HTTP request and uses `req_`.
- Every stored trace event has its own `eventId`.
- The server validates incoming ID format and length. It generates a new value
  when the client does not provide a valid one.
- The browser may initiate a correlation ID for a user command, but the server
  is authoritative and returns the accepted value.
- Polling requests use new request IDs but preserve the workflow correlation
  ID.
- Queue and provider execution must preserve correlation independently of the
  originating HTTP request lifetime.
- Future OpenTelemetry/W3C `traceparent` may map to this context, but MVP must
  not expose a second competing customer support reference.

## 4. Propagation Contract

### 4.1 HTTP

Canonical headers:

```text
X-MPF-Request-ID
X-MPF-Correlation-ID
```

The server returns both headers on success and sanitized errors. JSON error
responses also expose:

```json
{
  "error": {
    "code": "stable_error_code",
    "message": "Customer-safe message",
    "correlationId": "cor_...",
    "requestId": "req_..."
  }
}
```

Never expose provider secrets, raw request bodies or private references in the
error response.

### 4.2 Async execution

The accepted trace context must be copied into:

- quote and plan snapshots;
- Fashion/Comparison run and operation records;
- queue job metadata;
- generation history/result lineage;
- credit estimate, reservation and ledger metadata;
- provider diagnostic result metadata;
- audit events for recovery actions.

An operation retry keeps the original correlation ID, creates a new attempt ID
and new request/job IDs where appropriate, and records `retryOfAttemptId`.

## 5. Trace Event Contract

```text
TraceEvent
- schemaVersion
- eventId
- occurredAt
- correlationId
- requestId?
- actorUserId
- actorRole?
- surface
- eventName
- severity: debug | info | warning | error
- status: started | accepted | completed | failed | compensated
- durationMs?
- ids
  - quoteId?
  - planId?
  - runId?
  - operationId?
  - jobId?
  - attemptId?
  - providerRequestId?
  - estimateId?
  - reservationId?
  - ledgerEntryId?
- route
  - providerId?
  - modelId?
  - policyVersion?
- error
  - code?
  - retryable?
  - sanitizedMessage?
- metadata
```

Event names are stable dotted identifiers, for example:

```text
fashion.quote.created
fashion.run.accepted
credit.reservation.created
generation.job.queued
generation.provider.dispatched
generation.provider.completed
generation.provider.failed
credit.reservation.captured
credit.reservation.refunded
support.recovery.approved
support.recovery.completed
```

`metadata` must use an allowlist per event family. It must not contain:

- raw prompts;
- Base64/image bytes;
- private image URLs or signed URLs;
- authorization headers, API keys or provider credentials;
- full request/response payloads;
- unredacted email, IP address or payment details.

## 6. Trace, Audit And Domain Data Boundaries

These records have different purposes and must not be conflated:

| Record | Purpose | Mutability/retention |
|---|---|---|
| Domain record | Current business state such as quote, run or reservation | Owned by its domain |
| Trace event | Technical chronology and diagnostic linkage | Append-only, operational retention |
| Audit event | Security/support proof of a material human/system action | Append-only, longer retention |

Trace events may link to an audit event ID, but trace storage is not the source
of truth for balance, ownership or authorization.

Credit recovery must call the existing Credit domain and write normal ledger
entries. Support must never edit trace JSON or credit balances directly.

## 7. Credit Recovery Contract

### 7.1 Support lookup

An authorized Support/Admin user can search by:

```text
correlationId
jobId
runId
operationId
reservationId
ledgerEntryId
providerRequestId
```

The result presents one ordered timeline plus:

- net reserved/captured/refunded credits;
- terminal and non-terminal operations;
- missing capture/refund anomalies;
- provider failure code and retryability;
- output availability;
- prior recovery actions.

Actor ownership and support role are revalidated on the server.

### 7.2 Recovery actions

Allowed actions use existing domains:

```text
Refund failed operation
Refund selected captured operation with approved reason
Retry generation with a new estimate/reservation
Grant manual support credit through CreditAdjustmentService
Mark investigation resolved without financial action
```

Rules:

- every recovery command requires a reason code and support actor;
- every command has a deterministic idempotency key;
- refund cannot exceed net captured credits for the target operation;
- a retry never silently reuses an expired estimate;
- retrying an operation does not erase the failed attempt;
- a manual credit grant is distinct from a refund;
- every material action writes both Credit ledger state and an Audit event;
- the API returns the same correlation ID and the IDs of resulting ledger/audit
  records.

## 8. Mandatory Observability Expert Review

Before implementation, a log-tracing/observability specialist must produce:

1. a sequence diagram from browser command through provider completion and
   credit capture/refund;
2. an ID propagation matrix for Studio, Playground, Comparison, Template use
   and Fashion;
3. a trace event allowlist and redaction review;
4. failure-mode analysis for enqueue failure, provider failure, lost job,
   server restart, partial Fashion run, stale estimate and duplicate command;
5. retention/cardinality guidance for local JSON and future Cloud Logging;
6. support recovery threat model and role matrix;
7. proof that correlation instrumentation does not become a source of business
   truth;
8. a migration map to OpenTelemetry/Cloud Trace without changing public support
   reference semantics.

The review must account for current provider adapters that already expose a
provider `requestId` and must normalize that value as `providerRequestId`
instead of confusing it with the platform HTTP request ID.

## 9. Architecture And File Ownership

### 9.1 Server

Planned canonical owners:

```text
server/middleware/correlationContextMiddleware.js
server/domain/observability/TraceContext.js
server/domain/observability/TraceEventService.js
server/repositories/observability/TraceEventRepository.js
server/data/observability/traceEvents.json
server/app/routes/supportTraceRoutes.js
```

Responsibilities:

- middleware creates/validates HTTP request and correlation context;
- domain service emits allowlisted sanitized events;
- repository stores append-only local events behind a replaceable contract;
- Support routes authorize lookup and delegate recovery to existing Credit,
  Generation and Audit domains.

Do not place tracing business logic in `server/server.js`, provider adapters or
route handlers. Provider adapters only return normalized provider request IDs.

### 9.2 React

Planned owners:

```text
web/src/lib/api/apiClient.ts
web/src/lib/telemetry/
web/src/features/admin/
```

- `apiClient` attaches request/correlation headers and reads accepted response
  IDs.
- A command-scoped helper creates one correlation context per customer intent.
- User-visible errors show the safe support reference.
- Admin/Support UI queries server summaries; it does not reconstruct financial
  state from browser telemetry.

### 9.3 Migration target

Local JSON is an MVP adapter only. Commercial deployment maps the same event
contract to structured Cloud Logging/OpenTelemetry with searchable indexed
fields. PostgreSQL remains the source for financial and business records.

## 10. Implementation Plan

1. Complete the observability expert review in section 8.
2. Freeze ID formats, trace event schema, allowlists and redaction tests.
3. Extract correlation creation from actor identity middleware into dedicated
   middleware while preserving `req.actorContext.requestId`.
4. Return accepted request/correlation headers and stable error fields from a
   shared route error translator.
5. Add the append-only trace repository/service and path configuration.
6. Instrument one vertical Fashion path:
   quote -> reserve -> run -> operation -> queue -> provider -> capture/refund.
7. Add provider attempt IDs and normalize provider request IDs.
8. Verify partial Fashion runs link every operation and ledger entry to the
   same correlation.
9. Extend instrumentation to Studio, Playground, Comparison and Template use.
10. Add role-gated Support trace lookup and timeline DTO.
11. Add recovery commands by delegating to existing CreditAdjustment,
    CreditReservation, Generation and Audit services.
12. Add React support-reference handling and Admin/Support timeline UI.
13. Validate restart, duplicate, partial failure, redaction and cross-actor
    denial before enabling recovery actions.

## 11. Acceptance Criteria

- One Fashion Generate action has one correlation ID across quote/run/jobs and
  every related credit record.
- Every HTTP request retains its own request ID.
- Provider request ID is stored separately and searchable.
- A support lookup reconstructs an ordered timeline without reading raw logs
  manually.
- A failed operation can be safely refunded once; duplicate recovery is
  idempotent.
- A retry creates a new attempt while preserving original failure evidence.
- Financial totals are calculated from Credit domain records, never trace
  events.
- Trace/audit payloads contain no raw prompts, images, secrets or private URLs.
- Unauthorized users cannot query traces or invoke recovery.
- Local contracts map cleanly to Cloud Logging/OpenTelemetry and production
  database IDs.

## 12. Validation

Required automated scenarios:

```text
valid and invalid incoming correlation IDs
request ID uniqueness within one correlation
quote/run/job/ledger propagation
multi-operation Fashion partial failure
enqueue failure refund linkage
provider request ID normalization
restart recovery continuity
duplicate refund/retry idempotency
cross-actor and non-support access denial
trace metadata redaction
audit + ledger records for every support recovery
```

Required operational drill:

```text
Start from one customer-visible correlation ID
-> find failed Fashion operation
-> verify quote and reservation
-> identify provider request/failure
-> issue one authorized refund
-> confirm ledger, audit and trace timeline
-> repeat command and prove no duplicate credit
```
