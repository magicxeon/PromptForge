# 002-004 Route Extraction And Server Bootstrap Cleanup

## 1. Goal

Reduce `server/server.js` into a small launch/bootstrap file and move route groups into focused modules.

Do this only after data paths and functional module extraction are stable.

## 2. Business Requirement

Community, billing, admin, and provider routing will add many endpoints. Keeping all routes in `server/server.js` will make changes risky and hard to review.

## 3. Target Structure

```text
server/app/
  createApp.js
  routeErrors.js
  routes/
    attributesRoutes.js
    identityRoutes.js
    creditRoutes.js
    generationRoutes.js
    historyRoutes.js
    collectionRoutes.js
    comparisonRoutes.js
    sceneTemplateRoutes.js
```

## 4. Route Module Contract

Each route module exports:

```text
registerXRoutes(app, dependencies) -> void
```

Routes must receive dependencies from `createApp.js`; they should not instantiate their own managers.

Example:

```text
registerHistoryRoutes(app, {
  historyRepository,
  queueManager,
  collectionManager,
  comparisonOrchestrator,
  resolveRequestUsername
})
```

## 5. Route Groups

### `attributesRoutes.js`

Owns:

```text
GET /api/providers
GET /api/attributes/bundle
```

### `identityRoutes.js`

Owns:

```text
GET /api/me
GET /api/mock-users
```

### `creditRoutes.js`

Owns:

```text
GET /api/credits
POST /api/credits/recharge
```

### `generationRoutes.js`

Owns:

```text
POST /api/generate
GET /api/jobs/:id
GET /api/jobs/:id/stream
```

### `historyRoutes.js`

Owns:

```text
GET /api/history
GET /api/history/:id
DELETE /api/history/:id
```

### `collectionRoutes.js`

Owns:

```text
GET /api/collections
POST /api/collections
GET /api/collections/:id
PATCH /api/collections/:id
DELETE /api/collections/default
DELETE /api/collections/:id
POST /api/collections/:id/images
DELETE /api/collections/:id/images/:jobId
PUT /api/collections/:id/default
```

### `comparisonRoutes.js`

Owns:

```text
POST /api/comparisons/estimate
POST /api/comparisons
GET /api/comparisons
GET /api/comparisons/:setId
PATCH /api/comparisons/:setId
PATCH /api/comparisons/:setId/winner
DELETE /api/comparisons/:setId
```

### `sceneTemplateRoutes.js`

Owns:

```text
POST /api/scene-templates/share-drafts
POST /api/scene-templates/share-drafts/:draftId/publish
GET /api/scene-templates/shared
GET /api/scene-templates/shared/:postId
POST /api/scene-templates/shared/:postId/use-template
POST /api/scene-templates/remix-events
```

## 6. `createApp.js` Contract

`server/app/createApp.js` should:

```text
create express app
register cors/json/middleware/static serving
construct shared dependencies
register route modules
register SPA fallback routes
return app
```

`server/server.js` should:

```text
load env
create app
listen
run startup warmers
```

## 7. Implementation Plan

Extract routes in this order:

1. Identity routes.
2. Credit routes.
3. History/job routes.
4. Collection routes.
5. Comparison routes.
6. Scene template routes.
7. Attribute/provider routes.
8. Create `createApp.js`.
9. Trim `server/server.js`.

## 8. Acceptance Checklist

```text
All existing API URLs still work.
Response shapes are unchanged.
server/server.js is mostly bootstrap.
Each route file has one responsibility.
Route modules do not create duplicate singleton managers.
Actor context still works.
Static client serving still works.
Direct /studio, /history, /comparisons links still return index.html.
```

## 9. Suggested Checks

Ask the user to run:

```powershell
node --check server/server.js
node --check server/app/createApp.js
node --check server/app/routes/historyRoutes.js
node --check server/app/routes/generationRoutes.js
node --test test/mockActorContext.test.js
```

## 10. Manual Smoke Test

```text
Open app.
Load providers and attributes.
Generate image.
Poll/stream job completion.
Load history.
Delete one history item.
Create collection.
Run comparison estimate.
Open shared templates.
Use template.
```

## 11. Rollback

If a route module breaks:

1. Move only that route group back into `server/server.js`.
2. Keep other extracted route groups.
3. Add a regression test for the broken route.
