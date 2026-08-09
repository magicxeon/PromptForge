---
name: implement-generation-workflow
description: Implement or review ModelPromptForge changes that cross multiple Generation lifecycle stages or alter Credit settlement, idempotency, Queue acceptance, provider dispatch, polling/terminal state, reference-count parity, Comparison ownership, or multi-output groups. Do not use for isolated CSS, copy, localization, icon, prompt-wording, or presentation-only changes with unchanged workflow contracts, and do not use for Fashion-only work.
---

# Implement Generation Workflow

## Start With The Trigger Gate

Use this Skill only when the task changes at least two stages below, or changes
one starred invariant:

```text
input -> prompt/reference plan -> estimate* -> reserve* -> enqueue/idempotency*
-> provider dispatch* -> poll/terminal* -> settle/refund* -> History/result
```

If inspection shows a presentation-only change with the same normalized props,
leave this Skill and follow the owning feature Requirement.

## Read Only What The Change Needs

Always read:

1. `AGENTS.md`;
2. the Requirement owning the requested behavior;
3. `requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`;
4. current domain/API/client contracts and nearest tests.

Conditionally read:

- Requirement 017 for polling, cache, concurrency, payload or performance work;
- Requirement 018 for output count, Generation Groups or result grids;
- `requirements/011-reference-processing-pipeline/` only when reference
  authority, ordering, preprocessing or dispatched count changes;
- current Comparison contracts only when Comparison behavior changes; and
- Credits domain/tests only when estimate or ledger behavior changes.

Do not load Fashion Requirements for normal Studio/Scene/Playground work.

## Trace Before Editing

Write a short private trace of the current path:

```text
React control/mutation
-> apiClient
-> generation route
-> Generation domain entry point
-> Credits / Reference Processing / Queue public contract
-> provider adapter
-> status DTO/query
-> History/result projection
```

Search for an existing entry point before creating a route, service, hook,
poller, status list or result coordinator. Extend the canonical owner.

## Preserve These Invariants

1. Estimate and submission match provider, model, dimensions, resolution,
   effective references, mode and output count.
2. Credit reservation succeeds before Queue visibility or provider dispatch.
3. Idempotency covers retries; capture/refund cannot run twice.
4. UI never calls providers, Queue repositories or Credit repositories.
5. One owner polls each accepted Job/Group; terminal state always stops polling
   and animation.
6. Failure before acceptance creates no active Queue row.
7. Partial success retains successful results and settles each operation once.
8. Actor identity comes from `req.actorContext`; queries and drafts are
   actor-scoped.
9. Lineage stores stable IDs/fingerprints, not browser Base64 or private URLs.
10. Shared result components receive normalized items and callbacks; they do
    not coordinate business workflows.

## Implement In Dependency Order

1. Update owning Requirement and typed/Zod contracts.
2. Implement pure domain rules and repository behavior.
3. Update HTTP translation and stable errors.
4. Update client API/query/mutation ownership.
5. Update shared presentation and feature adapters.
6. Add tests from domain outward.

Do not duplicate behavior temporarily unless the Requirement names the
compatibility path, parity test and deletion checkpoint.

## Validate By Blast Radius

Run or ask the user to run only relevant layers:

- domain tests for estimate, idempotency, settlement and aggregation;
- route/schema tests for validation, actor ownership and stable errors;
- React tests for status, disabled action, partial result and terminal spinner;
- one normal end-to-end path for Studio/Scene/Playground consumers touched;
- Comparison regression only when mode ownership changed;
- desktop/mobile visual checks only when result composition changed.

Always perform JSON parsing and `git diff --check`. Do not broaden validation to
Fashion when Fashion is outside scope.

## Handoff

Report the touched stages, canonical entry point, Credit/Queue/actor impact,
tests performed, commands still required and residual failure/restart risk.

