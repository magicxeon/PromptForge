# Cinematic Studio Screen And Interaction Flow

**Status:** Six-stage responsive workspace and functional authoring interactions
implemented on 2026-08-17. Paid Storyboard/video/export controls remain visibly
disabled until canonical quote and qualified provider operations are connected.
**Owner:** Cinematic Studio React feature
**Primary role:** UX/UI Product Designer
**Reviewers:** Product And Requirement Architect, Cinematic Experience Director,
Generative Cinematic Production Director at the Produce handoff
**Skills:** `review-product-ux`, `design-cinematic-experience`;
`direct-generative-cinematic-production` at the approved-Shot execution handoff

## 1. Route And Shell

Canonical routes:

```text
/create/cinematic                         project list and new project
/create/cinematic/new                     setup
/create/cinematic/:projectId/:stage       six-stage workspace
/create/cinematic/:projectId/shot/:shotId focused shot editor
```

The workspace uses the current `AppShell`, route registry, breadcrumbs and
actor-scoped TanStack Query conventions. It must not introduce a second shell.

Before functional modules are connected, `/create/cinematic/new` exposes
clickable previews for Setup, Cast, Story Plan, Storyboard, Produce and Finish.
Fixture content is presentation-only; provider, quote, Generation, approval and
export commands remain disabled. Stage navigation may persist only the active
actor's recoverable local draft.

Desktop uses a compact stage rail, main work area and contextual project
summary. Mobile uses a top stage selector and a single-column flow. Stage
navigation remains available, but a user cannot skip an unmet approval gate.

## 2. Shared Component Reuse

When a media-generation operation renders `Engine & Target Output`, it uses the
same shared outer Generation shell as image Studio. The complete panel is
enclosed by the semantic action border, subtle
action-color gradient and theme-owned shadow. Cinematic must not copy this
yellow-border CSS into a route-local selector. Shared extraction first preserves
the existing Studio DOM contract and regression tests.

| Need | Reuse first | Cinematic extension |
|---|---|---|
| Character selection | existing Character cards/profile media | role badge and pinned-version state |
| Outfit upload/select | Asset/reference pickers | Character wardrobe assignment wrapper |
| Provider/quality | `EngineTargetPanel` and Generation command-region visual contract | typed video operation, duration, resolution, audio and capability filtering without changing the image defaults |
| Estimate/consent | current Generation estimate presentation and `CreditExhaustedDialog` | shared quote summary with per-Shot and project totals; calculation remains server-owned by Credits |
| Result loading | `GenerationStageState`, `Surface` and Generation result-state treatment | video poster, duration and operation metadata through a media adapter |
| Queue | `GenerationQueueStatus` and canonical polling policy | project/Scene/Shot grouping and partial completion |
| Media viewing | authenticated media viewer/stage contract | video transport controls, poster fallback and Shot actions |
| Async/error | `AsyncState`, `StatusNotice`, `Toast` | cinematic error codes and recovery actions |
| Confirmation | shared quote/credit and confirm dialogs | operation-specific breakdown |
| Options | shared visual/segmented controls | cinematic presets and director controls |

Shared components receive data and callbacks. They do not call providers,
Credits or repositories.

Generation controls are contextual, not permanently visible. Setup does not
show `Engine & Target Output` while the user is only writing or editing local
fields. A shared `Contextual Operation Dock` appears only when an AI operation
is available or in progress. Storyboard and Produce adapt the Studio generation
grammar inside the focused Shot workspace: target, estimate, primary action,
Queue/progress, result and attempt history. It must not create a second
submission model or imply that every stage uses the same provider/media type.

Before introducing a shared component, implementation must search the existing
owner and either extend it compatibly or extract a common presentation layer
with adapters. Copying JSX from an image surface into Cinematic is not reuse.

## 3. Stage 1 - Setup

### Required controls

- Project name with generated default.
- Format: Short Film; Series-lite hidden until enabled.
- Platform: TikTok, YouTube Shorts, Reels, multi-platform.
- Duration: 20/30/45/60 seconds.
- Story brief, maximum 600 characters for MVP.
- Optional Creative Direction text area after genre and story intent.
- Genre, audience feeling, pacing and ending intent.
- Cast planning mode: AI recommendation, solo, duo or manual role slots. Setup
  owns story roles only; actual reusable Characters are selected in Cast.
- Each role slot has a stable ID, label, required/optional importance, dramatic
  function and relationship hint. MVP supports at most four slots.
