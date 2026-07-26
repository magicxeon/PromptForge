# Community-12 Engagement Events, Comments and Ranking Windows

**Status:** Proposed - Contract Ready For Implementation
**Feature type:** Shared Community engagement and deterministic ranking
**Depends on:** Community-03, Community-04, Community-07, Actor Context and Audit
**Created:** 2026-07-26

## 0. Delivery Gate

This requirement follows
`Community-00-009-feature-delivery-gates-and-non-duplication-plan.md`.

Current gates:

```text
Development  OPEN
Exposure     HIDDEN until Community-07 safety tests pass
```

Community-12 is the only owner of engagement records, flat comments,
comparison-slot votes, counters, ranking aggregates and score versions.
Community-05 consumes these APIs and must not create temporary browser scoring
or post-specific reaction stores. Community-07 remains the owner of report
policy, moderation transitions and ranking eligibility.

## 1. Business Requirement

Community must use one engagement system for every public post type:

```text
image       generated image shared to a category
template    reusable Scene Builder template
comparison  complete model comparison with multiple result slots
```

Every public post type supports:

- view;
- like/unlike;
- save/unsave;
- flat comments;
- report comment;
- successful remix/use-template attribution when applicable.

A comparison post additionally supports one active slot vote per viewer. The
post owner cannot vote on their own comparison.

Community must expose deterministic engagement rankings for rolling weekly,
monthly and yearly periods. Rankings are discovery aids, not claims that a
creator, model or provider is objectively better.

## 2. Scope

Included:

- Shared engagement event contract for all Community post types.
- Like, save and comment state.
- Comparison slot voting.
- Rolling `week`, `month` and `year` ranking windows.
- Global and official-category ranking.
- Versioned, explainable scoring.
- Basic deduplication and anti-abuse caps.
- Lifetime counters as a public read model.
- Daily aggregates that can migrate to SQL/materialized views later.

Deferred:

- Nested comment replies and comment reactions.
- Personalized recommendation.
- Creator leaderboard or reputation score.
- Paid promotion.
- ML-based ranking.
- Cross-device anonymous identity reconciliation.
- Real-time streaming counters.

## 3. Shared Post Contract

Do not create separate image, template and comparison post repositories.
`CommunityPost` remains the canonical public content record:

```text
CommunityPost
- id
- postType: image | template | comparison
- ownerUserId
- creatorProfileId
- sourceGenerationResultId: null | id
- sourceSceneTemplateSnapshotId: null | id
- sourceComparisonSetId: null | id
- title
- description
- officialTags[]
- customTags[]
- categoryCodes[]
- visibility: public | unlisted | private
- status: draft | published | hidden | removed | owner_unpublished
- moderationStatus
- taxonomyReviewStatus
- engagementSummary
- createdAt
- updatedAt
```

`postType` describes presentation and reusable behavior. Official category
placement always comes from Community-03 taxonomy. For example, a template may
appear in `content_type.fashion`; `template` itself is not a public category.

```text
EngagementSummary
- viewCount
- likeCount
- saveCount
- commentCount
- remixSuccessCount
- comparisonVoteCount
- updatedAt
```

These counters are a rebuildable read model. Immutable events and current
reaction/comment records are the source of truth.

## 4. Engagement Data Contracts

### 4.1 Immutable Event

```text
CommunityEngagementEvent
- id
- schemaVersion
- postId
- actorUserId: null | id
- anonymousSessionHash: null | hash
- eventType:
    view
    like_added | like_removed
    save_added | save_removed
    comment_created | comment_removed
    remix_started | remix_succeeded
    comparison_vote_added | comparison_vote_changed | comparison_vote_removed
- targetId: null | commentId | comparisonSlotId | generationJobId
- dedupeKey
- occurredAt
- requestId
- metadata
```

Do not store IP addresses, raw user agents, prompt text, Base64 images or private
reference URLs in engagement metadata.

### 4.2 Current Reaction State

```text
CommunityReaction
- postId
- actorUserId
- reactionType: like | save
- active
- createdAt
- updatedAt
```

Unique key: `(postId, actorUserId, reactionType)`.

### 4.3 Comment

