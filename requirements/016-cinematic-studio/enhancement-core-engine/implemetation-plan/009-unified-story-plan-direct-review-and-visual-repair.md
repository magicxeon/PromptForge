# Package 009 - Unified Story Plan Direction And Visual Repair

**Owning requirement:** `../011-unified-story-plan-direct-review-and-visual-repair.md`  
**Capability owner:** Cinematic Story Plan  
**Status:** Complete  
**Execution rule:** Complete and test one checkpoint before entering the next

## Checkpoint 1 - Contract And Golden Baseline

1. Extend the Story Plan proposal with additive workflow-stage, visual-finding,
   repair-change and repair-round evidence.
2. Freeze the current cafe failure as a sanitized generic fixture.
3. Preserve the existing operation, preflight, Plan, provenance and billing
   fields for compatibility.

Gate:

- old proposals remain schema-compatible;
- the new evidence contains no raw provider payload or private media;
- baseline Story Plan tests pass.

## Checkpoint 2 - Deterministic Visual Quality Service

1. Add one Cinematic-owned service that evaluates every proposed Shot through
   `StoryboardKeyframeContractCompiler`.
2. Add generic cross-field findings not currently owned by the compiler.
3. Normalize and deduplicate findings with stable codes and field ownership.
4. Report blockers separately from repairable warnings.

Gate:

- focused tests cover every required finding;
- clean plans remain unchanged;
- the service does not mutate the input Plan.

## Checkpoint 3 - Bounded AI Repair Orchestration

1. Upgrade the Story Plan recipe with an explicit repair-context contract.
2. Generate and direct the initial complete Plan through the existing provider
   entry point.
3. Invoke repair only for repairable findings and at most two rounds.
4. Merge only allowlisted fields by Scene/Shot position.
5. Record before/after values and discard all protected-field changes.
6. Revalidate after each accepted round and stop on clean/no-change/no-progress.

Gate:

- Cast, Look, duration, dialogue, audio and structure preservation tests pass;
- repair cannot loop or silently broaden scope;
- final readiness uses the repaired Plan.

## Checkpoint 4 - Single Story Plan UI Operation

1. Retain one primary `Generate Plan` button.
2. Remove the separate primary `Review with AI Director` button from the Story
   Plan inspector without removing per-Scene Director refinement.
3. Open the existing proposal modal before dispatch.
4. Present pending workflow stages without fabricated completion claims.
5. Render confirmed stages and expandable issue/repair detail after completion.
6. Preserve source resolution, discard, Apply, failure and version-conflict
   behavior.

Gate:

- one-button and immediate-modal tests pass;
- Apply remains explicit and atomic;
- no `[object Object]`, overflow or inaccessible detail control appears.

## Checkpoint 5 - Regression And Visual Closure

1. Run focused server Story Plan, keyframe and application tests.
2. Run focused Web Cinematic dialog and route tests.
3. Run the full available Web regression, TypeScript, i18n, targeted lint and
   production build.
4. Inspect the modal at 390px, 820px and 1440px in all supported themes.
5. Record execution evidence and residual paid-provider visual qualification.

No image or video generation and no Credit mutation are part of this package.

## Execution Evidence

Completed on 2026-09-03.

- Checkpoint 1: additive server and Zod workflow contracts accept legacy
  proposals and expose sanitized stage/finding/repair evidence.
- Checkpoint 2: the deterministic visual quality service covers clean Shots,
  still-image contradictions, nonvisual actions and non-repairable authority
  blockers without mutating the Plan.
- Checkpoint 3: tests prove exact field-path merge ownership, protected data,
  no-progress stopping, the two-round ceiling and the interior-wetness repair
  while exterior rain remains.
- Checkpoint 4: React tests prove one primary Story Plan AI action, immediate
  pending modal, six stages, expandable before/after evidence and blocked Apply.
- Checkpoint 5: 103 server tests and all 382 Web tests passed; typecheck, i18n
  parity, targeted lint with zero errors and production build passed. The modal
  was inspected at 390px, 820px and 1440px across the supported themes.

Residual qualification: artistic output from a live paid provider has not been
generated as part of this package. Provider quality remains a manual acceptance
check and does not reopen the deterministic workflow gates above.
