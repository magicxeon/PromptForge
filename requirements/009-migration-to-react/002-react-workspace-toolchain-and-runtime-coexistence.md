# 002 React Workspace, Toolchain and Runtime Coexistence

**Status:** Foundation gate  
**Depends on:** 001 inventory baseline

## 1. Business Requirement

The team must be able to build, test and deploy the React application without
breaking the current client. React routes must be independently releasable and
reversible until final cutover.

## 2. Workspace Contract

Create:

```text
web/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  eslint.config.js
  src/
    main.tsx
    app/App.tsx
    app/router.tsx
    app/providers/AppProviders.tsx
    styles/tokens.css
    styles/globals.css
    test/
```

Root scripts should delegate clearly:

```text
dev:server
dev:web
build:web
test:web
test:web:e2e
lint:web
typecheck:web
```

Do not replace existing server/test scripts with framework commands.

## 3. Dependency Policy

- Resolve stable compatible versions once during scaffold.
- Commit one lockfile strategy; do not keep conflicting root and nested locks.
- Production dependencies must have a customer-facing runtime purpose.
- Prefer Radix primitives over multiple overlapping component libraries.
- Do not add both a full opinionated UI framework and Tailwind.
- Do not copy vendored browser bundles into the React source.
- Record major dependency decisions in `web/README.md`.

## 4. Development Integration

Vite development:

```text
React:  http://localhost:5173
API:    current Express development port
/api/*  proxied to Express
/assets/* served from the documented development asset owner
```

Environment variables exposed to React must use a public prefix and may contain
only public configuration:

```text
VITE_API_BASE_URL
VITE_APP_ENV
VITE_BUILD_SHA
```

Provider keys, database credentials, signing secrets and internal pricing policy
must never enter a Vite variable.

## 5. Integrated Route Ownership

Add a server-owned route ownership configuration when the first route is ready:

```text
server/config/frontend-route-ownership.json
```

Conceptual record:

```json
{
  "version": 1,
  "defaultRuntime": "legacy",
  "routes": [
    { "pattern": "/community", "runtime": "react", "enabled": false }
  ]
}
```

Create a route ownership resolver under the server app composition capability.
It must:

- ignore `/api/*`;
- match explicit browser routes;
- return React index only for enabled React routes;
- return legacy index for legacy routes;
- fail with 404 for unknown routes rather than returning an unrelated app;
- support a global emergency fallback to legacy during migration.

The exact file location must follow the server architecture map at
implementation time. Route matching behavior requires unit tests.

## 6. Production Build Boundary

During local integrated testing Express may serve:

```text
web/dist/index.html
web/dist/react-assets/*
```

Vite output assets must use hashed filenames and a namespace that does not
collide with current `/assets`.

Production target:

```text
Firebase Hosting -> React static SPA
/api/** rewrite   -> Cloud Run API
```

`createApp()` must not become permanently coupled to a production frontend
build path. Express static serving is a development/transition adapter.

## 7. Shared Asset Transition

During migration:

- React may reference existing source-controlled `/assets` URLs;
- generated outputs remain server/runtime assets;
- no image is duplicated merely to satisfy both clients;
- React components use public or authorized media URLs from APIs where available.

Before legacy decommission, decide and document the final owner:

```text
web/public/assets/                 small source-controlled web assets
object storage / asset API        user uploads and generated images
visual-assets/character-builder/  authoring source sets
```

Never move runtime outputs into the React source tree.

## 8. CI Gate

Every React change must run:

```text
typecheck
lint
unit/component tests
production build
```

Feature route cutovers additionally run targeted Playwright tests and current
server contract tests.

## 9. Rollback

- Route runtime ownership is reversible without data migration.
- React must not write a new incompatible server record before its server
  contract is released.
- A failed React route can return to legacy while shared API data remains valid.
- Remove rollback only after the observation window in 012.

## 10. Acceptance Criteria

- React starts independently through Vite.
- API proxy preserves actor headers and media requests.
- Production React build is deterministic.
- A test-only React route and a legacy route can deep-link correctly.
- Browser back/forward across runtime boundaries is predictable.
- Unknown routes do not receive a false success.
- No secret appears in the built bundle.

