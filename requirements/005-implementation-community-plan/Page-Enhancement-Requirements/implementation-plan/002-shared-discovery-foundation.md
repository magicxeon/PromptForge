# Step 02 - Shared Discovery Foundation

Status: Complete (2026-09-06)

Depends on: `001-contract-freeze.md`

## 1. Purpose

สร้าง component กลางขนาดเล็กสำหรับ hero, toolbar, metadata, steps, tutorial placeholder และ pagination โดยยังไม่ย้าย business logic ออกจาก route owner

## 2. Proposed Files

New files, only when the responsibility is used by at least two pages:

```text
web/src/components/discovery/DiscoveryPageHero.tsx
web/src/components/discovery/DiscoveryToolbar.tsx
web/src/components/discovery/DiscoveryMetricRow.tsx
web/src/components/discovery/DiscoverySteps.tsx
web/src/components/discovery/EditorialTutorialRail.tsx
web/src/components/discovery/DiscoveryLoadMore.tsx
web/src/components/discovery/*.test.tsx
web/src/styles/community-discovery.css
```

Do not create empty barrel files or a folder for a component that remains single-use.

## 3. Tasks

- `FOUND-01` Define controlled prop contracts in TypeScript before JSX implementation
- `FOUND-02` Reuse `Button`, existing form primitives, Tooltip patterns and Lucide icons
- `FOUND-03` Implement toolbar layout with slots/options rather than resource-type switches
- `FOUND-04` Implement stable hero/media dimensions and no-media fallback
- `FOUND-05` Implement metadata rows that omit absent values
- `FOUND-06` Implement compact steps and tutorial rail from typed configuration
- `FOUND-07` Implement explicit Load More states if selected during contract freeze
- `FOUND-08` Add focus, keyboard, loading, disabled, long-label and empty-option tests
- `FOUND-09` Add shared token-based styles and verify three themes in a harness
- `FOUND-10` Search the new folder to prove no `apiClient`, Query hook, provider or repository dependency exists

## 4. Migration Rule

Do not migrate all existing pages in this step. Use a small test harness or the first Template consumer. Existing `CommunityHomeRoute` remains working until Step 06.

## 5. Focused Validation

```text
npm run test --workspace web -- DiscoveryPageHero DiscoveryToolbar
npm run test --workspace web -- DiscoveryMetricRow DiscoverySteps EditorialTutorialRail DiscoveryLoadMore
npm run typecheck --workspace web
```

Run typecheck after the component public contracts settle, not after every CSS edit.

## 6. Exit Gate

- Components are controlled and data-source agnostic
- All new user-visible strings are passed in or localized by established keys
- Unit tests cover interactive states
- Shared CSS works at 390px, 820px and 1440px without a page-level overflow
- Existing pages render unchanged until their own migration step
