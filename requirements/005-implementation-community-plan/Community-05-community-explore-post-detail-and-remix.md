# Community-05 Community Explore, Post Detail and Remix

**Status:** In progress - Explore feed enabled internally after Community-06, Community-07 and Community-12 server exit gates
**Feature type:** Public discovery and generation reuse  
**Depends on:** Community-03, Community-04, Community-12 engagement contract, Studio route integration
**Created:** 2026-07-15

## 0. Delivery Gate

This requirement follows
`Community-00-009-feature-delivery-gates-and-non-duplication-plan.md`.

Current gates:

```text
Development  OPEN
Exposure     INTERNAL
```

Agents may refine feed/detail read models and client consumption contracts now.
Do not implement authoritative reactions, comments, votes, ranking or moderation
inside Community-05. Community-12 owns engagement and ranking; Community-07 owns
reporting, moderation status and feed eligibility; Community-06 owns creator
profiles and follows.

Community-05 is now `OPEN` because those three server contracts and tests have
passed. Its implementation assembles their APIs into Explore, Post Detail and
Remix without introducing replacement repositories or formulas.

### 0.1 Current Internal Delivery

Implemented:

- Public image cards on `/community`.
- Latest, Trending Week, Trending Month and Top Year queries.
- Safe public media URLs through the existing Community media access endpoint.
- Loading, empty, unavailable-image and retry states.
- Responsive desktop/mobile feed layout.

Still pending in Community-05:

- Search and official taxonomy filtering.
- Post detail route and dialog/page.
- Like, save, comments, report and comparison-vote controls.
- Creator deep links and Remix handoff from a feed card.

Canonical client owner:

```text
client/community/communityFeed.js
```

The feed consumes `client/community/communityEngagementApi.js`; it does not
calculate ranking or persist engagement in the browser.

Server exposure is governed by:

```text
server/config/community-feature-flags.json
server/domain/community/CommunityFeaturePolicyService.js
GET /api/community/features
```

Community-05 routes must call the server policy. Hiding navigation or controls
without rejecting disabled server operations is not sufficient. Until the
development gate opens, `community.exploreEnabled` and
`community.engagementEnabled` remain false.

## 1. Objective

Create the main Community discovery experience where users can browse generated images, inspect safe prompt/workflow details and launch a remix in Studio.

## 2. Routes

Recommended routes:

```text
/community
/community/:postId
/studio/remix/:postId
```

Route names may follow the final router convention, but post detail and remix must support deep links.

## 3. Explore Feed MVP

Feed capabilities:

- Latest public posts.
- Filter by official taxonomy.
- Search title, creator display name and custom tags.
- Trending Week.
- Top/Trending Month.
- Top/Trending Year.
- Simple pagination or infinite load using shared list infrastructure.

Deferred:

- Personalized recommendation feed.
- Advanced ranking by creator reputation.
- Paid/member-only feed.

## 4. Trending Rules

MVP feed consumes the versioned `community_engagement_v1` score defined by
Community-12. This requirement does not own weights or calculate scores.

Ranking must exclude:

- Private/unlisted posts.
- Hidden/removed posts.
- Low-confidence taxonomy posts from category trending.
- Posts flagged by moderation policy.

Use time windows:

```text
week
month
year
```

Ranking calculation, eligibility, deduplication and version metadata are owned
by Community-12. Community-05 sends `sort=top|trending` and
`period=week|month|year`; it must not recalculate scores in the browser.

## 5. Post Detail

Show:

- Generated image.
- Creator display name and link.
- Title and description.
- Official tags and custom tags.
- Prompt according to visibility.
- Provider/model summary.
- Like/save actions.
- Flat comment thread and report actions.
- `Use / Remix Prompt` action.

Do not show:

- Full internal config JSON by default.
- Technical provider errors.
- Private source asset URLs.
- Billing or credit information.

## 6. Remix Flow

```text
open post -> click Use / Remix Prompt
-> create remix draft from snapshot
-> map shared config to current Studio schema
-> resolve provider/model availability
-> open Studio with prefilled config
-> user reviews and generates
```

