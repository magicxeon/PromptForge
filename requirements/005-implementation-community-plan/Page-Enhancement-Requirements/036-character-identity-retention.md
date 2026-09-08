# Approved Character Identity Retention

Parent: [033](033-publication-and-character-continuity-master.md).
Status: Implemented 2026-09-08; deterministic verification in Plan 035.
Live likeness/apparent-age output qualification remains pending paid UAT.
Owners: Character Profiles and Generation.

Compatibility choice: keep unknown legacy attributes non-blocking, explicitly
report missing fields in owner identity metadata; never infer them from pixels.
Preserve existing permissions and provider/reference/price contracts. Additive
metadata and one canonical directive are verified before consumer integration.

## Existing Foundation

CharacterProfileService stores structuredCharacterSnapshot on versions.
characterIdentityMetadata derives ageRange and presentationGender;
CharacterUsageService passes an authorized identity pack to Generation.
generationRequestService already adds an apparent-age directive for character_usage.
promptCompiler supports Gender/Age/Ethnicity/Beauty from active selections, but
that does not prove all reusable Character flows retain the source selections.
Do not add a competing compiler or repeat the existing age guard verbatim.

## Rules

- ID-01: Preserve owner-authored identity attributes on the approved version:
  age/range, configured gender/presentation, ethnicity and Beauty selection,
  plus selected stable facial/skin/body characteristics needed for likeness.
  Retain stable attribute ID and normalized value, with metadata schema version.
  Do not duplicate the entire catalog, embed Base64 or expose private snapshots.
- ID-02: Inspect Face -> Sheet -> Profile data transfer, not only Profile reuse.
  Source attributes must survive reference-based Sheet creation/approval; an
  empty current selection map must not overwrite known approved identity.
- ID-03: Server-resolved approved version is authoritative, never client-supplied
  gender/age claims or a stale thumbnail. Use one canonical identity directive
  integrated into the existing compiler and refinement path, including manual
  and Template branches where Character reuse is supported.
- ID-04: Every supported Character reuse consumer must preserve that directive.
  Inventory Scene, Template Scene, Fashion, Playground and Cinematic consumers;
  map any intentionally different compiler to a parity gate before declaring
  coverage. Video provider qualification remains outside scope; do not silently
  dispatch unsupported references or bypass trusted-source/provider policy.
- ID-05: Keep identity separate from outfit, pose, camera, environment and
  rendering realism. Natural realism remains Studio Face/Sheet/Scene only;
  this identity work does not enable that style recipe in other surfaces.
- ID-06: Interpret Beauty as the selected appearance intent, not repeated facial
  beautification. Makeup/style attributes are not permanent facial anatomy.
  Preserve age and geometry from the approved reference; no automatic age
  inflation, ethnicity inference, invented features or generic face replacement.
- ID-07: Missing legacy metadata uses known structured selections where safe.
  Unknown data stays unknown; surface a recoverable metadata gap, not a fabricated
  age/ethnicity. Whether incomplete profiles block generation requires discussion.
- ID-08: Metadata updates produce the existing versioned lifecycle; no rewrite
  of prior approved versions, historical prompts or generated output. Record
  source identity version in provenance without leaking private attributes.

## Tasks And Verification

1. Trace source attributes through each creation/reuse entry point; record matrix.
2. Define additive metadata schema/normalization, backwards-compatible readers,
   validation and immutable version updates within existing Profiles contracts.
3. Preserve identity during Face-to-Sheet creation and Profile approval.
4. Extend canonical identity directive; enforce after optional AI refinement
   without duplicated clauses or conflicts with Template/reference authority.
5. Integrate one reuse consumer at a time, verifying preserved identities and
   unchanged reference count, provider settings, estimates and output behavior.

Focused tests: attribute retention, empty/missing/invalid legacy fields,
authorized version resolution, age/gender/ethnicity/Beauty semantics,
selection clearing, manual/structured/Template/refine branches, cross-actor
rejection and read-only public projections. Fixture assertions verify prompt
content and reference contracts, not actual likeness or apparent age in output.
Live perceptual UAT needs an explicitly approved provider/model/budget; not run
by automated aggregate tests. Missing live evidence cannot be marked qualified.

## Evidence / Pending

Design reference (not a separate runtime owner):
requirements/099-technical-dept/Technical-Documents/momelo-character-generation-prompt-guideline.md
for identity versus scene authority. Google's image-generation guide recommends
reusing generated reference images for character consistency across views:
https://ai.google.dev/gemini-api/docs/image-generation#character-consistency-360-view
(reviewed 2026-09-07). Text + reference improves control, not a guarantee of likeness.

Pending: conflicts between authored attributes and approved pixels require owner
review; do not let an AI infer replacements. Preserve legacy unknowns on rollout.
Rollback disables new prompt composition while retaining additive version data.

## Implemented Contract And Consumer Matrix

- Metadata schema 2 adds allowlisted stable attributes with ID/value and
  missingFields alongside backwards-compatible ageRange/presentationGender.
  Values are bounded; URL/Base64, outfit, pose, makeup and scene fields are excluded.
- prepareGenerationReferences replaces incoming Sheet identity metadata with
  server-owned source data after canonical reference processing. Exactly one
  owned headshot may supply inherited attributes; ambiguous/foreign sources do not.
- CharacterProfileService uses the same resolver on creation/new identity version.
  Empty Sheet selections do not erase known Face identity. Existing versions and
  prior generation prompts are never rewritten. Owner detail exposes missingFields.
- applyCharacterIdentity is the one additive compiler/refinement guard. It keeps
  authored gender, age, ethnicity, Beauty intent and stable anatomy separate from
  outfit/scene. Natural realism scope remains unchanged. Empty prompts stay empty.

| Consumer | Canonical path / evidence |
|---|---|
| Face -> Sheet | owned source -> reference preparation -> characterSheetConfig.identityMetadata -> existing job/history storage |
| Sheet -> Profile | shared resolver -> immutable Character Profile version metadata |
| Scene / Template Scene | authorized handoff -> CharacterUsageService -> canonical Generation compiler/refinement |
| Playground image | same Generation entry point; reference role parity tests retained |
| Fashion images | existing prepared Generation context/compiler; no Credit/price changes |
| Cinematic storyboard images | existing storyboard composition plus canonical identity guard; no multi-cast remapping |
| Video | unchanged approved-reference/Look and provider validation; no video prompt rewrite or provider qualification claimed |

Focused identity tests cover normalization, unknown/invalid fields, inherited
owned source, foreign/ambiguous source, compiler surfaces, refinement reattachment
and idempotent wording. Destination tests prove forged client metadata is replaced.
Tests validate contracts, not the resemblance or age of newly generated pixels.