```text
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

Comments are flat in MVP. Body is plain text, normalized server-side, bounded
to 1,000 characters and rendered with `textContent`; user HTML is prohibited.

### 4.4 Comparison Vote

Use the `ComparisonVote` contract in Community-05. Unique key:
`(postId, actorUserId)`. A changed vote replaces the current slot atomically.

### 4.5 Daily Aggregate

```text
CommunityEngagementDailyAggregate
- postId
- utcDate
- uniqueViewCount
- likeNetCount
- saveNetCount
- activeCommentCount
- remixSuccessCount
- comparisonVoteNetCount
- eligibleEventCount
- updatedAt
```

Unique key: `(postId, utcDate)`. This record is an optimization and can be
rebuilt from source records/events.

## 5. Ranking Windows

Supported query values:

```text
period=week   rolling previous 7 x 24 hours
period=month  rolling previous 30 x 24 hours
period=year   rolling previous 365 x 24 hours
```

All boundaries use UTC. The API returns `windowStart`, `windowEnd`,
`algorithmVersion` and `calculatedAt` so clients never infer ranking boundaries.

Both modes use the same eligible event set:

- `sort=top` uses the raw weighted score inside the selected period.
- `sort=trending` applies recency decay to the raw score.

## 6. MVP Scoring Algorithm

Algorithm id: `community_engagement_v1`.

```text
rawScore =
  ln(1 + uniqueViews)
  + (3 * activeLikes)
  + (4 * activeSaves)
  + (5 * eligibleActiveComments)
  + (8 * successfulRemixes)
  + (2 * activeComparisonVotes)

trendingScore =
  rawScore
  * taxonomyEligibilityMultiplier
  * moderationEligibilityMultiplier
  / (1 + postAgeHours / halfLifeHours) ^ 1.2
```

Half-life:

```text
week   48 hours
month  168 hours
year   2160 hours (90 days)
```

Multipliers:

```text
taxonomy high-confidence or admin-confirmed    1.00
taxonomy creator-confirmed medium-confidence   0.85
taxonomy low-confidence / unconfirmed          0.00 for category ranking
moderation eligible                            1.00
moderation flagged / hidden / removed          0.00
```

Global `Latest` does not use the score. Category rankings require the queried
official tag to exist in the post's eligible `categoryCodes` or
`trendingCategoryCodes`.

The algorithm configuration is source-controlled and versioned. Do not
hard-code weights independently in route or client modules.

## 7. Integrity and Anti-Abuse Rules

- Mutations use `req.actorContext`; request body username is never trusted.
- One active like and one active save exist per actor/post.
- One comparison vote exists per actor/comparison post.
- Authenticated views count once per actor/post per 24 hours for ranking.
- Anonymous views use a rotating, non-reversible session hash and count once
  per post per 24 hours.
- Owner views, likes, saves, votes and comments do not increase ranking score.
- Owner comments remain visible but are excluded from `eligibleActiveComments`.
- At most three comments per actor/post/day affect ranking; additional valid
  comments remain visible.
- Removed/hidden comments stop contributing after aggregate reconciliation.
- Remix score is recorded only after a successful generated result is owned by
  the remixing actor. A button click alone is not a successful remix.
- Hidden, removed, private and unlisted posts reject public engagement.
- Admin/support moderation and aggregate repair actions are audited.

## 8. API Contract

Canonical endpoints:

```text
GET    /api/community/posts?sort=latest|top|trending&period=week|month|year
GET    /api/community/posts?officialTag=<tagId>&sort=trending&period=week
GET    /api/community/posts/:postId/engagement
POST   /api/community/posts/:postId/views
PUT    /api/community/posts/:postId/reactions/like
DELETE /api/community/posts/:postId/reactions/like
PUT    /api/community/posts/:postId/reactions/save
DELETE /api/community/posts/:postId/reactions/save
GET    /api/community/posts/:postId/comments
POST   /api/community/posts/:postId/comments
DELETE /api/community/posts/:postId/comments/:commentId
POST   /api/community/posts/:postId/comments/:commentId/report
PUT    /api/community/posts/:postId/comparison-vote
DELETE /api/community/posts/:postId/comparison-vote
```

`remix_succeeded` is emitted by the trusted generation/remix completion service,
not by a public client endpoint.

Public engagement detail returns aggregate counts, `viewerState` for the active
actor and paginated public comments. It never returns voter/liker/saver lists.

## 9. Software Design

Client ownership:

```text
client/community/communityApi.js
client/community/communityEngagementActions.js
client/community/communityCommentThread.js
client/community/communityRankingControls.js
client/community/communityFeed.js
client/community/communityPostDetail.js
client/community/communityComparisonEngagement.js
client/i18n/locales/<locale>/community.json
```

Server ownership:

```text
server/app/routes/communityEngagementRoutes.js
server/domain/community/CommunityEngagementService.js
server/domain/community/CommunityRankingService.js
server/domain/community/communityEngagementPolicy.js
server/config/community-engagement-policy.json
server/repositories/community/CommunityEngagementEventRepository.js
server/repositories/community/CommunityReactionRepository.js
server/repositories/community/CommunityCommentRepository.js
server/repositories/community/CommunityEngagementAggregateRepository.js
server/repositories/community/CommunityComparisonVoteRepository.js
server/data/community/engagementEvents.json
server/data/community/reactions.json
server/data/community/comments.json
server/data/community/engagementDailyAggregates.json
scripts/rebuild-community-engagement.js
```

Every JSON mutation uses `server/repositories/json/jsonFileStore.js`. Routes
translate HTTP input and delegate behavior; they do not calculate scores or
write files. Feed queries call `CommunityRankingService` rather than duplicating
ranking calculations.

Future database mapping:

```text
community_engagement_events
community_reactions
community_comments
community_comparison_votes
community_engagement_daily_aggregates
```

JSON repository contracts must keep the same unique keys and method boundaries
so PostgreSQL migration does not alter domain or client APIs.

## 10. Input, Process and Output

```text
Input
  actor context + post id + action

