# UI-011 Comparison Result Stage, Queue, and Provider Output Contract

**Status:** Implemented; pending validation  
**Owners:** Shared generation UI, Comparison UI, generation queue, and ModelArk provider adapter  
**Related requirements:** UI-006, UI-007, UI-010

## 1. Business Requirement

Comparison generation must remain easy to inspect in both Studio and Playground.
When Comparison mode is active, the result is the primary work surface and must
not be compressed into the normal single-image column. Users must also be able
to see whether generation is queued or processing, leave and re-enter
fullscreen with visible controls, and receive the output orientation they
selected.

The same result, queue, and provider contracts must serve Studio and Playground
without route-specific generation pipelines.

## 2. Functional Requirements

### 2.1 Mode-Owned Result Stage

- Comparison off displays the normal single-image Result Stage.
- Comparison on hides the normal single-image stage and displays a Comparison
  Result Stage spanning the complete workspace row above authoring controls.
- Before a Comparison run exists, the stage displays a stable empty or
  processing state instead of falling back to the normal image placeholder.
- Completed and partial-success runs use the canonical `ComparisonWorkspace`.
- Studio and Playground use the same mode switch and result component.
- The canonical Comparison Screen link remains available after a set ID exists.

### 2.2 Fullscreen

- The Fullscreen control is a toggle.
- Entering fullscreen uses `requestFullscreen()`.
- While the workspace owns fullscreen, the same control uses an Exit Fullscreen
  icon and calls `document.exitFullscreen()`.
- `fullscreenchange` is authoritative so Escape, browser controls, and the
  application button stay synchronized.

### 2.3 Visible Queue Status

- Studio and Playground render the same `GenerationQueueStatus` component.
- It represents single-image and Comparison states: idle, submitting, queued,
  processing/streaming, completed, partial success, and failed.
- After the server accepts a Comparison and returns its set identifier, the UI
  renders one compact process row per selected model.
- Each row displays the provider/model label and its current lifecycle state:
  sending, queued, processing, completed, or failed.
- The queue header displays aggregate progress such as `2 of 3 completed`.
- Submit-response job bindings and subsequently polled Comparison slots are
  merged into the same rows; they must not create duplicate rows.
- Completed Comparison slots may render as soon as they are available. The
  Result Stage must not wait for every provider before revealing completed
  images.
- A known Comparison set links to its canonical Comparison Screen.
- A known single job links to actor-owned History.
- This is a projection of existing polling state. It must not add a global queue
  endpoint or expose another actor's jobs.

### 2.3.1 Polling and Durable Recovery

- The client continues polling while a submitted Comparison has no readable
  run, while any slot is active, or while the derived aggregate status is
  active.
- The newest run is selected by `createdAt`; client behavior must not depend on
  array insertion order.
- Slot states are the authoritative input for the displayed aggregate when
  persisted `run.status` temporarily lags behind them.
- The server persists each successful `slotId -> jobId` binding immediately
  after enqueue rather than waiting for every provider slot to be enqueued.
- During reconciliation, a completed History record may recover a missing
  binding using the tuple `comparisonSetId + comparisonRunId +
  comparisonSlotId`.
- Recovery updates the durable Comparison run and remains scoped to its owning
  Comparison identifiers. It must not search or expose another actor's output
  by prompt or filename.

### 2.4 Seedream Output Ratio

- The ModelArk Seedream adapter must convert the selected application aspect
  ratio and resolution into an explicit `WIDTHxHEIGHT` `size` value.
- `6:8` is normalized to `3:4`; at 2K it resolves to `1728x2304`.
- Common supported ratios use ModelArk reference dimensions for the selected
  resolution.
- `auto` may retain the resolution-level value because it intentionally lets the
  provider choose the shape.
- Unsupported resolution/ratio combinations fail before provider submission;
  they must not silently fall back to landscape.
- Provider configuration remains the source of supported user choices.

### 2.5 Safe Generation Diagnostics

The queue logs one structured summary at enqueue, provider dispatch, completion,
and failure containing only operational fields:

