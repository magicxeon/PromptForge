# Character Featured Row And Post Engagement

Status: Implemented; 64 focused tests and 18 isolated visual combinations passed.
Conditional acceptance: final live-data check remains pending because the local
server stopped after baseline capture. Evidence is in plan 018. Extends 012.
Owner: Profiles presentation at /explore/characters; Community owns post
engagement. Primary: UX/UI Product Designer. Reviewer: QA including actor/public
media security. Skills: review-product-ux, verify-release-regressions. Reviews
are sequential by the same agent, not independent. Reference: resource 003.

## Approved Scope

1. Header retains at most four public Gallery sources, names and profile links.
   Add about 24-32px right inset on desktop, less on mobile. Progressively smaller
   circles (112/104/96/88px desktop before the alignment amendment below), retain strong rings,
   readable names and accessible hit targets. No image overlap or animation.
2. Featured is one full-width bordered structural section including its heading,
   Character information, portrait and In their world. Remove the nested border
   around the left Character card; normal directory cards remain unchanged.
3. Featured portrait and Moment images use cover, not stretched fill. This
   explicitly supersedes requirement 012's contain/no-crop rules for these
   discovery previews only. Original media and detail inspection are unchanged.
   Keep portrait framing and stable dimensions, accept aspect-dependent crop,
   and preserve full-size source links. No new images or outpainting.
4. A narrow theme-surface gradient blends the information-side edge into the
   Featured portrait; do not darken the whole image or overlay its face. On mobile
   stack portrait/info/works and adapt the blend to the adjacent content edge.
5. Discover gradient starts at the upper-left and becomes transparent toward the
   right. Preserve the three steps and group border; no full-band color fill.
6. Each existing public Moment shows a clickable heart with the post like count
   and a read-only Eye/view count. These belong to that post, not the Character.
   Display true zero values, never invented popularity, aggregate totals or ranks.
7. Reuse and extend EngagementBar with an explicit compact variant. Share the
   existing Community engagement query/reaction entry point through one hook in
   features/community/hooks; no second Profiles mutation or storage path.
   The original post-detail variant keeps Like, Save and Share.
8. Heart toggles the server-confirmed viewer state; disable while loading,
   unavailable, actorless or submitting. Guard duplicate calls, preserve counts
   on error, show a localized retry/recovery state, and prevent late responses
   from updating a different actor's state. Server authorization remains final.
9. Image/title links and heart controls must be sibling interactive elements,
   never buttons nested inside a Link. Clicking Like does not navigate; opening
   a Moment preserves the original post ID and return context.
10. No view recording when a thumbnail renders or is liked. Only reuse existing
    detail view recording behavior. No follows/Character likes added; Follow and
    Video stay Coming soon. Character stats keep their existing output meaning.

## Integration Trace

| Step | Source -> consumer | Verification |
|---|---|---|
| Header | existing public summary -> Gallery-source selector -> Hero | Exact source/link tests and progressive sizes/inset browser checks |
| Featured | current approved displayImageUrl -> CharacterPortrait cover | Full-row bounds, cover/fade and preserved default-card assertions |
| Moments | same Character public works query -> max 3 post IDs -> MediaStage | Local async states, original links, no nested interactive controls |
| Counts | post.engagementSummary fallback + actor-keyed GET engagement | Zero/count/state tests; no synthesis from Character totalOutputs |
| Like | shared hook -> communityApi.setCommunityReaction -> existing service | PUT/DELETE semantics, duplicate/error/actor-switch tests |
| Confirm | reaction summary + active state -> same actor/post query | Update shared engagement, invalidate existing feed/detail/works queries |
| Discover | existing steps -> Character-only CSS | Upper-left transparent fade; all text/actions retained |

## Boundaries And Performance

Keep ownership, actor headers, Zod boundaries, community feature gate, public
visibility, current generation/handoff and Credits. No server/API/schema/data
migration, provider call, Landing/Comparison or shared Button redesign.
New files belong only to Community hooks/tests and this requirements folder.

Existing TanStack Query engagement key: community-engagement/postId/actorId.
No new cache owner, no interval polling, no per-directory-card fetch. Up to three
additional engagement reads, one per displayed Moment; reuse cache across detail
and gallery. Mutation invalidates owning projections. Query data uses existing
QueryClient retention; actor switching clears actor-owned state. No media buffers
or browser persistence. Measure initial request footprint before and after.

## Validation / Closure

Plan 018: visual composition first, shared engagement second, integrated QA third.
Run cards, gallery, engagement, handoff and contracts as separate script groups;
optional all remains Character-scope only. Add focused existing server engagement
policy/service tests. No paid or live mutation tests. Browser 390/820/1440 x three
themes x EN/TH, verify screenshots, no overlap, decoded media, keyboard/focus and
all preserved catalog/footer states. Use isolated fixture if server unavailable,
clearly retain the live gate. Tests may simulate likes only in an isolated mock.

Gap review: real post likes already exist; Character social totals do not.
Do not sum the limited Moments page into Character likes/views. Compact controls
must not copy the current-page Share URL from a detail-only UI. API failures may
include permissions/feature-disabled: disable/retry locally, never fake success.

Pending: Character Follow/Like/View counters, rankings, actual Video readiness,
CMS pinning, source-specific focal-point editing and full-body guarantee with cover.

## Scoped Alignment Amendment (2026-09-06)

Owner: Profiles presentation; base-implementation-owner, unchanged UI actions.
The user's two screenshots supersede the previous centered-circle alignment:

1. Reduce each responsive Header circle diameter by exactly 15% in layout, not
   with a transform. Keep the progressive size differences, Gallery sources,
   rings, names and right inset. Align all circle top edges, not their centers.
2. Put the Featured heading in the information column so it no longer reserves
   a full-width strip above the portrait. The desktop/tablet portrait starts at
   the outer section's existing top content inset; preserve that frame padding.
3. Clip the Featured portrait and its existing edge fade to an 8px corner radius.
   Retain cover, original source/link and the single frame around the full row.
4. Mobile keeps heading, portrait, information and actions in that order. No
   absolute heading overlay or negative-margin overlap. Ordinary cards, Moments,
   heart/view controls, Discover, Follow/Video mockups and all actions stay intact.
5. Verify only focused cards/gallery tests plus Character browser geometry and
   screenshots at 390/820/1440 in existing themes. No new API or data path.

Implementation and evidence: plan 018, CFR-04. Implemented; 25 focused tests and
18 fixture viewport/theme/locale checks passed. Final live rendering remains
pending because localhost:6500 was unavailable after the build.
