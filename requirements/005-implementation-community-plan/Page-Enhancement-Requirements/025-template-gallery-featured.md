# Template Gallery Header And Featured Results

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Route: `/explore/templates`. Owner: Community.
Execution: [plan 026](implementation-plan/026-template-gallery-featured.md).

## Desired Composition

Use resource 001 for hierarchy: compact title/actions, then ONE Featured Template
item containing identity on the left and real related pictures on the right.
This replaces the duplicated original image in the current header and Featured.
It does not replace the Landing hero or change shared DiscoveryPageHero defaults.

## Behavior

1. Header has literal Template Gallery title, short supporting copy and existing
   creation/browse destinations. No new marketing route or oversized media hero.
2. Preserve the current deterministic selection: first visible media-bearing
   Template from the active discovery results. Label it Featured, not weekly
   winner/editor's pick. Search/filter changes may change it; record this in tests.
   Editorial pinning independent of filters requires the pending editorial contract.
3. Featured displays original + up to two distinct public creations from 024.
   Clearly distinguish original from creations. Do not claim different Character/
   outfit unless verified metadata supports that claim; use neutral related-work copy.
4. For zero creations show only the original without fake variations; for one,
   render two occupied stages. No duplicated images to fill three placeholders.
5. Creator identity is the Template owner. Keep title, bounded description/tags,
   availability, canonical access fee, View details and Use Template.
   Do not use one of the output creators as the Template owner.
6. View details/media link to `/explore/templates/:rootPostId`; individual output
   links, if provided, go to their original Posts with return intent.
   Use Template submits only the original root Post ID via existing handoff.
7. No auto-rotating carousel. The MVP shows a static bounded set plus Detail
   navigation; arrows/dots from the mockup are omitted until extra content exists.

## Layout And States

- Desktop: approximately 40% copy / 60% portrait media. Shared item border with
  <=8px radius, no decorated cards nested inside it. Text remains outside image
  overlays except a short source-role badge with sufficient contrast.
- Feature preview media uses stable portrait frames/cover; full original
  inspection remains contain in Detail. No image stretching or data modification.
- Tablet: stack copy/media when the minimum useful column widths fail. Mobile:
  original remains visible; creations form a bounded secondary row, no page overflow.
- Header/Featured should leave a hint of discovery content in normal first desktop
  viewport; do not shrink text or crop controls to force that at short heights.
- Loading reserves frames. Preview error keeps original and actions with retry.
  Empty catalog omits Featured. Broken image does not remove identity/actions.
- All strings use existing EN/TH catalogs, theme tokens, zero letter spacing,
  keyboard links, visible focus and stable CTA dimensions.

## Reuse / Acceptance

Extend `TemplateGalleryRoute`, keep `MediaStage`, `CreatorIdentity`,
`TemplatePricingBadge`, `TemplateUseButton`, existing handoff and navigation.
A controlled feature-specific Featured component is appropriate; it receives
the selected Post, preview state and callbacks, and does not fetch itself.

- `TGF-01`: Three stages represent one original and two verified public outputs.
- `TGF-02`: 0/1/error states never invent outputs or hide working Use/Detail.
- `TGF-03`: Filter change selects the new eligible root without stale previews.
- `TGF-04`: Preview/Use actions retain root identity and no paid submission occurs.
- `TGF-05`: 390/820/1440 screenshots retain hierarchy and no overlap.

Rollback is local Featured/header composition reversal; cards and Detail can
remain independently enabled. No persisted selection or editorial data is added.

## Follow-Up: Compact Header And Featured Emphasis

Scope: only the Template Gallery header and Featured item, including their
mobile/tablet/desktop states. Primary: base-implementation-owner; local visual
changes with unchanged component, navigation and data contracts.

- `TGF-06`: Remove the inherited 610px description limit on this route only.
  Allow natural wrapping across the available header width, reduce heading and
  action spacing, and keep full text and operable buttons on narrow screens.
- `TGF-07`: Emphasize the single Featured frame with an 8px rounded border and
  theme-token gradient strongest at the upper left, fading into the surface
  toward the lower/right area. The copy background must not hide the gradient;
  no overlay may tint the original or creation images.
- `TGF-08`: Use the warm theme highlight for the Featured eyebrow and a scoped
  primary treatment for Use Template, retaining disabled/pending behavior.
- `TGF-09`: Preserve media identities, 0/1/2 creation states, creator, fee,
  root-ID handoff, Detail links, discovery steps, catalog, filters and tutorials.
  Do not change Landing, Character, Photo Detail or shared hero defaults.
- `TGF-10`: Focused component checks and Gallery screenshots at 390/820/1440,
  all three themes, plus narrow/wide Thai checks. Assert full-width header copy,
  compact desktop height, frame/gradient, action containment and sibling presence.

No new capability, translation, runtime data or paid generation is required.

