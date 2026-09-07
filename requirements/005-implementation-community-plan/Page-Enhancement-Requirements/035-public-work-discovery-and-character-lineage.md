# Public Work Discovery And Character Lineage

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Planned; implementation held. Owners: Community, Profiles, Generation.

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
