# User Profile 005 - Content Tabs and Reusable Section Components

**Status:** Implemented; validation pending

## 1. Business Requirement

Visitors must browse a creator's public content by type without leaving the
profile context. Owners must see the same sections with authorized management
actions.

## 2. Tab Registry

Create a declarative registry:

```text
overview
gallery
characters
templates
comparisons
collections
```

Each entry declares:

```text
id
routeSuffix
i18nKey
featureFlag
publicVisibility
loader
renderer
emptyStateKey
managementCapability
```

`Saved` and `Drafts` may be registered as owner-only, disabled entries for
future activation. Do not show inert tabs in MVP.

## 3. Lazy Loading and Pagination

- first request loads only the route-selected tab
- changing tab updates the URL and loads its payload
- cache successful tab pages for the active handle and actor only
- invalidate cache on actor change, profile mutation or visibility mutation
- use opaque cursors and `Load More`/infinite behavior already established by
  the canonical content component
- cancel or ignore stale responses

Do not store another creator's tab data in persistent browser storage.

## 4. Tab Content Contracts

### Gallery

- curated Gallery only, never raw History
- reuse Community Gallery card/lightbox
- template actions reflect canonical reuse policy

### Characters

- use Character Profile public summaries
- display approved image, type, creator, usage and reuse state
- reuse the Character card component used by Community

### Templates

- filter canonical Community posts to Template type
- reuse template action and replacement/handoff flow

### Comparisons

- reuse comparison collection card and comparison workspace
- show public vote winner and engagement
- do not expose owner-only Face/Style/Character reference actions

### Collections

- reuse public Collection composition/card
- open canonical Collection detail/lightbox
- never copy collection item media into profile data

## 5. Shared Component Parameters

Shared components should accept a common context:

```text
context
- surface: community | creator_profile | comparison
- variant: grid | rail | compact | featured
- viewer
- permissions
- actions
- pagination
```

Components must not infer ownership from the current route or username.

## 6. File-Level Implementation Plan

Modify or extend:

```text
client/community/creatorPortfolioGrid.js
client/community/communityCharacterSection.js
client/community/communityTemplateActions.js
client/comparisons/comparisonMosaic.js
client/community/creatorProfileController.js
client/community/communityCreatorApi.js
client/style.css
```

Create when a shared equivalent does not already exist:

```text
client/community/creatorProfileContentTabs.js
client/community/creatorProfileSectionAdapters.js
```

Server:

```text
server/domain/community/CreatorProfilePageService.js
server/app/routes/communityCreatorRoutes.js
```

Do not create profile-specific content repositories.

Implementation sequence:

1. Finalize tab registry and route tests.
2. Implement one selected-tab server query at a time.
3. Connect each tab through a shared adapter.
4. Add pagination before moving to the next content type.
5. Enable tab only when its canonical component and privacy tests pass.
6. Add actor-scoped in-memory cache last.

## 7. Impact

- Existing feature components gain explicit surface/variant parameters.
- Profile does not become a second source of content truth.
- Direct tab URLs increase route coverage and server fallback requirements.
- Lazy loading limits initial profile cost.

## 8. Empty, Error and Permission States

Public:

- empty sections use concise neutral messages
- unavailable tabs may be absent from registry
- hidden/private records look absent, not access-denied

Owner:

- empty states offer an existing creation/share route
- permission errors show stable action feedback
- no delete/publish button is rendered without capability

## 9. Cases

- deep link opens non-Overview tab
- tab feature flag disabled
- cursor expires
- content removed between pages
- actor switches with cached tab open
- item media fails
- Character is view-only
- Template requires replacements
- Comparison result partially failed
- Collection has mixed visibility members

## 10. Tests

- registry route and tab parity
- only selected tab loader runs
- public data excludes private content
- owner actions match capability matrix
- component variants preserve action behavior
- cursor pagination has no duplicates
- actor-scoped cache cannot leak
- mobile tab keyboard and scroll behavior

## 11. Exit Criteria

- all six MVP tabs are available through one shell
- each section reuses canonical components and actions
- no content repository or policy is duplicated
- Step 006 can add management without replacing tab renderers
