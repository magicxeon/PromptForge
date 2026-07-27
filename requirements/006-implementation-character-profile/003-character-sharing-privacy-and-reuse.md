# Character Sharing, Privacy and Reuse

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

Owners can share approved Characters so other users can select them as virtual
models while the owner retains attribution and private source images remain
protected.

## 2. Visibility and Reuse

```text
visibility:
  private | unlisted | public

reusePolicy:
  owner_only | view_only | public_reusable
```

Rules:

- `private`: owner/admin only.
- `unlisted`: direct-link viewing under policy; not discoverable.
- `public`: eligible for Character discovery and creator page.
- `view_only`: public preview but no generation handoff.
- `public_reusable`: selection allowed through sanitized handoff.
- Public reuse is attribution-only in MVP; no credit transfer or royalty.

## 3. Public Projection

Extend the existing Community Character contract rather than creating a second
public store:

```text
CommunityCharacterAsset
- characterProfileId
- characterProfileVersionId
- ownerUserId
- creatorProfileId
- displayName
- shortDescription
- personalitySummary
- previewAssetId
- canonicalCastingExportAssetId
- reusePolicy
- officialTags
- moderationStatus
- createdAt
- updatedAt
```

Owner-only fields:

- structured identity snapshot
- raw source result IDs
- private face/outfit asset IDs
- prompt/provider payload
- consent evidence

## 4. Sanitized Reuse Handoff

```text
CharacterSelectionHandoff
- sourceType: character_profile
- characterProfileId
- characterProfileVersionId
- displayName
- canonicalCharacterReferenceAssetId
- compatibleAttributeSnapshot
- allowedUses[]
- attribution
- referencePolicy: public_reusable
- expiresAt?
```

The handoff never contains Base64 or local paths. The server authorizes current
visibility/reuse policy every time; a previously cached public card is not
authorization.

## 5. Ownership and Moderation

- Only owner can publish/unpublish.
- Admin can block with audited reason.
- Public Characters require approved casting export and preview.
- Original recognizable-person reference requires a rights declaration before
  public reuse.
- Deleting/unpublishing blocks future reuse but does not erase lawful historical
  lineage immediately.
- Public media is delivered through existing authorized Community media routes.

## 6. Implementation Files

Extend:

```text
server/repositories/community/CommunityCharacterRepository.js
server/domain/community/CommunityGalleryService.js
client/community/communityGalleryApi.js
client/community/creatorProfilePage.js
```

Add only owning Character modules:

```text
server/domain/character-profiles/CharacterProfileSharingService.js
client/character-profiles/characterShareDialog.js
test/characterProfileSharing.test.js
```

## 7. Acceptance Tests

- Private Character is absent from public API.
- View-only Character has no usable handoff action.
- Public handoff resolves only the approved casting export.
- Unpublishing invalidates new handoff requests.
- Another user cannot retrieve private face/outfit references.
- Owner attribution remains on downstream generation lineage.

