# Fashion Blueprint UX Review And Production Results Experience

**Parent:** `000-master-fashion-blueprint-roadmap.md`
**Status:** Requirement ready for UX/UI expert review; implementation pending
**Owner:** Fashion Blueprint React feature with shared Generation UI dependencies

## 1. Purpose

Fashion Blueprint already proves the four-decision workflow:

```text
Template -> Character -> Outfit -> Review
```

The next iteration must make the Review and generation experience easier to
scan, visually separate decisions from execution, and show work progressing
without introducing a Fashion-only queue or result pipeline.

This requirement is intentionally written as an expert UX/UI work order. A
qualified product designer or UX/UI implementation agent must complete the
review evidence in section 4 before changing the interface.

## 2. Business Requirement

A non-technical fashion seller must be able to:

1. understand the current Blueprint step immediately;
2. distinguish quality selection, optional advanced settings, price, queue and
   outputs without reading provider terminology;
3. submit all valid outfits and see that work has started;
4. return to recent Fashion outputs without leaving the workflow;
5. understand empty, queued, processing, partial, completed and failed states;
6. use the same queue and generation feedback language already learned in
   Studio and Playground.

The page must remain compact and media-first. Visual separation must come from
hierarchy, spacing, surface shade and semantic borders, not from adding cards
inside cards.

## 3. UX/UI Scope

### 3.1 Consistent rounded geometry

- Fashion Blueprint panels, form controls, buttons, upload zones, result items
  and setup summaries must not expose unintended square corners.
- Use shared radius tokens rather than scattered numeric values.
- Primary panels use the design-system section radius, normally `8px`.
- Form controls and buttons use the shared control radius, normally `10px`.
- Media itself may use a smaller radius where a full-bleed preview needs a
  crisp editorial edge.
- Nested containers must not each add decorative borders and radii. One clear
  owning surface is preferred.

### 3.2 Review information architecture

Step 4 becomes three visually distinct regions:

```text
Generation setup
  -> Simple quality tier: Draft/Proof / Selling Quality / Premium Campaign
  -> Advanced settings trigger
  -> Expanded shared Engine & Target Output, when requested

Price and confirmation
  -> run purpose
  -> operation count
  -> Template fee and generation credit breakdown
  -> locked maximum
  -> Calculate / Generate

Fashion production
  -> shared queue progress
  -> empty / processing / partial / completed states
  -> grouped outputs and recent Fashion work
```

Quality tiers and Advanced settings belong to one `Generation setup` group.
Advanced is progressive disclosure inside that group, not a detached peer card.
The three quality choices must remain mutually exclusive and must explain the
customer outcome rather than emphasizing provider names.

### 3.3 Surface contrast and theme parity

- Adjacent Review regions must use distinguishable semantic theme surfaces:
  base, raised, selected and media backdrop.
- Selected quality receives semantic Primary emphasis plus a non-color state
  marker.
- Quote/price uses the credit semantic accent without competing with Generate.
- Queue uses status colors only for state: info, active, success, warning and
  failure.
- Momelo Neon, Pearl Editorial and Electric Studio must each preserve readable
  contrast. No Fashion component may hard-code black, white, Cyan or Magenta in
  a way that breaks another theme.
- The expert review must include screenshots at desktop and mobile widths in
  all three themes before acceptance.

### 3.4 Step navigation shade

The connected `01 Template`, `02 Character`, `03 Outfit`, `04 Review` arrow
stepper remains one reusable component. Its neutral, completed and current
steps should progress through subtle shades so the bar is not visually flat.

Rules:

- current step remains the strongest semantic Primary state;
- completed steps use progressively resolved theme shades;
- future steps remain lower contrast but readable;
- the existing 4px joint gap and unclipped label contract remain intact;
- shade is not the only status signal: number, label and state semantics remain;
- horizontal overflow remains available on narrow viewports.

### 3.5 Fashion production surface

Rename the current customer-facing `Fashion Result` label to
`Fashion production` in English and an equivalent natural Thai phrase. The
final localization wording is part of the UX review.

Before a run:

