# Implementation Plan And Artifact Structure

**Requirement ID:** AGENT-ORCH-003  
**Status:** Implemented through Phase 5 structural/routing validation; adoption pending  
**Owner:** Engineering governance

## 1. Architecture Decision

Use a repository-owned router and progressively disclosed role/Skill files.
Do not depend on an undocumented `.agent.md` auto-discovery convention.

Target structure:

```text
AGENTS.md                                      automatic repository router
requirements/015-professional-agent-orchestration/
  000-master-professional-agent-orchestration.md
  001-business-roles-and-governance.md
  002-automatic-routing-and-system-specification.md
  003-implementation-plan-and-artifact-structure.md
  004-acceptance-regression-and-operational-checklists.md
  005-initial-readiness-validation.md
  routing-fixtures.json
  roles/
    product-requirement-architect.md
    ux-ui-product-designer.md
    cinematic-experience-director.md
    backend-platform-architect.md
    commercial-financial-integrity.md
    qa-release-engineer.md
  skills/
    design-cinematic-experience/SKILL.md
    review-product-ux/SKILL.md
    review-commercial-integrity/SKILL.md
    verify-release-regressions/SKILL.md
    review-generative-media-pipeline/SKILL.md
test/
  agentOrchestration.test.js
```

Role charters remain requirement-adjacent because they are repository policy.
Skills use valid `SKILL.md` frontmatter and may include `agents/openai.yaml`
when the active Codex discovery/install mechanism supports it. `AGENTS.md`
must explicitly reference repository-local Skills; their mere presence does not
guarantee automatic discovery.

Do not duplicate the existing
`requirements/009-migration-to-react/skills/implement-generation-workflow/`
Skill. The router links to it when its current trigger policy matches.

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
