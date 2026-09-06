# LVI-03 Image Provider Directory

1. Use getProviderCatalog with Playground surface/mode via apiClient and its
   existing Zod schema. No server changes and no duplicated capability table.
2. Route-level query uses provider-catalog prefix + actor ID + explicit context.
   No polling/localStorage/new cache. TanStack owner, stale immediately,
   refetch on mount/focus and catalog invalidation, GC after existing default.
3. Pass catalog/loading/error/retry to a presentational Community component.
   Request only while actor exists and editorial is visible.
4. Render providers returned by the server with eligible image models; exclude
   unavailableReason and explicitly non-routable models. Never synthesize models.
5. Accessible native details/summary exposes models, names localized using the
   existing catalog displayName shape. Generic lucide icon until approved logos.
6. Label scope as image models available in Playground, not all workflows.
   Descriptions mention references only per model capability. No price claims.
7. Loading/error with retry/empty states remain inside section, feed unaffected.
8. Unit tests: populated, localized, disabled/testing-only, unsupported references,
   empty, loading, error/retry. Home search disables query and hides section.

Data: Generation API -> actor-scoped TanStack query in Home -> props -> directory.
No mutation, provider call, new runtime file or credit estimate.

Inspection gap: server returns `defaultProvider: null` when every provider is
disabled. Normalize this to the existing empty-string selection sentinel at
providerCatalogSchema, retaining its string output type and all selection
consumers. Add a regression fixture for this actual empty API response.
