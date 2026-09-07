# Phase 2-01 Commercial Readiness and Google Cloud Alignment

**Status:** Source crosswalk updated 2026-09-07; measured migration inventory and deployment proof pending
**Target:** Convert the current local JSON/mock platform into a production-ready
commercial foundation without rewriting established domain behavior.

## 1. Business Requirement

ModelPromptForge must be able to accept paying users without losing ownership,
credits, jobs or private image assets when a process restarts or an external
provider retries a request.

The first paid MVP serves Thai small fashion merchants. It sells one-time credit
packs and predictable image workflows. Subscription, automatic Simple-mode
routing, marketplace payouts and multi-region operation are not launch blockers.

## 2. Source-of-Truth Order

When requirements disagree, apply this order:

1. Current repository and `AGENTS.md` determine runtime, module ownership and
   canonical file placement.
2. `requirements/000-business-overview/` determines customer, pricing, credit,
   margin and go-to-market policy.
3. `requirements/Concept/infrastructure-gcloud.md` version 2.0 determines the
   production deployment target and operational baseline.
4. This commercial plan determines implementation order and acceptance gates.
5. Older concept examples are informative only.

Explicit conflict decisions:

- The DigitalOcean/Supabase/R2 topology in
  `requirements/000-business-overview/04-mvp-infrastructure-costs.md` remains a
  historical cost comparison. The selected deployment target is Google Cloud.
- React/Vite under `web/` is the current and only browser runtime. Firebase
  Hosting targets that production build; do not revive the legacy Vanilla
  client or build a commercial-only frontend.
- Existing mock actor and JSON repositories are migration inputs, not production
  identity or persistence.
- The current central pricing, credit, generation and provider contracts are
  preserved and receive production adapters. Commercial modules must not fork
  them.

## 3. MVP Production Topology

```text
Browser
  -> Firebase Hosting (static SPA)
  -> Cloud Run API
       -> Cloud SQL PostgreSQL
       -> Cloud Tasks
       -> signed Cloud Storage upload/download
  -> Cloud Run Worker
       -> external AI provider
       -> Cloud Storage
       -> Cloud SQL
```

Required Google Cloud services:

- Firebase Hosting
- Cloud Run API and separate Cloud Run Worker
- Cloud Tasks queue `generation-standard`
- Cloud SQL for PostgreSQL, zonal for pilot
- Private Cloud Storage asset bucket
- Artifact Registry
- Secret Manager
- Cloud Logging, Monitoring and Error Reporting
- Terraform with a private remote state bucket

Not required for the first paid MVP:

- GKE, Redis/Memorystore or active-active multi-region
- Cloud SQL HA before the business continuity trigger is reached
- Pub/Sub without a real fan-out event use case
- external load balancer, Cloud Armor, Cloud NAT or separate Cloud CDN
- automatic Simple-mode provider routing

## 4. Current-to-Target Migration Map

| Current capability | Current owner | Production target | Owning phase |
|---|---|---|---|
| React browser client | `web/` | Firebase Hosting artifact | Phase2-01, Phase2-17 |
| Express composition | `server/app/createApp.js` | Cloud Run API | Phase2-01, Phase2-17 |
| Process bootstrap | `server/server.js` | API container entry point | Phase2-01, Phase2-17 |
| JSON repositories | `server/repositories/` | PostgreSQL adapters | Phase2-03 |
| Runtime JSON | `server/data/` | migration source/read-only archive | Phase2-03 |
| Mock actor | `server/middleware/actorContextMiddleware.js`, mock-user repository | authenticated actor adapter | Phase2-04 |
| Local outputs/references and provider GCS handoff | Assets and GoogleCloudProviderAssetStorage | general private asset storage with retained original checksums | Phase2-06 |
| Local JSON Credit ledger | credit domain/repositories | transactional PostgreSQL ledger | Phase2-07 |
| In-memory/local queue | generation domain/repositories | Cloud Tasks + durable job tables | Phase2-10 |
| Billable generation provider calls | `server/providers/` through Generation | durable Worker dispatch behind the same facade | Phase2-10 |
| Community and Cinematic data | separate owning repositories | owner-scoped PostgreSQL; generic commercial Project is a separate new aggregate | Phase2-03, Phase2-05 |

## 5. Stable Contracts

The following existing entry points must remain stable while adapters change:

```text
ActorContext
Repository contracts
ReferenceAssetService and owning Asset repositories
CreditApplicationService and owning pricing services
GenerationApplicationService / QueueManager / VideoProviderTaskService
ProviderRegistry / ProviderAdapter
AuditService
SupportCaseService
ProviderControlApplicationService / ProviderAvailabilityPolicyService
```

Support recovery extensions follow `requirements/018-implementation-backend/`
and reuse `SupportCaseService`; planned orchestration names are not permission
to introduce parallel Generation, Credit or Support workflows. See Phase2-21
for exact source paths. Missing Auth/Project/Payment contracts are new work.

Conceptual execution envelope (not a replacement for `req.actorContext`):

