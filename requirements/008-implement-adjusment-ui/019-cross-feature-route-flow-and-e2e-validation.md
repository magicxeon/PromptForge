# UI-019 Cross-Feature Route Flow And E2E Validation

**Status:** Automated validation passed; final manual UX pass required  
**Depends on:** completed target navigation and route migration

## 1. Purpose

Validate the application as connected user journeys rather than isolated route
screens. This requirement closes navigation only after deep links, handoffs,
permissions and return behavior work across every feature.

## 2. Required Journeys

### Explore Template

```text
/ -> Templates -> Template detail -> Use Template
-> Playground or Fashion Studio -> Generate -> Recent -> Publish
-> Explore and Profile
```

### Explore Character

```text
/ -> Characters -> Character detail -> Use Character
-> choose an allowed destination -> Generate -> Recent
```

### Private generation

```text
Create -> Studio or Playground -> Generate
-> Recent detail -> Add to Collection / use as reference / publish
```

### Comparison

```text
Studio or Playground comparison mode -> generate Comparison
-> canonical Comparison detail -> publish
-> Explore Comparisons -> vote/comment/share
```

### Profile context

```text
Profile tab -> resource detail -> contextual Back -> same Profile tab/page
```

## 3. Automated Coverage

- every canonical route loads directly and after refresh;
- every compatibility redirect resolves without a loop;
- browser Back/Forward preserves meaningful filters and context;
- desktop Sidebar, collapsed rail and mobile drawer expose the same permitted
  destinations;
- actor switching invalidates private route data and owner controls;
- unauthorized and retired resources fail with typed states;
- Template and Character handoffs arrive at the correct destination with
  source lineage;
- old shared URLs remain usable;
- no internal link points to a route that is not mounted;
- route chunks load without making the first application bundle regress.

## 4. Manual UX Review

Test with a user unfamiliar with internal feature names. The user should be able
to answer without instruction:

1. Where do I find work from other people?
2. Where do I create a new image?
3. Where is my latest result?
4. Where do I organize saved work?
5. Where do other people see my published work?
6. How do I return to the list or Profile that opened this item?

## 5. Acceptance Criteria

- Explore, Create, My Library and Profile are understandable without product
  documentation.
- All required journeys complete without a dead end or unexplained destination
  switch.
- Current and legacy deep links are covered by tests.
- Breadcrumb, contextual Back and browser history agree on resource ownership.
- No duplicated route/menu registry remains in feature modules.

## 6. Validation Checkpoints

Automated checkpoint coverage in `web/e2e/react-routes.spec.ts` includes:

- canonical Explore, Create, Library, Comparison, Fashion and Account deep links;
- compatibility redirects for Community, Studio modes, Playground, History and
  Collections;
- desktop expanded/collapsed Studio navigation;
- mobile drawer parity;
- locale and actor switching smoke coverage;
- React runtime ownership, shared footer metadata and route refresh behavior.

Focused component tests cover route metadata, active Studio child state, public
post card paths, context-return actor validation and account menu behavior.

### Automated Result (2026-08-03)

- React unit/component suite: `37` files, `105` tests passed.
- Full route-flow E2E gate: `55` passed, `3` viewport-specific skips, `0`
  failed across desktop and mobile Chromium. This includes canonical and legacy
  routes, locale/actor controls, footer metadata, Studio visual options,
  Comparison focus and Studio mode synchronization.
- Creator Profile immutable-ID service regression: `3` passed.
- Frontend route ownership regression: `3` passed.
- TypeScript, localization validation and production build passed.
- ESLint passed with two existing Fast Refresh/dependency warnings and no
  errors.
- The automated gate found one missing `<main>` landmark on `/library/recent`;
  the route owner was corrected and its desktop/mobile regression rerun passed.

## 7. Manual Verification Sheet

Record `PASS`, `FAIL` or `BLOCKED` with a short remark:

| Journey | Result | Remark |
|---|---|---|
| Gallery -> Post -> creator Profile -> Back to Gallery filters | Pending | Manual product review required |
| Templates -> Template -> Use Template -> destination workflow | Pending | Manual generation handoff required |
| Characters -> Character -> allowed handoff -> destination | Pending | Manual permission review required |
| Studio/Playground -> Generate -> Recent -> Collection/Publish | Pending | Requires a billable/mock generation |
| Comparison generate -> private detail -> publish -> public vote | Pending | Requires a full Comparison run |
| Profile tab -> resource detail -> contextual Back to same tab | Pending | Manual browser-history review required |
| Actor switch on `/me`, Recent and Collections | Pending | Manual privacy/ownership review required |
| Legacy shared URLs and browser Back/Forward | Pending | Redirect E2E passed; history behavior remains manual |
| Desktop, collapsed rail and mobile drawer parity | Pending | Automated smoke passed; visual review remains manual |

Do not mark UI-019 complete until this sheet and the React validation batch pass.
