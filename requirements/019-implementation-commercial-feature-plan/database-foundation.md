# DB-FOUNDATION: Bounded PostgreSQL Infrastructure Prerequisite

**Owner:** Phase2-03 database infrastructure; Backend primary, Security/QA reviewers
**Status:** DB-F01/F02 implemented and independently reviewed; no application cutover
**Parent:** [Phase2-03](Phase2-03-database-architecture-and-json-migration.md)
**Consumer:** [AUTH-019](Phase2-04-authentication-sessions-and-authorization.md)

## Scope And Ownership

Deliver shared PostgreSQL configuration, bounded pool/transaction facade and
versioned migration execution. Existing JSON repositories remain unchanged.
No production connection, implicit startup migration, existing-data cutover,
domain table design or live service restart is included. Source imports must be
side-effect-free; application composition will opt in in a later Auth task.

Canonical placement: `server/config/database.js`, reusable adapters under
`server/repositories/postgres/`, tools under `scripts/database/`, focused runner
`scripts/verify-database-foundation.mjs`, contract tests under `test/` and explicit
PostgreSQL qualification in `scripts/database/qualify-postgres.mjs`. Keeping that
fixture-dependent check behind the runner preserves ordinary test discovery.
The shared adapter
owns connection/transaction mechanics, not Identity/Credits/Audit business rules.
Domain migrations will be provided by explicit owning registries; no scanning
arbitrary user paths or executing supplied SQL over HTTP.

## Ordered Tasks And Acceptance

DB-F01: implement configuration, pool and migration mechanics with isolated tests.
Validate explicit PostgreSQL connection config without logging credentials, do not
fall back to ambient pg credentials; pool size/timeouts are positive bounded
values. Remote production TLS must validate certificates; insecure TLS URL
parameters cannot override the explicit policy. Shutdown closes the pool.

Transactions acquire one client for BEGIN, work and COMMIT/ROLLBACK; release once
on every branch, destroy uncertain/failed clients, never retry non-idempotent
work automatically and preserve the original failure without logging its text.
Reject invalid isolation/options before acquisition. No nested implicit pool
transactions; caller passes transaction context through its owning contract.

Migration runner requires explicit target/execution mode; reads and mutations are
distinct. Under a PostgreSQL transaction advisory lock, create/check a bounded
version/checksum ledger, reject unknown/divergent/non-prefix histories and apply
ordered reviewed migrations atomically. Never automatically run down migrations
or accept changed applied checksums. No app imports or provider/background work.
Migration ledger and SQL live only in the explicitly supplied database.

DB-F02: independently qualify on an isolated local PostgreSQL database explicitly
marked disposable; prove rollback, concurrency, replay/checksum/unknown-version
rejection and locking with real connections. Block this group when prerequisites
are absent; never convert an unavailable DB into a successful skip. Disposable
qualification uses loopback, a dedicated test database-name prefix and an explicit
opt-in, not the application's `.env` or arbitrary remote connection strings.

## Bounded Audit Prerequisite For AUTH-T03C

Source inspection confirms existing AuditService.record writes through a JSON
repository and cannot share an Identity SQL transaction. AUTH-T03C therefore
has an explicit upstream task AUTH-T03D (after Identity persistence, before T03C)
to extend Audit through its own public service. This is required infrastructure,
not a migration of every existing Audit caller or Admin screen.

Own files: `server/domain/audit/AuditService.js`,
`server/repositories/audit/PostgresSecurityAuditRepository.js`,
`server/repositories/audit/securityAuditMigrations.js`, explicit shared migration
registry and isolated Authentication persistence tests. Preserve existing record
and JSON behavior for current callers; new Auth security events have one SQL
authority and are never dual-written to JSON. Inject the SQL security repository
explicitly; an absent adapter fails the new method closed.

Add public recordSecurityEvent with a caller-supplied same-client transaction
context, stable event ID, bounded action/outcome/request/target fingerprints and
an explicitly typed system-security or account actor. Never infer preauth user
identity from submitted email; system actor has no request authorization role.
Account actor references `identity_accounts(id)` through a foreign key. The
Identity migration API is `identityMigrations(schema = 'public')`; Audit declares
its own migration after `0001_identity_foundation`, in the same validated schema.
Only bounded allowlisted scalar metadata; reject passwords, codes, tokens,
raw emails/IP, prompts and arbitrary before/after snapshots. IP fingerprint is
computed with an injected dedicated key from authoritative peer metadata, not
untrusted forwarded headers. No production default salt or key.