Fallback behavior:

- If the original provider/model is unavailable, choose a supported equivalent or ask user to select.
- If a shared field no longer exists, preserve it as custom prompt text and warn quietly.
- If a character/model reference is not public, use public identity description only or require user replacement.

## 7. Engagement Actions

Base image-post MVP actions:

- Like/unlike.
- Save/bookmark.
- Flat comments and comment reporting.
- Remix click event.
- Follow creator from post detail.

The same likes, saves and flat comments apply to image, template and comparison
posts through Community-12. Comparison-specific voting is defined in Section
7.1. Nested replies and comment reactions remain deferred.

### 7.1 Comparison Post Voting and Comments

Community must support a distinct `comparison` post type for a shared model
comparison. Its purpose is to invite a useful human judgment such as which
result best follows a particular prompt, preserves identity, renders clothing,
or looks most realistic. It must not present a vote total as a universal claim
that one provider or model is objectively better.

#### Business Requirement

- A creator can publish either one selected comparison result as a normal image
  post, or publish the complete comparison as a `comparison` post.
- A comparison post shows the selected criteria, the same public-safe prompt
  snapshot and generation context for every visible slot.
- A signed-in actor may choose one winning slot per comparison post. Choosing a
  different slot replaces the prior vote; choosing the same slot again removes
  it. The post owner cannot vote on their own comparison.
- A signed-in actor can create a text comment, delete their own comment and
  report another comment. Nested replies, reactions on comments and creator
  rating leaderboards are deferred.
- Public counters show total votes, vote count by slot and comment count.
- The creator may select `public`, `unlisted` or `private` visibility before
  publication. Only public posts participate in engagement and trending.

#### Comparison Snapshot Contract

```text
CommunityPost
- postType: image | template | comparison
- comparisonSnapshot: null | ComparisonPostSnapshot
- engagementSummary

ComparisonPostSnapshot
- schemaVersion
- sourceComparisonSetId
- promptVisibility
- publicPromptSnapshot
- criteria[]
- slots[]
  - slotId
  - displayOrder
  - providerDisplayName
  - modelDisplayName
  - publicImageAssetId
  - publicThumbnailAssetId
  - generationSettingsSnapshot
- creatorSelectedWinnerSlotId
- createdAt

ComparisonVote
- id
- postId
- slotId
- actorUserId
- createdAt
- updatedAt

CommunityComment
- id
- postId
- actorUserId
- body
- status: active | hidden | removed
- createdAt
- updatedAt
- deletedAt
```

`ComparisonPostSnapshot` is immutable after publish. It must reuse the
sanitized public asset/reference rules from Community-04 and
Community-00-004. It must never store provider keys, raw provider payloads,
private reference URLs, credit data or a private source image identifier.

#### System Design and Integrity Rules

1. The server derives eligible slots from a completed comparison set owned by
   the actor; the browser must not submit arbitrary image URLs or vote counts.
2. Vote uniqueness is `(postId, actorUserId)`. Repository writes must be atomic
   so concurrent updates cannot create two votes for one actor.
3. The public read model exposes only aggregate vote counts and the viewer's
   own `viewerVoteSlotId`; it does not expose a voter list in MVP.
4. Comments are plain text with a bounded length, server-side normalization and
   HTML escaping on display. Rendering user comment HTML is prohibited.
5. Comment and vote mutations require actor context and create an audit event.
   The report flow delegates to the Community-07 moderation contract.
6. Private, unlisted, hidden, removed or inaccessible posts reject public
   votes/comments. A change to hidden/removed recalculates public aggregates.
7. Trending may include qualified comparison votes and comments only after
   basic anti-abuse rate limiting exists. MVP ranking uses small bounded weights
   and must retain the post's original provider/model context.

#### UI Behavior

- Comparison cards show a single `Vote for this result` affordance. The active
  choice is visually clear and can be changed without a confirmation dialog.
