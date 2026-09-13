# 048 - Dialogue Direction Implementation Plan

Status: Planned; all implementation tasks pending (2026-09-13).
Owner: [047](047-dialogue-timing-and-performance-readiness.md).
This delivery writes requirements only; no runtime changes are authorized yet.

## Ordered Tasks

| Task | Work and exit evidence | Status |
| --- | --- | --- |
| 1 | Reproduce the observed Shot with a sanitized fixture. Trace recipe, normalization, review, Draft save and approval; name preserved contracts and locks. | Pending |
| 2 | Add JSON-driven language-aware speech feasibility and pause budgets behind the existing Cinematic owner. Test Thai, spaced languages, unknown-language fallback and multiple cues. | Pending |
| 3 | Add timing/performance assessment before and after duration allocation. Distinguish estimated risk, explicit interval errors and authored overlap; keep old approvals unchanged. | Pending |
| 4 | Update versioned Story Plan/Scene Direction recipes for speech-first time budgets, visible acting and motivated coverage. Preserve exact dialogue and character authority. | Pending |
| 5 | Integrate bounded targeted direction repair using the existing orchestration/router. Preserve visual-only repair protections; expose unresolved runtime decisions and truthful progress. | Pending |
| 6 | Project findings and before/after changes through existing review UI/contracts. Preserve automatic editable-Draft saving, explicit approval, legacy Takes and Simple flow. | Pending |
| 7 | Run short focused regression groups, then scoped responsive checks for changed UI. Record evidence/gaps and conduct user-controlled read-through/video UAT separately. | Pending |

Task 5 cannot introduce additional billable behavior without existing budget/
authorization coverage. Escalate any pricing/settlement contract change to the
mandatory financial reviewers rather than bundling it into this feature.

## Validation Plan

Prerequisites: repository dependencies installed; isolated fixture/mock providers.
No live project mutation, AI calls, worker restart or production build by default.

Existing narrow commands to extend and run when implementing:

```powershell
node --test test/cinematicStoryPlanFilmReadiness.test.js
node --test test/cinematicStoryPlanService.test.js
```

Extend `scripts/test-cinematic-directed-openings.mjs` with selectable
`dialogue-timing`, `dialogue-direction` and, if needed, `dialogue-ui` groups. These
are planned names, not currently available commands. Keep its explicit `all`
entry point for later aggregate verification; do not run it for each small task.
Ensure nonzero failures propagate and no group performs billable generation.

Tests cover low AI speech estimates, final-allocation overflow, pauses/turn-taking,
unknown-language confidence, locked total conflicts, permitted coverage changes,
unauthorized dialogue/Cast edits, timeout/no-progress, visual-repair isolation and
unchanged old approvals/media. Reuse owning application tests for persistence.

If review/progress UI changes, verify EN/TH at about 390, 820 and 1440px with
intercepted responses. Check existing dialogs, actions, loading/error states and
Simple/Advanced navigation; do not redesign unrelated areas.

Manual UAT: read the full apology at intended emotional pace, including entry
and response, then explicitly choose a representative video attempt. Compare
speech completion, pauses, gaze, framing and listener response. Record measured
speech separately from estimates. No paid render without explicit user action.

## Current Round And Deferred Work

- Reconcile timing work with
  [Produce 022](../produce-video-pipeline/022-user-controlled-take-duration.md):
  planning supplies defaults; explicit Take duration remains the user's choice.
  Share the timing contract before implementing warning/UI tasks, and do not
  introduce creative-quality Generate locks or automatic AI on duration edits.

- Primary next implementation: tasks 1-7 above, fixing planning before more media
  retries. Do not silently regenerate Scene 1 / Shot 3 in the live Project.
- [046](046-storyboard-reference-layout.md) remains the separately parked reference
  image layout task. It has no dependency on timing; schedule its scoped UX pass
  separately after the planning contract, when implementation is requested.
- Seedance usage-based Credit activation requirements under
  `requirements/020-generation-providers/video/005-seedance-25-usage-based-credit-activation.md`
  and `006-seedance-25-credit-implementation-plan.md` remain parked. No billing
  activation or model-rate changes are included here.
- No prompt policy change for facial treatment, reference order or provider
  selection; no new Series/Chapter or export work.

## Delivery Evidence

Requirement and plan recorded only. Code, configuration and runtime data are
unchanged. Automated tests/builds and manual timing/provider UAT are not run.
Review roles are applied sequentially; no independent-agent validation claimed.
