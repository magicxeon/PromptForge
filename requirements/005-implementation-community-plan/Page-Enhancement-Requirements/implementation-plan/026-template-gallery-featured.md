# Step 2: Template Header And Featured Demonstration

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [025](../025-template-gallery-featured.md), TGF-01..05.

## Owner Files / Reuse

TemplateGalleryRoute, template components under Community, template-gallery.css,
EN/TH community catalogs. Reuse MediaStage, CreatorIdentity, TemplatePricingBadge,
TemplateUseButton/current handoff. Proposed controlled component:
`web/src/features/community/components/templates/TemplateFeatured.tsx`.
Do not redesign DiscoveryPageHero/Landing globally.

## Tasks

- [ ] F-01 Add fixtures for selected root with 0/1/2+ outputs, filtered-empty,
  changed selected root and preview failure.
- [x] F-02 Remove only duplicate Template-header image presentation; preserve
  title/actions/breadcrumb and internal navigation.
- [x] F-03 Keep first eligible active-result selection; no hard-coded Post ID or
  artificial weekly/editorial rank. Pass root/preview state as controlled props.
- [x] F-04 Compose original and up to two public output stages; source-role labels
  and no duplicate padding images. Do not alter source bytes or reference assets.
- [x] F-05 Connect Detail links and original-ID Use; retain correct owner,
  bounded description/tags and access fee without mock metrics.
- [x] F-06 Add scoped two-column/stacked responsive rules and stable loading
  geometry. Keep actions/text readable in Thai and short viewports.
- [x] F-07 Localize new labels, visible focus and local retry; no autoplay carousel.
- [x] F-08 Wire/run `--part=template-featured`; assert navigation never dispatches
  generation and handoff pending/error behavior remains intact.
- [x] F-09 Inspect Gallery screenshots at 390/820/1440 in each theme before the
  next step: media identity, crop, clipping and first-viewport hierarchy.

## Exit / Rollback

TGF criteria pass; Gallery demonstrates real outputs without a blueprint. If
live root has no verified creations, retain honest single-original state and
record gap. Rollback scoped Header/Featured composition only; batch read remains.

## Follow-Up Tasks: Header Density And Featured Emphasis

- [x] V-01 Compare resource 001 and the current screenshot; identify shared
  description max-width and opaque Featured copy background as local style owners.
- [x] V-02 Update only template-gallery.css header spacing and description width.
- [x] V-03 Add the Featured corner gradient, rounded accent frame, warm eyebrow
  and locally styled Use button. Preserve all media, links and disabled behavior.
- [x] V-04 Extend Gallery-only assertions in verify-template-presentation-layout.mjs;
  run --part=template-featured and --part=template-catalog separately.
- [x] V-05 Build and inspect the Gallery-only viewport/theme matrix and Thai
  stress widths. Record evidence in 034; retain unrelated live/source UAT gaps.

Run this scope with `node scripts/test-template-presentation.mjs --part=visual
--scope=gallery` after rebuilding. The existing --part=all runner remains the
optional aggregate production/UAT check; do not run the entire system for CSS.

## Revision Tasks: Right-75-Percent Family Header

Requirement025 TH-01..07; execute in this order. Do not reopen Featured styling.

- [x] H-01 Read live Comparison header and canonical preview contracts; record
  the explicit replacement of the text-only rule and the three-creation threshold.
- [x] H-02 Add Community-owned templateHeroSelection.ts and focused tests for
  eligible family selection, distinct public images, order and compact fallback.
- [x] H-03 Compose TemplateGalleryHero.tsx from shared DiscoveryPageHero and
  MediaStage; wire into TemplateGalleryRoute without additional fetching.
- [x] H-04 Scope 75% media, diagonal fade, Original label and mobile adaptation
  to the illustrated Template header. Preserve compact fallback and all siblings.
- [x] H-05 Add --part=template-hero to the existing focused/aggregate runner;
  extend Gallery geometry checks to distinguish illustrated and compact modes.
- [x] H-06 Run hero/Featured/catalog tests, typecheck, scoped lint, build and
  Gallery-only responsive/theme checks. Review live read-only rendering when
  available; record fixture versus live evidence and remaining gaps in 034.

New files stay under web/src/features/community/components/templates, following
its component/test pattern. No architecture relocation, locale changes or runtime
data path is needed. Rollback only the illustrated header and route wiring.
