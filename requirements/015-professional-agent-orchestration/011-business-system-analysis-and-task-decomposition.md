# Business/System Analysis And Task Decomposition

**ID:** AGENT-ORCH-011
**Date:** 2026-10-10
**Owner:** Engineering governance
**Primary:** product-requirement-architect
**Reviewers:** QA for artifacts; UX and Security for the Authentication application
**Status:** Profile configuration and reviewed task decomposition complete; native BSA activation unverified

## Outcome And Scope

User requests an Expert UX/UI review before revising Authentication requirements,
and a reusable BSA agent to break requirements into small executable/verifiable
tasks. BSA means Business/System Analyst, profile `business-system-analyst`.
This is developer tooling and documentation, not permission to implement Login.

Product owns business scope/approval; UX owns interaction design; BSA owns
analysis, dependency decomposition and acceptance traceability; implementation
roles own code; QA independently verifies. BSA is not another Product authority,
Technical Lead, scheduler, application capability or general implementation agent.

## Ordered Plan And Ownership

1. Create the BSA charter here under `roles/` and repository profile under
   `.codex/agents/`, reusing existing profile conventions and inherited model/
   permissions. Register both in `agent-artifact-map.json`.
2. Add bounded BSA routing to root AGENTS and the existing routing/governance
   documents; update central ownership index and profile-count assertion.
   Add positive BSA routing and negative scope/tiny-edit fixtures; verify BSA-owned
   sensitive plans still require Security/QA through the existing contracts suite.
3. Receive independent `ux-ui-product-designer` review of AUTH-019 before changing
   its flow requirements. Record each finding and disposition beside AUTH-019.
4. Apply BSA to reviewed scope: decompose existing milestones into child task
   packets with inputs, outputs, dependencies, write owner, Given/When/Then checks,
   evidence and stop conditions. Keep one authoritative task status in JSON.
5. Validate inventory, charters/profiles, task DAGs, links and diff; obtain
   independent QA/Security re-review as triggered. Stop before Login implementation.

Lead owns governance/profile/map edits and integrates reviews. UX is read-only.
BSA analysis is read-only unless assigned exact requirement/task-document writes;
it never writes application code by default. Shared scope is sequential, with no
overlapping writers or child-agent spawning. More than three review perspectives
are handled in waves because UX, sensitive Auth, tooling and testability differ.

## Task Packet Contract

Every executable task has one independently reviewable outcome and names:

- owning requirement and parent milestone (if any);
- inputs and dependencies, including external decisions/prerequisites;
- one role/write owner and bounded exact files or owning directory prefixes;
- preserved adjacent behavior and non-goals;
- ordered work/checks, success/negative/recovery cases;
- observable Given/When/Then acceptance and required evidence;
- reviewers, handoff, stop conditions and explicit live/paid gates.

Split on different owners, contracts or separately verifiable behavior, not an
arbitrary count or estimated hours. Keep simple low-risk work intact. Parent
milestones are navigation/rollups, never independently executable duplicate work.
Child task IDs/dependencies/status/evidence live in the existing task-plan schema;
detailed checklists stay beside the owning requirement. All Authentication
implementation work remains proposed until the user instructs implementation.

## Configuration And Verification

Use project-scoped TOML `name`, `description`, `developer_instructions`, with no
model pin, global config/trust edit, extra permissions or automatic execution.
Official reference: [OpenAI custom subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).
Static file validation is separate from runtime discovery. Attempt a direct BSA
invocation after creation. If this running session does not expose the new
profile, report that fact and use an explicitly disclosed existing Product agent
with the BSA charter for analysis; never claim that fallback loaded the new file.

Existing checks:

```text
node scripts/verify-agent-orchestration.mjs --group inventory
node scripts/verify-agent-orchestration.mjs --group contracts
node scripts/verify-agent-orchestration.mjs --group legacy
node scripts/verify-agent-orchestration.mjs --plan requirements/019-implementation-commercial-feature-plan/authentication/task-plan.json
```

Acceptance: BSA charter/profile is registered, scoped and structurally valid;
UX findings are reconciled before task decomposition; child tasks are testable
and dependency-valid; no false runtime/implementation claim or global permission
change. Existing user edits, especially 010 verification, remain untouched.

## Evidence

Current delivery state is tracked in [bsa-delivery-task-plan.json](bsa-delivery-task-plan.json).
Profile discovery is recorded separately from specification/task validation.

- Profile and charter created/registered. Project/global model, concurrency,
  trust and permission configuration were not changed.
- Direct `business-system-analyst` invocation returned `unknown agent_type` in
  this running session. Native activation remains unverified; a fresh compatible
  session can attempt it later. No native execution is claimed from file creation.
- Disclosed fallback: existing Custom Product profile applied the BSA charter as
  `/root/auth_bsa_analysis_via_product_profile`; it is not the new native profile.
- Independent governance QA `/root/auth_requirement_qa_review` passed the initial
  configuration/charter review and TOML parse. Added its suggested BSA routing and
  sensitive-review-gate cases; focused checks now pass contracts 24/24, legacy
  10/10 and inventory. Final revised Auth review is recorded in AUTH-007/006.
- Auth runtime remains unchanged; only requirement/agent/governance test files
  are edited. No migration, email send, social login or production operation.
- Final independent QA passed both task-plan validators, inventory, contracts
  24/24 and legacy 10/10. It verified 44 executable packets across 18 milestones,
  exact dependency/acceptance parity and coverage of AC01-AC20/UX01-UX09.
  UX, Security and Backend passed their revised-document scopes as recorded in
  [AUTH-007](../019-implementation-commercial-feature-plan/authentication/007-expert-ux-review.md).
  All Authentication children remain proposed with empty implementation evidence.
