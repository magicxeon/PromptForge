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
