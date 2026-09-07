# Phase 2-11 Model Profiles and AI Model Creation

**Status:** Character Profile and identity-pack MVP implemented; Project Model Profile policy pending

## Current Baseline (2026-09-07)

Face Creator, Character Sheet, Profile versions, casting exports and approved
Character Looks already have local owners. Reuse
`server/domain/character-profiles/` including `CharacterLookService.js`.
Community display imagery is not the canonical generation reference; preserve
their separate contracts and pinned Look/version IDs in downstream workflows.
The user accepted Character preview behavior; off-center source image polish
and Character social features stay in `requirements/098-pending-features/`.

Model Sources below are commercial offerings, not permission to reopen arbitrary
face controls on shared image Templates. Current image Template policy exposes
optional Character replacement and required Outfit, with other inputs locked.
Model setup/variation requires its own rights, quote and approved workflow.

## 1. Business Requirement

Fashion users choose a model through three cost levels: ready template, paid template variation or custom creation. Approved identity is saved as a reusable Project-scoped Model Profile.

Character Profile is the reusable person/identity source owned by
`requirements/006-implementation-character-profile`. This phase adds
Project/commercial policy around that source; it must not create a second
Character Profile or casting-export flow.

## 2. Model Sources

### Ready Template

- User selects a visual template.
- The template describes persona/style rather than promising a globally identical public face.
- Project-specific canonical output may be generated when required and priced accordingly.

### Template Face Variation

- User selects template plus allowed appearance controls.
- System quotes candidate generation cost.
- User chooses one approved candidate as canonical reference.

### Custom Model

- User configures appearance through Visual Character Builder or uploads authorized references.
- System may generate headshot and character sheet candidates.
- User approves canonical references before Fashion batch use.

## 3. Model Profile Data

- Ownership and Project scope
- Display name and source type
- Structured character configuration snapshot/version
- Canonical face, headshot and character-sheet asset references
- Provider/model generation provenance
- Consent/rights declaration for uploaded recognizable people
- Status: draft, generating, review, approved, archived, blocked
- Optional canonical `characterProfileId` and immutable
  `characterProfileVersionId`

## 4. Cost and Safety

- Every analysis/candidate/generation operation is quoted before execution.
- Number of included candidates and revisions is explicit.
- Users must confirm rights to uploaded face references.
- Prohibit deceptive identity use according to product policy.
- Ready/template assets must have documented generation/license provenance.

## 5. Acceptance Criteria

- Users can distinguish ready, variation and custom costs before selection.
- Only approved Model Profiles can be locked into production batches.
- Canonical change requires confirmation and creates a version, not silent replacement.
- Model creation jobs use normal durable job and ledger services.
- Uploaded references are private and ownership-protected.
- Archived profiles preserve historical generation lineage.
