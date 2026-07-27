# Fashion Blueprint Template Contract

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Architecture-aligned; implementation pending

## 1. Business Requirement

Users choose a visible target result, not an abstract prompt recipe. Each
Template must show a representative final image and define what may be replaced.

## 2. Template Contract

```text
FashionBlueprintTemplate
- id
- schemaVersion
- ownerType: platform | community_creator
- ownerUserId?
- title
- description
- status: draft | review | active | deprecated | blocked
- visibility: private | unlisted | public
- officialTags[]
- attribution
- activeVersionId?
- createdAt
- updatedAt
- publishedAt?
```

Each mutable Template owns immutable version records:

```text
FashionBlueprintTemplateVersion
- id
- templateId
- versionNumber
- finalPreviewAssetId
- compatibleProductTypes[]
- defaultEnvironmentRecipe
- compatibleEnvironmentIds[]
- poseVariationPackVersionId
- shotRecipeVersionId
- lightingRecipe
- compositionRecipe
- characterSlotPolicy
- defaultCharacterProfileVersionId?
- recommendedCharacterProfileIds[]
- outfitSlotPolicy
- replaceableVariables[]
- supportedQualityTiers[]
- advancedProviderRecommendations[]
- createdAt
- publishedAt?
```

`templateVersionId` is the only Template identifier stored in quotes, plans,
runs and history. Versions become immutable after publication or after a
confirmed generation plan references them.

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
- Public responses use stable `ownerUserId` internally and a sanitized creator
  snapshot for display. A username supplied by the client is never ownership
  authority.
- A deprecated Template remains readable for historical runs.
- A Template default/recommended Character must be active and reusable for the
  current viewer. Template metadata never overrides the Character owner's reuse
  policy.
- If the default Character becomes unavailable, the Template remains usable and
  opens the picker with other compatible recommendations.

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

## 5.1 Entry and Handoff

Community or Template cards navigate through
`window.ModelPromptForgeRouter.navigateToResource()` to:

```text
/create/fashion?templateId=<templateId>
```

Fashion Blueprint resolves the current active version server-side and stores
the resulting `templateVersionId` in its actor-scoped draft. A direct URL,
refresh or unavailable Template must show a recoverable catalog state rather
than silently selecting another Template.

## 6. Files

```text
server/domain/fashion-blueprint/FashionBlueprintTemplateService.js
server/domain/fashion-blueprint/fashionBlueprintTemplatePolicy.js
server/repositories/fashion-blueprint/FashionBlueprintTemplateRepository.js
server/app/routes/fashionBlueprintRoutes.js
client/fashion-blueprint/fashionTemplateCatalog.js
client/fashion-blueprint/fashionTemplateCard.js
client/fashion-blueprint/fashionTemplateDetail.js
client/shell/navigation.config.json
client/shell/navigationRegistry.js
client/shell/applicationShell.js
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
- An unauthorized default Character falls back to picker selection without
  breaking the Template.
