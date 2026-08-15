# Multi-Output Generation Groups And Shared Result Grid

**Requirement ID:** REACT-GEN-018  
**Status:** Implemented; automated, browser and manual validation pending  
**Owner:** Generation capability  
**Consumers:** Studio, Scene Builder and Playground  
**Depends on:** Requirements 009, 016 and 017; Credits, Queue, History,
Reference Processing and shared media viewer contracts

## 1. Goal

Allow a user to request between one and four image variations from one normal
generation action. The estimate, reservation, Queue, progress, partial failure,
History and result display must describe the same output count.

The result UI must use one shared responsive media grid across Studio, Scene
Builder and Playground so layout, Lightbox and per-image actions are corrected
once rather than separately in each route.

## 2. Scope

Included:

- normal single-model generation in Studio, including Face Creation, Character
  Sheet and Scene Builder;
- normal single-model generation in Playground;
- output count selection from 1 through 4;
- one server-owned Generation Group with one child Job per requested output;
- group and per-image Queue state;
- exact Credit estimate, reservation, capture and refund;
- partial success;
- shared 1-4 image result layout;
- per-image History, Collection, Share, Download and Lightbox actions; and
- actor-scoped draft persistence and lineage.

Explicitly excluded from the first delivery:

- Fashion Blueprint and Fashion runs;
- Comparison output multiplication;
- video output;
- more than four images;
- provider-native `n`/multi-image response contracts;
- automatic winner selection or image ranking; and
- ZIP/download-all behavior.

Fashion may adopt the shared media-grid primitive through a separate reviewed
requirement. This requirement must not change `FashionRun`, Fashion quotes,
Fashion operations or `FashionRunResults`.

## 3. User Experience

Add an `Images` numeric stepper to the shared Engine and Target Output panel.

- Minimum: `1`.
- Maximum: `4`.
- Default: `1`.
- Use minus/plus icon buttons and a stable numeric value; do not use four large
  text buttons.
- The control is visible only in supported normal generation mode.
- Comparison mode forces one output per enabled model slot and hides or disables
  this control with concise explanatory copy.
- Changing the count refreshes the visible Credit estimate before Generate.
- Generate remains unavailable while the estimate no longer matches the current
  count.
- The Generate button communicates the total number of images and total Credits
  without shrinking or losing its primary emphasis.
- Insufficient Credits uses the existing shared Credit modal.

The selected count belongs to the actor-scoped generation draft. A missing,
invalid or legacy value resolves to `1`. Actor switching must not leak it.

## 4. Canonical Request And Group Contract

The client submits one logical request:

```ts
type MultiOutputGenerationRequest = {
  // Existing provider, model, prompt, references and output settings.
  outputCount: 1 | 2 | 3 | 4;
  estimateId: string;
  idempotencyKey: string;
};
```

Generation creates one group and one child Job per image:

```ts
type GenerationGroup = {
  id: string;
  actorId: string;
  requestedOutputCount: number;
  status:
    | "queued"
    | "running"
    | "completed"
    | "partially_completed"
    | "failed";
  childJobIds: string[];
  completedCount: number;
  failedCount: number;
  estimateId: string;
  createdAt: string;
  completedAt?: string;
};
```

One child Job continues to produce one canonical result. Provider adapters do
not own output multiplication and must not receive a parallel feature-specific
batch contract.

The owning Generation workflow must:

1. validate actor, provider capability, references and `outputCount`;
2. compile/refine the logical prompt once;
3. create or reuse processed reference derivatives once per compatible plan;
4. obtain and reserve the locked total through Credits;
5. create the group and deterministic child idempotency keys;
6. enqueue one child Job per requested output;
7. aggregate child terminal states into the group; and
8. invalidate History and Credits once when the group becomes terminal.

Each child dispatch may produce a natural provider variation. The system must
not fabricate unsupported seed parameters or assume that every provider
supports native multi-output generation.

## 5. Credit Contract

The estimate and submitted group must match on:

- provider;
- model;
- resolution/aspect ratio;
- effective reference count;
- normal versus Comparison mode; and
- `outputCount`.

The displayed total is calculated by the canonical Credit Pricing service. The
client must not multiply a hard-coded per-image price.

Reservation and settlement:

- reserve the locked total once for the group;
- capture the authorized amount for each successfully completed child;
- refund/release the corresponding amount for each failed child;
- never charge twice when a group or child submission is retried with the same
  idempotency key;
- retain group and child correlation IDs in the Credit ledger; and
- expose `partially_completed` when at least one child succeeds and at least one
  child fails.

No Queue row or loading result should appear when validation or Credit
reservation fails before the group is accepted.

## 6. Queue And Polling

The shared Queue surface shows one compact group row with:

- overall status;
- `completed / requested` progress;
- failed count when non-zero; and
- expandable or compact child status indicators where useful.

