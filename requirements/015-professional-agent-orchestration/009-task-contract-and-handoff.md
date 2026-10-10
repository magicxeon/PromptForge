# Task Contract And Handoff

**ID:** AGENT-ORCH-009
**Owner:** Engineering governance
**Status:** Contract approved for AGENT-ORCH-008 implementation

## Reading Order

Root AGENTS.md -> 099 Agent Start Here -> owning requirement -> assigned task
and dependency handoffs -> primary charter -> relevant code/tests. Load only
triggered Skills and review charters. Do not load every role or requirement.

## Task Plan

Complex plans use JSON so local tooling can validate dependencies and scope.
Use an owning `tasks/task-plan.json` or a named task-plan JSON alongside the
owning requirement when an extra directory is unnecessary.
The plan is a review aid, not an executable scheduler. Example values below
describe a future task, not delivered functionality. Use repository-relative
paths; write scopes are exact files or directory prefixes ending in `/`, never
globs, absolute paths or `..`. An empty scope means review-only.

```json
{
  "version": 1,
  "requirement": "requirements/015-professional-agent-orchestration/008-coordinated-requirement-delivery.md",
  "tasks": [{
    "id": "EXAMPLE-1",
    "title": "Verify the approved orchestration contract",
    "complexity": "complex",
    "reason": "Shared routing and configuration contract",
    "owner": "qa-release-engineer",
    "capabilities": ["agent-orchestration"],
    "risks": ["shared-contract"],
    "dependsOn": [],
    "writeScope": [],
    "status": "ready",
    "acceptance": ["Existing routing remains valid"],
    "reviewers": ["qa-release-engineer", "backend-platform-architect"],
    "evidence": [],
    "reviews": [],
    "handoff": "Read the requirement and scoped diff; do not edit application files."
  }],
  "parallelBatches": []
}
```

Risk names: `shared-contract`, `financial`, `security`, `privacy`, `migration`,
`destructive`, `user-facing`. No risks plus one capability can be simple when
contracts are unchanged. A simple task must have no child tasks or parallel
batch membership; it may be a sequential step in a larger complex plan.

Each task must have a nonempty reason, acceptance list and handoff. Dependencies
use stable task IDs and form a DAG. A runnable parallel batch contains complex
ready/in_progress tasks only, with completed dependencies outside the batch,
disjoint write scopes and a documented `reason` describing stable input contracts.
Case-insensitive path-prefix overlap checks protect Windows working trees.
Existing directories without a trailing slash are rejected. Concurrent
in_progress tasks must also be complex, declared in batches and limited to two
workers in total; omitting batches cannot bypass these rules.

## Verification And Completion

`evidence` entries are `{ "check": "...", "result": "passed", "reference":
"path/to/evidence.md" }`; accepted results are passed, failed or pending.
`reviews` entries are `{ "role": "qa-release-engineer", "result": "passed",
"reference": "path/to/review.md" }`. References are existing repository files.
These records must describe checks actually performed, not expected results.

Complex tasks require QA. Financial tasks also require Backend, Commercial and
Security; security/privacy/destructive tasks also require Security, and
user-facing tasks require UX. The owner is not its
own reviewer. If the owner is the required specialist, use a separate agent of
that role and record the task's `ownerAgentId` and the review's distinct `agentId`.
Every completed complex task requires these identities for all reviewers, and
an implementer cannot review their own work by changing roles. Independent execution must
be stated honestly in the referenced evidence.

Complete means all dependencies complete, all recorded checks passed, nonempty
evidence, and all required reviewer passes. Automation checks record structure,
and each acceptance string must match a passed evidence entry's `check`,
not whether prose claims are true. QA still verifies raw evidence. Never alter
acceptance criteria just to make a failing implementation pass.

## Delegation Packet And Return

The Lead sends task ID, approved requirement, primary role, contract/version,
dependency outputs, write scope, preserved behavior, checks, tools/permissions,
and stop conditions. Request a concise return with:

1. Outcome and changed files; no unrelated changes.
2. API/data/config implications and integration instructions.
3. Checks performed and evidence paths; explicit failed/unrun checks.
4. Review findings, residual risks and next action.
5. Architecture map updated or architecture map unchanged.

Only the Lead updates the master task status after integrating results. Workers
do not independently approve changes to price, rights or public visibility.
Missing credentials, unclear destructive scope or conflicting shared contracts
are escalated; other independent safe work may continue.

## Simple Work

Use a short owning-requirement checkpoint: outcome, simple classification/reason,
one owner, affected files, acceptance and verification. No JSON plan, new role
document, extra Skill or subagent is required merely for a label/CSS/local bug.
