# Character Sharing, Privacy and Reuse

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented; validation pending

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

Character Type narrows reuse permission:

- Reusable Model: Fashion and Scene handoffs.
- Styled Character: Scene handoff preserves its original outfit by default.
  An explicitly selected or uploaded replacement outfit may override it in the
  destination Scene Builder.
- Public reuse permission never upgrades a Styled Character into a Fashion-safe
  model.

## 2.1 Community Character Section

Community must expose a distinct Character section reachable from the Community
home/filter navigation:

```text
Community
  Images
  Comparisons
  Templates
  Characters
```

The Character section:

- lists only active public Character projections
- supports creator, intended-use and reusable/view-only filters
- opens the Character Profile page when card image or title is selected
- shows creator attribution and Fashion/Scene usage summary
- shows `Use Character` only when current server policy permits reuse
- reuses Community pagination, creator links, media loading and empty/error
  states

The initial route may be `/community/characters` or an equivalent registered
Community sub-route, but it must use `ModelPromptForgeRouter` and support direct
refresh/deep link.

## 3. Public Projection

Extend the existing Community Character contract rather than creating a second
public store:

```text
CommunityCharacterAsset
- characterProfileId
- characterProfileVersionId
- characterType: reusable_model | styled_character
- destinationCapabilities[]
- outfitBehavior: replaceable | preserve
- ownerUserId
- creatorProfileId
- displayName
- shortDescription
- personalitySummary
- previewAssetId
- canonicalCastingExportAssetId? (`reusable_model`)
- canonicalCharacterSheetAssetId? (`styled_character`)
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
- characterType
- destinationCapabilities[]
- outfitBehavior
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
- Public Reusable Models require an approved casting export and preview.
- Public Styled Characters require an approved owned Character Sheet. Their
  original outfit is the Scene default, while an explicit destination outfit
  replacement is allowed.
- Original recognizable-person reference requires a rights declaration before
  public reuse.
- Deleting/unpublishing blocks future reuse but does not erase lawful historical
  lineage immediately.
- Public media is delivered through existing authorized Community media routes.

## 5.1 Reuse Status Presentation

Every public Character card and selection surface must show one status:

| Policy | Visual treatment | Selection |
|---|---|---|
| `public_reusable` | approved reusable icon + `Available to use` | enabled |
| `view_only` | eye/view icon + `View only` | disabled |
| `owner_only` | lock icon + `Owner only` | disabled for others |
| blocked/archived | unavailable label | absent from picker |

- Use Lucide icons when available; do not use emoji as the only indicator.
- Icon has tooltip, accessible label and accompanying text.
- Disabled cards remain openable for details only when visibility allows.
- The client display is explanatory; the server rechecks policy on handoff.
- Owner sees `Edit Character` and sharing controls instead of a misleading
  permission warning.

## 6. Implementation Files

Extend:

```text
server/repositories/community/CommunityCharacterRepository.js
server/domain/community/CommunityGalleryService.js
client/community/communityGalleryApi.js
client/community/communityHomePage.js
client/community/creatorProfilePage.js
```

Add only owning Character modules:

```text
server/domain/character-profiles/CharacterProfileSharingService.js
client/character-profiles/characterProfilePage.js
client/community/communityCharacterSection.js
test/characterProfileSharing.test.js
```

The owner sharing controls are composed inside `characterProfilePage.js`.
Keeping them with the owner profile state avoids a second dialog controller and
still delegates all policy decisions to `CharacterProfileSharingService`.

## 7. Acceptance Tests

- Private Character is absent from public API.
- View-only Character has no usable handoff action.
- Public handoff resolves the approved Casting Export for Reusable Model or the
  approved outfit-bound Character Sheet for Styled Character.
- Unpublishing invalidates new handoff requests.
- Another user cannot retrieve private face/outfit references.
- Owner attribution remains on downstream generation lineage.
- Community Character section lists reusable and view-only cards with correct
  status indicators.
- Clicking a view-only card opens detail but cannot produce a handoff.
- A stale `Available to use` client card is rejected if owner changes policy
  before selection.
