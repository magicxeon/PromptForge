# Storyboard And Character Look Video References

**ID:** 016-PVP-012
**Status:** Implemented and locally verified; live provider qualification pending
**Implemented extension:** [013](013-optional-first-frame-and-looks-only.md) adds
looks_only with no included Storyboard and conditional image approval. Its plan
003i records regression evidence and pending live UAT; the existing two modes
remain available unchanged for frame-based generation.
**Owner:** Cinematic reference-plan orchestration; Generation dispatch
**Primary:** Product and Requirement Architect
**Reviewers:** Backend Platform Architect and QA Release Engineer, sequential.
Backend includes security and Credit invariant review; UX checks are applied to
the scoped selector without claiming an independent designer review.
**Skills:** direct-generative-cinematic-production, implement-generation-workflow,
review-commercial-integrity, review-product-ux, verify-release-regressions.

## 1. Requested Outcome

Allow a Seedance video attempt to use one Storyboard plus N existing Look Sheets:

1. Approved Storyboard image: opening composition, pose, expression, location,
   props and motivated light.
2. Images 2 through N+1: the approved Character Look Sheet for each active Cast
   assignment appearing in this Shot, with identity/hair/clothing/accessory
   authority. They are not additional scenes or ending frames.

Preserve the existing single-image first-frame workflow. Do not modify or
regenerate either source, change provider, register Asset Library material,
or send a paid test automatically.

## 2. Provider Contract And Decision Gate

Official ModelArk reference:
https://docs.byteplus.com/en/docs/ModelArk/1520757

Verified on 2026-09-05 by reading the page's embedded document content because
the web reader exposed only its shell:

- First-frame, first/last-frame and omni-reference are mutually exclusive modes.
- Reference image inputs use the exact role `reference_image`, not numbered
  provider roles such as `reference_image_1`.
- In omni-reference mode, the prompt can request a supplied image as the opening
  image; this does not provide exact first-frame enforcement.

The creator accepted the explicit multi-image mode for implementation. Do not
silently append a Look Sheet to `first_frame`, label it
`last_frame`, or claim exact first-frame guarantees for reference mode.

Accepted behavior: offer an explicit multi-image reference mode
alongside the existing single-image mode. Existing requests without a mode keep
their previous behavior. New mode remains development POC until live qualification.

Adding another reference is not a remedy or guarantee for
`InputImageSensitiveContentDetected.PrivacyInformation`. Preserve provider
moderation, exact error codes and single-attempt behavior.

## 3. Protected Scope

- No Story/Scene/Shot, Cast, Look, approved media or Timeline mutations merely
  from switching reference mode, quoting or previewing.
- No change to other providers, existing single-image payload or price policy.
- No face crops, compositing, recompression, replacement or synthesized trust.
- Keep GCS URL-first and same-byte Base64 fallback before provider submit,
  as specified in CINE-FIX-012. No fallback retry after provider rejection.
- Keep ownership, current authorization, model constraints, quote-submit parity,
  reservations, idempotency, refunds, task progress and completed video preview.
- No new upload step: select the pinned approved Look belonging to the Shot.

## 4. Implementation Steps

### Step 0 - Confirm Control Tradeoff

Accepted by the creator's dynamic multi-Character requirement and implementation
request. Retain strict first-frame as the default; no paid calls in this change.

### Step 1 - Resolve Approved Reference Authority

Extend Cinematic's canonical quote/attempt preparation. Resolve active Cast and
Look using Shot IDs, with existing Scene fallback only where the current
authoring contract already permits it. Each selected Character requires exactly
one locked, pinned approved Character Look. Reference order follows the Shot's
deduplicated Cast order (Scene fallback); each role has its own numbered mapping.
Do not choose an unrelated/first global Look or add every Cast member.

Use `CharacterLookService.resolveApprovedVersion` and an owning Character Look
media facade to recheck Character usage authorization, retirement, version
approval and `approvedSheetAsset`. Recheck source ownership/deletion on the
server. Reject missing, ambiguous, foreign or revoked authority before Credits
or uploads; do not silently downgrade requested references to one image.

Current project evidence: its Look Sheet Asset lacks dimensions, size and hash
in its legacy record. Read and probe its existing original file through Assets;
derive MIME, dimensions, byte count and SHA-256 without modifying the file or
backfilling unrelated runtime data. Compare any existing approved hash. Bind
the derived hash to the quote and reverify before submit. Do not label this
legacy record as historically hash-verified when it was not.

Preserve actual image provenance independently for all sources. Storyboard
Seedream eligibility must not be falsely copied onto the Look Sheet. A
development POC does not certify provider trust or production compatibility.

### Step 2 - Reference Plan And Prompt Configuration

Add an explicit request mode, values `storyboard_only` and
`storyboard_and_looks`. Derive media count (1 + selected Cast count) and purpose on the
server. Never trust client-supplied URLs, hashes, Look ownership or counts.

Dynamic image mapping:

