# UI-016 Navigation, Breadcrumb And Context Return Contract

**Status:** Pending UI-015 canonical route registry  
**Depends on:** `015-canonical-route-registry-and-legacy-redirect-migration.md`

## 1. Purpose

Users must understand where they are and return to the page that opened a
resource. Opening the same post from Profile, Explore or Recent must not always
send the user back to Community.

## 2. Three Navigation Layers

```text
Global Header -> account/global actions
Sidebar       -> Explore/Create/My Library destinations
Local context -> breadcrumbs, tabs and task steps
```

Breadcrumbs describe resource hierarchy. Context Back describes the actual
entry point. They are related but not interchangeable.

## 3. Context Return Policy

Priority:

```text
validated same-origin return context
-> meaningful browser history entry
-> canonical parent route
```

Examples:

- Profile -> Post -> Back returns to the same Profile tab.
- Explore Templates -> Template -> Back returns to the prior filtered Template
  list.
- Recent -> Generation -> Back returns to Recent with page/filter state.
- A directly loaded detail URL falls back to its canonical Explore or Library
  parent.

Return context must not accept an external URL or bypass authorization. Store
large filter state in URL search parameters; use navigation state only for
ephemeral safe context.

## 4. Interaction Requirements

- Sidebar parent/child active states derive from route metadata.
- Collapsed Sidebar preserves tooltips and active context.
- Studio parent expands its children; selecting the parent uses the documented
  Studio default without hiding the submenu contract.
- Breadcrumb labels load resource titles without layout shift.
- Tabs have stable deep links when their contents are independently useful.
- Mobile uses the same route/context model as desktop.

## 5. Acceptance Criteria

- Back behavior reflects the entry surface in Profile, Explore and Library.
- Direct links always have a deterministic fallback parent.
- Breadcrumbs never expose internal IDs as the only visible label after data
  loads.
- Browser Back/Forward does not corrupt accordion, filter or actor state.
- Context navigation is reusable and not reimplemented by each detail route.

