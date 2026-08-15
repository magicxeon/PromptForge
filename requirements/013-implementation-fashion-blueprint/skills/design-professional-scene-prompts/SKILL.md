---
name: design-professional-scene-prompts
description: Design and review Momelo Scene Builder recipes, pose mechanics, grounded fashion environments, physically coherent lighting and shadows, camera, expression and provider prompt projections so guided selections produce professional, natural and dynamic images without conflicting semantic roles.
---

# Design Professional Scene Prompts

Use this skill when changing Scene Builder attributes, Scene Direction recipes,
pose/environment compatibility or canonical Scene prompt compilation.

## Required Context

Read:

1. `../../010-professional-scene-builder-guided-experience.md`
2. `../../002-character-pose-and-environment-selection.md`
3. `../../../011-reference-processing-pipeline/`
4. Current Pose, Environment, Lighting, Camera, Expression and Fashion catalog
   files under `attributes/`.
5. Canonical server prompt compiler and reference-authority policy.

## Authority Order

Never let aesthetic prose override semantic ownership:

```text
Reference/Template authority
> explicit user selection
> Scene Direction recipe
> mode-safe fallback
```

## Review Method

For every recipe or changed option:

1. State the visual purpose and featured subject/product.
2. Describe pose mechanics using weight, joints, contact points and gaze.
3. Check hand actions for anatomical plausibility and garment safety.
4. Check Expression and story beat against pose and gaze.
5. Check Environment affordances and spatial composition.
6. Motivate lighting from the environment or explicit art direction.
7. Select camera distance, height, angle and lens behavior that support the
   subject and pose.
8. Preserve Character identity/body and Reference Processing ownership.
9. Remove duplicate adjectives and contradictory semantic instructions.
10. Define provider overrides only where evidence shows they are required.

## Physical Light and Shadow Gate

For every recipe that names sunlight, a window pattern, cast shadow, dappled
light or another directional-light effect, describe one physically coherent
light path:

```text
motivated source
-> real blocker or aperture
-> directly illuminated subject surfaces
-> cast-shadow continuation on a receiving wall or floor
```

Do not approve a shadow recipe when the pattern appears only on the background
while the subject remains evenly lit. The prompt must establish:

1. source side, height and approximate hardness;
2. the real window, foliage or architectural blocker that forms the shadow;
3. bright direct-light areas and shadow bands visibly crossing the subject;
4. continuity of the same light geometry onto the wall or floor;
5. a readable key-to-fill relationship rather than flat frontal illumination;
6. natural contact shadows at feet and environmental contact points; and
7. protected face, skin and garment readability without erasing the effect.

`Shadow` is not a decorative overlay. If the subject is outside the motivated
beam, the recipe has failed even when a graphic pattern exists elsewhere.

## Editorial Pose Gate

A professional fashion pose must define a readable asymmetric body line, not
only a generic stance plus aesthetic adjectives. For a standing editorial
recipe, verify:

1. one anatomically credible supporting leg and explicit weight ownership;
2. a distinct free-leg line that does not merge, lock or destroy balance;
3. pelvis, ribcage and shoulders using restrained counter-direction;
4. a lifted torso and intentional silhouette rather than a stiff frontal pose;
5. non-mirrored hands with a clear role and natural wrists; and
6. garment-safe placement that preserves closures, waist construction and the
   principal product detail.

Do not place both hands behind the body merely to keep a garment clear when the
recipe promises editorial impact. Use one restrained angular hand line and one
quiet counterbalancing arm instead.

## Grounded Fashion Environment Gate

Environment prose must describe a real, photographable fashion location rather
than an abstract generated set. Give each visible element a spatial purpose:

- identify a plausible venue and its real material surfaces;
- establish floor-to-wall junctions, depth planes and an architectural axis;
- include only restrained fashion-relevant context such as a plinth, bench,
  garment rail, framed work or storefront display;
- make windows and practical fixtures agree with the lighting direction;
- preserve believable scale, gravity, access paths and subject contact; and
- exclude floating lights, unexplained neon, impossible openings, random props,
  decorative geometry and empty abstract voids unless the recipe explicitly
  owns a theatrical or color-light concept.

The environment should look selected by a fashion producer and photographed by
a real crew. It must support the garment, pose and light without competing with
them.

## Preview Parity Gate

A discoverable Shot Recipe preview is a visual promise, even when the source
image is not sent to the generation provider. Before approval, translate its
observable composition into deterministic structure:

- exact crop boundary and excluded body regions;
- shoulder, torso, neck, head and gaze direction;
- subject-to-background distance or contact;
- camera height, axis, focal behavior and visual anchor;
- motivated source position, contrast and catchlight behavior; and
- environment elements that may and may not enter the frame.

Do not attach a broad reference family to one recipe when its members have
materially different crop, pose, lighting or location contracts. Split them into
separate recipes or choose one canonical preview. Any selectable lower-garment
description must not widen a portrait whose recipe explicitly excludes the
lower body.

## Professional Quality Gate

Approve only when the result direction:

- has a clear visual hierarchy;
- appears balanced but not mechanically symmetrical;
- uses natural weight distribution and believable hands;
- keeps the intended garment or product readable;
- has coherent pose, gaze, expression and story;
- has environment-supported depth, camera and lighting;
- has a traceable physical light path when cast shadows are requested;
- uses a plausible fashion-production location rather than accidental abstract
  scenery;
- avoids unrequested props, accessories and identity changes;
- remains suitable for reuse as a Template preview;
- can be represented by versioned structured data rather than hidden code.

Do not solve weak output by adding long decorative prose. Improve the semantic
recipe, compatibility rules or concrete physical direction first.

## Deliverables

Record:

```text
recipe/attribute IDs reviewed
compatibility decisions
prompt fragments changed
provider-specific differences
reference-authority impact
visual fixtures used
known limitations
```
