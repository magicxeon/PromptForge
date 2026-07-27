# User Profile 003 - Profile Hero and Owner Editing

**Status:** Implemented; validation pending

## 1. Business Requirement

The profile hero must establish creator identity, public trust and clear actions
without creating separate owner/public components.

## 2. Hero Content

Public fields:

- avatar or initials fallback
- cover image or neutral media fallback
- display name and handle
- headline and creator roles
- bio
- optional location, website and languages
- followers, following, public work and public Character counts
- Follow, Share Profile and overflow actions

Owner substitutions:

- `Edit Profile` replaces Follow
- `Manage Profile` is available
- public preview remains visually identical

Badges such as Verified or Featured render only from server-issued badge data.
They are not owner-editable in this phase.

## 3. Cover and Avatar Rules

- `coverPostId` must reference an owned, published Community post.
- public cover uses the sanitized Community media endpoint.
- invalid, removed or private cover falls back without breaking the profile.
- avatar may use an owned canonical asset when upload ownership exists;
  otherwise render initials.
- never place Base64 or filesystem paths in the profile record.

## 4. Owner Edit Experience

Use a modal or focused inline editor opened from `Edit Profile`. Do not keep a
large edit form permanently visible.

Editable:

- display name
- headline
- bio
- creator roles
- location text
- HTTPS website
- languages
- content categories
- avatar asset selection when supported
- cover selection from eligible owned posts

Save behavior:

- validate client-side for immediate feedback
- validate again on server
- disable Save during request
- preserve input on recoverable failure
- refresh the canonical page model after success
- use optimistic record/version conflict handling

## 5. Reusable Modules

Recommended:

```text
client/community/creatorProfileHeader.js
client/community/creatorProfileEditor.js
```

Reuse:

```text
client/community/followButton.js
client/community/communityEngagementApi.js
client/core/lightboxService.js
client/core/i18nService.js
```

The header receives:

```text
profile
viewer
counts
callbacks
```

It performs no direct API calls except through callbacks/controller ownership.

## 6. Server Changes

Extend:

```text
CreatorProfileRepository.updateOwnProfile()
CreatorProfileService.updateOwnProfile()
PATCH /api/community/creator-profiles/me
```

Input allowlist must match the presentation schema. URL normalization rejects
unsafe schemes. Role/category/language values use controlled catalogs or
validated codes.

Implementation sequence:

1. Extend server normalization and mutation tests.
2. Add header fixture for owner/public states.
3. Extract and render the reusable header.
4. Add the owner editor through controller callbacks.
5. Add cover/avatar media fallbacks.
6. Replace the old permanently visible edit form.

## 7. Impact

- Creator Profile records gain optional presentation metadata.
- No new media bytes or runtime store is introduced.
- Public URLs and Follow behavior remain unchanged.
- Unsafe or stale presentation metadata degrades to a neutral fallback.

## 8. Cases to Prevent Rework

- creator has no cover, avatar or bio
- very long localized name
- broken/removed cover media
- owner edits while another browser updated the record
- public viewer loads during owner edit
- follow request fails
- owner cannot follow self
- website value attempts `javascript:` or malformed URL
- profile is reported/hidden
- mobile action labels wrap

## 9. Tests

- owner/public action matrix
- unsafe website rejected
- stale cover ID ignored in public view
- edit allowlist excludes identity/credit fields
- optimistic conflict returns stable code
- missing media displays neutral fallback
- Follow component behavior remains unchanged
- text and controls do not overflow at mobile width

## 10. Exit Criteria

- hero matches the public portfolio design direction
- owner editing is contextual, not always visible
- public and owner use the same component
- Step 004 can compose Overview below the hero
