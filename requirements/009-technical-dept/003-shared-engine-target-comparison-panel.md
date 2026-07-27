# 003 Shared Engine Target And Comparison Panel

## Business Requirement

Studio and Playground must present one identical Engine & Target Output and AI Comparison experience. A UX, accessibility, pricing-display, or slot-management change must be made once and appear in every generation surface.

The component must support reduced surfaces through parameters: a caller may hide the step badge, active-run chip, comparison controls, pixel dimensions, resolution selector, or aspect-ratio selector without duplicating markup.

## System Design

Create `client/generation-controls/engineTargetComparisonPanel.js` as the canonical UI component. It owns all markup for the header, provider/model/output controls, comparison toggle, comparison tray, slots, ordering, per-model capability warnings, and estimated total.

The component does not own prompt construction, reference ownership, comparison API persistence, or comparison result workspace rendering. Those remain owned by the existing generation and comparison domains.

### Public Contract

```js
createEngineTargetComparisonPanel({
  mount,
  idPrefix,
  value,
  options: {
    showStepBadge,
    stepLabel,
    showComparison,
    showActiveRun,
    showResolution,
    showDimensions,
    showAspectRatio,
    legacyStudioIds
  },
  getCatalog,
  onEngineChange,
  onComparisonSubmit
});
```

It returns `getValue`, `setValue`, `refresh`, `isComparisonActive`, `toggleComparison`, `submitComparison`, `setActiveRun`, and `destroy`.

`legacyStudioIds: true` is a temporary adapter. It renders the existing Studio IDs (`api-provider-select`, `api-submodel-select`, `image-resolution-select`, `input-width`, `input-height`, `aspect-ratio-group`) so current generation, validation, persistence, and capability code continue working during this migration. Playground uses a prefix and controlled callbacks; it must never create duplicate Studio IDs.

### Comparison Boundaries

- The panel owns draft slots and the open/closed state.
- `client/comparison.js` remains the owner of comparison estimate/create APIs, persistence, polling, queue cards, and the result workspace.
- `comparison.js` exposes active-run state to registered panels through `ModelPromptForgeEngineTargetComparisonPanels.updateActiveRun(run)` rather than querying fixed header IDs.
- A panel invokes `onComparisonSubmit({ slots, value })`; Studio and Playground supply their own generation-context adapter, then both call the same `ModelPromptForgeComparison.startFromExternal(slots)` method.

## Implementation Plan

1. Add the component and a small global panel registry for active-run chip updates.
2. Replace the static Studio Step 2 engine/comparison markup in `client/index.html` with `#studio-engine-target-panel`.
3. In `client/app.js`, mount the Studio instance after the provider catalog loads and before `populateProviderList`, preserving legacy IDs. Route Studio's Generate button to `panel.submitComparison()` when comparison is active.
4. Update `client/playground/playgroundController.js` to mount the same component with `idPrefix: 'playground'`, no step badge, and controlled state callbacks. Remove the Playground-only engine/comparison launcher use.
5. Update `client/generation-controls/generationActionBar.js` to optionally hide its duplicate Compare button; Playground retains only the panel header Compare button.
6. Remove comparison.js DOM ownership for the old tray/header. Retain workspace event binding and API/polling behavior. Publish active-run updates through the shared panel registry.
7. Keep `engineTargetOutput.js` and `comparisonLauncher.js` temporarily only if another caller exists; remove them after a repository search confirms no active use.

## Acceptance Criteria

- Studio and Playground render the same header, engine controls, comparison tray, cards, ordering buttons, warnings, and cost presentation.
- A Compare toggle opens the tray in either surface; 2–4 slots can be configured and submitted.
- Each surface submits its own prompt/reference context but uses the same comparison create and workspace flow.
- Studio generate, validation, persistence, provider switching, capability controls, and credit estimates retain behavior.
- Playground can hide the step badge and duplicate action-bar Compare button through component options.
- No globally duplicated IDs appear when Studio and Playground coexist in the document.

## Credit Estimate And Comparison Focus Rules

The comparison tray must obtain its displayed total from `POST /api/comparisons/estimate`; catalog `estimatedCredits` is only a temporary per-card fallback while the request is loading. The component accepts `getComparisonEstimate({ slots, value })` so each surface can provide its canonical prompt/reference payload without the component importing Studio or Playground state.

When comparison mode is open:

- Hide the single-generation Provider and Submodel controls from the top Engine panel. The comparison slots become the only model selection UI.
- The component must apply an explicit `comparison-mode-active` class and a component-scoped CSS rule with `display: none !important` for `[data-single-model-field]`. This avoids a consumer stylesheet or legacy inline field style leaving the duplicate controls visible.
- Keep output controls that apply to the whole request, such as output resolution, dimensions, and aspect ratio, visible unless options hide them.
- Show `Estimating credits...`, the server `estimatedTotalCredit`, or a clear estimate error inside the comparison tray.
- Each slot card must use the corresponding server-estimated slot credit once available. It must not keep displaying a legacy catalog `creditCost` such as `1 credit` after the authoritative estimate is known.
- Do not display or refresh the single-generation credit estimate as if it were the comparison total. Studio's Generate button must indicate that the comparison estimate is shown in the tray; Playground's action bar must do the same.
- On close, restore the normal Provider/Submodel controls and normal single-generation estimate behavior.

The estimate is advisory. Submission still obtains a fresh server estimate/token immediately before comparison creation, so a stale preview cannot be charged.

### Implementation Addendum

1. Add `getComparisonEstimate` and `onComparisonModeChange` to the shared panel contract.
2. Add `ModelPromptForgeComparison.estimateForPayload(payload)` as a thin adapter over the existing comparison estimate API.
3. Studio supplies `getGenerationRequestPayload()` plus slots. Playground temporarily hydrates its canonical Studio generation context, estimates, then restores its own state.
4. Debounce tray estimates after model, ordering, and slot changes; ignore a late response from an earlier request.
5. Update `generationService` and `generationActionBar` to suppress their normal estimate display while their panel reports comparison mode active.

## Verification

1. Run `node --check` on changed client modules.
2. Studio: switch provider/model, set aspect ratio, open comparison, reorder/add/remove slots, submit comparison, and reopen active run.
3. Playground: repeat the same slot operations and submit a manual prompt comparison.
4. Confirm the two requests contain equivalent `slots` for the same selected models.
5. Confirm direct navigation between `/studio` and `/playground` does not retain stale listeners or duplicate IDs.
