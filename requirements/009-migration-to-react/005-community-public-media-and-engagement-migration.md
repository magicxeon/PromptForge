# 005 Community, Public Media and Engagement Migration

**Status:** Implemented and React-owned; browser QA pending
**Depends on:** 001-004

## Implementation Progress

The first Community vertical slice passed automated foundation validation:

- `web/src/features/community/schemas/communitySchemas.ts` validates sanitized
  public records without accepting private source snapshots.
- `web/src/features/community/api/communityApi.ts` owns React Community HTTP.
- `CommunityHomeRoute.tsx` owns URL filters and cursor pagination.
- `CommunityPostRoute.tsx` owns artwork viewing, metadata, prompt visibility,
  engagement, comments, related creator work, and template handoff.
- Shared `MediaCard`, `MediaStage`, `CreatorIdentity`, `EngagementBar`, and
  `CommentThread` components serve both list and detail composition.
- Community Template handoff is consumed directly by the React Scene Builder
  through an actor-bound session envelope. No legacy bridge script is loaded.

## 1. Why This Migrates First

Community is the product home, is primarily API-backed and contains the highest
reuse opportunity for cards, media, creator identity, engagement, pagination
and public permissions. It validates the React platform without first touching
the most coupled generation editor.

## 2. Business Requirement

React Community must preserve:

- Community-first home and workflow launchers;
- separate presentation for images, templates, comparisons, collections and Characters;
- taxonomy filters without misleading item counts in labels;
- cursor pagination;
- public post detail and full artwork inspection;
- creator attribution;
- Like, Save, Share, Comment and Report according to policy;
- template reuse and comparison detail/voting;
- public snapshot sanitization;
- route context back to Community or Creator Profile.

## 3. Canonical Existing Owners

Read current code first:

```text
client/community/
client/comparisons/comparisonWorkspace.js
client/comparisons/comparisonMosaic.js
server/app/routes/community*.js
server/domain/community/
server/repositories/community/
requirements/005-implementation-community-plan/
requirements/008-implement-adjusment-ui/004-photo-viewer-detail-page-adjustment.md
```

React is a presentation/state consumer. Community ranking, public projection,
ownership, moderation and sanitization stay on the server.

## 4. React Feature Structure

```text
web/src/features/community/
  api/
  routes/
    CommunityHomeRoute.tsx
    CommunityPostRoute.tsx
    CommunityComparisonRoute.tsx
    CommunityCollectionRoute.tsx
  components/
    CommunityFeed.tsx
    CommunityFilters.tsx
    CommunitySection.tsx
    CommunityPostAdapter.tsx
  hooks/
  schemas/
```

Shared components created or consumed:

```text
components/media/MediaCard
components/media/MediaGrid
components/media/PhotoViewer
components/community/CreatorIdentity
components/community/EngagementBar
components/community/CommentThread
components/community/ShareDialog
components/community/ReportDialog
components/comparison/ComparisonSummary
components/comparison/ComparisonWorkspace
```

## 5. Data and Query Contract

Queries must use:

- cursor and limit from URL/search state where shareable;
- stable taxonomy/post-type values;
- actor-aware viewer projection;
- server-returned `viewer` and capability fields;
- bounded “More from creator” requests;
- cancellation on filter, route or actor change.

The UI must not request one endpoint per card. Extend aggregate/list projections
when a card requires server-authoritative data.

## 6. Route Behavior

### `/community`

- server-rendered data is not required for MVP, but show skeletons immediately;
- preserve type/category filters in search params;
- reset cursor when filters change;
- append or page without duplicate IDs;
- show independent section failure without blanking the complete home;
- image/card click and title click open the same destination.

### `/community/:postId`

- `image` and `template` use the full-page Photo Viewer;
- `comparison` uses shared Comparison Workspace;
- `collection` uses a grouped collection detail surface;
- primary media does not open a redundant legacy lightbox;
- prompt displays only sanitized `promptPreview`;
- “Use Template” appears only when server capability permits;
- Add to Collection remains aligned with the currently released collection contract.

## 7. Engagement

`EngagementBar` owns presentation only. Mutation hooks own:

- optimistic Like/Save only when rollback is deterministic;
- comment submit/delete/report;
- comparison vote;
- share URL;
- query invalidation.

Requirements:

- idempotent active state;
- count cannot become negative;
- failed optimistic mutations roll back;
- owner-only/delete/report permissions use server projection;
- Comment Thread is reusable on image, comparison and future template details;
- profile avatar/name uses creator projection, never username guessing.

## 8. Media

- black or neutral-black stage for artwork inspection;
- `object-fit: contain` for full detail;
- focal positioning allowed only on summary thumbnails;
- icon-only fullscreen/download actions with tooltips;
- authorized media endpoint used for protected content;
- inaccessible/missing media has a localized state;
- avoid Base64 in Query cache or route state.

## 9. Migration and Cutover

1. Build shared media and Community primitives.
2. Migrate Community home with read-only cards and filters.
3. Add engagement and pagination.
4. Migrate image/template Post Detail.
5. Integrate Comparison and Collection detail adapters.
6. Verify Character discovery link remains functional, even before React Character migration.
7. Cut over `/community` and `/community/:postId`.
8. Observe errors before deleting legacy Community modules.

Legacy Community code remains untouched until route parity passes.

## 10. Tests

Component/integration:

- loading, empty, partial and error feed;
- filters and cursor pagination;
- media card action parity;
- hidden/private prompt;
- viewer permission variants;
- Like/Save rollback;
- Comment empty/create/delete/report;
- More from Creator;
- comparison winner vote.

E2E:

- direct Community entry;
- open image and return;
- open post from Creator Profile and return to Profile context;
- second actor sees only public content;
- owner/non-owner controls;
- desktop/mobile Photo Viewer.

Run current Community server tests unchanged as regression coverage.

## 11. Exit Criteria

- Community is the first production-capable React route.
- All post types route to correct detail presentation.
- No private reference or raw snapshot appears.
- Engagement and pagination pass parity.
- Shared components are ready for Profiles and Library.
- Route can roll back without changing Community data.
