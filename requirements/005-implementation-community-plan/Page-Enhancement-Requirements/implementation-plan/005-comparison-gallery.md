# Step 05 - Public Comparison Gallery Delivery

Status: Complete (2026-09-06)

Depends on: `004-character-gallery.md`

Owning requirement: `../002-comparison-gallery.md`

## 1. File Ownership

Public route orchestration belongs to Community:

```text
web/src/features/community/routes/ComparisonGalleryRoute.tsx
web/src/features/community/components/comparisons/PublicComparisonCard.tsx
web/src/features/community/components/comparisons/publicComparisonModel.ts
web/src/features/community/components/comparisons/*.test.tsx
```

Private Comparison files remain under `web/src/features/comparisons/`. Shared thumbnail/viewer components may be reused only if they accept already-sanitized public data and do not fetch private sets.

## 2. Tasks

- `CMP-IMPL-01` Point `/explore/comparisons` to a dedicated public route without changing `/comparisons`
- `CMP-IMPL-02` Add an allowlisted adapter for public `comparisonSnapshot`
- `CMP-IMPL-03` Preserve slot order and provider/model/media association
- `CMP-IMPL-04` Render optional duration, dimensions, ratio and format only when present
- `CMP-IMPL-05` Render winner/vote state only from authoritative fields
- `CMP-IMPL-06` Add redacted-prompt, no-winner and partial-slot states
- `CMP-IMPL-07` Add shared hero and comparison-relevant toolbar
- `CMP-IMPL-08` Add tutorial/sample content with visible Sample labelling
- `CMP-IMPL-09` Add i18n and accessible viewer/action labels
- `CMP-IMPL-10` Test a long model name and more than two slots
- `CMP-IMPL-11` Verify public cards link to public posts only
- `CMP-IMPL-12` Run private list/detail/workspace regressions without restyling them

## 3. Focused Tests

```text
npm run test --workspace web -- PublicComparisonCard ComparisonGalleryRoute
npm run test --workspace web -- ComparisonThumbnailGrid ComparisonWorkspace
npm run test --workspace web -- communitySchemas.test.ts comparisonSchemas.test.ts
node --test test/communityComparisonShare.test.js test/communityPublicSnapshot.test.js
```

Run the public Comparison Gallery Playwright spec independently.

## 4. Exit Gate

- Public route uses Community snapshots and private route uses actor-owned Comparison data
- No fairness, score, winner or price claim is inferred by the client
- Partial results remain ordered and readable
- Private Comparison workflow passes adjacent regressions
- Focused tests and three viewport checks pass
