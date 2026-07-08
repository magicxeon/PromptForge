# Prompt Engineering Guide for Photorealistic Image Generation

## Goal

This guide explains how to improve a prompt generator so it produces
images that feel like **real photographs** rather than obvious AI
renders.

------------------------------------------------------------------------

# Core Principle

Think like a **photographer**, not an AI prompt writer.

Instead of describing only the subject, describe:

1.  Why the photo exists
2.  Where the camera is
3.  What is happening
4.  How the camera behaves
5.  How light interacts with the scene
6.  Natural imperfections

------------------------------------------------------------------------

# Recommended Prompt Architecture

    Who
    ↓
    What is happening
    ↓
    Where
    ↓
    Why is someone taking this photo?
    ↓
    Camera position
    ↓
    Lens behavior
    ↓
    Lighting physics
    ↓
    Foreground
    ↓
    Subject
    ↓
    Background
    ↓
    Natural imperfections
    ↓
    Optical imperfections

------------------------------------------------------------------------

# 1. Photographic Context (Highest Priority)

Generate prompts describing the **reason the image exists**.

Good examples:

-   captured casually by a friend
-   candid lifestyle photograph
-   spontaneous moment during conversation
-   documentary street photography
-   unposed snapshot
-   captured while walking
-   everyday lifestyle moment

Avoid:

-   beautiful portrait
-   masterpiece portrait
-   perfect model

------------------------------------------------------------------------

# 2. Scene Story

Describe events instead of object lists.

Bad

    woman
    coffee
    table
    phone

Good

    A candid moment while chatting over coffee with friends.

------------------------------------------------------------------------

# 3. Camera Position

Include camera placement.

Examples

-   eye level
-   slightly below eye level
-   from across the table
-   standing several meters away
-   over-the-shoulder
-   seated perspective

------------------------------------------------------------------------

# 4. Lens Behaviour

Instead of saying "blur background", describe optics.

Examples

-   shallow depth of field
-   creamy bokeh
-   natural optical falloff
-   foreground blur
-   edge softness
-   subtle lens breathing

------------------------------------------------------------------------

# 5. Lighting Physics

Use believable light sources.

Examples

-   flash mixed with ambient neon
-   window light with indoor tungsten
-   golden hour with open shade
-   practical café lighting
-   street lamps and storefront lighting

Avoid

-   beautiful lighting
-   cinematic lighting

without explaining the source.

------------------------------------------------------------------------

# 6. Foreground Layer

Foreground objects make the camera feel present.

Examples

-   coffee cup
-   bottle
-   menu
-   flowers
-   chair
-   passing pedestrian

Prefer

    foreground coffee cup slightly out of focus

instead of

    coffee cup

------------------------------------------------------------------------

# 7. Background Activity

The world should continue behind the subject.

Examples

-   customers talking
-   moving pedestrians
-   passing cars
-   bar guests
-   café staff working

------------------------------------------------------------------------

# 8. Motion

Better than generic "motion blur"

Examples

-   subtle panning motion blur
-   environmental motion blur
-   passing pedestrians softly blurred
-   moving traffic streaks
-   subject remains tack sharp

------------------------------------------------------------------------

# 9. Subject Behaviour

Avoid stiff expressions.

Generate

-   relaxed facial muscles
-   subtle micro-expressions
-   gentle eye contact
-   natural asymmetry
-   slightly imperfect smile
-   relaxed posture

------------------------------------------------------------------------

# 10. Skin

Prefer

-   realistic skin texture
-   visible pores
-   fine baby hairs
-   subtle blemishes
-   natural makeup

Avoid

-   flawless skin
-   porcelain skin
-   glass skin
-   airbrushed skin

------------------------------------------------------------------------

# 11. Camera Imperfections

Small imperfections improve realism.

Examples

-   slight handheld movement
-   subtle sensor noise
-   fine film grain
-   gentle halation
-   minor chromatic aberration
-   corner softness
-   realistic lens rendering

------------------------------------------------------------------------

# 12. Identity Preservation

Recommended wording

    Preserve the identity of the uploaded person with high consistency while maintaining a completely natural appearance. Keep the same recognizable facial proportions, eye shape, nose, lips, eyebrows, hairstyle, and skin tone while allowing subtle natural variations from facial expression, camera perspective, lighting, and lens characteristics. Prioritize identity preservation over exact geometric matching.

Avoid

-   100% identity
-   exact geometry
-   must match
-   pixel perfect
-   without distortion

------------------------------------------------------------------------

# Words to Avoid

## Geometry Lock

-   100%
-   exact
-   identical
-   must match
-   pixel perfect
-   without distortion

## Unreal Beauty

-   flawless
-   perfect face
-   perfect skin
-   perfect anatomy
-   perfect symmetry

## AI Buzzwords

-   masterpiece
-   best quality
-   ultra quality
-   insane detail
-   hyper realistic
-   16K
-   32K

These often encourage over-rendered faces.

------------------------------------------------------------------------

# Recommended Modules for a Prompt Generator

    Character
    Body
    Clothing
    Pose
    Scene Story
    Photographic Context
    Foreground Objects
    Background Activity
    Camera Position
    Lens Behaviour
    Lighting Physics
    Motion
    Identity Preservation
    Natural Skin
    Natural Imperfections
    Camera Imperfections
    Film Look
    Output Style

------------------------------------------------------------------------

# Design Recommendation

Treat "Photographic Context" as a first-class module.

It should be generated independently from clothing, pose, lighting and
environment because it dramatically affects realism.

Example values:

-   captured by a friend
-   candid street snapshot
-   travel documentary
-   lifestyle photography
-   casual social media photo
-   family snapshot
-   vacation memory
-   handheld smartphone moment

This module often has more impact on realism than increasing image
quality keywords.
