# 001 - API, Jobs, Assets And Security

**ID:** 021-PPS-001
**Status:** Local API-first subset implemented; durable async Job and private delivery contract still planned
**Owner:** Post-Processing API/worker; Core Assets and Cinematic retain their public facades
**Source sections:** 1-9, 20, 25-29, 35-40, 45-46, 55

## Outcome And Scope

Expose one independent internal API with capability discovery, bounded async
processing jobs and private media transfer. Its first registered operations
are image.face_landmarks and image.faceless_previs. Future operations reuse
the same transport/job contract, not a parallel service per media type.
Do not build the proposed full PostgreSQL/PubSub/GPU/cloud topology in P0.

## Public Boundary

The API-first pilot currently provides authenticated loopback GET
/v1/capabilities and synchronous POST /v1/faceless-previs. Core validates
Project/Shot ownership, verifies immutable source bytes/hash, and pushes raw
binary directly; the service accepts no arbitrary URL or path. This is an
explicit temporary alternative to a media grant, not a second media owner.
The async endpoints below remain required before full P0 closure.

- Core authenticates the actor, authorizes the source Asset and binds
  Project/Scene/Shot before calling the service. Browser calls Core only.
- Service-to-service authentication is mandatory from P0; use a scoped,
  expiring credential. Reject missing/invalid credentials and arbitrary
  public URLs, file paths, cross-owner Asset claims and oversized payloads.
- GET /api/v1/capabilities reports **actually executable** operations,
  versions, image limits and reasons for unavailable capabilities. A model
  registration alone is not availability.
- POST /api/v1/jobs accepts operation, source Asset/version/hash via Core's
  private media grant, validated options, idempotency key and trace ID;
  returns a job ID and accepted status without holding an HTTP request for
  inference. GET /api/v1/jobs/{id} returns a normalized state and safe
  result/error. Cancel/retry exist only with defined terminal semantics;
  they never submit a paid Generation action.
- States: created, queued, preprocessing, processing, postprocessing,
  uploading, completed; failed, cancelled and expired are terminal.
  Progress is measured stage evidence, not fabricated percentage.
- Retry of the same accepted command returns the same job/result. A new
  intentional revision uses a new idempotency key. Terminal jobs have a
  finite retention/cutoff; interrupted work never polls forever.

## Media And Data Contract

- P0 uses a private, short-lived Core media grant or equivalent signed
  storage URL. Service cannot read Core JSON repositories or arbitrary
  filesystem paths. A future object-storage adapter can replace transport
  without changing the job envelope.
- Validate image MIME/signature, pixel count, dimensions, file size, source
  checksum and allowed operation before decoding. P0 configurable guard
  defaults: one image, at most 16 megapixels, 25 MiB and eight detected faces;
  a job exceeds its 30-second processing deadline with a terminal error.
  Benchmark before raising any bound.
- Service temporary copies are deleted after completion/failure; Core
  registers output as a new immutable private Asset and controls its durable
  lifecycle. Service response supplies checksum, dimensions, MIME, model
  provenance and its parent input fingerprint. Core verifies downloaded bytes
  before registration. No embedded Base64 in Project JSON or job logs.
- Processing job storage may be a small dedicated repository in P0, but
  must survive process restart, be bounded by owner/TTL and have atomic
  idempotency. Full relational persistence is a later platform cutover, not
  a second source of truth in the same phase.
- A callback/webhook is optional after signed delivery and replay protection
  are qualified; bounded Core polling is the P0 integration. The browser
  uses Core's actor-scoped status contract, not direct service polling.

## Security, Privacy And Errors

Private media grants are short-lived, audience/operation/source scoped and
never logged. Reject SSRF, path traversal, MIME spoofing, oversized/zip-bomb
inputs, token replay after expiry, and cross-workspace result retrieval.
Health/capability endpoints reveal no tenant media. Secrets remain server-side.
Future voice media receives stronger consent and isolation under 006.

Stable errors distinguish unavailable service, unsupported operation,
invalid/private source, corrupt media, image too large, timeout, model not
qualified and processing failure. Return only sanitized messages to Core.
Core maps them to localized UI and keeps the original action usable.

## Acceptance And Checks

- Duplicate submission/restart cannot create duplicate user-visible Assets,
  paid work or endless pending status.
- Owner A cannot obtain Owner B's input, output or job status by changing IDs.
- Corrupt/oversized input and service outage return terminal or bounded
  actionable outcomes; the original remains intact.
- Private media hashes and stored output lineage match; no raw media/token is
  present in logs, Project records or public URLs.
- Focused isolated API tests cover auth, grants, validation, idempotency,
  retry/cutoff, cancellation, output checksum and owner isolation.

See [P0 plan](implementation-plan/001-faceless-previs-first.md) and
[platform plan](implementation-plan/002-platform-readiness.md).
