# HTTP API Contract Inventory

**Captured from:** `server/app/routes/`  
**Authentication source:** `req.actorContext` through actor middleware

## Platform

| Method/path | Purpose | React consumers |
|---|---|---|
| `GET /api/health` | Local health | diagnostics |
| `GET /api/me` | Active actor projection | shell/providers |
| `GET /api/mock-users` | Development actor list | mock switcher |
| `GET /api/providers` | Provider/model capability catalog | generation |
| `GET /api/attributes/bundle` | Attribute schemas/options | Studio |
| `POST /api/references` | Validate and store an actor-owned generation reference | shared generation |

## Generation and Credits

| Method/path | Purpose |
|---|---|
| `POST /api/generate` | Validate estimate, reserve and enqueue |
| `GET /api/jobs/:id` | Actor-owned job status |
| `GET /api/jobs/:id/stream` | Job status stream where used |
| `GET /api/credits/account` | Credit account |
| `GET /api/credits` | Compatibility credit response |
| `POST /api/credits/estimate` | Server-owned estimate |
| `GET /api/credits/ledger` | Actor ledger |
| `POST /api/credits/mock-grants` | Development grant |
| `POST /api/credits/recharge` | Current recharge contract |

Stable migration rules:

- estimate and submitted provider/model/settings/references/output count match;
- job queries are actor-owned;
- UI handles stable error codes;
- React does not calculate pricing.
- uploaded PNG/JPEG/WebP references are validated and persisted before
  generation; `/api/generate` receives lightweight actor-owned `/outputs/...`
  references rather than embedded Base64;
- provider-bound Base64 is resolved server-side only after asset ownership is
  verified.

## History and Collections

| Method/path | Purpose |
|---|---|
| `GET /api/history` | Actor-owned generation list |
| `GET /api/history/:id` | Actor-owned result |
| `DELETE /api/history/:id` | Delete owned result |
| `GET /api/collections` | List owned Collections |
| `POST /api/collections` | Create |
| `GET /api/collections/:id` | Detail |
| `PATCH /api/collections/:id` | Update |
| `DELETE /api/collections/:id` | Delete |
| `POST /api/collections/:id/images` | Add image |
| `DELETE /api/collections/:id/images/:jobId` | Remove image |
| `PUT /api/collections/:id/default` | Set default |

## Comparison

| Method/path | Purpose |
|---|---|
| `POST /api/comparisons/estimate` | Enabled-slot estimate |
| `POST /api/comparisons` | Create comparison set |
| `GET /api/comparisons` | Actor-owned list |
| `GET /api/comparisons/:setId` | Actor-owned detail |
| `PATCH /api/comparisons/:setId` | Update |
| `PATCH /api/comparisons/:setId/winner` | Owner winner |
| `DELETE /api/comparisons/:setId` | Delete |

## Community Read and Engagement

| Method/path | Purpose |
|---|---|
| `GET /api/community/features` | Server feature policy |
| `GET /api/community/taxonomy` | Taxonomy catalog |
| `GET /api/community/posts` | Ranked cursor page |
| `GET /api/community/posts/:postId/engagement` | Viewer summary/state |
| `POST /api/community/posts/:postId/views` | Record view |
| `PUT/DELETE .../reactions/:type` | Like/Save |
| `GET/POST .../comments` | Comment list/create |
| `DELETE .../comments/:commentId` | Allowed delete |
| `POST .../comments/:commentId/report` | Report |
| `PUT/DELETE .../comparison-vote` | Public comparison vote |

`GET /api/community/posts` returns:

```text
items[]
ranking
facets
nextCursor
hasMore
```

Each item is a sanitized `communityPostPublicView`.

## Community Sharing and Media

| Method/path | Purpose |
|---|---|
| `POST /api/community/share-drafts` | Create from owned generation |
| `PATCH /api/community/share-drafts/:draftId` | Update draft |
| `POST .../:draftId/publish` | Publish |
| `DELETE /api/community/posts/:postId` | Owner unpublish |
| `POST /api/community/gallery` | Add public gallery item |
| `GET /api/community/creators/:handle/gallery` | Public gallery |
| `POST /api/community/gallery/:itemId/use-template` | Handoff |
| `GET /api/community/gallery/:itemId/:mediaKind` | Authorized media |

Comparison, Collection and Scene Template publishing use their dedicated route
modules and public media endpoints.

## Creator and Character

| Method/path | Purpose |
|---|---|
| `GET/PATCH /api/community/creator-profiles/me` | Owner profile |
| `PATCH .../me/presentation` | Owner presentation |
| `GET /api/community/creators/:handle/page` | Composed page |
| `GET /api/community/creators/:handle` | Profile |
| `GET /api/community/creators/:handle/posts` | Portfolio |
| `POST/DELETE .../:profileId/follow` | Follow |
| `POST/GET/PATCH /api/character-profiles...` | Owner lifecycle |
| `POST .../:id/casting-export-plan` | Casting plan |
| `POST .../:id/approve` | Approve version |
| `POST .../:id/convert-to-reusable` | Convert |
| `POST .../:id/sharing` | Sharing policy |
| `GET /api/community/characters` | Public directory |
| `GET /api/community/characters/:id` | Public detail |
| `GET .../:id/works` | Public work |
| `GET .../:id/stats` | Public aggregate |
| `POST .../:id/handoffs` | Authorized handoff |

## Scene Templates

| Method/path | Purpose |
|---|---|
| `POST /api/scene-templates/share-drafts` | Draft |
| `POST .../:draftId/publish` | Publish |
| `GET /api/scene-templates/shared` | Shared list |
| `GET /api/scene-templates/shared/:postId` | Detail |
| `GET .../:postId/:mediaKind` | Media |
| `PATCH /api/scene-templates/shared/:postId` | Owner update |
| `POST .../:postId/use-template` | Handoff |
| `POST /api/scene-templates/remix-events` | Attribution event |

## Admin

Role-gated APIs include overview, users, generations, Community posts/reports,
credit ledger/adjustment and audit events. React must not prefetch these for an
ordinary actor.

## Fashion Blueprint

| Method/path | Purpose |
|---|---|
| `POST /api/fashion-blueprints/assets` | Store actor-owned outfit reference |
| `POST /api/fashion-blueprints/resolve` | Resolve and validate route/plan |
| `POST /api/fashion-blueprints/quotes` | Lock all operation estimates |
| `POST /api/fashion-blueprints/runs` | Atomically reserve and enqueue plan |
| `GET /api/fashion-blueprints/runs/:id` | Actor-owned grouped run status |

Fashion quote records never persist Base64. Each run binds the quote hash,
operation estimate IDs, deterministic jobs, and one idempotency key.

## Contract Freeze Rule

For each migrated endpoint:

1. capture representative success/error fixtures;
2. add Zod response validation in React;
3. add/retain server contract tests;
4. make backward-compatible normalization before cutover;
5. never derive missing permissions in the browser.
