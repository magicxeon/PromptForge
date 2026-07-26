# Community-04 Share Generated Image and Prompt Snapshot

**Status:** Implemented - Validation Pending
**Feature type:** Community publishing from generated results  
**Depends on:** Authentication, assets, generation history, collections, taxonomy  
**Created:** 2026-07-15

## 1. Objective

Allow users to share a generated image and an approved prompt/workflow snapshot to Community from History, Comparison, Studio result or Collection.

The community post should be remixable without exposing private data or unstable runtime internals.

## 2. Share Sources

Supported sources:

- Single generated image from Image History.
- Winning or selected result from Comparison.
- Image inside a Collection.
- Studio result immediately after generation.

Deferred:

- Bulk publishing.
- Public collection publishing.
- Paid/membership-only post creation.

## 3. Community Post Data

```text
CommunityPost
- id
- ownerUserId
- creatorProfileId
- sourceGenerationResultId
- title
- description
- imageAssetId
- thumbnailAssetId
- officialTags
- customTags
- promptVisibility
- sharedPromptSnapshot
- providerModelSnapshot
- workflowSnapshot
- visibility
- status
- likeCount
- saveCount
- remixCount
- viewCount
- createdAt
- updatedAt
```

Visibility:

```text
public
unlisted
private
```

Status:

```text
draft -> published -> hidden -> removed
```

## 4. Prompt Visibility

MVP prompt visibility options:

```text
Full Prompt
Partial Prompt
Remix Only
Private Prompt
```

Rules:

- `Full Prompt` displays the approved prompt snapshot.
- `Partial Prompt` hides selected sections such as style, negative prompt, seed or workflow details.
- `Remix Only` allows reuse through system-controlled config without showing all prompt text.
- `Private Prompt` may show only image and metadata; excluded from remix unless explicitly allowed later.

## 5. Snapshot Rules

Shared prompt/workflow snapshot must be immutable for a published post.

Snapshot should include:

- Final prompt text according to visibility.
- Structured config selections.
- Provider and model display names.
- Important generation settings safe for public display.
- Character/model reference policy, if used.
- Taxonomy/classification signals.

Snapshot must not include:

- Provider API keys or internal provider request payloads.
- Private asset delivery URLs.
- Hidden user notes.
- Billing details.
- Unsafe metadata from uploaded files.

## 6. Share Preview UX

Before publishing, show:

- Image preview.
- Title and optional description.
- Suggested official tags.
- Custom tags.
- Prompt visibility selector.
- Provider/model summary.
- Warning if a selected source cannot be made public.

## 7. Service Requirements

- Create draft post from source generation result.
- Update draft metadata.
- Publish post.
- Change visibility.
- Hide/remove post by owner or admin policy.
- Fetch public post summary and detail.
- Record share, view and remix events.

All mutating requests require actor context and authorization.

## 8. Acceptance Criteria

- Users can publish a generated image without re-uploading it.
- Private prompt fields are not exposed through public APIs.
- A post can be created from History or Comparison result.
- Published snapshots remain stable even if the original project/config later changes.
- Hidden or removed posts no longer appear in public feeds.

## 9. Implementation Plan

### User Review Required

- Development can start from local JSON posts, but service boundaries must match future DB repositories.
- Published snapshot must reuse Scene Builder `SceneTemplateSnapshot` when available.
- Actor context comes from Community-10 mock user until real auth exists.
- Credit deduction is not done here; sharing a generated result is not generation.

### Canonical Files

```text
client/community/communityShareApi.js
client/community/communitySharePreview.js
client/core/lightboxService.js
client/scene-builder/sharedTemplatesPanel.js
client/index.html
client/style.css
client/i18n/locales/<locale>/community.json

server/app/routes/communityShareRoutes.js
server/app/routes/sceneTemplateRoutes.js
server/app/createApp.js
server/domain/community/CommunityShareService.js
server/domain/community/communityShareSnapshot.js
server/domain/community/communityPostPublicView.js
server/domain/community/CommunityPostAccessService.js
server/domain/scene-templates/sceneTemplateSanitizer.js
server/repositories/community/CommunityPostRepository.js
server/repositories/recordNormalizer.js

test/communityGeneratedShare.test.js
test/communityPublicSnapshot.test.js
test/sceneShareFlow.test.js
```

