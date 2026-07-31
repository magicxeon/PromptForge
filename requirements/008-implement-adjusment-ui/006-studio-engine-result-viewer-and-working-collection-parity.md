# 006 Studio Engine, Result Viewer, and Working Collection Parity

**Status:** Ready for validation
**Owner:** React generation, media, Studio, and Collections capabilities
**Visual baseline:** `005-original-screen.jpeg` and the active/inactive
Comparison screenshots supplied during review

## 1. Business Requirement

Studio must preserve the compact, professional authoring workflow that existed
before the React migration. A non-technical user must be able to select visual
attributes, understand the billable generation action, inspect a completed
image, and save it to a Collection without leaving the workflow.

The migration is not complete while visual controls, pricing hierarchy,
permission-sensitive prompt text, the image viewer, or Collection actions are
missing even when generation itself succeeds.

## 2. User Outcomes

1. Attribute dropdowns and illustrated options match the compact legacy visual
   hierarchy and remain usable with large option inventories.
2. Normal and Comparison generation expose the correct controls without
   duplicated provider/model fields.
3. The billable Generate action is an unmistakable yellow primary CTA showing
   the current locked estimate.
4. Compiled prompt text is visible only to an admin in the guided Studio
   surface. It remains available internally to the canonical generation
   pipeline for every authorized user.
   During local debugging, `OVERRIDE_DEBUG_PROMPT=true` exposes the same
   read-only Studio prompt panel and Studio result prompt metadata to every
   actor role through the server-provided runtime feature policy. The default,
   unset, empty, or any value other than case-insensitive `true` keeps the
   admin-only rule. This override must not expose prompts on Community pages.
5. Clicking a generated or recent Studio image opens a reusable full-screen
   viewer with navigation, metadata, download, permission-aware actions, and a
   working Collection picker.
6. A user can create a Collection and add/remove the active image from the same
   picker without reloading the route.

## 3. Visual Contract

### 3.1 Attributes

- Use near-black compact dropdowns with the violet border hierarchy from
  `005-original-screen.jpeg`.
- Compact illustrated assets use neutral gray artwork and labels. Selection is
  communicated by a restrained Cyan border/glow and a check state.
- Field labels and controls use the compact typography scale from the legacy
  form: 10-12 px controls, 13-15 px section headings, and 8-10 px supporting
  metadata.
- Every field retains a complete dropdown, visual shortcuts when available, a
  compact custom write-in, and a lock control.

### 3.2 Engine: Comparison Off

- Show Provider Engine and Submodel Version.
- Show reference capacity under the model. Do not show a credit estimate under
  Provider or Model; the yellow Generate CTA is the only single-generation
  price owner.
- Show Output Resolution only when supported.
- Show width, height, and aspect-ratio presentation without introducing a
  second incompatible generation contract. Width/height are derived display
  values unless the provider contract explicitly supports pixel dimensions.
- Show only compatible match/reference controls.
- Do not show `Go to Prompt` inside the Studio action area.

### 3.3 Engine: Comparison On

- Hide the normal Provider/Submodel controls.
- Retain shared output dimensions/aspect ratio.
- Show one Comparison configurator with a yellow border and restrained glow.
- Show per-slot estimates and the enabled-slot estimated total.
- The Generate CTA points to the Comparison total instead of showing a
  conflicting single-model estimate.

### 3.4 Generate CTA

- Studio uses one full-width yellow Generate button.
- Normal mode displays the locked estimate in the button.
- Comparison mode displays `See comparison total above`.
- The button remains actionable while an estimate is being acquired because
  the canonical submit mutation obtains and locks an estimate before enqueue.
  It is disabled only for missing prompt, an active submission, a known
  insufficient balance, or an explicit workflow blocker.
- Match the legacy visual hierarchy: 56 px minimum height, bright yellow fill,
  high-contrast black label, restrained yellow glow, and the estimate rendered
  as a compact badge inside the CTA.
- Pricing unavailable, insufficient credit, pending, and blocked states remain
  explicit and disabled. No fallback price may be invented in the client.

## 4. Prompt Visibility and Security

- Guided Studio prompt preview and negative prompt controls are rendered only
  when `actor.role === "admin"`.
