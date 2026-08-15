# UI-018 My Library And Profile Ownership Experience

**Status:** Implemented; updated My Characters route validation and manual actor review pending
**Depends on:** canonical resource and context routes

## 1. Purpose

Separate private work management from public creator identity while reusing the
same cards, viewers, actions and profile sections.

## 2. My Library

```text
Recent       all actor-owned generation history available to the customer
Collections  actor-owned organization and shareable collection management
My Characters actor-owned Character drafts, reviews, approvals and private/public settings
```

`Recent` is the full destination corresponding to the compact Recent
Generations surfaces in Studio and Playground. Both use shared item adapters
and action capability rules; compact and full layouts must not fork behavior.

Drafts and private work remain in Library and never appear on Profile until
published. Internal Pose Proxy and preparation artifacts remain hidden from
normal Recent results according to their artifact visibility policy.

## 3. Profile

One Profile route supports public visitor and owner mode:

```text
Overview
Works
Templates
Characters
Comparisons
Collections
```

Public visitors see only published/authorized resources. The owner sees the
same presentation plus permission-aware edit, feature, retire, unpublish and
management actions. Do not build separate public and management pages from
duplicated components.

Account menu:

```text
View My Profile
Credits
Settings
Admin when authorized
Sign out when real authentication is enabled
```

The mock actor switcher remains a development control and must not be confused
with the Profile trigger.

## 4. Ownership And Actor Switching

- `/me` resolves from the active actor context.
- Actor-scoped Query caches and drafts clear on actor change.
- A switched actor cannot keep owner actions for the previous Profile.
- Server authorization, not route shape or hidden UI, decides management
  access.
- Public Profile tabs use paginated server projections.

## 5. Acceptance Criteria

- Recent and compact generation surfaces expose consistent actions.
- My Characters is reachable from My Library without requiring a direct URL.
- Draft, review, approved and private Characters remain visible to their owner.
- Owner/private outputs never leak into public Profile tabs.
- Public and owner Profile reuse the same presentation components.
- Actor switching updates Profile identity, Library data and permissions
  immediately.
- Profile resource details return to the originating Profile tab.

## 6. Implementation Checkpoint

- `/library/recent`, `/library/collections` and `/me/characters` are the primary
  My Library destinations.
- Compact and full Recent continue using shared `GenerationLibrary` adapters,
  viewers and action capability rules.
- `/me` resolves the active actor and redirects to immutable Profile ID.
- The existing Profile route remains shared for visitor and owner; its canonical
  `works` URL maps to the existing Gallery server projection.
- My Characters is available under My Library. `/me/characters` lists all
  actor-owned lifecycle states and `/me/characters/:characterId` opens owner
  approval and management. The Profile Characters tab remains the public or
  presentation-oriented projection and must not replace owner management.
- Actor switching keeps the account trigger separate and re-resolves `/me`.

**Manual verify:** switch Alice/Bob while on `/me`, Recent and Collections;
confirm identity, data and owner actions change without a refresh. Confirm
private Recent outputs do not appear in another actor's Profile.

**Automated checkpoint (2026-08-03):** Recent and Collections passed canonical
and legacy direct-load checks on desktop/mobile. The gate identified and fixed
the missing semantic `<main>` owner on the full Recent route while preserving
the compact Studio component contract.

**My Characters checkpoint (2026-08-09):** The existing owner directory is now
registered at `/me/characters`, linked from My Library and kept active through
`/me/characters/:characterId`. Breadcrumbs identify this as private Library
management rather than the public Profile Characters projection. Updated route
tests, TypeScript validation and owner/private browser review remain pending.
