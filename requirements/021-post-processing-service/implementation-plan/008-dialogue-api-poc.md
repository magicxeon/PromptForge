# 008 - Dialogue API POC Delivery Plan

Date: 2026-09-30. Status: local API code present; runtime/model qualification
pending. Owners: [010 Repair](../010-dialogue-repair-api-poc.md) and
[011 Conversion](../011-character-voice-conversion-api-poc.md).

## Baseline And Reuse

Current runtime is Python/FastAPI, not the historical Node diagram in service
SPECIFICATION.md. Use actual modules as the implementation baseline:

- `api/routes.py`: register transport/schema/auth through existing conventions.
- `config/service_config.py` and `config/policy.json`: validated limits/readiness.
- `domain/job_queue.py`: existing processing dispatch/status; reconcile unsupported
  audio operations, durable state, idempotency and real cancellation before reuse.
- `domain/audio_transcription_manager.py`: real Thai text transcription path, but
  not required for manual POC selection and not a word-alignment service.
- `adapters/audio_analysis_adapter.py`: sample fallback text and fixed half-clip
  speaker segmentation are not real ASR/diarization. Never use them to qualify POC.
- `adapters/thonburian_tts_adapter.py`: reference-conditioned speech synthesis;
  review reference/text failure handling, model globals and configuration before
  reusing. Do not silently choose sample voices when a reference is missing.
- `adapters/video_processing_adapter.py`: frame-processing code is not a qualified
  audio-preserving remuxer. Reuse no video re-render for these audio-only features.

Use focused `<ProcessName>Manager` modules under existing `domain/` and replaceable
ML/FFmpeg integrations under `adapters/`. Extend the same queue/config/API facade,
not a second service, HTTP-local inference queue or customer Assets/Credits store.
Private POC scratch metadata ownership and atomic retention storage must be
documented before creating a repository folder under the service.

## Tasks And Exit Evidence

| Task | Scope | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| A01 | Reconcile API/schema, current docs, model/reference license and POC consent | None | Confirmed operation contract and fail-closed capability | Code/docs done; license open |
| A02 | Shared private upload/probe/read/cleanup and bounded JSON artifacts | A01 | MIME/size/path/auth/hash/TTL tests, no public files | Code/fixture added; not run |
| A03 | Extend existing jobs for audio; real timeout/cancel/restart/idempotency | A02 | Duplicate/conflict/restart/late-result tests, no endless processing | Code/fixture added; not run |
| A04 | Shared audio extraction, segment validation, lossless splice and video remux | A02 | PCM outside-range equality; video/timeline preservation fixtures | Code/PCM fixture added; video open |
| R01 | Reference-conditioned Thai replacement through existing TTS adapter | A03-A04 | Correct reference/text, unavailable/poor-reference failure | Code added; model run open |
| R02 | Safe duration fit, level/seam matching and candidate preview | R01 | Short/long text and bounded stretch, no word truncation | Code added; listening open |
| R03 | Attempt adoption/export and Postman collection/decoder instructions | R02 | Retry/accept/export/original recovery without overwrite | Code/docs added; run open |
| R04 | Native Thai listening POC with operator-owned clips | R03 | Words, identity, seams and sync accepted; limitations recorded | Planned |
| V01 | Qualify a speech-to-speech adapter, not TTS re-reading | R04 + instruction | Thai quality, rights, device/latency matrix | Adapter coded; qualification open |
| V02 | Expiring reference profiles, versioning and revocation | A02, V01 | Reuse across two clips; invalid profile rejection | Code added; run open |
| V03 | Selected-interval conversion with preserved source timing | V02, A03-A04 | Content/PCM/timing checks; no original speech doubling | Code added; timing open |
| V04 | Shared preview/adopt/export and conversion Postman scenarios | V03 | Repair -> conversion lineage and accepted export | Code/docs added; run open |
| V05 | Human comparison and separate conversion qualification decision | V04 | Thai words, voice resemblance, acting and sync accepted | Planned |

