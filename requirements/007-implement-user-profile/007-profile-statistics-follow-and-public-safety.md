# User Profile 007 - Statistics, Follow and Public Safety

**Status:** Implemented; validation pending

## 1. Business Requirement

Creator statistics should build trust and value while protecting user privacy.
Follow and engagement must use existing Community contracts.

## 2. Public Statistics

Allowed:

- follower count
- following count
- public post count
- public Character count
- aggregate Likes
- aggregate successful Character/Template uses
- aggregate Remixes
- public Comparison votes

Not public:

- credit balance or spending
- generation failures
- private/draft counts
- identities of users who reused a Character
- provider cost details
- moderation notes
- support/admin audit data

All values are aggregates. Missing analytics data normalizes to zero.

## 3. Aggregation Strategy

Do not calculate complete historical aggregates synchronously for every page
view.

MVP priority:

1. reuse existing Community engagement aggregate repository
2. use bounded repository aggregate queries
3. expose a stable statistics snapshot with `updatedAt`

Prepare for later materialized/database aggregates without changing the page
response.

## 4. Follow Behavior

Reuse `followButton` and Creator Follow service:

- owner never sees Follow
- one active relation per viewer/profile
- Follow/Unfollow is idempotent
- button uses pending state
- count updates from server response
- actor switching reloads viewer relationship

## 5. Reporting and Moderation

Public viewer may report a profile through the canonical moderation flow.

- report action hidden for owner
- report payload references creator profile ID
- no private profile data enters report
- hidden/suspended profile returns a stable unavailable state
- individual content moderation still belongs to each content record

Do not add block/mute systems in this phase; preserve extension points.

## 6. Badge Policy

Verified, Featured Creator or similar badges:

- server-issued only
- rendered as presentation metadata
- owner cannot self-assign
- absence must not alter layout dimensions

Badge administration remains deferred to backoffice/commercial scope.

## 7. File-Level Implementation Plan

Extend:

```text
server/domain/community/CreatorProfilePageService.js
server/domain/community/CreatorProfileService.js
server/domain/community/CommunityEngagementService.js
server/repositories/community/CommunityEngagementAggregateRepository.js
client/community/creatorProfileHeader.js
client/community/followButton.js
client/community/moderationBanner.js
client/community/reportPostDialog.js or a shared report dialog adapter
```

Create a new repository only if no canonical aggregate contract can answer the
query. Prefer extending the existing aggregate repository.

Implementation sequence:

1. Define the public statistics allowlist and snapshot fixture.
2. Extend bounded aggregate queries.
3. Add statistics to the page model.
4. Reuse Follow state and mutations.
5. Connect profile reporting through moderation.
6. Verify hidden/suspended response behavior.

## 8. Impact

- Public profile gains aggregate social proof.
- No billing, private analytics or user-level usage identity is exposed.
- Existing Follow and moderation records remain unchanged.
- Aggregate unavailability must not block core profile rendering.

## 9. Cases

- zero engagement
- aggregate temporarily unavailable
- viewer rapidly follows/unfollows
- same actor opens multiple tabs
- owner opens own profile
- reported creator content remains under review
- suspended profile direct URL
- count changes after mutation
- mock actor switching

## 10. Tests

- public statistics contain allowlisted fields only
- private and credit fields absent
- aggregate zeros are stable
- follow idempotency and self-follow prevention
- report owner restriction
- suspended/hidden profile behavior
- actor-relative state refresh
- badge cannot be written by owner profile endpoint

## 11. Exit Criteria

- public metrics are useful and privacy-safe
- Follow remains one canonical implementation
- reporting uses existing moderation flow
- no analytics behavior blocks profile rendering
