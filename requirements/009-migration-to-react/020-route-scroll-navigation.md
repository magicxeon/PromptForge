# 020 Route Scroll Navigation

Status: implemented and focused verification passed. Owner: React platform navigation (004). Primary: UX/UI Product
Designer; reviewer: QA Release Engineer, applied sequentially in this session
(no independent reviewer). Skills: review-product-ux, verify-release-regressions.

## Problem And Scope

AppShell persists while Outlet changes. MediaCard uses client-side Link, but
there is no document scroll coordinator. Scrolled Gallery -> Post therefore
inherits an unrelated offset. ContextBackLink stores a URL but not entry identity.
No visual redesign or provider, publication, Character-link, Credit or API changes.

## Requirements

1. New pathname navigation, including Post A -> Post B, starts at document top.
2. Browser Back/Forward restores the saved position of that history entry.
3. ContextBackLink restores the originating entry position when captured, keeping
   its existing safe URL and actor checks. Legacy return states remain usable.
4. Hash destinations target their section; asynchronous target insertion is
   supported. Missing/malformed hashes fail safely. Existing feature-local
   explicit scroll actions remain intact.
5. Same-page filter/query changes, reactions and appended results do not force
   a top reset. Cross-page searches still start at top. Nested panel, sidebar and
   modal scroll are not managed by this document coordinator.
6. Restoration retries only while content is too short or an anchor is missing,
   using resize/mutation observation, coalesced animation frames and a 5-second
   deadline. Stop on wheel, touch, scroll-navigation key, pointer interaction,
   another route, actor change or unmount. Never pull a user back after cancellation.
7. Save only entry key, internal URL and finite x/y offsets in component memory,
   with at most 100 entries. Clear on actor switch/unmount. No persistent storage,
   network polling, user content or cross-actor restoration. Reload/session
   persistence and rebuilding unloaded infinite-list pages are deferred.

## Ordered Tasks

- [x] S1: Implement one RouteScrollManager under components/layout, mounted once
  by AppShell, retaining all sibling UI and routes.
- [x] S2: Extend lib/navigation/returnNavigation and ContextBackLink with optional
  originating entry identity. No replacement of normal links with unsafe history
  assumptions (direct entry and new tabs must still work).
- [x] S3: Focused tests for new routes, POP, query-only navigation, hash arrival,
  delayed height, interruption, actor isolation, safe returns and cleanup.
- [x] S4: Browser checks at 390/820/1440px with delayed content; screenshots,
  numeric scroll checks, no horizontal overflow or console errors.
- [x] S5: QA scoped review, type check and documentation evidence.

## Validation Plan

scripts/test-route-scroll.mjs owns unit, browser and explicit all groups. Unit
uses Vitest; browser uses Playwright with actual built AppShell/Gallery/Post pages
and fully intercepted API/assets. No requests reach a live application server;
no live data writes, paid generation or worker restart.
Browser prerequisite: current web/dist build (`node ../node_modules/vite/bin/vite.js
build` from web/). No server is required for the intercepted browser fixture.
Aggregate all is opt-in for UAT/pre-build. Screenshots go to OS temporary storage.
Actual Gallery async pagination not retained in query/cache can limit how far
Back can restore; on timeout leave the highest currently reachable position.

## Evidence

- 2026-09-08: `node scripts/test-route-scroll.mjs unit`: 22 tests passed,
  including existing ContextBackLink and AppShellRoutePolicy regressions.
- `node scripts/test-route-scroll.mjs browser`: actual built Gallery/Post passed
  new-post top, context return, Back/Forward, Post-to-Post, delayed Post response
  and initial async hash at 390/820/1440px. No horizontal overflow, page errors,
  engagement errors or requests escaping the intercepted fixture.
- Six screenshots in OS temp `route-scroll-ag3Sak`; Post first view visually
  reviewed across mobile/tablet/desktop. Header, image and established actions
  remain in their existing layouts; no styles or localization changed.
- TypeScript noEmit, scoped ESLint, scoped diff whitespace check and Vite build
  passed. Build retains the pre-existing large vendor chunk warning.
- QA performed sequentially, not independently. No live production/user data
  UAT or Safari/Firefox checks. Positions last only within the current mounted
  session; evicted entries or unloaded infinite-list pages may not fully restore.
- No backend restart needed. Refresh the application to load the updated bundle.
