# Continuity, Last Frame And Media Validation

**Requirement ID:** `016-PVP-006`  
**Status:** Storyboard reuse implemented with isolated tests; live UAT and broader continuity strategy remain open
**Priority:** P1 sequence quality and approval gate

## 1. Objective

Turn separately generated video Shots into a coherent sequence by selecting an
explicit reference strategy per transition, preserving evidence of last frames,
and validating each output technically and creatively before approval.

## 2. Continuity Strategy By Transition

| Authored transition | Default generation strategy | Rule |
|---|---|---|
| Hard cut to a new visual beat | Approved current Storyboard keyframe only | Do not force the previous composition into a deliberate cut |
| Continuing action in same space | Qualified first/last or previous-last-frame strategy | Preserve screen direction, pose/prop state and environment |
| Match cut or dissolve | Authored current first frame plus qualified continuity reference | Match only the declared visual anchor |
| Fade to/from black | Independent current first frame | Assembly owns fade; provider need not generate black frames |
| New Scene/location/time | Approved current Storyboard keyframe only by default | Previous Scene media is narrative context, not visual authority |

The strategy is prepared before quote and shown in concise form. It is not
chosen from whatever prior Asset happens to exist.

## 3. Reference Authority

Reference precedence follows `003-video-execution-contract-and-prompt-configuration.md`.
A previous clip last frame may assist only when:

- the previous Shot has a current approved clip;
- the transition declares continuing visual action;
- the selected provider/model/mode is qualified for that role;
- Character/Look and environment authority are not weakened;
- the previous source and last-frame Asset fingerprints are current.

If the reference cannot be sent, preflight blocks or deliberately uses the
qualified independent-keyframe route. It never silently swaps the approved
Storyboard first frame.

### 3.1 Explicit Previous Last Frame As The Current Storyboard Source

The creator may explicitly reuse the **immediately preceding Shot's selected,
approved video Take** as the current Shot's Storyboard image, without running
Image Generation. This is a distinct Storyboard source choice, not the
auxiliary continuity-reference strategy above and not an automatic fallback.
The existing generated-image path remains the default. Never infer authority
from whichever Take happens to be previewed or most recently generated.

- Place **Use previous Shot's last frame** in the current Shot's Storyboard
  **Image Settings**, close to source/reference controls and before Generate.
  Show a compact source preview, previous Shot/Take identity and frame time.
  Keep the existing image-generation controls available for switching back.
  Reuse the same control in the Simple Storyboard image section; do not make
  this an Advanced-only capability or add a second extraction workflow.
- The action is disabled for the first Shot, when the preceding Shot has no
  generated video, or when no **current approved-for-use** Take with a durable,
  technically verified video Asset exists. A merely generated but unapproved
  Take is not authority: show "Choose and approve a Take in the previous Shot"
  rather than silently selecting it. Processing, failed, missing, refunded,
  stale or inaccessible media also disables the action with a specific reason.
- Resolve the predecessor by current Story Plan/Scene Shot order, not file
  creation time or the latest task. Default to same-Scene continuing action;
  crossing a Scene/location/time boundary requires explicit transition intent
  and an additional confirmation. A hard cut or fade keeps its independent
  Storyboard image by default.
- The default extraction point is the last decodable frame at or before the
  selected Take's **approved usable out-point**, bounded by the actual media
  duration. Pin the exact timestamp, time base, video Asset Version, approved
  attempt and content checksum. Do not use the poster, an arbitrary browser
  screenshot, the encoded file's possibly invalid final packet, or a frame
  beyond an approved trim. If a later Finish trim changes the intended cut
  point, show that the pinned Storyboard frame may no longer match; do not
  silently replace it.
- Assets extracts and stores an owner-scoped immutable still derivative from
  the durable local video, with orientation/aspect, MIME, dimensions, checksum,
  source time and provenance. Extraction is idempotent and retryable without
  calling an image/video provider or charging Generation Credits. Reject an
  unreadable, blank/black or otherwise technically invalid frame with a clear
  recovery path; creator still judges creative suitability before use.
- The creator previews the extracted frame, then explicitly chooses **Use as
  Storyboard source**. Extend the existing Cinematic source-approval use case
  to accept a typed `previous_video_last_frame` Asset Version; do not forge an
  Image Job ID or create a second approval workflow. Persist parent Project,
  Scene, Shot, Take, video Asset Version, frame timestamp and fingerprints in
  current Shot source lineage. Preserve the old generated Storyboard image and
  unapproved candidates as history until explicit replacement.
- A changed/replaced predecessor Take, media Asset, frame timestamp or Shot
  order makes only dependent derived Storyboard sources and downstream video
  Attempts stale. Preserve media/history and offer re-extract/reselect; never
  propagate an unapproved or stale frame into further Shots. Revalidate actor,
  source and Project/Shot versions when extracting **and** when approving.
