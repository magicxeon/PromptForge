# Public Work Discovery And Character Lineage

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Implemented 2026-09-08; isolated automated verification in Plan 035.
Owners: Community, Profiles, Generation. Legacy repair and live UAT remain separate.

Delivery slices: (1) feed retention/deduplication, (2) actor-scoped refresh and
owner-only post destination/recovery, (3) canonical handoff/lineage verification
and normal Scene picker. Legacy repair is still evidence-gated, not automatic.

## A. Public Images Remain Findable

- DISC-01: A public eligible image remains in the paginated Community feed even
  when displayed in hero/featured sections. Deduplicate repeated pages within
  the feed by post ID, not between independent editorial and feed sections.
- DISC-02: Publication success refreshes affected actor-scoped Community query
  families through existing TanStack Query contracts. Do not create polling,
  global cache clearing or a second feed store. Preserve filters and cursors;
  existing filtered views may correctly exclude a newly published post.
- DISC-03: Success offers a direct destination to the persisted post. Already
  shared outputs offer View post / owner management, not another publication.
  Extend the existing owner-only status contract minimally if needed; do not
  expose private post identifiers to another actor or create drafts on rendering.
- DISC-04: Distinguish public, unlisted, private, hidden/removed and failed
  publication. Only public eligible posts enter discovery; an owner viewing a
  private post is not evidence it is visible to others. Never reset filters or
  change visibility to make an image appear.
- DISC-05: Character cover selection, Character visibility and reuse settings
  are never prerequisites for publishing or finding an ordinary public image.

Owners: CommunityHomeRoute, useCommunityDiscoveryPosts, ShareGeneratedDialog,
CommunityShareService, CommunityRankingService and existing source access policy.
Preserve ranking, pagination, search, unrelated hero layout and Template detail.

## B. Character Work Association

- LIN-01: An authorized Character selection carries stable profile+version IDs
  through handoff, draft reload, request validation, saved Generation result and
  Community projection. Owner selectors can resolve their linked work without
  requiring a public post; public viewers receive public-safe work only.
- LIN-02: A display/cover URL is not the canonical generation reference. Retain
  current approved asset authority and server ownership/reuse validation.
- LIN-03: Replacing/clearing Character or switching actor/template clears stale
  identity and lineage with the reference. Failed handoff does not apply half a
  selection. Manually uploading an image does not manufacture profile lineage.
- LIN-04: CharacterFeaturedImagePicker lists eligible linked works using the
  existing Profiles facade. Community publishing must not implicitly set the
  Character cover, grant reuse rights or publish private Character assets.
- LIN-05: For the reported legacy job with missing context, inspect durable
  source/session evidence first. If exact linkage is proven, propose an owner-
  scoped idempotent repair with dry-run, audit and rollback. If unproven, mark
  unresolved; manual owner association is a separate pending permission policy.

## Ordered Tasks / Acceptance Fixtures

1. Reproduce newest image selected as hero and absent from feed; make it appear
   exactly once in the feed while retaining hero/featured presentation.
2. Test successful share refresh + direct destination, filtered-out post,
   failed refresh after successful publish (must not re-publish), and stale 409.
3. Trace existing Character handoff through at least Scene/Template and all
   identified reuse consumers; document missing entry points before changes.
4. Test approved version preserved to result and candidate projection; negative
   cases cover unlinked uploads, wrong actor/version and revoked/private media.
5. Fixture-test owner image not yet shared, public image linked to a private
   Character, and missing legacy context without auto-backfill.

Use short discovery tests separately from lineage tests. If lifecycle contracts
change, Generation skill + QA/privacy gates apply. No live data repair in this
round without separate explicit approval. Revert presentation independently of
additive lineage; retain saved provenance and immutable versions on rollback.

## Delivery Evidence

- CommunityHomeRoute retains editorial images in the feed; discovery pages are
  deduplicated by stable post ID. Ranking/filter/cursor contracts are unchanged.
- ShareGeneratedDialog invalidates actor-specific Community reads, caches the
  persisted destination and recovers duplicate-conflict destinations. Template
  management load failure is separate from successful draft creation.
- Existing owner-only share-status now returns optional post ID/type/visibility/
  status only. No source prompt, snapshot or foreign-owner identifier is returned.
- SceneCharacterSelector serves normal and Template Scene. Normal supports styled
  and reusable Characters; Template retains replaceable-outfit requirements.
- Scene drafts persist only selected profile/version IDs. Template selection uses
  the existing actor-bound, expiring handoff envelope without extending expiry.
  Reload reauthorizes and rejects mismatched versions; actor/reference/session
  changes clear stale context. No media bytes or authority URLs are added to drafts.
- Generation already revalidates CharacterUsageService context, passes it through
  job options/history, and Profiles resolves linked owner/public candidate work.
  Existing destination/sharing/lifecycle/analytics tests remain the parity gate.
- Reported old job has no proven Character lineage. No repair or inferred link
  was written; it still cannot become a Character cover solely by being shared.
- Follow-up 041 now allows the owner to explicitly select that image as a cover
  from My images with display consent. This does not backfill Character lineage,
  alter statistics or make the image a verified Character work.
