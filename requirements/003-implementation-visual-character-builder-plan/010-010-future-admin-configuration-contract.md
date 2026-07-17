# 010-010 Future Admin Configuration Contract

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** manual visual setup, 010-001 through 010-009

## Objective

Define how Character Reference body/clothing options can later move from manual JSON and manifests into an admin-managed configuration system.

## Admin-Managed Entities

| Entity | Purpose |
| --- | --- |
| Attribute option | semantic ID, labels, prompt phrase |
| Visual option | manifest option ID and asset |
| Clothing preset | grouped outfit semantic bundle |
| Body preset | grouped silhouette/body defaults |
| Reference policy | source ownership and provider behavior |
| Migration rule | deprecated ID replacement |

## Admin Fields

- stable attribute ID
- visual option ID
- category
- subcategory
- English label
- Thai label
- prompt phrase
- provider prompt overrides
- enabled status
- visibility filters
- gender/presentation filters
- asset upload
- swatch values
- migration target

## Validation Rules

Admin save must reject:

- duplicate IDs
- missing prompt phrase
- missing label
- missing asset and missing fallback
- clothing preset with no clothing phrase
- body option with unsafe wording
- enabled option not mapped to any UI field

## Publishing Flow

1. Draft option.
2. Upload or assign asset.
3. Preview in admin.
4. Run validation.
5. Publish to staging.
6. Run prompt snapshot tests.
7. Enable for users.

## Relationship to Manual Setup

The manual file remains the source of operational rules until admin exists:

```text
manual-visual-characters-setup.md
```

Admin configuration should preserve the same conceptual layers rather than inventing a second schema.

## Acceptance Criteria

- Future admin can manage the same IDs and manifests used manually.
- Manual JSON can be migrated to database rows without changing saved user configurations.
- Published admin options remain compatible with deterministic prompt tests.
