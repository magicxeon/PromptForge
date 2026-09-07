# Deferred Features And Follow-Up Register

Updated: 2026-09-07. Owner: Product requirement coordination.
Primary: Product And Requirement Architect; Backend review applied sequentially
for the foundation assessment. Skill: plan-database-migration. This change is
documentation only, not permission to implement any deferred feature.

## Current Direction

Prioritize the MVP platform foundation discussion: real accounts and database
adapters under [commercial execution plan](../019-implementation-commercial-feature-plan/Phase2-20-current-state-reconciliation-and-execution-plan.md).
Do not keep pulling presentation refinements into that implementation scope.

This folder owns deferred-item status and reopening conditions. Original domain
requirements still own design, contracts and acceptance criteria. Their older
pending tables are historical context; update status here to avoid parallel lists.

## Categories

| File | Scope |
|---|---|
| [001 Characters And Library](001-characters-and-library.md) | Off-center derivatives, favorites/storage, Character social |
| [002 Templates And Discovery](002-templates-and-discovery.md) | Detail UAT, rankings, version/count/lineage enhancements, public summaries |
| [003 Community And Editorial](003-community-and-editorial.md) | Tutorials, Comparison tools, shell, SEO, creator economy |
| [004 Quality And Assets](004-quality-and-assets.md) | Remaining media failure tests, provider artwork and rights |
| [005 Video And Continuity](005-video-and-continuity.md) | BytePlus external dependency and storyboard prop continuity |

## User-Accepted Work

| ID | Behavior | Evidence / scope |
|---|---|---|
| CLOSED-01 | Character previews with real data | User reports PASS in this conversation, 2026-09-07. Do not reopen as an unresolved visual bug without new evidence. |
| CLOSED-02 | Template -> Scene Builder complete flow | User reports PASS in this conversation, 2026-09-07. Accepted flow; not a claim that every security/failure variant was independently tested. |

Featured Template below the new header is intentionally hidden, not a pending
bug. Its reusable implementation is retained. Landing and Character styling
stay at the accepted baseline until another explicit design request.

## Status Rules

- deferred: do not implement until explicitly reprioritized.
- awaiting_confirmation: implementation exists; a stated evidence check remains.
- external_wait: requires an external response before changes or paid tests.
- release_gate: not a blocker to starting local foundation work, but must be
  resolved or mitigated before the affected production exposure.
- user_accepted: user-confirmed behavior, not a blanket automated QA claim.

Every reopened item gets an owning requirement, a small implementation plan,
focused tests and explicit protected behaviors. Keep aggregate tests opt-in.
Security, authorization, privacy, financial integrity and migration reconciliation
are foundation/release requirements, not optional UI polish to defer here.

## Database And Login Discussion Boundary

Ready to start foundation planning and a local development vertical slice;
not ready for whole-system migration or public production launch. Sources:
[database waves](../019-implementation-commercial-feature-plan/Phase2-03-database-architecture-and-json-migration.md),
[authentication](../019-implementation-commercial-feature-plan/Phase2-04-authentication-sessions-and-authorization.md).

2026-09-07 spot-check: createApp uses mock actor middleware; MockUserRepository
uses JSON; CreditAccountRepository uses JSON transactions; QueueManager holds
jobs in a process Map. No PostgreSQL adapter/migration framework was found in
the inspected server/package/script paths. The provider-specific GCS handoff
adapter exists; it is not evidence that all application Assets are migrated.
This is not a completed Wave 0 count/hash/orphan/readiness audit.

Recommended next discussion milestone: reconcile current contracts and data
inventory, then DB migrations/pool/transactions + real users/sessions + one
owner-scoped persistent record. Preserve existing opaque user/source IDs and
define mock-account claiming before importing ownership. Production must not
accept caller-supplied mock identity headers as authentication. No production
DDL, cloud resource, account migration or runtime changes are authorized here.
