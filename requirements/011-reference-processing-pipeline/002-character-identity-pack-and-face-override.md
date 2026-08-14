# RPP-002 Character Identity Pack And Face Override

**Requirement ID:** RPP-002  
**Status:** Implemented; automated and manual validation pending
**Owner:** Character Profile and Reference Processing  
**Depends on:** RPP-001, Character Profile lifecycle, Asset ownership,
Generation provider planning and React reference-slot controls

## 1. Problem

A three-view Character Reference is strong authority for height, body shape,
body proportions, hair silhouette and full-body consistency. Its face is small
inside the sheet and may not provide enough facial detail for reliable identity
preservation.

Manual generation review found that sending the Character three-view together
with a stable face image produces more consistent facial identity and stronger
overall results. Users should receive this behavior when selecting a system
Character without having to locate and attach the same Face Reference again.

The current reference lockout model must also distinguish between:

- guided facial attribute controls, which conflict with reference-owned
  identity; and
- the Face Reference slot, which is a valid explicit identity override.

Selecting a Character must not disable or hide the Face Reference slot.

## 2. Product Contract

Every newly approved system Character version must expose one logical
`CharacterIdentityPack`:

```text
CharacterIdentityPack
- characterProfileId
- characterProfileVersionId
- canonicalThreeViewAssetId
- canonicalFaceAssetId
- characterType: reusable_model | styled_character
- outfitBehavior: replaceable | preserve
- identityPolicyVersion
- assetLineage[]
```

The pack is selected as one Character in the UI. Reference Processing expands
it into the provider-ready assets required to preserve the same person:

```text
body authority  -> canonical three-view image
face authority  -> canonical face image
```

The user does not need to populate the Face Reference slot for this default
behavior.

## 3. Canonical Face Rules

The canonical face image is an identity anchor, not an Expression pack.

It must:

- depict the same approved Character version;
- retain recognizable face, skin tone, hairstyle and facial proportions;
- provide sufficient face resolution for provider identity preservation;
- use a neutral or restrained natural expression;
- have actor-owned or authorized public Character lineage;
- remain immutable for that approved Character version; and
- never introduce independent clothing, pose, scene or style authority.

Expression variants, emotion libraries and automatic emotion selection are out
of scope for this requirement. Expression remains a prompt/attribute direction
under the existing authority policy.

Canonical face source priority:

1. an approved owned Face Creation source already linked in Character lineage;
2. an owner-approved full-resolution identity portrait linked to the Character;
3. a reviewed deterministic derivative from the front view for legacy data.

An uncertain automatic crop must not silently become the permanent identity
anchor. Legacy Characters without a trustworthy face source must be marked for
owner review or use an explicit compatibility fallback until migrated.

## 4. Explicit Face Reference Override

The Face Reference slot remains visible and enabled while a Character Reference
is selected. Its UI label should communicate that it is optional and overrides
the Character's default face anchor.

When no explicit Face Reference is supplied:

```text
Character three-view + Character canonical face
```

When an explicit Face Reference is supplied:

```text
Character three-view + explicit Face Reference
```

The explicit Face Reference replaces the internal canonical face in the
provider plan. It must not be appended as a third competing face authority by
default. Character body proportions, height relationship and Character outfit
policy continue to come from the selected Character version.

Removing the explicit Face Reference restores the Character's canonical face
without requiring the Character to be selected again.

## 5. UI Authority Behavior

The following distinction is mandatory:

| UI surface | Character selected | Character + explicit Face selected |
|---|---|---|
| Face Reference slot | enabled as optional override | enabled, populated and removable |
| Face Shape/Eyes/Eyebrows/Nose/Lips identity controls | disabled | disabled |
| Expression | editable | editable |
| Hair/Skin/Body identity controls | disabled | disabled |
| Clothing for Reusable Character | editable | editable |
| Clothing for Styled Character | disabled | disabled |

The UI must not display the pack's internal canonical face as if the user had
manually populated the Face Reference slot. It may show a compact note or
thumbnail stating that the Character already includes a face identity anchor.

## 6. Reference Authority And Provider Planning

