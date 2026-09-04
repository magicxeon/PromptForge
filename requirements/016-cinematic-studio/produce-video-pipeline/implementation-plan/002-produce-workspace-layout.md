# Package 002 - Produce Workspace Layout

**Plan ID:** `016-PVP-IP-002`  
**Status:** Complete  
**Requirement owners:** `../002`, `../008`  
**Primary capability:** Cinematic React feature  
**Reviewer:** UX/UI Product Designer

## 1. Goal

Restructure Produce into a clear Story-order, selected-Shot and render workflow
using shared Generation controls. Submission, polling, attempt and approval
behavior remains unchanged in this package.

## 2. Expected Existing Touchpoints

- `web/src/features/cinematic/components/CinematicStageContent.tsx`
- `web/src/features/cinematic/components/StoryboardSequenceBoard.tsx`
- `web/src/features/cinematic/components/ContextualOperationDock.tsx`
- `web/src/features/cinematic/components/ProjectCostSummary.tsx`
- `web/src/features/cinematic/components/authoring/CinematicReadinessSummary.tsx`
- `web/src/components/generation/VideoEngineTargetPanel.tsx`
- `web/src/components/generation/EngineTargetPanelFrame.tsx`
- `web/src/components/generation/GenerationStageState.tsx`
- `web/src/components/generation/GenerationQueueStatus.tsx`
- `web/src/components/generation/GenerationResultSurface.tsx`
- `web/src/components/generation/GenerationVideoViewer.tsx`
- current Cinematic i18n catalogs, schemas and component tests

Any new components live under `web/src/features/cinematic/components/produce/`
only when the responsibility is cohesive and repeated orchestration is removed.

## 3. Steps

### Implementation decisions recorded before source changes

- Produce receives a dedicated compact queue projection grouped by Scene. It
  composes `StoryboardSequenceBoard` in an explicit `readOnly`/queue variant so
  image polling, drag handles and reorder callbacks cannot run in Produce.
- The selected-Shot workspace owns media comparison, concise Story context,
  approval, bounded attempt history and collapsed technical prompt evidence.
- `VideoEngineTargetPanel` is extended only with presentation slots
  (`compact`, title/description/badge, summary and footer). Cinematic still owns
  catalog queries, quote state and submission callbacks.
- Rough sequence review reads only approved attempt Assets in immutable Story
  order. It does not preload all clips and exposes every unresolved gap.
- Package 002 does not add batch submission, provider dispatch or new Credit
  behavior. The future batch command remains absent until Package 004.

### 002.1 Freeze scoped UI behavior

Inventory exact Produce sections, current one-Shot actions, status/error states,
stage navigation, cost summary and responsive behavior. Capture all target
viewports/themes before layout changes.

### 002.2 Isolate read-only sequence presentation

- extract a pure sequence view or add an explicit read-only mode;
- preserve Storyboard's image polling/reorder behavior unchanged;
- make Produce Scene/Shot selection keyboard-operable;
- keep status dimensions stable while async updates arrive.

### 002.3 Extract selected-Shot workspace

Order media, previous/current/next context, concise motion direction, review,
attempt history and collapsed prompt as specified in `../002`. Extract local
`AttemptHistory` only after parity assertions exist.

### 002.4 Reuse Generation configuration controls

- adapt catalog/selection/quote callbacks into `VideoEngineTargetPanel`;
- remove duplicated Produce provider/model/duration/resolution selectors only
  after controlled behavior matches;
- retain capability-based hidden controls and render-signature styling;
- preserve actor-scoped last valid selection after compatibility validation.

### 002.5 Add readiness and recovery projection

Show approved Storyboards, approved videos, active/failed Jobs, duration and
exact recovery links. Do not implement batch submission yet; the future action
may remain disabled/hidden behind a feature gate.

### 002.6 Add read-only rough sequence review

Compose current approved clip Assets through the existing video player in
Storyboard order. Show unresolved keyframe placeholders and exact recovery
links. Assert that opening/playing this mode calls no quote, submit or mutation
endpoint.

### 002.7 Responsive/theme/localization pass

Implement 1440px three-region layout, 820px compact selector/normal-flow dock
and 390px one-column flow. Use semantic tokens and existing i18n namespace.

### 002.8 Persist concise motion correction

Execute `002a-additional-motion-direction.md` before closing this package. This
substep changes only Cinematic Shot authoring and packet staleness; it does not
change quote, Queue, provider or Credit ownership.

### 002.9 Compact queue label and duration regression

- Present a short localized Shot sequence label instead of the internal Shot ID
  inside the narrow Produce queue card.
- Keep the duration badge in a dedicated non-shrinking column and constrain the
  sequence label and title to their own text column.
- Preserve the internal Shot ID in selection, accessibility and data ownership;
  this is a presentation-only correction.
- Verify long IDs cannot overlap the duration badge at desktop, tablet or
  mobile widths.

### 002.10 Rough sequence operability regression

- Keep the modal header, preview, Shot timeline and footer in fixed grid rows
  within the viewport; only the Shot timeline may scroll horizontally.
- Show localized sequence labels instead of internal Shot IDs in gap and
  timeline presentation.
- Open on the Shot currently selected in Produce.
- `Open this Shot` must select the gap, close the modal and cause no Generation
  or Credit side effect.
- Keep explicit Close, previous and next controls visible and operable without
  scrolling the entire dialog.

## 4. Tests

- sequence read-only versus Storyboard editable/polling regressions;
- selected Shot does not reorder on status update;
- shared panel controlled values and capability-visible controls;
- loading, quote, queued, processing, failed, completed and reconciliation;
- rough sequence order, unresolved gap and zero render/Credit side effect;
- approval remains hidden/disabled until eligible;
- keyboard selection, dialog focus and bounded `aria-live`;
- Thai/English wrapping and all enabled themes;
- Playwright/browser screenshots at 390px, 820px and 1440px;
- current Storyboard, Playground Video and stage navigation regressions.

## 5. Exit Gate

- A first-time reviewer can identify the next unresolved Shot and compare the
  approved still with video output.
- Produce uses shared provider/model controls with no duplicated provider map.
- Existing one-Shot request payload and financial lifecycle are unchanged.
- No Storyboard editing behavior, global header or footer has regressed.

## 6. Stop Conditions

- Reuse would start Storyboard image polling/mutation inside Produce.
- Shared panel requires Cinematic imports or direct API/polling ownership.
- Responsive layout needs removal of an unrelated established action.
- Existing one-Shot behavior cannot be covered before extraction.

## 7. Rollback

Keep extracted pure components unused and restore only the prior Produce
composition/imports. Do not revert shared fixes used by other consumers or any
unrelated user changes.
