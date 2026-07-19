# Community-03 Community Taxonomy and Auto Classification

**Status:** Proposed - Awaiting Review  
**Feature type:** Community information architecture and content classification  
**Depends on:** Prompt/config schema, generation result metadata, Prompt Composer AI optional  
**Created:** 2026-07-15

## 1. Objective

Prevent community content from becoming messy by using system-suggested official taxonomy instead of relying on users to choose arbitrary categories.

Users should confirm or lightly adjust suggestions. They should not create public category structure.

## 2. Taxonomy Model

Use three layers instead of one large category list:

```text
Content Type
Visual Style
Market Context
```

MVP official taxonomy:

```text
Content Type
- Fashion
- Product
- Portrait
- Commercial
- Storytelling

Visual Style
- Realistic Photography
- Beauty
- Luxury
- Magazine
- Anime / Cosplay

Market Context
- Shopee
- Lazada
- Social Media
- Thai Style
- Korean Style
- Japanese Style
- Chinese Style
```

Terms such as `Influencer`, `AI Idol`, `Wedding` and `Advertisement` may begin as secondary tags or aliases. They should not automatically become top-level categories.

## 3. Classification Sources

The classifier should use structured data first:

- Visual Character Builder field selections.
- Prompt Composer AI output.
- Generation workflow type.
- Character/model metadata.
- Product or marketplace/export intent.
- Prompt text as a fallback.

Raw prompt text alone should not be the primary classifier when structured config exists.

## 4. Share-Time UX

During share preview:

```text
Suggested tags
- Content Type: Fashion
- Visual Style: Realistic Photography
- Market Context: Thai Style, Shopee
```

User can:

- Confirm suggestions.
- Remove an incorrect official tag.
- Add from recommended official tags.
- Add custom tags for search only.

User cannot:

- Create a new official category.
- Rename official tags.
- Force low-confidence posts into Trending categories.

## 5. Confidence Rules

- High-confidence posts may enter category feeds and trending.
- Medium-confidence posts require user confirmation before category feeds.
- Low-confidence posts may publish to `Latest` but are excluded from category trending until reviewed or reclassified.

Custom tags are searchable but do not affect official category ranking in MVP.

## 6. Classification Examples

```text
Prompt/config: model wearing red dress, cafe, Korean ad mood
Official tags:
- Fashion
- Commercial
- Korean Style
- Realistic Photography
```

```text
Prompt/config: cosmetic bottle on reflective surface, e-commerce packshot
Official tags:
- Product
- Commercial
- Shopee or Lazada if marketplace intent exists
```

## 7. Admin Control

- Admin/support can change official taxonomy assignments.
- Admin/support can hide a post from category/trending without deleting it.
- Taxonomy changes are audited.
- New official tags require a controlled migration/alias policy.

## 8. Acceptance Criteria

- Users are not required to understand the taxonomy to share content.
- Public filters use official tags only.
- Custom tags do not pollute category navigation.
- Low-confidence posts cannot dominate Trending.
- Taxonomy assignments can be corrected after publish with audit history.

## 9. Implementation Plan

### User Review Required

- Users confirm suggested taxonomy; they do not manage official categories.
- Custom tags are searchable only and do not affect official trending in MVP.
- Prompt text is fallback input; structured selections are preferred.

### Proposed Files

```text
attributes/community-taxonomy.json
server/taxonomy/CommunityTaxonomyRepository.js
server/taxonomy/CommunityClassificationService.js
server/taxonomy/communityTaxonomyRoutes.js
client/community/communityTagPicker.js
client/community/communitySharePreview.js
test/communityTaxonomy.test.js
```

### Process

1. Load official taxonomy from versioned config.
2. Classify from structured selections, workflow mode and prompt composer signals.
3. Produce confidence per official tag.
4. Show high/medium confidence tags in Share Preview.
5. Store official tags separately from custom tags.
6. Exclude low-confidence posts from category trending.

### Testing

- Fashion Scene Builder selections produce Fashion/Commercial tags.
- Custom tags do not become official categories.
- Low-confidence tags exclude post from trending.
- Admin correction creates audit metadata.
