# Community Page Enhancement Master Requirement

Active Character-only follow-up: [Character discovery identity master](010-character-discovery-identity-master.md),
with [data trace](011-character-discovery-data-trace.md) and implementation plans
013-016. [Character highlight polish](012-character-highlight-polish.md) and plan
017 supersede the Header face-thumbnail policy with public Gallery images and
own the approved visual refinements. Earlier delivery status does not close
these follow-ups; Landing is paused.

Active refinement: [Featured row and post engagement](013-character-featured-row-and-engagement.md)
and plan 018 own graduated Header circles, full-row Featured framing, cover/fade
previews and real post likes/views. They supersede 012's contain preview policy
only, not approved media or full-image detail inspection.

Follow-up delivered and verified in scope: [Landing visual identity master](009-landing-visual-identity-master.md)
owns the additional Home-only floating hero, section descriptions/color bands
and read-only provider/model directory. Prior delivery status below does not
close this follow-up.

Status: Implemented and verified in scope (2026-09-06)

Primary role: Product and Requirement Architect

Required reviewer during implementation: UX/UI Product Designer

Owning capabilities: Community for public discovery and the root feed; Profiles for the Character directory; Comparisons for private comparison work only

## 1. Outcome

ปรับหน้า Gallery, Templates, Comparisons และ Characters ให้มีเอกลักษณ์ของงานแต่ละประเภท น่าเปิดดู และนำผู้ใช้เข้าสู่ workflow เดิมได้ง่ายขึ้น โดยไม่สร้าง generation, sharing, Credit, ownership หรือ persistence path ใหม่

หน้า `/` ต้องเป็น Landing Page และ Community Feed หน้าเดียวกัน เพื่อลดเนื้อหาและ route ที่ซ้ำกัน ส่วน mockup เป็น visual direction ไม่ใช่คำสั่งให้คัดลอกทุก section หรือข้อมูลตัวอย่างลง production

## 2. Source Material

- `../Page-Enhancement-resources/001-momelo-template-gallery-ux-ui-spec.md`
- `../Page-Enhancement-resources/001-templages-gallery.png`
- `../Page-Enhancement-resources/002-momelo-comparison-gallery-ux-ui-spec.md`
- `../Page-Enhancement-resources/002-momelo-comparison-gallery-ux-ui-spec-concept.png`
- `../Page-Enhancement-resources/003-momelo-characters-gallery-ux-ui-spec.md`
- `../Page-Enhancement-resources/003-momelo-characters-gallery-ux-ui-spec-concept.png`
- `../Page-Enhancement-resources/momelo-landing-page-ux-ui-developer-spec.md`
- `../Page-Enhancement-resources/004-momelo-landing-page-ux-ui-developer-spec-concept.png`

## 3. Fixed Product Decisions

1. `/` ยังคงเป็น `CommunityHomeRoute` และรวม Landing content กับ Community Feed
2. รอบแรกยังใช้ `AppShell` และ sidebar เดิม ไม่สร้าง public shell ใหม่
3. `/explore/templates` เป็น public Template Gallery
4. `/explore/comparisons` เป็น public Comparison Gallery
5. `/explore/characters` เป็น public Character Gallery และ Profiles ยังคงเป็นเจ้าของข้อมูล Character
6. `/comparisons` และ `/comparisons/:setId` ยังคงเป็น private workspace/history ของเจ้าของ ห้ามนำมาปนกับ public gallery
7. ใช้ข้อมูล public snapshot ที่ server sanitize แล้วเท่านั้น ห้าม client ประกอบ private source ขึ้นมาเผยแพร่เอง
8. Tutorial และ YouTube section ทำเป็น mockup/configuration ได้ แต่ต้องไม่โหลด iframe หรือ autoplay ก่อนผู้ใช้กด
9. ห้ามแสดงตัวเลข rating, usage, income, ranking, cost saving หรือสถิติรวมที่ไม่มี authoritative source
10. Function เดิมที่ไม่ได้ระบุให้เปลี่ยนต้องทำงานเหมือนเดิม รวมถึง filter URL, pagination, detail navigation, Template Use, Character handoff, Comparison ownership, share, moderation และ permission

## 4. Route And Ownership Matrix

| Surface | Route | Runtime owner | Requirement |
|---|---|---|---|
| Landing + feed | `/` | Community | `004-community-landing-feed.md` |
| Template Gallery | `/explore/templates` | Community public post projection | `001-template-gallery.md` |
| Comparison Gallery | `/explore/comparisons` | Community public comparison snapshot | `002-comparison-gallery.md` |
| Character Gallery | `/explore/characters` | Profiles consuming Community character read API | `003-character-gallery.md` |
| Shared presentation | N/A | React shared components | `005-shared-discovery-components.md` |
| Editorial/mock content | N/A | Community feature configuration | `006-content-data-and-mock-configuration.md` |

## 5. First Delivery Scope

- Page-specific hero or editorial lead that communicates the resource type in the first viewport
- Shared search, filter, period and sort patterns with page-specific available choices
- Resource-specific cards rather than one universal card
- Existing real media and existing actions
- Compact how-it-works/tutorial mock sections where the mockup requests them
- Loading, empty, partial error and unavailable-content states
- Responsive layouts at approximately 390px, 820px and 1440px
- Theme compatibility for default, fashion and creative themes
- English and Thai localization
- Focused tests per page and a final optional aggregate script

