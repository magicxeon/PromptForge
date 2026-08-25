# Professional Agent Orchestration Master Requirement

**Requirement ID:** AGENT-ORCH-000  
**Status:** Implemented and operationally adopted; independent blind-QA gate pending
**Owner:** Engineering governance  
**Applies to:** Product requirements, UX/UI, Cinematic Studio, backend,
commercial operations, generative media and QA/release work

## 1. Purpose

ModelPromptForge now contains image generation, reusable Characters, Templates,
Fashion Blueprint, future Cinematic Studio and future paid operations. A single
unstructured coding-agent instruction is no longer sufficient to preserve the
specialist decisions and regression evidence required by every area.

This requirement defines a small professional role system that:

- selects the minimum relevant expertise automatically;
- asks the Product Owner only when routing is materially ambiguous;
- keeps one primary owner for each task;
- adds independent reviewers for high-risk work;
- avoids loading every role and every Skill into every task;
- preserves current capability ownership and existing behavior; and
- leaves an auditable requirement, implementation and validation handoff.

The repository router, six distributed role charters, seven discoverable Skills,
scoped instructions, routing regression fixtures and three-real-task adoption
record are implemented. Independent blind QA validation remains pending before
final closure.

## 2. Requirement Set

| Requirement | Scope |
|---|---|
| [AGENT-ORCH-001](001-business-roles-and-governance.md) | Business goals, role catalog, ownership and handoff governance |
| [AGENT-ORCH-002](002-automatic-routing-and-system-specification.md) | Automatic selection, clarification rules, context budget and routing contract |
| [AGENT-ORCH-003](003-implementation-plan-and-artifact-structure.md) | Repository structure, implementation sequence, rollout and rollback |
| [AGENT-ORCH-004](004-acceptance-regression-and-operational-checklists.md) | Acceptance, QA, regression, overhead and ongoing maintenance checklists |
| [AGENT-ORCH-005](005-initial-readiness-validation.md) | Initial structural, routing and section-readiness evidence |
| [AGENT-ORCH-006](006-distributed-agent-and-skill-placement.md) | Canonical domain ownership, runtime Skill discovery and nested `AGENTS.md` placement |
| [AGENT-ORCH-007](007-operational-adoption-and-release-validation.md) | Real-task routing evidence, mandatory review, overhead and release validation |

## 3. Core Decision

Use **roles for responsibility** and **Skills for repeatable procedures**.

- A role states the perspective, decisions and required deliverables.
- A Skill states a concise executable workflow and conditional reading.
- Root and scoped `AGENTS.md` files are the repository routing authorities.
- An owning requirement remains the product and behavior source of truth.
- Current code and tests remain authoritative over stale documentation.

A role document by itself is not an automatic runtime router. Automatic use is
achieved by explicit routing rules in `AGENTS.md` and, where supported, precise
Skill metadata. The system must not claim that separate parallel agents were
used when the active environment can only apply roles sequentially.

## 4. Target Outcomes

1. A normal task activates one primary role and at most two reviewers.
2. Low-risk edits do not pay the context cost of unrelated specialists.
3. Financial, authorization, privacy and destructive-support work cannot skip
   their mandatory reviewer.
4. User-facing workflows receive UX and QA review before completion.
5. Cinematic work receives continuity and shot-language review, not only prompt
   wording review.
6. Backend work extends canonical capability entry points instead of creating
   duplicate services.
7. Every substantial change has a regression inventory and validation evidence.

## 5. Dependencies

- Repository authority: `AGENTS.md`
- Architecture ownership: `requirements/099-technical-dept/000-master.md`
- Capability entry points: `requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`
- Performance gates: `requirements/009-migration-to-react/017-performance-ownership-observability-and-tuning.md`
- Existing specialized Skill policy: `requirements/009-migration-to-react/019-generation-workflow-skill-and-trigger-policy.md`
- Cinematic domain: `requirements/016-cinematic-studio/`
- Backend program: `requirements/018-implementation-backend/`
- Commercial program: `requirements/018-implementation-commercial-feature-plan/`

## 6. Delivery Gates

### Gate A: Requirement Approval

- Role boundaries and names are accepted.
- Routing ambiguity and mandatory-review rules are accepted.
- Artifact locations are accepted.

### Gate B: Router Foundation

- `AGENTS.md` contains the compact routing matrix.
- Role charters exist and contain no duplicated architecture manuals.
- Skills exist only for workflows proven to need procedural guardrails.

### Gate C: Forward Validation

- Representative feature, bug, UX, backend, financial and Cinematic tasks route
  to the expected role set.
- False-positive role loading remains within the context budget.
- QA review catches at least one seeded regression without being told the
  intended finding.

### Gate D: Operational Adoption

- Three real tasks complete with recorded routing decisions and handoffs.
- Product Owner overrides work without editing router files.
- Stale role and Skill references are detected by maintenance review.

## 7. Non-goals

- Creating an autonomous multi-agent production service.
- Allowing an agent to approve its own financial or security-sensitive work.
- Replacing product requirements with role prompts.
- Loading all role documents at session start.
- Creating one Skill per feature, screen or technology.
- Granting additional filesystem, network or production permissions.

## 8. Current Implementation Result

- `AGENTS.md` automatically routes substantial work to the minimum role set.
- Cross-project Product and QA role charters remain under this requirement.
- UX, Cinematic, Backend and Commercial role charters live with their owning
  domain requirements.
- Seven focused Skills with invocation metadata are discoverable under
  `.agents/skills/`, including the moved Generation Workflow Skill and the
  database migration planning Skill added for commercial cutover work.
- Scoped `AGENTS.md` files provide frontend, server and domain requirement
  deltas without copying root policy.
- `agent-artifact-map.json` records one canonical owner and path per artifact.
- `routing-fixtures.json` contains 22 positive, negative, high-risk and
  clarification cases.
- `adoption-evidence.json` records three real requirement-authoring tasks across
  Cinematic, Support and Commercial capabilities, plus mandatory-review,
  low-overhead and Product Owner override evidence.
- `test/agentOrchestration.test.js` validates structure, bounds, router links and
  positive/negative Skill coverage, adoption outputs and release gates.
- Initial readiness evidence is recorded in AGENT-ORCH-005.

AGENT-ORCH-006 records the completed placement migration and AGENT-ORCH-007
records operational adoption. Do not mark the full orchestration program
complete until a fresh-context blind QA seeded-regression exercise passes.
