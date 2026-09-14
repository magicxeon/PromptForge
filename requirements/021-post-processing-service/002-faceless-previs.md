# 002 - Faceless Previs From Existing Media

**ID:** 021-PPS-002
**Status:** First implementation slice planned; no service or UI path implemented
**Owners:** Post-Processing detection/composition; Cinematic source choice;
Core Assets derivative authority; Generation retains paid Image Generate
**Depends on:** 001 minimal API/media contract; 007 face-model license gate

## Outcome

Give Storyboard authors an optional, deterministic way to turn an existing
photoreal image into white Faceless previs without asking an image provider
to draw blank faces. Inputs may be (a) a new normal full-face Storyboard
generation candidate or (b) the verified last frame of the immediately
preceding approved video Take. The source image is preserved.

## User Choice And Existing Behavior

- Image Settings clearly distinguishes **Full-face Generate**, **Generate
  Faceless** (existing blank and white treatments) and **Mask an existing
  image** (white previs in P0). A processing failure does not change the
  selected generation provider/model or current approved Storyboard source.
- For a new image, the mask path first generates a normal photoreal image
  through the existing Generation quote/submit/Job/Assets lifecycle, then
  offers Post Processing on that completed image. It does not use the
  Faceless provider prompt for that paid generation.
- For a previous Take, use the existing explicit last-frame extraction
  and eligibility; Post Processing consumes its immutable PNG. First-Shot,
  unapproved Take, stale/invalid media and cross-Scene rules remain as owned
  by Cinematic. No video-frame extraction workflow is cloned in this service.
- The existing normal and provider-generated blank/white paths remain
  selectable. No silent automatic provider Generate on postprocess failure:
  a new paid action requires the user's explicit quote and confirmation.
- A visible white mask during roughly the first half-second of a resulting
  video is accepted for this pilot; do not add a policy gate that blocks use
  solely for that transition. Provider acceptance and visual quality remain
  separate review questions.

## Detect, Compose, Review

1. Core submits one owner-authorized source Asset/version/hash for
   image.face_landmarks. A pinned local MediaPipe Face Landmarker model
   returns normalized polygons/head orientation and confidence for each
   detected visible face; image bytes stay within the private service path.
   Configure the detector's maximum face count explicitly for the P0 bound;
   its documented default is one face and is insufficient for two-Character
   Storyboards. Compare detected faces with expected visible subjects and
   require visual review; a detector alone cannot prove it found every face.
2. P0 has no manual face-outline editor. If detection is unavailable,
   ambiguous, incomplete for visibly faced subjects, out of bounds or above
   limits, return a specific non-destructive failure. Never silently mask
   only one of multiple visible faces and claim completion. No-person Scenes
   are not forced through this operation.
3. image.faceless_previs composites pale matte-white surfaces and faint
   orientation guides only within reviewed face regions. Hair, ears, neck,
   body, wardrobe, props, scene geometry and pixels outside the bounded
   mask remain identical to source. No generative inpainting, face restoration
   or global color treatment is part of P0.
4. Core imports and verifies the immutable derivative. Preview both source
   and derivative, with face count and a plain status. User approval uses
   Cinematic's existing version-checked Storyboard source command with a
   typed postprocessed source, not a forged Image Job. Current approved
   media/history persists until explicit replacement.
5. Source Asset/Take, mask geometry or model/policy revision changes produce
   new lineage and selectively stale dependent downstream approvals, without
   deleting old media or auto-regenerating video.

## Provenance And Failure Matrix

Derivative metadata pins parent Asset/version/hash, Project/Scene/Shot,
source origin (generated image or previous-video frame), source Take if any,
face-landmark model ID/version/hash, mask-policy version, polygons,
processing job ID, output checksum and approval state. Private facial
coordinates are not published in public snapshots.

| Condition | Outcome |
|---|---|
| All required faces detected, output validated | Preview only; explicit approval required |
| No/low-confidence/partial faces, corrupt input or timeout | Original stays; show reason and both existing Generate treatments |
| Source replaced while processing | Reject stale result; do not auto-approve |
| Service unavailable | Keep original, previous approved image and Generate controls usable |
| Duplicate request | Return same immutable derivative or same terminal failure |

## Acceptance And Evidence

- Still and previous-video-frame inputs work through one service operation;
  original pixels outside mask are byte-for-byte equal after deterministic
  decode/comparison, aside from an explicitly documented encoding boundary.
- At least front, three-quarter, profile, distant, two-person, rain/low-light
  and occlusion fixtures prove success or safe failure. No claim that every
  photo can be masked automatically.
- UI displays localized processing/error/retry and does not trigger paid
  fallback, duplicate work, or change approvals on failure.
- Existing provider-generated blank/white and full-face paths remain
  covered by regression tests. No live provider call is part of isolated
  checks; later opt-in UAT tests image and video behavior separately.

See [P0 implementation plan](implementation-plan/001-faceless-previs-first.md).