- Simple/Advanced mode. Simple is default.

### Story enhancement

- `Enhance Story` is optional and never overwrites the Story Brief directly.
- The result opens in a compare preview with Original and Enhanced versions;
  the user chooses `Apply`, `Edit before apply` or `Discard`.
- Enhancement returns structured premise, conflict, emotional arc, ending and
  candidate Scenes suitable for Story Plan input, plus the smallest viable set
  of required/optional Cast role slots, not only polished prose.
- The operation dock shows text model/routing mode, input summary, quote,
  balance impact and consent before submission. No video Engine panel appears.
- Manual writing, editing, applying or discarding text never consumes Credits.
- During provider qualification, live enhancement is explicitly marked
  `qualification_no_charge`. Customer-paid routing must remain unavailable
  until Credits owns a durable text quote/reservation/capture/refund contract;
  the UI must never display a fabricated fixed Credit amount.

### Interaction

- A rough non-binding Project range may update from duration and quality
  assumptions, but it is visually distinct from the exact enhancement quote.
- `Continue to Cast` saves the draft, validates required fields and focuses the
  first invalid field on failure.
- Autosave shows `Saving`, `Saved`, `Offline changes` or `Save failed`.

## 4. Stage 2 - Cast And Wardrobe

### Cast

- Bind approved Characters to the Setup role slots and assign one unique
  protagonist. Required slots block planning until assigned; optional slots do
  not. Projects without a role plan retain free-form Cast compatibility.
- Each Character owns one expandable Project dossier. The card summary shows
  canonical portrait, name, story role, personality tags, current wardrobe
  look, Scene count, apparent age and identity-pack readiness.
- The expanded dossier shows dramatic function, objective, motivation, fear or
  pressure, emotional baseline, relationships, dialogue/voice behavior,
  physical performance notes and immutable identity/apparent-age authority.
- Dossier fields are project direction, not edits to the reusable Character
  Profile. A pinned Character Version remains the identity source.
- Unavailable/private Characters cannot be selected.
- The selected Character Version is shown and pinned on approval.
- Selection opens a reusable modal with search and filters for owner/public
  scope, reuse eligibility, gender, supported age range and ethnicity values
  derived from the canonical Character/attribute contracts. Unsupported or
  unknown metadata remains selectable through `Other/Not specified`; filters
  must not infer protected traits from pixels.

### Wardrobe

- Wardrobe is edited only inside the selected Character dossier. There is no
  project-global or unassigned outfit upload control.
- Reusable Look creation, three-view preparation, approval, rights and
  versioning follow
  `013-cinematic-character-look-pack-and-cast-readiness.md`. Cinematic starts
  the workflow and binds an approved Look Version; it does not own a parallel
  wardrobe library.
- Each Character may own one or more named Looks. Every Look records
  `Character default`, `Wardrobe preset`, `Upload outfit` or approved AI
  suggestion, plus front/back references, coverage, accessories, Scene scope,
  change reason and continuity lock.
- `AI suggest wardrobe` is an optional fourth path. Suggestions are presented
  for review and never replace a selected/uploaded outfit without Apply.
- Upload uses existing front/back reference behavior; back remains optional
  unless a planned shot explicitly requires back fidelity.
- A selected outfit shows source, coverage and warnings.
- Continuity choice: entire film, by scene, or intentional change.
- Story Plan and Storyboard bind a Character assignment and explicit Look ID;
  they never infer which uploaded outfit belongs to a Character.

### Cast layout

- The empty Cast workflow exposes one primary Add Character action. Two controls
  that open the same picker are not separate workflows and must not be shown as
  competing actions.
- Left/main: Character dossier cards with Add Character and role/status scan.
- Right/detail: selected Character's Role & Personality, Performance Direction,
  Relationships, Scene Commitments and Wardrobe Looks.
- Upload/replace outfit opens from a named Look in that selected dossier and
  returns to the same Character context.
- Simple mode shows guided role, three personality traits, objective and one
  primary Look. Advanced mode expands relationships, fear/pressure, dialogue,
  physical behavior, per-Scene Looks and continuity overrides. Switching modes
  never deletes hidden values and does not change output quality.

### States

- Missing identity pack, unsupported reference count, private Character,
  invalid outfit and upload failure each show a direct recovery action.
- Continue is disabled only for a blocking state; warnings remain reviewable.
- Character browsing, existing-asset selection, upload and manual assignment do
  not consume Credits. AI wardrobe suggestion, reference analysis or generated
  wardrobe concepts use distinct quoted operations in the contextual dock.
