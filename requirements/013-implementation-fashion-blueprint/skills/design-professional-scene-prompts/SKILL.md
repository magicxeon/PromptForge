---
name: design-professional-scene-prompts
description: Design and review Momelo Scene Builder recipes, pose mechanics, environments, lighting, camera, expression and provider prompt projections so guided selections produce professional, natural and dynamic images without conflicting semantic roles.
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

## Professional Quality Gate

Approve only when the result direction:

- has a clear visual hierarchy;
- appears balanced but not mechanically symmetrical;
- uses natural weight distribution and believable hands;
- keeps the intended garment or product readable;
- has coherent pose, gaze, expression and story;
- has environment-supported depth, camera and lighting;
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