```json
{
  "actorUserId": "opaque-user-id",
  "tenantId": "opaque-tenant-id-or-null",
  "requestId": "opaque-request-id",
  "idempotencyKey": "client-or-server-key",
  "locale": "th",
  "now": "UTC timestamp"
}
```

The target browser never supplies an authoritative owner, price, credit balance
or job state. Currently mock headers can select identity, including when
`NODE_ENV=production`; Phase2-04 must close this gap. Preserve server-resolved
`req.actorContext.userId` and current actor fields. Tenant membership is future
policy, not a new required client parameter.

## 6. Commercial Invariants

- Price estimates and accepted quotes are versioned and immutable.
- The server recalculates or verifies every billable request.
- Credit lifecycle is `estimate -> reserve -> capture` or `release/refund`.
- Reserve credit and create a durable job in one database transaction.
- Payment callbacks, generation submissions and worker attempts are idempotent.
- Assets are addressed by `assetId`/object key, never durable Base64 payloads.
- All private asset reads and signed URLs require ownership authorization.
- Queue payloads contain IDs and routing metadata only.
- Workers read authoritative job details from PostgreSQL.
- User-facing errors use stable codes and never expose secrets/provider payloads.

## 7. Implementation Work Packages

### WP-01 Repository and Contract Audit

Inputs:

- `requirements/099-technical-dept/000-master.md`
- current client/server modules, repositories, runtime JSON and tests
- infrastructure work package WP-01

Process:

1. Inventory repository contracts and runtime data schemas.
2. Identify direct JSON/path/provider/credit dependencies.
3. Record contract gaps and required ADRs.
4. Mark every commercial requirement as `reuse`, `adapt`, `migrate` or
   `deferred`.

Outputs:

- architecture delta report
- JSON source inventory and schema versions
- environment-variable inventory
- ADR list for unresolved decisions

### WP-02 Production Adapter Boundaries

Add interfaces only where no stable boundary exists. Keep canonical placement:

```text
server/domain/<capability>/
server/repositories/<capability>/
server/app/routes/
server/config/
server/providers/
```

Do not create a parallel `server/core/` tree. Do not move the whole application
before one vertical production path is proven.

### WP-03 Environment and Deployment Contract

Define and review configuration for the target below. These are proposed names,
not a claim that setting them enables an adapter today; reconcile against actual
configuration readers before adding environment variables:

```text
APP_ENV
PORT
PUBLIC_APP_ORIGIN
DATABASE_URL
GCP_PROJECT_ID
GCP_REGION
GCS_ASSET_BUCKET
GCP_TASKS_QUEUE
GCP_TASKS_LOCATION
WORKER_BASE_URL
TASK_CALLER_SERVICE_ACCOUNT
SESSION_SECRET
PAYMENT_WEBHOOK_SECRET
provider secrets
```

Secrets belong in Secret Manager. Public frontend configuration must contain no
secret.

### WP-04 Vertical Production Proof

First prove DB + session -> authenticated actor -> one owner-scoped record with
Audit, without calling a provider or accepting payment (Phase2-20 Step 1).
Then prove one end-to-end generation before broad migration:

```text
authenticated request
-> server quote verification
-> PostgreSQL credit reservation + job + outbox
-> Cloud Task
-> authenticated Worker
-> provider
-> private Cloud Storage result
-> job completion + credit capture
-> authorized status/result read
```

Only after this path passes should additional community/fashion entities migrate.

## 8. Impact and Compatibility

- Local development keeps JSON/local adapters until the PostgreSQL path is ready.
- Adapter selection is environment-driven; production must fail closed if a mock
  adapter is configured.
- Existing opaque public IDs must be preserved through migration maps; authorization
  uses actor ownership, never ID secrecy.
- Existing browser routes must continue to deep-link after Firebase Hosting SPA
  rewrites are enabled.
- Current polling can remain for MVP; WebSocket/SSE is not required.

## 9. Validation

Required automated coverage:

- repository contract tests run against JSON and PostgreSQL adapters
- ownership and cross-user denial
- duplicate request/task/payment idempotency
- credit reserve/capture/release reconciliation
- job restart/retry without duplicate provider call
- private asset signed URL authorization and expiry
- migration count, checksum, orphan and balance reconciliation
- configuration fails closed in production

Required operational verification:

- deploy fresh staging from Terraform
- restore Cloud SQL backup
- process a task after API/Worker restart
- trace one request from API through Worker and provider
- confirm budget, queue-delay, provider-error and ledger-mismatch alerts

## 10. Exit Criteria

- Retain the selected GCP target; obtain region, retention, budget and paid
  provisioning approval before cloud deployment. These do not block a local
  no-cost DB/Auth adapter proof.
- No production write depends on local JSON or persistent container filesystem.
- One vertical generation path passes staging failure/retry tests.
- Source-of-truth conflicts have ADRs or explicit decisions.
- Phase2-03 through Phase2-10 can proceed without creating parallel domain
  implementations.
