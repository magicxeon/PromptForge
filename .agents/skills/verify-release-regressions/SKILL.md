---
name: verify-release-regressions
description: Independently validate substantial ModelPromptForge implementations, shared components, bug clusters, release gates, and requirement closure by tracing acceptance criteria to automated and manual evidence while protecting existing behavior. Use for QA, regression review, release readiness, financial/security-sensitive changes, and explicit code review. Do not use for tiny low-risk copy, documentation, or isolated style corrections unless review is requested.
---

# Verify Release Regressions

## Workflow

1. Read the owning requirement and current architecture owner.
2. Inspect the diff, nearest tests, fixtures and raw runtime evidence.
3. Build a protected-behavior inventory before proposing new tests.
4. Map every acceptance rule to automated, contract, visual or manual evidence.
5. Add positive, negative, actor, permission, error and recovery cases according
   to risk.
6. Run permitted validation and report exact commands and results.
7. Lead with blockers and regressions, then residual risk and release decision.

## Independence

Prefer requirement, diff and raw evidence over implementer conclusions. Use a
fresh context for the final review when available. Disclose when independent
execution is unavailable.

## Required Output

```text
Findings by severity
Requirement traceability
Protected behavior inventory
Automated evidence
Manual/visual evidence
Residual risk
Decision: pass / conditional pass / fail
```

## Guardrails

- Do not change acceptance criteria to make a failure pass.
- Do not rely only on tests introduced by the change.
- Do not call visual or provider quality passed without human evidence.
- Do not implement a different product decision during review.
- Follow the owning domain Skill when Generation, Credit or other specialized
  lifecycle work is triggered.
