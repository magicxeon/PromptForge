# 010-010 Future Admin Configuration Contract

**Status:** Draft - Revised  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** manual visual setup, 010-001 through 010-009

## Objective

Define how Character Sheet visual attributes can later move from manual JSON/manifests into admin-managed configuration.

## Admin-Managed Entities

| Entity | Purpose |
| --- | --- |
| Body visual attribute | silhouette/build/proportion option |
| Outfit preset | reusable sheet outfit |
| Sheet layout | front/back/view configuration |
| Visual asset | icon/preview for selection |
| Outfit reference policy | upload slot and ownership rules |
| Story handoff policy | how sheet output becomes Story reference |

## Admin Fields

- stable attribute ID
- visual option ID
- category/subcategory
- English/Thai label
- prompt phrase
- enabled status
- asset upload
- swatch values
- minor-safe visibility
- gender/presentation visibility if needed
- migration target

## Validation Rules

Reject:

- duplicate IDs
- missing prompt phrase
- outfit preset with scene/environment language
- body option with unsafe/sexualized wording
- enabled option without asset or fallback
- sheet layout without prompt segment

## Publishing Flow

1. Draft option.
2. Upload visual asset.
3. Preview card.
4. Validate prompt phrase.
5. Run sheet prompt tests.
6. Publish to staging.
7. Enable for users.

## Acceptance Criteria

- Admin config can manage sheet-building options without changing saved user configs.
- Manual files can migrate to database-backed options later.
- Published options remain compatible with Story Mode handoff.
