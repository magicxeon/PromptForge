# Character Highlight Polish Implementation

Owner: Profiles. Requirement: `../012-character-highlight-polish.md`.
Status: Implemented; focused checks passed. Final live-data visual acceptance
remains conditional while localhost:6500 is unavailable. No paid execution.

## CHP-01 Header Gallery Identity

1. Extend existing characterDiscoveryModel with an exact public Gallery-source
   selector; preserve regular card fallback semantics. Remove the now-unused
   face-preference parameter only after checking all callers.
2. Header selects up to four eligible Gallery identities. Preserve profile links,
   labels, empty state and actor-filtered directory ownership.
3. Increase circles/rings with bounded responsive tracks. Add upper-right theme
   wash fading to lower-left with no global style mutation.
4. Update helper/Hero tests and the existing isolated fixture source metadata.
   Test casting-sheet exclusion, missing gallery media, bounds and return state.
5. Gate: cards and gallery suites; build then inspect a live desktop screenshot.

## CHP-02 Featured And Discovery Presentation

1. Change only spotlight variant framing: portrait contain, full-height image
   column, footer below details; stacked bounded media on mobile.
2. Add localized non-functional Follow/Video Coming soon elements and Image badge
   in spotlight only. Keep default cards, actual destinations and permissions.
3. Extend existing Create action with opt-in name label, preserving menu/events.
4. Reuse MediaStage for full public Moment images; captions move below the image
   while keeping links, attribution, local states and bounded query behavior.
5. Scope rounded buttons and grouped Discover gradient to Character Gallery.
   Preserve catalog/tutor/Studio CTA order and independent errors.
6. Gate: affected card/spotlight/action tests and existing handoff regressions;
   build, live mobile/tablet/desktop review before final acceptance.

## CHP-03 Verification And Requirement Reconciliation

1. Extend only Characters branch in the existing visual script for image-source
   parity, circle size/ring, gradient, contain framing, desktop footer/image
   separation, mockup disabled state and existing viewport/keyboard checks.
2. Run cards/gallery/handoff/contracts separately via
   `node scripts/test-character-discovery.mjs --part=<group>`.
3. Run `npm run test:community-layout -- --scope=characters --locale=en --screenshots`
   and the same with `--locale=th` against live localhost:6500. Use --fixture only
   if unavailable, clearly reporting remaining live gate.
4. Run scoped lint, i18n validation, build and diff check. Record image source,
   screenshot evidence and bounded request footprint; no provider requests.
5. Update parent/source trace to distinguish completed polish from social/video
   mocks and still-pending backend capabilities. Do not close pending rankings.

## Evidence

| Step | Status | Evidence |
|---|---|---|
| CHP-01 | Implemented; focused and fixture gates passed | 9 cards + 14 gallery tests; production build; 9 fixture viewport/theme combinations. Header screenshot inspected in community-page-layout-iuvkC4. Live server stopped after initial baseline; user notified. |
| CHP-02 | Implemented; focused gates passed | 10 cards + 14 gallery + 18 handoff tests. Featured contain/media-column, named CTA, upcoming controls, Moments captions and Discover theme band implemented. Fixture inspection found a mobile media-width gap; fixed with explicit width and a browser regression assertion. |
| CHP-03 | Conditional pass | All 47 focused tests, locale validation, scoped ESLint, syntax checks, production build and diff check passed. Final EN/TH fixture reruns after the mobile-width correction passed all 18 viewport/theme/locale combinations. Final live data check remains pending; health endpoint returns ECONNREFUSED. |

## Final Visual Evidence (2026-09-06)

- EN screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-NiQoFh`.
- TH screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-6QWioi`.
- Viewports: 390, 820, 1440. Themes: default, fashion, creative. Both locales
  passed the same geometry, media-source and existing navigation assertions.
- Inspected mobile full-width portrait and ring spacing, tablet light-theme
  layout, desktop dark themes, Featured/caption separation and page-wide flow.
  The synthetic fixture's first image is a portrait, not a full-body original;
  this proves preserved framing, not the presence of legs in arbitrary sources.
- EN fixture initial sample: 44 requests, 5 media, 1,722,529 declared bytes.
  TH: 51 requests, 5 media, 1,844,653 declared bytes. These are fixture/browser
  observations, not comparable to the live baseline as a speed improvement.
  Actual full-original Moment image bytes vary; cap remains three images and
  one existing works query. No polling, new cache or per-circle API query.
- Final live health check still returned ECONNREFUSED. No backend workers were
  started for CSS validation. The pre-polish live baseline is not a substitute
  for this remaining live verification gate or user design acceptance.

## Protected Behavior And Review

- No blocking regression found in scoped source/test review. Review is by the
  same agent applying UX then QA roles sequentially, not an independent reviewer.
- Public source tags, profile/post return links, creator attribution, filters,
  pagination and local loading/error states remain owned by the existing APIs.
- Existing shared CharacterCard and Profile/handoff tests remain in the focused
  groups. Destination authorization, duplicate-call and stale-actor protection,
  public/private projection and canonical server snapshots passed unchanged.
- No generation, provider, Credit, approval, landing, comparison, persistence or
  schema change. No files moved and no runtime data paths introduced.
- New documents are requirement 012 and plan 017 under the existing Community
  requirements owner. Existing Profiles components/CSS and test fixture/script
  were extended; no new capability or parallel workflow was created.
- Follow/social, actual video media and rankings remain Pending in master 010.
  User design acceptance and final live rendering are not inferred from fixture
  success. Complete-body display depends on the selected original image.

## Focused Rerun Commands

- `node scripts/test-character-discovery.mjs --part=cards`: 10 passed.
- `node scripts/test-character-discovery.mjs --part=gallery`: 14 passed.
- `node scripts/test-character-discovery.mjs --part=handoff`: 18 passed.
- `node scripts/test-character-discovery.mjs --part=contracts`: 5 passed.
- `npm run i18n:validate`: passed.
- `npm run build --workspace web`: TypeScript and production bundle passed.
- `npm run test:community-layout -- --scope=characters --locale=en --screenshots`:
  live check, repeat with `--locale=th` after the user restarts the normal server.
- Append `--fixture` for isolated static-build checks, no backend or provider
  calls. Use existing fixture assets and synthetic public summaries, never user
  runtime writes. Optional `--part=all` combines only the four focused groups.

Gallery circle sources are verified against directory response IDs/URLs, not
merely checked for an image being present. Broken/missing/unauthorized-source
cases are covered by the focused helper/portrait/Hero tests. Browser checks
cover ring geometry, gradient presence, complete media fitting, mock controls,
footer separation, no overflow and existing menu keyboard/focus behavior.
