# 001 Reference Authority And Execution

- Extend existing references[] DTO (maximum two for this Playground POC).
  Each input is a registered owned upload or pinned approved Character Look.
  Opt in with referencePlanVersion=playground-reference-v1. Reject unknown versions;
  preserve the unversioned legacy contract. Validate MIME, dimensions, byte size
  and aspect ratio from original bytes against catalog referenceConstraints.
- Resolve approved Looks by Character/Profile/Look version IDs via Character
  authority. Never authorize through the Community preview URL. Verify profile
  version matches Look version. Recheck permissions and bytes on quote and submit.
- Bind asset ID, original content hash, role, purpose and pinned IDs before
  calculating the reference-plan/request fingerprint. Ignore client authority
  claims; reject changed/missing/foreign/deleted files before Credit reservation.
- Validate role/count combinations before quoting. No mixed first/last/reference
  roles, truncation or implicit dropped images. Keep legacy Character-only and
  Cinematic contracts unchanged; new explicit plans must resolve all images once.
- Model catalog inputModes and referenceImageLimit remain authoritative. Preserve
  the selected provider/model when switching source type; unsupported combinations
  display a reason instead of switching to Veo or another model automatically.
- Use original upload bytes (no image processing). ModelArk uses existing optional
  GCS URL-first transport with original-byte Base64 fallback, owner/hash checked.
  No Asset Library enrollment, GCS setup requirement or moderation retry loop.
- Quote and submit use identical references/mode and the quote requestFingerprint.
  Keep reservation, idempotency, task status, error and reconciliation owners.
- User-generated AI imagery does not prove that provider moderation will accept
  it. Existing policy/qualification gates remain; live Seedance acceptance pending.

Tasks: add focused plan helper; extend type; integrate preparation/resolution;
test ordering/count/ownership/hash/revocation before reserve; preserve old tests.

Delivered by server/domain/generation/PlaygroundVideoReferenceService.js, an
internal collaborator of VideoGenerationApplicationService, not another facade.
CharacterLookService exposes the approved sheet's source Character version.
CinematicFirstFrameTransportService accepts verified generation_reference assets
through its existing URL-first/fallback path. VideoCapabilityRegistry publishes
supportsOrderedImageReferences from adapter support; this is not qualification
or permission to enable a model. Single-reference-only adapters reject two inputs.
