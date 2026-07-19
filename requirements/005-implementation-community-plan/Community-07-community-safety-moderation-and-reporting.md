# Community-07 Community Safety, Moderation and Reporting

**Status:** Proposed - Awaiting Review  
**Feature type:** Public content safety and administrative controls  
**Depends on:** Authentication, audit, assets, community posts  
**Created:** 2026-07-15

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
server/community/CommunityReportRepository.js
server/community/CommunityModerationService.js
server/community/CommunityAuditRepository.js
server/community/routes/moderationRoutes.js
```

### Process

1. Authenticated viewer reports a post.
2. Service stores report with reason and actor.
3. Admin/support can hide/remove with reason.
4. Feed and trending services filter hidden/removed posts.
5. Public detail returns generic unavailable state when removed.

### Testing

- Report requires actor context.
- Hidden post disappears from feed/trending.
- Removed post does not expose prompt or asset data.
- Admin action stores actor, target, reason and timestamp.

