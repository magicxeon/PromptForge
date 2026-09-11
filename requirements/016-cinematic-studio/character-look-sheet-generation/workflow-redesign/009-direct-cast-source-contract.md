# Direct Cast Source Contract

Status: implemented; isolated contract/transport checks passed 2026-09-10.
Owner: CinematicApplicationService and project repository. Live UAT pending.

## C1: Assignment

- Extend the existing upsert Cast use case, not a second project/Character store.
- Add sourceType character or generated_sheet (absent means legacy character).
  Generated source stores generation ID, content hash, model, expiry and owned
  local Asset/preview snapshot. Never persist or expose the signed provider URL.
- Require a bounded name and explicit review that the source is a Look Sheet of
  one intended cast member. It is user-confirmed, not system identity proof.
- Reauthorize project and source server-side. Reject mixed profile/sheet IDs,
  forged readiness/Looks, expired/rejected/foreign/missing/changed sources.
- Use an intrinsic locked project Look referencing the whole original sheet
  for existing scene/shot Look selections. No CharacterLook/Profile is created.
- Duplicate source retries reuse the assignment; explicit replacement retains
  assignment ID and invalidates dependent approvals using existing rules.

## C2: Downstream

- Story Plan, lineage and readiness accept the discriminated source. Do not
  require a profile/version or a separately approved Character Look for a sheet.
- Storyboard receives the whole sheet as character reference, not a crop or a
  wardrobe-only identity substitute. Keep existing multi-character qualification
  restrictions and reference-count parity. Original generation is unchanged.
- Produce's existing Storyboard + Looks mode references each selected sheet,
  with cast name/role, source generation ID and pinned content hash. Reuse
  canonical quote/accept/dispatch checks and original trusted URL transport.
- The Storyboard first frame retains its own independent eligibility rules;
  selecting a trusted sheet does not make other images trusted.
- Expired sources remain visible and replaceable in saved projects; they cannot
  proceed to a new generation. No silent fallback to uploaded bytes for Seedance.
- Existing historical generated_import Looks remain resolvable, but new imports
  through the retired Character-bound API are rejected with a stable error.

## Acceptance

Add two sheets without any Character IDs; save/reload/edit direction; identify
them independently; use existing roles, story and reference contracts. Verify
cross-actor, expiry, tampering, retry, replacement, original-URL transport and
ordinary Character/Look regression paths in isolated tests.

Evidence: test/directGeneratedCast.test.js covers assignment, actor/version
checks, intrinsic Look readiness, expiry and replacement. Storyboard batch route
tests and StoryboardGenerateAllDialog tests preserve the whole sheet as
character_reference, reject missing/replaced/extra references before enqueue,
and keep quote/submission parity without a fabricated Profile. Video Generation
tests preserve original provider URL transport and reauthorize before Credits.
Existing Character, approved Look and first-frame regressions remain in the
aggregate runner documented in 011.
