# Community-04 Share Generated Image and Prompt Snapshot

**Status:** Proposed - Awaiting Review  
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

