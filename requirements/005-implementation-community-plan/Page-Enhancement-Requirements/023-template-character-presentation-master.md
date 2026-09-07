# Template And Character Presentation Follow-up

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Date: 2026-09-07
Primary: Product Requirement Architect. Reviewers: UX; QA with public-media privacy review.
Review mode: Main implementation review plus independent scoped QA; corrective QA-owned edits are disclosed in the evidence record.
Skills: review-product-ux; verify-release-regressions for gate design/review.

## Outcome

Make Template discovery demonstrate one original and its real public creations;
make Photo Template Detail match resource 005; fix Character display-image
selection across picker/selected previews; replace Landing provider symbols
with supplied brand shapes while preserving current colors.

Implementation was authorized by the user and delivered in scoped slices.
Runtime records and paid-provider execution remain unchanged. See plan034 for
test results, visual evidence, consumer inventory and open live/source checks.

## Sources And Precedence

- [Gallery specification](../Page-Enhancement-resources/001-momelo-template-gallery-ux-ui-spec.md)
- [Gallery mockup](../Page-Enhancement-resources/001-templages-gallery.png)
- [Photo Template specification](../Page-Enhancement-resources/005-photo-templages.md)
- [Photo Template mockup](../Page-Enhancement-resources/005-photo-templages.png)
- [Provider artwork](../Page-Enhancement-resources/provider-icon/)
- Current owners and contracts: requirements 001, 009, 012-022 in this folder;
  `requirements/099-technical-dept/000-master.md`; canonical React modules.

Resource 005 owns the new Detail composition. It supersedes earlier suggestions
to add more original images or a second thumbnail strip beside its main image.
Gallery Featured still demonstrates several public outputs; Detail has exactly
one original above a separate creations grid. Do not crop mockup photographs
or replace real titles with its sample English titles.

Accepted Template input and sharing policy (016-022) overrides obsolete mockup
Face/Product/Scene controls. Character is optional where enabled, outfit front
is required, outfit back is optional where enabled. Pose, scene and independent
face editing stay locked. Derived images cannot become reusable Templates and
their prompts remain private. Duplicate publication prevention stays intact.

## Requirement Map

| Requirement | Owned outcome | Plan |
|---|---|---|
| [024](024-template-public-preview-data.md) | Bounded public family previews and lineage parity | 025 |
| [025](025-template-gallery-featured.md) | Compact header and original-plus-creations Featured | 026 |
| [026](026-template-gallery-cards-and-discovery.md) | Horizontal cards, search/filter layout and lower sections | 027 |
| [027](027-photo-template-original-and-information.md) | Single-original Detail, owner, tags, disclosure and actions | 028 |
| [028](028-photo-template-community-creations.md) | Real output cards, creator credit, sorting and reactions | 029 |
| [029](029-character-display-image-policy.md) | Shared display-image selection and centered fallback | 030 |
| [030](030-character-picker-and-selected-previews.md) | Picker, selection and small Reference tile consumers | 031 |
| [031](031-landing-provider-brand-icons.md) | Supplied provider shapes with inherited existing color | 032 |
| [032](032-presentation-verification-and-pending.md) | Focused test gates, cross-links and pending register | 033 |

Execution coordinator: [implementation master](implementation-plan/023-template-character-presentation-master.md).
Baseline gate: plan 024. Each numbered plan is executable as a small slice only
after authorization, with its own acceptance evidence and stop condition.

## Routes And Boundaries

| Surface | Canonical owner | Change permitted |
|---|---|---|
| `/explore/templates` | Community | Discovery presentation and read-only family previews |
| `/explore/templates/:postId` | Community | Resource 005 Detail composition; same route and root ID |
| `/posts/:postId` | Community | Compatibility checks only; preserve original Post layout |
| `/create/studio/scene` | Scene Builder | Character display binding only; preserve execution |
| Character picker/cards/selected summaries | Profiles | Same authorized display policy at audited consumers |
| `/` | Community | Provider mark artwork only; all other Landing sections frozen |

Profiles owns Character display resolution. Community owns public lineage and
publication visibility. Templates owns version/use-session/input policy.
Generation retains submitted reference values and execution. Shared components
receive controlled presentation props, not feature-specific fetch workflows.

## Protected Invariants

1. No provider/model switch, paid test, prompt rewrite, regeneration, replacement
   keyframe, automatic share or worker restart.
2. No change to Credit quote/reservation/capture, use-session validation,
   ownership, reference order/count, request payload or durable Generation state.
3. Display URLs are never copied over authoritative reference URLs/asset IDs.
4. Public projections exclude private/unlisted/deleted/moderated media. Hiding a
   recorded source never authorizes a substitute public relationship.
5. Existing AppShell, sidebar, search/navigation, footer and non-Template Post
   sections remain unchanged unless a later shell requirement is approved.
6. No fabricated rankings, ratings, uses, identities, verification badges or
   income claims. Public creation count is not Template usage count.
7. Runtime data and already shared records require no migration/backfill.
8. New styles are scoped; shared variants preserve defaults for other consumers.

## Baseline Evidence And Unverified Items

- Source inspection confirms single-image Gallery Featured, vertical Template
  cards and a functioning canonical Detail/creations read use case.
- Picker currently prefers `faceThumbnailUrl`; TemplateScenePanel and reference
  tiles currently use the generation reference as their thumbnail.
- The user reports three shared results from one Template at
  `/explore/templates/post_1786716962811_vz14fvt1`. This is a manual verification
  fixture, not a production constant. Its public lineage/count has not been
  verified in this documentation pass. Previous browser access was unavailable.
- Provider PNG dimensions/alpha were read locally; no artwork was changed.
- No live generation, backend restart, tests or build is needed to author this set.

## Completion And Gap Review

Requirements are ready for implementation planning, not a claim of working UI.
Each slice defines positive/negative states, ownership, regression checks and
rollback. Review findings have explicit resolutions in 032: input-policy
conflicts, fee semantics, version grouping, unsafe blueprint previews, missing
display bindings, mutable cursors, shell scope and low-resolution brand assets.
No unresolved issue requires changing working Generation or commercial behavior.

Implementation completion requires all in-scope acceptance checks, per-page
visual evidence and a residual-risk report. Pending items remain visibly open.
