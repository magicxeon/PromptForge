# 010 - Dialogue Repair API POC

**ID:** 021-PPS-010
**Date:** 2026-09-30
**Status:** Local API code and Postman contract implemented; runtime/model and Thai-listener qualification pending.
**Primary role:** Product Requirement Architect.
**Review gates:** Backend/security for private audio and API; QA plus native Thai
listening for qualification. These are planned reviews, not completed sign-offs.
**Parent:** [006 Voice](006-voice-dialogue-and-lipsync.md).
**Next:** [011 Voice conversion](011-character-voice-conversion-api-poc.md).

## Implemented POC Contract (2026-09-30)

The authorized implementation uses authenticated raw-binary `POST /v1/media`
(`video/mp4`, WAV or MP3), not multipart. Enroll an expiring reference via
`POST /v1/voice-profiles`, then create `audio.dialogue_repair` through the
existing `/v1/jobs` facade. `options` contains `sourceMediaId`,
`voiceProfileId`, `consentRecordId`, `startMs`, `endMs` and `replacementText`.
The voice profile owns the reference media/interval/transcript. A matching
transcript and operator-maintained consent record ID are mandatory for repair.
`X-Idempotency-Key` is required. Get result and private Base64 artifact through
existing job/media endpoints. Explicit `POST /v1/jobs/{id}/adoption` then
`POST /v1/jobs/{id}/export` creates a separate derivative without inference.

The shared queue terminalizes interrupted audio jobs, bounds wait/execution,
and kills its worker on cancellation or timeout. The audio master preserves
PCM outside the selected interval; video export stream-copies picture and
re-encodes audio. The actual implementation uses `queued`, `processing`, and
terminal stages, not speculative sub-stages. The adapter cannot detect mixed
audio or certify pronunciation, actor identity or mouth sync. Do not call this
release-ready until isolated-clips, Thai listening and packet/timing tests pass.
See [operator guide](../../post-processing-service/CURL_GUIDE.md) and
[evidence plan](implementation-plan/008-dialogue-api-poc.md).

## 1. Approved POC Scope

Repair a mispronounced Thai word, phrase or sentence in a video with user-provided
text and a reference of the same character's voice. Run in the existing separate
Python post-processing-service, called directly through Postman on loopback.
Start with one manually selected interval and one speaker per request.

The user explicitly defers music/ambience separation and preservation. Qualifying
POC inputs contain isolated dialogue: no overlapping speakers or material music.
Mixed audio is unsupported for this POC; do not promise preserved background,
silently attempt separation, or market a mixed-audio result as qualified.

No Cinematic UI, waveform editor, mandatory transcript, automatic diarization,
lip-sync, Core integration, public deployment or Credit charging in this slice.
The original UI/transcript and mixed-audio goals remain later work under 005/006.
Local inference still has compute cost; non-billable does not mean cost-free.

## 2. User Flow Via Postman

1. Upload a private test video such as `006-3.mp4` and optional reference WAV.
2. Supply `startMs` and `endMs`, corrected text and a reference selection. Selection
   is independent of ASR, even if a transcript would spell the original correctly.
3. Submit a job, poll bounded status, retrieve original/repaired preview artifacts.
4. Listen and inspect the unchanged picture against the repaired speech externally.
5. Retry with a new request ID, adjust the interval, accept an attempt, or discard it.
6. Export a new MP4 from the accepted attempt. Preserve original and earlier takes
   until explicit removal or the documented private POC retention deadline.

Example: replace `เดียว` with `แบบเดียวกัน`; if timing or seams fail, resubmit a
larger interval with `หรือว่าจะเป็นกลไกแบบเดียวกัน`. Do not extend the interval,
rewrite the text or generate extra takes automatically.

## 3. Earlier Proposed API Contract (Superseded For POC)

Use the current `/v1` prefix and existing JobQueueManager entry point. Historical
`/api/v1` examples in 001 are not a second route family. Media upload and attempt
adoption/export are shared with 011, not duplicated by operation.