- Character-picker selection is visible and accessible, card media prefers the
  canonical/profile face, results are server-paginated, and the confirmation
  footer remains reachable while results scroll, as defined by Requirement 013.

## 5. Stage 3 - Story Plan

Story Plan expands the accepted Story Brief/Enhanced Story into director-ready
structure. The main screen stays scannable; each Scene opens a focused dialog
or route for complete direction rather than compressing production detail into
one summary card.

- Beat cards: setup, development, turning point, climax, ending.
- Scene cards nested under beats with location, time, cast and purpose.
- Estimated duration and shot count update deterministically.
- User can reorder scenes, edit intent, split, merge or regenerate one scene.
- Expanded Scene direction includes narrative purpose, cast and wardrobe,
  location/time, blocking, camera/framing/movement, lighting, performance,
  emotion, dialogue/audio intent, props, continuity entry/exit and estimated
  duration.
- `Generate plan`, `Expand Scene`, `Rewrite Scene` and director suggestions are
  separately identifiable billable operations with their own quote. Manual
  editing, reorder, split/merge and review do not consume Credits.
- `Regenerate plan` never overwrites approved edits without confirmation.
- A version comparison shows changed scenes before replacement.
- `Approve story plan` creates the immutable input version for Storyboard.

## 6. Stage 4 - Storyboard

### Main layout

- Use three desktop lanes: compact Scene navigator on the left, Storyboard
  board and focused Shot editor in the center, and a sticky generation panel
  on the right. The right panel follows document scroll but stops below the app
  header; it never covers the Scene or Shot content.
- The center board presents Shot cards as a readable visual sequence rather
  than a settings list. Desktop uses two cards per row, compact widths use one,
  and ordering remains unambiguous in both layouts.
- Every Scene header shows total planned duration and Shot count. Every Shot
  card shows its own duration in seconds beside the Shot number. Scene duration
  is the deterministic sum of current Shot durations and updates immediately
  after duration edit, insert, remove, split, merge or reorder.
- Shot cards remain in narrative order and support pointer drag, keyboard move
  earlier/later, insert, duplicate, edit and remove without nested interactive
  controls or loss of focus.
- Selected Shot receives a full focused workspace in the center lane, reachable
  without losing Scene/board scroll context. It contains storyboard result,
  editable final prompt, structured direction, composition, camera, movement,
  performance, dialogue/audio intent, duration and continuity.
- Because a Storyboard may contain many tall preview cards, the center lane
  exposes two explicit in-page navigation actions. `Edit selected Shot` appears
  with the Storyboard sequence heading and moves focus to the selected Shot
  editor. `Back to Storyboard sequence` appears at the focused editor heading
  and returns to that Shot card in the board. Both actions preserve selected
  Scene and Shot identity; neither changes data or starts generation.
- These navigation actions use stable element targets derived from Scene and
  Shot IDs, update the URL fragment or equivalent route-owned anchor state, use
  smooth scrolling only when reduced motion is not requested, and move
  programmatic focus to a semantic heading after scrolling. Browser Back,
  refresh and keyboard activation must not strand focus or select another Shot.
- Project summary shows cast, wardrobe locks, duration and current estimate.

### Shot card

- Storyboard image or intentional placeholder.
- shot number, scene, duration and purpose;
- Characters/wardrobe and continuity warnings;
- quote/status indicator;
- edit, regenerate still, duplicate and remove actions.
- provider/model or qualified quality tier, output count, exact Shot quote and
  inspectable Scene subtotal;
- `Generate`, `Regenerate`, `Compare attempts` and `Reset to director default`.
  Reset changes only the current unsaved prompt/direction and never deletes
  previous Assets, attempts or financial history.

Storyboard generation supports a Project default provider/model, a Scene-level
override and an optional Shot override. Changing a cost-bearing value makes the
current quote stale. Batch generation quotes only selected eligible Shots and
shows per-Shot costs before consent.

### Storyboard generation command group

The prompt, image result, reset and Shot direction stay in the center editor.
The sticky right command group contains generation scope (`Selected Shot`,
selected Shots or `All eligible Shots`), image provider, model, aspect ratio,
output count, eligible/blocked summary, exact Credit estimate and
`Generate storyboard`/`Generate eligible set` action. Provider/model and the
Generate action remain in the same bounded group, but the long-form creative
prompt does not compete for space inside that compact sticky panel.

