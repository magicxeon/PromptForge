# Operational Adoption And Release Validation

**Requirement ID:** AGENT-ORCH-007  
**Status:** Implemented; independent blind-QA exercise pending  
**Owner:** QA and engineering governance  
**Validated:** 2026-08-15

## 1. Purpose

Structural role and Skill discovery does not prove that orchestration works on
real repository tasks. This requirement makes adoption evidence machine
readable, verifies that it still points to current outputs and separates
sequential specialist review from a truly independent QA review.

## 2. Evidence Contract

`adoption-evidence.json` is the canonical operational record. Each real task
must contain:

- one stable task ID and request summary;
- one primary role and no more than two reviewer roles;
- no more than two triggered Skills;
- owning requirement and capability;
- routing reason and optional Product Owner override;
- concrete output paths and a concise handoff; and
- a status that describes the produced artifact rather than claiming runtime
  implementation.

The record must also identify one mandatory high-risk review, one low-overhead
negative case, one Product Owner override case and the available review
execution mode.

## 3. Implemented Adoption Set

The first adoption set covers three distinct domains:

1. Cinematic Studio MVP requirements: Product primary with Cinematic and UX
   review.
2. Admin and Support MVP requirements: Backend primary with mandatory
   Commercial and QA review.
3. Commercial database migration reconciliation: Backend primary with Database
   Migration and Commercial Integrity procedures.

These are requirement-authoring tasks only. Their product implementations
remain pending in their owning requirement sets.

## 4. Automated Protection

`test/agentOrchestration.test.js` must fail when:

- fewer than three real-task records or fewer than three capabilities exist;
- a recorded role or Skill is unknown or exceeds the context budget;
- an owning requirement or output path becomes stale;
- a high-risk record omits Commercial or QA review;
- a tiny task unexpectedly activates a Skill;
- a Product Owner override requires editing router artifacts; or
- sequential review is represented as independent review.

Run:

```bash
node --test test/agentOrchestration.test.js
```

## 5. Independence Limitation

The active environment used one agent context and applied roles sequentially.
That is valid for routing and artifact production, but it is not an independent
blind QA exercise. A fresh reviewer must later receive only the requirement,
raw change and raw evidence, then detect a seeded regression without receiving
the intended finding.

Until that exercise passes, Requirement 015 is implemented and operationally
adopted but must not claim full independent-QA closure.

## 6. Acceptance

- [x] Three real tasks from distinct domains have routing and handoff evidence.
- [x] A financial/support task records mandatory Commercial and QA review.
- [x] A tiny task proves that unrelated Skills remain unloaded.
- [x] Product Owner override behavior is represented without router edits.
- [x] Stale role, Skill, requirement and output paths are test-detectable.
- [x] Sequential review is disclosed.
- [ ] A blind seeded-regression exercise passes in a fresh reviewer context.
