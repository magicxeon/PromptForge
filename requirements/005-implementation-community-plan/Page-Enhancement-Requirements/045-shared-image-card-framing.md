# Shared Image Card Framing

Status: implemented and fixture-verified 2026-09-08. Supersedes the featured-only scope
of 044; deletion requirement 043 is unchanged.
Primary: UX/UI Product Designer; reviewer: QA (sequential self-review).
Skills: review-product-ux, verify-release-regressions.

## Scope

MediaCard owns image-post presentation everywhere, not a per-route opt-in.
All Image posts use the original authorized source with contain and stable
320px media height (280px mobile). Reuse dimension/ratio fallback from 044.
Remove the adaptiveImage switch so callers cannot accidentally retain cropping.
Keep previewFit for other post types only. Do not modify full post media,
Character identity cards, Template-specific cards, Comparison or Video players.

One shared wrapping layout class owns variable image-card widths in Community
images, Character Overview/Creations, Creator post tabs, and More from creator.
Preserve each wrapper's identity, headings, actions, filters, ordering, pagination,
permission boundaries and empty/error states. Featured remains a horizontal
carousel using the same card geometry. Mixed non-image cards retain media rules.
Creator tabs containing Character cards or raw library media retain their layout.
Mobile wrapping lists use available width; carousel remains horizontally scrollable.
Do not stretch a short last row to fill the entire screen or crop narrow portraits.

No extra API calls, image dimension probing, caches, generation, or data writes.
Retain lazy loading and existing list limits. More originals may increase bytes;
future uncropped thumbnail derivatives remain a separate media-owner task.

## Tasks

- [x] S1 Centralize default image framing and shared card/list styles.
- [x] S2 Wire canonical list wrappers; remove featured-only usage and stale tests.
- [x] S3 Verify image/default/non-image contracts and adjacent route tests.
- [x] S4 Verify affected lists at 390/820/1440 using isolated browser fixtures.
- [x] S5 Record evidence, limits and final scoped review.

Implementation: [038](implementation-plan/038-shared-image-card-framing.md).
