# 011 - Character Voice Conversion API POC

**ID:** 021-PPS-011
**Date:** 2026-09-30
**Status:** Local API and optional OpenVoice adapter implemented by instruction; model installation and voice-quality qualification pending.
**Primary role:** Product Requirement Architect.
**Review gates:** Backend/security, model/license qualification and QA/native Thai listening.
**Parent:** [006 Voice](006-voice-dialogue-and-lipsync.md).
**Shared API and limits:** [010 Dialogue repair](010-dialogue-repair-api-poc.md).

## Implemented POC Contract (2026-09-30)

The caller enrolls an expiring authorized voice profile through shared
`/v1/voice-profiles`, then submits `audio.voice_conversion` to `/v1/jobs`
with `options.sourceMediaId`, `voiceProfileId`, `consentRecordId` and one to
eight ordered non-overlapping `segments` (`startMs`, `endMs`). The optional
OpenVoice V2 adapter converts source speech directly using the reference;
it never re-reads text through TTS and never silently downloads a model.
Unavailable code or checkpoint returns `voice_conversion_unavailable`.
Result, adoption, export and revocation use the same shared endpoints as 010.
The original source and accepted repair derivative can each be uploaded as
conversion source. There is no automatic two-stage job, ASR or actor labeling.
This is not qualified for Thai words, emotion or identity until operator
listening on representative clips; do not expose it as a customer capability.

## 1. Outcome And Scope

Change the sound of a selected character's speech to resemble an authorized target
reference while preserving the source words, pauses, timing and acting as closely
as possible. Use the same independent service through Postman, without a new UI.
POC inputs are isolated dialogue; preserving/separating music and ambience is out
of scope. One speaker per selected interval, no overlapping speech.

Voice conversion is a speech-to-speech operation, not simply transcription followed
by fresh TTS. Existing Thonburian/F5-TTS synthesis does not establish that an adequate
conversion engine is installed. Qualify a replaceable conversion adapter before
claiming capability. If unavailable, report unavailable rather than silently use TTS.

## 2. Postman Workflow

1. Upload source MP4 and target reference audio/video through the shared media API.
2. Select clean reference intervals manually; enroll an expiring private POC voice
   profile, or select a previously enrolled profile whose consent remains valid.
3. Specify source intervals containing only the intended speaker. Labels such as
   Rinrada are operator annotations, not diarization or biometric identity proof.
4. Submit `audio.voice_conversion` through the existing jobs API and poll status.
5. Retrieve source, reference and converted audio previews plus unchanged-picture
   video preview. Listen to both original sentences and compare timing/emotion.
6. Create another attempt, accept/export a chosen result, or return to the original.
7. Reuse the same valid profile ID on another clip without repeating enrollment.

If the source contains a mispronounced word, repair it under 010 first, inspect and
accept that result, then pass its media ID to conversion. Conversion is not a
pronunciation correction step. Record both operations in derivative lineage; do
not automatically run conversion, purchase another attempt or overwrite the repair.

## 3. Earlier Proposed Contract (Superseded For POC)

Reuse authentication, bounded upload/retrieval, job lifecycle, adoption/export,
idempotency, private retention and JSON output contracts from 010 unchanged.

Add `POST /v1/voice-profiles` for local enrollment and authenticated GET/DELETE of
`/v1/voice-profiles/{id}` for metadata/revocation. Enrollment is not model training:
store approved references and, only if needed by the adapter, derived embeddings.
These are private voice data. No public sharing, cross-user catalog or durable
Core Character Voice Asset registration in the POC.

Enrollment requires reference media/intervals, matching reference transcript when
required by the adapter, consent record and optional character label. Return
profile ID/version, model compatibility, quality warnings and expiry. POC profile
retention defaults to the same 24 hours as 010; explicitly retain referenced media
until that expiry, never indefinitely. Expired/revoked references invalidate reuse.
Long-term saved character voices require a later Core-owned private asset workflow.

Example conversion request:

```json
{
  "operation": "audio.voice_conversion",
  "sourceMediaId": "media_accepted_repair_or_original",
  "options": {
    "segments": [
      { "startMs": 1000, "endMs": 3200 },
      { "startMs": 3800, "endMs": 6200 }
    ],
    "voiceProfileId": "voice_rinrada_poc",
    "voiceProfileVersion": 1,
    "language": "th",
    "timingPolicy": "preserve_source",
    "consentRecordId": "poc_consent_001"
  }
}
```

Maximum eight ordered non-overlapping intervals per request and 20 seconds total
selected speech initially; configuration owns these limits. All selected intervals
must contain only the same target speaker. Reject overlapping/invalid selections;
do not automatically extend scope to another speaker. Manual speaker selection is
the POC contract; automatic diarization remains deferred under 005.

## 4. Conversion And Quality Contract

- Check decoding, reference length, clipping, silence and signal quality with
  implemented measurements and truthful confidence. Request better references on
  failure. Human review covers speaker purity/noise when detection is unavailable.
- Convert isolated source speech using target voice conditioning. Preserve words,
  ordering, silence positions, expressive dynamics and timing within qualified
  tolerance. No text rewriting or invented utterances.
- Keep output exactly the selected editing-master sample length without excessive
  time compression or word truncation. If conversion changes content or cannot fit,
  mark rejected/needs review and allow a new attempt; do not publish automatically.
- Do not mix original speech beneath converted speech. Outside selected intervals,
  preserve original PCM. Boundary fades stay within those intervals.
- Use the shared 010 compositor/exporter: untouched video stream, same timeline,
  disclosed compressed-audio encoding limitations and audiovisual checks.
- Word correctness, target resemblance, Thai tone, emotion and seam quality require
  listening. Transcript/similarity scores are advisory, not automatic approval.
- Profiles are bound to reference hashes, model compatibility, consent and version.
  Changing any authority creates a new version and invalidates stale submissions.

## 5. Model And Operational Gates

Do not hard-code an untested conversion model as canonical. Compare candidate
adapters on Thai speech, target resemblance, source rhythm/emotion, GPU memory,
latency and separate code/checkpoint commercial rights before choosing defaults.
All model/device/version/checksum and limits are configuration-driven. Unqualified
operations default off in capability discovery, even when model files exist.

Reuse the same inference concurrency, timeout, queue cutoff, privacy and cleanup
rules as 010. Revocation disables new enrollment/use/retry; an active job must not
publish new artifacts after revocation. Historical local previews remain subject
to explicit removal and the documented TTL, not an invisible indefinite archive.
No new Credit charging, paid provider fallback, training process or public API.

## 6. Acceptance And Postman Cases

- Both source sentences remain intact: no added, omitted or changed words, judged
  by a Thai listener comparing source and output; reference similarity is accepted
  by the operator, not claimed guaranteed by a model score.
- Timing/pauses and emotion stay acceptably close; mouth motion is inspectable in
  preview and is never regenerated by this operation.
- Only selected intervals change; the original speech is not audibly doubled.
- Source video and duration are preserved using shared export checks; original and
  prior attempts remain recoverable within disclosed retention.
- A profile can be reused on a second clip. Expired/revoked/incompatible profiles
  fail explicitly; no fallback to another voice.
- Poor reference, unavailable adapter, mixed/overlapping speakers, out-of-range
  segments, timeout, cancellation and repeated requests have bounded safe outcomes.
- Repair -> conversion -> accepted export lineage can be traced back to the
  original. Every step requires explicit operator action in this POC.

Implementation, model choice and human evidence are pending. No claim is made
that current synthesis APIs already satisfy this requirement. See the
[shared ordered POC plan](implementation-plan/008-dialogue-api-poc.md).
