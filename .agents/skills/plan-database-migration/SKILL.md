---
name: plan-database-migration
description: Assess ModelPromptForge relational schema readiness and plan safe JSON-to-database migrations, capability cutovers, backfills, reconciliation, rollback, and production data ownership. Use for PostgreSQL or Cloud SQL schema design, repository-adapter migration, transactional data cutover, or database readiness review. Do not use for a small JSON fixture edit, ordinary repository bug, or UI-only work with unchanged persistence.
---

# Plan Database Migration

## Workflow

1. Name each capability owner, canonical application entry point, current
   repository contract and physical data source.
2. Inventory identifiers, relationships, lifecycle states, append-only records,
   mutable projections, file/media references and sensitive fields.
3. Grade schema readiness as `ready`, `partial` or `not_ready`; record the
   missing invariant or contract behind every non-ready grade.
4. Design normalized tables around capability boundaries. Preserve existing
   public opaque IDs during migration and use JSON only for bounded snapshots or
   provider metadata that is not queried relationally.
5. Define keys, foreign keys, uniqueness, optimistic versions, checks, indexes,
   retention and transaction boundaries before writing migration code.
6. Sequence cutovers by dependency and risk: identity and audit foundations,
   financial integrity, durable jobs/media lineage, product aggregates, then
   discovery/history projections.
7. For each capability, specify inventory, backup, deterministic transform,
   dry-run, count/hash reconciliation, maintenance or bounded capture window,
   adapter switch, observation and legacy retirement.
8. Avoid indefinite dual writes. If a temporary bridge is unavoidable, name its
   owner, parity check, maximum duration and deletion gate.
9. Define rollback separately before and after the first authoritative database
   write. Financial append-only records require forward correction after
   cutover, not restoration from stale JSON.
10. Hand QA executable fixtures for duplicates, missing parents, replay,
    interruption, actor isolation, balance reconciliation and rollback gates.

## Required Output

```text
Capability and repository inventory
Schema-readiness matrix
Target relational model and constraints
Dependency-ordered migration waves
Per-wave cutover, reconciliation and rollback runbook
Performance and retention budgets
Acceptance evidence and unresolved decisions
```

## Guardrails

- Do not migrate every JSON file in one release.
- Do not make routes or UI aware of the storage adapter.
- Do not use dual writes as a permanent architecture.
- Do not infer money, ownership or lifecycle state from filenames.
- Do not migrate generated media bytes into PostgreSQL; store durable object
  references and verified metadata.
- Do not declare a schema ready while authoritative IDs, state transitions,
  idempotency or reconciliation rules remain undefined.