Reference Processing remains the only owner of asset expansion, ordering and
conflict resolution.

- Client features submit the selected Character version and optional explicit
  Face Reference; they do not manually assemble the identity pack.
- Character Profile resolves authorized canonical assets.
- Reference Processing creates the effective identity plan.
- Provider adapters receive ordered references and role-specific instructions.
- Credits and provider-capability checks use the effective dispatched reference
  count, including the canonical face when it is actually sent.
- Comparison slots use the same logical pack but may produce provider-specific
  plans according to each model's reference limits.
- A provider limit must not cause silent face or body authority loss. The plan
  must use an approved composite derivative, documented provider fallback, or
  block before Credit reservation with an actionable message.

Recommended authority order:

1. explicit Face Reference, when present, owns facial identity;
2. otherwise the Character canonical face owns facial identity;
3. Character three-view owns body, proportions, hair silhouette and identity
   continuity outside detailed facial features;
4. Character type owns outfit preservation or replacement behavior; and
5. destination Expression, Pose, Camera, Lighting and Environment remain
   editable according to the existing policy.

## 7. Persistence, Privacy And Lineage

- Canonical identity assets inherit Character ownership and visibility.
- Selecting a private Character must not expose either internal asset outside
  the authorized actor scope.
- A public/shared Character may expose generation use without exposing raw
  private asset URLs.
- Job lineage records Character version, canonical three-view asset, effective
  face source, whether an explicit override was used, policy version,
  provider ordering and dispatched reference count.
- History and public snapshots store stable authorized IDs rather than Base64
  data or unprotected local paths.
- Changing the canonical face creates a new Character visual version; it does
  not mutate historical jobs.

## 8. Migration

Existing approved Characters remain usable during migration.

Migration must classify each version as:

- `identity_pack_ready`: three-view and trusted canonical face available;
- `identity_pack_review_required`: candidate face exists but needs owner review;
- `identity_pack_legacy_fallback`: no trusted face is available yet.

Migration must be idempotent and must not generate paid AI assets silently.
Owner review, deterministic derivatives and any future paid regeneration must
remain separate, auditable actions.

## 9. Acceptance Criteria

- Selecting a system Character automatically produces an effective body and
  face identity plan without manual Face attachment.
- The Face Reference slot remains enabled when a Character is active.
- Adding a Face Reference replaces only the pack's face anchor and does not
  remove Character body authority.
- Removing the override restores the canonical face immediately.
- Facial identity controls remain disabled while Expression remains editable.
- Reusable and Styled outfit behavior remains unchanged.
- Effective provider reference count matches Credit estimate and dispatch.
- Provider-limit fallback never drops an identity authority silently.
- Generation lineage identifies the exact Character and face assets used.
- Studio, Scene Builder, Playground, Comparison, Template use and Fashion use
  the same canonical behavior.
- No Expression pack or emotion-generation workflow is introduced.

## 10. Manual Verification

1. Select a Reusable Character without a manual Face Reference and generate the
   same Scene three times. Confirm the face follows the canonical face while
   body proportions follow the three-view.
2. Add a different authorized Face Reference. Confirm body proportions remain
   from the Character and facial identity follows the explicit override.
3. Remove the override. Confirm the canonical Character face returns.
4. Repeat with a Styled Character and verify its outfit remains preserved.
5. Compare normal and Comparison generation and inspect reference ordering,
   estimate, dispatched count and lineage.
6. Verify private Character identity assets cannot be fetched by another actor.

## 11. Implementation Record

Implemented through the canonical Character Profile, Reference Processing and
Generation entry points:

- Character versions now normalize and migrate canonical three-view, canonical
  face and identity-pack readiness metadata through
  `CharacterProfileVersionRepository`.
- `CharacterUsageService` resolves actor-authorized pack assets and immutable
  Character policy metadata.
- `prepareGenerationReferences` expands the logical Character selection into
  three-view plus canonical face, while an explicit Face Reference replaces the
  canonical face only.
- Reference Processing keeps Face as detailed identity authority, Character as
  body authority, blocks before Credit reservation when provider capacity is
  insufficient, and records source/derivative lineage.
