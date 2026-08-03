# UI-018 My Library And Profile Ownership Experience

**Status:** Pending UI-015 through UI-017  
**Depends on:** canonical resource and context routes

## 1. Purpose

Separate private work management from public creator identity while reusing the
same cards, viewers, actions and profile sections.

## 2. My Library

```text
Recent       all actor-owned generation history available to the customer
Collections  actor-owned organization and shareable collection management
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
- Owner/private outputs never leak into public Profile tabs.
- Public and owner Profile reuse the same presentation components.
- Actor switching updates Profile identity, Library data and permissions
  immediately.
- Profile resource details return to the originating Profile tab.