Process
  authorize public post
  -> validate/dedupe action
  -> mutate current state atomically
  -> append immutable event
  -> update/rebuild engagement summary and daily aggregate
  -> audit moderation-sensitive actions

Output
  sanitized engagement summary
  viewerState
  ranking metadata when requested
```

Event append and current-state mutation must be idempotent by request/dedupe key.
If atomic multi-file commit cannot be guaranteed in the JSON phase, current
state is authoritative and a deterministic rebuild repairs event/read-model
drift.

## 11. Impact and Compatibility

- Community-03 remains the only owner of official taxonomy eligibility.
- Community-04 remains the only owner of publishing and immutable snapshots.
- Community-05 owns feed/detail/remix presentation and consumes this service.
- Community-07 owns reporting, hiding and moderation decisions.
- Comparison domain remains private generation history; only its sanitized
  Community post snapshot receives public votes/comments.
- Existing `likeCount`, `saveCount`, `remixCount` and `viewCount` fields become
  compatibility read-model fields, not independent sources of truth.
- Existing `remixEvents.json` can be migrated into immutable events without
  changing public post ids.
- No provider or generation logic is added to Community engagement modules.

## 12. Implementation Plan

1. Add versioned engagement policy configuration and validation.
2. Implement repository contracts and JSON stores with unique-key enforcement.
3. Implement engagement authorization, dedupe and current-state mutations.
4. Add plain-text comment and comparison-vote services.
5. Emit trusted successful-remix events from the existing generation completion
   path.
6. Implement daily aggregate rebuild and `community_engagement_v1`.
7. Expose summary, action, comment and ranking endpoints.
8. Make Community-04 initialize an empty engagement read model on publish.
9. Add reusable engagement actions/comment UI to every post type.
10. Connect Community-05 feed filters to `sort` and `period`.
11. Add comparison voting without copying the private Comparison workspace data
    contract.
12. Backfill existing posts and remix events, then validate aggregate parity.

Implementation order avoids rework:

```text
contracts/repositories
-> service and ranking tests
-> APIs
-> shared UI
-> feed/detail integration
-> backfill and launch validation
```

## 13. Testing

Automated:

- actor cannot like/save/vote twice;
- unlike/unsave and vote changes produce correct net counts;
- owner engagement does not affect ranking;
- view dedupe respects the 24-hour window;
- removed comments stop affecting aggregates;
- comments reject blank, oversized and unsafe rendered content;
- private/unlisted/hidden/removed posts reject engagement;
- successful remix counts only after owned generation completion;
- week/month/year boundaries use UTC and exclude older events;
- scoring fixtures produce stable results for the same algorithm version;
- low-confidence taxonomy posts cannot enter category Trending;
- feed never exposes actor lists or private event metadata;
- aggregate rebuild matches authoritative reaction/comment/vote state;
- concurrent JSON writes do not lose sibling reactions.

Manual:

1. Alice publishes one image, one template and one comparison.
2. Bob likes and comments on all three, saves the template and votes on one
   comparison slot.
3. Verify counters and Bob's viewer state.
4. Switch back to Alice and verify Bob's private actor identifiers are absent.
5. Filter Fashion ranking by week, month and year.
6. Hide a post as admin/support and verify it leaves ranking immediately.
7. Remove a comment and rebuild aggregates; verify score and count decrease.

## 14. Acceptance Criteria

- Image, template and comparison posts use one engagement contract.
- All three post types support likes and flat comments.
- Templates and remixable images record successful reuse separately from clicks.
- Comparison posts support one slot vote per non-owner actor.
- Weekly, monthly and yearly ranking return deterministic versioned metadata.
- Category ranking uses Community-03 eligibility and moderation status.
- Counters can be rebuilt without reading mutable client state.
- Client and route modules contain no duplicate scoring weights.
- Repository interfaces can migrate from JSON to PostgreSQL without changing
  public APIs or domain behavior.