- Hiding prompt text is a presentation policy, not a compiler change.
- Prompt text remains part of the private generation request and must not be
  logged or copied into public state.
- Playground manual prompt editing is unchanged.
- Public Community prompt visibility continues to use its own snapshot policy.

## 5. Reusable Result Viewer Contract

Create a React-owned media viewer. Do not reactivate
`client/core/lightboxService.js` or `window.openLightbox`.

The viewer supports:

- controlled open/close state;
- current item and ordered browse context;
- previous/next buttons and keyboard ArrowLeft/ArrowRight;
- Escape close and focus restoration through the dialog primitive;
- full-size `object-fit: contain` image stage;
- position status;
- provider, model, time, duration, dimensions, and credit metadata when
  available;
- prompt metadata only for an admin;
- Download;
- Add to Collection;
- Share when the existing share policy permits it;
- feature-specific actions supplied through a typed render slot;
- loading and unavailable-image states.

Studio current result and Studio recent history must use the same viewer
component. Community public detail pages remain route-owned and must not be
replaced by this private viewer.

### 5.1 Studio Current Result Scale and Action Layout

The compact current-result surface inside Studio must remain usable for portrait,
landscape, and square outputs:

- the media stage preserves the source aspect ratio with `object-fit: contain`;
- the Studio column must not stretch the media surface to match the adjacent
  queue/history column;
- the media stage uses a bounded viewport-relative height so a portrait Face
  Creator result does not push the Configurator off screen;
- actions render below the image and never overlay or crop the media;
- utility actions (`Download`, `Open detail`, Collection, and Share) use a stable
  four-column desktop grid and a two-column mobile grid;
- reference and workflow actions use a separate row so `Face reference` and
  `Use this Face` remain aligned, legible, and visually distinct from file
  utilities;
- all action controls preserve the shared compact type scale and stable button
  dimensions without clipping or orphaned single buttons.
- the private lightbox action area uses full-width rows for standalone actions;
  reference actions may share a row only when multiple actions are present, and
  a single available reference action must expand to the full action width.

## 6. Working Collection Contract

The shared Collection picker must:

1. load only the active actor's Collections;
2. show whether the current job already belongs to each Collection;
3. add or remove membership by selecting a row;
4. create a new private Collection in the dialog;
5. add the active image to the newly created Collection in the same action;
6. invalidate actor-scoped Collection, Collection detail, and History queries;
7. show loading, empty, success, and API error states;
8. never accept an owner identifier from the browser as authorization.

Server ownership remains enforced by the existing Collection routes and
`req.actorContext`.

## 7. Software Design

### Shared components

- `web/src/components/media/GenerationImageViewer.tsx`
  - presentational browse state, media stage, metadata, and action slots.
- `web/src/components/collections/CollectionPickerDialog.tsx`
  - actor-scoped create/add/remove orchestration.
- `web/src/components/generation/GenerationResultSurface.tsx`
  - adapts completed generation results to the shared viewer.

### Feature integration

- `web/src/features/studio/components/StudioRecentGenerations.tsx`
  - opens the same viewer with its ordered recent-item context.
- `web/src/components/generation/GenerationExperience.tsx`
  - applies admin prompt visibility and Studio CTA composition.
- `web/src/components/generation/EngineTargetPanel.tsx`
  - owns active/inactive Comparison presentation only.
- `web/src/styles/studio.css`
  - owns Studio-specific compact parity styling.
- `web/src/styles/media-viewer.css`
  - owns the reusable viewer layout.

### Existing APIs

- `GET /api/collections`
- `POST /api/collections`
- `POST /api/collections/:collectionId/images`
- `DELETE /api/collections/:collectionId/images/:jobId`

No new persistence format or duplicate Collection endpoint is required.

## 8. Impact and Compatibility

- Generation, pricing, queue, reference, and prompt compiler contracts remain
  canonical and unchanged except for presentation adapters.
- Collection mutations reuse existing repositories and actor authorization.
- The viewer is private-history oriented; Community viewer ownership remains
  separate.
- Legacy lightbox source remains migration evidence only.

## 9. Testing

### Unit/component

