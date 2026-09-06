# 001 Template Gallery Enhancement

Status: Implemented and verified in scope (2026-09-06)

Route: `/explore/templates`

Owner: Community public discovery; Templates owns template execution and version behavior

Visual source: `../Page-Enhancement-resources/001-momelo-template-gallery-ux-ui-spec.md` and `../Page-Enhancement-resources/001-templages-gallery.png`

## 1. User Outcome

ผู้ใช้ต้องมองออกทันทีว่านี่คือพื้นที่ค้นหา style/recipe ที่นำไปใช้ต่อได้ เห็นภาพผลลัพธ์ ผู้สร้าง ความพร้อมใช้งาน และ action หลักโดยไม่ต้องเปิดรายละเอียดทุกชิ้น

## 2. Protected Existing Behavior

- Query ต้องยังจำกัด `postType=template`
- URL filter, period, sort, search and cursor pagination contracts remain supported
- Selecting a public item still opens its current public post/detail route
- `TemplateUseButton` remains the canonical reusable entry to use a template
- Template pricing/readiness/lineage data is displayed only when present in the existing public snapshot
- Owner edit behavior, template versioning, Credit quote and execution are unchanged

## 3. Page Structure

1. Compact visual hero with literal Template Gallery heading and one primary Create/Use path
2. Featured template area using one real, currently visible public template; omit the block when no candidate exists
3. Three-step `Discover -> Inspect -> Use` strip using concise labels only
4. Shared discovery toolbar with search, category, period and sort controls
5. Template-specific responsive grid
6. Compact tutorial mock section from approved configuration
7. Creator program/monetization banner is omitted until its destination and commercial contract exist
8. Explicit Load More action or existing intersection pagination with an accessible loading state; implementation must choose one behavior, not both simultaneously

The hero and featured block must leave part of discovery content visible in the first viewport. Do not reproduce the mockup as a long marketing page before the results.

## 4. Template Card Contract

`TemplateDiscoveryCard` may display only fields available from the public `communityPostSchema` projection:

- Result preview media
- Template title
- Creator identity
- Official tags/category, truncated to a bounded count
- Provider/model metadata when present
- Aspect ratio/resolution metadata when present
- Public template availability, Credit price and readiness when present
- Existing engagement summary when authoritative
- `View details` and existing `Use template` actions

Blueprint inset, replacement maps or before/after assets from the mockup are optional only when a future public schema provides sanitized media. Never derive or expose private template inputs.

## 5. Interaction Rules

- Entire media/title area may open details, but action buttons must have independent focus and click targets
- `Use template` uses the current handoff/session behavior and preserves return intent
- Unsupported/unavailable templates explain the current readiness reason instead of showing a dead CTA
- Search has a clear button; filters have visible active state and reset behavior
- Changing filter/sort updates the canonical URL and resets cursor safely
- Keyboard focus order follows hero, toolbar, cards, pagination and tutorials

## 6. States

| State | Required presentation |
|---|---|
| Loading | Stable card skeleton dimensions; no layout jump |
| Empty catalog | Clear filters and link to an existing creation route |
| Filtered empty | Preserve controls and offer Reset filters |
| Partial media failure | Keep metadata/actions and use the shared media fallback |
| API failure | Existing retry pattern; do not replace the whole shell |
| Template unavailable | Read-only card with server-owned reason |

## 7. Responsive Behavior

- Mobile: one-column cards; primary action remains visible; secondary metadata wraps to a second line
- Tablet: two-column grid when card minimum width is preserved
- Desktop: three or four columns based on the content width, not viewport font scaling
- Hero, toolbar and card controls must not introduce horizontal page scrolling
- Card media uses stable aspect-ratio and footer height constraints

## 8. Detailed Tasks

- `TPL-01` Add a route-mode adapter so `/explore/templates` does not depend on generic `MediaCard` composition
- `TPL-02` Implement the page hero and real featured candidate selection
- `TPL-03` Build `TemplateDiscoveryCard` around public snapshot fields
- `TPL-04` Reuse `TemplateUseButton` without duplicating execution logic
- `TPL-05` Bind shared search/filter/period/sort controls to the URL
- `TPL-06` Add loading, empty, retry and unavailable states
- `TPL-07` Add configured tutorial placeholders with no eager external embed
- `TPL-08` Add English/Thai catalog keys
- `TPL-09` Add isolated route/card tests and responsive visual checks
- `TPL-10` Verify Profile/Fashion template consumers keep their existing layout and behavior

## 9. Acceptance Criteria

1. The route contains only public templates and is visually distinct from the generic Community feed
2. Every template action delegates to an existing route or `TemplateUseButton`
3. No invented use count, star rating, creator earning or Credit price appears
4. Feature and grid sections handle zero templates without broken empty containers
5. Existing template execution and owner-management tests remain unchanged and pass
6. Mobile, tablet and desktop screenshots show no overlap or clipped actions

## 10. Focused Validation

- Route-mode and URL filter tests for `CommunityHomeRoute` or its extracted Template route
- `TemplateDiscoveryCard` component test with full, partial and unavailable snapshots
- Existing `TemplateUseButton` and shared template tests
- Community schema parsing test for representative template snapshots
- One Playwright spec limited to `/explore/templates` at 390px, 820px and 1440px

## 11. Pending

- Template ratings and reviews
- Top template creator rankings
- Creator program, monetization and payout copy/actions
- Personalized `For You` ranking
- Blueprint/replacement preview API
