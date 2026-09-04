# Package 010 - Story Plan Multi-Pass Timeout Recovery

**Owning requirement:** `../011-unified-story-plan-direct-review-and-visual-repair.md`  
**Capability owner:** Cinematic Story Plan  
**Status:** Complete  
**Incident:** `cinematic_story_plan_timeout` after the unified Generate Plan cutover

## Checkpoint 1 - Bounded Stage Budgets

1. Add explicit generation and repair timeout values to the Story Plan policy.
2. Preserve the legacy timeout value as a compatibility alias.
3. Update the example environment without adding an unbounded request.

Gate:

- default initial generation budget is 120 seconds;
- default repair budget is 90 seconds;
- values remain bounded and independently configurable.

## Checkpoint 2 - Partial Repair Recovery

1. Use the generation budget only for the initial Plan call.
2. Use a fresh repair budget for each permitted repair call.
3. Translate initial timeout into a retryable stage-specific error.
4. Catch only provider timeout errors during repair.
5. Retain the current valid Plan, stop later rounds and record sanitized timeout
   evidence before deterministic readiness evaluation.
6. Preserve all non-timeout provider failures as hard failures.

Gate:

- no automatic retry or extra provider call is introduced;
- timeout in repair round one prevents repair round two;
- the persisted Project remains unchanged until explicit Apply.

## Checkpoint 3 - Review UI And Contracts

1. Extend the additive repair-round schema with `provider_timeout` and sanitized
   failure evidence.
2. Show a localized warning inside the workflow summary.
3. Keep remaining findings and Apply gating authoritative.

Gate:

- old workflow responses remain valid;
- timeout evidence never includes raw request, response or private prompt data;
- the modal remains readable at mobile, tablet and desktop widths.

## Checkpoint 4 - Regression

1. Add policy tests for defaults, independent overrides and bounds.
2. Add service tests for initial timeout and recoverable repair timeout.
3. Add Zod and React tests for timeout workflow evidence.
4. Run focused and broad Cinematic regressions, full Web tests, typecheck, i18n
   parity, targeted lint, production build and diff checks.

No image/video Generation, Queue mutation or Credit mutation belongs to this
package.

## Execution Evidence

Completed on 2026-09-03.

- Policy tests verify 120-second generation and 90-second repair defaults,
  independent overrides, bounds and the legacy generation alias.
- Service tests verify retryable initial timeout details, unchanged Project
  state, retained Plan after repair timeout and no later provider call.
- Zod and React tests verify nullable timeout provenance, sanitized failure
  evidence, visible interruption copy, remaining findings and authoritative
  Apply behavior.
- Focused timeout and route tests passed 17/17.
- Cinematic and Storyboard server regression passed 108/108.
- Full Web regression passed 100 files and 384 tests.
- Typecheck, i18n parity, targeted lint with zero errors, production build and
  `git diff --check` passed.

Operational note: an already-running Node process must be restarted to load the
new server policy and recovery code.
