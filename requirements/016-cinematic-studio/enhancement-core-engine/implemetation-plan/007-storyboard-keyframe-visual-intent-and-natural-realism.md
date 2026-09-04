# Package 007 - Storyboard Keyframe Visual Intent And Natural Realism

**Owning requirement:** `../009-storyboard-keyframe-visual-intent-and-natural-realism.md`  
**Runtime risk:** Cinematic-to-Generation request contract and shared UI presentation  
**Execution rule:** Complete and test each checkpoint before starting the next  
**Status:** Complete with paid-provider visual qualification pending

## Baseline

- Focused server baseline: 12/12 passed for Story Plan, keyframe configuration,
  keyframe compiler and Storyboard batch routes.
- Full Web baseline before this package: 100 files and 375 tests passed.
- Existing dirty-worktree files and runtime JSON are user-owned baseline and
  must not be reverted or normalized as part of this package.

## Checkpoint 1 - Additive Shot Semantics

Implementation:

1. Add `coverageRole` to the provider schema, Story Plan normalization,
   persisted Scene save normalization and React boundary schema.
2. Add the field to the authoring manifest as AI/default-authored and Advanced
   visible; Simple mode gains no required field.
3. Update the Story Plan recipe to require a coverage role and prefer an
   establishing first Shot unless an intentional alternative is explicit.
4. Preserve legacy Projects through deterministic fallback inference.
5. Add an Advanced select using the existing Shot editor contract; do not move
   other controls.

Test gate:

- Story Plan AI output stores stable coverage roles.
- Existing Project without the field still parses and compiles.
- Simple mode does not expose another required choice.
- Advanced mode can inspect/change the role without losing other fields.
- Existing proposal and Scene save tests pass.

## Checkpoint 2 - Structured Visual Specification And Concise Prompt

Implementation:

1. Add `visualSpec` to `StoryboardKeyframeContractCompiler` output.
2. Keep current IDs, versions, authorities, references, findings and provenance.
3. Render the prompt only from keyframe-visible fields in requirement order.
4. Remove broad Beat/project narrative, entry/exit prose and camera movement
   from visible prompt serialization while retaining them in structured state.
5. Keep capture profile out of the visible prompt.
6. Add deterministic findings for ambiguous multi-phase action and accidental
   non-establishing first Shot.
7. Bump the keyframe contract/config version and update fingerprints.
8. For compatibility data, infer `insert` from explicit close-up/insert/detail
   framing before applying the ordinary first-Shot establishing fallback.
9. Preserve an ambiguous authored action in `currentState`, but serialize the
   exact visible moment as the single held-state fallback in `visualSpec` and
   the visible prompt.
10. Apply the same compatibility normalization to a multi-phase observable cue:
    preserve the authored cue and finding, and serialize only its first visible
    state. Update AI recipes so new cues are simultaneous, not transitions.

Test gate:

- Same input produces the same `visualSpec`, prompt and fingerprint.
- Establishing, intentional insert, action, expression, lighting, environment,
  continuity and wet-interior fixtures pass.
- Prompt does not contain Story/Beat dump, capture profile label,
  `REALISM_BOOSTER` or camera movement prose.
- A legacy close-up first Shot is not mislabeled establishing, and authored
  multi-phase action/cue values are reported without being copied into the
  visible prompt.
- Manual and batch still compile the same keyframe fingerprint.

## Checkpoint 3 - Hidden Natural Realism Execution Profile

Implementation:

1. Add one stable request field for the Cinematic capture profile; default to
   natural realism for Storyboard manual and Generate All.
2. Validate the profile server-side before estimate and submission.
3. Apply the versioned Cinematic-still execution recipe only when selected.
4. Keep baseline reference, identity, Look and physical-safety directives when
   optional realism is disabled.
5. Preserve the selection in normalized Generation context and Job evidence.
6. Do not alter pricing or Credit calculation.

Test gate:

- Enabled request includes execution realism but preview does not.
- Disabled request omits only optional realism instructions.
- Unknown profile ID fails before Generation submission.
- Manual and Generate All requests use the same field/default.
- Estimate and submitted draft remain identical for all priced parameters.

## Checkpoint 4 - Storyboard Render Controls And Prompt Preview

Implementation:

1. Add a compact `Natural camera realism` toggle to the existing Storyboard
   Engine/Render composition; do not create a second generation component.
2. Reuse the same controlled setting in Generate All and summarize its state.
3. Show `Storyboard visual prompt` read-only after context is current.
4. Explain that edits occur in `Additional Shot direction` followed by
   `Save direction`, and execution safeguards/profile are applied separately.
