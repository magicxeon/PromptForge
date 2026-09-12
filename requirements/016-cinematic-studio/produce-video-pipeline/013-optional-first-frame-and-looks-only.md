# Optional First Frame And Look-Sheet-Only Video

**ID:** 016-PVP-013
**Date:** 2026-09-12
**Status:** Implemented; isolated regression and scoped visual checks passed; live UAT pending
**Primary:** Product Requirement Architect
**Review gates:** UX/Cinematic direction; Backend, Credits/security and QA at implementation
**Owner:** Cinematic Shot authoring and reference-plan orchestration; Generation dispatch
**Plan:** [003i](implementation-plan/003i-optional-first-frame-and-looks-only.md)

## 1. Accepted Outcome And Scope

Allow video from the Shot description and its selected Cast Look Sheets in two
equivalent situations:

1. No First Frame has been generated: automatically resolve the selected Shot
   Cast sheets, without requiring a Storyboard image or image approval.
2. A First Frame exists but the creator disables its use: retain that image,
   approval and history; omit it from this video request and use Cast sheets.

Automatic means reference selection only, NEVER automatic image/video generation,
provider switching, paid submission or approval. Existing Story/Scene/Shot planning
and Cast-readiness requirements remain. Scope is Cinematic Storyboard-to-Produce;
do not redesign Playground or add uploads, Asset Library registration or text-only
video to this change.

This explicitly supersedes the unconditional approved-Storyboard prerequisite
in enhancement-core-engine/021 and prior Produce documents ONLY for looks_only.
Legacy requests retain their first-frame baseline.

## 2. One Mode Contract

Extend the existing canonical reference mode; do not add a competing generation
pipeline or independent boolean that can disagree with the request mode.

| Canonical mode | Effective input | Provider roles | Image approval |
|---|---|---|---|
| storyboard_only | One approved opening frame | first_frame | Required |
| storyboard_and_looks | Approved opening reference plus N selected sheets | All reference_image | Required for the included Storyboard |
| looks_only (new) | N selected sheets plus authored scene/shot prompt | All reference_image | No Storyboard approval required |

The user-facing Use First Frame toggle is OFF for looks_only. On modes retain
the existing strict-frame versus Storyboard-plus-Looks choice. Preserve the last
explicit on-mode when switching off and back on; it is a preference, not a second
source of effective authority. If absent, on-mode defaults to storyboard_only.
The reference-image variant remains non-exact opening guidance, not strict frame
locking; labels must not promise otherwise.

Store the explicit choice per Shot through existing actor-owned Project/Shot
contracts. Storyboard and Produce must display the same choice across navigation,
reload and Shot switching. Existing records/requests without a mode retain legacy
storyboard_only semantics. For a new unconfigured Shot without a frame, the UI
proposes and explicitly submits looks_only when the chosen model supports it.
Do not silently reinterpret legacy API requests as looks_only.

## 3. State And Recovery Rules

Retry follow-up (2026-09-12): changing references must not stop observing an
existing durable video task. Packet staleness prevents approval, not task-status
refresh. A terminal rejected task must not leave Generate locked by an outdated
Project attempt status. Historical rejection is not a current source-check error;
keep diagnostics without requesting First Frame approval in looks-only mode.
Remove the shared video engine's Development POC notice, retaining the actual
Credit estimate, errors and billing behavior. User requests no test runs for this
follow-up; manual UAT remains pending.

Retry follow-up (2026-09-12): changing references must not stop observing an
existing durable video task. Packet staleness prevents approval, not task-status
refresh. A terminal rejected task must not leave Generate locked by an outdated
Project attempt status. Historical rejection is not a current source-check error;
keep diagnostics without requesting First Frame approval in looks-only mode.
Remove the shared video engine's Development POC notice, retaining the actual
Credit estimate, errors and billing behavior. User requests no test runs for this
follow-up; manual UAT remains pending.

| State | Expected behavior |
|---|---|
| No frame, valid selected Cast sheets, supported model | Looks only available; quote and manual Generate do not require image approval |
| Approved frame, toggle OFF | Keep preview and approval; send sheets only |
| Unapproved frame, toggle OFF | Keep candidate; image approval does not gate looks-only |
| Toggle ON without an approved frame | Block frame-based quote/submit and offer normal generate/approve flow |
| Approved frame, toggle ON | Use same approved frame; fresh quote; no regeneration |
| Frame generated/approved while OFF | Remain OFF; do not silently change video inputs |
| Required sheet missing, ambiguous, revoked or invalid | Block with named Cast/reason; return to its existing selection flow; never guess another sheet |
| Model lacks multimodal Look support | Keep model selection; explain unavailable mode; do not submit or switch automatically |
| No selected Cast (including castMode none) | Do not borrow Scene Cast or global sheets; looks-only blocked; frame mode remains available |
| Prior provider rejection | Keep image/sheet selectable under playground-video-reference-poc/015; retry explicit |
| Active video submission/task | Prevent changing effective inputs of that task; retain its snapshot and duplicate-prevention controls |

Disabled frame is not a deleted, revoked or unapproved frame. Its URL, bytes,
hash, expiry and trust rejection must not gate a request that does not use it.
No-Cast prompt-only video is outside this package; do not force an unrelated
Character into an environment Shot to make it eligible.

## 4. Cast And Trusted Source Authority

