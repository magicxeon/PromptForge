# Template Detail And Public Creations

Planned presentation follow-up: [027 Photo Template](027-photo-template-original-and-information.md)
and [028 public creation cards](028-photo-template-community-creations.md), plans
028-029, adopt resource 005 without changing this route/lineage contract.
Requirement 024 plans a bounded Gallery preview read sharing this resolver.

Status: Implemented; focused automated and visual checks passed. Live-data smoke
check remains pending (localhost:6500 unavailable). Owner: Community public discovery; Templates continues to
own execution/versioning. Primary: Product Requirement Architect. Reviewers:
UX and QA/security. Skills: review-product-ux, verify-release-regressions.
Generation/Credits state is unchanged. Reference: resource 001 and the user's
Post screenshot and approved flow. Character/Landing work is paused.

## Outcome And Routes

- Gallery -> existing `/posts/:postId` -> sidebar preview -> See all ->
  `/explore/templates/:postId`. The latter uses the ORIGINAL template post ID,
  not a new template definition or generated-image ID. It supports direct URL
  entry, refresh and a reusable route builder for any future button.
- Template Gallery card media/details and Featured View details link directly
  to Template Detail. Gallery MediaCard navigation remains unchanged.
- Template Detail -> generated public image -> original Post; that Post offers
  the same family preview and origin link. Use Template always submits the
  original template post ID through the existing handoff, never the remix image.

## Data Contract And Privacy

1. Add one read use case through CommunityShareService, internally delegated to
   CommunityTemplateDetailService. Endpoint:
   `GET /api/community/posts/:postId/template-detail?sort=likes|latest&limit=12&cursor=...`.
   Response: `{ template: CommunityPost|null, items: CommunityPost[], nextCursor,
   hasMore }`. Preview uses limit 4. Max page size 24; default sort likes.
2. Resolve source post visibility before reading its lineage. Template posts
   resolve to themselves. Image posts resolve only from a completed Generation
   owned by the post owner with server-recorded templateUseContext. Validate
   source post identity AND canonical template ID. No name/image/prompt guessing
   and no trust in client-supplied template IDs.
3. Public creations must be public feed-visible image posts from all creators,
   backed by the same validated template identity. Exclude original, private,
   unlisted, deleted, hidden, removed and owner-unpublished work. No auto-share.
   Redact via the existing Community public projection; never send raw Job,
   reference, replacement values, hidden prompts or use-session IDs.
4. Prefer exact source post when available; canonical template ID fallback may
   resolve a public template only when no source post was recorded. A hidden
   recorded source must not be relinked to expose it. Group canonical versions
   of the same template; different definitions remain separate. Legacy templates
   without canonical IDs stay inspectable, with no fabricated creations.
5. Derive lineage at read time from existing history, including already-shared
   images. No backfill writes or runtime schema migration in this release.
   Deleted/missing/unverified source Jobs yield no claimed relationship.
6. Like ordering uses actual per-post likes descending, then createdAt/id for
   stable ties. Latest uses createdAt/id. Cursor is signed and scoped to actor,
   original template and sort. Visibility is re-evaluated on every request.

## Screen Contract

- Post keeps its media, controls, original metadata, Comments, More from creator,
  owner-edit behavior and return navigation. Only add origin/family preview
  below sidebar details. On mobile it follows details and precedes Comments.
  Ordinary images without origin show no family block. Preview error is local.
- Template Detail: original image in contain mode, title/creator/description,
  existing availability/price and Use Template, link to original Post. Below:
  public creations grid with Most liked / Latest and explicit Load more. No
  fake counters, altered media, copied private inputs or automatic generation.
- Reuse MediaStage, MediaCard, CreatorIdentity, TemplateUseButton,
  TemplatePricingBadge, Discovery controls, AsyncState and canonical handoff.
- Loading, empty, unavailable, partial page error and retry preserve the header
  and existing actions. An empty template invites use without unrelated images.
- All text localized EN/TH; tokens for default/fashion/creative; 390/820/1440
  screenshots, stable thumbnails, no nested controls or overflow.

## Performance / Boundaries

Community owns this read model. Reuse existing GenerationResultRepository reads
already consumed by CommunityPostAccessService; no provider/queue entry point.
Batch history lookup once for public candidate IDs, not once per image. Current
JSON adapters still scan local lists; no new in-memory cache or polling. This
is not a claimed database-scale optimization. SQL indexed lineage is pending.
TanStack Query keys are actor/post/sort/page-size scoped, staleTime 30 seconds,
default shared GC, cleared on actor switch; maximum 10 retained detail pages.
Post navigation/refocus and existing reaction invalidation refresh the family
query. No persisted media or Base64. Preview requires at most one extra read.

Pending: durable origin snapshots surviving history deletion, variation labels
from a reviewed public replacement schema, version filter, public counts across
all pages and moderation changes. None are required to inspect verified work.

## Acceptance / Rollback

- Verify direct Gallery/Featured navigation, deep link refresh, image/origin
  return paths and original ID passed to Use Template.
- Service/route tests cover forged/mismatched lineage, ownership, completed Job,
  hidden/private/unlisted sources/results, old Jobs, like/latest pagination and
  cursor tampering, no new private data in responses and feature gates.
- Focused component/API/navigation tests; preserve non-template Post behavior.
- Isolated visual fixtures, no paid calls or live share/like mutations. Record
  live-server gaps honestly. Independent QA when available.
- Additive rollout; rollback new route/link/preview and endpoint together. Old
  Post URLs still work and no stored data requires reversal.

Requirement gap review: direct entry is explicit, original image is fixed, list
is globally sorted before pagination, private work is not inferred from Like
counts, source deletion is fail-closed and handoff is not reimplemented.
Execution: implementation-plan/019-template-detail-and-creations.md.
