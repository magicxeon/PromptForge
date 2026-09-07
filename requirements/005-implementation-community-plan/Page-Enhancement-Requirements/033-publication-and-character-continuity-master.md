# Publication And Character Continuity Round

Date: 2026-09-07. Status: Requirements recorded; implementation NOT started.
Execution authorization: HOLD for user discussion of flow and open decisions.
Primary: Product Requirement Architect. Reviewers: UX and QA/privacy, sequential
by the same agent; no independent review claimed. Applied skill: review-product-ux.
Implementation must additionally route identity/reference work through the media
review and generation workflow skills when those contracts are changed.

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
| [037](037-sharing-and-character-flow-review.md) | Current flow inventory and proposed simpler UX | Existing Community/Templates/Profiles/Scene Builder facades; discussion gate |
| [Plan 035](implementation-plan/035-publication-and-character-continuity.md) | Ordered tasks, focused tests, rollout and evidence | Coordinates the above; no duplicate runtime owner |

Keep current React components, routes, public facades, repository adapters and
server/config/paths.js. No new runtime data directory or parallel publication,
prompt, reference, pricing or generation service is authorized by this plan.

## Evidence Baseline

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

- This turn writes requirements only: no runtime JSON edits, backfill, provider
  calls, paid tests, migrations or app implementation.
- Previous request to stop undesirable approval-time Character cropping remains
  recorded for later: inspect derivative pixels versus CSS, retain canonical
  three-view asset, approve display behavior before changing exports.
- Previous request for a shared Character picker in normal Scene Builder remains
  an ordered candidate in 037, using the existing Template picker/handoff.
- Neither note silently reopens accepted Character display work. The current
  deferred directory is requirements/097-pending-features, not the older 098
  path still referenced in some documents. Do not create a second backlog.
- Favorites, social features, auto face recognition, video provider qualification,
  broad landing redesign, authentication and database migration are excluded.

## Review / Open Gates

1. Decide Template behavior when prompt is private; never silently change it to full.
2. Approve the proposed user-facing action model in 037.
3. Decide legacy image association recovery only if trusted provenance is absent.
4. Choose identity handling when required attributes are absent in legacy versions;
   show missing data and preserve references, never guess ethnicity/age from pixels.

Documentation review checks completed: boundaries, dependencies, privacy,
duplicate prevention, recovery, negative cases and per-slice test ownership.
Application acceptance and live UAT remain NOT RUN.