| Request | Purpose |
|---|---|
| `POST /v1/media` | Bounded multipart `file`; return opaque media ID, hash, type, duration and expiry |
| `POST /v1/jobs` | Existing job envelope extended for `audio.dialogue_repair` |
| `GET /v1/jobs/{id}` | Existing status API with finite terminal outcomes |
| `GET /v1/jobs/{id}/result` | Attempt, lineage, timing evidence and preview artifact references |
| `DELETE /v1/jobs/{id}` | Existing cancellation command, not deletion of the original |
| `POST /v1/jobs/{id}/adoption` | Explicitly select a successful attempt for export; no inference |
| `POST /v1/jobs` with `audio.dialogue_export` | Export an adopted attempt as a new file; no new synthesis |
| `GET /v1/media/{id}` | Authenticated retrieval of a bounded private artifact |
| `DELETE /v1/media/{id}` | Explicit cleanup; reject deletion while a job actively depends on it |

The table and sample below record the earlier proposal; the implemented POC
contract above and operator guide are authoritative where they differ.
All control/status/result responses stay JSON. For this bounded POC, retrieval
returns `{mediaId, mimeType, sha256, expiresAt, bytesBase64}` to preserve the current
JSON-only service rule. A documented local decoder turns the result into WAV/MP4;
Postman is not expected to play video inline. No public download links or arbitrary
source paths/URLs. Binary private download is a separate future contract decision.
Never persist Base64 in job metadata or log/export it in a committed collection.

Proposed job payload; all IDs refer to authenticated uploads, not filesystem paths:

```json
{
  "operation": "audio.dialogue_repair",
  "sourceMediaId": "media_source",
  "options": {
    "startMs": 1200,
    "endMs": 2800,
    "replacementText": "แบบเดียวกัน",
    "language": "th",
    "reference": {
      "mediaId": "media_reference",
      "startMs": 0,
      "endMs": 6000,
      "transcript": "ข้อความที่ตรงกับเสียงอ้างอิง"
    },
    "timingPolicy": "fit_segment",
    "consentRecordId": "poc_consent_001"
  }
}
```

Require `x-post-processing-token` and `X-Idempotency-Key`. Reference may instead
point to a clean interval of the source video. Reference transcript is required
when the selected synthesis adapter requires it; never substitute sample text or
an unrelated fallback voice. Example times are illustrative, not a quality claim.

## 4. Processing And Timing

- Probe media and decode its audio through a shared FFmpeg adapter. Respect actual
  timestamps, audio start offsets, sample rate and channels. Reject unsupported
  multiple audio-track selection in the first POC; do not silently pick a track.
- Validate `0 <= startMs < endMs <= sourceDurationMs`; map to sample boundaries
  and return effective boundaries, with at most one-sample rounding difference.
- Synthesize corrected text from the authorized reference. Reuse the existing
  Thonburian/F5-TTS integration behind an adapter, subject to local quality and
  checkpoint-license qualification. Do not assume it guarantees Thai correctness.
- Render a naturally paced candidate first. Fit within configured safe time-stretch
  bounds while preserving pitch; allow bounded silence placement if appropriate.
  Never truncate words or force excessive speed merely to satisfy duration.
- If fitting fails, return `audio_timing_unfit` with target/generated durations
  and suggested adjustment. Keep original; require user choice to extend/retry.
- Match level and boundary fades within the selected interval only. Do not apply
  global denoise/normalization; do not keep the original speech under replacement.
- Preserve PCM samples outside the effective interval exactly in the editing
  master. Export re-encoding (e.g. AAC) is not guaranteed bit-identical; retain a
  lossless audio master and disclose encoding effects separately from editing.
- Copy the original video stream without re-encoding where supported. If stream
  copy is incompatible, return an unsupported-export error rather than changing
  the picture. Validate packet/frame timing and no accumulating audio/video drift.
