# Review, Validation, Approval And Binding

**Requirement ID:** `016-CLWR-004`  
**Status:** Base workflow implemented; Character Match Check production-gated  
**Priority:** P0 review/approval integrity  
**Owning capabilities:** Character Profiles; Cinematic for film binding

## 1. Outcome

Converge generated and uploaded complete Sheets into one actual-media Review
experience. Let the creator understand source and identity assurance, optionally
check Character match, explicitly approve one immutable Look Version and use it
in Cinematic without mistaking lineage for visual verification.

## 2. Entry Paths

### Generated result

1. creator selects `Review this Look Sheet` on one completed result;
2. server revalidates actor, Generation result, Character/Look/Version context,
   mode and lineage;
3. server creates/attaches the review Asset and crop manifest;
4. Generation modal closes;
5. Review & Use modal opens with the returned Review Look and actual image.

The completed candidate action must be visible without requiring the creator to
discover an action inside the full-screen image viewer. Selecting it means
`Use as review candidate`, not approval: the creator must still inspect the
actual Sheet and explicitly approve it in the following state.

No upload-rights declaration is shown for system-generated media.

### User-uploaded complete Sheet

1. file uploads through the existing owned Asset/reference path;
2. decoded preview and mismatch warning appear;
3. user accepts the upload rights declaration near the terminal action;
4. server attaches the Sheet as Review with `user_uploaded` provenance;
5. Review & Use shows the same image and `Unverified` assurance unless optional
   validation exists.

Upload remains free. Association with the selected Character does not prove
that the image visually matches that Character.

## 3. Review Presentation

The modal must show:

- complete Sheet media using `contain`, bounded to the viewport;
- Character name and pinned Character Profile Version status;
- Look name and source: System generated, User uploaded or Legacy;
- identity assurance status with concise explanation;
- Generation provider/model and recipe version when system-generated;
- front, exact-side, back and canonical-face crop previews when available;
- one quality checklist;
- previous/replace/retry path without deleting the attempt history.

Required checklist:

- exactly one Character;
- identity, apparent age, hairstyle and body proportions are consistent;
- outfit silhouette, colors, layers, footwear and accessories are unchanged;
- front, exact-side and complete back views are visible;
- canonical face is readable;
- no extra people, duplicated limbs, text, watermark or scene background.

The checklist supports human review; it is not a rights declaration or automated
validation result.

## 4. Optional Character Match Check

The optional action label is `Check Character match`, not `Verify identity`.

- It is a separate analysis operation, not image Generation.
- It compares the owned Sheet with the pinned canonical Character references.
- It uses a server-owned provider adapter, policy version and immutable evidence.
- It must show provider/model qualification state and exact Credit estimate
  before paid execution.
- React must not call `GeminiProvider.js` or any provider directly.
- It is feature-gated and hidden when no qualified provider/pricing exists.
- User may continue without it after acknowledging the mismatch warning.
- A failed check does not silently block creator-owned media; it sets
  `validation_failed`, keeps a warning and prevents a verified-match claim.
- Validation of the still Sheet never verifies identity in downstream video.

Suggested states:

| State | UI |
|---|---|
| unavailable/unqualified | action hidden; explain Unverified status only |
| available, not requested | optional action with estimate flow |
| checking | durable analysis Job/status; may leave and resume |
| passed | `Character match checked` with policy/date detail |
| needs review | warning and manual checklist emphasized |
| failed | mismatch warning; replace image or continue unverified |

## 5. Approval And Assurance Transition

Approval remains explicit and non-billable:

- system-generated without optional validation: `lineage_bound`;
- system-generated with passed check: `validated`;
- uploaded without passed check: `user_confirmed` after explicit warning;
- uploaded with passed check: `validated`;
- failed check followed by creator approval: retain `validation_failed` and
  explicit user continuation evidence; do not relabel as validated.

Approval stores the immutable approved Version, approved Sheet/view Assets,
crop manifest, provenance, assurance and evidence pointer. It does not mutate
or remove prior Job/result history.

