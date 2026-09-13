# 048 - Dialogue Direction Implementation Plan

Status: Scoped planning and authorized metadata persistence integration verified
for master 050 workstream 5 (2026-09-13); manual UAT remains open.
Owner: [047](047-dialogue-timing-and-performance-readiness.md).
This pass owns StoryPlanFilmReadiness, CinematicStoryPlanService, versioned planning
recipes, Cinematic pure timing policy/helper and focused tests. Authorized follow-up
also owns only new-plan persistence and dialogueReview schema/draft handoff lines
in CinematicApplicationService and CinematicStageContent. Parent owns Take timing,
preflight, final prompt integration and shared UI. Do not edit VideoPacketCompiler,
StoryboardPromptComposer or master050. No live data, paid calls or server restarts.

Primary: Cinematic Experience Director. Sequential review: Generative Cinematic
Production and QA; independent review unavailable. Triggered Skills: cinematic
design, generative cinematic production, media pipeline review and release QA.

Implementation sequence: (1) baseline existing contracts; (2) add independent
JSON-driven advisory helper and timing tests; (3) integrate pre/post-allocation
assessment and share the existing bounded repair loop, retaining exact dialogue
and authority; (4) update recipes and direction tests; (5) review regression
evidence. No additional repair budget or billable operation. Plan estimates never
set a Take minimum or require acknowledgement. Legacy readiness stays opt-in.

Public pure contract delivered: assessDialogueShot(shot, { spokenLanguage }) and
assessDialoguePlan(plan), returning versioned advisory findings, estimates and
unresolved alternatives. Inputs use editorial durationMs, excluding White Previs
lead-in. Parent may reuse this for warnings without invoking AI.

## Ordered Tasks

| Task | Work and exit evidence | Status |
| --- | --- | --- |
| 1 | Reproduce the observed Shot with a sanitized fixture. Trace recipe, normalization, review, Draft save and approval; name preserved contracts and locks. | Done: isolated Thai fixture; existing approval warning acknowledgement retained for legacy plans. |
| 2 | Add JSON-driven language-aware speech feasibility and pause budgets behind the existing Cinematic owner. Test Thai, spaced languages, unknown-language fallback and multiple cues. | Done: dialogue-timing group, 11/11 passed; estimates explicitly uncalibrated. |
| 3 | Add timing/performance assessment before and after duration allocation. Distinguish estimated risk, explicit interval errors and authored overlap; keep old approvals unchanged. | Done: raw/allocation/final evidence; info-only new advice; legacy default and start/speaker hard checks preserved. |
| 4 | Update versioned Story Plan/Scene Direction recipes for speech-first time budgets, visible acting and motivated coverage. Preserve exact dialogue and character authority. | Done: story-plan.v9.json and scene-direction.v8.json through existing loader; historical recipes retained. |
| 5 | Integrate bounded targeted direction repair using the existing orchestration/router. Preserve visual-only repair protections; expose unresolved runtime decisions and truthful progress. | Done: shared two-round budget, no extra charge; normalized assessment, immutable cue authority, known-spare-time checks, timeout/no-progress retention. |
| 6 | Project findings and before/after changes through existing review UI/contracts. Preserve automatic editable-Draft saving, explicit approval, legacy Takes and Simple flow. | Done: authorized schema/draft/save integration; fresh normalized final assessment, bounded advisory history, opt-in approval semantics. No new visible review UI. |
| 7 | Run short focused regression groups, then scoped responsive checks for changed UI. Record evidence/gaps and conduct user-controlled read-through/video UAT separately. | Offline scope passed, including metadata round-trip and compatibility checks. No visible UI change in this workstream; manual read-through/video UAT remains open. |

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

`scripts/test-cinematic-directed-openings.mjs` now has selectable
`dialogue-timing` and `dialogue-direction` groups. Its explicit `all`
entry point includes both for later aggregate verification; do not run it for each small task.
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

- Cross-feature order is now owned by
  [050](050-pilot-stability-consolidated-plan.md). The local tasks 1-7 above execute
  within its AI direction workstream after shared Take timing, before final prompt
  integration. Do not silently regenerate Scene 1 / Shot 3 in the live Project.
- [046](046-storyboard-reference-layout.md) remains a separate behavior owner,
  scheduled for 050's final scoped UX pass. Implementation is now authorized;
  neither requires a duplicate timing, reference or generation workflow.
- Seedance usage-based Credit activation requirements under
  `requirements/020-generation-providers/video/005-seedance-25-usage-based-credit-activation.md`
  and `006-seedance-25-credit-implementation-plan.md` remain parked. No billing
  activation or model-rate changes are included here.
- No prompt policy change for facial treatment, reference order or provider
  selection; no new Series/Chapter or export work.