- Keep the same video timeline/duration. Measure audio padding/encoder delay;
  exported presentation must fit a documented tolerance, initially <= one video
  frame, without adding/trimming video frames. User preview is the final sync gate.

## 5. Shared Safety, Lifecycle And Configuration

Local POC is a single trusted operator namespace, not production multi-user auth.
Use only operator-owned/authorized test recordings and an operator-maintained
consent record with scope and revocation. A caller-supplied boolean, character ID
or possession of a recording is not proof of voice rights. Recheck on retry.
No automatic preset/person fallback when reference is unusable.

Keep Core's future actor/Assets/Credits ownership intact. POC upload/artifact
records are expiring private service scratch, not a second customer Asset catalog.
Reuse/harden JobQueueManager; no parallel audio queue. Same idempotency key and
same normalized request return the existing job; different input returns 409.
New creative attempt requires a new key. Export is likewise idempotent.

States use the existing job contract: queued -> preprocessing -> processing ->
postprocessing -> completed, or failed/cancelled/expired. Publish stage evidence,
not invented progress. Disconnect does not imply cancellation. Restart must
recover safely or terminalize interrupted jobs; no silent duplicate inference.
Timeout/cancel must stop or isolate inference/FFmpeg work, not just mark the HTTP
request finished while an unbounded worker continues consuming resources.

Proposed defaults, validated in `config/policy.json`, not hard-coded in routes:

| Policy | Initial POC value |
|---|---|
| Source duration / upload bytes | 60 seconds / 64 MiB per file |
| Reference duration | 3-20 seconds; model-specific quality gate, not a guarantee |
| Edit duration / replacement text | 20 seconds / 1,000 Unicode code points |
| Concurrent voice inference / waiting jobs | 1 / 10 |
| Execution deadline / maximum queue wait | 300 seconds / 300 seconds |
| Private media and result retention | 24 hours; return expiry; never remove active dependencies silently |
| Decoded audio limit | 120 MiB; mono/stereo only |
| Encoded artifact size | 64 MiB; account for Base64 expansion in JSON response limits |
| Time-stretch ratio / boundary fade | 0.9-1.1 / up to 20 ms within selected interval |

Defaults are proposed conservative bounds requiring a local benchmark. `.env`
owns feature flags (default off), token, bind/port, FFmpeg path, model/device and
private scratch root under `D:/applications/momelo-post-processing`. Never change
global voice/model behavior or auto-start from `scripts/start-dev.bat` for the POC.
Capability reports actual adapter readiness, versions and limits. No plaintext
transcript, reference audio, secret, arbitrary path or raw model error in logs.

Stable errors distinguish invalid segment/text/media, missing/poor reference,
consent unavailable, model unavailable, unsupported mixed/overlapping speech,
timing unfit, timeout/cancel, expired artifact and incompatible video export.
If quality cannot be detected confidently, ask for human verification; never
claim automatic noise/speaker detection unless implemented and qualified.

## 6. Acceptance And Postman Evidence

- Correct Thai text is heard in the chosen interval and voice/seams are approved
  by a Thai listener; ASR alone cannot certify pronunciation.
- Manual time selection works without any transcript service.
- PCM comparison proves unaffected audio unchanged; video stream/timestamps and
  presentation-duration checks pass. Mouth motion is previewed, not modified.
- Failed fitting, revoked/missing consent, unusable references and unavailable
  model return honest errors, never fabricated speech/transcript or a substitute.
- Cancel, restart, duplicate submission, expiry and deletion are bounded; original
  hash remains unchanged. Retry/accept/export/return-to-original are demonstrable.
- Extend the existing Postman collection with upload, submit, poll, result, decode,
  adopt, export, cancel, duplicate and failure examples. No tokens or private media
  committed. Automated fixtures must not run real inference without opt-in.

Record attempts, input/output hashes, model/checkpoint, options, duration, latency,
human word/voice/seam/sync result and failure reason. Implementation and evidence
remain pending; see [ordered POC plan](implementation-plan/008-dialogue-api-poc.md).
