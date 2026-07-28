# React Frontend Migration Master Roadmap

**Status:** Implemented; final validation pending
**Scope:** Complete replacement of the browser-native Vanilla JavaScript client  
**Target:** React + TypeScript + Vite SPA, backed by the existing server contracts  
**Strategy:** New frontend application in the same repository with route-by-route cutover

## 1. Business Outcome

ModelPromptForge must move to a frontend platform that can support Community,
Creator Profiles, reusable Characters, Fashion Blueprint, generation tools and
commercial workflows without continuing to grow one HTML document, one global
stylesheet and a large graph of ordered browser scripts.

## Implementation Result

- `web/` is the only browser route runtime.
- Express serves the production Vite build for every registered browser route.
- Community, Profiles, Character, Library, Collections, Comparisons, Credits,
  Admin, Playground, Studio, Scene Builder, and Fashion Blueprint are
  route-level lazy-loaded React features.
- Shared generation, reference, engine, result, comparison, media, engagement,
  Character, and collection controls are reusable React components.
- Fashion Blueprint uses actor-owned uploads, locked quotes, aggregate atomic
  credit reservations, idempotent bulk runs, and grouped results.
- `client/i18n`, assets, and outputs remain retained server-served data
  boundaries. Legacy browser source is no longer a runtime owner and remains
  only until the post-validation deletion gate.
- `scripts/validate-react-migration.bat` is the single Windows validation gate.

The migration must:

1. preserve all working customer behavior;
2. make UI behavior reusable across routes;
3. reduce accidental coupling through `window` globals and DOM IDs;
4. give feature teams typed state and API boundaries;
5. support responsive, accessible and localized UI consistently;
6. keep the current Express/domain/repository/provider backend;
7. remain compatible with the future Firebase Hosting + Cloud Run architecture;
8. finish by retiring the legacy Vanilla runtime, not by maintaining two clients.

## 2. Architecture Decision

Use a **clean React rewrite inside the current repository**:

```text
ModelPromptForge/
  client/                 current legacy client during migration
  web/                    new React application
  server/                 shared API and business logic
  test/                   current server/domain/contract tests
  requirements/           shared product and implementation contracts
```

This is not:

- a clone of the entire project;
- React mounted inside arbitrary legacy DOM sections;
- a permanent micro-frontend architecture;
- a rewrite of server business logic;
- a second generation, credit, ownership or provider implementation.

React and Vanilla may coexist only at the **route ownership boundary**. One
runtime owns a route and its DOM at a time.

## 3. Sources of Truth

Implementation agents must use this priority:

1. current executable server and client code;
2. current automated tests and fixtures;
3. `requirements/099-technical-dept/000-master.md`;
4. the requirement that owns the feature;
5. older roadmap text.

When code and an older requirement differ:

- verify the behavior in code and tests;
- record the discrepancy in the migration inventory;
- preserve the current intentional behavior;
- update stale requirement paths or assumptions in the same task.

The migration must not silently revive deleted behavior or stale file paths.

## 4. Current-System Assessment

The current client has:

- one static `client/index.html` application shell;
- one large global `client/style.css`;
- ordered script loading for infrastructure and feature modules;
- `window.state` as Studio compatibility state;
- feature globals such as `window.ModelPromptForgeSceneBuilder`;
- actor-scoped browser persistence and mock identity;
- shared generation controls used by Studio and Playground;
- API-backed Community, Character, Comparison, Credit and Admin features;
- substantial Node contract/domain test coverage but limited browser component coverage.

The server is already organized around:

```text
server/app/routes/
server/domain/<capability>/
server/repositories/<capability>/
server/providers/
server/config/
```

That server architecture is retained. Migration work may add transport schemas
or endpoints only when a React route cannot consume a stable existing contract.

## 5. Target Technology Baseline

Resolve and lock mutually compatible current stable versions during scaffold:

### Runtime

- React
- React DOM
- TypeScript with strict mode
- Vite
- React Router using data-router APIs
- TanStack Query for server state
- i18next + react-i18next
- Zod for runtime transport validation
- React Hook Form for forms

### UI

- Tailwind CSS through the official Vite integration
- CSS custom properties for brand/design tokens
- Radix UI primitives for accessible behavior
- Lucide React for icons
- `class-variance-authority`, `clsx` and `tailwind-merge` for controlled variants

### Testing and Quality

- Vitest
- React Testing Library
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- MSW for API-bound component/integration tests
- Playwright for desktop/mobile E2E and visual checks
- ESLint with TypeScript and React rules
- Prettier only for the new React workspace

Do not introduce Redux by default. Use:

- TanStack Query for server-owned data;
- URL state for navigation/filter state that should be shareable;
- React Hook Form for forms;
- local reducers for bounded workflows;
- Zustand only when a complex cross-component editor state demonstrably needs it.

## 6. Target Client Structure

```text
web/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    app/
      App.tsx
      router.tsx
      providers/
      routeRegistry/
    components/
      ui/
      layout/
      media/
      community/
      profile/
      generation/
    features/
      community/
      creator-profiles/
      character-profiles/
      fashion-blueprint/
      history/
      collections/
      comparisons/
      playground/
      studio/
      scene-builder/
      admin/
    lib/
      api/
      auth/
      i18n/
      persistence/
      permissions/
      telemetry/
    styles/
      tokens.css
      globals.css
    test/
      fixtures/
      msw/
      render.tsx
```

Feature folders own orchestration and domain-specific presentation. Reusable
visual behavior belongs in `components/`. Generic infrastructure belongs in
`lib/`. A feature must not create a second copy of a shared card, dialog,
generation control, engagement action or profile section.

