# Community-07 Community Safety, Moderation and Reporting

**Status:** Implemented - verification pending
**Feature type:** Public content safety and administrative controls  
**Depends on:** Authentication, audit, assets, community posts  
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

- Post and comment report contracts.
- Post moderation state transitions and server-side feed eligibility.
- Owner unpublish and authorized admin/support hide/remove actions.
- Audit events for material moderation actions.

Keep closed:

- Automated appeals, creator strikes and complex moderation queues.
- A second admin/audit foundation; reuse Community-00-008.
- Comment storage and engagement counters; Community-12 owns them and delegates
  report/moderation decisions here.

Community-07 passes its exit gate when hidden/removed content is excluded by
repository/service queries, public detail is sanitized and all privileged state
changes are role-checked and audited.

## 1. Objective

Make public community publishing safe enough for MVP by adding basic visibility controls, reporting and admin/support moderation.

The first MVP does not need a complex moderation queue, but public content must be removable, auditable and excluded from discovery when unsafe or disputed.

## 2. Safety Scope

Required:

- Report post.
- Hide post from public feeds.
- Remove post by admin/support.
- Owner unpublish/delete.
- Exclude reported/hidden content from Trending.
- Audit admin/support actions.
- AI disclosure on generated content where appropriate.

Deferred:

- Full community comment moderation.
- Creator strike system.
- Automated appeal workflow.
- Public transparency reports.

## 3. Report Reasons

MVP report reasons:

```text
copyright_or_ownership
inappropriate_content
misleading_or_spam
private_information
wrong_category
other
```

Reports should be rate-limited and require authentication.

MVP rate limit:

```text
5 new reports per authenticated actor per rolling hour
```

Submitting the same open report reason for the same post is idempotent and does
not consume another limit. The duplicate/rate-limit check and write occur in one
repository mutation.

## 4. Moderation States

```text
published
reported
hidden
removed
owner_unpublished
```

Rules:

- `reported` may remain visible unless threshold or policy requires hiding.
- `reported` remains eligible for Latest in this phase but is excluded from
  Trending.
- `hidden` is not shown in feeds or search but may be visible to owner/admin.
- `removed` is not public and should show a generic unavailable state.
- Admin/support changes require actor, target, reason and timestamp.

## 5. Public Content Guardrails

- Public post APIs return only sanitized snapshots.
- Hidden prompt fields must remain hidden in all views and API responses.
- Asset delivery must use approved public thumbnails/assets, not private originals.
- Community pages should show AI-generated disclosure and any required terms/usage notice.

## 6. Acceptance Criteria

- Authenticated users can report public posts.
- Admin/support can hide or remove posts with audit record.
- Hidden/removed posts disappear from Explore and Trending.
- Prompt visibility cannot be bypassed through post detail or remix APIs.
- Public assets are served through the approved asset delivery policy.

## 7. Implementation Plan

### User Review Required

- MVP moderation is basic but must be auditable.
- `admin_demo` from Community-10 can be used for local moderation testing.
- Safety must apply to API responses, not only hidden UI fields.

### Proposed Files

```text
client/community/reportPostDialog.js
client/community/moderationBanner.js
client/community/communityModerationApi.js
server/repositories/community/CommunityReportRepository.js
server/domain/community/CommunityModerationService.js
server/repositories/audit/AuditLogRepository.js
server/app/routes/communityModerationRoutes.js
```

Runtime data:

```text
server/data/community/communityReports.json  // lazy private array store
```

Canonical service flow:

```text
POST /api/community/posts/:postId/reports
  -> CommunityModerationService.reportPost()
    -> CommunityReportRepository.createWithRateLimit()
    -> CommunityPostRepository.markReported()

POST /api/admin/community/posts/:postId/moderation
  -> CommunityModerationService.moderate()
    -> CommunityPostRepository.setModerationStatus()
    -> AuditService -> AuditLogRepository
```

Compatibility route
`POST /api/scene-templates/shared/:postId/moderate` delegates to the same
`CommunityModerationService` in the application singleton. It must not own a
second moderation policy or persistence path.

Additional API:

```text
GET /api/admin/community/reports
```

This endpoint is internal, role-checked by `AdminPolicyService`, and returns
private moderation records only to admin/support actors.

### Process

1. Authenticated viewer reports a post.
2. Service stores report with reason and actor.
3. Admin/support can hide/remove with reason.
4. Feed and trending services filter hidden/removed posts.
5. Public detail returns generic unavailable state when removed.

The internal creator portfolio supplies the first report-button consumer.
Community-05 should reuse `ModelPromptForgeReportPostDialog` and
`ModelPromptForgeModerationBanner` rather than rebuild report UI.

### Testing

- Report requires actor context.
- Duplicate reports are idempotent and concurrent writes preserve one open
  logical report.
- A sixth new report inside one rolling hour returns
  `community_report_rate_limited`.
- Reported posts remain in Latest and are excluded from Trending.
- Hidden post disappears from feed/trending.
- Removed post does not expose prompt or asset data.
- Admin action stores actor, target, reason and timestamp.

### Implementation Record

Implemented modules:

```text
client/community/communityModerationApi.js
client/community/reportPostDialog.js
client/community/moderationBanner.js
server/repositories/community/CommunityReportRepository.js
server/domain/community/CommunityModerationService.js
server/app/routes/communityModerationRoutes.js
test/communityModerationReporting.test.js
scripts/test-community-07.bat
```

Updated canonical consumers:

```text
client/community/creatorPortfolioGrid.js
client/community/creatorProfilePage.js
client/index.html
client/style.css
client/i18n/locales/*/community.json
server/app/createApp.js
server/app/routes/adminRoutes.js
server/config/paths.js
server/domain/community/CommunityShareService.js
server/domain/community/communityPostPolicy.js
server/domain/community/communityPostPublicView.js
server/repositories/community/CommunityPostRepository.js
test/communityOwnershipPolicy.test.js
```

Exposure remains `INTERNAL`. `community.exploreEnabled` stays false and this
implementation does not add a public Community feed or moderation queue.
`CommunityFeaturePolicyService` forces `community.moderationEnabled` off outside
development unless `community.privateBeta` is explicitly enabled.
Verification remains pending until the Node checks and tests from the handoff
pass.

