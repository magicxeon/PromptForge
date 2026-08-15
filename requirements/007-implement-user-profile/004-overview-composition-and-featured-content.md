# User Profile 004 - Overview Composition and Featured Content

**Status:** Implemented; validation pending

## 1. Business Requirement

Overview must communicate a creator's strongest work quickly. It is a curated
summary, not a dump of every public record.

## 2. Overview Sections

Default order:

1. Featured Works
2. Popular Characters
3. Popular Templates
4. Recent Comparisons

Supporting rail:

1. Creator Statistics
2. Latest Collection
3. About Creator
4. Follow/owner call to action

Hide an empty public section. In owner Manage mode, show an actionable empty
state so the owner can add content.

## 3. Featured Work Rules

Priority:

1. valid owner-curated `featuredPostIds`
2. creator's highest eligible engagement score
3. newest eligible public posts

Maximum four. Never use private, removed, reported or media-unavailable posts.

Presentation:

- CSS grid/mosaic with stable aspect-ratio tracks
- first item receives primary emphasis
- clicking media opens shared Community lightbox
- `Use Prompt` appears only from canonical template/reuse capability
- engagement UI uses shared component

## 4. Character and Template Rows

Characters:

- reuse `communityCharacterSection` card/content contract
- allow a compact `profile-overview` variant
- show name, creator-independent Character identity, usage and reuse status
- card and title open Character Profile

Templates:

- reuse canonical Community template card/action
- show required slot summary and public engagement
- `Use Template` delegates to existing handoff

Do not recreate prompt, reference or generation logic in Profile.

## 5. Comparison and Collection Preview

- comparison preview reuses shared comparison mosaic/card
- winner highlight and vote state come from canonical public model
- latest Collection uses canonical collection media composition
- opening either routes to the existing detail experience

## 6. Client Composition

Recommended module:

```text
client/community/creatorProfileOverview.js
```

It receives the bounded Overview payload and composes existing components.
Adapters may normalize the page model to component props, but must not duplicate
markup or business policy.

Use semantic unframed sections with constrained inner layouts. Do not nest
decorative cards inside cards.

## 7. Server Query Behavior

`CreatorProfilePageService` builds Overview through parallel bounded reads.

Requirements:

- no per-card History query
- no unbounded scans returned to client
- one failure in an optional section yields that section's error/empty state,
  not private fallback data
- featured IDs are validated against ownership and public eligibility
- ordering is deterministic

## 8. File-Level Implementation Plan

Create:

```text
client/community/creatorProfileOverview.js
```

Extend:

```text
server/domain/community/CreatorProfilePageService.js
client/community/creatorProfileController.js
client/community/creatorProfileSectionAdapters.js
client/community/creatorPortfolioGrid.js
client/community/communityCharacterSection.js
client/comparisons/comparisonMosaic.js
client/style.css
client/i18n/locales/en/community.json
client/i18n/locales/th/community.json
```

Implementation sequence:

1. Build and test a bounded Overview fixture.
2. Add thin adapters for existing cards.
3. Render main-column sections.
4. Render the supporting rail.
5. Add media fallbacks and per-section failure containment.
6. Verify mobile ordering.

## 9. Impact

- Profile base route gains one aggregate read instead of several client-owned
  requests.
- Existing Community cards gain presentation variants but preserve actions.
- No content record is copied into Creator Profile storage.

## 10. Cases

- no public content
- only Characters exist
- stale featured IDs
- featured image removed after profile load
- mixed portrait/landscape media
- Template becomes view-only
- Comparison has partial failures
- Collection cover has missing member
- counts update while cached Overview remains visible

## 11. Tests

- curated order wins when valid
- fallback selection is deterministic
- private/reported content excluded
- section limits enforced
- section component receives canonical actions
- lightbox uses public browse context
- mobile sections become stable rails/lists
- Overview remains usable when one optional section fails

## 12. Exit Criteria

- Overview renders from one bounded page query
- all cards are shared or thin adapters over canonical components
- owner and visitor see the same content order
- management affordances remain hidden outside Manage mode