### Process

1. User selects Share from History, Comparison, Collection or active result.
2. Server creates draft from source generation result and actor context.
3. Draft is sanitized using prompt visibility and reference policy.
4. User edits title, description, tags and visibility.
5. Publish creates immutable public snapshot.

### Testing

- Alice can share Alice's generated result.
- Bob cannot share Alice's private result.
- `Remix Only` hides final prompt but preserves guided selections.
- Manual prompt cannot be hidden as Remix Only unless policy explicitly supports it.
- Public API does not return private asset URLs or provider payloads.

## 10. Implemented Snapshot Contract

Publishing no longer requires `SceneTemplateSnapshot`. Every completed
generation owned by the active actor can create a Community share draft.

```text
CommunityPost
- sourceType: generated_image | scene_template
- sourceGenerationResultId
- sharedPromptSnapshot
  - schemaVersion
  - authoringMode
  - source
  - publicPromptText
  - createdAt
- providerModelSnapshot
  - providerId
  - providerDisplayName
  - modelId
  - modelDisplayName
  - resolvedModelId
  - providerConfigVersion
- workflowSnapshot
  - schemaVersion
  - mode
  - authoringMode
  - structuredSelections
  - generationSettings
- sceneTemplateSnapshot: sanitized snapshot | null
```

The server derives these values from the owned generation result. The browser
cannot submit an arbitrary image URL, provider snapshot or workflow snapshot.
All nested Base64 values are removed before the draft is returned or persisted.

Published snapshots are immutable. Owner presentation updates can change only
title, description, custom tags and post visibility. They cannot replace the
source generation, prompt snapshot, workflow snapshot or provider/model
snapshot.

## 11. Prompt And Post Visibility Rules

Prompt visibility and post visibility are separate controls:

```text
Prompt: full | partial | remix_only | private
Post:   public | unlisted | private
```

- `full` stores the approved final prompt as public prompt text.
- `partial` stores only a bounded positive-prompt excerpt. It removes negative
  prompt sections, structured selections and Scene Template internals.
- `remix_only` is available only to guided Scene Builder templates. Public
  prompt text is removed while the sanitized template remains reusable.
- `private` removes public prompt text, workflow selections and the reusable
  Scene Template snapshot from the published post.
- A generic generated image can be published with `full`, `partial` or
  `private`, but it does not appear as a reusable Scene Builder template.

`Shared Templates` filters the public post list by `templateAvailability`, so
ordinary image posts do not open an invalid template workflow.

## 12. Implemented API

Canonical Community publishing endpoints:

```text
POST   /api/community/share-drafts
PATCH  /api/community/share-drafts/:draftId
POST   /api/community/share-drafts/:draftId/publish
DELETE /api/community/posts/:postId
```

The existing `/api/scene-templates/share-drafts` endpoints remain compatibility
aliases for older Scene Builder callers. Both endpoint families delegate to the
same `CommunityShareService`.

`DELETE /api/community/posts/:postId` is owner unpublish, not physical deletion.
It changes the post to `owner_unpublished` and `private`, and records an audit
event.

## 13. Client Integration

`communityShareApi.js` owns HTTP calls. `communitySharePreview.js` owns the
single Share Preview modal and exposes:

```text
window.ModelPromptForgeCommunitySharePreview.openSharePreview(generationId)
```

The Lightbox shows `Share to Community` for an owned completed result whether
it came from History, a Collection, Comparison detail or the active Studio
result. Template-only policy and variable sections are hidden for ordinary
generated images.

Community-05 owns Explore feed, post detail and generic remix UX. Community-04
does not create a second feed or generation surface.

