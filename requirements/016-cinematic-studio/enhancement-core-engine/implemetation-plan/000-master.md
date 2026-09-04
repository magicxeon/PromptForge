# Cinematic Core Engine Implementation Work Packages

**Status:** Packages 001-014 complete; Packages 007, 009, 011 and 012 paid-provider visual qualification pending
**Owning requirement:** `../000-master.md`  
**Execution rule:** Implement, test and record one package before entering the next

## Package Order

1. `001-foundation-field-state-and-lineage.md`
2. `002-progressive-authoring-and-ai-proposals.md`
3. `003-keyframe-compiler-and-generation-cutover.md`
4. `004-produce-finish-and-export-lineage.md`
5. `005-release-verification-and-cleanup.md`
6. `006-execution-log.md`
7. `007-storyboard-keyframe-visual-intent-and-natural-realism.md`
8. `008-storyboard-shot-modal-media-first-layout.md`
9. `009-unified-story-plan-direct-review-and-visual-repair.md`
10. `010-story-plan-multi-pass-timeout-recovery.md`
11. `011-provider-ready-storyboard-prompt-composition.md`
12. `012-terra-story-direction-and-gemini-fallback.md`
13. `013-live-story-plan-progress-and-draft-materialization.md`
14. `014-storyboard-render-engine-memory.md`

## Global Invariants

- Existing dirty-worktree changes are treated as user-owned baseline.
- No package may remove or relocate unrelated UI or behavior.
- Simple and Advanced remain one canonical persisted contract.
- Routes call `CinematicApplicationService`; UI never calls providers directly.
- Generation, Credits, References, Assets and Character Profiles retain ownership.
- Every package updates focused tests and the data-lineage matrix.
- A failed test gate stops progression until the failure is understood.

## Package Handoff

Each completed package records:

```text
files changed and owner
contracts introduced or extended
data source/consumer links verified
focused commands and results
protected behavior checked
known gap before the next package
```
