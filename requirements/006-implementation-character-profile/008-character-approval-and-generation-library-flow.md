# Character Approval and Generation Library Flow

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented; automated validation passed, browser validation pending

## 1. Problem

Character Profile creation was exposed only from the compact Recent Generations
area in Studio. The full `My Images` route used different cards and actions, and
new private Character drafts were incorrectly opened through the public
Community route. This caused three connected failures:

1. users could not create or continue a Character Profile from the full image
   library;
2. `/community/characters/:id` attempted to resolve a draft as an approved
   public Character and returned `character_profile_version_not_found`;
3. owner-only Character media was requested as ordinary public image content,
   so mock actor identity was not reliably attached and the review image could
   render as a black/unavailable area.

## 2. Product Contract

### 2.1 One Generation Library

`Recent Generations` is the customer-facing name for generated image history.
The same feature component owns both presentations:

```text
compact
- embedded in Studio
- limited recent items
- View all entry
- no route-level pagination controls

full
- canonical Recent Generations route
- actor-scoped cursor pagination
- collection filtering
- the same Generation Reference viewer and actions as compact mode
```

The full and compact variants must not maintain separate action lists. Opening
an item uses the shared `GenerationImageViewer`; the available actions are
derived from generation mode, ownership and capability:

- Headshot: use as Face Reference and choose Character Sheet, Scene Builder or
  Playground destination.
- Character Sheet: Create Character Profile and Build a Scene.
- Every compatible result: collections, sharing and download.
- Full owner library: delete with confirmation.

`/history` remains a compatibility alias. Navigation and `View all` use
`/recent-generations`.

### 2.2 Owner and Public Character Routes

Private lifecycle management and public discovery are different surfaces:

```text
/creator/characters
  owner Character library, including draft/review/approved/archived records

/creator/characters/:characterId
  owner review, approval, metadata, sharing and reuse management

/community/characters
  approved Community Character discovery only

/community/characters/:characterId
  approved public Character detail only
```

Creating a Character Profile navigates to the owner detail route. A private
draft never falls through to the public API. Owner breadcrumbs return to the
actor's Character library or the actor-safe originating Recent Generations
route. Public pages continue to return to Community.

### 2.3 Character Profile Flow

```text
successful Character Sheet generation
  -> open Generation Reference
  -> Create Character Profile
  -> enter name, description, personality and intended uses
  -> create idempotent private profile/version
  -> /creator/characters/:id
  -> inspect canonical Character image
  -> approve current version
  -> configure visibility and reuse policy
  -> public projection only when approved and explicitly shared
```

`Build a Scene` remains a direct generation handoff and closes the viewer before
navigation. Repeating profile creation for the same generation and idempotency
key must return the existing profile instead of creating a duplicate.

## 3. Private Media Contract

Owner media uses an authenticated API boundary:

```text
GET /api/character-profiles/:id/media/image
GET /api/character-profiles/:id/media/thumbnail
GET /api/character-profiles/:id/media/face
```

The server validates `req.actorContext` and owner access before resolving the
canonical generation result. React loads private media through a shared
authenticated media component which:

- sends the active actor header through the canonical API client boundary;
- converts the response Blob to an object URL;
- shows loading/error fallback states;
- revokes object URLs when the source or component changes.

Public Community media remains on the sanitized public endpoints. Do not make a
draft image public merely to make an `<img>` element work.

## 4. Data and State Rules

- Generation queries and Character queries include active actor identity.
- Actor switching clears open viewers and owner-scoped data.
- Cursor pagination remains server-owned; full mode appends pages without
  duplicating records.
- Return-navigation state is accepted only for the same active actor.
- Character status is visible in the owner directory.
- Approval never implies public sharing; sharing never bypasses approval.
- Public works are queried only on the public Character surface.

## 5. Canonical Implementation Ownership

```text
web/src/features/history/components/GenerationLibrary.tsx
web/src/features/history/routes/HistoryRoute.tsx
web/src/features/profiles/routes/CharacterOwnerDirectoryRoute.tsx
web/src/features/profiles/routes/CharacterProfileRoute.tsx
web/src/components/media/AuthenticatedMediaImage.tsx
web/src/components/media/GenerationImageViewer.tsx
web/src/app/router.tsx
server/app/routes/characterProfileRoutes.js
server/domain/character-profiles/CharacterProfileService.js
```

No runtime JSON path changes are introduced.

## 6. Acceptance Criteria

1. Studio compact Recent Generations and the full route open the same viewer and
   expose the same mode-appropriate Character/Scene actions.
2. `View all` opens `/recent-generations`; `/history` still works.
3. The full route supports actor-scoped cursor pagination and collection
   filtering.
4. Creating a Character Profile from either library variant opens
   `/creator/characters/:id` without requesting a public approved version.
5. Owner Character media renders before approval and never leaks to a second
   actor.
6. `/community/characters/:id` remains public-only.
7. Owner back navigation never says or targets Community for a private draft.
8. Actor switching cannot retain another actor's open generation or Character
   media.
