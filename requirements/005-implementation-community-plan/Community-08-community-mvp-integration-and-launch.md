# Community-08 Community MVP Integration and Launch

**Status:** Implemented for internal E2E validation - Commercial blockers retained
**Feature type:** Integration, readiness and launch gate  
**Depends on:** Community-01 through Community-07, Community-09 and Community-12
**Created:** 2026-07-15

## 0. Delivery Gate

This requirement follows
`Community-00-009-feature-delivery-gates-and-non-duplication-plan.md`.

Current gates:

```text
Development  OPEN
Exposure     INTERNAL
```

Community-06, Community-07 and Community-12 server exit gates have passed.
Community-05 and Community-09 are being closed in this delivery. Community-08
may add integration/readiness checks, but remains a consumer rather than an
owner of post, profile, moderation, gallery, engagement, credit or generation
business logic.

When opened, Community-08 may add only feature-flag wiring, readiness checks,
metrics adapters, navigation exposure and end-to-end launch tests. The first
allowed exposure is `PRIVATE_BETA`; public exposure additionally requires
production authentication and asset/security operations outside the local mock
actor adapter.

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
server/app/routes/communityRoutes.js
server/domain/community/CommunityMetricsService.js
server/domain/community/CommunityLaunchReadinessService.js
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

## 8. Pre-Commercial Readiness Decision

This phase does not claim public-production readiness while mock actors and JSON
repositories remain active. It establishes a tested `INTERNAL` baseline:

```text
Community Home -> 3-layer Explore -> Post Detail
-> engagement / creator / report / template handoff
-> curated Gallery / Character handoff
-> owned Collection share / public Collection detail
```

Required exit artifacts:

- readiness response for feature/dependency state without sensitive data;
- E2E coverage for Alice publish, Bob browse/react/remix and admin hide;
- direct-route coverage for `/community` and `/community/:postId`;
- feature-off regression proving Studio and Playground remain available;
- documented production blockers: authentication, durable database, object
  storage/CDN, payment and operational monitoring.

## 9. Readiness Implementation

The canonical readiness surface is:

```text
GET /api/community/readiness

server/domain/community/CommunityLaunchReadinessService.js
server/app/routes/communityReadinessRoutes.js
test/communityMvpIntegration.test.js
scripts/test-community-commercial-readiness.bat
```

The response distinguishes:

```text
readyForInternal
readyForPrivateBeta
readyForProduction
missingInternalFeatures
productionBlockers
```

It deliberately contains no prompt, image, reference or actor-private data.
Internal readiness requires Share, Explore, Engagement, Creator Profiles,
Gallery and Moderation. Production readiness remains false while mock actors,
JSON repositories and local output storage are active.

Validation must prove:

1. Community direct routes load the app shell.
2. Alice can publish and curate a post.
3. Bob can browse, view, react, comment and use an allowed template.
4. Private Character references require Bob to replace them.
5. Admin moderation removes a post from discovery.
6. Disabling Community leaves Studio and Playground usable.
7. Alice can share a non-empty Collection; Bob can browse its public snapshot
   without receiving source Collection IDs, History job IDs or raw output paths.

