# Outfit Upload: Single and Bulk

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** React MVP implemented; final validation pending

One to five products are supported. Each PNG/JPEG/WebP reference is uploaded
individually to an actor-owned asset boundary before quote/run submission;
Base64 is not persisted in Fashion records.

## 1. Business Requirement

Fashion sellers can upload one outfit quickly or add up to five outfits without
rebuilding the Character/Template setup for every product.

## 2. Product Item Contract

```text
FashionProductItem
- clientKey
- productId?
- name
- sku?
- productType: top | bottom | dress | clothing_set
- colorNotes?
- integrityLevel: creative | balanced | strict
- references
  - frontAssetId
  - backAssetId?
  - detailAssetIds[]
- status
```

Rules:

- one to five Product Items
- front is required
- back is recommended for back-view operations
- detail is optional and provider capability/count limited
- no Base64 in saved plan/template snapshot
- duplicate reference file may be deduplicated by checksum within owner scope

## 3. UX

Default:

```text
Upload outfit front
[Add back] [Add detail] [Add another outfit]
```

Bulk:

- each Product Item is a compact row/card
- validation appears per item
- reorder/remove before quote
- shared Character, Template and environment remain unchanged
- incomplete Product Item is excluded only after explicit confirmation or blocks
  quote; never silently dropped

## 4. Reuse and Extension

Reuse:

- `client/clothing/outfitReferenceController.js`
- `client/clothing/clothingOptionRules.js`
- shared reference slot component
- existing image validation/reference normalization
- future production Asset upload contract from
  `requirements/011-implementation-commercial-feature-plan/Phase2-06-assets-storage-and-product-catalog.md`

The existing `AssetRepository` under `server/repositories/assets/` is the
development persistence foundation, but it is not yet a complete upload
pipeline. Fashion implementation must add a domain-owned reference registration
boundary rather than writing files or Asset records from routes.

### 4.1 Reference Transport Boundary

The browser may hold an optimized local preview temporarily. Before Quote or
Run creation, every accepted outfit reference must resolve to an owner-scoped
asset/reference ID:

```text
local file
-> shared upload/optimization adapter
-> Fashion reference registration endpoint
-> validated private storage object
-> AssetRepository record
-> assetId returned to FashionProductItem
```

Saved Fashion state, Template snapshots, quotes and generation plans must never
contain `data:image/...` values. History/job/output references use the optimized
`ReferenceValue` contract from Scene-005. A legacy Base64 value may be accepted
only as bounded upload transport in local development and must be stripped
after registration; it must not be repeated in `/api/generate` operations.

The first implementation may expose:

```text
POST /api/fashion-blueprints/reference-assets
DELETE /api/fashion-blueprints/reference-assets/:assetId
```

Routes use `req.actorContext`; the domain validates media type, byte size,
dimensions, purpose and ownership before delegating to storage and
`AssetRepository`. Commercial Phase2-06 replaces storage, not this client
contract.

Extract general upload/preview behavior only if two consumers genuinely share
it. Keep Character Sheet clothing ownership rules separate from Fashion
Blueprint product-item orchestration.

## 5. Prompt and Reference Ownership

Uploaded garment owns:

- garment type and silhouette
- visible construction and pattern
- primary/secondary color
- front/back/detail fidelity

If an outfit reference is active:

- hide or disable conflicting preset garment shape controls
- retain only allowed customizations explicitly declared by Template/policy
- explain that strict integrity can reduce pose freedom

### 5.1 Deferred Per-Item Pose Variation

The same Character, Template and processed reference policy are shared across a
Bulk run, but a future Fashion direction plan may assign a small compatible
pose variation to each Product Item.

This must use `BatchPoseVariationPolicy` from
`002-character-pose-and-environment-selection.md`. It must not infer pose from
the Outfit wearer or allow an Outfit image to become pose, identity,
environment or style authority.

For Bulk execution:

- normalize each Outfit through the shared Reference Processing Pipeline;
- reuse a cached processed derivative for identical owner-scoped source assets;
- bind one resolved pose assignment to each Product Item and shot;
- preserve Template framing and campaign continuity;
- permit hand adaptation when garment geometry makes the original interaction
  impossible;
- include resolved assignments in quote and run fingerprints.

The initial MVP remains `locked` or explicitly user-selected. Automatic
`subtle`, `preset_rotation` and `auto_adapt` assignment is deferred.

## 6. Files

```text
client/fashion-blueprint/fashionOutfitList.js
client/fashion-blueprint/fashionOutfitItem.js
client/fashion-blueprint/fashionOutfitValidation.js
server/domain/fashion-blueprint/FashionReferenceAssetService.js
server/domain/fashion-blueprint/FashionProductService.js
server/repositories/fashion-blueprint/FashionProductRepository.js
server/app/routes/fashionBlueprintRoutes.js
test/fashionOutfitValidation.test.js
test/fashionReferenceAsset.test.js
```

## 7. Acceptance Tests

- Quote is blocked with zero or more than five Product Items.
- Missing front produces an item-level actionable error.
- Removing item revokes its temporary references according to asset policy.
- Provider reference limits are checked for every shot operation.
- Partial upload failure preserves valid items.
- Another actor cannot attach the owner's private outfit asset.
- Future per-item pose variation cannot copy the Outfit wearer's pose or alter
  Character, garment, Template scene or visual style authority.
