# Generation Workflow Skill And Trigger Policy

**Requirement ID:** REACT-ARCH-019  
**Status:** Skill implemented; validate through first real use  
**Owner:** Generation capability and engineering workflow  
**Artifact:** `skills/implement-generation-workflow/SKILL.md`

## 1. Purpose

Generation changes increasingly cross prompt/reference planning, Credit,
idempotency, Queue, provider dispatch, polling, terminal state, History and
result presentation. Missing one boundary can leave a spinner active, charge an
incorrect amount, duplicate a Job or display a result that cannot be traced.

A focused Skill is required to preserve these invariants without loading a
large architecture checklist for every small UI or copy edit.

## 2. Trigger Policy

Use `implement-generation-workflow` when a task:

- changes two or more Generation lifecycle stages;
- changes Credit estimate/reservation/capture/refund behavior;
- changes idempotency, group/child Job creation or Queue acceptance;
- changes provider dispatch or provider-independent request normalization;
- changes polling, terminal-state aggregation or restart recovery;
- changes reference planning/count in a way that affects dispatch or Credits;
- changes normal/Comparison mode ownership; or
- implements multi-output Generation Requirement 018.

Do not load the Skill for an isolated:

- CSS/layout/token adjustment;
- text or localization correction;
- icon or tooltip change;
- presentational component refactor with an unchanged normalized contract;
- prompt wording/Scene Recipe change that does not alter lifecycle state;
- test-name or fixture-only update; or
- Fashion-only workflow change.

If initial inspection proves the task is presentation-only, stop using the
Skill and follow the owning feature Requirement instead.

## 3. Context Budget

The Skill body must remain concise and link to canonical Requirements rather
than copying schemas or architecture inventories.

Required reading is conditional:

| Concern | Read |
|---|---|
| Every triggered task | `AGENTS.md`, owning Requirement, Requirement 016 |
| Polling/cache/concurrency/payload | Requirement 017 |
| Multi-output/group result | Requirement 018 |
| Reference authority/count/order | RPP-001/RPP-002 |
| Comparison | Comparison owning Requirement/current domain contract |
| Credit mutation | Current Credits domain and tests |

Do not read every linked Requirement by default. Search and inspect only the
contracts touched by the task.

## 4. Required Skill Behavior

The Skill must make an implementation agent:

1. name Generation as workflow owner and identify every touched stage;
2. trace the current canonical path before adding a service/hook/route;
3. keep estimate and submitted parameters identical;
4. preserve reservation-before-enqueue and idempotent settlement;
5. use one authoritative polling owner and shared terminal status policy;
6. keep provider adapters behind Generation;
7. keep shared result components presentation-only;
8. protect actor isolation, lineage and bounded payloads;
9. scale validation to the touched stages; and
10. report remaining risk without claiming unrelated parity.

## 5. Minimal Artifact Set

The Skill consists only of:

```text
skills/implement-generation-workflow/
  SKILL.md
  agents/openai.yaml
```

Do not add scripts, copied schemas, checklists or examples until repeated real
use demonstrates that they save more context or mistakes than they cost.

## 6. Acceptance Criteria

- Skill metadata clearly triggers on cross-layer Generation work.
- Metadata does not trigger on ordinary styling or content changes.
- The body remains below 150 lines.
- Conditional reading prevents loading unrelated Credit, Reference,
  Comparison, Fashion and performance documents.
- The Skill points to Requirements 016-018 rather than duplicating them.
- Fashion Blueprint remains outside scope unless a later Requirement explicitly
  adopts the Skill.
- The first qualifying implementation records whether the trigger and checklist
  were useful; revise only from observed overhead or omissions.

