# Community-09 User Gallery, Character Showcase and Template Handoff

**Status:** Proposed - Awaiting Review  
**Feature type:** User-curated gallery, reusable character assets and Scene Builder handoff  
**Depends on:** Community-04 Share Generated Image and Prompt Snapshot, Community-05 Explore/Post Detail/Remix, Community-06 Creator Profile, Scene Builder template contract  
**Created:** 2026-07-19

## 1. Business Requirement

Community should not automatically show every image a user generates. Each creator needs a curated public gallery that shows only the images they choose to display.

The gallery must also prepare reusable creative assets for the next workflow:

- Display selected public images in the user's gallery.
- Let the owner decide whether each image can be used as a template entry point.
- Support a separate `Character` area for reusable character assets.
- Route reusable templates and character assets into Scene Builder, because Scene Builder is the working surface for final image composition.

This keeps Community focused on discovery and reuse, while keeping actual generation work inside Studio and Scene Builder.

## 2. Product Scope

### 2.1 Included in MVP

- User can choose which generated images appear in their public gallery.
- Gallery shows only owner-approved public or unlisted items.
- Gallery item can expose a `Use Template` action only when owner allows template reuse.
- Character area is separated from normal gallery images.
- Character item can represent:
  - `headshot_only`: face/headshot reference.
  - `full_character`: character sheet or full-body character reference.
  - `face_and_outfit`: character identity plus outfit reference when available.
- Selecting a reusable template or character routes the user into Scene Builder.
- Scene Builder receives the correct source snapshot and reference slot mapping.

### 2.2 Deferred

- Paid character marketplace.
- Public character collections marketplace.
- Multi-character packs.
- Product template slots.
- Advanced licensing and revenue sharing.
- Public download of original high-resolution source files.

## 3. User Flows

### 3.1 Publish To Gallery

```text
History / Studio Result / Collection
-> Share or Add to Gallery
-> Owner chooses gallery visibility
-> Owner chooses whether template reuse is allowed
-> Item appears in public profile gallery if approved
```

### 3.2 Use Gallery Template

```text
Community Gallery / Post Detail
-> User clicks Use Template
-> System opens Scene Builder
-> Template variables and reference slots are shown
-> User replaces required slots or keeps allowed source references
-> Generate from Template
```

### 3.3 Use Character From Creator Profile

```text
Creator Profile
-> Character tab
-> User selects a character
-> System opens Scene Builder
-> Character reference is attached to the appropriate slot
-> User chooses clothing, scene and generation settings
-> Generate
```

## 4. Gallery Visibility And Reuse Policy

Gallery visibility:

```text
private
unlisted
public
```

Template reuse policy:

```text
none
view_only
use_as_template
remix_with_required_replacements
```

Rules:

- `private` items must never appear in public gallery or public creator profile.
- `unlisted` items can be accessed by direct link if owner allows it.
- `public` items can appear in gallery, creator profile and public discovery surfaces.
- `use_as_template` can carry safe prompt/config data into Scene Builder.
- `remix_with_required_replacements` must force users to replace owner-marked private slots before generation.

## 5. Character Asset Contract

```text
CommunityCharacterAsset
- id
- ownerUserId
- creatorProfileId
- displayName
- description
- characterType: headshot_only | full_character | face_and_outfit
- sourceGenerationResultId
- previewImageAssetId
- faceReferencePolicy
- outfitReferencePolicy
- sceneBuilderHandoffSnapshot
- visibility
- reusePolicy
- officialTags
- createdAt
- updatedAt
```

Reference policies:

```text
private
owner_only
replace_required
public_reusable
```

Rules:

- A character can expose face reference, outfit reference or both.
- If face reference is private, Scene Builder must require replacement.
- If outfit reference is private, Scene Builder must require replacement.
- Public character preview must be separate from private original source metadata.

## 6. Template Handoff To Scene Builder

When user selects `Use Template` or `Use Character`, Community should create a Scene Builder handoff payload:

```text
CommunitySceneBuilderHandoff
- sourceType: gallery_image | community_post | character_asset
- sourceId
- sceneTemplateSnapshot
- referenceSlotMapping
- replaceableVariables
- allowedReferenceCarryover
- requiredUserReplacements
- providerModelSnapshot
- generationSettings
```

Scene Builder is responsible for:

- Displaying the active template replacement checklist.
- Showing required replacement slots.
- Allowing user-uploaded or history-selected replacement images.
- Generating the final image through normal generation service.

Community is responsible for:

- Public visibility and ownership checks.
- Preparing sanitized snapshots.
- Deciding which references may be carried over, hidden or replaced.
- Recording template usage/remix analytics.

## 7. Software Development Specification

Suggested future modules:

```text
client/community/communityGalleryPage.js
client/community/communityGalleryCard.js
client/community/communityCharacterTab.js
client/community/communityTemplateActions.js
client/community/communitySceneBuilderHandoff.js
server/community/CommunityGalleryRepository.js
server/community/CommunityCharacterRepository.js
server/community/CommunityTemplatePolicyService.js
server/community/CommunitySceneBuilderHandoffService.js
server/community/routes/galleryRoutes.js
server/community/routes/characterRoutes.js
```

Client integration:

- Gallery cards should render `Use Template` only when `reusePolicy` allows it.
- Character cards should render `Use Character` when the character has a valid handoff snapshot.
- Handoff should call existing Scene Builder template hydration and replacement checklist modules.
- Do not duplicate Scene Builder variable resolver logic inside Community.

Server integration:

- Community APIs return sanitized gallery and character records only.
- Template handoff endpoint validates visibility, owner policy and reference reuse policy.
- Private references must be removed or marked as `replace_required`.
- Public Gallery APIs must not expose raw internal file paths, provider payloads or private source snapshots.

## 8. Impact

### 8.1 UX Impact

- Users can build a portfolio without exposing all generated history.
- Visitors can reuse allowed templates without understanding prompt engineering.
- Character assets become reusable building blocks for Scene Builder.

### 8.2 Technical Impact

- Adds a public/community layer over existing generated images and Scene Builder snapshots.
- Requires clear ownership and visibility checks.
- Requires reusable handoff payloads instead of ad hoc button behavior.

### 8.3 Data Impact

- Gallery item data should reference immutable assets and sanitized snapshots.
- Character assets should have explicit reuse policy separate from image visibility.
- Template handoff records may be useful for analytics and future marketplace conversion.

## 9. Testing

Manual tests:

```text
TC-09-001
Given a user generated multiple images
When the user adds only one image to public gallery
Then only that image appears on the creator public gallery
```

```text
TC-09-002
Given a gallery item allows use_as_template
When another user clicks Use Template
Then Scene Builder opens with the template replacement checklist
```

```text
TC-09-003
Given a character asset has private face reference
When another user opens it in Scene Builder
Then face reference is marked replace_required and cannot silently reuse the private face
```

```text
TC-09-004
Given a character asset is headshot_only
When user clicks Use Character
Then Scene Builder attaches it to the face or character reference slot according to the template mapping
```

Regression tests:

- Private history images do not appear in gallery.
- `Use Template` does not appear for view-only gallery items.
- Community handoff does not embed base64 image data.
- Existing Scene Builder template replacement flow still works without Community.

## 10. Implementation Plan

### User Review Required

- Gallery is curated by owner; generated history is not public by default.
- Character assets are separate from normal gallery images.
- Handoff always routes to Scene Builder and reuses Scene Builder modules.
- Private face/outfit references must become required replacements for other users.

### Proposed Files

```text
client/community/communityGalleryPage.js
client/community/communityGalleryCard.js
client/community/communityCharacterTab.js
client/community/communityTemplateActions.js
client/community/communitySceneBuilderHandoff.js
server/community/CommunityGalleryRepository.js
server/community/CommunityCharacterRepository.js
server/community/CommunityTemplatePolicyService.js
server/community/CommunitySceneBuilderHandoffService.js
server/community/routes/galleryRoutes.js
server/community/routes/characterRoutes.js
test/communityGalleryHandoff.test.js
```

### Process

1. Owner selects generated image and adds it to gallery.
2. Owner chooses visibility and reuse policy.
3. Server stores gallery record with sanitized snapshot references.
4. Public viewer opens gallery or character tab.
5. `Use Template` or `Use Character` requests handoff payload.
6. Scene Builder opens replacement checklist and hydrates safe fields.

### Testing

- Alice public gallery shows only Alice-approved records.
- Bob cannot see Alice private gallery record.
- Bob using Alice character receives required replacement for private face reference.
- Handoff payload contains no base64 or private provider payload.