```ts
type SafeGenerationDiagnostic = {
  event: "enqueued" | "provider_dispatch" | "completed" | "failed";
  jobId: string;
  comparisonSetId: string | null;
  provider: string;
  model: string;
  generationMode: string | null;
  generationSurface: string | null;
  aspectRatio: string | null;
  requestedResolution: string | null;
  resolvedProviderSize: string | null;
  referenceCount: number;
  returnedWidth?: number | null;
  returnedHeight?: number | null;
  durationSeconds?: string | null;
  errorCode?: string | null;
};
```

Raw prompts, Base64 data, private reference values, authorization tokens, and
provider credentials are prohibited from these logs.

### 2.6 Result Mode Transition

- Switching between normal generation and Comparison mode must use a short,
  restrained transition so the user can perceive that the Result Stage has
  changed ownership.
- Entering Comparison mode may use a subtle fade, upward movement, and scale
  settle. Returning to normal mode uses the corresponding normal-stage
  transition.
- The transition must not delay generation, polling, or user input.
- `prefers-reduced-motion: reduce` disables the movement and uses an immediate
  state change.

### 2.7 Studio Return to Configuration

- The Studio viewport header provides a **Back to Configurator** command beside
  the Minimize/Open Panel control.
- Activating it smoothly scrolls to the `Studio Creative Configurator` heading.
- The control remains available in normal and Comparison modes and uses the
  shared Studio workspace rather than route-specific scroll logic.
- The configurator is the authoritative destination; the command must not
  change generation mode, clear selections, or reset the form.

### 2.8 Playground Sticky-Control Fade

- The Playground right control column remains sticky on desktop.
- When its internal content can scroll above or below the visible area, a
  restrained edge fade indicates clipped continuation and softens the boundary
  between the Comparison panel and following controls.
- The top fade appears only after the user has scrolled down. The bottom fade
  appears only while more content remains below.
- The fade is decorative, does not intercept pointer input, and is removed when
  the one-column responsive layout disables internal scrolling.

### 2.9 Result Viewport Fit

- Normal and Comparison result viewports derive their height from the usable
  browser viewport instead of allowing portrait outputs to expand beyond the
  initial screen.
- The complete generated image is visible at the default Fit transform using
  `object-fit: contain`; portrait and landscape outputs must not be cropped.
- Empty, queued, processing, and completed states retain the same stable result
  dimensions to avoid layout jumps.
- Zoom and pan may intentionally move content outside the fitted frame only
  after explicit user interaction.
- Fullscreen uses the fullscreen viewport independently and must not inherit the
  constrained embedded-stage maximum height.

### 2.10 Inline Result Naming

- After a Comparison reaches `completed` or `partially_completed`, its owner can
  rename the Comparison directly beside the Result Stage title.
- The action updates the existing Comparison set through the canonical
  owner-scoped PATCH endpoint; it must not create another set or run.
- Saving updates the active result immediately and invalidates the actor-scoped
  Comparison list so the same name appears in My Library.
- Empty names are rejected, the existing 120-character limit remains enforced,
  and a failed save keeps the editor open with a visible error.
- The canonical Comparison detail screen retains the same rename capability.

### 2.11 Comparison List Summary Contract

- `GET /api/comparisons` returns lightweight list summaries rather than full
  `runs`.
- The React list boundary validates a dedicated `ComparisonListItem` contract
  containing `previewImages`, `latestRun`, `slotCount`, `completedCount`, and
  aggregate `status`.
- The list must not parse summaries as full Comparison sets or synthesize an
  empty `runs` collection because doing so incorrectly displays completed work
  as `0 models - draft`.
- Cards render server-projected preview thumbnails with full output URLs as
  fallback. Opening a card continues to fetch the complete owner-scoped set.

### 2.12 Actor-Scoped Comparison Preferences

- The active Comparison mode and its last two-to-four provider/model slots are
  restored after refresh and route re-entry.
- Preferences use the shared versioned actor-scoped storage envelope; switching
  mock users must never expose another actor's selections.
- Restored providers and models are validated against the current server
  catalog. Removed capabilities are discarded and replaced by current defaults.
- Runtime job IDs, estimates, estimate tokens, queue state, prompts, and
  references are never stored in this preference.

### 2.13 Queue Admission Boundary

- The client renders no queue card or per-model process rows until generation
  has been accepted by the server and a job ID or Comparison set ID exists.
