# UI-010 Playground Workspace Layout and Comparison Handoff

**Status:** Implemented; pending validation  
**Visual reference:** User-provided Playground workspace mockup in the owning conversation  
**Owners:** Shared generation components, Playground feature and Comparison workspace

## 1. Business Requirement

Playground is the direct, non-guided creation surface. It must keep freeform
prompt authoring obvious while reusing the same protected engine, reference,
credit and comparison pipeline as Studio.

The user should be able to write, generate, inspect recent work and move a
comparison into the full Comparison Screen without navigating through unrelated
configuration.

## 2. Functional Requirements

### 2.1 Desktop and Mobile Composition

- Preserve the application header, breadcrumb/navigation shell and footer.
- Desktop uses two workspace columns:
  - left: Latest Render, primary Prompt, then Negative Prompt;
  - right: collapsible Recent Renders, then Engine & Target Output with
    References, estimate and Generate action.
- The desktop right column remains sticky below the application header while
  the user works through a long prompt/result column. If its content exceeds
  the viewport it scrolls internally, matching Studio's generation panel.
- Sticky behavior is disabled when the workspace collapses to one column.
- The optional Prompt Composer/idea proposal panel is not rendered in this
  Playground composition.
- Prompt and Negative Prompt each show concise helper text directly below their
  labels. The helper text explains what belongs in that field without competing
  with the textarea.
- Mobile uses one column in task order: Latest Render, Prompt, Negative Prompt,
  Recent Renders, then Engine/References/Generate.
- Generating scrolls smoothly to Latest Render without changing the canonical
  generation request.
- The empty Latest Render state uses the existing Momelo mark rendered as a
  single-color, low-emphasis brand mark. It must not introduce a second logo
  asset or use a generic image icon. Render the source as an image with a
  monochrome filter rather than relying on an external SVG mask.

### 2.2 Shared Generation Component

- Playground and Studio use the same `EngineTargetPanel`,
  `ReferenceSlotGrid`, estimate queries, comparison configurator and generation
  submission pipeline from `GenerationExperience`.
- Playground passes the Studio presentation variant into the shared
  `EngineTargetPanel` and compact `ReferenceSlotGrid`; no Playground-only copy
  of either component is allowed.
- Playground must not clone provider/model capability, pricing, reference or
  comparison rules.
- Reference Images render inside the same right-side generation surface as
  Engine & Target Output, not as an independent left-column panel.
- Unsupported capability controls remain hidden according to the active model.
- The Studio `Render Active Prompt` heading is rendered only when an active
  prompt is available to the current viewer. Generate actions and messages stay
  available even when that heading is absent.

### 2.3 Recent Renders Preference

- Recent Renders is expanded by default.
- The user may collapse or expand it.
- The preference is stored in actor-scoped local storage under a dedicated
  versioned feature key.
- Switching actor loads that actor's preference and must not expose another
  actor's state or History.
- If no recent work exists, the panel retains a compact empty state.

### 2.4 Comparison Handoff

- A generated comparison remains visible in the embedded result workspace.
- Once a comparison set ID exists, both Playground and Studio show an explicit
  `Open Comparison Screen` link to `/comparisons/:setId`.
- The Comparison Screen remains the owner of rename, synchronized inspection,
  winner selection and Community sharing.
- The handoff uses React Router and the canonical set ID. It must not copy a
  comparison into local storage or create a second comparison record.

## 3. Software Design

```text
web/src/components/generation/GenerationExperience.tsx
  canonical generation orchestration and layout selection

web/src/components/generation/PlaygroundGenerationWorkspace.tsx
  presentational two-column Playground composition

web/src/components/generation/PromptEditor.tsx
  reusable Playground split Prompt/Negative presentation

web/src/components/generation/GenerationResultSurface.tsx
  shared comparison-screen handoff and branded empty state

web/src/components/generation/GenerationCommandRegion.tsx
  shared optional active-prompt heading and generation command composition

web/src/features/playground/components/PlaygroundRecentGenerations.tsx
  actor-owned recent query and image viewer adapter

web/src/features/playground/routes/PlaygroundRoute.tsx
  actor-scoped UI preference ownership

web/src/features/playground/playgroundUiPreferences.ts
  versioned actor-scoped Recent Renders preference adapter

web/src/styles/playground.css
  responsive workspace, render, recent and engine grouping
```

