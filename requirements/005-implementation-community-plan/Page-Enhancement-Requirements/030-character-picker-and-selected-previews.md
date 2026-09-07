# Character Picker And Selected Preview Consumers

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Depends on [029](029-character-display-image-policy.md).
Execution: [plan 031](implementation-plan/031-character-preview-consumers.md).

## Owned Surfaces

| Surface | Current owner | Required change |
|---|---|---|
| Choose Character, Mine/Community/Recently used/Current | Profiles CharacterLibraryPicker + controlled CharacterPickerDialog | Use identical display policy, centered fallback |
| Template Scene selected Character summary | Scene Builder TemplateScenePanel | Display selected Character artwork, not generation sheet |
| Small Character reference tile | shared ReferenceSlotGrid | Optional display-only thumbnail binding; preserve actual value |
| Other Character summary/picker consumers | Profiles, audited existing callers | Reuse policy where same display role; preserve layout/workflow |

This does not reopen Character Gallery layout, Cinematic video work or casting
sheet inspection. Inspectors intentionally showing actual references continue
to do so. A raw uploaded reference with no Character identity is not replaced
by a Community image.

## Binding Contract

1. Keep Character ID/version and selected display projection separate from
   `character_reference` URL/asset. Presentation may use an optional
   `displayPreviews.character_reference` prop on the existing generation UI.
2. Bind preview to actor + Character ID/version + actual reference identity. Use
   it only while the authoritative value matches. Replace/remove/upload, Template
   exit or actor switch immediately clears stale artwork/name.
3. Reload/back restoration uses any existing Character context ID to refetch the
   authorized summary. Do not persist Base64, signed URLs or a second copy of
   template/reference state. If no trustworthy ID exists, show the actual
   reference fallback, not a guessed Character.
4. Propagate display-only data through existing SceneBuilderRoute/GenerationExperience
   composition. Do not serialize it into prompt snapshots or provider payloads.
5. Picker selection still requests the existing server Character handoff;
   unavailable/restricted Character remains unavailable. Store recents only
   after successful selection. Rapid click/actor-switch race guards remain.
6. Tiny thumbnail represents selected Character; existing reference-processing
   inspection continues to show the actual canonical reference when inspected.
   Keep accessible labels/tooltips distinct so display artwork is not presented
   as the exact provider input. Do not obscure diagnostics about reference failures.

## Reuse And Blast Radius

- Pure display policy from 029, AuthenticatedMediaImage and controlled picker.
- Extend ReferenceSlotGrid with optional props whose absence preserves current
  rendering/behavior. Do not update every reference role or reset uploads.
- Audit all CharacterCard, CharacterPortrait, CharacterLibraryPicker,
  ReferenceSlotGrid and Character handoff callers before applying shared policy.
  List every caller as changed / already compliant / actual-input inspector /
  pending with reason. No untracked promise of application-wide completion.
- Fashion, Studio, Playground and Comparison get compatibility checks where
  shared components are used; no provider or Generation behavior is redesigned.

## Acceptance

- `CPC-01`: Current/recent/community picker and selected Scene summary show the
  same authorized display artwork for the same Character.
- `CPC-02`: Small reference thumbnail uses that artwork, but captured mock submit
  has exactly the original reference URL/asset/version/order/count.
- `CPC-03`: Remove, direct upload, Character change, actor switch, exit and reload
  never retain a stale portrait or silently alter other references.
- `CPC-04`: Fallback sheet is centered/contained; actual reference inspection stays truthful.
- `CPC-05`: Picker search/pagination/error/pending/focus and recents are unchanged.
- `CPC-06`: Consumer audit and 390/820/1440 visual evidence are recorded.

Rollback optional display props/policy adoption only; selected canonical
references and runtime data do not require migration or reversal.
