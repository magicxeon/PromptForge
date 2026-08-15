# Implementation Plan And Artifact Structure

**Requirement ID:** AGENT-ORCH-003  
**Status:** Distributed placement implemented; adoption validation pending
**Owner:** Engineering governance

## 1. Architecture Decision

Use a repository-owned router and progressively disclosed role/Skill files.
Use supported `AGENTS.md` hierarchy and `.agents/skills` discovery paths. Do not
depend on an undocumented `.agent.md` auto-discovery convention.

The target below supersedes the initial centralized layout. See
AGENT-ORCH-006 for ownership and migration rules.

Target structure:

```text
AGENTS.md                                      automatic repository router
.agents/skills/                                repository-wide Skill discovery
  design-cinematic-experience/
  review-commercial-integrity/
  review-generative-media-pipeline/
  review-product-ux/
  verify-release-regressions/
  implement-generation-workflow/
  plan-database-migration/
web/AGENTS.md                                  frontend-scoped deltas
server/AGENTS.md                               backend-scoped deltas
requirements/015-professional-agent-orchestration/
  000-master-professional-agent-orchestration.md
  001-business-roles-and-governance.md
  002-automatic-routing-and-system-specification.md
  003-implementation-plan-and-artifact-structure.md
  004-acceptance-regression-and-operational-checklists.md
  005-initial-readiness-validation.md
  006-distributed-agent-and-skill-placement.md
  agent-artifact-map.json
  routing-fixtures.json
  roles/
    product-requirement-architect.md
    qa-release-engineer.md
requirements/009-migration-to-react/roles/
  ux-ui-product-designer.md
requirements/016-cinematic-studio/
  AGENTS.md
  roles/cinematic-experience-director.md
requirements/017-implementation-backend/
  AGENTS.md
  roles/backend-platform-architect.md
requirements/018-implementation-commercial-feature-plan/
  AGENTS.md
  roles/commercial-financial-integrity.md
test/
  agentOrchestration.test.js
```

Role charters remain requirement-adjacent to their actual domain owner. Skills
use valid `SKILL.md` frontmatter, may include `agents/openai.yaml`, and live in
the supported `.agents/skills` catalog when they must be available from the
repository root. Root `AGENTS.md` still defines trigger boundaries; location
alone does not replace routing policy.

The existing Generation Workflow Skill was moved, not duplicated, to
`.agents/skills/implement-generation-workflow/`. Its trigger policy and
positive/negative routing coverage remain unchanged.

## 2. Role Charter Contract

Each role file contains only:

```text
Mission
Activation triggers
Required sources
Inputs
Decisions owned
Required outputs
Review checklist
Forbidden actions
Handoff contract
Escalation conditions
```

Role files must reference current architecture and domain requirements rather
than copy them. A role may define a review lens but cannot redefine capability
ownership.

## 3. Skill Contract

Create a Skill only when the procedure is repeated, fragile or benefits from a
stable checklist. Every Skill must:

- have a lowercase hyphenated name and precise trigger description;
- keep mandatory reading conditional and concise;
- declare explicit non-triggers to prevent accidental overhead;
- use raw artifacts for independent validation;
- avoid copying role charters;
- provide required outputs and stopping conditions;
- be validated with the Skill validator; and
- be forward-tested on realistic tasks before being marked stable.

## 4. Implementation Sequence

### Phase 1: Baseline And Router Tests

1. Inventory current `AGENTS.md`, project Skills and requirement owners.
2. Create routing fixtures for at least 20 representative requests.
3. Record expected primary role, reviewers, Skills and whether clarification is
   required.
4. Include tiny-task and ambiguous-task negative cases.

**Checkpoint:** Requirement review and expected routing outcomes approved.

### Phase 2: Role Charters

1. Create the six core role files.
2. Check scope overlap and remove duplicate responsibilities.
3. Link every role to canonical requirements.
4. Keep each role inside the context budget.

**Checkpoint:** A human can identify one primary owner for every fixture.

### Phase 3: Root Router

1. Add the compact routing matrix to `AGENTS.md`.
2. Add mandatory financial/security/QA gates.
3. Add clarification and user-override rules.
4. Add context limits and sequential-role disclosure.
5. Preserve all current repository architecture instructions.

**Checkpoint:** Existing Generation Skill triggers still work and ordinary CSS
or copy work does not load unrelated roles.

### Phase 4: Minimal Skills

Create only the Skills supported by repeated tasks. Initialize and validate each
Skill according to the `skill-creator` process. Start with:

1. `verify-release-regressions`;
2. `design-cinematic-experience` before Cinematic Studio requirements;
3. `review-commercial-integrity` before paid backend work;
4. `review-generative-media-pipeline` before video-provider qualification;
5. `review-product-ux` only if the role charter alone proves insufficient.
6. `plan-database-migration` when repeated schema-readiness and transactional
   cutover work justifies a focused migration procedure.

**Checkpoint:** No Skill duplicates existing Generation or React migration
procedures.

### Phase 5: Forward Tests

Run role routing against raw representative tasks:

- Scene Builder visual adjustment;
- Generation/Credit stale estimate bug;
- Cinematic short-scene requirement;
- PostgreSQL identity migration;
- creator payout/refund support case;
- shared component regression review;
- tiny translation correction;
- ambiguous public/private media request.

Where independent contexts are available, do not pass expected findings to QA.

### Phase 6: Adoption

1. Use the router on three real tasks.
2. Record false positives, missing roles, clarification count and caught
   regressions.
3. Shorten or refine triggers from evidence.
4. Mark only validated roles/Skills active.

### Phase 7: Distributed Placement Migration

1. Add the canonical artifact map and tests before moving files.
2. Move role charters to their domain owners.
3. Move active Skills into `.agents/skills/` without duplicate names.
4. Add minimal scoped `AGENTS.md` files.
5. Update every router, fixture, test and requirement consumer atomically.
6. Verify root and nested launch scopes, then remove compatibility copies.

**Checkpoint:** The same routing fixtures pass, every active Skill is
discoverable from root, and no stale or duplicate artifact remains.

**Result:** Implemented. Canonical paths are recorded in
`agent-artifact-map.json`; compatibility copies were removed.

## 5. Implementation Safeguards

- Modify `AGENTS.md` incrementally; do not replace current architecture rules.
- Add tests/fixtures before changing routing rules.
- Never create a second capability owner in a role document.
- Never make QA approval optional for requirement closure after substantial
  implementation.
- Do not allow role routing to execute shell, network or production actions by
  itself.
- Preserve user ability to request discussion or requirement-only work.
- A role selection must not imply a goal, background task or autonomous action
  the user did not request.

## 6. Rollback

If routing creates excessive context or incorrect ownership:

1. retain base `AGENTS.md` architecture rules;
2. disable the new routing table as one bounded section;
3. keep role files for manual invocation;
4. revert Skill trigger exposure, not the owning product requirements;
5. record the failed fixture and revise before reactivation.

## 7. Documentation Updates During Implementation

- Add agent/role/Skill artifact ownership to
  `requirements/099-technical-dept/000-master.md`.
- Add the active router section to `AGENTS.md`.
- Link Cinematic, Backend and Commercial masters to their required roles.
- Record implemented status and forward-test evidence in this master.
- Do not mark AGENT-ORCH complete until three real-task adoption evidence sets
  exist.

## 8. Implementation Note

The standard Python Skill initializer/validator was attempted but could not run
because the available WindowsApps Python alias is inaccessible. Equivalent
Skill structure was created through the repository editing workflow and is
validated by `test/agentOrchestration.test.js`. Official `quick_validate.py`
remains a follow-up when a working Python runtime is available.