## 6. Cinematic `Approve & Use In Film`

From Cinematic, one user CTA coordinates two existing operations:

1. approve the Review Version through Character Profiles;
2. bind that exact approved Look/Version to the selected Cast Assignment through
   Cinematic using the current Project version.

The operations remain separately idempotent and recoverable:

| Outcome | UI recovery |
|---|---|
| approval and bind succeed | close; refresh preparation and bound Look |
| approval fails | remain in Review; no bind attempted |
| approval succeeds, bind conflicts/fails | show `Look approved`; offer `Retry use in film` only |
| Project changed | refresh Project and retry binding exact approved Version |
| actor/Character changed | block bind; approved reusable Look remains intact |

Outside Cinematic, the CTA is `Approve Look`; no film binding occurs.

## 7. Rights And Warning Placement

- Complete-Sheet upload rights appears only after a real preview exists.
- It is adjacent to `Continue to review`/approval, not above unrelated AI
  Generation controls.
- It cannot be checked when no uploaded file is selected.
- It disappears for generated media.
- Mismatch warning remains visible for unverified/user-confirmed media through
  approval and downstream preparation.
- Generic terms/privacy links use real destinations when available; no fake
  navigation is introduced.

## 8. Downstream Behavior

- Story Plan/Storyboard/video receive the exact approved Version and assurance.
- `lineage_bound` and `validated` are distinct badges/tooltips.
- Unverified/user-confirmed/failed-validation Looks remain usable by explicit
  choice but show a continuity-risk warning.
- Video output itself is never marked Character-verified from still-Sheet
  evidence. A future video-output validation requirement must own that claim.
- Replacing/superseding a Look marks downstream plans stale through existing
  Cinematic continuity rules.

## 9. Implementation Steps

1. Add generated/uploaded Review projection tests, including actual media URL,
   crop manifest, provenance and assurance.
2. Build one focused Review & Use section/state inside the shared Character Look
   workflow; remove source upload and Generation controls from Review state.
3. Render authenticated `contain` media and crop previews before enabling
   approval.
4. Gate upload rights on decoded user media and move it next to the terminal
   action; hide it for generated media.
5. Add assurance labels/warnings and context-aware approval CTA.
6. Coordinate approve-then-bind with partial-success recovery and no duplicate
   approval.
7. Scaffold optional Character Match Check behind server capability/feature
   exposure; do not enable paid use until qualified.
8. Add actor, stale Project, bind conflict, validation pass/fail/skip and
   generated-vs-uploaded regressions.
9. Verify Story Plan/Storyboard projections retain the approved exact Version
   and warning status.

## 10. Acceptance

- No creator can approve without seeing the actual Sheet image.
- Generated media never asks for upload-rights confirmation.
- Uploaded media cannot check rights before a valid preview exists.
- Uploaded mismatched/unchecked media may proceed only with a visible warning
  and non-validated assurance.
- System lineage is reusable and traceable but never mislabeled as validation.
- Optional validation is quoted, actor-safe and separate from Generation.
- Approval is explicit; Cinematic binding is automatic but recoverable as a
  separate mutation.
- Downstream consumers receive complete Look, Character and assurance data.

## 11. Implementation Evidence (2026-09-01)

- Review renders actor-authorized Sheet media with `contain`, four crop previews,
  Character/Look/source context, provider/model/recipe lineage and all six human
  checklist items before enabling approval.
- Generated media does not show upload rights. Uploaded media requires decoded
  preview plus rights and retains a visible unverified warning.
- Cinematic approval binds the exact Version. A stale Project refreshes once and
  retries only the bind; a remaining failure preserves the approved reusable
  Look and exposes a bind-only retry.
- Character Match Check remains hidden because its server capability is
  `available: false` and `qualified: false`. No validation claim or paid action
  is presented.
- The Generation modal now exposes the completed candidate action directly and
  moves keyboard focus to it. Selecting it attaches the exact v2 recipe/Look
  Version result to Review; approval and film binding remain separate explicit
  transitions.
