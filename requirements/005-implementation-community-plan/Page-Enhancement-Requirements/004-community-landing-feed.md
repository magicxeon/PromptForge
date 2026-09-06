# 004 Community Landing And Feed Enhancement

Visual follow-up: [009 master](009-landing-visual-identity-master.md) extends the
page order with a compact Image Provider directory after start paths, adds
descriptions/color bands and replaces only Home's hero treatment. Feed contracts
and all pending backend/public-shell items below remain unchanged.

Status: Implemented and verified in scope (2026-09-06)

Route: `/`

Owner: Community

Visual source: `../Page-Enhancement-resources/momelo-landing-page-ux-ui-developer-spec.md` and `../Page-Enhancement-resources/004-momelo-landing-page-ux-ui-developer-spec-concept.png`

## 1. Product Decision

Landing Page และ Community Feed เป็นหน้าเดียวกัน ไม่สร้าง `/landing` หรือ homepage ชุดที่สอง รอบแรกยังอยู่ภายใต้ `AppShell` และ sidebar เดิม โดยนำแนวคิด visual hierarchy จาก mockup มาปรับให้เหมาะกับ content canvas ปัจจุบัน

## 2. User Outcome

ผู้ใช้ใหม่ต้องเข้าใจภายใน first viewport ว่า Momelo ใช้สร้าง สำรวจ และนำ resource ไปต่อยอดอย่างไร ขณะที่ผู้ใช้เดิมยังเข้าถึง Community Feed, filters และ create paths ได้เร็ว ไม่ต้องเลื่อนผ่าน marketing sections จำนวนมาก

## 3. Required Page Order

1. Media-first Community hero using eligible real public outputs; headline is a literal product/category offer, not an abstract slogan
2. Compact start-path controls for Playground, Templates, Characters and Comparisons using existing routes
3. At most one compact featured rail assembled from real public posts, deduplicated by stable post ID
4. Existing discovery toolbar
5. Community Feed as the primary continuing content
6. Tutorial mock and final CTA inserted after the first bounded result group, before explicit Load More when that pagination pattern is selected

Do not separately repeat `Created with Momelo`, Gallery and Community Feed as three grids containing the same posts.

## 4. Hero Rules

- Use actual public media already available in the first bounded response
- If no eligible media exists, use a restrained local product asset or neutral empty hero; never expose private output
- Text overlays media without placing the main hero in a card
- Media remains inspectable and not excessively blurred/darkened
- Hero height is bounded so the next section remains visible at 390px, 820px and 1440px
- Remove or hide current hero counts that are calculated only from the loaded page and appear to be global totals
- Create actions route to existing workflows; no generation occurs inside the hero

## 5. Feed Preservation

- Existing `sort`, `period`, `postType`, `category`, `search` and cursor behavior remains canonical
- `/explore/templates` and `/explore/comparisons` must not depend on fragile pathname string logic once page-specific modes are extracted
- Search state suppresses or compacts editorial content so results remain the focus
- Featured IDs are removed only from duplicate presentation within the current rendered view; source query data and pagination order are not mutated
- Infinite scrolling cannot make tutorial/footer content permanently unreachable; use an explicit Load More boundary or place supporting content before continued pagination
- Moderation, official tags, creator links and engagement actions keep their existing behavior

## 6. Start Paths

| Path | Destination | Availability rule |
|---|---|---|
| Create freely | `/create/playground` | Existing route exposure policy |
| Use a template | `/explore/templates` | Community feature enabled |
| Find a Character | `/explore/characters` | Character feature enabled |
| Compare models | `/explore/comparisons` | Community feature enabled |

Unavailable destinations follow existing feature exposure policy rather than rendering a dead control.

## 7. Detailed Tasks

- `HOME-01` Freeze root route, AppShell and feed query behavior
- `HOME-02` Refactor `CommunityHero` into a bounded, media-first hero without false aggregate counts
- `HOME-03` Add reusable start-path controls with route-policy checks
- `HOME-04` Compose one featured rail from eligible public posts and deduplicate presentation
- `HOME-05` Preserve URL-driven discovery and pagination behavior
- `HOME-06` Place tutorial mock and CTA without blocking feed access
- `HOME-07` Add all loading, no-media, empty-feed and partial-error states
- `HOME-08` Add English/Thai content
- `HOME-09` Test legacy redirects `/home` and `/community`
- `HOME-10` Validate first-viewport balance and keyboard order at all target sizes

## 8. Acceptance Criteria

1. `/` functions as both orientation and the actual Community Feed
2. The feed is reachable quickly and is not duplicated elsewhere on the page
3. All four start paths use current route registry destinations
4. Hero media comes only from public-safe data or an approved local asset
5. Search/filter/deep-link behavior remains compatible
6. AppShell/sidebar behavior and legacy redirects do not change
7. No non-authoritative platform totals are shown
8. The next content section is visible or clearly hinted within the initial viewport

## 9. Focused Validation

- Root route and legacy redirect tests
- Community hero tests for media, no-media and partial-data states
- Feed URL/filter/pagination tests
- Start-path exposure tests
- Public snapshot and moderation regression tests
- One root-page Playwright spec at 390px, 820px and 1440px

## 10. Pending

- Separate anonymous public shell or top navigation
- Landing aggregate/CMS endpoint
- Personalized recommendations
- SSR, SEO metadata and social preview rendering
- Real tutorial publishing workflow and YouTube integration
