# User Profile 002 - Profile Shell, Routing and Account Entry

**Status:** Implemented; validation pending  
**Depends on:** Canonical page contract

## 1. Business Requirement

Users must reach their profile through the account area. Public and owner views
must share one shell and support direct links, refresh, browser back and forward.

## 2. UX Contract

Replace the isolated `My Characters` header button with an account trigger:

```text
[Avatar/initials] Display Name
```

Development menu:

- View Profile
- My Library
- Credits
- Settings placeholder only if an existing route owns it
- Admin when role permits
- Switch Mock User remains development-only

Opening `View Profile` resolves the active handle and navigates to
`/creators/:handle`.

## 3. Reusable Page Shell

The shell owns:

- loading/error/not-found states
- profile hero mount
- tab navigation
- primary content mount
- supporting rail mount
- request cancellation/version guard
- route and actor-change lifecycle

It does not own:

- content card markup
- Follow domain logic
- engagement mutations
- Character or Template handoff
- profile persistence

## 4. Route Registry

Extend allowed routes for:

```text
^/creators/[^/]+$
^/creators/[^/]+/(gallery|characters|templates|comparisons|collections)$
```

All map to the Community application module. Unknown child paths return the
profile not-found state or redirect to the base profile route; they must not
silently open Studio.

## 5. Client Modules

Refactor the existing monolithic profile page without copying it:

```text
client/community/creatorProfileController.js
  route -> tab -> request -> page model lifecycle and stable page regions

client/community/creatorProfileTabs.js
  tab registry, route mapping and keyboard behavior

client/community/accountProfileMenu.js
  account trigger and owner-profile navigation
```

Reuse:

```text
client/community/communityCreatorApi.js
client/core/apiClient.js
client/shell/router.js
client/community/communityFeaturePolicy.js
```

Register scripts in dependency order in `client/index.html`.

## 6. State Contract

Profile page state is route-owned and ephemeral:

```text
activeHandle
activeTab
requestVersion
pageModel
loading
error
manageMode
```

Do not add it to Studio `window.state`. Do not persist another user's page
model in localStorage. On actor change:

1. abort or invalidate pending requests
2. clear owner-relative controls
3. when the previous route was the actor's own profile, resolve the new
   actor's canonical handle and replace the route while preserving the selected
   profile tab
4. when the route was another creator's public profile, keep that public route
   and reload only viewer-relative permissions

### React Runtime Contract

The canonical implementation now belongs to:

```text
web/src/features/profiles/routes/CreatorProfileRoute.tsx
web/src/features/profiles/api/profileApi.ts
web/src/lib/auth/ActorProvider.tsx
```

`ActorProvider` clears actor-scoped Query state. `CreatorProfileRoute` owns the
route decision because only that route knows whether the previous page was the
actor's own profile. It must not infer ownership from the URL or username:
ownership comes from the loaded profile DTO's `viewer.isOwner`.

During an own-profile actor transition, the route displays a loading state
until `/api/community/creator-profiles/me` resolves. The canonical handle
replaces the old handle in browser history so Back does not return to a stale
owner profile.

### Header Account and Mock Actor Controls

The React header renders two adjacent but independent controls:

1. `AccountMenu` owns profile entry for the active actor. Its avatar trigger
   resolves `/api/community/creator-profiles/me`, and `View Profile` navigates
   to `/creators/:activeHandle`.
2. `HeaderSelect` owns mock actor switching only. It must never double as the
   account/profile trigger.

The own-profile query key includes durable actor identity. An actor switch
clears the previous actor's locator before resolving the new handle. While the
locator is loading or unavailable, only the profile menu item is disabled; the
mock user switcher remains usable.

Canonical React ownership:

```text
web/src/components/layout/AccountMenu.tsx
web/src/components/layout/AppShell.tsx
web/src/lib/auth/creatorProfileLocator.ts
web/src/lib/api/queryKeys.ts
```

At responsive widths the actor select remains an independent visible control.
It must not use an invisible select overlay across the account avatar, because
that makes the profile action unreachable.

## 7. File-Level Implementation Plan

Modify:

```text
client/community/communityCreatorApi.js
client/community/communityMockUserSwitcher.js
client/shell/navigationRegistry.js
client/index.html
client/style.css
client/i18n/locales/en/community.json
client/i18n/locales/th/community.json
```

Create only the focused modules listed above. If implementation can keep the
controller and shell cohesive in fewer files without recreating a monolith,
prefer fewer files.

Implementation sequence:

1. Extend route parsing and tests.
2. Add the page API method and fixture.
3. Extract controller lifecycle from the current page.
4. Add shell and tab registry.
5. Replace the account entry after canonical own-profile navigation works.
6. Keep the old page facade until all script consumers are migrated.

## 8. Impact

- Navigation gains deep links but no new top-level application menu.
- Existing creator links remain valid.
- The account area becomes the single owner entry point.
- Studio state and persistence remain unchanged.
- Main risk is stale asynchronous data after route/actor change; the controller
  must guard every response.

## 9. Interaction Cases

- direct refresh on any profile tab
- owner opens own profile
- viewer opens another creator
- mock actor switches while profile is open
- mock actor switches while viewing another creator and remains on that creator
- deleted or renamed handle
- disabled Community feature
- API request resolves after navigation away
- tab has no items
- keyboard user changes tabs
- mobile user horizontally scrolls tabs

## 10. Tests

- route parser maps each child path to one tab
- account action resolves owner handle
- account menu and mock actor switcher expose separate interactive controls
- actor switch refreshes the account menu's canonical profile handle
- actor change invalidates stale page response
- unknown route does not expose content
- tab links work with browser history
- shell shows one authoritative loading/error state
- existing `/creators/:handle` links remain valid

## 11. Exit Criteria

- no floating `My Characters` action remains
- one reusable shell serves owner and public views
- routing works on direct server fallback URLs
- Step 003 can mount a hero without changing routing