2026-09-12 transport amendment: playground-video-reference-poc/016 permits
identical local Look Sheet bytes as Base64 when the original signed download URL
expires. This is an explicit alternative, not provider-trust equivalence; First
Frame and other rejection/ownership/content constraints remain unchanged.

Runtime repair (2026-09-12): generated Cast Assets persist their content hash in
metadata.contentHash. Generation must normalize that canonical field before
comparing the Asset with the pinned reference and trusted source, for both quote
and submit. Do not require a new sheet or change stored data. Preserve rejection
of actual hash/URL/owner/source mismatches and the original-URL transport rules.

- Resolve only the Cast that appear in this Shot, using the current explicit
  none/selected/inherited coverage rules and stable Cast ordering.
- Each selected Cast requires exactly one pinned usable Look Sheet. Reuse direct
  generated Cast via CinematicGeneratedCastService and existing approved Character
  Look resolution where the active model permits it. No first-item/global guessing.
- Seedance 2.0/2.5 must use valid Seedream 5.0 provider-original URLs for every
  included sheet, with current owner/account/model/mode/time/hash checks. Do not
  inherit trust from the disabled Storyboard or change the 30-day rule.
- All sources must satisfy the current model catalog and qualification/exposure
  flags. No broadening of provider capability or paid-routing evidence is implied.
- N sheets means N images, not 1+N. Respect provider limits and unique source/Cast
  bindings. Never label the first sheet as first_frame or storyboard_opening.
- In looks_only omit all Storyboard, previous-Shot images and last-frame media.
  No hidden fallback image; retain textual continuity only. Do not fetch or verify
  disabled media merely to build a quote or submit.
- Provider moderation still applies; this mode does not guarantee acceptance.

## 5. Prompt And Visual Contract

Extend CinematicVideoPacketCompiler and its versioned prompt policy JSON. The
looksOnlyMode block in video-packet-policy.v2.json is provider-neutral; existing
provider strategy suffixes and capability checks still apply.
Do not reuse the first-frame introduction or shift a character mapping by one.

Prompt-only follow-up (2026-09-12): in looks_only, begin with "Use character look
sheet references" and identify them as identity/wardrobe references, not opening
frames. Keep first-frame mode wording unchanged. Update only the policy prefix;
the user will test manually, with no automated test run for this wording change.

- Image 1 is the first selected Cast sheet; Image 2 the second, and so on. Map
  each to a stable role/name and identity/hair/wardrobe authority.
- Opening composition comes from Shot visibleMoment, blocking, camera/framing,
  scene/location/time, art direction, lighting and props. Preserve temporal action,
  duration, performance, gaze, continuity entry/exit and audio intent.
- Do not claim an immutable approved start image when none is submitted. Do not
  treat sheet text, panels, borders, studio background or multi-view layout as
  scene content; prevent duplicate people and collage/slideshow output.
- Keep the bounded prompt policy; required mappings must not be silently truncated.
  Technical prompt and thumbnails show the exact quoted inputs.
- Without a first frame, opening composition and cross-Shot visual continuity
  are less constrained. Show a concise localized notice at the mode selection.
  Video review and explicit approval remain mandatory.

## 6. Readiness, Price And Lineage

Make readiness mode-aware from navigation through context, quote, submit, task
approval and downstream Timeline validation. A looks-only Shot may be ready for
Video while its Storyboard remains not generated/unapproved. Do not fabricate an
approved image or mark all Storyboards complete to unlock Produce.

Looks-only attempts have nullable Storyboard Asset/fingerprint fields and a real
reference authority derived from their pinned sheets, authored Shot and mode.
Never spoof kind=cinematic_storyboard_source for a sheet or invent an Asset ID.
Registry validation must check each included source independently.

Fingerprint mode, ordered Cast/Look IDs and versions/hashes, relevant authored
direction, prompt, model and output settings. Changing an active input invalidates
the quote and dependent approval under existing lineage rules. A disabled frame
must not be an input dependency: creating/replacing only that image does not stale
an otherwise unchanged looks-only attempt. Preserve unrelated version-conflict
checks and historical attempt snapshots. Switching modes makes a fresh quote
necessary and prevents approval against a different current contract.

Credits continue through the canonical estimate/reserve/capture/refund path. The
estimate counts only submitted images. Do not promise looks-only is cheaper; use
the configured model rate. One explicit Generate yields one ordinary task, and
retries retain normal consent/idempotency semantics. No auto retry or free retry.

## 7. Scoped UX And Rollout

Use the shared theme toggle next to the selected Shot's First Frame, with existing
authenticated preview and an off/not-used state. Keep Generate/Approve image,
replacement, history and recovery actions available. Mirror the effective choice
and included sheets/count in the existing Produce reference control; no duplicate
state or new workflow modal. Preserve all sibling panels, queues, loading/error,
cost and navigation. Use EN/TH, shared spinner, keyboard/focus support and verify
390/820/1440px. No deletion action is attached to the toggle.

Release only after mode-aware server/contracts and regression checks pass, then
enable UI. Preserve historical records without destructive backfill. Rollback may
disable new looks-only submissions, but retain existing tasks/history and their
reviewability; never rewrite them into fabricated frame-based attempts.

Acceptance, implementation evidence and remaining live UAT are in 003i. The user
authorized implementation after the requirement-only turn. No paid generation,
live data migration or backend worker restart was performed during implementation.
