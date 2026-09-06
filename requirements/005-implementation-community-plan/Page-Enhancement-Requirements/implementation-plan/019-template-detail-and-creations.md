# Template Detail Execution

Owner: Community. Requirement: ../014-template-detail-and-creations.md.
Status: Implemented with focused verification passed; live-data smoke pending.
No full-system test or paid generation.

| Step | Scope | Gate | Status |
|---|---|---|---|
| TDT-01 | Record requirements, source/data map, protected flows | Gap review before implementation | Done |
| TDT-02 | Read-only lineage/family service, facade/route, signed pagination | Focused Node service/route tests | Passed: 20 service/route tests and 3 frontend-route ownership tests |
| TDT-03 | Typed API/query, direct route/builder, detail, sidebar preview, Gallery links | Component/API/route tests; unchanged handoff | Passed: 14 UI and 20 compatibility tests |
| TDT-04 | EN/TH + scoped responsive CSS | Build, localized theme screenshots | Passed: 18 locale/width/theme combinations after image containment and creator contrast corrections |
| TDT-05 | Independent QA, regression evidence and handoff | Focused suites, diff/syntax, no runtime writes | Focused gate passed; live-server smoke remains pending |

## File Ownership

- Community domain service and tests; HTTP route extends communityShareRoutes
  and delegates through CommunityShareService, no new bootstrap route stack.
- New Community frontend hook/API schemas/components/templates/route; styles
  under web/src/styles. Route registry/sidebar/breadcrumb metadata extends the
  existing owner. Existing Post markup changes only for the approved preview
  placement and mobile Comments ordering.
- Direct entry also requires the server's frontend-route-ownership.json allowlist,
  not just React Router. Add the exact parameterized route and its existing
  ownership tests; do not broaden catch-all server routing.
- Tests under test and feature folders; scripts/test-template-detail.mjs and
  scripts/verify-template-detail-layout.mjs are separate fast entry points.
- No generation, credit, provider, Character, Landing, shared MediaCard or
  runtime JSON changes. Existing user edits remain untouched.

## Execution Tasks

1. Resolve visible template source from trusted Job context; batch source reads.
2. List only eligible public creations; sort before signed cursor pagination.
3. Test denied sources/ownership/lineage, plain images, ties and page boundaries.
4. Add typed response/API + actor-bound query hook shared by preview/detail.
5. Build direct detail with contain source media and current Use Template entry.
6. Add sidebar preview/origin link; preserve Post and mobile Comments behavior.
7. Link Gallery card and Featured explicit detail action to the new route.
8. Test links/handoff, all async states, sort/load-more and ordinary Posts.
9. Capture desktop/tablet/mobile EN/TH theme fixtures; inspect actual screenshots.
10. Review scoped changes against requirement and record results/gaps below.

## Verification Record (2026-09-06)

- `node scripts/test-template-detail.mjs --part=server`: 23 passed. Covers
  visibility, ownership, lineage, real history normalization, private-data
  redaction, signed pagination, feature gating and server deep-link ownership.
- `node scripts/test-template-detail.mjs --part=ui`: 14 passed. Covers route,
  preview, original handoff ID, async states, actor isolation and query paging.
- `node scripts/test-template-detail.mjs --part=compatibility`: 20 passed.
  Existing engagement, template-edit dialog, profile template mosaic and
  route selection remain compatible. Total focused tests: 57.
- `node scripts/test-template-detail.mjs --part=all` is the optional combined
  entry point for these groups only; it does not invoke the whole system suite.
- `npm run build --workspace web`: passed TypeScript and production build.
  Scoped ESLint, new server/script syntax checks, i18n catalog validation and
  `git diff --check` passed. Production assets rebuilt under web/dist.
- `node scripts/verify-template-detail-layout.mjs --locale=en` and `--locale=th`:
  passed 390/820/1440 x default/fashion/creative for each locale, on both Detail
  and Post preview. Includes direct entry/reload, Gallery/Featured links,
  See all, remix/origin navigation, sort/load more, ordinary Posts, Comments,
  More from creator, image loading/containment, creator contrast and overflow.
- Final screenshot directories (local temporary evidence):
  `C:/Users/punya/AppData/Local/Temp/template-detail-layout-fCnssf` (EN),
  `C:/Users/punya/AppData/Local/Temp/template-detail-layout-H1U1vs` (TH).
  Visual inspection corrected intrinsic source-image clipping and low creator
  text contrast in the light theme. Corrections are scoped to the new page.
- Independent backend QA found an unexpected coded-error message leak; fixed
  by limiting public errors to known repository contract/cursor error classes.
  Follow-up review found no remaining backend blockers. An in-memory probe
  through the real route, CommunityShareService and GenerationResultRepository
  passed with mocked stores and filesystem writes disabled. Frontend visual
  review was performed by the implementation agent, not independently.

## Protected Scope And Remaining Gate

- No files moved, runtime data paths introduced, data migrated, live share/like
  mutations or provider calls. Existing runtime JSON changes were not edited
  or reverted. Generation, Credits, template execution and Character/Landing
  behavior were not changed.
- The browser fixture intercepts API/media requests; its data is not production
  evidence. localhost:6500 returned ECONNREFUSED. Normal backend startup was not
  invoked because it may resume Jobs or perform startup reconciliation.
- After the normal server is started/restarted, open `/explore/templates`, open
  a template directly, refresh Detail, then visit the original Post and See all.
  Confirm a known shared variation appears and Use Template opens the existing
  handoff. No image generation is necessary for this smoke check.
- Only verified, publicly shared creations appear. Missing/deleted history is
  not guessed or backfilled. Durable lineage after history deletion, reviewed
  variation labels and database-scale indexed reads remain pending in 014.
