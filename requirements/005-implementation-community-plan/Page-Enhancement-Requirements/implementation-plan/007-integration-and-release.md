# Step 07 - Integration, Verification And Release

Status: Planned

Depends on: Steps 01-06 complete

Owning requirements: `../006-content-data-and-mock-configuration.md`, `../007-responsive-accessibility-performance.md`, `../008-test-rollout-and-release-gates.md`

## 1. Purpose

ตรวจ cross-page consistency และ behavior ที่อาจไม่พังใน test รายหน้าแต่พังเมื่อ route, theme, localization หรือ shared CSS ทำงานร่วมกัน

## 2. Tasks

- `REL-01` Review all shared components for feature-specific branching or API ownership leaks
- `REL-02` Validate route registry/sidebar active states across four public routes and private Comparisons
- `REL-03` Validate English/Thai key parity and long-label fixtures
- `REL-04` Validate default, fashion and creative themes at 390px, 820px and 1440px
- `REL-05` Check keyboard-only navigation and visible focus across each route
- `REL-06` Check loading, empty, partial error and retry states
- `REL-07` Verify public snapshots contain no private prompt/reference/owner-only fields
- `REL-08` Verify Template Use, Character handoff, public comparison detail and private Comparison flows
- `REL-09` Compare route request count, payload and eager media load to baseline
- `REL-10` Add the scoped test runner only if it reduces execution friction
- `REL-11` Run the aggregate page-enhancement scope
- `REL-12` Review `git diff` for unrelated UI, route, runtime-data or formatting changes
- `REL-13` Record rollback points and all remaining Pending items

## 3. Focused Checks Before Aggregate

```text
node scripts/validate-i18n-catalogs.js
npm run typecheck --workspace web
npm run lint --workspace web
```

Run each page Playwright spec separately first. Run `--scope all` only after those pass.

## 4. Required Regression Evidence

- Community search/filter/pagination and post detail
- Community moderation, public ownership and share snapshot
- Template Use and owner edit
- Character public/owner visibility and handoff
- Public and private Comparison separation
- AppShell/sidebar and legacy redirects
- Actor-scoped Query state
- No eager third-party tutorial media

## 5. Rollback Verification

- No runtime data migration needs reversal
- New route components can be replaced with the prior route composition
- Shared stylesheet removal does not require data changes
- Additive schema fields, if any, remain optional for older clients
- Existing routes and domain services remain the fallback path

## 6. Release Gate

Release only when:

1. All page exit gates are complete
2. Aggregate tests, i18n, typecheck and lint pass
3. Responsive/theme screenshots are reviewed
4. No unsupported metric or dead CTA is present
5. Public/private ownership boundaries pass server tests
6. Performance differences are recorded
7. Pending features remain explicitly out of scope

If any gate fails, reopen only the owning step. Do not modify unrelated Generation, Credit, Studio or Cinematic code to make this release pass.