- The Storyboard frame may be used for composition and source preview even when
  the selected video model forbids first-frame input. Quote/submit must still
  obey that model's current input-mode, reference-count, Character/Look and
  provider trust checks; this option does not unlock Seedance first-frame use
  or guarantee that a provider accepts the frame.

Acceptance: a qualified Shot 1 Take supplies a previewable, durable frame for
Shot 2 without an Image Generation Job or Credit reservation; the button is
disabled with the correct reason before Shot 1 has a generated **and approved**
video. Approval pins exactly the shown frame. Replacing Shot 1's selected Take
stales Shot 2's dependent source, not unrelated Shots. Previewing another Take
alone changes nothing. A first Shot, new Scene without explicit continuity,
missing/corrupt media and unsupported provider mode never trigger an implicit
fallback or paid generation.

Implementation evidence for Section 3.1: `server/domain/assets/CinematicLastFrameService.js`
extracts an immutable, checksum-verified derivative; Cinematic's existing
approval command accepts its typed Asset, and `StoryboardShotDialog` presents
preview/approval in Image Settings. `node scripts/test-cinematic-video.js
last-frame`, `node scripts/test-cinematic-video.js last-frame-ui`, and
`node scripts/verify-cinematic-last-frame-layout.mjs` are the focused checks.
The last command requires a local Vite server. These checks use local/disposable
media only; real project/provider UAT and later Finish trim reconciliation are
not certified by them.

## 4. Last-Frame Asset

When a qualified provider returns a last-frame image, or when the canonical
media processor extracts one, Assets persists an immutable derivative with:

- source video Asset ID and Version;
- Shot/attempt/Job/provider task IDs;
- extraction source (`provider_returned` or `server_extracted`);
- timestamp, width, height, MIME, checksum and storage locator;
- provider/model/input-mode and packet/reference fingerprints;
- owner, visibility and authorization metadata.

Provider-returned and server-extracted frames are not assumed identical. The
chosen authority is recorded. Regeneration creates a new version rather than
overwriting prior evidence.

## 5. Technical Media Validation

Every completed provider output is probed before `ready_for_review`:

- container and readable video stream;
- non-zero, bounded duration;
- dimensions, display aspect ratio and orientation;
- frame rate, time base and monotonic timestamps;
- codec/profile/pixel format supported by preview and assembly;
- audio stream presence/absence versus requested mode;
- file size and checksum;
- first-frame decode, poster and last-frame extraction where required.

Probe output is normalized into typed metadata. Raw command output is not sent
to the client. A technical failure keeps the Asset/Job evidence but blocks Shot
approval.

## 6. Creative Review Rubric

The review surface records creator and optional automated findings for:

- approved first-frame match;
- Character face/body identity;
- wardrobe and prop state;
- one primary action and intended end state;
- visible emotion, gaze, gesture and restraint;
- camera movement, framing and screen direction;
- environment, lighting and spatial continuity;
- duration, pacing and transition readiness;
- audio requirement and synchronization where applicable;
- unexpected text, persons, malformed anatomy or unusable artifacts.

Automated findings advise or block only according to versioned policy. They do
not auto-approve or silently regenerate.

## 7. Approval Preconditions

Approval requires:

- completed Generation and settled/reconciled Credit state;
- durable video Asset and passing technical probe;
- current Storyboard source, Shot, packet and reference fingerprints;
- no blocking trust, audio or continuity finding;
- explicit user confirmation.

The approval record pins attempt ID, video Asset Version, technical-evidence
version and source fingerprints.

## 8. Staleness Rules

Changes to any of these mark dependent output stale:

- approved Storyboard source/version;
- one-Shot action, timing, camera, Character/Look or continuity authority;
- packet/reference plan that affects execution;
- approved previous clip used as a continuity reference;
- audio authority used by the Shot.

A label, collapsed panel, local selected tab or unrelated Shot edit does not.
Stale attempts remain visible but cannot enter a new Timeline/export.

## 9. Failure Recovery

- Missing/invalid last frame: retry derivative extraction without regenerating
  when source media is valid.
- Invalid video: retry generation or route to Support; never approve by hiding
  the probe result.
- Creative drift: regenerate the selected Shot with one bounded correction.
- Previous Shot changed: invalidate only consumers that reference its approved
  output/last frame.
- Provider cannot support continuity strategy: choose another qualified model
  or return to Storyboard; do not add unsupported references.

## 10. Acceptance

- Cut and continuing-action transitions produce different, explicit reference
  plans.
- Last-frame evidence is durable, owner-scoped and traceable to one attempt.
- A corrupt/zero-duration clip cannot be approved.
- Re-extracting a derivative does not invoke or charge the provider again.
- Changing one approved prior clip stales only dependent continuity consumers.
- Review remains usable without automated creative analysis.
