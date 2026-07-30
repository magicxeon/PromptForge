# ModelPromptForge React Web

This workspace is the canonical React browser application.
The Express API, domain services, repositories, providers, and runtime data
remain canonical and are not duplicated here.

Template workflows are split by ownership: `src/features/templates/` owns
serialization and client contracts, reusable presentation belongs under
`src/components/templates/`, and Scene Builder, Community, and Fashion compose
those contracts without creating parallel generation pipelines.

## Commands

Run commands from the repository root:

```text
npm run dev:web
npm run typecheck:web
npm run lint:web
npm run test:web
npm run test:web:e2e
npm run build:web
```

Vite runs on `http://localhost:5173` and proxies API/media/localization requests
to `http://localhost:6500`.

Uploaded generation references use `POST /api/references`. The browser keeps the
returned actor-owned `/outputs/references/...` URL; only the server resolves the
file into provider transport data after checking ownership.

Navigation metadata is owned by `src/app/routeRegistry/`. Versioned actor drafts
and expiring one-time workflow handoffs are owned by `src/lib/persistence/`.
Server-controlled feature exposure is consumed through
`src/lib/permissions/FeaturePolicyProvider.tsx`.

## Dependency Decisions

- React and TypeScript own component composition and compile-time contracts.
- React Router owns React browser routes.
- TanStack Query owns server-state cache and invalidation.
- i18next and react-i18next consume the existing locale catalogs.
- Zod validates API boundaries; server contracts remain authoritative.
- React Hook Form is reserved for forms with validation and dirty-state needs.
- Tailwind CSS uses the Momelo tokens in `src/styles/tokens.css`.
- Radix supplies accessible interaction primitives where native HTML is not
  sufficient.
- Lucide supplies interface icons.
- Vitest, Testing Library, MSW, and Playwright own the React test layers.

The repository uses the root `package-lock.json`. Do not create a nested
lockfile under `web/`.

## Runtime And Validation

`server/config/frontend-route-ownership.json` registers browser routes. All
registered routes are React-owned and require `web/dist/index.html` in the
integrated production server.

Run the complete Windows validation from the repository root:

```text
scripts\validate-react-migration.bat
```

The batch validates catalog parity, TypeScript, ESLint, React tests, the complete
Node regression suite, the production build, and desktop/mobile Playwright
deep-link checks.