Append-only table, stable-ID deduplication and payload-conflict rejection; same
transaction rolls back both Identity and Audit on error. Changes to existing
financial Audit events, backoffice read surfaces, production retention/cleanup
and role grants are out of scope. Fixture events are ephemeral; actual D05
retention/residency remains an activation prerequisite for real users.

Verify atomic rollback, exact duplicate/reused-ID conflict, preauth actor policy,
cross-actor references, invalid metadata/no secret-bearing errors and unchanged
legacy Audit behavior. Independent Security/QA must accept before AUTH-T03C.

Backend preparation review freezes these implementation details:

- Public signature: `recordSecurityEvent(event, { transaction, actor, peerAddress })`.
  The shared PostgreSQL helper must recognize its own currently live transaction
  handles, rejecting autocommit facades, forged query-shaped objects and expired
  handles. Add this narrow assertion to the shared helper and its contract tests;
  do not infer transaction provenance from method shape alone.
- Account actors record only their own account security events; explicit
  system-security preauth events use a target fingerprint, without claiming an
  account. Disabled accounts remain valid subjects of denial events. FK existence
  does not substitute for this actor/target policy.
- Exact replay compares normalized immutable event content, including the
  original occurrence/correlation values, and excludes generated `recorded_at`.
  Retries reuse original peer/target fingerprints rather than newly observed
  transport values. Insert-on-conflict never updates a committed event.
- SQL guards reject UPDATE, DELETE and TRUNCATE; restrictive foreign keys never
  cascade-delete events. These are application protections, not a claim that a
  database owner/superuser cannot alter schema; production-role grants remain gated.
- Metadata accepts only explicit enum/boolean/integer fields, bounded in total.
  No arbitrary free-text strings or nested values. Return only eventId/replayed;
  absent adapter/key/transaction rejects with a sanitized fixed error.

Read-only preparation review: Backend `/root/auth_implementation_foundation`.
This is contract advice, not implementation or independent Security/QA acceptance.

AUTH-T03D subsequently implemented and passed independent Security/QA review;
see [AUTH-012](authentication/012-implementation-evidence.md). Shared transaction
provenance now spans facade instances. Current regression counts:18 DB contracts,
11 Auth/legacy contracts,23 disposable PostgreSQL persistence,9 existing
Admin/Community tests. No real-data activation or legacy JSON migration.

## Checks And Handoff Commands

`node scripts/verify-database-foundation.mjs --group contracts` runs deterministic
injected-client/config tests. `--group postgres` requires a separately designated
disposable target. Explicit `--all` includes both and fails on missing prerequisites.
The tests/runner may neither auto-start Docker nor mutate existing runtime JSON.
Only the explicitly isolated test schema may be cleaned up after verification.

Use maintained `pg`; official references:
[transactions](https://node-postgres.com/features/transactions) and
[pool lifecycle](https://node-postgres.com/apis/pool). No framework/service
subscription or production database is selected by this prerequisite.

Initial source evidence: no pg dependency or DB pool/migration implementation;
Docker metadata inaccessible in initial sandbox, no PostgreSQL listener on
5432/5433 observed. These observations do not establish a disposable target.
Auth T03 additionally requires its own Auth contract prerequisites.

## Delivery Evidence

DB-F01/F02 passed: [raw aggregate output](database-foundation-evidence.txt) records
16 contract tests and 7 PostgreSQL tests (six nested assertions plus suite).
Used a newly created loopback-only memory-backed PostgreSQL 17 container, random
owned test schemas, no application `.env`, no existing runtime records. The
explicit runner includes required fail-fast target gates; ordinary test discovery
does not attempt PostgreSQL. Fixed review findings: 95-character migration ID
bound, C collation matching registry order and plain-record transaction options.

Independent QA `/root/auth_requirement_qa_review` ran 16/16 and 7/7 and reviewed
the final fixes/artifact. Independent Security `/root/auth_decision_security`
passed source/configuration and qualification boundaries, ran 16/16 plus exact
ID-boundary probes, and attributed PostgreSQL execution to Lead/QA. Neither
verdict qualifies deployed TLS, production migrations or Auth runtime behavior.
New shared owner is mapped in099. No domain tables/application startup wiring.
