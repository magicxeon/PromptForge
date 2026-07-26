# Community-03 Community Taxonomy and Auto Classification

**Status:** Implemented - Validation Pending
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

## 9. Implemented Data Contract

Official taxonomy is source-controlled configuration:

```text
server/config/community-taxonomy.json
- schemaVersion
- taxonomyVersion
- thresholds
  - high
  - medium
  - low
- limits
- dimensions[]
  - id
  - labels
  - tags[]
    - id
    - labels
    - aliases
    - workflowSignals
```

Stable tag ids use:

```text
<dimension-id>.<tag-id>

content_type.fashion
visual_style.realistic_photography
market_context.korean_style
```

Labels are presentation data. Stable ids are persisted and used for filters.
Aliases and workflow signals are server-only classifier configuration and are
removed from the public catalog.

Published posts persist:

```text
taxonomyVersion
taxonomyAssignments[]
  - tagId
  - dimensionId
  - confidence
  - confidenceLevel
  - sources
  - status
  - categoryEligible
  - trendingEligible
officialTags[]
customTags[]
categoryCodes[]
trendingCategoryCodes[]
taxonomyReviewStatus
taxonomyConfidence
```

`officialTags` and category codes contain stable ids. `customTags` are separate
search metadata and never become official categories.

## 10. Classification Rules

`CommunityClassificationService` is deterministic in this phase. It does not
call an AI provider and does not deduct credits.

Source priority:

```text
structured selections -> workflow metadata -> prompt fallback
```

The classifier reads:

- `sceneTemplateSnapshot.structuredSelectionsSnapshot`;
- generation `selections`, Character Sheet, Scene Builder and outfit metadata;
- generation `mode` and template authoring mode;
- final/manual prompt text only as fallback evidence.

Confidence behavior:

- high-confidence suggestions are eligible for category feeds and Trending;
- medium-confidence suggestions appear in Share Preview and require publish
  confirmation before category-feed eligibility;
- low-confidence matches are retained in the draft classification result for
  future review but are not preselected and cannot enter Trending;
- an official tag manually added by the creator is category eligible after
  confirmation but is not Trending eligible;
- custom tags are searchable only.

## 11. Share-Time Process

```text
create share draft
  -> server sanitizes private references
  -> classifier evaluates generation + template metadata
  -> draft returns taxonomySuggestion
  -> client loads public official taxonomy catalog
  -> user removes or adds official tags and enters custom tags
  -> publish sends selected stable ids
  -> server validates ids and limits again
  -> repository persists normalized taxonomy fields
```

The browser cannot create official tags. Unknown ids sent by a modified client
are rejected with `community_official_tag_invalid`.

Post-publish rules:

- owners may continue editing custom search tags through presentation updates;
- owners cannot rewrite published official taxonomy assignments;
- admin/support can correct official assignments only through the taxonomy
  correction endpoint and must provide a reason;
- every admin/support correction appends an audit event containing before and
  after taxonomy snapshots.

## 12. API Contract

```text
GET   /api/community/taxonomy
POST  /api/scene-templates/share-drafts
POST  /api/scene-templates/share-drafts/:draftId/publish
GET   /api/scene-templates/shared?officialTag=<stable-id>
GET   /api/scene-templates/shared?customTag=<search-tag>
GET   /api/scene-templates/shared?search=<text>
GET   /api/scene-templates/shared?officialTag=<stable-id>&sort=trending
PATCH /api/scene-templates/shared/:postId/taxonomy
```

`GET /api/community/taxonomy` returns labels, dimensions, thresholds and limits.
It does not expose aliases or classifier signals.

The admin/support taxonomy correction body is:

```json
{
  "officialTags": ["content_type.fashion"],
  "customTags": ["wedding"],
  "reason": "Corrected category after support review"
}
```

## 13. Canonical Implementation Files

```text
server/config/community-taxonomy.json
server/config/communityTaxonomyCatalog.js
server/domain/community/CommunityClassificationService.js
server/domain/community/CommunityShareService.js
server/domain/community/CommunityPostAccessService.js
server/domain/community/communityPostPublicView.js
server/repositories/community/CommunityPostRepository.js
server/app/routes/communityTaxonomyRoutes.js
server/app/routes/sceneTemplateRoutes.js
server/app/createApp.js

client/community/communityTaxonomyPicker.js
client/scene-builder/sceneSharePreview.js
client/index.html
client/style.css
client/i18n/locales/<locale>/community.json

test/communityTaxonomy.test.js
test/sceneShareFlow.test.js
```

There is no mutable `CommunityTaxonomyRepository` in the MVP. Official taxonomy
is reviewed source configuration, while user/post assignments are persisted by
`CommunityPostRepository`. A future backoffice taxonomy editor must introduce a
versioned repository and migration plan before replacing the config file.

## 14. Implementation Plan

1. Load and validate the versioned official taxonomy config.
2. Classify share drafts using structured-first deterministic signals.
3. Return suggestions with confidence without exposing server aliases.
4. Render a reusable official-tag confirmation control in Share Preview.
5. Validate official ids and normalize custom tags on the server.
6. Persist category and Trending eligibility separately.
7. Support official-tag filtering on public shared-template queries.
8. Gate post-publish corrections to admin/support and append audit events.
9. Keep public post output limited to sanitized taxonomy metadata.

## 15. Testing

Automated:

- catalog rejects duplicate or malformed stable ids;
- public catalog does not expose aliases or workflow signals;
- structured/workflow evidence outranks prompt-only evidence;
- prompt-only low-confidence tags are not preselected;
- unknown official ids are rejected;
- user-added official tags cannot force Trending;
- custom-tag limits and cleanup are deterministic;
- admin correction produces audit-ready before/after state.

Manual UI:

1. Generate a Scene Builder image containing clear fashion and regional signals.
2. Open Share Scene Template.
3. Confirm that suggested official tags appear with confidence labels.
4. Remove one suggestion, add another official tag and enter custom tags.
5. Publish and inspect the public post response.
6. Confirm custom tags do not appear in `categoryCodes` or
   `trendingCategoryCodes`.
7. Query the shared endpoint with `officialTag`.
8. As a normal user, verify that the taxonomy correction endpoint returns 403.
9. As admin/support, correct taxonomy with a reason and verify an audit event.
