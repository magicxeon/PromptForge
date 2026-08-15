# Community-06 Creator Profile, Follow and Portfolio

**Status:** Implemented - verification pending
**Feature type:** Creator identity and lightweight social graph  
**Depends on:** Authentication, Community posts  
**Created:** 2026-07-15

## 0. Delivery Gate

This requirement follows
`Community-00-009-feature-delivery-gates-and-non-duplication-plan.md`.

Current gates:

```text
Development  OPEN
Exposure     INTERNAL
```

Open now:

- Creator profile contract and actor-owned profile mutation.
- Public-safe profile read model.
- Follow/unfollow with one relation per follower/creator pair.
- Public portfolio query over canonical Community posts.

Keep closed:

- Creator ranking, analytics, badges, memberships and marketplace behavior.
- A separate portfolio-post store; portfolio is a filtered read of canonical
  public Community posts.
- Public navigation until Community-07 safety filtering is enforced.

Exit criteria are profile privacy tests, follow idempotency tests and a
portfolio query that excludes private, hidden and removed posts.

## 1. Objective

Provide a lightweight creator identity so users can follow creators and browse their public shared work without building a full creator marketplace in MVP.

## 2. MVP Scope

Included:

- Creator profile.
- Public portfolio of community posts.
- Follow/unfollow.
- Basic creator counts.
- Optional profile avatar and bio.

MVP note:

- Bio and display name are editable now.
- Avatar metadata is represented by `avatarAssetId`, but avatar upload/asset
  ownership UI remains deferred until the canonical asset upload flow exists.
  The current page renders an initials fallback.

Deferred:

- Creator ranking.
- Creator badge system.
- Creator membership.
- Paid prompt marketplace.
- Creator analytics dashboard.
- Workflow library marketplace.
- Revenue sharing.

## 3. Data Model

```text
CreatorProfile
- id
- userId
- displayName
- handle
- bio
- avatarAssetId
- createdAt
- updatedAt
```

`followerCount` and `publicPostCount` are derived response fields. They are not
manually stored in the JSON profile record.

```text
CreatorFollow
- id
- followerUserId
- creatorProfileId
- status
- createdAt
- updatedAt
- deletedAt
```

Handle rules:

- Unique and stable.
- Lowercase URL-safe format.
- Changing handle later should preserve redirects if public traffic exists.

## 4. Profile UX

Recommended route:

```text
/creators/:handle
```

Show:

- Creator display name.
- Handle.
- Bio.
- Avatar.
- Follow button.
- Public post grid.
- Follower count and post count.

Do not show private projects, private collections, private prompts or internal statistics in MVP.

## 5. Account Integration

After registration, user may create a creator profile during onboarding or when first sharing a community post.

The internal MVP auto-creates a minimal creator profile from actor identity when
the user opens their profile or first shares a generated image. The owner can
edit display name and bio. Explicit pre-publish confirmation remains an
exposure gate before creator discovery becomes public.

## 6. Acceptance Criteria

- A community post links to a creator profile.
- Users can follow and unfollow creators.
- Creator profile displays only public published posts.
- Private account details are not exposed.
- First-time sharers receive one stable creator profile and can edit its public
  presentation.

## 7. Implementation Plan

### User Review Required

- Creator profile is lightweight in MVP.
- Follow is a simple social graph, not membership.
- Mock users can auto-create mock creator profiles for local testing.

### Proposed Files

```text
client/community/creatorProfilePage.js
client/community/followButton.js
client/community/creatorPortfolioGrid.js
server/repositories/community/CreatorProfileRepository.js
server/repositories/community/CreatorFollowRepository.js
server/domain/community/CreatorProfileService.js
server/app/routes/communityCreatorRoutes.js
```

Runtime data:

```text
server/data/community/creatorProfiles.json   // lazy array store
server/data/community/creatorFollows.json    // lazy array store
```

Canonical route flow:

```text
communityCreatorRoutes
  -> CreatorProfileService
    -> CreatorProfileRepository
    -> CreatorFollowRepository
    -> CommunityPostRepository
      -> jsonFileStore
```

API contract:

```text
GET    /api/community/creator-profiles/me
PATCH  /api/community/creator-profiles/me
GET    /api/community/creators/:handle
GET    /api/community/creators/:handle/posts
POST   /api/community/creators/:profileId/follow
DELETE /api/community/creators/:profileId/follow
```

All mutations derive the actor from `req.actorContext`. Profile responses expose
public presentation, aggregate counts and viewer-relative booleans only; they
must not expose `userId`, role, auth provider, credit data or private settings.

Feature exposure:

```text
community.creatorProfilesEnabled = true in local development
production without community.privateBeta = true -> forced false
```

The internal route is `/creators/:handle`. Community discovery must not link
arbitrary public profiles until Community-07 safety filtering is active.

### Process

1. Ensure creator profile exists when user first publishes.
2. Link posts to `creatorProfileId`.
3. Render public portfolio from published posts only.
4. Follow/unfollow changes one logical relation between active/deleted states.
5. Aggregate counts through service layer.

### Testing

- First share prompts creator profile creation/confirmation.
- Creator profile excludes private and hidden posts.
- Bob can follow/unfollow Alice.
- Private user account fields are not returned in public creator API.

### Implementation Record

Implemented modules:

```text
client/community/communityCreatorApi.js
client/community/creatorProfilePage.js
client/community/creatorPortfolioGrid.js
client/community/followButton.js
server/domain/community/CreatorProfileService.js
server/repositories/community/CreatorProfileRepository.js
server/repositories/community/CreatorFollowRepository.js
server/app/routes/communityCreatorRoutes.js
test/creatorProfile.test.js
```

Updated consumers and contracts:

```text
client/community/communityHomePage.js
client/shell/applicationShell.js
client/shell/navigationRegistry.js
client/index.html
client/style.css
client/i18n/locales/*/community.json
server/app/createApp.js
server/config/paths.js
server/domain/community/CommunityShareService.js
server/repositories/community/CommunityPostRepository.js
server/repositories/recordNormalizer.js
```

Verification remains pending until the repository Node checks and tests listed
in the implementation handoff pass.

