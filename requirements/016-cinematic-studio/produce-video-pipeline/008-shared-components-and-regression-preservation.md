# Shared Components And Regression Preservation

**Requirement ID:** `016-PVP-008`  
**Status:** Requirement complete; Package 002 shared UI implemented, later package gates pending  
**Priority:** Cross-cutting UI and architecture gate

## 1. Objective

Make Produce and Finish easier to use by composing existing Generation and
Cinematic components, extracting only cohesive reusable responsibilities, and
protecting every adjacent workflow that the change does not intentionally alter.

## 2. Reuse Map

| Need | Existing owner | Required action |
|---|---|---|
| Provider/model/duration/resolution/audio selection | `VideoEngineTargetPanel` | Reuse through a controlled Cinematic adapter; do not recode selects |
| Render signature and action/price surface | `EngineTargetPanelFrame`, `ContextualOperationDock` | Extend typed props only where both image/video consumers benefit |
| Async stage | `GenerationStageState` | Reuse canonical labels and terminal/error presentation |
| Queue progress | `GenerationQueueStatus` | Reuse for one-Shot; compose compact child rows for Group progress |
| Completed output | `GenerationResultSurface`, `GenerationVideoViewer`, `VideoMediaPlayer` | Reuse media/error/fullscreen/download behavior |
| Rough sequence playback | `VideoMediaPlayer` | Compose one current approved Asset at a time; do not add a second media player |
| Story order | `StoryboardSequenceBoard` | Extract or add a pure read-only sequence mode without image polling or drag mutation |
| Readiness | `CinematicReadinessSummary` | Extend with video/audio/assembly findings, not a second summary |
| Cost | `ProjectCostSummary` | Preserve and feed Credits-owned evidence only |
| Attempt history | local `AttemptHistory` in `CinematicStageContent.tsx` | Extract as a Cinematic feature component before adding more states |

Shared Generation components remain callback-driven and provider-neutral. They
must not import Cinematic stores, call APIs, calculate Credits or poll Jobs.

## 3. Produce Feature Composition

Prefer focused Cinematic modules equivalent to:

```text
ProduceReadinessHeader
ProduceShotQueue
ProduceShotWorkspace
ProduceContinuityBridge
ProduceRenderPanelAdapter
ProduceAttemptReview
GenerateEligibleVideoSetDialog
useCinematicVideoPreparation
useCinematicVideoAttemptLifecycle
useCinematicVideoGroupLifecycle
```

Names may follow local convention. The purpose is to reduce orchestration in
`CinematicStageContent.tsx`, not to create a parallel service layer. Hooks use
the Cinematic API client/facade and actor-scoped TanStack Query keys.

## 4. Sequence Board Safety

`StoryboardSequenceBoard` currently combines presentation with Storyboard image
polling and reordering. Produce must not enable hidden image-generation or drag
behavior merely to reuse its visuals. Implement one of these in order:

1. extract a pure sequence presentation component consumed by both stages; or
2. add an explicit read-only mode with tests proving no polling/mutation.

Storyboard retains all current reorder, status, image preview and responsive
behavior. Produce order is read-only and keyboard-selectable.

Rough sequence review reuses the same pure order projection and
`VideoMediaPlayer`. It advances between authorized current Assets without
preloading an unbounded set of videos and displays a stable placeholder for an
unresolved Shot.

## 5. Shared Generation Panel Safety

The Cinematic adapter supplies:

- catalog-derived eligible providers/models;
- current controlled selection;
- capability-visible controls;
- source/reference badges and findings;
- quote/estimate state;
- callbacks for change, quote and submit.

`VideoEngineTargetPanel` remains the visual/control owner. Unsupported controls
are hidden from catalog capabilities. Provider logos may be added through the
shared provider presentation contract, never a Produce-only map.

## 6. Scoped UI Preservation

Protected sibling behavior includes:

- Setup, Cast, Story Plan and Storyboard authoring and navigation;
- Storyboard still generation, auto-generate and source approval;
- current one-Shot video attempt history and approval;
- Playground Image and Video, including comparison rules;
- Job Center, History, Collections and Community media viewers;
- actor switching, query invalidation and persisted user preferences;
- global header, footer, Project cost summary and stage navigation;
- existing responsive and all enabled theme behavior.

No item is moved, removed or restyled unless a child requirement names that
change. Existing disabled final-export affordances may become active only after
Package 006 passes its gates.

## 7. State And Persistence

- Server records are authoritative for attempts, Groups, Jobs, Assets, quote,
  approvals and assembly.
- React stores only selected Scene/Shot, panel disclosure and unsent direction.
- Browser provider/model preference may be actor-scoped and must be revalidated
  against current compatibility before use.
- No Base64 video/image or provider URL is persisted in browser state.
- Actor switch clears Cinematic query state and local actor-owned preferences.

## 8. Themes And Visual Language

- Use semantic surfaces, borders, text, focus and render-signature tokens.
- Render/configuration areas retain the established warm/yellow Generation
  signature while status colors keep their semantic meaning.
- Momelo Neon, Pearl Editorial and Electric Studio must remain readable.
- Do not add a route-local palette, decorative gradient field or nested cards.
- Video previews use bounded `aspect-ratio`, `object-fit: contain` and an
  explicit full-screen/open-detail action.

## 9. Responsive And Accessibility

Verify approximately 390px, 820px and 1440px:

- no page-level horizontal overflow;
- queue/selectors remain reachable without drag;
- sticky render surfaces do not cover results or stage navigation;
- Thai/English provider/model/error strings wrap safely;
- modal focus is trapped and restored;
- status/progress announcements are bounded and non-repetitive;
- icons have accessible names/tooltips where meaning is not familiar;
- media controls and approval are keyboard-operable.

## 10. Polling And Performance

- One Generation/Group lifecycle owns polling; child components do not start
  independent timers.
- Poll only while non-terminal work exists and stop on terminal/unmount/actor
  change.
- Batch status is returned in a bounded projection rather than N uncoordinated
  requests.
- Attempt history is paginated/bounded before production-scale retention.
- Previews use Assets thumbnails/posters and do not retain video buffers.

## 11. Localization

All new visible text uses the current Cinematic namespace and is added with key
and interpolation parity for every enabled locale. Provider/model identifiers,
prompt text and user content are runtime data, not catalog translations.

## 12. Acceptance

- Produce provider/model controls have the same capability-driven behavior and
  visual language as other Generation screens.
- Component extraction introduces no second polling, pricing or submission path.
- Storyboard retains its current editable behavior while Produce uses a
  read-only sequence presentation.
- Protected workflows have explicit regression assertions.
- All three themes, locales and target viewports pass without overlap or
  inaccessible actions.