## Revision: Template Family Header, 75 Percent Media

Status: Implemented; focused component and responsive fixture checks passed.
Live source-data UAT remains pending; see delivery evidence 034.
Supersedes the text-only header restriction
in Desired Composition and TGF-06 for eligible families only. The compact header
remains the fallback. Featured and every sibling section stay unchanged.

Primary: UX/UI Product Designer; reviewer: QA Release Engineer. Skills:
review-product-ux and verify-release-regressions. Community owns this read-only
discovery presentation; no new server workflow or storage owner is introduced.

- `TH-01`: Select the first available Template in the current loaded discovery
  results with at least three distinct public creation images from its canonical
  preview batch. This follows the approved three-creations-plus-original proposal;
  do not count the original, missing-media records, duplicate IDs or private work.
  Existing batch ordering is most-liked first. Keep Original on the far right;
  place the highest-ranked creation next to it, with the other two extending left.
- `TH-02`: Desktop/tablet media occupies the rightmost 75% of the header.
  A dark, theme-tinted left layer overlaps the images with a soft diagonal fade,
  without the Comparison header's hard clipped edge. Preserve a clear Original
  at the far right and expose a localized Original label. No carousel or autoplay.
- `TH-03`: Reuse DiscoveryPageHero for title, description and existing Create/
  Browse links. Keep its shared defaults unchanged. Add a root Template title/
  details link without triggering handoff or generation. Desktop target 340px;
  text wraps naturally and may grow rather than overlap or clip controls.
- `TH-04`: Mobile retains the right-75% image band, shows the original plus the
  top creation, and gives copy its own lower space with a smooth overlapping
  fade. Hide only secondary decorative images, never the original or actions.
- `TH-05`: Missing/failed/insufficient previews use the compact header and the
  existing preview retry state. No fabricated imagery or unrelated family mix.
  Filter changes select from the current results only; empty results cannot
  retain a previous family's hero. No added requests, cache or polling loop.
- `TH-06`: Preserve Featured selection, its gradient/images/fee/actions, all
  discovery steps, filters, catalog cards and tutorials. Comparison, Landing,
  Template Detail, references, provider and Credit behavior are out of scope.
- `TH-07`: Focused selection/component tests cover threshold, deduplication,
  ordering, unavailable/non-public/missing data, filter changes and fallback.
  Browser checks assert 75% geometry, far-right Original, fade, action containment,
  mobile visibility and unchanged sibling sections at 390/820/1440, three themes,
  plus Thai 320/1920. Retain the existing optional aggregate test entry point.

Reuse map: TemplateGalleryRoute reads useTemplatePreviews; a Community-owned
TemplateGalleryHero composes DiscoveryPageHero and MediaStage. A small pure
templateHeroSelection helper owns only presentation eligibility/order. Public
family membership and visibility remain enforced by Community's existing API.
Global editorial pinning independent of search is deferred, not added here.

## Temporary Featured Suppression

Latest approved scope: omit the separate Featured Template section from
TemplateGalleryRoute in both illustrated and compact-header modes, because it
duplicates the header. This explicitly supersedes TH-06's requirement to render
Featured. Keep TemplateFeatured, its styles and component tests available for
future reuse; no data or feature implementation is deleted.

Tasks: remove only the route's Featured composition; update Gallery browser
assertions for its absence and header -> discovery steps -> catalog order;
verify mobile/tablet/desktop. Preserve header selection, retry, catalog Use/Detail
actions, pricing, filters and tutorials. No CSS hiding, blank spacer, new flag,
API or persistence change is needed. Owner: Community/base-implementation-owner.

Verification: implemented by removing only the route import, selection and
render of TemplateFeatured. Vite build and Gallery fixture checks passed at
390/820/1440 in three themes, plus compact fallback at 320/1920. Assertions
require zero Featured nodes, no blank intermediate section, preserved header
geometry/actions and discovery steps followed by catalog. Screenshot evidence:
`C:/Users/punya/AppData/Local/Temp/template-presentation-XY2mbv` and
`C:/Users/punya/AppData/Local/Temp/template-presentation-EZiAnk`.

## Temporary Featured Suppression

Latest approved scope: omit the separate Featured Template section from
TemplateGalleryRoute in both illustrated and compact-header modes, because it
duplicates the header. This explicitly supersedes TH-06's requirement to render
Featured. Keep TemplateFeatured, its styles and component tests available for
future reuse; no data or feature implementation is deleted.

Tasks: remove only the route's Featured composition; update Gallery browser
assertions for its absence and header -> discovery steps -> catalog order;
verify mobile/tablet/desktop. Preserve header selection, retry, catalog Use/Detail
actions, pricing, filters and tutorials. No CSS hiding, blank spacer, new flag,
API or persistence change is needed. Owner: Community/base-implementation-owner.
