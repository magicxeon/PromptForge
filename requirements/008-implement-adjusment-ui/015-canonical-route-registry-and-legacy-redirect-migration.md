# UI-015 Canonical Route Registry And Legacy Redirect Migration

**Status:** Pending UI-014 route inventory  
**Depends on:** `014-global-route-inventory-and-target-information-architecture.md`

## 1. Purpose

Move route ownership and navigation metadata to one canonical React registry
without breaking existing bookmarks, shared links, browser history or resource
IDs.

## 2. Contract

- `web/src/app/routeRegistry/` owns canonical paths, menu grouping, labels,
  icons, permissions and feature exposure.
- Route components consume route builders rather than duplicating parameterized
  string assembly.
- Old working URLs redirect to the canonical equivalent and preserve safe query
  parameters and resource IDs.
- Redirects replace browser history where the old URL is only an alias.
- Public resource links remain stable and do not depend on the active actor.
- Private and admin routes revalidate server ownership after navigation.
- Unknown resource IDs show a typed not-found state, not a redirect to Explore.

## 3. Required Migration Matrix

UI-014 supplies the exact current paths. At minimum the matrix must cover old
Community/Home, Studio modes, Playground, Fashion, History/My Images,
Collections, Comparisons, Character/Profile and Admin routes.

```text
old path -> canonical path -> redirect mode -> parameter mapping -> owner
```

Do not remove an old route until its internal consumers, tests and published
links have migrated or an explicit compatibility redirect exists.

## 4. Implementation Sequence

1. Add typed route builders and target menu metadata.
2. Mount canonical paths while retaining old aliases.
3. Migrate internal `Link`/navigation consumers capability by capability.
4. Add compatibility redirects and analytics reason codes.
5. Remove duplicate menu metadata only after all consumers use the registry.
6. Validate direct loading, refresh and browser Back/Forward.

## 5. Acceptance Criteria

- `/` mounts Explore/Gallery.
- Every old working deep link resolves to the same resource or a documented
  replacement.
- Navigation labels and paths are not hard-coded independently by features.
- Actor switching cannot retain a private route/query cache from another actor.
- Route-level code splitting and existing lazy boundaries remain functional.

