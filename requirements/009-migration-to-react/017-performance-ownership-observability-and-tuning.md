# Performance Ownership, Observability and Tuning

**Status:** Active; initial baseline and runtime guardrails implemented  
**Scope:** React runtime, API transport, server workflows, queue, providers,
reference processing, media delivery, repositories and future database  
**Related:** `016-capability-ownership-and-single-workflow-entry-points.md`

## 1. Objective

Performance must be designed into capability contracts before the JSON-to-
database migration, then tuned with database and production evidence later.
ModelPromptForge must not defer every performance decision until PostgreSQL or
another database is introduced because payload shape, pagination, polling,
cache ownership and workflow fan-out are architectural concerns independent of
storage technology.

The required sequence is:

```text
Now
  Measure + guardrail + scalable contracts + obvious bottleneck removal

Before commercial release
  Validate critical workflows and fix budget violations

After database migration
  Tune queries, indexes, transactions, pools and distributed coordination

After representative traffic
  Profile and optimize using observed production evidence
```

Optimization must preserve correctness, ownership, security, Credit integrity,
reference fidelity and recoverability. Faster incorrect generation or stale
account state is a regression.

## 2. Principles

1. Measure before tuning.
2. Assign one owner to every cache, polling loop and performance metric.
3. Optimize complete user workflows, not isolated functions only.
4. Keep transport payloads bounded and avoid durable Base64 state.
5. Design repository contracts for pagination/filtering before database
   migration.
6. Use generated thumbnails/previews for discovery and original media for
   inspection/download.
7. Never cache actor-private data under a shared key.
8. Never trade Credit consistency, authorization or idempotency for speed.
9. Provider latency is measured separately from application and queue latency.
10. A performance optimization requires a baseline, expected improvement and
    regression validation.

## 3. Performance Ownership Map

| Concern | Owner | Canonical paths | Must not be duplicated in |
|---|---|---|---|
| Browser startup and route chunks | React application platform | `web/src/app/`, `web/vite.config.ts` | Individual routes with independent bundling rules |
| React render behavior | Owning feature plus shared component owner | `web/src/features/`, `web/src/components/` | Global mutable state or DOM scripts |
| Server-state caching | TanStack Query infrastructure and feature query-key owner | `web/src/lib/api/queryKeys.ts`, feature hooks | Ad hoc component caches |
| Browser persistence | Persistence infrastructure | `web/src/lib/persistence/` | Shared UI components and unscoped local storage |
| HTTP transport and correlation | API client/telemetry infrastructure | `web/src/lib/api/`, `web/src/lib/telemetry/`, server middleware | Feature-specific fetch wrappers |
| Request latency and workflow timing | Owning application service plus observability | `server/app/routes/`, `server/domain/<capability>/`, future `server/domain/observability/` | Provider adapters alone |
| Queue wait and execution lifecycle | Generation capability | `server/domain/generation/QueueManager.js`, `generationDiagnostics.js` | Fashion, Comparison or Template-specific queues |
| Provider latency and payload adaptation | Generation provider layer | `server/providers/` | React or product routes |
| Reference preprocessing | Reference Processing capability | `server/domain/reference-processing/` | Provider-specific duplicate preprocessing |
| Image previews and thumbnails | Assets/Media capability | `server/domain/assets/`, `server/domain/generation/thumbnailService.js`, `web/src/components/media/` | Individual gallery/profile cards |
| Repository I/O | Owning repository plus shared JSON store | `server/repositories/<capability>/`, `server/repositories/json/` | Routes and React code |
| Pricing/Credit transaction time | Credits capability | `server/domain/credits/`, `server/repositories/credits/` | Generation UI or provider adapters |
| Database query/index tuning | Owning repository and database platform | future repository adapters/migrations | Domain services with raw SQL |

## 4. Metrics and Timing Model

Every generation-like workflow should be measurable using one correlation tree:

```text
request_received_at
estimate_started_at / estimate_completed_at
reservation_started_at / reservation_completed_at
enqueue_at
queue_started_at
reference_processing_started_at / completed_at
provider_dispatch_at / provider_completed_at
output_persisted_at
credit_captured_at or credit_refunded_at
response/projected_status_at
```

Derived metrics:

- API duration
- estimate duration
- reservation duration
- queue wait duration
- reference processing duration
- provider duration
- output persistence/thumbnail duration
- total time to first visible result
- total time to terminal state
- polling request count per job/run
- payload size and reference count
- memory high-water mark for image operations
- failure/refund/retry count

Metrics and logs must use correlation/job/run IDs and sanitized bounded metadata.
They must not contain API keys, Base64 images, private reference URLs or raw
sensitive prompts.

## 5. Initial Performance Budgets

