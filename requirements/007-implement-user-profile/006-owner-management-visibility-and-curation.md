# User Profile 006 - Owner Manage Mode, Visibility and Curation

**Status:** Implemented; validation pending

## 1. Business Requirement

Owners must manage their public presentation from the same page visitors see,
without turning the default profile into a control-heavy dashboard.

## 2. Manage Mode

Owner-only `Manage Profile` toggles a page-level mode:

```text
View mode
- identical to public presentation
- normal public interactions

Manage mode
- edit/curate controls appear
- public visibility badges appear
- bulk selection may be enabled per section
- public interactions remain secondary
```

Manage mode is ephemeral and route-local. Do not persist it across actor
switches.

## 3. Management Boundaries

Profile Page owns:

- featured ordering
- cover selection
- section visibility/order
- entry points into content management
- public presentation preview

Feature modules own:

- Gallery publish/unpublish
- Character edit/sharing/casting
- Template visibility/reuse variables
- Comparison share/voting configuration
- Collection membership and sharing

Profile Page invokes these canonical mutations and refreshes its page model. It
does not recreate their forms or policy.

## 4. Curation Operations

Required:

- set/remove cover
- add/remove/reorder featured works
- add/remove/reorder featured Characters
- add/remove/reorder featured Templates
- reorder known Overview sections
- preview public presentation

Validation:

- item belongs to owner
- item remains publicly eligible
- maximum counts enforced
- duplicate IDs removed
- update uses record version/idempotency where available

## 5. Visibility Presentation

Owner cards show a compact status:

```text
Public
Unlisted
Private
Draft
Pending review
Reported/hidden
```

Do not show inaccessible private records to public viewers. Owner counts may
include private/draft data only in explicit owner management responses, never in
the public page model.

## 6. Confirmation and Error Policy

Confirmation is required for:

- unpublishing public content
- removing a current cover
- removing a featured item when it changes public presentation

No confirmation for:

- entering Manage mode
- reordering before Save
- opening an editor

Mutations show stable pending/success/error states and prevent duplicate submit.
Errors preserve unsaved local ordering.

## 7. File-Level Implementation Plan

Recommended:

```text
client/community/creatorProfileManageMode.js
client/community/creatorProfileCuration.js
```

Modify:

```text
client/community/creatorProfileController.js
client/community/creatorProfileHeader.js
client/community/creatorProfileOverview.js
client/community/creatorProfileContentTabs.js
client/community/communityCreatorApi.js
server/domain/community/CreatorProfileService.js
server/repositories/community/CreatorProfileRepository.js
server/app/routes/communityCreatorRoutes.js
```

Suggested endpoint:

```text
PATCH /api/community/creator-profiles/me/presentation
```

Input includes only normalized presentation fields and `recordVersion`.

Implementation sequence:

1. Add owner-only presentation mutation and tests.
2. Add Manage mode state/capability guard.
3. Implement curation selectors from eligible canonical records.
4. Add local reorder and explicit Save.
5. Connect feature-owned edit/unpublish actions.
6. Add public preview and conflict recovery.

## 8. Impact

- Owner presentation settings become mutable without exposing private data.
- Feature-owned mutation APIs remain canonical.
- The default profile stays visually equivalent to public view.
- Main risks are concurrent edits and stale eligibility; both require
  server-side revalidation.

## 9. Cases

- owner opens a deep-linked tab then enters Manage mode
- item becomes private while selected as featured
- concurrent edit returns conflict
- actor switches with unsaved edits
- owner loses access to source asset
- public cover is moderated after save
- reordered item list contains duplicates
- mutation succeeds but page refresh fails

## 10. Tests

- non-owner cannot render or call management actions
- owner mutation cannot target another creator
- curation validates ownership/public eligibility
- stale record version returns conflict
- duplicate IDs normalize deterministically
- actor change clears Manage mode and draft selection
- feature-owned actions preserve existing policies
- public preview matches visitor response

## 11. Exit Criteria

- owner manages presentation without a second profile page
- default owner view remains clean
- mutations remain feature-owned
- public viewers receive no management metadata
