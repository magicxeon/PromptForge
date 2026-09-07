# Character Display Image Policy

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: Profiles / Character Profiles. Execution: [plan 030](implementation-plan/030-character-display-policy.md).

## Observed Causes Versus Open Diagnosis

- CharacterLibraryPicker currently selects faceThumbnailUrl before the already
  projected displayImageUrl. This bypasses the chosen Community/gallery artwork.
- Its CSS uses cover/top. Centered CSS alone cannot recover a face cut out of an
  already off-center source thumbnail. The image and CSS causes must be separated.
- CharacterCastingExportService currently derives face/front from fixed sheet
  regions. This is a possible contributor, not verified cause for each user image.
  This task does not authorize rewriting/exporting existing casting assets.

## Display Policy

1. One reusable pure projection chooses display media from the current authorized
   CharacterSummary. Prefer the owner-selected Community/work display image,
   then the authorized automatic display image, then available portrait/front
   preview, then authorized canonical sheet as a contained fallback.
2. Source classification uses displayImageSource, not URL guessing. Reconcile
   existing `characterDiscoveryModel` helpers, schema and server source values.
   A manually selected work retains precedence over an unrelated recent output.
3. Public consumers only receive public-safe display projections; owner consumers
   may use owner-authorized delivery. Do not fetch private history from a public
   picker to reconstruct a missing image or expose a private URL in a public cache.
4. Projection returns presentation properties (source URL/type, fit, position,
   alt identity), not generation inputs. A shared helper belongs to Profiles;
   a generic image component remains controlled and API-independent.
5. For ordinary portrait/work thumbnails use center/center; for canonical
   multi-view sheets use contain/center rather than showing a misleading crop.
   No global translateX, per-character magic offsets or automatic face detection.
6. If a supplied face crop is intrinsically off-center, prefer an existing
   authorized front/portrait preview and inspect with contain. If no centered
   source exists, record a derivative-repair Pending item; do not claim CSS
   fixed the underlying pixels or mutate the canonical generation sheet.
7. Null/broken/revoked media falls through an explicitly bounded fallback list
   and ends in a neutral placeholder. Never loop requests or show another person.

## State / Compatibility

- Resolve images from current server summary, not cached recents thumbnails.
  Recents retain only actor-scoped stable Character IDs, as today.
- Reuse existing profile schema/query keys/authorized image delivery. Failed
  actor/permission checks do not leave the previous actor's portrait visible.
- Preserve Character Gallery's approved presentation and manually chosen artwork.
  UI policy must not change owner featured-image configuration or selection data.
- No mutation to characterReferenceUrl, canonical asset/version, look sheet,
  reference order, metadata provenance or Character handoff eligibility.

## Acceptance

- `CDI-01`: Given display + face URLs, the selected authorized display artwork wins.
- `CDI-02`: Missing artwork uses centered portrait/front then contained sheet;
  broken URLs end in bounded placeholder, never a different Character.
- `CDI-03`: Manual selection beats auto; public visibility and actor isolation hold.
- `CDI-04`: Tests prove reference asset/version/URL unchanged by display selection.
- `CDI-05`: Off-center source pixels are diagnosed separately from layout crop;
  residual source repair is documented rather than hidden by image manipulation.

Server changes are unnecessary when current projections suffice. If a field is
missing, extend the Profiles facade read contract with privacy tests, not direct
cross-capability repository access. No new image cache or durable media path.