These are engineering budgets for local/controlled application work, excluding
third-party image-generation duration where stated. They are starting targets,
not contractual public SLAs.

### 5.1 React client

- No initial production JavaScript chunk should exceed 500 kB minified without
  an explicit split decision and evidence.
- Route-level features remain lazy loaded.
- Primary navigation and existing shell interactions should respond within
  100 ms after route code is available.
- User input should not trigger network requests on every keystroke unless
  debounced and required by the workflow.
- Lists use pagination/cursor/infinite query; no unbounded owner or Community
  history is loaded into one screen.
- Polling has one owner per resource, stops on terminal/unmounted/actor-switch
  state and applies a documented interval/backoff.
- Media cards use bounded previews; originals are fetched only for detail,
  fullscreen or download.

### 5.2 API and repositories

- Non-provider local read endpoints target P95 under 300 ms with representative
  MVP data on the development machine.
- Non-provider local mutations target P95 under 500 ms excluding intentional
  asynchronous processing.
- API list responses are bounded by explicit limits and return cursor/page
  metadata.
- Routes never read complete JSON datasets directly.
- Repositories avoid repeated full-file reads within one workflow where a
  coherent repository operation can perform the work once.
- Atomic writes and consistency remain mandatory even when they cost latency.

### 5.3 Generation and media

- Enqueue acknowledgment should complete within 500 ms excluding upload and
  locked-estimate preparation.
- Queue wait and provider duration are reported separately.
- Raw decoded image buffers and Base64 copies must have bounded lifetime.
- Normal logs never stringify image payloads.
- Thumbnail generation is cached/idempotent by source identity and processing
  policy version.
- Discovery previews should normally remain below 300 kB, subject to visual QA;
  original output quality is never reduced for download.

Budgets must be revised using repeatable measurements before commercial SLA
publication.

## 6. Work Required Now

### 6.1 Establish a repeatable baseline

- Record production build chunk sizes.
- Measure representative API reads and mutations with seeded MVP data.
- Measure standard generation, Comparison, Template preparation and Fashion run
  timing boundaries without comparing provider latency as application latency.
- Record queue wait, provider duration, output persistence and polling count.
- Capture baseline date, machine/runtime and dataset size.

Suggested artifact location:

```text
requirements/009-migration-to-react/inventory/performance-baseline/
  <date>-baseline.md
  <date>-route-chunks.json
  <date>-api-latency.json
```

Do not store private prompts or image payloads in baseline artifacts.

### 6.2 Client guardrails

- Keep route lazy imports and inspect Vite chunk warnings.
- Move large workflow state out of broad app-level context.
- Use memoization only after identifying rerender cost; do not wrap every
  component speculatively.
- Consolidate actor-scoped query keys through
  `web/src/lib/api/queryKeys.ts`.
- Deduplicate polling through one query/hook per resource type.
- Cancel or invalidate actor-owned work when actor changes.
- Classify every direct `localStorage` use as device preference or migrate it to
  actor-scoped persistence.
- Ensure gallery/profile/template/character grids use preview URLs and stable
  dimensions.

### 6.3 Server guardrails

- Keep route handlers thin and measure complete application-service duration.
- Preserve asynchronous provider work through the canonical Queue.
- Add bounded timing metadata to safe diagnostics.
- Avoid loading or cloning Base64 references more times than provider dispatch
  requires.
- Keep Reference Processing fingerprints and derivatives reusable where policy
  permits.
- Use repositories for all JSON reads/writes and expose bounded list contracts.
- Prevent one request from starting duplicate estimate, preparation or
  generation work through idempotency keys.

### 6.4 Media pipeline

- Keep one preview/thumbnail generation service.
- Include crop/attention algorithm and policy version in derivative identity.
- Do not generate a new thumbnail on every request.
- Use `object-fit: contain` for inspection surfaces and intentionally generated
  attention crops for discovery surfaces.
- Download always resolves the authorized original output.
- Track derivative generation failures separately from successful original
  generation.

### 6.5 Scalable contracts before database migration

Repository and API contracts introduced now must support:

```text
limit
cursor or page token
filter
sort
actor/owner scope
visibility scope
created-before/after where useful
stable IDs
version/idempotency fields for mutations
```

Domain services must not depend on JSON array ordering or file layout. This
allows repository adapters to move to SQL without changing business workflows.

## 7. Work Before Commercial Release

- Run a representative load check for account reads, Community discovery,
  history pagination, Credit estimate, generation submission and run polling.
- Verify no duplicate Credit reservation or Generation enqueue occurs under
  repeated clicks/retries.
- Verify actor switching cancels or isolates old queries and drafts.
- Verify Fashion bulk runs do not create an unbounded number of simultaneous
  browser polling loops.
- Verify Queue concurrency protects provider and application memory limits.
- Verify large reference inputs remain within request and process memory
  budgets.
