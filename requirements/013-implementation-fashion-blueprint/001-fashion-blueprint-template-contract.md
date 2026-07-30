# Fashion Blueprint Template Contract

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Template Core handoff prototype implemented; Fashion contract completion pending

The React Template picker consumes sanitized reusable Community Template posts.
The quote service revalidates template visibility and reuse policy on the
server before issuing or confirming a quote.

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

The current prototype starts with a Community post ID and
`templateUseSessionId`. The server resolves that session to an immutable
Template version. Before MVP release, `templateVersionId` and
`sourceCommunityPostId` must be copied into the resolved Fashion plan, quote,
run operation and generation lineage. Client-supplied version IDs are never
trusted.

## 3. Required Slots

```text
character_reference  required
outfit_front         required per Product Item
outfit_back          optional per Product Item
environment          template default, optionally replaceable
pose_pack            template default, optionally replaceable
```

`outfit_detail` is reserved. It becomes active only after Template Core,
Reference Processing policy, provider capacity validation and Fashion schemas
all expose the role. The MVP must not accept an undocumented extra image and
silently send it as another role.

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

Community or Template cards use React Router navigation to:

```text
/create/fashion?templateId=<templateId>
```

`web/src/features/fashion-blueprint/routes/FashionBlueprintRoute.tsx` reads the
query parameter, requests the canonical Template handoff/use session, and
stores the resulting IDs in actor-scoped draft state. Fashion Blueprint resolves
the current active version server-side and stores the resulting
`templateVersionId` in that draft. A direct URL,
refresh or unavailable Template must show a recoverable catalog state rather
than silently selecting another Template.

## 6. Files

```text
server/domain/templates/TemplateCoreService.js
server/repositories/templates/
server/domain/community/CommunityPostAccessService.js
server/domain/fashion-blueprint/FashionBlueprintService.js
server/domain/fashion-blueprint/FashionGenerationContext.js
server/app/routes/fashionBlueprintRoutes.js
web/src/features/fashion-blueprint/routes/FashionBlueprintRoute.tsx
web/src/components/media/MediaCard.tsx
web/src/components/templates/TemplateUseButton.tsx
web/src/features/templates/
web/src/app/routeRegistry/routes.ts
```

Do not create a Fashion Template repository or second immutable-version model.
Template Core owns definitions, versions, use sessions and pricing. Fashion
owns compatibility filtering and Product Item bindings only. Reuse Community
media cards/detail behavior where it matches.

## 6.1 Fashion Compatibility Contract

A published Template is selectable only when all are true:

- `templateKind` supports `scene_image`;
- compatible consumers include `fashion`;
- a valid final preview exists;
- the public input schema exposes Character and Outfit bindings needed by the
  Fashion recipe;
- hidden prompt policy can execute server-side;
- current actor may create a use session;
- the active provider plan can accept the processed reference count.

The UI may pre-filter for convenience, but quote and run services repeat every
check through Template Core and Reference Processing.

## 7. Acceptance Tests

- Template preview and version are required before activation.
- Historical plan resolves deprecated version unchanged.
- Incompatible product type is rejected before quote.
- Unauthorized private/community Template is inaccessible.
- Overrides outside declared replaceable variables are rejected.
- Public Template response contains no private reference or Base64.
- An unauthorized default Character falls back to picker selection without
  breaking the Template.
- Quote, run and output lineage retain the exact immutable Template version and
  source Community post.

## 8. Implementation Plan

1. Extend the Template public DTO/schema with sanitized Fashion compatibility
   and output-recipe metadata; do not expose the execution snapshot.
2. Filter the React Fashion picker by compatibility and create the use session
   through the existing Template handoff.
3. Resolve and copy immutable `templateVersionId` plus source post ID into the
   normalized Fashion plan.
4. Revalidate the session/version/input bindings in Quote and Run.
5. Add private, deprecated-version, unavailable-default-Character and hidden
   prompt tests before enabling Community creator Templates.
