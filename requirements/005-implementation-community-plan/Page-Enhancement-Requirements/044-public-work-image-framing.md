# Public Work Image Framing

2026-09-08 follow-up: [045](045-shared-image-card-framing.md) expands the image
card policy to all MediaCard callers. Featured-only rules below describe the
previous delivery, not the current requested scope.

Status: implemented and fixture-verified. Owner: Community presentation. Parent: [042](042-profile-danger-and-public-work-master.md).
Visual reference: user's Public work screenshot in the 2026-09-08 conversation.

## Contract

Only image posts in Home's Public work carousel opt into adaptive framing.
Keep constant media height (320px desktop/tablet, 280px mobile), with bounded
width from authoritative generationMetadata width/height, then valid aspectRatio,
then 3:4 fallback. Bound ratio for card geometry; never distort/crop media.
Portrait images receive tall space; landscape cards expand horizontally. Extreme
ratios and mobile use contain within a viewport-bounded card. Preserve size while
loading/failing; no per-image polling, natural-size layout jumps or new caches.

Use the already-public original URL with contain, bypassing person-focus/cropped
presentation variants. Retain lazy loading and authorized media handling; do not
invent private URLs. Original bandwidth is bounded by the existing featured list;
future uncropped responsive derivatives remain with the media owner.

Preserve post links/return navigation, title/creator/metrics, carousel keyboard
and arrow/touch scroll, sorting, header/actions and See all. Non-image featured
cards, ordinary feed, Character galleries, Template detail and Video are unchanged.

## Tasks And Acceptance

- [x] M1 Add opt-in card geometry using finite positive dimensions/ratio fallback.
- [x] M2 Pass uncropped original/contain only for featured image posts.
- [x] M3 Scope CSS for fixed media height, bounded width, readable metadata.
- [x] M4 Test portrait/landscape/square/missing/invalid ratios and old defaults.
- [x] M5 Browser-check decoded mixed-ratio fixtures at 390/820/1440 in EN/TH;
  no document overflow, clipping or sideways distortion; carousel still navigates.

Evidence: runner `media` passes 19 tests. Browser `featured` passes 18
locale/viewport/theme cases using decoded bordered fixture images. Fixed stage
height, landscape width, original source/contain, viewport bound, arrow scrolling
and untouched feed variants are asserted. Four featured items remain bounded.
