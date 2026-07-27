# Community-05-002 Community Feed Cursor Pagination

**Status:** Implemented, pending automated and browser validation  
**Owning capability:** Community Explore and Community Ranking  
**Parent requirement:** `Community-05-community-explore-post-detail-and-remix.md`

## 1. Business Requirement

Community Explore must continue loading public posts without rendering an
unbounded response or making users choose page numbers. The MVP uses a
progressive `Load more` action because it:

- preserves the user's current place in the feed
- works consistently for image, template, comparison, and collection posts
- is easier to understand on desktop and mobile
- can migrate to infinite loading later without changing the API contract

Category and post-type controls must show names only. Facet counts remain
server-owned metadata for future analytics and discovery decisions, but are
not displayed in the current filter UI.

## 2. Functional Contract

### Request

```text
GET /api/community/posts
  ?sort=latest|trending|top
  &period=week|month|year
  &postType=all|image|template|comparison|collection
  &officialTag=<official taxonomy code>
  &search=<normalized query>
  &limit=24
  &cursor=<opaque signed cursor>
```

The first request omits `cursor`. A continuation request must send the exact
`nextCursor` returned by the previous response.

### Response

```js
{
  items: PublicCommunityPost[],
  ranking: {
    sort,
    period,
    officialTag,
    windowStart,
    windowEnd,
    algorithmVersion,
    calculatedAt
  },
  facets,
  nextCursor: string | null,
  hasMore: boolean
}
```

### Cursor Rules

- The cursor is opaque to the browser and HMAC signed by the server.
- It is bound to sort, period, post type, official category, search text, and
  ranking algorithm version.
- A cursor from one filter combination must be rejected for another.
- The first page fixes `windowEnd`. Every continuation page uses that same
  ranking window to reduce item movement during pagination.
- Ordering uses score, creation time, and post ID as deterministic tie-breakers.
- The cursor contains no prompt, private reference, actor identity, or media
  path.
- Invalid, malformed, expired-contract, or mismatched cursors return a stable
  `invalid_repository_cursor` error with HTTP 400.

Live engagement may change while a user paginates. The JSON MVP does not create
a database snapshot transaction across pages. Deterministic windowing and
ordering reduce movement; exact snapshot isolation is deferred to the database
phase.

## 3. Client Behavior

Initial load:

```text
open Community -> request first 24 -> render cards
```

Continuation:

```text
click Load more -> keep current cards visible
-> request nextCursor
-> append unseen post IDs
-> update nextCursor and hasMore
```

Rules:

- Changing type, category, search, sort, or period clears the active cursor and
  starts a new first-page request.
- Only one initial or continuation request may run at a time.
- `Load more` is shown only when `hasMore` and `nextCursor` are both present.
- The button shows a loading state and is disabled during a continuation.
- A continuation error keeps existing cards and exposes a retry action.
- Duplicate post IDs are ignored when appending.
- Actor/language rerenders must not fabricate a cursor.

## 4. Software Design

### Server Process

```text
communityEngagementRoutes
  -> CommunityRankingService.listRankedPosts(query)
  -> decode and validate cursor scope
  -> freeze or restore ranking window
  -> calculate eligible ranked posts
  -> apply deterministic cursor boundary
  -> return one page and signed continuation cursor
```

Ranking calculations remain owned by `CommunityRankingService`. Routes only
translate query parameters. Repositories remain responsible for source
records; the route must not read JSON directly.

### Client Process

```text
CommunityFeed state
  -> CommunityEngagementApi.listPosts(query + cursor)
  -> replace first page or append continuation
  -> render shared Community post cards
```

The feed must not calculate ranking or decode cursors.

## 5. File-Level Implementation Plan

### Modify

- `server/domain/community/CommunityRankingService.js`
  - accept cursor, restore ranking window, paginate deterministic ranked results
- `server/app/routes/communityEngagementRoutes.js`
  - forward the opaque cursor
- `client/community/communityEngagementApi.js`
  - include cursor in list requests
- `client/community/communityFeed.js`
  - remove visible facet counts and implement append/retry state
- `client/i18n/locales/en/community.json`
- `client/i18n/locales/th/community.json`
  - add Load more, loading, and continuation-error labels
- `client/style.css`
  - add a stable pagination action row

### Tests

- `test/communityRankingPagination.test.js`
  - first page returns a cursor when more posts exist
  - continuation has no duplicate IDs
  - equal-score records retain deterministic order
  - continuation keeps the original ranking window
  - a cursor cannot be reused with another filter
- `test/i18nCatalogParity.test.js`
  - locale keys remain aligned

## 6. Impact and Migration

- Existing first-page clients remain compatible because `cursor` is optional.
- Facet fields remain in the response; only their visible labels change.
- JSON storage schema does not change.
- Future database adapters can translate the same opaque cursor contract into
  indexed keyset pagination.
- The implementation must not introduce numeric offset pagination because
  ranking changes make offsets prone to skips and duplicates.

## 7. Acceptance Tests

1. No number appears after any post-type or category label.
2. With more than the selected limit, `Load more` appears.
3. Loading the next page keeps existing cards visible.
4. Appended cards contain no duplicate post IDs.
5. Changing any filter hides the old continuation state and loads page one.
6. A failed continuation keeps existing cards and permits retry.
7. A cursor copied to a different category/sort request is rejected.
8. Desktop and mobile controls do not overlap.
