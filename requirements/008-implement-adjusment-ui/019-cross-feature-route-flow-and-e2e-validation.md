# UI-019 Cross-Feature Route Flow And E2E Validation

**Status:** Final gate after UI-014 through UI-018  
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
