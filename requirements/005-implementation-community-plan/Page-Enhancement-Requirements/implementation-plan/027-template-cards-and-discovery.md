# Step 3: Horizontal Template Catalog And Discovery

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [026](../026-template-gallery-cards-and-discovery.md), TGC-01..06.

## Owner Files

Community `TemplateDiscoveryCard.tsx`, `TemplateGalleryRoute.tsx`, existing
discovery config/locales/tests and `template-gallery.css`.
Change `useCommunityDiscoveryPosts.ts` only for a verified additive need.
Generic MediaCard and other discovery route defaults remain unchanged.

## Tasks

- [x] G-01 Add old navigation/Use/price assertions before card changes; original
  ID and separate action targets remain protected.
- [x] G-02 Compose portrait-left/info-right card with max two public output
  insets, no blueprint. Cover missing-preview/unavailable states.
- [x] G-03 Apply existing friendly taxonomy labels and actual creator. Move
  technical density to Detail, not removal of public metadata fields.
- [x] G-04 Build content-width-aware two-column grid and narrow stack/fallback,
  stable action areas/skeletons; no global typography/card override.
- [x] G-05 Align search/sort and actual category options. Preserve query/URL/
  cursor semantics, latest/trending only where current API supports them.
- [ ] G-06 Match heading to sort/period; test clear/reset/back/forward/next-page
  and preview-only failure. Do not compute For you or ranking in the client.
- [x] G-07 Align short step labels with approved outfit/Character policy. Keep
  configured mock tutorials/explicit Load more; omit unimplemented income/rankings.
- [x] G-08 Wire/run `--part=template-catalog` and current card/schema tests.
  Assert results stay Template-only and existing Use failure is visible.
- [x] G-09 Inspect 390/820/1440 plus 320/1920 Gallery: long names, tags, actions,
  append behavior. Smoke-test Character/Comparison for shared controls/CSS touched.

## Exit / Rollback

TGC criteria pass with a single preview/query owner and unchanged filters.
Unsupported mockup options stay P-01. Rollback Template card/toolbar variant
only; do not reset persisted user filters or modify shared defaults to hide failures.