- A known insufficient-credit result opens the credit exhaustion dialog before
  submission and must not create optimistic queue rows.
- A server-side `credit_insufficient` response also removes transient submission
  state and opens the same dialog.
- Queue progress interpolation follows the configured single-brace i18n
  contract (`{completed}`, `{total}`) and must never expose raw template tokens.

## 3. Software Design

```text
web/src/components/generation/GenerationExperience.tsx
  owns active mode, query/polling state, and shared projections

web/src/components/generation/GenerationResultSurface.tsx
  renders either normal or Comparison result state

web/src/components/generation/GenerationQueueStatus.tsx
  reusable aggregate and per-model process-row projection

web/src/features/comparisons/comparisonRunState.ts
  canonical newest-run selection, aggregate derivation, and polling decision

web/src/features/comparisons/schemas/comparisonSchemas.ts
  keeps list-summary and full-detail response contracts separate

web/src/features/comparisons/routes/ComparisonsRoute.tsx
  renders summary previewImages, status, and slot count without full runs

web/src/features/comparisons/comparisonGenerationPreferences.ts
  validates and persists actor-scoped Comparison mode and slot choices

web/src/components/generation/StudioGenerationWorkspace.tsx
web/src/components/generation/PlaygroundGenerationWorkspace.tsx
  place Comparison result across the full workspace row, expose contextual
  navigation, and project scroll-edge state

web/src/styles/generation.css
web/src/styles/studio.css
web/src/styles/playground.css
  own the shared mode transition and route-specific placement/fade treatments

web/src/components/comparisons/ComparisonWorkspace.tsx
  owns synchronized inspection and fullscreen toggle state

server/providers/ModelArkSeedreamProvider.js
  resolves provider-specific output size

server/domain/generation/generationDiagnostics.js
  creates the allowlisted operational diagnostic contract

server/domain/generation/QueueManager.js
  emits safe operational diagnostics and stores returned dimensions

server/domain/comparisons/ComparisonOrchestrator.js
  persists per-slot queue bindings and reconciles missing bindings from
  Comparison-owned History metadata
```

No UI component calls a provider, reserves credits, or creates a second queue.

## 4. Implementation Plan

1. Add an explicit `comparisonActive` contract to the shared result surface.
2. Add full-row Comparison placement variants to Studio and Playground
   workspaces while preserving their normal layouts.
3. Extract the existing Studio job projection into
   `GenerationQueueStatus` and mount it in both workspaces.
4. Implement `fullscreenchange` state and a true enter/exit toggle in
   `ComparisonWorkspace`.
5. Add ModelArk resolution/aspect normalization and expose the resolved size in
   provider metadata.
6. Add provider adapter tests for `6:8`, landscape, `auto`, and unsupported
   combinations.
7. Add safe queue diagnostics and returned image dimensions without logging
   prompt/reference content.
8. Add/update component tests for mode-owned result placement, queue projection,
   and fullscreen toggle.
9. Add locale keys with parity for enabled locales.
10. Add a reduced-motion-safe Result Stage transition for normal/Comparison
    mode changes.
11. Add the Studio Back to Configurator action with a stable scroll target.
12. Wrap the Playground sticky control scroller with non-interactive,
    scroll-aware edge fades.
13. Add compact per-model queue rows sourced from selected slots, submit
    bindings, and polled Comparison slots.
14. Centralize newest-run selection and slot-derived aggregate status for the
    generation surfaces and Comparison routes.
15. Persist each successful queue binding immediately and recover missing
    bindings from History comparison identifiers.
16. Constrain normal and Comparison embedded result stages to the usable
    viewport while preserving full-image Fit and unrestricted fullscreen.
17. Add owner-only inline rename to the shared Result Stage and refresh both
    actor-scoped detail and list query state.
18. Add a dedicated Comparison list-summary schema and render preview/status
    fields supplied by the list endpoint.
19. Restore valid Comparison choices from actor-scoped local storage and persist
    changes without retaining estimates, jobs, prompts, or references.
20. Move queue projection behind the server-admission boundary and route known
    credit shortfalls to the canonical credit exhaustion dialog.

## 5. Impact and Concerns

