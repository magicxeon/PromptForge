# Fashion Blueprint Template Contract

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

Users choose a visible target result, not an abstract prompt recipe. Each
Template must show a representative final image and define what may be replaced.

## 2. Template Contract

```text
FashionBlueprintTemplate
- id
- version
- ownerType: platform | community_creator
- ownerId?
- title
- description
- finalPreviewAssetId
- status: draft | review | active | deprecated | blocked
- visibility: private | unlisted | public
- compatibleProductTypes[]
- defaultEnvironmentRecipe
- compatibleEnvironmentIds[]
- poseVariationPackVersionId
- shotRecipeVersionId
- lightingRecipe
- compositionRecipe
- characterSlotPolicy
- outfitSlotPolicy
- replaceableVariables[]
- supportedQualityTiers[]
- advancedProviderRecommendations[]
- officialTags[]
- attribution
- createdAt
- publishedAt?
```

Versions become immutable after a confirmed generation plan references them.

## 3. Required Slots

```text
character_reference  required
outfit_front         required per Product Item
outfit_back          optional per Product Item
outfit_detail        optional per Product Item
environment          template default, optionally replaceable
pose_pack            template default, optionally replaceable
```

The Template may map to a sanitized Scene Template snapshot, but Fashion-specific
product and shot metadata remains in the Fashion Blueprint contract.

## 4. Final Preview Policy

- Preview must be a real generated/approved sample, not a decorative mock.
- Preview states which aspects are illustrative: model identity, garment, pose
  variation and environment.
- Preview asset has provenance and rights metadata.
- Community creator Template uses existing ownership/moderation/public snapshot
  policy.
- A deprecated Template remains readable for historical runs.

## 5. Template Resolution

Input:

- template version
- Character selection
- outfit count/types
- optional pose/environment overrides

Process:

1. Validate Template active and visible.
2. Validate product types and slot requirements.
3. Resolve default recipes and allowed overrides.
4. Produce deterministic shot operations.
5. Return human-readable summary before pricing.

Output:

```text
ResolvedFashionBlueprint
- templateVersionId
- resolvedSceneRecipe
- resolvedPoseOperations[]
- resolvedShotOperations[]
- requiredReferenceSlots[]
- warnings[]
```

## 6. Files

```text
server/domain/fashion-blueprint/FashionBlueprintTemplateService.js
server/domain/fashion-blueprint/fashionBlueprintTemplatePolicy.js
server/repositories/fashion-blueprint/FashionBlueprintTemplateRepository.js
server/app/routes/fashionBlueprintRoutes.js
client/fashion-blueprint/fashionTemplateCatalog.js
client/fashion-blueprint/fashionTemplateCard.js
client/fashion-blueprint/fashionTemplateDetail.js
```

Reuse Community media cards/lightbox where behavior matches. The catalog owns
Fashion filtering and selection, not another generic gallery component.

## 7. Acceptance Tests

- Template preview and version are required before activation.
- Historical plan resolves deprecated version unchanged.
- Incompatible product type is rejected before quote.
- Unauthorized private/community Template is inaccessible.
- Overrides outside declared replaceable variables are rejected.
- Public Template response contains no private reference or Base64.