After the server accepts the command, move scroll and status focus to the
selected Shot result in the center editor. A validation or quote error remains
at the sticky command group and must not move focus.

The result region reuses the shared Generation presentation: Momelo mark and
empty copy before a result exists, the shared amber pulse/spinner while any
child is active, terminal error/retry presentation, result grid, viewer and
attempt actions. Batch results use the existing one-to-four result-grid rules
per visible page/group and expose aggregate progress without hiding successful
children.

`All eligible Shots` is an explicit batch mode, not an implicit side effect.
It lists selected Scene/project scope, eligible count, blocked count, per-Shot
breakdown and total estimate before confirmation. Approved or already-active
Shots are excluded unless the user deliberately chooses regenerate.

### Approval

`Lock storyboard` validates protagonist presence, duration budget, continuity,
reference capability and shot ordering. It pins Story Plan and Continuity Lock
versions. Unlocking requires confirmation and marks downstream drafts stale;
it does not delete them.

Approving a Storyboard result pins one immutable Storyboard Asset Version for
that Shot. Produce never consumes an unapproved preview, a mutable thumbnail or
whichever attempt happens to be latest. A Shot with no approved Storyboard
Asset Version is ineligible for video generation and receives an `Approve or
fix storyboard` recovery action.

## 7. Stage 5 - Produce

- Filter by scene and state: not generated, queued, processing, needs review,
  approved, failed.
- Batch selection quotes only eligible selected shots.
- Each shot shows storyboard, latest clip, attempt history and continuity source.
- The approved Storyboard image is the visible source of truth for the selected
  Shot. Its source card shows approval state, immutable version, generation
  attempt and a prominent `Edit storyboard source` action.
- The selected Shot workspace shows video preview, provider/model, duration,
  resolution, audio capability, exact quote and each prior attempt.
- Opening a result uses the shared media viewer with play, pause, seek, mute,
  download, compare, approve, reject and regenerate.
- `Regenerate` offers a concise reason: identity, wardrobe, motion, framing,
  continuity, artifact or custom note. It creates a new attempt.
- Progress is operation-based and terminal errors stop polling/spinners.
- Partial batch completion remains usable; failed shots do not hide successes.

### Produce generation command group

Produce follows the same interaction grammar as Storyboard while remaining a
separate video operation. The temporal prompt, approved Storyboard source and
video result stay in the center editor. The sticky right command group contains
`Selected Shot`/selected Shots/`All eligible Shots`, video provider/model,
duration, resolution and supported audio controls, eligible count, exact Credit
estimate and Generate action. The video result region reuses the shared Momelo
empty state and amber loading indicator before rendering the player and attempt
history.

`Generate eligible set` includes only Shots with an approved Storyboard and
valid continuity/reference plan. The confirmation shows the total estimate and
per-Shot provider/model/duration breakdown. Storyboard-image and Produce-video
provider controls are never mixed across stages, even though both stages reuse
the same command-group and result-state components.

### Storyboard source correction from Produce

- `Edit storyboard source` returns to Stage 4 with the same Scene and Shot
  selected, scrolls to the focused Storyboard editor and places focus on its
  heading. The return location to Produce is retained so the user can come back
  to the same Shot after review.
- If the user leaves without changing the approved source, Produce restores the
  existing clip and approval state unchanged.
- Approving a different Storyboard Asset Version marks only video attempts and
  timeline/export drafts that consumed the previous source as `source_changed`.
  Historical media, attempt review, Credit settlement and audit data remain
  available and immutable.
- A stale clip may be played and compared as history but cannot remain the
  current approved Produce result, enter a new final export, or make the Shot
  eligible for completion. The UI shows old and current source versions and a
  `Generate from updated storyboard` recovery action.
- Returning to Produce restores the same Scene and Shot, displays the updated
  Storyboard source, invalidates any quote calculated against the old source,
  and keeps Generate disabled until a fresh exact quote is available.
- Updating one Shot does not invalidate unrelated approved Shots or regenerate
  them implicitly.

## 8. Stage 6 - Finish And Export

- Ordered clip strip with drag reorder and keyboard reorder.
- In/out trim; MVP transition set: cut, dissolve, fade.
- MVP includes clip order, trim, cut/dissolve/fade, preview and export only.
- Music, subtitle authoring, voice-over, advanced audio mixing and keyframe
  editing are deferred and must not block the first export workflow.
- Timeline warnings identify gaps, overlaps, stale clips and duration overflow.
- Final render quote lists assembly and export separately when they are separate
  billable operations. Browser-only arrangement and trim do not consume Credits.
