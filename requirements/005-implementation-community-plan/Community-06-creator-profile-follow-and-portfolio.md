# Community-06 Creator Profile, Follow and Portfolio

**Status:** Open - server profile and follow foundation
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
- followerCount
- publicPostCount
- createdAt
- updatedAt
```

```text
CreatorFollow
- followerUserId
- creatorProfileId
- createdAt
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

MVP may auto-create a minimal creator profile using account display name, but user should confirm public display name before first publish.

## 6. Acceptance Criteria

- A community post links to a creator profile.
- Users can follow and unfollow creators.
- Creator profile displays only public published posts.
- Private account details are not exposed.
- First-time sharers can create/confirm creator identity before publishing.

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

### Process

1. Ensure creator profile exists when user first publishes.
2. Link posts to `creatorProfileId`.
3. Render public portfolio from published posts only.
4. Follow/unfollow creates or removes follow record.
5. Aggregate counts through service layer.

### Testing

- First share prompts creator profile creation/confirmation.
- Creator profile excludes private and hidden posts.
- Bob can follow/unfollow Alice.
- Private user account fields are not returned in public creator API.