The user authorized both local POC operations in this turn. Shared media/jobs,
Thai repair and optional OpenVoice conversion are implemented as code, but
neither model has passed a real inference/listening gate. Production gates remain
outside this local POC. See the current evidence/status below.

## Postman Deliverables At Implementation Time

Extend `post-processing-service/post-processing-service.postman_collection.json`
and `CURL_GUIDE.md`, rather than create a competing collection. Use environment
variables for base URL/token, captured media/job/profile IDs and idempotency keys.
Do not commit secret values, uploaded media or private transcripts.

Folders: shared media/jobs; dialogue repair; voice conversion; negative cases.
Document bounded manual polling, expiry and Base64 artifact decoding for external
playback. Postman requests must not silently loop forever or automatically accept
results. Collection defaults must not trigger synthesis in bulk runs; inference
examples are explicitly opt-in and marked as compute-consuming.

## Validation Plan

The owning offline fixture file is
`post-processing-service/scripts/test_dialogue_poc.py`. Run from the service
directory with a repaired Python environment and installed dependencies:

```text
python scripts/test_dialogue_poc.py
```

It covers interval rejection, private media hash/path behavior, PCM equality
outside a stereo edit, audio idempotency conflict, and restart terminalization.
It does not start inference or download a model. Run the Postman flows explicitly
for real repair and conversion; do not run the whole collection as UAT.

Contract groups mock inference and use temporary media. Validate authentication,
consent, real errors (no synthetic-success fallback), idempotency, bounds, restart,
cancel, deadlines and privacy. Media groups use deterministic audio/video fixtures
for PCM equality, stream identity, offsets and export duration. Human inference
tests are separate, operator-triggered, and never bundled into normal test runs.
Run only affected groups plus a small Faceless/capability regression per change.

Record model/checkpoint hash, input/output hashes, selected intervals, actual
timing adjustment, latency/device, user listening outcome and failure reason. Do
not log raw speech or private consent details. No success percentage is asserted
until measured on a declared fixture set. No UI/browser verification required for
this API-only POC. The current Windows venv points to a missing Python
executable, so the Python fixtures, actual FFmpeg remux and both models have
**not** been verified in this turn. No models were downloaded. The operator
must restore a working venv, check `/v1/capabilities`, run the offline fixture,
then test each model with authorized isolated clips and listen to the results.

## Implementation Evidence (2026-09-30)

| Area | Implemented files | Verification still required |
|---|---|---|
| Media and voice profile | `domain/dialogue_poc_manager.py`, `api/dialogue_routes.py` | Real upload/probe/expiry/consent cases |
| Durable audio job branch | `domain/job_queue.py`, `domain/dialogue_worker.py` | Cancel/timeout/restart under model load |
| Shared audio edit | `adapters/dialogue_audio_adapter.py` | Remux stream/timestamp fixtures and short/long speech |
| Thai repair | Existing Thonburian adapter reused, explicit reference | Native Thai listening and model rights |
| Voice conversion | `adapters/openvoice_conversion_adapter.py`, opt-in setup | Checkpoint install, Thai voice/word/acting qualification |
| Operator entry | `scripts/start-dialogue-poc.bat`, Postman collection, `CURL_GUIDE.md` | Postman end-to-end after venv repair |

### Existing Venv Recovery (2026-09-30)

The dedicated batch launcher must diagnose interpreter startup separately from
package imports and show the underlying Python error. The existing venv already
contains the audio packages, so a broken base-interpreter link must not be
reported as missing dependencies or trigger an automatic reinstall. Preserve
the venv and packages. Provide an explicit `--repair-venv` path requiring a
caller-supplied working Python 3.10 executable; never rewrite the environment
during normal startup. Acceptance: normal launch reports the exact failure,
successful launch reuses the selected venv, and repair requires an explicit
command and refuses a different Python minor version. Runtime repair remains
operator-triggered and unverified in the current agent environment.

No paid generation, Core Assets or Credits were modified. New model downloads,
when explicitly requested by the operator, are placed under
`D:/development/temp/momelo-models`.
