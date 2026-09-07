# Playground Video Reference POC

Status: implemented; deterministic verification passed. Paid POC remains pending.
Current amendment: [004-trusted-source-master.md](004-trusted-source-master.md).
Nonrestricted Video amendment (2026-09-07):
[generated images and Character/Look alternatives](../../099-technical-dept/studio-realism-video-hardening/002-video-reference-selection.md).
This supersedes the mandatory-Look rule below for nonrestricted Playground
models only. Seedance trusted-only policy is unchanged.
Its generated-only controls and server guards supersede the upload/Character
acceptance below for Playground Seedance 2.0/2.5 only. It adds a private provenance
store and owner-only listing endpoint; browser draft is now version 4. The
original 001-003 evidence below remains applicable to nonrestricted models.
Parent: ../009-playground-unified-image-and-video-generation.md.
Primary: Product Requirement Architect. Reviewers: Backend and QA sequentially;
UX/media/security checks through triggered review-product-ux,
review-generative-media-pipeline and implement-generation-workflow Skills.
Financial calculations/settlement unchanged; reference parity is a mandatory gate.

## Ordered Delivery

1. [x] 001: explicit owned upload/approved Look reference contract; source binding,
   original bytes, quote/submit parity and role validation.
2. [x] 002: reuse Template CharacterLibraryPicker; actual first-frame/Look previews,
   replacement uploads, errors, actor-safe state and no silent provider switching.
3. [x] 003: focused server/UI/regression/layout verification and executable scripts.
4. [ ] User-run paid POC and BytePlus moderation/support qualification.
5. [x] 010: Playground Video quote readiness, one-Credit POC parity and
   eligible-only generated-source picker.
6. [x] 011: Image Playground Character Library reference handoff.
7. [x] 012: Image Playground entry into the existing Character Look Sheet
   lifecycle.
8. [x] 013: Active Video task status parity, Generation Job Center polling and
   bounded Playground result presentation.

Protected: Image Playground, Template/Character selection elsewhere, Cinematic
Story/Shot/Produce, provider activation, prices, Credits, queue and library.
No new provider, forced GCS/Asset Library, Character mutation, auto generation,
face modification or promise of passing provider moderation.

Architecture: PlaygroundVideoExperience -> existing videoGenerationApi ->
VideoGenerationApplicationService -> internal PlaygroundVideoReferenceService ->
Character/Assets authorities -> Credits -> existing provider task adapter ->
poll/result. No new endpoint or queue. Existing reference upload stores originals.

The ModelArk adapter rejects mixed first_frame/reference_image roles. Preserve
that contract. First-frame mode sends one first_frame. Character/reference mode
sends optional scene image first, Look Sheet second, both reference_image; the
UI must name that distinction. Character is optional for an uploaded sheet.
At least one Look Sheet is required in Character/reference mode. First-frame
mode never silently sends the hidden Character/Look selection.

Provider contract source: existing ModelArkSeedanceProvider and FIN/Cinematic
qualification records. Official task page checked 2026-09-07:
https://docs.byteplus.com/en/docs/ModelArk/1520757 (body unavailable to reader).
Do not claim new provider qualification from docs access or deterministic tests.

Rollback: remove new Playground reference controls and explicit-plan handling;
keep old input contracts and all existing Cinematic logic intact. No data migration.

Compatibility discriminator: only referencePlanVersion=playground-reference-v1
uses the new Playground resolver. Unversioned legacy/Cinematic source contracts
stay on their existing paths; unknown Playground versions are rejected.
Browser draft version 3 migrates version 2 without copying Base64/private signed
URLs. Uploaded references reuse existing Assets/outputs storage; no database,
new endpoint, queue, rate card or provider activation changes.
