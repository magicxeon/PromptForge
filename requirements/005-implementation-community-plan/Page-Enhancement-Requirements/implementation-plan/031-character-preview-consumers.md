# Step 7: Picker And Selected Character Preview Binding

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [030](../030-character-picker-and-selected-previews.md), CPC-01..06.

## Owner Files

CharacterLibraryPicker, CharacterPickerDialog, TemplateScenePanel,
SceneBuilderRoute, ReferenceSlotGrid, current GenerationExperience/
StudioGenerationWorkspace composition, template-scene.css/references.css,
existing Profiles/Scene context and tests. Optional display props preserve all
consumers that do not provide a selected Character.

## Tasks

- [x] V-01 Complete changed/already-compliant/actual-input-inspector/Pending
  caller matrix across Studio, Fashion and shared Character consumers.
- [x] V-02 Apply 029 to Current/Recent/Mine/Community picker lists, preserving
  search/scope/cursor/recents/eligibility and pending guards.
- [x] V-03 Bind selected display image to TemplateScenePanel using Character
  ID/version, keeping authoritative reference separate.
- [x] V-04 Thread optional display-only thumbnail props through current workspace
  into ReferenceSlotGrid. Absence preserves ordinary upload behavior. Never
  overload reference `value`/snapshots with a display artwork URL.
- [ ] V-05 Clear binding on reference replacement/removal/upload, actor/Character
  change or Template exit. Restore only from trustworthy context ID and current
  authorized summary; do not persist image URLs/Base64 in new state.
- [x] V-06 Keep reference-processing inspection truthful. Distinguish selected
  Character artwork from actual input using concise accessible labels/tooltips.
- [ ] V-07 Capture isolated prepare/submit before/after: same reference URL/asset/
  version/order/count; display URL absent from prompt/compiler/provider payload.
- [ ] V-08 Test rapid selection, late handoff after actor switch, failed selection,
  reload/back, missing ID and revoked artwork; no stale previous portrait.
- [x] V-09 Wire/run `--part=character-consumers`, Scene Template/recents/policy
  and ReferenceSlotGrid compatibility tests, with no provider execution.
- [ ] V-10 Inspect picker and both tiny selected previews at 390/820/1440 in
  themes: public work, centered fallback, sheet-only and long Thai names.

## Exit / Rollback

CPC criteria cover both screenshot problems: selection cards and left/right
small previews. Mock payload proves unchanged authoritative reference.
Rollback optional bindings/consumer adoption only; no live draft deletion or
runtime migration. Explicitly report any audited consumer excluded from scope.
