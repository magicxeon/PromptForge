# 007 Responsive, Accessibility And Performance Requirement

Status: Implemented and verified in scope (2026-09-06)

Owner: Shared React presentation and each consuming page

## 1. Responsive Contract

All four surfaces are designed and verified at representative viewport widths:

- Mobile: 390px
- Tablet: 820px
- Desktop: 1440px

Required behavior:

- No unintended horizontal page scroll
- Hero leaves a visible cue of the next section
- Toolbars wrap into logical rows without changing control meaning
- Cards keep stable media aspect ratio and command placement
- Long Thai and English labels wrap without clipping or overlap
- Desktop hover behavior always has a touch/keyboard equivalent
- Grid breakpoints are based on minimum viable card width rather than fixed item counts
- Sidebar/AppShell continues to follow its existing responsive contract

## 2. Accessibility Contract

- Use semantic headings in order, with one page `h1`
- Search inputs have persistent accessible labels
- Menus, segmented controls, toggles and icon buttons use the established primitives
- Icon-only controls have `aria-label` and tooltip text
- Focus is visible in all supported themes
- Tab order follows visual reading order
- Loading uses appropriate busy/status semantics without repeatedly announcing pagination
- Errors and empty states expose an actionable command
- Media has meaningful alt text or intentionally empty alt text when decorative
- Motion honors `prefers-reduced-motion`
- Text and interactive controls meet current project contrast targets

## 3. Theme Contract

- Verify default, fashion and creative themes
- Reuse tokens; no hard-coded page palette that works only on dark mode
- Avoid dominant monochrome blue/purple treatment
- Media overlays retain readable text without hiding the actual output
- Focus, selected, hover, disabled, warning and error states remain distinguishable without color alone

## 4. Performance Contract

Before optimization, record a reproducible baseline for each route:

- Initial request count
- Initial API payload bytes
- Number and approximate bytes of media requested before interaction
- Largest route bundle/chunk contribution where available
- Time to first stable content in local test conditions

Implementation rules:

- Reuse existing thumbnail URLs and lazy loading
- Do not preload all carousel/grid images
- Do not load YouTube iframe/player before user action
- Bound featured rails and first-page item counts
- Preserve cursor pagination; do not fetch the whole catalog for client filtering
- Do not create feature-local caches when TanStack Query already owns server state
- Query keys preserve actor identity and route filters
- Featured selectors are linear over the bounded current page, not over retained history
- Avoid retaining duplicated media objects in component state

## 5. Error And Async Behavior

- Each independent editorial/read section can fail without blanking the whole page
- Loading skeletons reserve final dimensions
- A route-level error must preserve AppShell and navigation
- Retrying one failed section must not reset successful filters/results
- Pagination failure keeps loaded content and exposes retry
- Empty content is distinct from request failure

## 6. Detailed Tasks

- `UX-01` Capture baseline screenshots and overflow observations before changes
- `UX-02` Define minimum widths/aspect ratios for each card type
- `UX-03` Verify shared controls by keyboard and screen-reader roles
- `UX-04` Add long Thai/English fixture content
- `UX-05` Validate default/fashion/creative themes at three viewports
- `PERF-01` Record request/media baseline per route
- `PERF-02` Apply native lazy loading and bounded rendering where needed
- `PERF-03` Verify no new polling, cache or eager third-party embed
- `PERF-04` Compare post-change request and media count to baseline

## 7. Acceptance Criteria

1. No overlap, clipping or page-level horizontal overflow appears at target widths
2. Every action is keyboard reachable and visibly focused
3. A long Thai title and a long provider/model label do not resize the card layout
4. Theme changes preserve all semantic states
5. Initial media requests are bounded and tutorials do not load third-party players
6. Post-change request count is documented; any regression has an approved reason
7. Existing navigation and route error boundaries remain operable

## 8. Verification Note

The final local gate passed all four routes at 390px, 820px and 1440px in default, fashion and creative themes. The Comparison route showed the largest declared initial transfer size at about 14.9 MB because some public slots do not provide thumbnails and the existing safe fallback is the original public image. This is recorded as a follow-up data/media contract risk rather than changing the public snapshot or storage pipeline in this UI delivery.
