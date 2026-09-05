# Step 06 - Community Landing And Feed Delivery

Status: Planned

Depends on: `005-comparison-gallery.md`

Owning requirement: `../004-community-landing-feed.md`

## 1. File Ownership

Primary existing files:

```text
web/src/features/community/routes/CommunityHomeRoute.tsx
web/src/features/community/components/CommunityHero.tsx
web/src/styles/community-home.css
web/src/app/routeRegistry/routes.ts
```

Add small Community-owned composition components only when they have cohesive responsibilities, for example `CommunityStartPaths` or `CommunityFeaturedRail`. Do not add a second landing route or shell.

## 2. Tasks

- `HOME-IMPL-01` Preserve root route, AppShell and route registry values
- `HOME-IMPL-02` Preserve Community filter parsing/query keys before changing composition
- `HOME-IMPL-03` Replace false loaded-page aggregate counts with authoritative data or omit them
- `HOME-IMPL-04` Refine hero to media-first bounded layout using public-safe media
- `HOME-IMPL-05` Add four route-policy-aware start paths
- `HOME-IMPL-06` Add one bounded featured rail and view-only stable-ID deduplication
- `HOME-IMPL-07` Place shared discovery toolbar immediately before the feed
- `HOME-IMPL-08` Keep supporting tutorial/CTA reachable with chosen Load More behavior
- `HOME-IMPL-09` Ensure search/deep-link mode compacts editorial content
- `HOME-IMPL-10` Add no-media, empty-feed, pagination-error and retry states
- `HOME-IMPL-11` Add i18n and validate legacy redirect labels/targets
- `HOME-IMPL-12` Validate first viewport and feed reachability at three sizes
- `HOME-IMPL-13` Compare request/media counts to Step 01 baseline

## 3. Focused Tests

```text
npm run test --workspace web -- CommunityHomeRoute CommunityHero
npm run test --workspace web -- routes.test.ts AppShellRoutePolicy.test.ts
node --test test/communityRankingPagination.test.js test/communityMvpIntegration.test.js
node --test test/communityModerationReporting.test.js test/communityOwnershipPolicy.test.js
```

Run the root-page Playwright spec independently.

## 4. Exit Gate

- `/` is clearly both the product entry and actual Community Feed
- Feed controls, cursor and legacy redirects remain compatible
- Editorial content is bounded and does not duplicate the same grid
- No false global totals remain
- Request/media regression is measured and accepted
- Focused tests and three viewport checks pass
