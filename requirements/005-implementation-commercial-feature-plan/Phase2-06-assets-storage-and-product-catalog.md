# Phase 2-06 Assets, Storage and Product Catalog

**Status:** Proposed - Awaiting Review

## 1. Business Requirement

Small merchants must upload and manage product references safely, identify each product/SKU, and reuse approved assets across generation plans without relying on temporary browser state.

## 2. Product MVP Scope

Initial supported products:

- Tops
- Bottoms
- Dresses
- Wearable clothing sets

Bags, shoes and jewelry are later modules because preservation and presentation requirements differ.

Each Product Item supports one to four references:

- Front
- Back
- Detail
- On-model reference

## 3. Product Data

```text
id, projectId, ownerUserId
name, sku, category, status
color, variant, notes
integrityLevel
createdAt, updatedAt, version
```

Integrity levels:

- `creative`
- `balanced` (MVP default)
- `strict`

AI outputs always require a visible disclosure that product details may differ from the real item.

## 4. Asset Data

- Asset owner and Project scope
- Purpose and reference role
- Original filename, normalized media type and byte size
- Width, height and checksum
- Storage key, thumbnail key and lifecycle state
- Upload/security scan status
- Parent/source lineage
- Retention and deletion timestamps

## 5. Upload Pipeline

```text
request upload -> validate permission/quota -> upload temporary object
-> validate signature/type/size/dimensions -> checksum/deduplicate
-> create thumbnail -> finalize asset -> attach to product
```

- Never trust filename extension or client MIME type alone.
- Reject unsupported/decompression-bomb-sized media.
- Strip unsafe metadata when producing normalized derivatives.
- Original may be retained according to policy.
- Partial bulk failures do not fail accepted items.

## 6. Storage Abstraction

Application services use `AssetStorage`:

- Local filesystem adapter for development
- Object storage adapter for production
- Signed or authorized delivery for private originals
- Public/static delivery only for approved non-sensitive system assets

## 7. Optional Paid Product Analysis

AI Product Analysis is optional in MVP and requires a price quote before execution. It may suggest:

- Product type and dominant colors
- Visible construction details
- Structured prompt description
- Recommended shot pack
- Potential integrity risks

The user reviews and confirms analysis; it never replaces product truth automatically.

## 8. Acceptance Criteria

- Users can create/edit Products and attach typed references.
- Assets cannot be linked across unauthorized Projects.
- Duplicate upload detection uses checksum without leaking other users' asset existence.
- Product Analysis is never started without confirmation of its price.
- Deleting a Product follows reference and retention rules rather than orphaning billable job history.
- Local and production storage adapters satisfy the same contract tests.

