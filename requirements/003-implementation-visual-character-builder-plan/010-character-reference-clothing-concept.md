# Character Reference - Clothing Concept

**Status:** Concept Only - Deferred After Headshot MVP  
**Sequence:** 010  
**Depends on:** Accepted Headshot MVP

## Objective

วาง contract สำหรับต่อยอด canonical Headshot ไปเป็น Character Reference แบบเต็มตัว โดยยังไม่ขยาย implementation scope ของ MVP แรก

## Future User Journey

```text
select saved canonical face
  -> choose or upload clothing reference
  -> choose basic body silhouette
  -> adjust supported garment color/pattern
  -> choose reference views
  -> generate character reference / character sheet
```

## Planned Inputs

- Saved Headshot character configuration
- Canonical face image/reference
- Uploaded clothing image
- Clothing preset
- Basic garment color
- Small reviewed pattern library
- Basic body silhouette
- Front/side/back or approved character-sheet layout

## Clothing Rules

- Uploaded clothing and preset clothing are alternative sources with a clear priority rule.
- Color and pattern edits apply only to supported garment regions.
- MVP concept does not promise pixel-perfect garment reconstruction.
- Clothing identity, body anatomy, pose and camera remain separate semantic responsibilities.
- Product references retain ownership and lineage metadata.

## Reuse Requirements

Future implementation must reuse:

- manifest and asset validation from 002
- visual picker, swatch and upload controls from 003
- semantic ID and saved configuration rules from 001/009
- canonical face and reference workflow from existing mode-specific reference requirements
- provider capability and generation pipeline from the current platform

## Explicitly Deferred

- Layer-based garment editor
- Arbitrary mask painting
- Fabric physics simulation
- Unlimited patterns/materials
- Exact virtual try-on guarantee
- Multi-character sheets
- Marketplace asset licensing and paid clothing presets

## Concept Acceptance

- The future workflow extends Headshot without creating a second character identity model.
- Uploaded and preset clothing can coexist under one reference contract.
- No Character Reference implementation begins before Headshot MVP acceptance and a separate option inventory review.

