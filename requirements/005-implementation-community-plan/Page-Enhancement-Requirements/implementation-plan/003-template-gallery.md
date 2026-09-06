# Step 03 - Template Gallery Delivery

Status: Complete (2026-09-06)

Depends on: `002-shared-discovery-foundation.md`

Owning requirement: `../001-template-gallery.md`

## 1. File Ownership

Prefer a dedicated Community route/module if extracting Template mode makes route intent clearer:

```text
web/src/features/community/routes/TemplateGalleryRoute.tsx
web/src/features/community/components/templates/TemplateDiscoveryCard.tsx
web/src/features/community/components/templates/templateDiscoveryModel.ts
web/src/features/community/components/templates/*.test.tsx
```

Modify `web/src/app/router.tsx` only to point `/explore/templates` to the dedicated route. Do not change the route path or sidebar registry.

## 2. Tasks

- `TPL-IMPL-01` Extract Template filter/query setup from generic pathname inference
- `TPL-IMPL-02` Preserve canonical Community query keys and cursor pagination
- `TPL-IMPL-03` Build template display adapter from `CommunityPost`
- `TPL-IMPL-04` Implement card media, identity, metadata and optional readiness/pricing
- `TPL-IMPL-05` Embed existing `TemplateUseButton` without reimplementing handoff
- `TPL-IMPL-06` Add featured selection and omit section when no eligible item exists
- `TPL-IMPL-07` Add shared hero, steps and toolbar
- `TPL-IMPL-08` Add tutorial placeholders from config with no iframe load
- `TPL-IMPL-09` Add loading, retry, empty and unavailable states
- `TPL-IMPL-10` Add i18n keys and locale parity
- `TPL-IMPL-11` Validate long title/tags/action labels at three viewports
- `TPL-IMPL-12` Confirm existing owner/edit and Fashion template surfaces are unchanged

## 3. Focused Tests

```text
npm run test --workspace web -- TemplateDiscoveryCard TemplateGalleryRoute
npm run test --workspace web -- TemplateUseButton SharedTemplateEditDialog
npm run test --workspace web -- communitySchemas.test.ts
node --test test/communityGalleryHandoff.test.js test/templateCore.test.js
```

Run only the Template Playwright spec for visual verification.

## 4. Exit Gate

- `/explore/templates` is visually distinct and uses real public data
- `Use template` follows the existing workflow
- No unsupported blueprint, rating, ranking or monetization data is shown
- Focused tests and three viewport checks pass
- Root Community and other discovery routes remain on their current presentation
