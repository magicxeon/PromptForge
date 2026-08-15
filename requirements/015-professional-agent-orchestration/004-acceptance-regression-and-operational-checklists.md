# Acceptance, Regression And Operational Checklists

**Requirement ID:** AGENT-ORCH-004  
**Status:** Implemented; structural and operational-adoption validation passed
**Owner:** QA and engineering governance

## 1. Requirement Review Checklist

- [ ] Business outcome and non-goals are explicit.
- [ ] Six core roles have distinct ownership.
- [ ] Conditional concerns remain Skills rather than unnecessary roles.
- [ ] Automatic routing and user override behavior are explicit.
- [ ] Clarification is limited to material ambiguity.
- [ ] Mandatory financial, security and QA gates cannot be bypassed silently.
- [ ] Context and role-count budgets are measurable.
- [ ] Sequential execution is not misrepresented as independent agents.
- [ ] Current architecture and capability ownership remain authoritative.

## 2. Router Acceptance Cases

The implementation must store these as fixtures with expected routing:

1. "Adjust one Pearl theme border" -> UX primary; no QA Skill required.
2. "Design the complete Video Studio workflow" -> Product primary;
   Cinematic and UX reviewers.
3. "Define a three-shot fashion sequence" -> Cinematic primary; Generative
   Media Skill.
4. "Migrate Character Profiles to PostgreSQL" -> Backend primary; QA and
   Security review.
5. "Fix stale Fashion Credit estimate" -> Commercial primary; Backend, QA and
   Generation Workflow Skill.
6. "Create creator payout and refund policy" -> Commercial primary; Backend,
   QA and Security review.
7. "Review this PR for regressions" -> QA primary; owning domain consulted.
8. "Change one translation key" -> owning implementation role only.
9. "Make private Character images public by default" -> Product primary and
   mandatory Security/Privacy clarification.
10. "Delete production customer data" -> clarification and approval required;
    routing cannot authorize execution.
11. "Write requirement and wait" -> Product primary; no implementation.
12. "Use QA only" -> QA primary, except mandatory safety gates still apply.

Add at least eight project-specific cases during implementation, including
negative cases where a Skill must not trigger.

## 3. Role Artifact Checklist

For each role:

- [ ] Mission is one clear responsibility.
- [ ] Activation and non-activation triggers are testable.
- [ ] Required sources point to current paths.
- [ ] Outputs can be reviewed objectively.
- [ ] Forbidden actions protect capability boundaries.
- [ ] Handoff and escalation rules exist.
- [ ] File is below 180 lines.
- [ ] No copied schema, route map or pricing table.
- [ ] No secrets, customer data or permission bypass instructions.

## 4. Skill Checklist

For each Skill:

- [ ] Repeated or fragile workflow justifies the Skill.
- [ ] `SKILL.md` frontmatter contains only `name` and `description`.
- [ ] Description contains complete trigger context.
- [ ] Name and folder use lowercase hyphen case.
- [ ] Body is concise and uses progressive disclosure.
- [ ] Existing Skills are referenced instead of duplicated.
- [ ] Non-trigger cases prevent context overhead.
- [ ] Skill validator passes.
- [ ] Forward test uses raw artifacts and does not leak the intended answer.
- [ ] `agents/openai.yaml`, when present, matches current Skill behavior.
- [x] Repository-wide Skill is discoverable under `.agents/skills/`.
- [x] No discovered Skill shares the same `name` with another Skill.

## 4.1 Placement And Scoped Instruction Checklist

- [x] Every role and Skill has one canonical owner and path in the artifact map.
- [x] Cross-project Product and QA roles remain under orchestration governance.
- [x] UX, Cinematic, Backend and Commercial roles live with their domain owner.
- [x] Root `AGENTS.md` contains compact routing and valid canonical links.
- [x] Nested `AGENTS.md` files add only directory-specific deltas.
- [x] Nested instructions do not relax root financial, security or permission
      gates.
- [x] Root-launched sessions do not depend on nested instructions being loaded.
- [x] Old centralized copies are removed after migration validation.
- [x] Existing routing fixtures pass before and after physical moves.

## 5. Regression Preservation Checklist

Before changing `AGENTS.md` or a Skill:

- [ ] Snapshot existing instructions and trigger behavior.
- [ ] Protect architecture, capability, performance, security, localization and
  handoff rules already present.
