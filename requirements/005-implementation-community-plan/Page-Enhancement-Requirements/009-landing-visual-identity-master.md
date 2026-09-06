# Landing Visual Identity Master

Status: Implemented; scoped automated and agent visual verification passed (2026-09-06).
User visual acceptance remains a separate review.

Owner: Community, route `/`, existing CommunityHomeRoute and AppShell.
Primary: UX/UI Product Designer. Reviewer: QA Release Engineer (sequential
self-review; no independent agent available). Skills: review-product-ux,
verify-release-regressions. No generation or financial workflow changes.

## Outcome And Scope

Bring the existing combined Landing/Community page closer to concept 004:
floating artwork, a recognizable Momelo first viewport, distinct colored
sections, and concise descriptions explaining existing features. Keep the
Community feed useful to returning users, with direct hero access to the feed.
This extends 004-community-landing-feed.md; other gallery pages remain unchanged.

## Master Checklist

| Step | Plan | Gate | Status |
|---|---|---|---|
| LVI-01 | implementation-plan/008-landing-floating-hero.md | Hero tests, media inspection | Passed |
| LVI-02 | implementation-plan/009-landing-feature-sections.md | Navigation/feed regression, EN/TH | Passed |
| LVI-03 | implementation-plan/010-landing-provider-directory.md | Catalog states, no disabled models advertised | Passed |
| LVI-04 | implementation-plan/011-landing-visual-verification.md | Build, focused tests, viewport/theme screenshots | Passed in scope |
| LVI-05 | implementation-plan/012-landing-section-actions-provider-icons-and-sidebar-motion.md | Section actions, provider marks, reduced-motion/sidebar regression | Passed |

Update each status only after its gate passes. Do not declare the parent page
enhancement complete on the strength of previous delivery evidence.

## Page And Data Contract

1. Hero: local approved editorial media plus one eligible public hero post from
   the existing bounded feed response. No new private/history fetches, no video
   autoplay, no generated media calls. Local samples must not imply public posts.
2. Start paths: existing policy-aware links and four short feature descriptions.
3. Image providers/models: canonical Generation getProviderCatalog, scoped to
   Playground image generation. This is not a promise of Video/Studio support.
4. Featured: current public posts and existing deduplication/engagement intact.
5. Feed: existing URL filters, search, pagination, empty/error/retry preserved.
6. Tutorial: existing mock previews, plus a section description; no fake player.

Search continues to suppress editorial content. Provider catalog failure must
not block the feed. No duplicate Gallery/feed grids or extra marketing routes.

## Visual Contract

- Hero artwork floats with modest rotation and shadows, fixed aspect ratios;
  copy is unframed over a full-bleed photographic canvas, never under cards.
- Main heading identifies Momelo; supporting text explains actual workflows.
- Distinct section accents: primary/create, yellow/providers, dark/featured,
  neutral-primary/feed, green/tutorial. Mix semantic colors into theme surfaces,
  not hard-coded dark panels. Hue is supplementary to headings and descriptions.
- Page sections are full-width bands, not cards nested in cards.
- No glow orbs, decorative bokeh, animated particles or gradient hero artwork.
- Cards remain <=8px radius; mobile changes layout rather than shrinking text.
- EN/TH, default/fashion/creative; keyboard focus and reduced-motion respected.

## Preservation And Pending

Unchanged: sidebar behavior, other galleries, routes, public visibility, credit/pricing,
provider dispatch, master controls, generation preferences, cinematic/video.
Pending: official provider logo asset pack if not already available (use honest
provider-specific symbols with a generic fallback), video/text catalog marketing,
CMS, real tutorials, new analytics.
No runtime data or schema migration. No paid provider testing required.

## Verification

Use targeted Vitest files per step; typecheck and EN/TH parity. Reuse
`npm run test:community-layout -- --scope=home --screenshots` for 390/820/1440
and three themes. Extend its Home checks for readable section headers, provider
expansion and loaded hero assets. Optional `--scope=all` remains separate.

## Delivery Evidence

- Hero (3), StartPaths (2), ProviderDirectory (5), HomeRoute (5), shared
  DiscoveryComponents (6): 21 targeted Vitest tests passed, run in small groups.
- `npm run build:web`: TypeScript and Vite passed. The first sandbox-only runs
  could not write existing node_modules caches; approved reruns succeeded.
- `npm run i18n:validate`: all catalog keys and placeholders passed.
- ESLint for all changed TS/TSX modules passed; `git diff --check` passed.
- `npm run test:community-layout -- --scope=home --screenshots`: 9 viewport/theme
  combinations passed. Includes decoded hero images, no artwork/copy overlap,
  next-section first-viewport visibility, section descriptions, keyboard model
  expansion and page/control horizontal bounds.
- Screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-ulCpMW`.
  Agent inspected mobile and desktop/tablet screenshots; review is sequential,
  not independent human design approval. Test browser defaults to Thai; English
  component copy/interaction covered by unit tests and locale parity.
- Visual review caught inherited mobile hero copy scrim darkening the artwork;
  Home-only transparent copy background fixed it without changing other heroes.
- Regression added: video posts are never removed from feed solely to decorate
  the still-image hero. Search suppresses the catalog query and editorial UI.
- New runtime component: `web/src/features/community/components/CommunityProviderDirectory.tsx`
  with colocated tests. No moved files, storage migrations or provider mutations.
- Existing local server at `http://localhost:6500` serves the rebuilt page.

## Residual Scope

No full-system test, paid provider test, public-shell redesign or official logo
asset acquisition. Existing Gallery MediaCard light-theme contrast and global
mobile header density are outside these Home-section edits. Other galleries
retain the shared hero and unchanged tutorial rendering when description is
omitted. User data files already dirty before this task were not edited.

## LVI-05 Evidence

- `ProviderMark` added under shared Generation presentation components. Five
  canonical provider IDs have distinct Lucide symbols; future IDs use a generic
  fallback. These are navigational symbols, not representations of official
  provider logos.
- Provider Directory links to the existing Playground selector. Featured links
  to the existing Community feed anchor. Home pagination retains one
  `fetchNextPage` path and presents it as `See more Community work`.
- ProviderMark and ProviderDirectory: 11 focused tests passed. HomeRoute and
  SidebarNavigation: 8 focused tests passed. Existing search suppression,
  provider filtering, retry and mobile navigation tests remain green.
- i18n validation, scoped ESLint, TypeScript production build and diff check
  passed. No provider, model, pricing, queue or persistence code changed.
- Home browser verification passed 390/820/1440px across default, fashion and
  creative themes. It checks section actions, provider marks, control bounds,
  hero media and reduced-motion behavior. Screenshots:
  `C:/Users/punya/AppData/Local/Temp/community-page-layout-Q1ngJu`.
- Agent visual inspection found no overlap in Provider, Featured or mobile
  layouts. Sidebar color wash stays behind navigation. Human product acceptance
  remains separate; QA review was sequential rather than independent.

### Gradient Refinement Evidence

- LVI-05 follow-up: full-width violet sidebar wash fades diagonally into
  transparency; opacity-only animation retains reduced-motion support.
- Home-only upper-left theme wash overlays the backdrop, below floating cards.
  Other heroes, layout and navigation contracts remain unchanged.
- Production build, diff check and Home browser checks passed at 390/820/1440px
  across all three themes. Screenshots and visual review limitations are recorded
  in implementation plan 012. No paid generation or runtime data edits.
