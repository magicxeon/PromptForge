# 010-005 Clothing Reference Upload and Ownership

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-002, provider capability contracts

## Objective

Define uploaded clothing reference behavior, including provider limitations and source lineage.

## Upload Scope

MVP supports one uploaded clothing reference image.

Allowed:

- clothing product photo
- outfit photo
- flat lay
- mannequin image
- generated clothing reference image

Not promised:

- exact virtual try-on
- exact fabric drape
- exact logo reproduction
- exact body pose transfer

## Upload Metadata

Store:

```json
{
  "referenceId": "ref_clothing_001",
  "sourceType": "clothing-reference",
  "originalFilename": "outfit.png",
  "storedPath": "/uploads/references/ref_clothing_001.png",
  "thumbnailPath": "/uploads/references/thumbs/ref_clothing_001.webp",
  "createdAt": "2026-07-17T00:00:00.000Z",
  "ownerId": "session-or-user-id",
  "usedByJobIds": []
}
```

## Provider Capability Rules

| Provider Capability | Behavior |
| --- | --- |
| Supports image references | send clothing reference according to provider adapter |
| Supports limited references | count canonical face plus clothing reference before submit |
| Does not support references | store upload but do not send; show warning |
| Supports reference type weights | canonical face gets identity weight, clothing gets style/outfit weight |

## UI Rules

- Show uploaded preview.
- Provide clear remove/replace action.
- Show whether current provider will use the reference.
- Disable clothing preset controls or mark them as secondary hints when upload owns clothing.

## Prompt Segment

When uploaded clothing owns outfit:

```text
matching the clothing outfit, garment silhouette, colors, and styling from the uploaded clothing reference
```

Do not additionally list preset clothing unless advanced override is active.

## Acceptance Criteria

- Upload ownership is visible.
- Provider limitation is visible before generation.
- Reference lineage is stored in history.
- Removing upload restores clothing preset controls.
