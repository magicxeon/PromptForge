# Final Assembly, Audio And Export

**Requirement ID:** `016-PVP-007`  
**Status:** Requirement complete; implementation not started  
**Priority:** P1 final film completion

## 1. Objective

Convert the active Timeline of current approved Shot clips into one durable,
playable and downloadable master without bypassing Generation, Assets, Credits
or Project completion rules.

## 2. Assembly Preconditions

The server prepares an export only when:

- every required Timeline Shot has one current approved video Asset Version;
- no selected source is stale, missing, technically invalid or unauthorized;
- trim points fit probed source durations;
- transition types/durations are supported and do not create invalid overlap;
- resulting duration is shown against the Project target;
- audio requirements are satisfied or the Project is explicitly silent;
- an assembly runtime and required codecs are healthy;
- any applicable exact quote can be produced.

For internal assembly qualification, approved draft clips may be used and the
result remains explicitly non-release evidence. Customer completion requires
every selected clip to satisfy the configured final-source policy. A draft
Asset cannot become final merely through Timeline selection or renaming.

Preparation returns ordered blocking findings and recovery stages. It does not
mutate the Timeline or start rendering.

## 3. Immutable Assembly Contract

The accepted request pins:

- Project, Timeline and export-manifest versions/fingerprints;
- ordered Scene/Shot IDs and approved attempt/video Asset Versions;
- per-clip trim in/out;
- transition type, overlap and duration;
- output ratio, dimensions, frame rate, codec/profile and quality preset;
- audio source/mix plan and loudness target;
- poster strategy;
- assembly-policy/configuration version;
- quote/reservation IDs when billable;
- idempotency key and actor ownership.

The processor consumes this immutable contract. It never reads “latest” assets
during a running render.

## 4. Canonical Lifecycle

`cinematic_final_assembly` is a durable Generation operation even when executed
by a local FFmpeg worker:

```text
prepare -> quote/qualification consent -> queued -> resolve sources
-> probe -> normalize -> trim -> transition -> audio mix
-> encode -> final probe -> persist master/poster -> settle -> ready
```

Routes and React do not spawn FFmpeg. A Generation-owned processor invokes the
media service, reports bounded progress and uses the same Job/recovery
semantics as provider-backed operations.

## 5. Media Processing

The first qualified final profile is:

- MP4 container;
- H.264 video, broadly compatible pixel format and progressive scan;
- Project 9:16 dimensions selected from supported export policy;
- one configured frame rate, initially 24 fps unless source/project policy
  specifies otherwise;
- AAC audio when an audio track exists;
- web playback metadata optimized for progressive download (`faststart`);
- orientation rendered into pixels and metadata normalized.

Inputs may be MP4 or MOV. Each is decoded and normalized; files are never
concatenated as raw container bytes.

## 6. Trims And Transitions

- Trim authority belongs to the active Timeline, not to the source Asset.
- `cut` adds no overlap.
- `dissolve` and `fade` use bounded, validated durations and update final length.
- A transition cannot consume an entire neighboring clip.
- UI duration and server-rendered duration use one shared calculation policy.
- The final probe compares measured duration with the predicted value under a
  documented tolerance.

## 7. Audio Policy

Every Project declares one final audio mode:

- `silent_intentional`;
- `clip_audio` using approved generated clip audio;
- `approved_assets` using voice, ambience and/or music Assets;
- `mixed` using both under a versioned mix plan.

Rules:

- Exact dialogue or a quoted voice message requires an approved audio Asset or
  separately qualified exact-speech capability.
- Generated ambience/dialogue is not treated as authored text merely because a
  provider produced an audio track.
- Missing required audio blocks completion but may allow visual Shot approval.
- Silent clips in a non-silent Timeline receive explicit silence during
  normalization so transitions remain deterministic.
- Source ownership, rights and timing are validated before render.
- Initial mixing supports bounded gain, fades and target loudness only; voice
  cloning and advanced sound design are out of scope.

## 8. Output Assets

Successful assembly creates:

- one immutable `cinematic_final_master` Asset Version;
- one poster derivative or an explicit recoverable poster state;
- checksum, bytes, duration, dimensions, codec and audio metadata;
- assembly Job, Timeline, source Asset Versions and policy provenance;
- owner-scoped stream/download authorization.

The Project pins the approved export/master version. A later rerender creates a
new master and retains prior history.

## 9. Idempotency, Recovery And Cleanup

- Repeated submit with the same assembly fingerprint/idempotency key returns the
  original Job.
- Restart resumes from durable state or safely restarts deterministic local
  processing without another provider charge.
- Temporary files use a bounded Job directory and are removed only after output
  copy/evidence is durable or retention policy expires.
- Failed assembly preserves approved Shot clips and Timeline.
- Missing runtime/codec fails before any billable reservation when detectable.
- A valid encoded master with failed Asset persistence is recovered by copy,
  not rerendered unless the temporary artifact is gone.

## 10. Credits Decision Gate

Initial assembly is a qualification operation and must not invent a Credit
price. Before customer rollout, Commercial chooses and documents one policy:

- included with the paid clips;
- free deterministic assembly within bounded limits;
- separately quoted by duration/output profile.

Whichever policy is selected must use Credits-owned quote and settlement
contracts and must be visible before render. This open decision blocks paid
launch, not technical qualification.

## 11. Finish UX

Finish shows:

1. compact completeness and stale-source summary;
2. ordered Timeline with trim and transition controls;
3. predicted final duration and audio readiness;
4. exact quote or explicit qualification/no-charge status;
5. durable assembly progress and recoverable findings;
6. final master preview, download and version history;
7. explicit `Complete project` only for a current valid master.

Download uses an owner-authorized Asset endpoint. The UI never exposes a local
filesystem path or expiring provider URL.

## 12. Project Completion

The Project may enter `completed` only when the selected master:

- comes from the current Timeline fingerprint;
- passes final technical validation;
- satisfies audio intent;
- has settled/reconciled financial state;
- remains accessible to the owner;
- is explicitly accepted as the current final output.

Changing an upstream approved source after completion marks the export stale and
requires a new assembly; it does not delete the historical completed master.

## 13. Deployment Readiness

Startup/health evidence records FFmpeg/ffprobe availability, approved minimum
version and required codecs/filters. Production configuration provides bounded
CPU, memory, disk, timeout and concurrent assembly limits. Absence reports
`cinematic_final_assembly_unavailable` and does not leave Jobs spinning.

## 14. Acceptance

- A multi-Shot fixture with trims and at least one dissolve produces one valid
  MP4 master in Story order.
- Predicted and probed final duration agree within policy tolerance.
- Mixed silent/audio clips normalize without timestamp or playback failure.
- Exact-dialogue Projects cannot complete without approved audio authority.
- Retry/restart creates no duplicate master, reservation or settlement.
- The current master plays and downloads from Assets after provider URLs expire.
- Existing Timeline metadata and prior qualification manifests remain readable.
