# Step 1: Bounded Public Template Previews

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [024](../024-template-public-preview-data.md), TPD-01..06.

## Owner Files

- `server/domain/community/CommunityTemplateDetailService.js`
- `server/domain/community/CommunityShareService.js`
- `server/app/routes/communityShareRoutes.js`
- `web/src/features/community/api/communityApi.ts`
- `web/src/features/community/schemas/communitySchemas.ts`
- `web/src/features/community/hooks/` (proposed `useTemplatePreviews.ts`)
- `web/src/features/community/hooks/useCommunityEngagement.ts`
- `test/communityTemplateDetail.test.js` and a small batch-read companion test

## Tasks

- [x] D-01 Freeze existing resolver tests: source precedence, owner match,
  completed Job, visibility and cross-version family grouping.
- [x] D-02 Add 24-root, 0/1/3/4+ output, inaccessible root, duplicate input and
  invalid 25-root fixtures. Assert no hidden payload fields.
- [x] D-03 Extract only shared lineage/selection code behind Community facade
  if needed; keep old Detail schema and scoped sort cursor compatible.
- [x] D-04 Implement batch read with one post snapshot/history batch; return
  public first-three/hasMore, omitting inaccessible roots consistently.
- [x] D-05 Add thin HTTP validation/error translation, actor context and feature
  gates. No provider calls, repository mutations or domain raw file paths.
- [x] D-06 Add Zod/API boundary and actor-scoped hook. Partition newly loaded
  catalog pages, cap/deduplicate IDs; do not refetch every accumulated page.
- [x] D-07 Extend canonical reaction/publication invalidation. Record visibility
  refresh window; no unsupported promise of immediate remote revocation.
- [x] D-08 Measure history calls and response size for 1/12/24 roots. Assert bounds
  rather than arbitrary machine-specific wall-clock thresholds.
- [x] D-09 Wire/run `--part=template-data` and existing single Detail server/schema
  compatibility tests; record evidence before releasing dependent UI slices.

## Focused Checks / Exit

Service: spoofed owner, hidden/unlisted/deleted source/output, missing Job, forged
source, different definitions, versions, ties and malformed limits.
Hook: actor switch, repeated root, next page, parse failure, retry and unaffected
single-Detail cache. TPD criteria must pass with one history lookup per batch.
Stop if previews need publishing private references/backfilling records.
Rollback additive endpoint/hook while preserving original Detail API and data.
