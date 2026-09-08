# Character Profile Maintenance

Status: Implemented 2026-09-08; focused verification recorded in Plan 036.
Live destructive UAT remains deliberately separate.
Parent: 033-publication-and-character-continuity-master.md.

Primary: Product Requirement Architect. Reviewers: UX and QA (including owner
authorization, public-media consent and destructive-action review). Roles are
applied sequentially; independent review is unavailable. Skills: review-product-ux,
verify-release-regressions. Generation workflow guardrails also reviewed for
retaining completion usage after deletion. No provider, Credit, Queue or
settlement change; new authorization denies reuse while accepted work retains
its historical usage event through the existing completion handler.

## Scope And Order

1. [039](039-character-original-sheet-fallback.md): original sheet display.
2. [040](040-character-owner-deletion.md): confirmed owner soft deletion.
3. [041](041-character-owner-cover-selection.md): explicit owner cover selection.
4. Verify each group before closure; inspect adjacent actions and responsive UI.

Owning implementation plan:
[036](implementation-plan/036-character-profile-maintenance.md).

Profiles owns lifecycle and cover selection; Generation supplies authorized
result reads; Community retains publication ownership. Reuse existing routes,
repositories, CharacterProfileHero and CharacterFeaturedImagePicker. No new data
store, face matching, inferred lineage, bulk media removal or public visibility
change. Preserve manually chosen covers, original references, Looks, Jobs,
posts, creator attribution, Credits and financial history.

This round supersedes the crop deferral in 033 and covers the explicit owner
cover selection deferred in 035 LIN-05, but does NOT authorize lineage backfill.
Reference: supplied owner-profile screenshot and
`/me/characters/charprof_1788790861146_136la6jq`.
