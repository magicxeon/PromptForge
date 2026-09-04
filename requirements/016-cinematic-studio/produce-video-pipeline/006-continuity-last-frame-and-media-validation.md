# Continuity, Last Frame And Media Validation

**Requirement ID:** `016-PVP-006`  
**Status:** Requirement complete; implementation not started  
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

