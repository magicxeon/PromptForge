# Community-05 Community Explore, Post Detail and Remix

**Status:** Proposed - Awaiting Review  
**Feature type:** Public discovery and generation reuse  
**Depends on:** Community-03, Community-04, Studio route integration  
**Created:** 2026-07-15

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
- Trending Today.
- Trending Week.
- Simple pagination or infinite load using shared list infrastructure.

Deferred:

- Personalized recommendation feed.
- Advanced ranking by creator reputation.
- Comment activity ranking.
- Paid/member-only feed.

## 4. Trending Rules

MVP trending score may use:

```text
views + likes + saves + remix clicks
```

Ranking must exclude:

- Private/unlisted posts.
- Hidden/removed posts.
- Low-confidence taxonomy posts from category trending.
- Posts flagged by moderation policy.

Use time windows:

```text
today
7_days
30_days later
```

Daily and weekly are required for MVP; monthly can be added after feed volume exists.

## 5. Post Detail

Show:

- Generated image.
- Creator display name and link.
- Title and description.
- Official tags and custom tags.
- Prompt according to visibility.
- Provider/model summary.
- Like/save actions.
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

MVP actions:

- Like/unlike.
- Save/bookmark.
- Remix click event.
- Follow creator from post detail.

Comments and voting separate from likes are deferred.

## 8. Acceptance Criteria

- Public posts can be browsed by latest and official taxonomy.
- Trending excludes low-confidence and moderated posts.
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
server/community/CommunityFeedService.js
server/community/CommunityRemixService.js
server/community/CommunityEventRepository.js
server/community/communityRoutes.js
```

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

