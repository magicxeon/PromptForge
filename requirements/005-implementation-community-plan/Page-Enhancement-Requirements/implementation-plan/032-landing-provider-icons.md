# Step 8: Landing Provider Artwork

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [031](../031-landing-provider-brand-icons.md), PBI-01..05.

## Owner Files

- `web/src/components/generation/ProviderMark.tsx` and tests
- `web/src/features/community/components/CommunityProviderDirectory.tsx` and tests
- `web/src/styles/community-home.css` (or existing owning mark styles)
- Proposed runtime asset folder: `client/assets/providers/`

Authoring source PNGs stay untouched. Provider configuration/capabilities and
all other Landing sections are out of scope.

## Tasks

- [ ] M-01 Verify five ID/artwork/provenance mappings; inspect alpha at 18px.
  Record source/license evidence; unresolved distribution rights go to P-08.
- [x] M-02 Copy approved assets to canonical runtime location with clear names.
  Do not trace new logos, generate replacements or use external CDNs.
- [x] M-03 Extend ProviderMark alpha-mask rendering with inherited currentColor,
  normalized ID/data attributes and existing unknown Boxes fallback.
- [x] M-04 Define centered/contained/no-repeat masks with compatible properties;
  retain 34px frame/18px artwork, existing border/background/section accent.
- [x] M-05 Prevent summary flex rules stretching the mark. Test missing asset/
  mask fallback instead of allowing a blank brand symbol.
- [x] M-06 Update mapping tests for supplied known-provider shapes and current
  colors; preserve provider names/unknown fallback. Intentionally obsolete
  generic Lucide-shape assertions are replaced with stronger asset identity tests.
- [x] M-07 Wire/run `--part=provider-icons` and provider-directory tests. Preserve
  catalog availability/model counts and expand/collapse.
- [x] M-08 Screenshot/pixel-check five masks in each theme at 390/820/1440:
  alpha, optical scale, BytePlus transparent background and sharpness.
- [x] M-09 Compare Landing sibling/sidebar baseline, record mark-only diff and
  asset provenance; no unrelated gradient or palette tweaks.

## Exit / Rollback

PBI criteria pass with recognizable supplied shapes, existing palette and no
catalog changes. Inadequate source resolution goes to P-08, not an invented logo.
Rollback mark mapping and runtime assets introduced here only.