- Completed export opens in shared media viewer with download and `Share` as a
  separate optional action.

## 9. Global State Matrix

### Project Cost Summary

A shared, compact Project Cost Summary remains reachable from every stage and
does not replace operation consent. It shows `Spent`, `Reserved/Processing`,
`Estimated next action`, `Refunded` and net Project total. Expanding it groups
immutable entries by Stage, Scene, Shot and attempt, with quote/Job/support
references where authorized. Estimates are never added to spent totals, and
previously captured Credits are never charged again in a later quote.

The summary supports two terminal actions after a valid export:

- `Complete Project`: close production, create a final cost statement and keep
  the Project readable/duplicable;
- `Continue as Series`: create a proposed Series Bible from approved Story,
  Character versions, wardrobe, world, visual language and continuity. The
  user reviews before creating the Series; no automatic public sharing occurs.

### Responsive screen composition

**Desktop:** compact six-stage rail, primary workspace, optional contextual
inspector/dock and a collapsed Project cost bar attached to the workspace edge.
The dock must never reduce the primary editing canvas below a usable width.

**Mobile:** one stage at a time; inspector and operation dock open as a bottom
sheet; Project cost is a compact sticky summary above the primary action. Scene
and Shot navigation uses an explicit list/back pattern. No horizontal desktop
panel is merely shrunk until labels or media become unreadable.

### Focused surfaces

- Character picker is a modal/dialog because selection returns to Cast context.
- Scene Director uses a large dialog on desktop and full-screen sheet on mobile.
- Shot editing uses the canonical focused Shot route when prompt, attempts,
  provider configuration and media cannot fit without nesting scroll regions.
- Closing a focused surface restores keyboard focus, selected record and scroll
  position to the originating card.

### Feedback and notifications

- Inline validation stays beside the field or operation that owns recovery.
- Toast confirms non-blocking save, apply, approval, export and cancellation;
  it never replaces quote consent, insufficient-Credit or destructive confirm.
- Progress remains in the operation dock/result surface after a modal closes and
  exposes a stable support reference on failure.
- An operation reaching failure, cancellation or partial/completed terminal
  state stops every spinner and polling indicator.

Every stage must render:

- initial/loading;
- empty with one primary action;
- ready/draft;
- saving/saved/save failed;
- validation warning/blocker;
- permission denied/private source;
- quote loading/stale/insufficient Credits;
- queued/processing/partial/completed/failed/cancelled;
- stale downstream content after upstream edits;
- recoverable orphan with Support reference.

No spinner may remain after a terminal status.

## 9.1 Draft persistence and restoration

- Setup, active stage, uncommitted story edits, expanded inspector, selected
  Scene/Shot, filters and scroll-return target may be saved through
  `web/src/lib/persistence/actorScopedStorage.ts`.
- Use a versioned `cinematic-project:<projectId>` feature key. A new unsaved
  project uses a stable client draft ID until the server returns its Project ID.
- Actor switching must never restore another actor's draft.
- Do not put signed media URLs, Base64, provider payloads, accepted quotes,
  balances, Job truth or approval truth in `localStorage`.
- On resume, server state wins for committed records. Compatible local changes
  are offered for restoration; version conflicts require user choice and must
  not overwrite silently.
- Completed submission state is restored from TanStack Query/server APIs, not
  from browser booleans.

## 10. Accessibility, Theme And Responsive Rules

- Use semantic headings, labels, focus order and `aria-live` for async status.
- Do not encode shot or approval state by color alone.
- Focus moves only after user-triggered stage/section expansion.
- Media controls are keyboard operable and have accessible names.
- Theme tokens come from the active user theme; no Cinematic-local palette.
- Provider, estimate, Queue, result and viewer controls must render correctly
  under Momelo Neon, Pearl Editorial and Electric Studio using semantic tokens.
- At 360px width, cards become a list and inspectors become drawers; text and
  controls must not overlap.
- At desktop width, the main storyboard/timeline remains the visual priority,
  not decorative cards.

## 11. UX Acceptance

- First-time completion requires at most six primary Next/Approve transitions.
- User can identify current stage, blocked requirement and next action without
  reading explanatory feature copy.
- Leaving and returning restores selections and scroll context.
- Removing a Character explains affected scenes before mutation.
- A paid action always presents exact output count and cost before confirmation.
- Viewer, queue, loader, toast, Character and media behavior remains consistent
  with existing Studio surfaces.
