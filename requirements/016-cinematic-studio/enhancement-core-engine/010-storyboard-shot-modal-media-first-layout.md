# Storyboard Shot Modal Media-First Layout

**Status:** Implemented and locally verified  
**Capability owner:** Cinematic presentation, using shared Generation components  
**Primary role:** UX/UI Product Designer  
**Reviewer:** QA Release Engineer  
**Implementation package:** `implemetation-plan/008-storyboard-shot-modal-media-first-layout.md`

## 1. User Outcome

When a user opens a Storyboard Shot, the modal must begin with the visual state
of that Shot, then explain the canonical prompt that produced or will produce
it, and only then offer optional additional direction. The screen must read as
one understandable render workflow without changing any generation behavior.

## 2. Confirmed Problem

The current Cinematic consumer uses the shared stacked Generation composition,
which renders the latest result before the read-only prompt while the optional
Additional Shot direction remains outside and above the shared composition.
With an existing result the visible sequence becomes:

```text
Additional Shot direction -> latest render -> Storyboard visual prompt
```

This separates the canonical prompt from its optional extension and makes the
additional field appear to be the primary prompt.

## 3. Required Information Hierarchy

The normal DOM and visual order is:

```text
Shot header and authority metadata
Preview image / latest render state
Storyboard visual prompt
Additional Shot direction (optional)
Reference Images
Engine & Target Output
Estimate and Generate action
Close action
```

Rules:

1. Preview is first content after Shot context. It may show waiting, generating,
   failed, latest candidate or completed media using the existing result state.
2. The preview uses the established contained media presentation and remains
   expandable through the existing viewer behavior.
3. `Storyboard visual prompt` and `Additional Shot direction` occupy the same
   prompt surface. The compiled prompt appears first and remains read-only.
4. Additional direction remains editable and optional. Reset and Save retain
   their existing handlers, validation, version checks and refetch behavior.
5. Saving direction recompiles/refetches the canonical prompt exactly as it does
   today. It does not directly alter an existing image.
6. Reference, Engine, natural-realism, estimate, Generate and approval behavior
   remain owned by their existing components and workflows.

## 4. State Contract

| State | Layout behavior |
|---|---|
| No attempt | Show a stable preview placeholder before the prompt |
| Queued/generating | Show existing progress presentation in the preview position |
| Completed candidate | Show latest media and its existing utility/approval actions |
| Failed attempt | Show existing recoverable failure state in the preview position |
| Direction dirty | Keep candidate visible; block generation through existing rule |
| Direction saved | Refetch prompt and preserve existing attempt history |
| Context loading/error | Preserve existing authority notice and disabled behavior |

## 5. Shared Component Contract

- Extend `GenerationExperience` only with additive presentation inputs.
- Existing consumers keep current defaults and region order.
- A read-only prompt may receive a controlled supplemental React region rendered
  inside the same prompt surface after its textarea.
- A stacked consumer may explicitly request the existing empty result state.
- Presentation inputs must not call providers, estimate Credits, mutate Queue
  state or create a second Generation workflow.
- Do not use CSS `order`; DOM, keyboard and screen-reader order must match the
  visible order.

## 6. Scoped UI Preservation

Must remain unchanged:

- keyframe v2 compilation and fingerprint;
- Additional direction value and 300-character policy;
- Save/reset/version-conflict behavior;
- Character, Look and reference authority;
- provider/model selection and local preference restoration;
- natural-camera realism setting;
- quote, Credits, submit, Queue, polling and resume behavior;
- result utilities, media viewer and Storyboard source approval;
- Generate All;
- Playground, Studio, Fashion and Character Look layouts.

No user-visible action may be removed. Only its placement inside this modal may
change.

## 7. Responsive, Theme And Accessibility

- At 1440px, 820px and 390px, Preview remains first and the prompt pair follows
  without horizontal overflow or action overlap.
- Preview uses `contain` and stable dimensions; waiting/error states occupy the
  same region without shifting subsequent controls unpredictably.
- The read-only prompt is announced before the editable additional field.
- Reset, Save, Copy, Generate, media utility and approval controls retain names,
  focus visibility and keyboard operation.
- Default, fashion/light and creative themes use semantic tokens already owned
  by the Storyboard modal.
- Thai and English labels wrap without clipping.

## 8. Acceptance Criteria

1. Opening a Shot with or without media starts with its preview/result state.
2. The compiled Storyboard visual prompt appears immediately after Preview.
3. Additional Shot direction appears immediately after the compiled prompt,
   inside the same prompt surface, and remains editable/optional.
4. References, Engine and Generate retain their current order after the prompt
   pair.
5. Existing result actions and `Approve as Storyboard source` remain attached to
   the result they affect.
6. Existing save, generation, pricing, queue, resume and approval tests pass.
7. Other `GenerationExperience` consumers preserve their existing layout.
8. Theme and viewport evidence shows no overlap, clipping or page-level
   horizontal scrolling.

## 9. Validation

- focused shared Generation presentation test for defaults and supplemental
  read-only prompt content;
- Storyboard Shot dialog tests for region placement and unchanged callbacks;
- existing Storyboard and Generation focused tests;
- full Web Vitest, TypeScript, i18n, targeted ESLint and production build;
- local browser screenshots at 390px, 820px and 1440px in all three themes;
- no paid generation required for this layout-only change.

## 10. Implementation Closure

Completed presentation changes:

- `GenerationExperience` accepts an additive read-only prompt supplement and an
  opt-in empty-result surface; existing consumers retain their defaults;
- `StoryboardShotDialog` places the existing Additional Shot direction field,
  Reset action and Save action immediately after the compiled prompt in the
  same surface;
- the Shot modal always reserves Preview as its first Generation region;
- the Storyboard Shot command bar is static inside this scrollable dialog so it
  cannot cover the Additional direction field; command bars outside this modal
  retain their existing sticky behavior;
- no request, API, schema, persistence, pricing, Queue, approval or provider
  behavior changed.

Evidence:

- focused Storyboard/Generation suite: 17 tests passed before the final scoped
  command-bar positioning rule;
- Web TypeScript and production build passed before that final CSS/class-only
  positioning rule;
- targeted ESLint passed for `GenerationExperience.tsx`,
  `StoryboardShotDialog.tsx` and `StoryboardShotDialog.test.tsx` after the
  positioning rule;
- i18n catalog validation and `git diff --check` passed;
- browser assertions passed for default, fashion and creative themes at 390px,
  820px and 1440px: DOM order is Prompt before Additional, Additional is inside
  the prompt surface, no page/dialog horizontal overflow exists and the command
  bar does not overlap Additional;
- the final test/type/build rerun was blocked by the execution sandbox denying
  Vite/TypeScript temporary writes under `web/node_modules`; this was an
  environment permission failure rather than a test assertion or compilation
  failure.