## 6. Explicit Non-Scope

- Provider, model, prompt compiler, generation Queue or Credit changes
- New public-write, share, moderation or ownership behavior
- New Character follow, Character rating or Character ranking mutation
- New Comparison judging, blind voting, weighted scoring or benchmarking engine
- Template creator payout or monetization changes
- Replacing `AppShell`, sidebar, global navigation or authentication model
- SEO/SSR migration
- Video generation or Cinematic Studio changes
- Completing the unrelated `/me/templates` route

## 7. Reuse Rules

- Extend `Button`, `Surface`, `AsyncState`, `MediaCard`, `CreatorIdentity`, `HorizontalMediaCarousel`, `TemplateUseButton` and existing routing/API contracts when responsibility matches
- Shared discovery components receive data and callbacks; they do not fetch data, mutate repositories or call providers
- Do not turn `MediaCard` into a conditional universal card for all page designs
- Template, Comparison and Character cards remain feature-specific because their information hierarchy and actions differ
- Do not change the default `CharacterCard` presentation used by Fashion/Profile consumers; add a backward-compatible variant or a discovery wrapper
- Page orchestration remains in `web/src/features/<feature>/`; genuinely reusable primitives belong in `web/src/components/discovery/`

## 8. Delivery Order

| Step | Requirement | Exit gate |
|---|---|---|
| 1 | Contract freeze | Routes, protected behavior, data availability and pending items are asserted |
| 2 | Shared discovery foundation | Shared controls pass isolated component tests |
| 3 | Template Gallery | Public template route works with existing use/detail behavior |
| 4 | Character Gallery | Directory and handoff behavior remain compatible |
| 5 | Comparison Gallery | Public/private boundaries and snapshot safety are verified |
| 6 | Landing + Community Feed | Root page merges editorial entry and feed without duplicate workflow |
| 7 | Integration and release | Responsive, theme, i18n and adjacent regression gates pass |

Detailed execution is in `implementation-plan/000-master.md`.

## 9. Cross-Requirement Acceptance Criteria

1. Each public route is visually distinguishable without changing canonical route ownership
2. Every displayed metric is backed by a named response field or is omitted
3. Mock content is visibly editorial/sample content and cannot be mistaken for a live platform ranking
4. Existing actions reach the same destinations and retain the same permission checks
5. Search/filter state is keyboard operable, URL-compatible and does not reset unexpectedly on navigation
6. No nested page-section cards, overlapping text, clipped controls or unintended horizontal page scroll occurs at target viewports
7. Public views never expose private prompts, references, actor identifiers or unpublished outputs
8. No new Base64 media is retained in browser state
9. Loading, empty, partial-data and error states remain actionable
10. Implementation can be rolled back page by page without migrating runtime data

## 10. Pending Decisions

The following work is intentionally deferred and must not block the first delivery:

- `PENDING-SHELL`: anonymous/full-width public shell and removal of the sidebar from discovery pages
- `PENDING-AGGREGATE-API`: dedicated landing aggregate endpoint; add only after measuring current request and payload cost
- `PENDING-RANKINGS`: authoritative model, template creator and Character ranking services
- `PENDING-COMPARISON-LAB`: blind mode, synchronized inspection, scored benchmarks, confidence and review systems
- `PENDING-CHARACTER-SOCIAL`: Character-level follow/save/rating/growth contracts
- `PENDING-EDITORIAL-CMS`: admin-managed tutorials, YouTube links and editorial schedules
- `PENDING-SEO`: SSR, pre-rendering and public metadata architecture

Each pending item needs a separate approved requirement before implementation.

## 11. Requirement Completion Gate

This documentation set is complete when every page requirement names its data source, protected behavior, component boundary, responsive behavior, focused tests, acceptance criteria and pending gaps. Documentation completion does not mark any application behavior as implemented.

## 12. Requirement Review Record

Review result: Ready for step-by-step implementation planning handoff; no blocking product decision remains in the first-delivery scope.

- Route and capability ownership are connected across all page requirements
- Positive, empty, partial-error, permission/public-safety and recovery behavior is assigned
- Each implementation step has a focused test boundary and an adjacent regression boundary
- Mockup-only metrics and high-impact platform additions are routed to named Pending items
- No runtime data migration, provider change or commercial behavior is required
- Review was performed sequentially by the same agent using the Product, UX and QA charters; it is not an independent second-agent review

## 13. Implementation Record

- Steps 01-07 were delivered in order without changing provider, Generation, Credit, sharing, moderation or persistence contracts.
- `/`, `/explore/templates`, `/explore/characters` and `/explore/comparisons` now use page-specific discovery compositions over the existing APIs.
- Shared discovery primitives remain controlled presentation components; Community and Profiles retain route orchestration and data ownership.
- Focused UI, route, schema, handoff and public-policy regressions passed. Typecheck, catalog validation, scoped lint and production build passed.
- All four routes passed the local layout gate at 390px, 820px and 1440px in default, fashion and creative themes.
- Repository-wide lint remains outside this closure because six pre-existing errors are present in unrelated Admin and Generation files; all changed files pass scoped lint.
- No runtime data path or migration was added. Rollback remains route/component composition reversal.