- **Credits:** estimates and submission snapshots remain unchanged; output size
  resolution must describe the same selected resolution.
- **Provider behavior:** an explicit pixel size removes model interpretation of
  orientation. It does not alter prompt content.
- **Identity:** queue links and polling remain actor scoped.
- **Security:** diagnostics are allowlisted and contain no prompt or image data.
- **Performance:** only one primary Result Stage mounts for the active mode.
- **Motion:** transitions are visual context only and do not create additional
  result instances or delay state changes.
- **Accessibility:** fullscreen state is announced through the control label;
  queue status uses a live status region without repeated disruptive alerts;
  scroll fades are ignored by assistive technology.

## 6. Testing

### Automated

- Comparison mode renders a Comparison placeholder/run and not the normal image
  placeholder.
- Studio and Playground place Comparison results before their two-column
  content.
- Queue status maps idle, active, complete, and failed states.
- Comparison queue rows appear immediately and retain one stable row per slot.
- Polling continues when a set exists but its run has not yet become readable.
- Run selection remains correct when the API returns runs in either order.
- History reconciliation restores a missing `jobId` and completed result by
  Comparison tuple.
- Fullscreen control enters and exits and follows `fullscreenchange`.
- Seedream 2K + `6:8` sends `size: "1728x2304"`.
- Seedream 2K + `16:9` sends `size: "2848x1600"`.
- Seedream `auto` retains the model-supported resolution token.
- Diagnostics omit prompt and reference values.
- Studio Back to Configurator scrolls to the canonical configuration section.
- Playground edge-fade state follows the actual control-column scroll bounds.
- A completed Result Stage renames its existing Comparison and refreshes the
  actor-scoped list without creating another run.
- Comparison list-summary parsing preserves preview media, slot count, and
  aggregate status while omitting full runs.
- My Library cards render available preview images and no longer report
  completed summaries as `0 models - draft`.
- Comparison provider/model choices survive refresh for the same actor and
  remain isolated after actor switching.
- Insufficient-credit attempts render no queue UI and queue progress never
  exposes untranslated interpolation tokens.

### Manual

1. Toggle Comparison in Studio and Playground and confirm the result stage spans
   the full row.
2. Generate and confirm queue status remains visible.
3. Enter and exit Comparison fullscreen using the same toolbar button.
4. Generate Seedream at 6:8 and verify the output is portrait.
5. Open the Comparison Screen and verify sync zoom, pan, and sharing still work.
6. Inspect server logs and confirm the selected ratio, resolved provider size,
   returned dimensions, and job identifiers are visible without prompt text.
7. Toggle Comparison on and off and confirm the Result Stage changes with a
   brief transition; repeat with reduced motion enabled.
8. In Studio, use Back to Configurator and confirm the form state is preserved.
9. In Playground, scroll the right control column and confirm top/bottom fades
   appear only where additional content exists.
10. Submit three Comparison models and confirm no optimistic queue appears
    before server acceptance; after acceptance all three rows appear and
    progress independently.
11. Confirm a fast provider result appears while slower rows continue
    processing.
12. Verify portrait, landscape, and square results remain fully visible at Fit
    on desktop and mobile.

## 7. Acceptance Criteria

- Studio and Playground share one mode-owned Comparison Result Stage.
- Fullscreen can be exited without Escape.
- Queue state remains visible in both generation surfaces.
- Comparison queue progress reflects every selected model without a second
  queue API.
- A completed backend job cannot leave the Result Stage indefinitely waiting
  solely because its persisted slot binding was temporarily missing.
- Generated media fits the embedded Result Stage without cropping or extending
  beyond the usable screen at the default transform.
- Completed Comparison results can be renamed in place and remain synchronized
  with My Library.
- Comparison list cards show their available previews and aggregate model
  status without requiring full run payloads.
- The last valid Comparison configuration is restored for the active actor.
- Credit rejection happens before queue UI appears.
- Seedream honors 6:8 through an explicit portrait pixel size.
- Logs provide enough safe metadata to diagnose provider shape mismatches.
- Mode changes remain visually understandable without excessive motion.
- Studio can return to its configurator in one action.
- Playground sticky controls communicate hidden overflow without blocking
  controls.
