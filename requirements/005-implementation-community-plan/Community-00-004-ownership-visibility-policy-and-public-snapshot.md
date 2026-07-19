# Community-00-004 Ownership, Visibility Policy and Public Snapshot

**Status:** Proposed - Awaiting Review  
**Feature type:** Authorization, privacy and public read model contract  
**Depends on:** Actor Context, repository schema, Scene Builder reference policy  
**Created:** 2026-07-19

## 1. Business Requirement

Community must let users share and remix work without leaking private prompts, references or generated assets. Ownership and visibility must be enforced on the server before public Community screens are built.

## 2. System Design

### 2.1 Ownership Policy

Ownership fields:

```text
ownerUserId
creatorProfileId
sourceGenerationResultId
sourceAssetId
```

Rules:

- Owners can edit presentation fields of their own drafts/posts.
- Owners cannot mutate immutable published snapshots except by creating a new revision.
- Viewers can read only public/unlisted allowed fields.
- Admin/support can hide/remove with audit reason.
- Community does not grant access to the original private generation result.

### 2.2 Visibility Policy

```text
private
unlisted
public
```

Status:

```text
draft
published
reported
hidden
removed
owner_unpublished
```

Rules:

- `private` is owner/admin only.
- `unlisted` requires direct link and still returns sanitized public data.
- `public` can appear in feed, gallery and creator profile.
- `hidden` and `removed` are excluded from feed/trending.
- `removed` returns generic unavailable state for non-admin viewers.

### 2.3 Public Snapshot Contract

Public APIs must return read models, not raw records:

```text
CommunityPostPublicView
- id
- creator
- title
- description
- imageUrl
- thumbnailUrl
- officialTags
- customTags
- promptVisibility
- promptPreview
- providerModelDisplay
- remixAvailability
- templateAvailability
- counts
- createdAt
```

Must not expose:

- private source asset URL
- base64 image data
- raw provider payload
- API keys
- hidden prompt sections
- owner private reference image URLs
- billing ledger details

### 2.4 Scene Builder Reference Policy Compatibility

Use the policies from Scene-007:

```text
required_user_replacement
shared_preview_only
shared_as_reusable_reference
not_shared
```

Rules:

- Face/character references default to `required_user_replacement`.
- Style references may be `shared_as_reusable_reference`.
- Preview-only assets are visible only as sanitized thumbnails and must not be sent to providers for another user.

## 3. Software Development Specification

### Files

```text
server/policies/OwnershipPolicyService.js
server/policies/VisibilityPolicyService.js
server/community/CommunityPostSanitizer.js
server/community/CommunityTemplatePolicyService.js
server/sceneTemplates/sceneTemplateSanitizer.js
test/communityOwnershipPolicy.test.js
test/communityPublicSnapshot.test.js
```

### Process

1. Route receives actor context.
2. Service loads raw record.
3. Ownership policy checks action permission.
4. Visibility policy checks read permission.
5. Sanitizer builds public read model.
6. Route returns sanitized read model only.

## 4. Implementation Plan

1. Add ownership and visibility policy services.
2. Add public snapshot sanitizer.
3. Update Community post/template/gallery services to call policy services before returning data.
4. Reuse Scene Builder reference policy for template handoff.
5. Add tests for owner, viewer and admin reads.

## 5. Testing

```text
TC-00-004-001 owner can view private post
TC-00-004-002 other user cannot view private post
TC-00-004-003 public post hides private prompt fields
TC-00-004-004 preview-only reference does not become generation payload
TC-00-004-005 hidden post excluded from feed
TC-00-004-006 admin hide requires audit reason
```