- Structured provider briefs name separate face and body source images when the
  selected provider uses the Fashion JSON brief.
- The shared Face Reference slot remains available and describes its optional
  Character-face override behavior.
- `scripts/migrate-character-identity-packs.mjs` performs an idempotent metadata
  migration only; it never requests a paid AI asset.

## 12. Face Handoff Lineage Regression

Manual closure run TC1 exposed a lineage gap between Face Creation and
Character Profile creation. The Character Sheet provider received the Face
image, but the actor-bound handoff Job ID was retained only as authorization
metadata and was not copied into `characterSheetConfig.sourceHeadshotIds`.
Character approval then treated a low-resolution crop from the three-view sheet
as the canonical face even though the original owned Face output was trusted
and available.

Required behavior:

- an authorized Face handoff contributes its generation Job ID to the effective
  `faceReferenceJobIds` and Character Sheet `sourceHeadshotIds`;
- Character Profile creation and new identity-version creation select the first
  trusted source Headshot Job as `canonicalHeadshotAssetId` and
  `canonicalFaceAssetId`;
- a three-view face crop remains a display/review fallback only and must not
  replace a trusted Face Creation source;
- Character conversion carries existing canonical face lineage forward; and
- regression tests cover both handoff-to-Character-Sheet persistence and
  Character-Sheet-to-Character-Version canonical face selection.

Observed closure run IDs:

```text
Face Job: job_1786677761105_7ct2jhrk3
Character Job: job_1786678828852_u85246g10
Character Profile: charprof_1786678978650_uwpiv6u8
Character Version: charver_1786678978658_8is52ngb
Scene Job: job_1786679207610_5p6o0zd66
```

The Scene prompt included the 20-23 age directive and Reference Processing
dispatched two roles. The failed identity/age result was therefore attributed
to the wrong canonical face source, not a missing age prompt or missing Scene
reference count.

Automated coverage was added to `test/playgroundReferenceRoles.test.js` for the
system-pack role exception, default canonical face, explicit override and
structured face/body authority contract.

## 13. Character Presentation Option Projection

Selecting a Character Reference must also constrain guided Attribute choices
to the Character's recorded presentation where the catalog explicitly marks an
option as male- or female-specific.

- Character Profile handoff uses `compatibleAttributeSnapshot.Gender` from the
  approved immutable Character version.
- A Character Sheet selected from owned History may use its recorded
  `selections.Gender` value.
- The projection filters both text dropdowns and Visual Character cards through
  the same shared Attribute model.
- Gender-specific applicability includes `adult-male`, `adult-female`,
  `male-body-silhouette`, `female-body-silhouette`, `outfit-base-male` and
  `outfit-base-female` catalog tags.
- A selected stale option that conflicts with the new Character presentation
  is cleared through the existing reconciliation path.
- A raw uploaded Character image without trusted presentation metadata must not
  be classified from pixels or filenames. Only neutral options remain
  available until an authorized Character/Profile source supplies metadata.
- Options in every text dropdown and matching Visual Character collection are
  presented alphabetically by their visible label. Sorting is a view concern;
  it never mutates catalog order, prompt order, IDs or saved selections.

Acceptance coverage must prove male/female Character projection, stale
selection cleanup, alphabetical dropdown order and matching alphabetical visual
card order.

Implementation record:

- approved Character versions compact their selected Gender into immutable
  `identityMetadata.presentationGender` for downstream policy enforcement;
- Scene Builder resolves the same presentation from an approved Character
  handoff or an owned Character Sheet History item without classifying image
  pixels;
- the shared Guided Attribute Form filters dropdowns and Visual Character cards,
  clears stale incompatible selections and presents visible labels in
  alphabetical order without mutating catalog order; and
- the neutral `Outfit Base` visual manifest remains available before trusted
  presentation metadata is known, while male/female manifests are selected once
  Character presentation is resolved; this invariant is covered by a registry
  regression test so filtering cannot silently remove the existing visual row;
  and
- server prompt compilation applies the canonical Character presentation again,
  preventing a stale or tampered client selection from adding an incompatible
  gender-specific phrase to the provider prompt.
