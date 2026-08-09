# UI-014 Global Route Inventory And Target Information Architecture

**Status:** Implemented; validation checkpoint recorded below  
**Depends on:** `001-reference-momelo-navigation-redesign-spec.md`  
**Required reading:** `../Knowledge/ui-design-system-and-visual-language.md`

## 1. Purpose

Momelo currently has working routes added by Community, Studio, Profile,
Template, Comparison, History, Collection and Fashion features at different
times. The application must present those capabilities through one predictable
mental model before more commercial routes are added.

This requirement owns the complete React route inventory and the target
information architecture. It does not move routes or change UI behavior; those
changes are sequenced in UI-015 through UI-019.

Do not infer the current route map from old requirements. Read the current React
router, route registry, navigation metadata, redirects, route-level links and
E2E tests.

## 2. Approved Product Model

```text
Explore     Find public work and reusable resources
Create      Start or continue an authoring workflow
My Library  Inspect and organize private actor-owned work
My Profile  Present published identity and manage it when owner
```

The root route `/` is Explore and renders the public Gallery. There is no
separate Home page and no duplicate Community landing route.

### 2.1 Primary menu

```text
Explore
  Gallery
  Comparisons
  Templates
  Characters

Create
  Playground
  Studio
    Face Creator
    Character Sheet
    Scene Builder
  Fashion Studio

My Library
  Recent
  Collections

Account
  My Profile
  Credits
  Settings
  Admin when authorized
```

Decisions:

- `Fashion Studio` is a direct Create destination because it is the featured
  beginner workflow, not another Studio configurator mode.
- `Comparisons` under Explore means published Comparison discovery and voting.
  Creating a Comparison begins from Playground or Studio comparison mode.
- Public Collections are discoverable from Gallery and Profile; they do not add
  another primary Explore menu item for MVP.
- `Recent` replaces the customer-facing name `My Images` while retaining the
  complete generation history capability.
- Use the correct product label `Characters`; do not introduce `Charactor` in
  routes, keys or visible copy.

## 3. Target Route Families

The audit may refine parameter names, but the target ownership is:

```text
Explore
  /
  /explore/comparisons
  /explore/templates
  /explore/characters

Create
  /create/playground
  /create/studio/face
  /create/studio/character
  /create/studio/scene
  /create/fashion

My Library
  /library/recent
  /library/recent/:generationId
  /library/collections
  /library/collections/:collectionId
  /me/characters
  /me/characters/:characterId

Public resources
  /posts/:postId
  /templates/:templateId
  /characters/:characterId
  /comparisons/:comparisonId

Profile
  /me
  /profiles/:profileId
  /profiles/:profileId/works
  /profiles/:profileId/templates
  /profiles/:profileId/characters
  /profiles/:profileId/comparisons
  /profiles/:profileId/collections
```

`/me` resolves the active actor and redirects to the stable owner Profile route.
Profile identity uses an immutable ID as the canonical key. A mutable public
handle may be an alias later, but must not become authorization or durable
ownership identity.

## 4. Target Navigation Diagram

```mermaid
flowchart TD
    ROOT["/ Explore Gallery"]

    ROOT --> EXC["Explore Comparisons"]
    ROOT --> EXT["Explore Templates"]
    ROOT --> EXH["Explore Characters"]
    ROOT --> POST["Public Post Detail"]

    CREATE["Create"] --> PLAY["Playground"]
    CREATE --> STUDIO["Studio"]
    CREATE --> FASHION["Fashion Studio"]
    STUDIO --> FACE["Face Creator"]
    STUDIO --> CHARACTER["Character Sheet"]
    STUDIO --> SCENE["Scene Builder"]

    LIBRARY["My Library"] --> RECENT["Recent"]
    LIBRARY --> COLLECTIONS["Collections"]
    RECENT --> DETAIL["Generation Detail"]

    ACCOUNT["Account"] --> PROFILE["My Profile"]
    ACCOUNT --> CREDITS["Credits"]
    ACCOUNT --> SETTINGS["Settings"]

    EXT --> TEMPLATE_DETAIL["Template Detail"]
    EXH --> CHARACTER_DETAIL["Character Detail"]
    EXC --> COMPARISON_DETAIL["Comparison Detail"]

    TEMPLATE_DETAIL --> PLAY
    TEMPLATE_DETAIL --> FASHION
    CHARACTER_DETAIL --> CHARACTER
    CHARACTER_DETAIL --> SCENE
    CHARACTER_DETAIL --> PLAY
    CHARACTER_DETAIL --> FASHION

    DETAIL --> COLLECTIONS
    DETAIL --> POST
    POST --> PROFILE
    TEMPLATE_DETAIL --> PROFILE
    CHARACTER_DETAIL --> PROFILE
    COMPARISON_DETAIL --> PROFILE
```

## 5. Required Current-State Inventory

Before implementation, produce a table with one row for every mounted React
route and redirect:

```text
current path
route owner/component
navigation source
actor/public/admin scope
resource type
incoming links
outgoing actions
current back behavior
target canonical path
redirect required
known inconsistency
```

Also search for hard-coded route strings outside the route registry. Classify
each as canonical link, contextual link, redirect, test fixture or stale path.

The inventory must include lazy routes, parameterized detail routes, fallback
routes, index routes, admin routes and routes reachable only from dialogs.

## 6. Flow Ownership

### 6.1 Public discovery

```text
Explore list
-> public detail
-> creator Profile or reusable action
-> destination authoring workflow
```

### 6.2 Private creation

```text
Create workflow
-> quote/generate
-> Recent
-> inspect/use/collect
-> optionally publish
-> Explore and Profile
```

### 6.3 Reuse

