# Outfit Upload: Single and Bulk

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

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
- future production Asset upload contract from commercial Phase2-06

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

## 6. Files

```text
client/fashion-blueprint/fashionOutfitList.js
client/fashion-blueprint/fashionOutfitItem.js
client/fashion-blueprint/fashionOutfitValidation.js
server/domain/fashion-blueprint/FashionProductService.js
server/repositories/fashion-blueprint/FashionProductRepository.js
test/fashionOutfitValidation.test.js
```

## 7. Acceptance Tests

- Quote is blocked with zero or more than five Product Items.
- Missing front produces an item-level actionable error.
- Removing item revokes its temporary references according to asset policy.
- Provider reference limits are checked for every shot operation.
- Partial upload failure preserves valid items.
- Another actor cannot attach the owner's private outfit asset.

