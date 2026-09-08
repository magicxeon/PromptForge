# Publication And Character Continuity Round

Date: 2026-09-08. Status: Requirements 034-037 implemented in ordered slices;
focused automated gates recorded in Plan 035. Live owner publishing UAT pending.
Execution authorization: user requested sequential implementation. First slice
034 preserves existing Template rights through explicit compatible policy choice.
Approved UX is implemented; legacy repair and private-recipe execution remain pending.
Primary: Product Requirement Architect. Reviewers: UX and QA/privacy, sequential
by the same agent; no independent review claimed. Applied skills: review-product-ux,
verify-release-regressions, review-generative-media-pipeline and implement-generation-workflow.

## Outcome

A creator can publish an image, find it again, understand whether it is reusable,
and generate with an approved Character without losing identity attributes.
Publishing artwork must not require making its Character public or selecting a
Character cover. Cover selection must not grant reuse rights or publish a post.

## Ownership And Requirement Index

| Requirement | Responsibility | Existing owner / dependency |
|---|---|---|
| [034](034-private-image-sharing-default.md) | Private prompt default, explicit Template privacy decision | Community publication; extends 019-022 and 016-018 |
| [035](035-public-work-discovery-and-character-lineage.md) | Public feed visibility, refresh, Character work eligibility | Community reads; Profiles handoff and Generation lineage; extends 004/029/030 |
| [036](036-character-identity-retention.md) | Persist approved identity and preserve it during reuse | Character Profiles, canonical Generation compiler; natural realism remains separate |
| [037](037-sharing-and-character-flow-review.md) | Separate publication, copy-link and reuse intents | Existing Community/Templates/Profiles/Scene Builder facades |
| [Plan 035](implementation-plan/035-publication-and-character-continuity.md) | Ordered tasks, focused tests, rollout and evidence | Coordinates the above; no duplicate runtime owner |
| [038](038-character-profile-maintenance-master.md) | Follow-up: original sheet fallback, confirmed owner deletion, My images cover selection | Profiles; requirements 039-041 and Plan 036 |

Keep current React components, routes, public facades, repository adapters and
server/config/paths.js. No new runtime data directory or parallel publication,
prompt, reference, pricing or generation service is authorized by this plan.

## Evidence Baseline (Before Implementation)

- Prior read-only investigation found source job
  `job_1788791098499_qhhp3esiz` and public/published image post
  `post_1788791286725_wlpi3hcu`. Gallery latest API returned that post first.
- CommunityHomeRoute removes hero/featured IDs from the lower feed. Actual
  browser placement was not verified; API presence is not a visual pass.
- Source history lacks characterProfileContext. It therefore does not qualify
  for Character-linked work selection. A profile association cannot be inferred
  from the image's appearance, caption, username or a matching prompt.
- Ordinary image drafts/default fallbacks still use full prompt visibility.
- Profile versions retain structured selections, but normalized identity metadata
  currently includes age and gender only. Age preservation already exists.
- Further inspection: ShareGeneratedDialog updates share status and Template
  queries but does not invalidate community-posts on publication success.
- CharacterProfileRoute's Share Character action shares/copies the current URL;
  updateSharing separately controls visibility and reuse permission.

These are scoped findings, not a certification of all entry points or runtime
identity quality. Reproduce them with isolated fixtures before implementation.

## Scope Boundaries And Carried Notes

- Approved implementation changes source/UI only: no live runtime JSON edits,
  backfill, provider calls, paid tests or migrations.
- Original-sheet display is now implemented in 039. Cropped casting derivatives
  remain intact for canonical reference/export consumers; this is not an export redesign.
- Normal Scene now uses the shared Character selector/handoff from 037.
- Neither note silently reopens accepted Character display work. The current
  deferred directory is requirements/097-pending-features, not the older 098
  path still referenced in some documents. Do not create a second backlog.
- Favorites, social features, auto face recognition, video provider qualification,
  broad landing redesign, authentication and database migration are excluded.

## Review / Open Gates

1. Resolved: private image default; explicit compatible policy required for Template.
2. Resolved: Publish image, Create Template draft, View post, Copy link, Visibility & reuse.
3. Legacy lineage repair remains evidence-gated. Explicit owner cover selection
   without lineage inference is implemented separately in 041.
4. Resolved: unknown legacy attributes stay non-blocking; owner metadata shows gaps.

Documentation review checks completed: boundaries, dependencies, privacy,
duplicate prevention, recovery, negative cases and per-slice test ownership.
See Plan 035 for per-slice automated evidence and screenshot paths. Live provider
likeness, production publishing and unproven legacy association are not certified.
