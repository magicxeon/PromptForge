# Step 6: Character Display Source And Centering Policy

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [029](../029-character-display-image-policy.md), CDI-01..05.

## Canonical Files

- `web/src/features/profiles/components/characterDiscoveryModel.ts`
- `web/src/features/profiles/components/CharacterPortrait.tsx`
- `web/src/features/profiles/schemas/profileSchemas.ts` and `api/profileApi.ts`
- `server/domain/character-profiles/CharacterProfileSharingService.js`
- `server/domain/character-profiles/CharacterProfileService.js`
- `CharacterCastingExportService.js` for read-only source-crop diagnosis

Proposed pure helper: `web/src/features/profiles/characterDisplayImage.ts`.
No second Profile fetch workflow, thumbnail cache or media-generation service.

## Tasks

- [x] I-01 Inventory displayImageSource values in owner/public projections and
  current Gallery helper precedence; capture behavior in tests.
- [ ] I-02 Inspect sample work/front/face sources without editing them. Separate
  off-center source pixels, portrait CSS crop and layout offset; record diagnosis.
- [ ] I-03 Create selected-public/auto-work/front/face-only/sheet-only/revoked/
  broken/missing/actor-switch fixtures.
- [x] I-04 Implement single authorized resolver returning URL/type/fit/position;
  selected display artwork wins. Reconcile existing helpers by delegation or
  explicit compatibility, never two competing precedence rules.
- [x] I-05 Preserve public/owner delivery authorization. Add optional missing
  fields through Profiles facade/schema only if needed, with public privacy tests.
- [x] I-06 Bound failure fallback, center portraits and contain sheets. Do not
  change export crop logic or rewrite existing outputs; record P-06 if needed.
- [x] I-07 Assert no change to canonical reference URL/asset/version, eligibility
  or persisted owner-selected featured image.
- [x] I-08 Wire/run `--part=character-display` and existing model/Card/Portrait
  tests. Use non-central source subjects in visual fixtures to expose crop errors.

## Exit / Rollback

CDI criteria and actual source diagnosis establish safe use by plan 031. Existing
Character Gallery artwork/header layout stays intact. Source derivative repair
requires separate approval/bounds; stop that repair only. Rollback display helper
adoption, not generation sheets or user configuration.