- The score summary appears under the result cards as counts, not a fabricated
  percentage quality score.
- The post detail page has a compact comment composer, chronological comment
  list and a report action on each visible comment.
- Share Preview asks for title, description, prompt visibility and optional
  comparison criteria before publish. It must warn when a slot cannot be made
  public due to reference ownership policy.

#### Implementation Plan

Client ownership:

```text
client/community/communityComparisonPost.js
client/community/communityComparisonEngagement.js
client/community/communityCommentThread.js
client/community/communityApi.js
client/comparisons/comparisonDashboard.js
client/core/lightboxService.js
```

Community-05 server consumers:

```text
server/app/routes/communityRoutes.js
server/domain/community/CommunityComparisonShareService.js
server/repositories/community/CommunityPostRepository.js
```

Canonical Community-12 owners used by this UI:

```text
server/domain/community/CommunityEngagementService.js
server/repositories/community/CommunityComparisonVoteRepository.js
server/repositories/community/CommunityCommentRepository.js
server/repositories/community/CommunityEngagementEventRepository.js
server/domain/community/CommunityRankingService.js
```

Community-05 must not create fallback vote, comment, counter or ranking stores
when a Community-12 module is missing. Keep the action hidden until its owner is
available.

Process:

1. Creator opens a completed comparison and chooses `Share comparison`.
2. Server creates a sanitized comparison draft from owned completed slots.
3. Creator supplies presentation data and criteria, then publishes an immutable
   snapshot.
4. Viewer opens the public post, votes for one eligible slot and/or posts a
   comment.
5. Server atomically updates the engagement repositories, audit event and the
   post read-model aggregate.
6. `Use Template` remains governed by the existing snapshot/reference policy;
   voting and commenting never grant access to private source assets.
7. Vote and comment events feed Community-12 aggregates; this section does not
   define a second score or counter store.

Testing:

- Owner can publish a comparison only from an owned, completed set.
- Private reference slots are removed from the public comparison snapshot.
- An actor can hold only one vote per comparison and cannot vote on their own
  post.
- Changing a vote updates counts without duplication.
- Public post detail returns aggregate counts and viewer vote, never voter IDs.
- Comment validation rejects blank, oversized and unsafe rendered content.
- Hidden/removed posts reject new votes/comments and disappear from public feed.

## 8. Acceptance Criteria

- Public posts can be browsed by latest and official taxonomy.
- Trending excludes low-confidence and moderated posts.
- Week, month and year controls return server-calculated ranking metadata.
- Post detail respects prompt visibility settings.
- Remix opens Studio with a usable prefilled config.
- Provider/model fallback is handled without breaking the flow.

## 9. Implementation Plan

### User Review Required

- Explore can begin as a local/mock feed, but route and data contracts should match future Community module.
- `Use / Remix Prompt` should route into Scene Builder, not duplicate generation UI inside Community.
- Remix generation pays from the active viewer's credits once Community-11 is implemented.

### Proposed Files

```text
client/community/communityFeed.js
client/community/communityPostDetail.js
client/community/communityRemixActions.js
client/community/communityApi.js
client/scene-builder/sceneTemplateHydrator.js
client/scene-builder/sceneReplacementChecklist.js
server/domain/community/CommunityFeedService.js
server/domain/community/CommunityRemixService.js
server/app/routes/communityRoutes.js
```

`CommunityRankingService` and engagement repositories are intentionally absent
from this list because Community-12 owns them.

### Process

1. Feed loads published, non-hidden posts.
2. User opens post detail.
3. Prompt/snapshot display follows visibility policy.
4. `Use Template` requests a sanitized remix handoff.
5. Scene Builder hydrates selections and replacement slots.
6. Remix event is recorded after successful generation, not merely on click.

### Testing

- Latest feed excludes private/unlisted/hidden posts.
- Post detail hides prompt according to visibility.
- Use Template opens Scene Builder checklist.
- Missing required replacement blocks generation.
- Provider unavailable state shows warning or asks user to select an available model.