- Verify failure paths refund Credits without holding slow global locks.
- Resolve material Vite chunk warnings through route/component code splitting.
- Document known capacity limits for the local JSON MVP runtime.

Commercial release may retain JSON storage only with explicit limits and a
support/recovery plan. It must not be represented as horizontally scalable.

## 8. Work After Database Migration

Perform only after real repository adapters and representative data exist:

- analyze query plans;
- add and tune indexes for actor, visibility, created time, status, template,
  Character, run and correlation lookup;
- configure connection pooling and timeouts;
- define transaction/isolation boundaries for Credits and idempotency;
- eliminate N+1 reads in public profile, Community and run projections;
- add retention/archival policies for jobs, traces and large histories;
- evaluate Redis/distributed cache only for measured shared-read or coordination
  needs;
- move Queue coordination to a durable worker system before horizontal API
  scaling;
- run load and recovery tests against the production-like topology.

Domain code must not embed raw SQL to gain speed. Query/index ownership belongs
to repositories and database migrations.

## 9. Work After Representative Traffic

- Rank optimization work using P95/P99 latency, error rate, queue wait, memory
  and cost evidence.
- Inspect slow traces by workflow and provider/model.
- Compare cache hit ratio against invalidation complexity.
- Tune polling/backoff using observed job duration distributions.
- Identify high-cost media and reference transformations.
- Adjust concurrency per provider and model using rate/error evidence.
- Revisit budgets and publish SLA/SLO only after measurement is stable.

Do not optimize primarily from anecdotal single requests when trace aggregates
are available.

## 10. Cache and Polling Rules

Every cache or polling loop must document:

```text
owner
key shape
actor/public scope
source of truth
TTL or terminal condition
invalidation events
maximum retained entries
failure behavior
metric used to justify it
```

Forbidden patterns:

- global cache entries containing private actor data without actor ID;
- caching Credit balance across a mutation without invalidation;
- independent polling loops for the same job in parent and child components;
- indefinite polling after terminal, unauthorized, missing or unmounted state;
- provider capability/pricing copies cached in client source code;
- caching full Base64 images in local storage or TanStack Query persistence.

## 11. Performance Review Gate

Before approving a material change, answer:

1. What user workflow and capability owns the performance concern?
2. What is the current measured baseline?
3. What budget or observed problem justifies the change?
4. Does the change introduce cache, polling, concurrency or retained image
   memory?
5. Is actor isolation and invalidation explicit?
6. Does it preserve idempotency, Credit consistency and authorization?
7. Does the API/repository remain bounded and database-migration ready?
8. Which test or measurement demonstrates improvement without regression?

If no baseline is available, add instrumentation or a reproducible benchmark
before a speculative optimization.

## 12. Validation

Minimum automated/static validation as applicable:

```text
npm run build:web
npm run typecheck:web
npm run lint:web
focused server/domain tests
focused React component tests
git diff --check
```

Manual validation:

- desktop and mobile route loading;
- image-heavy Community/Profile/History rendering;
- actor switching during active queries;
- normal and Comparison generation polling;
- Fashion proof and bulk run behavior;
- offline/slow/error states;
- original download versus preview delivery;
- memory observation during repeated large-reference generation.

Record the command, environment, dataset size, duration and result. A single
unrecorded DevTools impression is not a performance baseline.

## 13. Acceptance Criteria

- Performance ownership is documented for client, server, queue, media and
  persistence concerns.
- Critical workflows expose correlation-safe timing boundaries.
- Initial performance budgets and a repeatable baseline process exist.
- Lists, polling and payloads are bounded before database migration.
- No feature creates an independent provider, Queue, Credit, thumbnail or
  reference cache path.
- Database-specific optimization remains in repositories/migrations and is
  deferred until the database exists.
- Commercial validation includes load, retry, actor-isolation and memory checks.
- Future agents apply the performance review gate before introducing caching,
  polling, concurrency or speculative optimization.

## 14. Implementation Checkpoint - 2026-08-04

Implemented now:

- bounded, sanitized API timing through `PerformanceTelemetry` and request
  middleware;
- safe Generation timing boundaries for queue wait, Reference Processing,
  provider execution, output persistence and total duration;
- centralized client polling policy and actor-aware query-key factories;
- repository point lookup for Generation history reconciliation instead of an
  avoidable full-history scan;
- explicit Vite vendor chunks that keep each initial JavaScript chunk below the
  500 kB minified budget;
- repeatable `npm run performance:bundle-budget` measurement and baseline
  artifacts under `inventory/performance-baseline/`.

Production-like API P95, browser memory, load/retry and post-database query
measurements remain required by Sections 7-9 and are intentionally not inferred
from this local build baseline.