- normal Engine shows provider/model; Comparison Engine does not;
- both modes retain aspect-ratio/dimension presentation;
- Studio CTA shows single estimate or Comparison-total direction correctly;
- prompt preview renders for admin and is absent for user/creator;
- viewer opens, closes, navigates, restores focus, and hides admin-only prompt;
- Collection picker creates, adds, removes, invalidates correct actor keys, and
  reports mutation errors.

### E2E

1. Open Studio as Demo User and verify prompt text is absent.
2. Toggle Comparison and verify provider/model disappear while dimensions and
   Comparison total remain.
3. Complete or load a generation and click the image.
4. Navigate recent items in the viewer.
5. Create a Collection, add the image, close/reopen, and verify membership.
6. Remove the image and verify History/Collection state refreshes.
7. Switch actor and verify Collection membership does not leak.

### Responsive/accessibility

- Verify desktop and mobile viewer layouts.
- Verify keyboard dialog navigation and visible focus.
- Verify Thai and English text fit.

## 10. Implementation Order

1. Freeze Engine and prompt-visibility behavior with tests.
2. Restore compact Studio visual styling and yellow CTA.
3. Build the shared viewer and adapt current result.
4. Adapt recent history to the same viewer.
5. Complete Collection create/toggle behavior.
6. Run React typecheck, lint, unit tests, build, and route E2E batch.

## 11. Legacy Pixel-Parity Clarification

The retained Vanilla implementation is the visual measurement source for this
parity pass, not a source of browser behavior. React must reproduce the
following values while continuing to own state, APIs, permissions, and routing:

- non-heading Studio form text defaults to `0.75rem`;
- form controls and command buttons use a `10px` radius;
- compact visual cards use the mask artwork contract from
  `client/style.css`:
  - `74px` by `74px` masked artwork;
  - `118px` minimum card height;
  - `76px auto` grid rows;
  - `#9f9fba` muted artwork/label color;
  - `8px` card radius and the legacy Cyan selected treatment;
- comparison selects use an opaque dark popup/control background and readable
  light option text;
- active `.btn-compare-models` uses `--neon-yellow`, a yellow border, and
  `rgba(250, 204, 21, 0.22) 0 0 20px` glow;
- the expanded comparison workspace keeps two stable equal-width slot columns,
  a third add-slot card on the next row, and its total below the grid without
  horizontal overflow;
- `GenerationImageViewer` maps the retained
  `.lightbox-content-container`, `.lightbox-image-stage`,
  `.lightbox-metadata-panel`, `.lightbox-meta-prompt`, and
  `.btn-lightbox-download` measurements from `client/style.css`.

Utility classes must not compete with these component-owned selectors. The
comparison slot markup therefore uses semantic component classes only.

## 12. Viewer Lineage, Collection, and Global Control Refinement

- Previous/next viewer controls sit outside the lightbox border on desktop and
  move inside the viewport at the mobile breakpoint.
- The private viewer shows a `Parent image` section when generation reference
  lineage is available. Current jobs use their active reference inputs; History
  items use persisted referenced job IDs and actor-visible thumbnails.
- The viewer shows a dedicated `Collections` section using the existing
  actor-scoped Collection query and picker. It displays current membership and
  does not create a second Collection persistence path.
- React web body text defaults to `0.75rem`; native form controls and shared
  buttons default to a `10px` radius.
- The Studio Generate CTA uses the reusable `btn-neon-yellow-glow` interaction
  class. Its active state is
  `translateY(-1px) scale(0.99)` with
  `rgba(251, 191, 36, 0.5) 0 0 12px` glow.

## 13. Active Generation Loading Feedback

`GenerationResultSurface` must visually distinguish an idle result viewport
from work that is actively being submitted or processed:

- idle state keeps the static image placeholder and setup guidance;
- `pending`, `queued`, `processing`, `streaming`, `generating`, and `running`
  states replace the static image icon with a continuously rotating loading
  indicator and a restrained pulse ring;
- queued jobs use the localized queued label; other active jobs use the
  localized generating label;
- the active status container exposes `role="status"`, `aria-live="polite"`,
  and `aria-busy="true"`;