```text
Template or Character detail
-> validate permission and compatibility
-> choose or infer destination
-> create an actor-owned handoff
-> destination workflow
-> generated output with source lineage
```

### 6.4 Profile

```text
Public visitor -> published content and follow/share actions
Owner -> same presentation plus permission-aware management actions
Private drafts/history -> My Library, never leaked into Profile
```

## 7. Deliverables

1. Current React Route Mermaid diagram generated from inspected code.
2. Current route inventory table.
3. Target route Mermaid diagram updated with confirmed current resource IDs.
4. Current-to-target redirect matrix.
5. List of mismatched links, back behavior and duplicated route ownership.
6. Confirmed implementation order for UI-015 through UI-019.

## 8. Acceptance Criteria

- Every mounted React route and redirect appears in the inventory.
- `/` is the only canonical Explore/Gallery root.
- Public discovery, private work, creation and Profile have distinct ownership.
- No feature requires a user to understand internal names such as generation
  mode, template use session or comparison set.
- The target map preserves all working capabilities through canonical routes or
  explicit redirects.
- No source file is modified as part of the inventory-only step.

## 9. Baseline Route Inventory (Captured Before UI-015)

| Previous path | Owner | Scope | Previous parent/back | Canonical path |
|---|---|---|---|---|
| `/` | Router redirect | public | `/community` | `/` |
| `/home` | Router redirect | public | `/community` | `/` |
| `/community` | `CommunityHomeRoute` | public | root | `/` |
| `/community/:postId` | `CommunityPostRoute` | public | Community | `/posts/:postId` |
| `/community/characters` | `CharacterDirectoryRoute` | public | Community | `/explore/characters` |
| `/community/characters/:characterId` | `CharacterProfileRoute` | public | Character directory | `/characters/:characterId` |
| `/creators/:handle/:profileTab?` | `CreatorProfileRoute` | public/owner | Community | `/profiles/:profileId/:profileTab?` |
| `/creator/characters` | `CharacterOwnerDirectoryRoute` | owner | Library | `/me/characters` |
| `/creator/characters/:characterId` | `CharacterOwnerProfileRoute` | owner | My Characters | `/me/characters/:characterId` |
| `/studio` | `StudioRoute` | owner | Create | `/create/studio/face` |
| `/studio?mode=character-sheet` | `StudioRoute` | owner | Create | `/create/studio/character` |
| `/studio/scene` | `SceneBuilderRoute` | owner | Create | `/create/studio/scene` |
| `/create/simple` | redirect | owner | Create | `/create/studio/face` |
| `/create/characters` | redirect | owner | Create | `/create/studio/character` |
| `/create/scenes` | `SceneBuilderRoute` alias | owner | Create | `/create/studio/scene` |
| `/playground` | `PlaygroundRoute` | owner | Create | `/create/playground` |
| `/create/playground` | redirect | owner | Create | `/create/playground` |
| `/create/fashion` | `FashionBlueprintRoute` | owner | Create | unchanged |
| `/recent-generations` | `HistoryRoute` | owner | Library | `/library/recent` |
| `/recent-generations/:jobId` | `HistoryDetailRoute` | owner | Recent | `/library/recent/:jobId` |
| `/history` | redirect | owner | Library | `/library/recent` |
| `/history/:jobId` | `HistoryDetailRoute` alias | owner | Recent | `/library/recent/:jobId` |
| `/library` | redirect | owner | Library | `/library/recent` |
| `/library/images` | redirect | owner | Library | `/library/recent` |
| `/collections` | `CollectionsRoute` | owner | Library | `/library/collections` |
| `/collections/:collectionId` | `CollectionDetailRoute` | owner | Collections | `/library/collections/:collectionId` |
| `/comparisons` | `ComparisonsRoute` | owner | implicit Create/Library | unchanged private index |
| `/comparisons/:setId` | `ComparisonDetailRoute` | owner/share action | Comparisons | unchanged private workspace |
| `/compare` | redirect | owner | Comparisons | `/explore/comparisons` |
| `/credits` | `CreditsRoute` | owner | Account | unchanged |
| `/admin` | `AdminRoute` | admin/support | Operations | unchanged |
| `*` | `NotFoundRoute` | all | Explore fallback | unchanged |

Template and published Comparison details are Community post snapshots, so
their canonical public detail is `/posts/:postId`. Private Comparison sets keep
`/comparisons/:setId`; this prevents a public vote route from exposing an
actor-owned draft set.

## 10. Baseline Flow Diagram

```mermaid
flowchart LR
  C[Community / Home] --> P[Community Post]
  C --> CH[Community Characters]
  P --> CP[Creator Profile]
  S[Studio] --> H[Recent Generations]
  PL[Playground] --> H
  F[Fashion Studio] --> H
  H --> HD[Generation Detail]
  HD --> COL[Collections]
  S --> CMP[Private Comparisons]
  PL --> CMP
```

## 11. Audit Findings And Checkpoint

- Root, Home and Community duplicated the same discovery ownership.
- Compare AI appeared under Create although public comparison discovery and
  private comparison authoring are different intents.
- My Characters duplicated owner management already available from Profile.
- Profile paths used mutable handles while repository records already expose an
  immutable profile ID.
- Feature modules assembled Community, History, Collection and Studio URLs
  independently from the sidebar registry.
- Back behavior already had an actor-safe return-state primitive, but fallback
  parents still used previous route families.

**Checkpoint UI-014:** inventory complete; target ownership confirmed for
UI-015 through UI-019.

**Manual verify:** compare this inventory with `web/src/app/router.tsx` after
every route addition. Any new mounted route must declare owner, scope, canonical
parent and compatibility policy here or in the succeeding migration matrix.
