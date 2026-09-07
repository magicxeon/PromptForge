# Public Template Family Preview Data

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: Community. Execution: [plan 025](implementation-plan/025-template-public-preview-data.md).

## Current Gap

`CommunityTemplateDetailService.getForPost` already verifies Generation lineage,
sorts public results and paginates. Gallery cards do not consume these results.
Calling that service once per card would repeat the current JSON/history scan.

## Contract

1. Extend the CommunityShareService public read facade, not routes or client
   lineage inference. Proposed bounded endpoint:
   `GET /api/community/template-previews?postIds=<comma-separated-root-post-ids>`.
   Validate 1-24 nonempty bounded IDs, deduplicate, reject excess/invalid input.
   IDs identify public Template Posts, not Generation IDs or arbitrary URLs.
2. Response is an explicitly typed/Zod-validated list of
   `{ templatePostId, items: CommunityPost[], hasMore: boolean }` under `items`.
   Maximum three public creations per root, fixed Most liked order. No total
   count, hidden identifiers, raw history, full prompts or private references.
3. Omit inaccessible/missing roots identically, without leaking why they are
   inaccessible. A visible root with no creations returns an empty items array.
   Entire malformed/auth-invalid requests fail using the normal boundary errors.
4. Reuse the current resolver and visibility sanitizer for single Detail and
   batch reads. Share a focused internal helper if necessary; do not copy the
   provenance rules into a second service. Keep old endpoint/schema compatible.
5. Relation requires completed, nondeleted Generation owned by output-post owner
   with trusted templateUseContext. Exact recorded source wins. Canonical ID
   fallback is allowed only when no source Post was recorded, as in 014.
6. Preserve family grouping across immutable versions of the same Template ID.
   Different Template definitions never merge by title, tags, pose or creator.
   Original is excluded; deleted/missing/unverified history yields no invented relation.
7. Sort by actual likes descending, createdAt descending, ID descending before
   limiting. Deduplicate creations by public Post ID, not visual similarity.

## Performance And Query Ownership

- One visible-post snapshot and one batched history lookup per batch request;
  no per-root history loop. Instrument repository call counts in tests.
- Gallery hydrates preview batches only for the newly loaded catalog page
  (maximum 24 roots per request), not the full accumulated catalog each time.
  Featured may reuse its batch entry or perform one capped Detail read. Deduped
  TanStack queries prevent fetching the same family for multiple components.
- Query keys include actor, ordered canonical root IDs and preview contract
  version. Use existing actor-scoped Query ownership, 30s staleTime and shared
  GC; no polling, localStorage image cache or cross-actor server cache.
- Refetch on normal navigation/focus and invalidate on existing like/publication/
  edit/moderation changes visible to this client. Server rechecks visibility on
  every request. Do not claim immediate cross-client revocation from a 30s cache.
- Gallery state remains usable if previews fail. A retry targets only previews.
- Record request count, response bytes and duration against fixed 1/12/24-root
  fixtures. Current JSON scan cost remains; a database/index migration is not
  concealed in this presentation task.

## Ownership And Reuse

- Server: `server/domain/community/CommunityShareService.js`,
  `CommunityTemplateDetailService.js`; `server/app/routes/communityShareRoutes.js`.
- Client: `web/src/features/community/api/communityApi.ts`,
  `schemas/communitySchemas.ts`, a focused hook under `hooks/`.
- Existing `useTemplateDetail` and `TemplateCreationsPreview` keep their public
  contracts. No per-card route component owns API orchestration.

## Acceptance

- `TPD-01`: Same root yields matching first-three results in Detail and batch.
- `TPD-02`: Cross-owner mismatch, hidden root/output, unlisted output, missing Job,
  forged context and different-template fixtures never leak a relationship.
- `TPD-03`: 0/1/3/4+ results produce correct bounded items/hasMore without fake totals.
- `TPD-04`: 24 roots still use one history batch; 25 roots are rejected.
- `TPD-05`: Actor switch and reaction invalidation cannot reuse another viewer's state.
- `TPD-06`: Preview failure does not block original-image Detail or Use Template.

Rollback removes only the additive preview consumer/endpoint and its helper
extraction if needed; preserve the existing Detail API and saved data.