## Delivery Evidence

### Authorized Persistence Integration

Backend primary, QA review: complete the Cinematic owning saveStoryPlan contract
with optional versioned dialogueReview, browser schema/draft projection, and
fresh post-normalization assessment. Only plans explicitly carrying the current
review contract opt into dialogueTiming; old/manual approvals remain unchanged.
Persist bounded submitted review history as advisory evidence, never as trusted
readiness. Test save/reload, stale assessment replacement, legacy approval and
technical blockers in isolated fixtures. No parent video timing, prompt, preflight
or master050 edits. Integration implemented and verified below.

Commands passed (isolated fixtures/fake providers only):

```powershell
node scripts/test-cinematic-directed-openings.mjs dialogue-timing
# 12/12: pure helper + old/new Film Readiness
node scripts/test-cinematic-directed-openings.mjs dialogue-direction
# 19/19: timing allocation/repair/Scene Direction + existing service/recipe checks
node --test --test-name-pattern="approv|legacy|Story Plan" test/cinematicApplicationService.test.js
# 15/15: existing approval, authority, Simple, legacy and media regressions
```

New files: `server/domain/cinematic/CinematicDialogueTiming.js` (public pure
Cinematic assessment); `server/config/cinematic/dialogue-timing.v1.json` (bounded
uncalibrated policy); `server/config/prompt-recipes/cinematic/story-plan.v9.json`
and `scene-direction.v8.json` (versioned recipes); `test/cinematicDialogueTiming.test.js`
and `test/cinematicDialogueDirection.test.js` (owning isolated checks). Existing
StoryPlanFilmReadiness/service/tests and directed-openings runner extended.
No file moves, runtime data paths, repository migrations, caches, polling,
provider selection, paid generation, server restart or production build.

Parent handoff: assessDialogueShot receives usable editorial `durationMs`, not
White Previs lead-in. Findings are advisory `info`; never turn them into a Take
minimum. Service proposal `dialogueReview` holds deterministic assessment kind,
raw proposal, after-allocation and final ranges, actual shared repair rounds and
before/after changes. Authorized follow-up completed projection in
cinematicSchemas and only dialogueReview handoff/restoration lines in
CinematicStageContent. CinematicApplicationService changes are limited to the
review import, optional saved-version field and normalized new-plan readiness
opt-in. Current-version review enables
`evaluateStoryPlanFilmReadiness(..., { dialogueTiming: true })`; missing/unknown
review contracts retain legacy behavior. Final evidence is recomputed from the
normalized saved plan, never accepted from submitted readiness. Prior review
history is explicitly submitted advisory evidence, capped at 256000 characters
and two rounds. No saved/live Project was modified.

Integration checks passed in focused groups:

```powershell
node scripts/test-cinematic-directed-openings.mjs dialogue-persistence
# 16/16: save/reload, stale final replacement, no timing acknowledgement,
# unrelated warnings and technical blockers retained; old approval/media checks.
node scripts/test-cinematic-directed-openings.mjs dialogue-metadata
# 3/3 selected: all metadata schema boundaries, generated proposal save and
# restored-draft resave, explicit Scene Direction metadata handoff.
node scripts/test-cinematic-directed-openings.mjs dialogue-timing
# 13/13, including bounded/malformed history and unknown-version handling.
node scripts/test-cinematic-directed-openings.mjs dialogue-direction
# 19/19, including additive metadata on the generated plan itself.
node scripts/test-cinematic-directed-openings.mjs types
# Passed; git diff --check passed.
```

UI persistence tests isolate PromptPreflightSummary, whose query contract is
parent-owned. No visible review UI was introduced. Parent reports the full pilot
browser passing EN/TH at 390/820/1440 after its harness provider update; this is
parent-reported evidence, not a rerun by this integration pass.

Read-only review of parent prompt preflight, Storyboard composer, video renderer
and GenerationPromptBudget found no critical issue. Existing focused checks:
`node --test test/generationPromptBudget.test.js test/cinematicStoryboardPromptComposer.test.js`
(15/15) and
`node --test --test-name-pattern="budget|prompt|preflight|reference" test/cinematicVideoPacketCompiler.test.js`
(6/6). Reviewed provisional-vs-final sizing, actor scope, retained reference
mappings/dialogue, unknown provider limits and validation before reservation.
No parent prompt/preflight/video-duration implementation was edited. Unknown
provider limits and real provider behavior remain qualification gaps.

Review was sequential, not independent. Policy rates and natural language
performance detection are uncalibrated heuristics; no guarantee of natural speech,
lip sync, listener chemistry or causal prose quality. Manual read-through and
explicitly authorized provider UAT remain necessary. No viewport checks apply to
this server-only pass; parent must verify any later review UI integration.
