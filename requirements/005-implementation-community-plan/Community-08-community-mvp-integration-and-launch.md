# Community-08 Community MVP Integration and Launch

**Status:** Proposed - Awaiting Review  
**Feature type:** Integration, readiness and launch gate  
**Depends on:** Community-01 through Community-07  
**Created:** 2026-07-15

## 1. Objective

Define the integration criteria for launching Community MVP without destabilizing Studio, History, Comparisons, Collections or commercial workflows.

## 2. End-to-End MVP Flows

Required launch flows:

```text
register/login -> open Home -> Freestyle with AI Assist
-> generate image -> share to Community -> view public post
-> another user remixes prompt -> generate new image
```

```text
existing generated result -> Share to Community
-> taxonomy suggestion -> publish
-> appears in Explore latest/category
```

```text
open Community -> filter by Fashion/Product/etc.
-> open post detail -> like/save/follow creator
```

## 3. Shared Foundation Dependencies

Community launch requires these shared platform capabilities to exist or have safe development adapters:

- Authentication and actor context.
- Public/private asset delivery policy.
- Generation result ownership.
- Application shell and module registry.
- Studio route prefill/remix support.
- Audit events for admin/support actions.
- Basic pagination and thumbnail infrastructure.

If any foundation is not production-ready, the community feature must be limited to internal/private beta.

## 4. Launch Checklist

- Home route enabled and tested.
- Community module registered in navigation.
- Share action available from approved result locations.
- Explore feed supports latest and official taxonomy filtering.
- Post detail respects prompt visibility.
- Remix opens Studio with editable config.
- Creator profile and follow work.
- Report/hide/remove works.
- Terms, privacy and AI disclosure copy are available.
- Metrics events are recorded.

## 5. Metrics Events

Track:

```text
community_post_viewed
community_prompt_opened
community_remix_clicked
community_remix_generated
community_post_shared
community_post_liked
community_post_saved
creator_followed
community_post_reported
community_post_hidden
```

Events must avoid storing raw private prompt text unless explicitly required by analytics policy.

## 6. Acceptance Criteria

- New users can understand where to start from Home.
- A shared post can be remixed into a new generation.
- Community browse does not require users to know how to classify content manually.
- Private prompts and private assets are not exposed publicly.
- Moderated posts are removed from discovery.
- MVP can be disabled through module registry without breaking Studio.

## 7. Implementation Plan

### User Review Required

- Launch gate can pass as private beta with mock user only; public MVP requires real auth.
- Community must be feature-flagged through module registry.
- Credit deduction foundation should exist before opening remix to non-test users.

### Proposed Files

```text
client/community/communityModule.js
client/community/communityRoutes.js
client/community/communityMetrics.js
server/community/communityRoutes.js
server/community/CommunityMetricsService.js
server/community/CommunityLaunchReadinessService.js
server/config/moduleFlags.json
test/communityMvpIntegration.test.js
```

### Process

1. Register Community module behind feature flag.
2. Wire Home, Feed, Share, Detail, Remix, Creator and Report flows.
3. Verify Scene Builder and History still work when Community is disabled.
4. Emit MVP metrics without raw private prompts.
5. Run private beta launch checklist.

### Testing

- End-to-end mock user flow: Alice shares, Bob remixes, admin hides.
- Module disabled state removes navigation and routes gracefully.
- Metrics events avoid raw prompt text.
- Studio, History, Comparison and Scene Builder still load without Community module.

