# 001 Current System Inventory and Parity Baseline

**Status:** Required before React scaffold behavior work  
**Purpose:** Capture executable behavior from code and tests so migration does
not depend on incomplete historical requirements.

## 1. Business Requirement

Users must not lose a workflow, permission rule, generated asset, actor-scoped
draft or navigation path because it was absent from an older document.

Before replacing a route, the team must know:

- what the route does;
- which APIs and events it uses;
- which global state and persistence it reads;
- which permissions affect it;
- how loading, error and empty states behave;
- which tests and manual cases prove parity.

## 2. Required Inventory Artifacts

Create migration-owned machine-readable inventories under:

```text
requirements/009-migration-to-react/inventory/
  routes.md
  api-contracts.md
  client-globals.md
  persistence-and-events.md
  reusable-ui-map.md
  parity-matrix.md
```

These files are living implementation inputs. Update them when code changes
during migration.

## 3. Route Inventory

At minimum map:

```text
/community
/community/:postId
/community/characters
/community/characters/:characterId
/creators/:handle
/creators/:handle/:profileTab
/studio
/create/simple
/create/characters
/create/scenes
/create/fashion
/playground
/history
/comparisons
/comparisons/:setId
/admin
```

For each route record:

```text
route pattern
current runtime owner
page/controller modules
entry actions and outbound destinations
API calls
viewer roles/capabilities
URL query/state contract
actor-scoped persistence
cross-feature events
loading/empty/error states
responsive behavior
existing tests
known defects/deferred behavior
React migration phase
```

The inventory must be generated from `navigation.config.json`,
`navigationRegistry.js`, `createApp.js`, application shell code and feature
controllers. Do not use navigation labels alone as evidence that a page exists.

## 4. API Contract Inventory

Read every file under `server/app/routes/`. For each endpoint capture:

```text
method and path
request headers
path/query/body shape
actor and role requirements
success status and response shape
stable error codes
pagination contract
media response behavior
owning domain service
current client consumers
test coverage
```

React must consume the server response as delivered. It must not infer owner
permissions, provider capability or credit prices independently.

Where the current API response is ambiguous:

1. add a server contract test;
2. normalize the response without breaking the legacy consumer;
3. document the normalized contract;
4. then create the React Zod schema and TypeScript type.

## 5. Global State and Event Inventory

Map:

- `window.state`;
- every `window.ModelPromptForge*` export;
- loose global helper functions;
- DOM custom events;
- local/session storage keys;
- URL query state;
- hidden DOM fields used as state;
- script order dependencies in `client/index.html`.

Classify every item:

```text
server state       -> TanStack Query
route/filter state -> React Router URL/search params
form state         -> React Hook Form
bounded UI state   -> component state/reducer
workflow draft     -> feature store + actor-scoped persistence
derived state      -> selector, never separately persisted
compatibility only -> remove after owning route cutover
```

Do not copy `window.state` into one giant React context.

## 6. Reusable UI Inventory

Identify semantics, not only matching markup:

- application shell, navigation and breadcrumb;
- button, icon button, menu, tabs, select, dialog and toast;
- media card, image stage, viewer, gallery and pagination;
- creator identity, stats, profile sections and follow control;
- engagement bar, comments, sharing and report;
- comparison summary/mosaic/workspace;
- prompt editor, references, engine/model, credit estimate, action and results;
- visual option carousel/picker;
- loading, skeleton, empty, failure and unauthorized states.

For each item choose:

```text
reuse contract as-is
adapt data into a new shared React component
feature-specific React component
remove as obsolete
defer until owning route migration
```

## 7. Parity Matrix

Every customer workflow receives a stable ID:

```text
COMMUNITY_DISCOVER
COMMUNITY_POST_DETAIL
COMMUNITY_ENGAGE
CREATOR_PROFILE_VIEW
CHARACTER_CREATE
CHARACTER_SHARE
CHARACTER_HANDOFF
FREEFORM_GENERATE
COMPARISON_GENERATE
GUIDED_HEADSHOT
CHARACTER_SHEET
SCENE_AUTHOR_GUIDED
SCENE_AUTHOR_MANUAL
SCENE_TEMPLATE_REMIX
HISTORY_MANAGE
COLLECTION_MANAGE
ADMIN_SUPPORT
```

Each matrix row records:

```text
legacy evidence
React test
manual verification
permission cases
actor switch case
mobile case
cutover status
rollback status
```

## 8. File-Level Implementation Plan

Inspect, do not initially modify:

```text
client/index.html
client/app.js
client/style.css
client/shell/
client/core/
client/<feature>/
server/app/createApp.js
server/app/routes/
test/
```

Add only the inventory documents in this requirement during the baseline step.
Behavior changes belong to the requirement that owns the affected route.

## 9. Acceptance Criteria

- Every browser route and API has an owner.
- Every local persistence key has an actor-scope decision.
- Every global has a target replacement or removal phase.
- Every migration phase links to parity rows.
- Known requirement/code discrepancies are recorded.
- No React feature route starts before its parity baseline is approved.

