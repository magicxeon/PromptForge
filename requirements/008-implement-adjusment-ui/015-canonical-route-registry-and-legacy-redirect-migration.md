# UI-015 Canonical Route Registry And Legacy Redirect Migration

**Status:** Implemented; automated route gate passed, manual review pending  
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

## 6. Implemented Redirect Matrix

| Legacy family | Canonical family | Mapping |
|---|---|---|
| `/home`, `/community` | `/` | query and hash preserved |
| `/community/:postId` | `/posts/:postId` | post ID preserved |
| `/community/characters` | `/explore/characters` | filters preserved |
| `/community/characters/:id` | `/characters/:id` | Character ID preserved |
| `/creators/:handle/:tab?` | `/profiles/:locator/:tab?` | handle remains a supported alias |
| `/creator/characters/:id?` | `/me/characters/:id?` | active actor resolves owner Profile |
| `/studio` | `/create/studio/face` or `/create/studio/character` | legacy `mode` converted to path |
| `/studio/scene`, `/create/scenes` | `/create/studio/scene` | handoff query/hash preserved |
| `/playground` | `/create/playground` | query/hash preserved |
| `/history`, `/recent-generations` | `/library/recent` | detail Job ID preserved |
| `/collections` | `/library/collections` | Collection ID preserved |
| `/compare` | `/explore/comparisons` | public discovery intent |

`LegacyRouteRedirect` replaces history and safely substitutes mounted route
parameters. `LegacyStudioRedirect` additionally translates the old Studio mode
query without losing reference handoff parameters.

## 7. Implementation Checkpoint

- Canonical constants and parameter builders live in
  `web/src/app/routeRegistry/routes.ts`.
- Canonical lazy routes and aliases live in `web/src/app/router.tsx`.
- Profile page lookup accepts immutable profile ID or legacy handle; `/me`
  redirects using the immutable ID.
- Public cards, Character cards, Generation lineage and Collections consume
  canonical builders.

**Manual verify:** paste every legacy URL above into a new browser tab, confirm
one replace redirect, then refresh the canonical destination. Repeat Studio
redirects with `referenceJobId`, query values and `#reference-images`.

**Automated checkpoint (2026-08-03):** canonical deep links and the redirect
matrix passed on desktop and mobile Chromium as part of UI-019.