The client polls one authoritative group endpoint, not four independent route
pollers. The group DTO includes enough child summaries to update the grid.
Polling uses the shared terminal-status policy and stops for `completed`,
`partially_completed` or `failed`. Dynamic status responses use `no-store`.

One child failure must stop that child's spinner immediately while remaining
children continue. Completed images remain visible during partial processing.

## 7. Shared Result Components

Introduce one presentation-level grid under the shared Generation component
owner:

```text
web/src/components/generation/
  GenerationResultGrid.tsx
  GenerationResultSurface.tsx
```

`GenerationResultGrid` receives normalized items and callbacks. It must not
import Studio, Playground, Fashion, provider, Queue or Credit APIs.

Suggested contract:

```ts
type GenerationResultGridItem = {
  id: string;
  imageUrl?: string;
  status: string;
  error?: { code?: string; message: string } | null;
  label?: string;
};
```

`GenerationResultSurface` remains the shared Studio/Scene/Playground workflow
surface. It maps a Generation Group into grid items and supplies existing
Download, History detail, Collection, Share and workflow actions.

Do not turn `GenerationResultSurface` into one oversized business coordinator.
Generation hooks own server state; the result surface owns composition; the
grid owns only item layout and interaction.

## 8. Grid Layout

Desktop and sufficiently wide tablet layout:

| Completed/active items | Layout |
|---:|---|
| 1 | one large image |
| 2 | one row, two equal columns |
| 3 | one row, three equal columns |
| 4 | two rows, two equal columns per row |

Rules:

- use stable CSS Grid tracks and explicit gaps;
- preserve each complete image with `object-fit: contain`; never crop generated
  output merely to fill a tile;
- use the Theme media backdrop for unavoidable letterboxing;
- keep every tile dimension stable while queued, running, completed or failed;
- a loading/error tile occupies the same grid position as its eventual image;
- three-image layout remains one row only where each item retains a usable
  inspection size;
- narrow screens may use two columns for 3-4 items and one column when needed;
- do not allow images, actions or error text to overflow the viewport; and
- reduced-motion preference disables non-essential transitions.

Transitioning from the empty/single result state to a multi-item grid may use a
short opacity/position transition so users understand that one request produced
several variations. Layout dimensions must not jump after image load.

## 9. Lightbox And Actions

- Clicking any completed image opens the existing shared Generation viewer at
  that item.
- Previous/next controls navigate only the current group in deterministic child
  order.
- Lightbox uses the original result asset, never a thumbnail.
- Download, Collection, Share, History detail and downstream reference actions
  operate on one selected child result.
- A failed tile exposes sanitized error information and correlation reference;
  it does not expose raw provider payloads.
- A partial group keeps all successful image actions available.

## 10. History And Lineage

Each successful child remains a normal History result with its own stable Job
ID. Every child also records:

- `generationGroupId`;
- zero-based `outputIndex`;
- requested output count;
- shared prompt/reference-plan fingerprint;
- provider/model and effective settings;
- estimate/reservation/capture/refund correlation; and
- terminal status and error reference.

Recent Generations may display children individually in the first delivery but
must preserve `generationGroupId` so grouped History presentation can be added
without data migration.

## 11. API And Schema Boundaries

- Add owning Zod schemas for group submission and status DTOs.
- Reject non-integer, missing-out-of-contract or greater-than-four counts at the
  server boundary.
- Do not trust a client-calculated price.
- Actor ownership is resolved through `req.actorContext`.
- Group and child repositories use the Generation capability and configured
  repository paths; routes do not mutate JSON directly.
- Keep response payloads bounded and use asset URLs rather than Base64 images.
- Existing single-output request compatibility normalizes omitted
  `outputCount` to `1` during migration.

## 12. Performance And Capacity

- Prompt refinement is executed once per logical group when enabled.
- Reference preprocessing and provider-safe encoding are reused where the
  provider plan permits; large Base64 buffers are not retained in browser state.
- Queue concurrency remains server-controlled. Requesting four outputs does not
  bypass global or actor limits.
- Poll one group instead of four child endpoints.
- Group status payload includes bounded child summaries only.
- Record queue wait, provider duration and total duration per child and group.

Before changing concurrency, measure queue wait and memory with four-output
groups according to Requirement 017.

## 13. Accessibility And Localization

- The count stepper has an accessible name, current value and disabled states.
- Icon buttons have tooltips and localized labels.
- Progress updates use restrained `aria-live` behavior without announcing every
  poll.
- Failed items expose readable text in addition to color/icons.
- Grid order and Lightbox navigation follow DOM/output order.
- Add keys to every enabled locale with interpolation parity.
- Verify English and Thai labels at desktop and mobile widths.

## 14. Automated Acceptance

Server/domain:

- output counts 1-4 create the exact number of child Jobs;
- 0, fractional and greater-than-four counts are rejected;
- omitted legacy count resolves to 1;
- estimate mismatch on output count returns `credit_estimate_stale`;
- duplicate group submission is idempotent;
- one failure plus successes produces partial completion and a proportional
  refund;