- failed or cancelled jobs must stop the loading animation and continue to show
  their canonical error message;
- Studio and Playground reuse this behavior through the same
  `web/src/components/generation/GenerationResultSurface.tsx` component.

Acceptance checks:

1. Before generation, the placeholder remains static.
2. Immediately after Generate, the viewport displays animated progress even
   before the first job-poll response arrives.
3. The animation remains visible while the job is queued or processing.
4. Completion replaces the loader with the generated image.
5. Failure stops the loader and displays the returned error.
6. Clicking Generate immediately expands a collapsed Studio Render panel and
   smooth-scrolls its heading into view; navigation must not wait for the
   estimate, enqueue, or polling response.

## 14. Sticky Engine and Generate Availability

The desktop Studio configurator must preserve the retained Vanilla control-panel
behavior while the Character visual options and attribute form extend beyond
the viewport:

- the Engine and Target Output card sizes to its own content and must not stretch
  to the height of the Attribute card;
- both configurator cards use the retained layered treatment: a subtle
  `rgba(255,255,255,0.08)` border, dark raised surface and restrained outer
  shadow; the Engine card additionally uses the retained Violet
  `rgba(139,92,246,0.05)` inset glow and `rgba(139,92,246,0.22)` border;
- at desktop widths above `1180px`, the card uses `position: sticky` and remains
  offset below the fixed global header with a `16px` breathing space;
- the sticky card includes Engine settings, compatible references, permitted
  prompt controls, configuration commands, messages and the Generate CTA so the
  user can generate without returning to the beginning or end of a long
  attribute form;
- its maximum height is the available viewport height below the header;
- when Comparison or reference content exceeds that height, only the sticky
  card receives a thin internal vertical scrollbar;
- the configurator parent must not use overflow containment that disables sticky
  positioning;
- at `1180px` and below, the two columns stack and the Engine card returns to
  normal document flow with no internal height limit.

Acceptance checks:

1. On desktop, scroll through a long Face or Character attribute form and verify
   that Engine and Generate remain visible.
2. Verify that the Engine card ends at its own content when the Attribute card
   is taller.
3. Expand Comparison beyond one viewport and verify the Engine card can scroll
   internally.
4. At tablet/mobile width, verify the card is not sticky and does not cover the
   attribute form.

## 15. Studio Working Collection and Two-row Recent Grid

The Studio queue column restores the compact Vanilla working-collection
workflow without reviving legacy global state:

- a reusable React `WorkingCollectionToolbar` appears above Recent generations;
- the toolbar loads only the active actor's Collections through the canonical
  Collection API and actor-scoped TanStack Query key;
- selecting `All Images` or one Collection changes the Recent-history request's
  `collectionId`; filtering must occur on the server rather than by leaking or
  combining another actor's browser data;
- the toolbar shows the selected Collection's image count and provides `+ New`,
  `Edit`, and `Share Collection`;
- creating a Collection selects it as the active filter after the API succeeds;
- Edit is disabled for `All Images`;
- Share is disabled for `All Images` and empty Collections, and otherwise uses
  the existing Community Collection publish dialog and server policy;
- selecting a Collection does not silently add future generations to it.
  Membership remains an explicit action in the shared Collection picker;
- Recent generations requests at most 12 thumbnails and displays six columns by
  two rows on desktop, adapting to fewer columns at narrow widths;
- an empty selected Collection retains the toolbar and shows a compact empty
  state instead of removing the whole Recent section.

Implementation ownership:

- `web/src/components/collections/WorkingCollectionToolbar.tsx`
- `web/src/components/collections/CollectionEditorDialog.tsx`
- `web/src/features/studio/components/StudioRecentGenerations.tsx`
- `web/src/styles/studio.css`

Acceptance checks:

1. Select a Collection and verify only its images appear in Recent generations.
2. Select All Images and verify the actor's latest images return.
3. Create a Collection and verify it becomes the active empty filter.
4. Edit the active Collection and verify the dropdown refreshes.
5. Verify Share is available only for a non-empty selected Collection.
6. With 12 or more history items, verify exactly two rows of six thumbnails on
   desktop and a responsive multi-row grid on mobile.