- show the same Momelo monochrome mark and stable empty-result dimensions used
  by shared Studio/Playground generation presentation;
- explain that generated outfits will appear here;
- do not render fake queue rows or contradictory completed copy.

After Generate:

- smoothly scroll to the `Fashion production` anchor after the server accepts
  the run, not before credit/plan acceptance;
- focus the production heading without trapping keyboard focus;
- respect `prefers-reduced-motion` by using an immediate jump;
- display active queue/progress at the upper-right of the production region on
  desktop and directly below the heading on narrow screens;
- show an active progress icon and polite live status using the shared
  generation status behavior;
- report overall and per-outfit progress;
- retain successful results during partial failure.

Do not create a Fashion queue component. Extend or adapt the normalized item
contract of:

```text
web/src/components/generation/GenerationQueueStatus.tsx
```

The shared component must accept Fashion operation items without learning
Fashion pricing, ownership or provider behavior.

### 3.6 Recent Fashion images

Show recent Fashion outputs without consuming another full page band:

- desktop: a compact collapsible `Recent Fashion images` module in the right
  `Your setup` rail below the current setup/quote summary;
- mobile: place it after the Fashion production surface;
- use actual successful Fashion outputs for the active actor only;
- show up to six compact previews initially and link to the actor's filtered
  image/history view for the full list;
- selecting a preview opens the shared image viewer/detail route;
- empty history hides the preview grid and shows one concise empty state;
- a newly completed output appears through TanStack Query invalidation, not by
  manually duplicating run state.

## 4. Mandatory UX/UI Expert Review

Before implementation, the assigned expert must produce a short review note in
the implementation pull request or requirement update containing:

1. **Heuristic audit:** visibility of status, match to user language, error
   recovery, progressive disclosure and prevention of accidental Batch cost.
2. **State inventory:** empty, calculating, quote-ready, submitting, queued,
   processing, partial, completed, failed, expired quote and insufficient
   credit.
3. **Hierarchy map:** one annotated desktop layout and one mobile layout showing
   Generation setup, Price and confirmation, Fashion production, queue and
   recent work.
4. **Theme matrix:** surface/border/text/selected/status token use for all three
   themes.
5. **Interaction review:** scroll/focus behavior, keyboard order, reduced
   motion, loading announcements and retry paths.
6. **Copy review:** natural Thai and English labels with no raw enum, provider
   or internal operation terminology in Simple Mode.

The expert may refine spacing and responsive composition but must not add
mandatory workflow steps or a second generation pipeline.

## 5. Component And State Design

Fashion generation uses the same visual processing language as Studio and
Playground: the monochrome Momelo mark for an idle result, a rotating
`LoaderCircle` for active work, a compact operation queue with completed/total
progress, and an explicit failed state with a support/correlation reference when
available. The Generate action and result surface both expose progress so a user
never has to infer whether a batch is running. Polling remains server-owned and
refresh-safe through the persisted Fashion run id.

### 5.4 Reusable Template publication lifecycle

`Publish as a reusable Template` is a controlled disclosure inside Share to
Community:

- unchecked collapses every Template-only control;
- unchecking it clears all selected replaceable inputs and every `Required`
  flag;
- unchecking one replaceable input also clears and disables its matching
  `Required` flag;
- re-enabling Template publication does not silently restore cleared required
  inputs; the creator makes the selection explicitly;
- image-only publication never creates a Template version or preparation job.

After reusable Template publication succeeds, the same user journey continues
directly to Edit Shared Template. The client automatically requests the locked
pose-proxy preparation estimate and displays the confirmed credit amount. Credit
is spent only after the creator confirms that amount. Preparation then uses the
canonical reservation and Queue pipeline, with duplicate submission disabled,
active progress, retryable failure and a support correlation reference.

Published Templates use soft lifecycle management. A creator may `Retire
Template`; this changes the Community post to `owner_unpublished`, makes it
private and removes it from Community and Fashion discovery. Immutable versions,
usage history and credit audit remain intact. The owner still sees the retired
item in their own Profile with a muted card and `Retired` status. Hard delete is
reserved for an unpublished draft that has no version, usage or ledger history.