The workspace component receives regions and callbacks. It does not fetch,
estimate, submit, poll, access local storage or call providers.

## 4. Data Contract

```ts
type PlaygroundUiPreferencesV1 = {
  recentExpanded: boolean; // default true
};

storage feature: "playground-ui-preferences"
storage envelope: existing ActorScopedEnvelope
```

Comparison navigation uses the existing `ComparisonSet.id` returned by
`POST /api/comparisons` and validated by the existing Zod response schema.

## 5. Implementation Plan

1. Compose the presentational Playground workspace as Latest Render/Prompt/
   Avoid on the left and Recent Renders/Engine on the right.
2. Add concise localized helper text to the Playground Prompt and Avoid fields.
3. Add the actor-owned Recent Renders feature adapter and image viewer.
4. Persist only `recentExpanded` under the dedicated actor-scoped preference.
5. Extend `GenerationExperience` with the explicit Playground layout variant.
6. Remove Prompt Composer Assist from that composition.
7. Keep Engine, References, estimate and Generate in one right-side surface,
   using the Studio presentation variants and shared command region.
8. Rename the comparison result handoff and use it on every generation surface.
9. Replace the generic empty-result icon with the existing Momelo mark rendered
   monochrome.
10. Hide the Studio Render Active Prompt heading when no visible active prompt
    exists.
11. Add responsive styling and enabled-locale strings.
12. Validate type, lint, component behavior, desktop/mobile layout and actor
    switching.
13. Verify the right column remains available while scrolling on desktop and
    returns to normal document flow on narrow screens.

## 6. Impact and Concerns

- **Credits:** no estimate or billing code changes.
- **Generation:** payload construction, queue submission and polling remain
  canonical.
- **Comparison:** embedded results and full-screen detail read the same set.
- **Identity:** preferences and History query keys include actor identity.
- **Persistence:** UI preference storage contains no prompt, image or reference
  data.
- **Performance:** Recent Renders requests one bounded History page and mounts
  only six preview items.
- **Accessibility:** collapse state exposes `aria-expanded` and
  `aria-controls`; Comparison navigation is keyboard reachable.

## 7. Testing

### Automated

- Playground layout renders Latest Render before Prompt in the left column.
- Recent Renders precedes Engine & Target Output in the right column.
- Prompt and Avoid helper descriptions are visible and localized.
- Prompt Composer Assist is absent.
- Recent Renders defaults open and respects actor-scoped stored state.
- Actor switching loads the next actor's preference.
- Comparison result links to `/comparisons/:setId`.
- Studio preserves the same comparison handoff.
- Empty Latest Render uses the monochrome Momelo mark.
- Studio does not render an empty Render Active Prompt heading.

### Manual

1. Open `/playground` at desktop width and confirm the two-column hierarchy.
2. Confirm Latest Render is first on the left, followed by Prompt and Avoid.
3. Confirm Recent Renders is first on the right and References are below the
   shared Studio-layout Engine component.
4. Collapse Recent Renders, reload and confirm it remains collapsed.
5. Switch mock actor and confirm the preference and images are isolated.
6. Generate one image and verify smooth movement to Latest Render.
7. Generate a comparison and open its Comparison Screen.
8. Repeat comparison generation from Studio and verify the same handoff.
9. Verify the mobile order at approximately `390px`.

## 8. Acceptance Criteria

- Playground matches the reference hierarchy without replacing the application
  shell.
- Studio and Playground share generation and comparison behavior.
- Playground and Studio render Engine & Target Output from the same component
  and presentation contract.
- Recent Renders preference is durable and actor-scoped.
- The idea proposal panel is absent.
- Empty results use a monochrome Momelo mark, and empty active-prompt headings
  are absent.
- Comparison results can move directly to the full Comparison Screen and then
  use its Community sharing workflow.
