# 008 Library, Comparison, Collections and Admin Migration

**Status:** Implemented and React-owned; final validation pending
**Depends on:** 003-007 shared media, generation and profile components

## Implementation Result

History, Collections, Comparisons, Credits and Admin are actor-scoped React
routes. Single-image results reuse Collection and generated-image share dialogs.
Collection detail and private Comparison detail reuse
`PublishCommunityResourceDialog` to publish grouped snapshots through their
existing server-owned Community endpoints. Private and Community Comparison
views share `ComparisonWorkspace`; only the private owner surface exposes winner
mutation, deletion and publish controls. Comparison publishing selects the
latest publishable run rather than assuming the first attempt succeeded.

## 1. Business Requirement

Users must be able to manage private generated work, organize Collections,
inspect model Comparisons and use role-gated support tooling without data
leaking across actors or duplicating Community presentation.

## 2. Scope

```text
/history
/comparisons
/comparisons/:setId
/admin
private Collections surfaces
```

Community public versions and private owner versions share presentation
components but use different server projections and permissions.

## 3. Existing Owners

```text
client/core/historyService.js
client/core/collectionService.js
client/comparison.js
client/comparisons/
client/admin/
server/app/routes/historyRoutes.js
server/app/routes/collectionRoutes.js
server/app/routes/comparisonRoutes.js
server/app/routes/adminRoutes.js
```

## 4. React Feature Structure

```text
web/src/features/history/
web/src/features/collections/
web/src/features/comparisons/
web/src/features/admin/
```

Reuse:

```text
MediaCard
MediaGrid
MediaStage
Pagination
ComparisonSummary
ComparisonMosaic
ComparisonWorkspace
PromptDisclosure
EngagementBar for public comparison only
Dialog/AlertDialog
DataTable
AuditEventList
```

## 5. History and Collections

- history is actor-owned and cursor/bounded;
- card detail actions derive from server/feature capability;
- deleting history does not silently delete public posts or Collection records;
- Collection membership mutations are idempotent;
- missing/deleted media has a stable state;
- actor change clears list/detail/selection;
- bulk selection, if introduced, is feature-owned and accessible.

## 6. Comparison

One `ComparisonWorkspace` supports:

```text
private owner mode
public Community mode
generation result mode
```

Mode is a discriminated prop controlling:

- editing;
- winner selection vs public vote;
- reference actions;
- engagement;
- share;
- delete;
- prompt visibility.

Preserve:

- slot navigation and zoom;
- scrollable detail workspace;
- prompt area with stable height and scrollbar;
- enabled-slot credit calculation;
- partial success;
- winner/vote highlight;
- ownership isolation.

Do not maintain separate visual workspaces for Community and private routes.

## 7. Admin

Admin React routes consume existing role-gated APIs:

- overview;
- users;
- generations;
- Community posts/reports;
- credit ledger/adjustment;
- audit events.

Rules:

- server role is authoritative;
- no admin data is prefetched for ordinary users;
- adjustment/moderation actions require reason and confirmation;
- material actions refresh audit data;
- tables paginate and support loading/error/empty;
- do not build payment operations not present in the server contract.

## 8. Migration Order

1. History read/detail using shared media.
2. Collection management.
3. Private Comparison dashboard/detail.
4. Public/private Comparison component convergence.
5. Admin read surfaces.
6. Admin mutations and audit.
7. Cut routes independently.

## 9. Tests

- actor isolation for every private query;
- history deletion and missing media;
- Collection add/remove/default behavior;
- Comparison partial success and prompt scrolling;
- private winner vs public vote;
- enabled-slot credit summary;
- ordinary-user Admin rejection;
- Admin adjustment/moderation reason and audit;
- route direct link/back/forward.

## 10. Exit Criteria

- Private data is never visible after actor switch.
- Comparison presentation is one reusable component family.
- Community and private permissions remain distinct.
- Admin remains server-gated and audited.
- Legacy History, Comparison and Admin route owners can be retired.
