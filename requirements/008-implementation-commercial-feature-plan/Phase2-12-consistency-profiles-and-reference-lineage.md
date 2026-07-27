# Phase 2-12 Consistency Profiles and Reference Lineage

**Status:** Proposed - Awaiting Review

## 1. Business Requirement

Multiple product images should appear to belong to the same photo session while allowing controlled pose and framing variation.

## 2. Profile Scope

Consistency Profile may lock:

- Model identity and canonical references
- Hair and stable appearance
- Scene/environment
- Lighting recipe
- Camera/lens recipe
- Photographer style
- Product integrity level
- Allowed pose, expression and framing variation

Levels:

- Low: style/scene continuity with broad variation
- Medium: model, scene, light and camera continuity
- High: strict references and narrow approved variation

## 3. Versioning

- Profile is versioned.
- A confirmed Batch stores an immutable profile snapshot.
- Changing canonical model/scene creates a new version.
- Historical results retain exact profile and reference lineage.

## 4. Reference Graph

Lineage records include:

- Source asset/result IDs and roles
- Parent job and generation attempt
- Provider/model
- Prompt/configuration snapshot hash
- Model/Profile versions
- Product references and integrity setting

Prevent cycles and unauthorized cross-Project references.

## 5. Quality Control

- Show locked and variable properties before confirmation.
- Warn when provider/input limits prevent all requested references.
- Do not claim guaranteed identity or product accuracy.
- Allow user to compare output against canonical references during approval.

## 6. Acceptance Criteria

- Batch outputs reference one immutable consistency snapshot.
- Regeneration preserves snapshot unless user explicitly creates a variation.
- Reference lineage remains traversable after archive.
- Cross-Project and cyclic lineage is rejected.
- Provider capability mismatch is detected before charging when possible.
- Existing face/style/pose references migrate into documented lineage roles.

