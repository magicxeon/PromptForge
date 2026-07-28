# 002 React Workspace, Toolchain and Runtime Coexistence

**Status:** Implemented; coexistence ended at React cutover
**Depends on:** 001 inventory baseline

## Implementation Progress

The `web/` workspace, root command delegation, Vite proxy, React providers, and
server-side frontend route ownership are implemented.
`server/config/frontend-route-ownership.json` remains the route source of truth,
but every registered customer route now resolves to React. A missing production
build fails visibly instead of silently serving the legacy application.
Route-level lazy loading keeps feature code outside the initial shell.

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

The migration introduced a server-owned route ownership configuration:

```text
server/config/frontend-route-ownership.json
```

Historical transition record:

```json
{
  "version": 1,
  "defaultRuntime": "react",
  "routes": [
    { "pattern": "/community", "runtime": "react", "enabled": true }
  ]
}
```

The route ownership resolver under the server app composition capability:

- ignore `/api/*`;
- match explicit browser routes;
- return the React index for every enabled browser route;
- fail with 404 for unknown routes rather than returning an unrelated app;
- expose a response header used by cutover E2E tests.

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

- Shared API records remain runtime-independent and migration-compatible.
- The current runtime no longer falls back to legacy browser code.
- Source deletion remains delayed until the validation and observation gate in
  012 so release rollback can use source control without maintaining two live
  clients.

## 10. Acceptance Criteria

- React starts independently through Vite.
- API proxy preserves actor headers and media requests.
- Production React build is deterministic.
- Canonical React routes can deep-link correctly.
- Browser back/forward remains inside React Router and preserves detail context.
- Unknown routes do not receive a false success.
- No secret appears in the built bundle.
