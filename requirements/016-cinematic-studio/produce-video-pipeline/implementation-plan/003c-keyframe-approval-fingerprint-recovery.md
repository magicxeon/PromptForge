# Package 003C - Keyframe Approval Fingerprint Recovery

**Plan ID:** `016-PVP-IP-003C`  
**Status:** Implementation complete; paid provider qualification pending  
**Primary capability:** Cinematic server domain  
**Primary role:** Backend Platform Architect  
**Reviewers:** Generative Cinematic Production Director, QA Release Engineer  
**Triggered Skills:** `implement-generation-workflow`, `direct-generative-cinematic-production`, `review-generative-media-pipeline`

## 1. Problem

Storyboard batch Generation records the current keyframe-contract fingerprint
before approval. Approval then increments the Shot concurrency version without
changing any visual authority. The old fingerprint included that concurrency
version, so the approved image becomes `cinematic_video_keyframe_contract_stale`
immediately and Produce cannot quote or submit it.

The affected sample Project has five approved Storyboard Assets. Recompiling
each contract with its pre-approval Shot version reproduces the stored approved
fingerprint exactly, proving the mismatch is revision metadata rather than a
visual-authority change.

## 2. Required Behavior

1. Keyframe source fingerprints represent visual and narrative authority, not
   optimistic-concurrency counters.
2. `projectVersion`, `sceneVersion` and `shotVersion` remain present in the
   contract for stale-write protection and lineage, but do not alter the
   semantic source fingerprint by themselves.
3. A real change to the visible moment, action, Character, Look, composition,
   performance, environment, continuity, prompt configuration or approved
   reference plan must still change the fingerprint.
4. Existing approved Storyboard attempts created with the former versioned
   fingerprint remain usable only when that fingerprint can be reproduced from
   the current semantic contract using a historical Shot revision.
5. Arbitrary or semantically stale fingerprints remain blocking. No source,
   Character, Look, prompt, reference or ownership gate may be bypassed.

## 3. Implementation Steps

### 003C.1 Correct fingerprint ownership

- Keep revision numbers in the returned keyframe contract.
- Build `sourceFingerprint` from the normalized semantic contract and compiled
  prompt after excluding Project, Scene and Shot concurrency versions.
- Keep Story Plan, Beat, Character version, Look Asset and configuration
  authority in the fingerprint.

### 003C.2 Add bounded legacy compatibility

- Centralize fingerprint matching in the keyframe compiler owner.
- Accept the current semantic fingerprint directly.
- For an existing versioned fingerprint, compare bounded historical Shot
  revision candidates against the current semantic payload.
- Treat a mismatch as `cinematic_video_keyframe_contract_stale` exactly as
  before. Do not mutate approved attempts during a read.

### 003C.3 Preserve the Generation and Credit path

- Keep React -> Cinematic quote -> Generation quote -> Credit estimate as the
  only quote path.
- Keep submission behind the existing Cinematic application service and
  Generation task lifecycle.
- Do not submit to a live provider during implementation verification.
- Prove quote has no reservation, capture or Credit-ledger mutation.

### 003C.4 Verify output-to-preview handoff

- Verify the prepared request contains the approved Asset Version as
  `first_frame`, current video packet fingerprint, provider-rendered prompt,
  duration, aspect ratio, resolution and audio mode.
- Use a fake completed provider task with a passing technical probe to verify
  submit, polling/result projection, approval and browser video preview.
- Keep approval disabled until output is terminal, settled and technically
  valid.

## 4. Acceptance Tests

- Batch-generated keyframe remains Produce-eligible immediately after approval.
- Version-only changes do not alter keyframe source fingerprint.
- A visual-authority change still alters the fingerprint and blocks stale input.
- All five approved sample Project Shots return `generationEligible: true`.
- A quote for an eligible POC Seedance combination returns the configured
  one-Credit estimate without creating a reservation or provider task.
- Fake submit-to-completed flow exposes a playable video URL in Produce.
- Idempotency, reservation-before-dispatch, terminal polling, technical probe,
  approval and stale packet tests remain green.

## 5. Stop Gates

- Do not auto-approve or regenerate a Storyboard image.
- Do not rewrite stored lineage merely to make the button enabled.
- Do not call Seedance, Veo or another paid provider during automated checks.
- Stop if compatibility cannot prove an exact cryptographic match to current
  semantic authority.

## 6. Implementation And Verification Record

- The keyframe compiler now owns semantic and bounded legacy fingerprint
  matching. Project, Scene and Shot concurrency versions remain in lineage but
  no longer invalidate visually unchanged approved keyframes.
- Produce uses that canonical matcher before compiling or quoting a video
  packet. Arbitrary stale fingerprints and real visual-authority changes remain
  blocking.
- All five approved Shots in `cineproj_1787841798259_d5rmu2tx` were verified as
  `generationEligible: true` with an approved `first_frame` Asset Version.
- A quote-only check used ModelArk Seedance 2.5, image-to-video, 9:16, 720p,
  six seconds, no audio and one first-frame reference. It returned the guarded
  one-Credit POC estimate without creating a reservation, ledger entry or
  provider task.
- A fake completed and captured provider task with a passing media probe was
  projected to the Produce video preview. No paid provider submission was made.
- Automated evidence: 108 relevant server tests passed, four focused Produce
  React tests passed, and the production web build completed successfully.
- Remaining gate: first-frame transport, provider result quality, latency and
  real billing behavior still require the explicitly planned paid qualification
  run before Seedance 2.5 can be promoted beyond development POC status.