5. Preserve Copy, `Go to Prompt`, provider/model selection, estimate, result,
   media viewer and approval actions.
6. Keep the existing provider/model local-storage behavior unchanged.

Test gate:

- Default enabled, keyboard toggling and disabled state are covered.
- Dirty Additional direction blocks Generation until save/refetch.
- Prompt preview updates after save and never becomes an editable override.
- Generate All applies one setting to every eligible Shot.
- Existing Storyboard actions remain available.

## Checkpoint 5 - Theme And Responsive Correction

Implementation:

1. Replace the Storyboard preview's hard-coded dark surface with semantic theme
   tokens through the narrowest consumer selector.
2. Verify textarea, heading, helper text, Copy button, border and focus states
   in default, fashion/light and creative themes.
3. Preserve the Render signature and avoid styling unrelated shared consumers.
4. Add stable sizing and wrapping for 390px, 820px and 1440px.

Test gate:

- Theme token/style assertion passes.
- No horizontal page overflow, clipped controls or unreadable contrast in the
  three target widths.
- No unrelated Studio/Playground/Fashion layout snapshot changes.

## Checkpoint 6 - Release Verification

Run and record:

1. focused server tests for configuration, Story Plan, compiler, routes and
   Generation request compilation;
2. focused React tests for Shot editor, Shot dialog and Generate All dialog;
3. all Cinematic server tests affected by request/schema changes;
4. full Web regression suite;
5. TypeScript, targeted ESLint, i18n validation, production build and
   `git diff --check`;
6. manual theme/responsive checks where browser tooling is available.

Stop and document any failure before continuing. Do not execute paid provider
generation during automated verification.

## Rollback

- New Shot and request fields are additive and may be ignored by older readers.
- Reverting the UI option restores the default server profile without touching
  existing Jobs or approved sources.
- Reverting prompt serialization restores the previous compiler version; saved
  author direction remains readable through the compatibility extractor.
- No rollback deletes Assets, attempts, Project data or Credit evidence.

## Execution Evidence

### Completed behavior

- Added additive Shot coverage roles to AI output, server normalization,
  persistence, schemas and the Advanced Shot editor. Simple mode remains free
  of another required decision.
- Added the v2 structured keyframe `visualSpec` and concise visible prompt. Broad
  Project/Beat/Scene prose and camera movement remain traceable but are not
  copied into the still prompt.
- Legacy close-up openings infer `insert`; multi-phase action and performance
  cues retain findings while the visible prompt uses one held state.
- Added one shared `Natural camera realism` render control for manual and
  Generate All. It defaults on, uses one stable request field, is validated on
  the server and is preserved in Job options.
- Kept the option label and expanded realism recipe outside the visible prompt.
- Corrected the Storyboard prompt surface with scoped semantic theme tokens and
  preserved the existing Render, result and approval composition.

### Automated validation

- focused Cinematic server regression: 55 passed, 0 failed;
- focused React generation/Storyboard/authoring regression: 4 files and 73
  tests passed;
- full Web Vitest regression: 100 files and 378 tests passed;
- Web TypeScript check: passed;
- i18n catalog validation: passed;
- production Web build: passed;
- targeted changed-file ESLint: 0 errors and 4 existing warnings in
  `CinematicDialogs.tsx`;
- `git diff --check`: passed before final documentation status update.

Repository-wide baseline outside this package:

- full ESLint still has 5 errors and 20 warnings in existing Admin, Generation
  test and other modules;
- root `npm test` is not a valid unified runner because it sends Vitest
  TypeScript files and scripts through Node's test runner. It reported 636
  passed and 60 failed, including missing role/AGENTS artifacts and the existing
  Character prompt-cleanup expectation. Scoped Node and Vitest gates above are
  the applicable evidence.

### Local browser validation

- Opened the actual Alice Storyboard Project at 390px, 820px and 1440px in
  default, fashion/light and creative themes: 9 combinations, no document-level
  horizontal overflow.
- The fashion/light prompt panel resolved to a light surface and dark text;
  default and creative resolved to their matching dark semantic surfaces.
- The real Project prompt compiled as `Insert keyframe`, removed the unresolved
  tighten/release sequence, retained one cue (`นิ้วเกร็ง`) and contained neither
  `Natural camera realism` nor `REALISM_BOOSTER`.
- Screenshots are available under `_temp/storyboard-keyframe-*.png` for local
  review and are not runtime data.

### Remaining release qualification

- No paid provider generation or Credit mutation was performed. Image-quality
  scoring across qualified provider/model combinations remains a human release
  gate as required by the owning requirement.