- all failures produce failed group status and full eligible release/refund;
- prompt refinement and reference planning are not redundantly recomputed per
  child; and
- actor isolation prevents another user reading the group.

React:

- Studio, Scene Builder and Playground use the same result grid;
- layouts match the 1, 2, 3 and 4 item contracts;
- queued/running/failed tiles do not resize the grid;
- a failed child stops animating while siblings continue;
- partial completion retains successful actions;
- Lightbox opens the selected original and navigates the group;
- Comparison does not expose output count above 1;
- actor switching clears the prior actor's output-count draft; and
- desktop/mobile/theme/reduced-motion rendering has no clipping or overlap.

## 15. Manual Verification

1. Generate 1, 2, 3 and 4 images in Studio using the same model and verify each
   layout, estimate and History record.
2. Repeat 2 and 4 images in Playground.
3. Open every image in Lightbox and use per-image Download, Collection and
   Share actions.
4. Force one child failure and verify partial status, stopped spinner, retained
   successful images and proportional Credit refund.
5. Force pre-enqueue insufficient Credits and verify no group/Queue row appears.
6. Enter Comparison mode and verify output count is fixed at one per model.
7. Verify desktop, tablet and mobile layouts in every supported Theme.
8. Confirm Fashion Blueprint behavior and DTOs are unchanged.

## 16. Implementation Record

The first delivery is implemented behind the existing Generation workflow:

- `GenerationApplicationService` validates counts 1-4, compiles/refines once,
  reserves the locked total atomically, creates one group and enqueues one
  canonical child Job per output.
- `GenerationGroupRepository` owns `server/data/generation/groups.json` and
  persists bounded child summaries so terminal failure/success survives route
  polling and process restart.
- Queue lifecycle persists group status and adds group/output lineage to History
  and Credit settlement metadata.
- `GET /api/generation-groups/:id` is actor-scoped and returns `no-store` group
  status; React polls only this endpoint and stops at a terminal group state.
- `EngineTargetPanel` exposes an actor-scoped 1-4 stepper in normal mode and
  normalizes Comparison to one output per model.
- `GenerationResultGrid` supplies the shared responsive 1/2/3/4 layouts used by
  `GenerationResultSurface` in Studio, Scene Builder and Playground. Completed
  children open the existing original-asset viewer and keep per-image actions.
- Fashion Blueprint DTOs and execution remain outside this implementation.

### 16.1 Character Sheet and Lightbox regression correction

The Reusable Model compatibility path must not collapse a normal Studio
request back to one output. A user-selected Character Sheet `outputCount` of
1-4 creates the same number of Generation Group children as Face Creation,
Scene Builder and Playground. Each child is still one canonical three-view
casting image; the internal Character casting-export workflow used by Profile
maintenance remains fixed to one output.

Every workflow action rendered inside `GenerationImageViewer` receives the
shared viewer-close callback. A successful Face handoff to Character Sheet,
Scene Builder or Playground closes both the destination dialog and its parent
viewer before navigation. This contract applies equally to a selected child
inside a multi-output result group.

Automated coverage was added in `test/generationGroup.test.js` and
`web/src/components/generation/GenerationResultGrid.test.tsx`. The requirement
must remain validation-pending until the repository Node suites and desktop/
mobile browser checks pass.

### 16.2 Shared idle and loading presentation

Studio, Scene Builder and Playground use one shared Generation presentation
for result placeholders and active output tiles:

- idle presentation uses the monochrome Momelo mark, centered title and
  description;
- active presentation uses one rotating `LoaderCircle` with the same subtle
  warning-color halo and expanding ring at every Generation result location;
- the halo is decorative, theme-aware and removed from the accessibility tree;
- failed and completed states stop the active animation immediately;
- reduced-motion preference disables the expanding halo animation;
- an empty result `Surface` fills the available result panel and centers its
  complete content vertically and horizontally instead of sizing only to its
  minimum placeholder height;
- a completed media result may return to content-driven height and must retain
  `object-fit: contain` inspection behavior.

Canonical shared owners:

```text
web/src/components/generation/GenerationStageState.tsx
web/src/components/generation/GenerationResultSurface.tsx
web/src/components/generation/GenerationResultGrid.tsx
web/src/components/ui/Surface.tsx
web/src/styles/generation.css
```

Regression checklist:

- [x] Idle Studio/Playground result fills the available panel and centers mark
  plus copy.
- [x] Pre-enqueue loading and queued result tiles use the same halo primitive.
- [x] Comparison loading uses the same halo primitive.
- [x] Failed tiles do not retain spinner or halo animation.
- [x] Surface fill/center behavior is opt-in and does not resize unrelated
  application surfaces.
- [ ] Desktop and mobile browser verification in all supported themes.
