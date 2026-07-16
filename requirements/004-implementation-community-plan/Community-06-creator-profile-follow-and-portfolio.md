# Community-06 Creator Profile, Follow and Portfolio

**Status:** Proposed - Awaiting Review  
**Feature type:** Creator identity and lightweight social graph  
**Depends on:** Authentication, Community posts  
**Created:** 2026-07-15

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

