# 008 Focused Test, Rollout And Release Gates

Status: Proposed

Owner: QA Release review with Community, Profiles and Comparisons implementation owners

## 1. Test Strategy

Testing is split by component and page so normal implementation loops do not run the entire repository suite. The aggregate gate is run only after all page slices pass.

No page is considered complete from a screenshot alone. Each slice needs contract, interaction and visual evidence.

## 2. Focused Test Scopes

| Scope | Typical command | Purpose |
|---|---|---|
| Shared component | `npm run test --workspace web -- <test-file>` | Props, keyboard, states |
| Template page | `npm run test --workspace web -- TemplateDiscoveryCard CommunityHomeRoute` | Template route and card only |
| Character page | `npm run test --workspace web -- CharacterDiscoveryCard CharacterDirectoryRoute` | Character route and handoff presentation |
| Comparison page | `npm run test --workspace web -- PublicComparisonCard ComparisonThumbnailGrid` | Public slot rendering and private regression |
| Landing/feed | `npm run test --workspace web -- CommunityHomeRoute CommunityHero` | Root composition, filters and pagination |
| Schema | `npm run test --workspace web -- communitySchemas profileSchemas comparisonSchemas` | Zod boundaries |
| Server public policy | `node --test test/communityPublicSnapshot.test.js test/communityOwnershipPolicy.test.js` | Visibility and sanitization |
| Localization | `node scripts/validate-i18n-catalogs.js` | Locale parity |
| Type safety | `npm run typecheck --workspace web` | Final slice integration |

Commands are examples to be reconciled with actual test filenames created during implementation.

## 3. Visual Verification

Each page gets one focused Playwright file with 390px, 820px and 1440px projects or explicit viewport loops. Verify:

- First viewport hierarchy
- Toolbar wrapping
- Long content
- Loading, empty and error fixtures
- Fullscreen/media control reachability where relevant
- No overlap, clipping or unintended horizontal overflow
- Default, fashion and creative themes

Screenshots are evidence, not golden assets unless the repository adopts a stable screenshot baseline.

## 4. Optional Aggregate Script

Implementation may add `scripts/test-community-page-enhancements.js` as a thin command orchestrator. It must invoke canonical test commands and accept bounded scopes:

```text
node scripts/test-community-page-enhancements.js --scope shared
node scripts/test-community-page-enhancements.js --scope templates
node scripts/test-community-page-enhancements.js --scope characters
node scripts/test-community-page-enhancements.js --scope comparisons
node scripts/test-community-page-enhancements.js --scope landing
node scripts/test-community-page-enhancements.js --scope all
```

The script must fail fast for a focused scope, stream the underlying command result and return a non-zero exit code on failure. It must not duplicate assertions in JavaScript.

## 5. Per-Step Gates

### Gate A - Contract Freeze

- Route matrix asserted
- Existing behavior tests green
- No unsupported mock metric approved for live UI

### Gate B - Shared Foundation

- Shared component unit tests green
- No API/provider imports in shared discovery components
- Keyboard and long-label states verified

### Gate C - Page Slice

- Page-specific tests green
- Adjacent existing behavior tests green
- Three viewport screenshots reviewed
- Requirement checklist updated before moving to the next page

### Gate D - Integration

- i18n parity and typecheck green
- Public snapshot and ownership tests green
- Route registry/sidebar active states green
- Performance comparison recorded

### Gate E - Release

- Aggregate scope green
- No unintended runtime data migration
- Rollback instructions verified
- Pending items remain absent or explicitly disabled

## 6. Rollout And Rollback

- Deliver page slices behind the existing Community exposure policy when available; do not create a second feature-policy owner
- Do not require data migration for the first delivery
- Preserve old route composition until the replacement slice passes its focused tests
- Rollback is component/route composition reversal, not deletion of user data
- Shared components are removed only after all consumers are returned to their prior presentation
- Any server response extension must be additive and backward compatible

## 7. Regression Matrix

The final gate must protect:

- AppShell and sidebar navigation
- Legacy `/home`, `/community` and `/compare` redirects
- Community feed search/filter/pagination
- Community detail, share, moderation and engagement
- Template Use and owner edit behavior
- Character public/owner profiles and handoffs
- Private Comparison list/detail/workspace
- Actor-scoped Query cache behavior
- Localization and theme switching

## 8. Acceptance Criteria

1. Every implementation step has a focused command that finishes without running unrelated suites
2. The aggregate script is optional during iteration and mandatory only at integration/release gate
3. Failures name the page/component scope rather than returning one opaque result
4. Manual responsive checks are recorded for all target viewports
5. Existing protected workflows are included in adjacent regression checks
6. A page can be rolled back without modifying user runtime data