- [ ] Run old Generation Skill positive and negative trigger cases.
- [ ] Verify tiny UI/copy work remains lightweight.
- [ ] Verify requirement-only requests do not start implementation.
- [ ] Verify user interruptions and newest instructions re-route correctly.
- [ ] Verify no role grants new tool or production permissions.
- [ ] Verify dirty-worktree preservation remains explicit.

## 6. QA Independence Checklist

- [ ] QA receives requirement, diff and raw test/visual evidence.
- [ ] QA is not given the implementer's intended conclusion.
- [ ] Findings lead with severity and file/contract references.
- [ ] Tests cover changed behavior and protected prior behavior.
- [ ] Manual provider/visual checks use a stable rubric and Job IDs.
- [ ] A failure is not reclassified solely to close a requirement.
- [ ] Residual risks and untested surfaces are reported.
- [ ] If fresh context is unavailable, limited independence is disclosed.

## 7. Business And Commercial Checklist

- [ ] Customer-visible outcome and failure recovery are specified.
- [ ] Credits/money use authoritative server contracts and immutable snapshots.
- [ ] Retry, idempotency, reconciliation and compensation are covered.
- [ ] Creator earning/payout and platform liability are separated.
- [ ] Support actions are role-gated and audited.
- [ ] Public/private/owner visibility is tested for each actor.
- [ ] No client-provided price or identity is trusted.

## 8. UX/UI Checklist

- [ ] Primary workflow is short and understandable.
- [ ] Advanced controls use progressive disclosure.
- [ ] Loading, empty, error, disabled, unauthorized and terminal states exist.
- [ ] Shared components retain established features and tests.
- [ ] Theme, i18n, keyboard, focus, responsive and touch behavior are verified.
- [ ] Desktop and mobile visual evidence is recorded for substantial changes.
- [ ] Navigation and post-action destination are explicit.

## 9. Cinematic Checklist

- [ ] Character identity, age, body, wardrobe and prop continuity are explicit.
- [ ] Scene, shot and sequence are separate structured concepts.
- [ ] Camera, framing, lens, movement and lighting have one coherent intent.
- [ ] Performance and emotional direction remain physically natural.
- [ ] Audio intent and timing are defined when relevant.
- [ ] Generation stages, provider constraints, retries and cost estimate align.
- [ ] Multi-shot output has a continuity and visual qualification rubric.
- [ ] Third-party reference assets are not copied into commercial output.

## 10. Backend Checklist

- [ ] Owning capability and canonical entry point are named.
- [ ] Route, domain, repository and provider boundaries remain intact.
- [ ] Data ownership, lifecycle, authorization and migration are specified.
- [ ] Failure, retry, terminal state and restart recovery are explicit.
- [ ] Idempotency and correlation IDs cover external side effects.
- [ ] Performance baseline, bounds and observability are included.
- [ ] Database work preserves repository contracts during migration.
- [ ] No duplicate workflow or direct foreign repository mutation is introduced.

## 11. Operational Metrics

Evaluate after the first three real tasks and then quarterly:

```text
routing accuracy
unnecessary role activations
missed mandatory reviewers
clarification questions per task
context/reading overhead
regressions caught before handoff
regressions found after handoff
stale role or Skill links
user overrides and their reason
```

There is no target to maximize role count. Success means correct ownership,
fewer escaped regressions and low unnecessary context.

## 12. Completion Gate

AGENT-ORCH may be marked complete only when:

- all role and routing fixtures pass;
- role and Skill validation passes;
- old repository instructions remain protected;
- three real tasks have adoption evidence;
- at least one high-risk task demonstrates mandatory review;
- at least one tiny task demonstrates no unnecessary specialist loading; and
- the Product Owner accepts the routing and clarification behavior.

Current evidence:

- [x] Role, Skill, placement and routing fixtures pass.
- [x] Three real requirement tasks have machine-readable adoption evidence.
- [x] Admin/Support demonstrates mandatory Commercial and QA review.
- [x] A JSON fixture correction demonstrates no unnecessary Skill loading.
- [x] The explicit QA-only Product Owner override requires no router edit.
- [x] Sequential review and its independence limitation are disclosed.
- [ ] A blind seeded-regression exercise passes in a fresh reviewer context.

See `adoption-evidence.json` and AGENT-ORCH-007. The unchecked blind-QA item is
the only remaining orchestration closure gate; it does not invalidate the
implemented router, placement or operational adoption behavior.
