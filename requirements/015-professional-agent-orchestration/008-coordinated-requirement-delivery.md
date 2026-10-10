# Coordinated Requirement Delivery

**ID:** AGENT-ORCH-008
**Status:** Implemented and offline/config verified; fresh-session activation pending
**Owner:** Engineering governance
**Primary:** product-requirement-architect
**Reviewers:** backend-platform-architect (configuration/security), qa-release-engineer
**Skills:** openai-docs; verify-release-regressions

## Outcome And Scope

Connect existing requirements, role charters and Skills to project-local Codex
agents. A main-thread Technical Lead coordinates complex work, while simple
work remains single-agent. Preserve the existing capability entry points and
mandatory financial/security/QA gates. This is developer tooling, not a new
Momelo API, queue, autonomous scheduler or paid generation service.

Reuse AGENTS.md, the 099 architecture index and the existing artifact registry.
Do not move domain charters or activate every historical SKILL.md. Fix stale
active paths and classify remaining requirement guides without deleting them.

## Complexity And Execution

Assess complexity from behavior and risk, not line count or estimated duration.

| Class | Criteria | Execution |
|---|---|---|
| simple | Clear bounded outcome, one capability, existing contract unchanged, no migration or sensitive risk | One agent, one task; no delegation or artificial subtasks |
| complex | Cross-capability contract, uncertain ownership, migration, shared behavior, financial/security/privacy/destructive risk | Lead records dependencies and review gates; split only cohesive independently verifiable deliverables |

A complex task may still be sequential and single-implementer. Parallel work is
allowed only when inputs/contracts are stable, dependencies are satisfied and
write scopes are disjoint. Review after implementation is normally sequential.
No parallelism merely to occupy agents. Reclassify a simple task if new risk is
discovered; pause affected writes until its contract and reviewers are updated.

Default maximum: main thread plus two subagents. Role perspectives can be used
sequentially; mandatory reviews cannot be removed to satisfy the concurrency
cap. The Lead is a coordination responsibility of the main thread, not an extra
mandatory process or a second primary role. Keep one domain primary per task.

## Requirement To Agent Contract

For simple work, a short checkpoint in the owning requirement is enough. For
complex work use `tasks/task-plan.json` or a named task-plan JSON beside the owning requirement, following
[the task contract](009-task-contract-and-handoff.md). Do not create a global
duplicate backlog. A task names its requirement, role, scope, dependencies,
acceptance checks, reviewers and evidence. The Lead sends those inputs with
each delegation; agents do not assume shared chat memory or automatic dispatch
from a Markdown file.

The lifecycle is proposed -> ready -> in_progress -> review -> complete.
Blocked/cancelled work remains explicit. Only user-approved scope is ready;
the Lead can approve technical details within that scope, not price, rights,
retention, public visibility or destructive production actions. A reviewer
cannot weaken acceptance criteria or accept unimplemented behavior.

## Integration And Recovery

- Freeze a shared API/data contract before dependent implementations start.
- Each task has one write owner. Shared files, lockfiles and global config are
  assigned explicitly; other agents propose changes to that owner.
- Use worktrees for overlapping branch work when justified. Worktrees do not
  isolate runtime JSON, ports, wallets or external services: isolate test data
  separately. Never launch paid work or production mutations as a test.
- The Lead integrates in dependency order, runs the relevant combined checks,
  and checks both changed and preserved adjacent behavior before completion.
- On failure or interruption, record completed work, failed checks, remaining
  risks and exact next action. Re-read the working diff before resuming; never
  discard another agent's or the user's changes.
- Reviewers inspect requirements/diff/raw evidence. User Journey testers use
  browser scenarios without editing application code or spending real Credits.
  Their results are simulated usability evidence, not real-user approval.

## Runtime Configuration And Safety

Use `.codex/config.toml` and `.codex/agents/*.toml` for supported local clients.
Each profile links to its canonical charter and task contract. Models inherit
the parent; no hard-coded model catalog or credentials. Review-only profiles
request read-only sandbox; all roles retain the session's enforced permissions.
Instructions and write scopes are coordination rules, not filesystem ACLs.

Do not modify user/global Codex config, trust, authentication or permission
settings. Project config requires a trusted project and a fresh compatible
session. If custom agents are unavailable, use a built-in agent with the same
task packet/charter, or sequential roles; disclose lost independence. No silent
claim of custom-profile execution. No agents persistently run in the background.

## Acceptance

1. Existing eight discoverable Skills remain unique and retain their triggers.
2. Active registries and routing paths resolve; historical guides are inventoried.
3. Small low-risk work has one owner and no parallel task decomposition.
4. Complex plans reject missing/cyclic dependencies, unsafe parallel write
   overlap and completed tasks without verification/reviewer evidence.
5. Financial, authorization/privacy and destructive tasks cannot be labeled
   simple to evade reviews; role selection never grants extra permissions.
6. Every custom profile resolves to an existing charter and shared task rules.
7. Focused checks have selectable groups and explicit aggregate mode; no model
   invocation, live-data writes or worker restart occurs during those checks.
8. Local-client parsing/discovery evidence is separate from static validation.
   Unverified model behavior, browser tools and future client versions are
   reported as limitations, not marked passed.
9. Full runtime closure additionally requires the fresh-session custom-profile
   smoke test and effective permission check in 010. O05 remains in review until
   that evidence exists; offline/config implementation is independently accepted.

## Implementation Tasks

Task state and acceptance evidence are owned by
[coordination-task-plan.json](coordination-task-plan.json), not duplicated here.
O01 defines requirements; O02 reconciles artifacts; O03 configures profiles;
O04 implements validators; O05 records independent review and handoff.

These dependent tasks are implemented sequentially; read-only audit/review can
be delegated. See [verification and handoff](010-coordination-verification.md)
for evidence. No new UI or application runtime data is introduced.

## Official Compatibility Sources

Checked 2026-10-10: local CLI reports 0.160.1.
- [Custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Project configuration](https://learn.chatgpt.com/docs/config-file/config-basic)

Source guidance does not prove this session hot-loads newly created profiles.
Rollback: remove/disable only the new project profiles/config and coordination
section; retain existing AGENTS safety rules, charters, requirements and Skills.
