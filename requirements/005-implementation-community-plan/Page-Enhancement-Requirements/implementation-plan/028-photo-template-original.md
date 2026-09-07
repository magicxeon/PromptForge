# Step 4: Photo Template Original And Information Layout

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [027](../027-photo-template-original-and-information.md), PTI-01..06.

## Owner Files / Reuse

Community TemplateDetailRoute/useTemplateDetail, template feature components,
`template-detail.css`, current Community API/schema and EN/TH catalogs.
Reuse routeBuilders, ContextBackLink, MediaStage, CreatorIdentity,
TemplateUseButton, TemplatePricingBadge and accessible dialog primitives.

## Tasks

- [x] P-01 Compare baseline with resource 005: original panel, source owner,
  raw tags, metadata, actions and shell footer as separate responsibilities.
- [x] P-02 Add tests for exactly one top original and distinct source/output
  creators. Keep real titles and authorized image assets.
- [x] P-03 Compose image/info columns with original contain/intrinsic dimensions,
  max constraints, source badge and expand control.
- [x] P-04 Reuse accessible lightbox or existing Dialog primitives; verify modal
  name, Escape, focus trap/return and full original inspection.
- [x] P-05 Order title/owner/description/friendly tags/actions/disclosure; omit
  unmapped internal keys. No automatic copy/title substitutions.
- [x] P-06 Inspect safe public input-policy metadata. Use current projection if
  present; otherwise omit summary and record P-09. Do not start use sessions or
  call private owner-settings APIs to render public explanatory text.
- [x] P-07 Label access fee separately from next-step generation quote. Keep
  original-ID handoff/version/errors and no-auto-generation assertions.
- [x] P-08 Compose existing post Save and canonical-link Share using existing
  hook/utility or scoped controlled wrapper. Test cancellation, clipboard failure
  and selectable-URL fallback. This is not a publication action.
- [x] P-09 Close technical disclosure initially. Preserve View original Post,
  back intent and shared shell/footer; record P-04 rather than global CSS hiding.
- [ ] P-10 Add loading/unavailable/broken-media/long-Thai responsive states.
  Keep current creation list functional until its independent plan 029 changes it.
- [x] P-11 Wire/run `--part=photo-original` with current navigation/handoff tests.
  Inspect full-image and action screenshots at 390/820/1440 across themes.

## Exit / Rollback

PTI criteria pass: complete original, correct owner, real fee, direct entry/
refresh/back preserved. New creation-card styling is a separate gate.
Rollback Detail composition/local CSS only, with no URL migration or pricing API.
