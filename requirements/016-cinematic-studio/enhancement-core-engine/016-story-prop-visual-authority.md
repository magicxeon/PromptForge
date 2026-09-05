# Story Prop Visual Authority

**Status:** Verified gap; implementation not started
**Date:** 2026-09-05
**Capability owner:** Cinematic
**Observed case:** the same `CLOSED` sign changes from a white printed sign to a
wooden sign across Storyboard Shots

## 1. Verified Cause

The current Cinematic contract stores props as free text in Scene/Shot fields
such as `propContinuity`, visible moment, environment and continuity notes. The
Storyboard compiler forwards semantic prop state and may reference a previous
approved frame, but there is no stable Prop ID or immutable visual appearance
authority.

The existing validator catches temporal/future prop actions and unauthorized
screen-text conflicts. It cannot deterministically identify a material, color,
shape or typography change because those values have no canonical source.

## 2. Required Contract

Add a Project-owned Story Prop registry with:

```text
propId
name / narrative purpose
appearanceAuthority
  material / primaryColor / secondaryColor
  shape / proportions / dimensions
  typography / authorizedDiegeticText
  condition / distinguishingMarks
stateByShot
  holder / hand / placement / orientation / visibility
sourceEvidence
  approvedAssetId or approved Storyboard source fingerprint
```

Appearance is immutable continuity authority. Per-Shot holder, placement and
orientation are mutable state. A Shot refers to `propId`; it must not redefine
appearance through unrelated free text.

## 3. Future Implementation Order

1. Add backward-compatible Prop registry and references to Cinematic schemas.
2. Infer conservative draft Props from legacy free text without claiming exact
   appearance.
3. Extend Story planning/repair to create one Prop authority and reuse its ID.
4. Inject compact appearance authority into the Storyboard keyframe contract.
5. Add deterministic conflicts when a Shot contradicts authorized appearance.
6. Add an approved-source reference role only where the selected provider and
   reference plan support it; do not silently consume a style slot.
7. Test multi-Scene state changes separately from immutable appearance.

## 4. Protected Behavior

- Existing Projects with free-text prop continuity remain readable.
- Diegetic story text such as `CLOSED` remains permitted while captions,
  subtitles, watermarks and UI text remain prohibited.
- Identity, wardrobe, provider selection, quote, Credits and approval behavior
  do not change as part of the schema introduction.
- A previous approved frame remains optional evidence, not the only copy of
  Prop authority.

## 5. Verification Decision

The reported color/material drift is reproducible from the current data model
and cannot be guaranteed away by prompt wording alone. This item remains a
separate implementation task; no current Storyboard or approved image was
modified by this audit.