## 7. Migration Sequence

| Step | Requirement | Deliverable |
|---|---|---|
| 001 | Current inventory and parity baseline | Behavior, route, API, state and test map |
| 002 | Workspace, toolchain and coexistence | Buildable React app and route ownership switch |
| 003 | Design system and reusable UI | Tokens, primitives, accessibility and UX rules |
| 004 | Platform services | Router, API, identity, i18n, permissions and persistence |
| 005 | Community and public media | Home, feed, post detail, engagement and sharing |
| 006 | Creator and Character Profiles | Public/owner profiles, Characters and handoffs |
| 007 | Fashion Blueprint | First new React-only commercial workflow |
| 008 | Library, Comparison and Admin | History, Collections, Comparison and operations |
| 009 | Playground and generation platform | Prompt, references, engine, credit and results |
| 010 | Studio and Character Builder | Guided visual authoring and attribute controls |
| 011 | Scene Builder and template workflows | Guided/manual scenes, variables and handoffs |
| 012 | Quality, cutover and decommission | Security, performance, final switch and legacy removal |

Steps 001-004 are mandatory foundation gates. Feature steps may overlap only
when they consume released foundation APIs and do not edit the same legacy
owner simultaneously.

### 7.1 Complexity and Safe Parallel Work

| Workstream | Relative complexity | Safe parallel work |
|---|---:|---|
| 001 inventory | Medium | server contract tests and UX inventory |
| 002-004 foundation | High | tokens/components after toolchain is stable |
| 005 Community | High | public API normalization |
| 006 Profiles/Characters | High | Character server contracts |
| 007 Fashion | Very high | Fashion server domain/repositories |
| 008 Library/Admin | Medium | independent route slices |
| 009 Generation | Very high | pure API/reference/credit contract tests |
| 010 Studio | Very high | pure attribute/prompt extraction |
| 011 Scene | Very high | pure template fixture migration |
| 012 cutover | High | documentation and deployment preparation |

Recommended active lanes:

```text
Lane A: React platform/design system
Lane B: server contract normalization and tests
Lane C: one customer-facing route vertical slice
Lane D: QA fixtures and Playwright evidence
```

Do not run two agents against the same state owner or shared component API
without an agreed contract first.

## 8. Route Cutover Strategy

Historical migration strategy:

- Vite dev server serves React locally and proxies `/api` to Express;
- Express remains the API and legacy-client host;
- a server-owned route manifest identifies each customer route as `legacy` or
  `react`;
- production/local integrated mode sends the React `index.html` only for React-owned routes;
- legacy routes continue receiving `client/index.html`;
- internal links may perform a full document transition across runtime
  boundaries during migration;
- navigation becomes fully client-side again after all customer routes are React-owned.

Do not make both routers observe the same route in one document.

Current implementation state:

- every registered browser route is React-owned;
- Express serves only the React index for those routes;
- React Router owns internal navigation and direct links;
- only retained assets, localization catalogs and generated/uploaded media are
  served from the former client/runtime data tree;
- a missing React production build fails visibly and never falls back to the
  legacy client.

Each route cutover requires:

1. current behavior inventory;
2. API and permission parity;
3. loading, empty, error and unauthorized states;
4. actor-switch behavior;
5. direct-link/back/forward tests;
6. desktop and mobile visual validation;
7. a route-level rollback switch.

## 9. Cross-Cutting Contracts

### Identity

- React API calls attach the active actor through one API client.
- Query keys and persisted drafts are actor-scoped.
- Actor change cancels old requests and clears owner-sensitive cache.
- Server authorization continues to use `req.actorContext`.

### Generation and Credits

- React never calls providers.
- Credit estimates and submitted parameters must match.
- Comparison totals include only enabled slots.
- References obey provider capabilities and ownership rules.
- Large Base64 images must not enter durable client snapshots.

### Localization

- Existing locale catalogs remain the semantic source during migration.
- React uses `react-i18next`.
- New visible strings require locale parity.
- Catalog migration must not change prompt text or user-authored data.

### Permissions

- Server projections return viewer capabilities.
- Components accept capability/permission props to control presentation.
- Hiding a button is not authorization; the server revalidates every mutation.

## 10. Parallel-Development Rules

While migration is active:

- fix production defects in the currently owning runtime;
- implement a new feature in React when its route is scheduled for React before release;
- do not add a new legacy shared component that React will immediately replace;
- do not pause backend/commercial work that is independent of frontend runtime;
- keep commits small and route-scoped;
- use feature flags and route ownership for incomplete React work;
- do not keep a long-lived divergent clone or migration branch.

## 11. Overall Exit Criteria

Migration is complete only when:

1. every supported customer and admin route is React-owned;
2. all feature parity and E2E gates pass;
3. server business behavior remains canonical and unchanged unless explicitly versioned;
4. actor, ownership, credit, generation and reference security tests pass;
5. enabled locales have catalog parity;
6. production build supports Firebase Hosting SPA rewrites and Cloud Run API configuration;
7. no runtime feature depends on `window.state` or `window.ModelPromptForge*`;
8. legacy HTML/script loading and global stylesheet are removed;
9. source-controlled visual assets have a documented final owner;
10. rollback artifacts are retained only for the agreed observation window.

## 12. Non-Goals

- Rewriting Express/domain/repository/provider code into TypeScript in this phase
- Migrating JSON persistence to PostgreSQL as part of frontend conversion
- Adding new marketplace/payment behavior merely to prove React
- Redesigning every workflow without product approval
- Maintaining React and Vanilla as permanent independent products