| Position | Internal purpose | Provider role |
|---|---|---|
| Image 1 | storyboard_opening | reference_image |
| Images 2..N+1 | character_look, pinned to each selected role | reference_image |

Use `inputMode: multimodal_reference`; omit `first_frame` and `last_frame`.
Keep the selected aspect ratio for this mode. Single-image mode retains the
current `image_to_video`, `first_frame`, and ratio omission.

Extend `CinematicVideoPacketCompiler` and configuration under
`server/config/cinematic/`. Wording must map Image 1 to opening scene authority
and Images 2..N+1 to their named role's identity/wardrobe only. Keep Image 1's authored emotion and gaze;
do not transfer a Look Sheet smile, studio background, pose, labels or multi-view
layout into the video. Produce one continuous scene with only the selected Characters,
not a slideshow, split-screen, turnaround sheet or duplicated people.

Keep temporal action, visible performance, motivated light, prop continuity,
natural photographic behavior and audio policy. Remove contradictory claims of
an immutable exact first frame only in this new mode. Do not alter existing
single-image prompt strings. Reference instructions must survive prompt budgeting.
The new strategy allows up to 4,000 characters; overflow is an explicit local
error, never silent truncation of role mappings or authored direction.

Expose the exact prepared provider prompt and reference summary from the quote
so the UI does not display a single-image prompt while submitting multiple images.

### Step 3 - Generation And Transport

Expose the new input mode only for documented Seedance 2.x model configurations
under the existing development POC gate, with production exposure unchanged.
Translate the ordered Storyboard and Look sources into 1+N `reference_image` content items
in stable order. Add adapter validation rejecting mixed first-frame/reference
roles before network dispatch.

Generalize the existing Assets transport through its public boundary for the
approved references. GCS objects remain actor/source/hash scoped; verify original
bytes for each reference. Per-image local Base64 fallback is allowed before one
submission. Apply actual MIME/dimension/size/count and total request-size limits.
Do not reinterpret the Look Sheet as a Storyboard Asset or forge Asset metadata.

Fingerprint input mode, ordered source purpose, Asset/version, content hash,
pinned Look version and rendered prompt. Transport URLs/expiry are not content
authority. Persist safe IDs/hash/transport diagnostics, not signed URLs/Base64.
Any source/mode/setting change invalidates the quote. Reuse the same canonical
Credit estimate/reservation and durable task lifecycle, including terminal errors.

### Step 4 - Scoped Produce UI

Use an existing Select or segmented-control pattern in the yellow render panel.
Preserve media preview, technical prompt, additional motion direction, quote,
Generate, history, approval, queue and navigation positions.

Show the two modes with image counts, and identify the selected Storyboard and
Look Sheets using the existing authenticated thumbnail component. Explain the reference-mode
control limit at the selection boundary. Keep the prior mode available; no
automatic provider/model/source switch. Do not persist private media bytes.

Use server capability data for availability, existing API client/TanStack Query,
actor-scoped keys and EN/TH localization. Block submission during requoting and
show the actual missing-reference/authorization/provider reason. Check mobile,
tablet and desktop fit only for the affected panel.

### Step 5 - Focused Verification

Use `scripts/test-cinematic-video.js` groups; extend focused tests rather than
running the full suite after every edit. Full remains an explicit optional run.

| Case | Evidence required |
|---|---|
| Single-image mode | Existing payload, prompt, ratio and approval unchanged |
| Dynamic multi-image mode | Exactly 1+N reference_image inputs; selected Cast order, deduplicated |
| Mixed roles | Local error; zero provider requests |
| Look approval/ownership revoked | Reject before upload/reservation/dispatch |
| Legacy missing image metadata | Read-only probe; original bytes retained |
| Missing/multiple selected Looks | Explicit failure, no guessed replacement |
| Source bytes or Look version change | Old quote invalid; no dispatch |
| GCS reuse/fallback | All hashes preserved; no retry after submit |
| Quote/submit | Same mode, count, sources, prompt, settings and Credits |
| Provider error | Progress stops; code/request ID visible; no auto retry |
| Completed task | Existing persisted preview and explicit approval usable |
| Other providers | No new inputs or changed behavior |

Live verification is a later creator-authorized single clip after price review.
Actual quality checks: opening matches scene intent; identity/Look continuity;
only selected Characters; no Look Sheet background/views; correct action, emotion and audio.
Provider acceptance and visual fidelity are not proven by mocked tests.

## 5. Execution Record

- Requirements prepared before runtime changes.
- Official mutually-exclusive role constraint verified.
- Existing current Shot/Look binding and legacy metadata inspected read-only.
- Creator decision: accepted reference-image mode with dynamic multiple Characters.
- Runtime implementation: completed, with focused verification recorded in 003h.
- No paid/live generation or user runtime data changes during implementation.
- Read-only current Shot check: 2 ordered references, approved Look version/hash,
  3,005-character provider prompt with Image 1/Image 2 and naturalism intact.
- Substeps: `implementation-plan/003h-storyboard-and-look-references.md`.
