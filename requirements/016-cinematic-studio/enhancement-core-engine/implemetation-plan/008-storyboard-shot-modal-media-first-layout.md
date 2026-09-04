# Package 008 - Storyboard Shot Modal Media-First Layout

**Owning requirement:** `../010-storyboard-shot-modal-media-first-layout.md`  
**Runtime risk:** Shared Generation presentation and Cinematic modal composition  
**Execution rule:** Complete and test each checkpoint before the next  
**Status:** Complete

## Checkpoint 1 - Freeze Layout And Behavior

1. Record the current shared stacked order and Cinematic-only desired order.
2. Preserve all existing Generation and Cinematic callbacks and request fields.
3. Add regression expectations before moving JSX.

Gate:

- no API, schema, pricing, request or persistence contract changes;
- current save/generate/approval tests remain green.

## Checkpoint 2 - Additive Shared Presentation Inputs

1. Extend the read-only prompt presentation with an optional controlled
   supplement rendered after the prompt textarea.
2. Add an optional stacked empty-result presentation flag.
3. Keep both defaults absent/false so every existing consumer is unchanged.
4. Keep result, prompt, references, engine, actions and messages ownership in
   `GenerationExperience`.

Gate:

- type checking passes;
- default consumers retain the previous output;
- the supplement follows the read-only prompt in DOM order.

## Checkpoint 3 - Recompose Storyboard Shot Modal

1. Remove Additional direction from above `GenerationExperience`.
2. Pass the existing field and its Reset/Save controls as the read-only prompt
   supplement.
3. Request the stable empty preview so no-attempt Shots still begin with media
   state.
4. Leave Close in the modal footer and preserve all handlers and labels.
5. Add only scoped Cinematic spacing and responsive rules needed by the new
   grouping.

Gate:

- visual order is Preview, Prompt, Additional, References, Engine, Generate;
- save/refetch, blocked dirty state, generation and approval behavior pass;
- no CSS-only reordering is used.

## Checkpoint 4 - Verification

1. Run focused Storyboard dialog and shared Generation tests.
2. Run full Web regression, TypeScript, i18n, targeted ESLint and build.
3. Inspect default, fashion/light and creative themes at 390px, 820px and
   1440px using the existing Alice Storyboard without submitting generation.
4. Record evidence and any unrelated baseline failure before closing Package
   008.

No paid provider generation or Credit mutation is part of this package.

## Execution Record

### Files And Ownership

- shared Generation presentation:
  `web/src/components/generation/GenerationExperience.tsx` and
  `web/src/styles/studio.css`;
- Cinematic composition and scoped responsive/theme presentation:
  `web/src/features/cinematic/components/StoryboardShotDialog.tsx` and
  `web/src/styles/cinematic.css`;
- Cinematic dialog regression coverage:
  `web/src/features/cinematic/components/StoryboardShotDialog.test.tsx`.

### Contract Verification

- Region order is result/preview, read-only Storyboard prompt, Additional Shot
  direction, references, engine/estimate and Generate.
- Additional direction retains the same state, reset, save, dirty blocking,
  version and refetch handlers.
- Existing Generation defaults do not show the new supplement or force an
  empty result.
- Storyboard-only CSS disables sticky positioning for the command bar to avoid
  covering the prompt controls inside the scrollable dialog.
- Generation request data, references, estimate, Credits, Queue submission,
  Job resume and Storyboard approval are unchanged.

### Validation Record

- focused Vitest: 3 files and 17 tests passed before the final scoped
  command-bar positioning rule;
- TypeScript and production build passed before the final CSS/class-only rule;
- targeted ESLint after the final rule: passed;
- i18n catalog validation: passed;
- `git diff --check`: passed;
- browser matrix: default, fashion and creative at 390px, 820px and 1440px all
  passed order, containment, no-overflow and no-overlap assertions;
- screenshots:
  `_temp/storyboard-modal-default-390.png`,
  `_temp/storyboard-modal-fashion-820.png` and
  `_temp/storyboard-modal-creative-1440.png`;
- no generation was submitted and no Credits were used.

The execution sandbox denied the final Vitest/TypeScript/build rerun because it
could not write Vite and TypeScript temporary files under `web/node_modules`.
The denial did not report a source compilation or test assertion failure.
