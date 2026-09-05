# Step 01 - Inventory And Contract Freeze

Status: Planned

## 1. Purpose

สร้าง baseline ที่ตรวจซ้ำได้ก่อนเปลี่ยน UI เพื่อแยกให้ชัดว่าอะไรคือ behavior เดิม อะไรคือการจัดวางใหม่ และ field ใดไม่มีอยู่จริง

## 2. Read Before Editing

- `web/src/app/router.tsx`
- `web/src/app/routeRegistry/routes.ts`
- `web/src/features/community/routes/CommunityHomeRoute.tsx`
- `web/src/features/community/components/CommunityHero.tsx`
- `web/src/features/community/api/communityApi.ts`
- `web/src/features/community/schemas/communitySchemas.ts`
- `web/src/features/profiles/routes/CharacterDirectoryRoute.tsx`
- `web/src/features/profiles/api/profileApi.ts`
- `web/src/features/profiles/schemas/profileSchemas.ts`
- `web/src/features/comparisons/routes/ComparisonsRoute.tsx`
- `web/src/features/comparisons/api/comparisonApi.ts`
- Existing shared cards and styles named in `../005-shared-discovery-components.md`

## 3. Tasks

- `BASE-01` Assert route ownership for `/`, three `/explore/*` routes and private `/comparisons`
- `BASE-02` Record query parameters, defaults and cursor reset behavior for each route
- `BASE-03` Create a protected-action matrix for detail, use, handoff, share, vote and private management actions
- `BASE-04` Map every desired card field to a current Zod field or `Pending`
- `BASE-05` Mark all concept-only rankings, ratings and metrics as unavailable
- `BASE-06` Record current loading, empty, error and partial-media behavior
- `BASE-07` Capture baseline screenshots at 390px, 820px and 1440px for four routes
- `BASE-08` Record initial request count and eager media requests per route
- `BASE-09` Run route registry, Community schema, Profile schema and Comparison schema tests
- `BASE-10` Record pre-existing failures without changing unrelated files

## 4. Test Commands

Run separately:

```text
npm run test --workspace web -- routes.test.ts AppShellRoutePolicy.test.ts
npm run test --workspace web -- communitySchemas.test.ts
npm run test --workspace web -- profileSchemas
npm run test --workspace web -- comparisonSchemas.test.ts
node --test test/communityPublicSnapshot.test.js test/communityOwnershipPolicy.test.js
```

Reconcile filename filters with actual Vitest discovery before execution.

## 5. Exit Gate

- Current route and schema tests pass or pre-existing failures are documented
- Each visual field is classified as real, optional, mock-safe or pending
- No open data-ownership question remains for the first-delivery fields
- Baseline screenshots and request counts exist

No production UI is changed in this step.