### 5.5 Shared toast notifications

Save, publish, preparation-start, preparation-failure and retire outcomes use
one application-level toast provider rather than route-local banners alone.
Toasts appear at the lower right on desktop and below the global header on
mobile, use the active Theme, remain keyboard accessible and expose a close
button. Success and informational notices auto-dismiss; actionable errors remain
long enough to read. Inline errors remain present for form correction, so a
toast never becomes the only error record.

### 5.1 Fashion-owned orchestration

The following behavior belongs under:

```text
web/src/features/fashion-blueprint/
```

- Review section composition;
- normalized mapping from `FashionRun.operations` to shared queue/result items;
- Fashion production anchor and accepted-run scroll trigger;
- recent Fashion query and right-rail placement;
- quality and run-purpose customer copy.

Extract route sections only when the extraction creates independently testable
ownership. Expected candidates are:

```text
components/FashionReviewSetup.tsx
components/FashionProductionSurface.tsx
components/FashionRecentResults.tsx
```

These are target owners, not permission to create empty wrapper components.

### 5.2 Shared owners

Reuse or extend:

```text
web/src/components/generation/GenerationQueueStatus.tsx
web/src/components/generation/GenerationResultSurface.tsx
web/src/components/media/
web/src/components/ui/Surface.tsx
web/src/components/ui/Button.tsx
web/src/styles/tokens.css
web/src/styles/themes.css
web/src/styles/fashion-blueprint.css
```

Shared components receive normalized status, items, labels and callbacks. They
must not import Fashion API modules.

### 5.3 Server and query ownership

- `GET /api/fashion-blueprints/runs` remains the actor-owned recent-run source.
- If the current summary cannot provide usable preview records, extend the
  Fashion run DTO and Zod schema rather than reading generation JSON directly.
- Poll one authoritative Fashion run query while active.
- On terminal status, invalidate Fashion recent runs, History, Credits and
  relevant Collection queries once.
- Do not save recent output copies in localStorage.

## 6. Implementation Plan

1. Complete the expert review evidence from section 4 and record any approved
   deviations.
2. Add semantic Fashion section/step/status tokens only where shared theme
   tokens cannot express the design.
3. Refactor Step 4 into Generation setup, Price and confirmation, and Fashion
   production regions without changing quote/run contracts.
4. Normalize Fashion operations into the shared queue item contract and extend
   `GenerationQueueStatus` only as needed for generic multi-operation work.
5. Add empty, active, partial, completed and failed Fashion production states
   using the shared Momelo mark/status primitives.
6. Scroll/focus to Fashion production only after a run is accepted.
7. Add the compact actor-owned recent Fashion results module using the existing
   runs/history API and shared media viewer.
8. Add i18n keys to every enabled locale with interpolation parity.
9. Add component tests for grouping, status, scroll trigger, reduced motion,
   query invalidation and actor switch.
10. Perform desktop/mobile/theme visual validation and update requirement
    evidence before marking complete.

## 7. Acceptance Criteria

- Every visible Fashion panel/control has deliberate token-owned corner
  treatment and no accidental square edges.
- Quality tiers and Advanced settings read as one Generation setup group.
- Review regions remain visibly distinct in every theme.
- Step arrows have progressive shade, a 4px joint gap and no clipped text.
- Accepted generation moves the user to Fashion production.
- Empty state uses the Momelo mark; active work uses the shared progress
  language and animation.
- Queue shows overall and per-outfit state without a duplicated Fashion queue
  implementation.
- Partial success keeps completed images visible.
- Recent Fashion images are actor-scoped, compact and refresh automatically.
- Desktop, mobile, Thai, English, keyboard and reduced-motion checks pass.

## 8. Validation

Automated coverage must include:

```text
Fashion Review quality/Advanced grouping
Fashion operation -> shared queue item normalization
no queue before accepted run
accepted run scroll/focus behavior
partial and completed operation rendering
recent Fashion result actor isolation
theme class/token parity
i18n catalog parity
```

Manual validation must cover approximately `1440px` and `390px` in Momelo
Neon, Pearl Editorial and Electric Studio.
