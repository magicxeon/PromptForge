# 004 Platform Services: Routing, API, Identity, i18n and State

**Status:** Foundation gate  
**Depends on:** 001-003

## 1. Business Requirement

All React features must share one implementation for navigation, server access,
actor identity, permissions, localization and persisted drafts. This prevents
the same cross-user leakage, stale polling and navigation defects from being
reimplemented in each page.

## 2. App Provider Composition

Create one provider composition:

```text
ErrorBoundary
  -> I18nProvider
  -> ActorProvider
  -> QueryClientProvider
  -> Permission/FeaturePolicyProvider
  -> RouterProvider
```

Do not use one universal context containing all application state.

## 3. Router

React Router owns only React routes. Route definitions include:

```text
id
path
lazy module
required feature flag
allowed roles
breadcrumb resolver
navigation metadata
error boundary
```

Rules:

- route params and search params are canonical for shareable navigation state;
- breadcrumbs derive from matched routes and navigation context;
- detail pages preserve their actual parent destination;
- loaders may prefetch query data but must use the shared API client;
- route modules are lazy loaded;
- unauthorized pages do not briefly render privileged UI.

## 4. API Client

Create:

```text
web/src/lib/api/apiClient.ts
web/src/lib/api/apiError.ts
web/src/lib/api/queryKeys.ts
web/src/lib/api/schemas/
```

The client must:

- attach the active actor header in mock mode;
- support future real authentication without feature changes;
- distinguish JSON and binary/media responses;
- parse stable server error codes;
- support request cancellation;
- never automatically retry unsafe mutations;
- validate important API responses through Zod;
- avoid logging raw prompt/reference payloads.

All feature queries use centralized query-key factories containing actor scope
where data is owner-relative.

## 5. Actor and Authentication Migration

Development behavior preserves the mock actor switcher. React defines:

```ts
type ActorContext = {
  actorId: string;
  role: string;
  displayName: string;
  mode: "mock" | "authenticated";
};
```

The frontend must not treat this object as authorization evidence.

On actor change:

1. cancel in-flight owner-relative queries;
2. clear owner-relative query cache;
3. clear or switch actor-scoped persisted drafts;
4. reset selected private resources;
5. refetch `/api/me`, credits, history and current owner-relative page;
6. keep public cache only when responses are viewer-independent.

The provider boundary must later accept a real session actor without feature
components reading mock-user storage.

## 6. Localization

Reuse existing namespaces and locale catalogs. Implement:

```text
web/src/lib/i18n/i18n.ts
web/src/lib/i18n/localePreference.ts
web/src/lib/i18n/catalogLoaders.ts
```

Requirements:

- namespace lazy loading by route;
- fallback locale consistent with current behavior;
- interpolation parity;
- persisted locale preference;
- document title and accessible labels localized;
- no inline language maps;
- no AI prompt text in UI catalogs.

Catalog source ownership must be singular during migration. Either both clients
consume the existing catalog location or an explicit catalog move updates both
consumers and validation scripts in one change.

## 7. State Ownership

Use this decision table:

| State | Owner |
|---|---|
| Server records and lists | TanStack Query |
| Current route/tab/filter | URL |
| Input form | React Hook Form |
| Open/closed, selection, hover | Local component state |
| Multi-step draft | Feature reducer/store |
| Durable draft | Actor-scoped persistence adapter |
| Provider/model capabilities | Server provider catalog query |
| Credit estimate | Server estimate query/mutation |
| Permissions | Server viewer projection/capability |

Derived state is computed. It is not copied into multiple stores.

## 8. Persistence

Create a versioned adapter:

```text
web/src/lib/persistence/actorScopedStorage.ts
web/src/lib/persistence/migrations.ts
```

Record envelope:

```ts
{
  schemaVersion: number;
  actorId: string;
  feature: string;
  updatedAt: string;
  payload: unknown;
}
```

Persist only intentional drafts/preferences. Do not persist:

- Query cache as a substitute for server data;
- raw Base64 references;
- provider credentials;
- credit balance;
- server permission decisions;
- temporary signed URLs beyond their intended lifetime.

Legacy draft import must be one-way, versioned, actor-safe and covered by tests.

## 9. Feature Flags and Permissions

Keep server-owned Community exposure flags authoritative. React may cache the
read model but does not reinterpret configuration files.

Components receive capability objects:

```ts
{
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canReuse: boolean;
  reason?: string;
}
```

Unavailable sensitive actions are hidden. Disabled controls are used only when
the user benefits from understanding that a future/conditional action exists.

## 10. Error and Async UX

- Global error boundary handles unexpected render failures.
- Route error boundaries isolate page failures.
- Query errors render recoverable feature states.
- Mutation errors preserve user input.
- Job polling treats not-found, restart and permission failures distinctly.
- Toasts report transient outcomes; durable errors remain near the affected control.
- No unbounded polling survives route or actor changes.

## 11. Acceptance Criteria

- One API client serves every React feature.
- Actor switching cannot expose old owner data.
- Direct routes and browser navigation work.
- Locale switching updates all mounted React components.
- Query/persistence state ownership is documented and tested.
- Provider, pricing and permission logic are not duplicated in React.

