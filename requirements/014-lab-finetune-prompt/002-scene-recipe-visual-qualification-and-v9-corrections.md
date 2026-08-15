# Scene Recipe Visual Qualification and v9-v10 Corrections

**ID:** `015-002-scene-recipe-v9-corrections`
**Status:** Catalog v10 implemented; Storefront v3 and Low-angle v2 owner-qualified, Color-light v3 awaits visual review
**Owner:** Prompt Research Lab, promoted through Attribute Catalog and Generation configuration
**Production artifacts:** `attributes/014-camera.json`, `attributes/024-fashion-commerce.json`, `server/config/scene-pose-recipes.json`

## 1. Qualification Evidence

Owner review on 2026-08-08 recorded these outcomes:

| Recipe | Qualified result |
|---|---|
| Street Walk Editorial v2 | Accepted: lighting and pose are good |
| Soft Character Portrait v2 | Accepted for the evaluated identity portrait fixture |
| Sunlit Storefront v2 | Needs correction: face and outfit front are not reliably visible |
| Low-angle Campaign Hero v1 | Rejected: subject is too distant and concrete forms replace the intended high-rise context |
| Color-light Editorial v1 | Rejected: the set receives color but the subject remains neutrally lit |
| Sunlit Storefront v3 | Accepted on 2026-08-08: face, outfit presentation and overall result look good |
| Low-angle Campaign Hero v2 | Accepted on 2026-08-08 with a consistency note: some runs are weaker and remain candidates for later optimization |
| Color-light Editorial v2 | Composition accepted, but rejected for final promotion because cyan and magenta blend into a low-contrast purple family |

Acceptance applies to the evaluated fixtures. It does not claim identical
behavior across every provider or model.

## 2. Sunlit Storefront v3

Hard constraints:

- torso stays within 30 degrees of the camera axis so garment front
  construction and silhouette remain readable;
- facial plane stays between 0 and 30 degrees from the camera axis;
- both eyes remain visible and the result must not become a side profile;
- existing wall contact, crossed-ankle balance, diagonal storefront depth and
  motivated sunlight remain intact.

The Recipe continues using shared storefront pose, gaze, venue and sunlight
Attributes. Pro Mode receives the same corrected pose and gaze options.

## 3. Low-angle Campaign Hero v2

The former combination of `Environmental Portrait`, `Slightly Low Angle` and a
generic `Brutalist Architecture` venue was too weak and too ambiguous.

Version 2 requires:

- a close dominant subject occupying approximately 86-92% of frame height;
- a camera around knee-to-low-waist height, tilted 15-25 degrees upward;
- anatomically credible perspective without oversized shoes, stretched limbs
  or a tiny head;
- a real commercial district with glass-and-steel high-rises, glazed facades,
  converging vertical lines and visible sky; and
- no isolated concrete slab, blank cement pillar, abstract monolith or
  impossible architecture.

Dedicated canonical Attributes own close framing, pronounced low perspective,
rising composition and the high-rise environment so Pro Mode can use the same
directions without copying Simple Mode prose.

## 4. Color-light Editorial v2

Version 2 uses two physically motivated sources:

- a cyan/blue key visibly crosses one side of the face, skin, torso, arms and
  garment; and
- a magenta/red rim visibly traces the opposite cheek, hair, shoulder, arm and
  garment edge.

Both sources spill coherently onto the nearby background. The face remains
recognizable, skin texture remains natural, garment construction remains
readable and the original garment color remains inferable beneath the effect.
The subject must never remain neutral while only the background is colored.

### 4.1 Color-light Editorial v3

Version 3 replaces the related cyan/magenta family with a decisive
hot-versus-cool pair:

- a deep saturated cobalt-blue key illuminates approximately 40-50% of the
  face, skin, torso, arm and garment from camera-left;
- a saturated scarlet-red side/rim source illuminates the opposite facial,
  hair, body and garment planes from camera-right at comparable exposure;
- the two fields remain visibly blue and red with only a narrow controlled
  transition instead of blending into magenta, violet or purple;
- neutral fill is at least 2.5 stops below the colored sources and exists only
  to retain readable eyes, identity and textile construction; and
- a matte charcoal studio and clear atmosphere provide neutral receiving
  planes without fog-driven color mixing or decorative colored walls.

The original garment color needs to remain inferable in the narrow neutral
transition, but exact product-color qualification is not the purpose of this
editorial Recipe.

## 5. Promotion

- Recipe catalog advances to `2026-08-professional-9`.
- `Sunlit Storefront` advances to version 3.
- `Low-angle Campaign Hero` advances to version 2.
- `Color-light Editorial` advances to version 2.
- Catalog `2026-08-professional-10` advances `Color-light Editorial` to version
  3 after owner review found version 2 insufficiently separated.
- Prompt compilation remains behind the canonical Generation workflow.
- No provider dispatch, Credit or UI-specific compiler is introduced.

## 6. Automated Acceptance

- Every Recipe selection resolves to an enabled canonical Attribute ID.
- Compiled Storefront prompt contains the 0-30 degree face/torso contract and
  excludes a side profile.
- Compiled Low-angle prompt contains close framing, pronounced upward camera,
  glass high-rises, converging architecture and visible sky.
- Compiled Color-light prompt explicitly lights both subject and set, names
  cobalt blue and scarlet red, limits overlap to a narrow transition, bounds
  neutral fill and prohibits purple/pastel blending.
- Catalog and Attribute JSON parse successfully and IDs remain unique.

## 7. Manual Review Gate

Generate each corrected Recipe with the same Character, Outfit, provider,
model, aspect ratio and resolution for at least three runs.

`Sunlit Storefront v3` passed owner visual review on 2026-08-08 for the evaluated
fixture. Cross-provider parity remains pending but does not reopen the accepted
Simple Mode behavior.

`Low-angle Campaign Hero v2` passed owner visual review on 2026-08-08 with a
documented consistency risk. Later optimization may improve weaker runs without
reopening the accepted MVP Recipe.

Accept `Color-light Editorial v3` when cobalt blue and scarlet red visibly
shape opposite planes of the subject and background, remain strongly distinct
without a broad purple/magenta wash, and retain readable identity and garment
construction.

Record provider/model, Job IDs, scores, failure patterns, Credit cost and
latency before marking these corrected Recipes final.
