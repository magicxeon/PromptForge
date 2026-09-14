# Momelo Post-Processing Service - Master Requirement

**Requirement ID:** 021-PPS
**Status:** Local Faceless API pilot implemented; durable Jobs, Storyboard UI and production qualification remain open
**Primary role:** Product Requirement Architect
**Review gates:** Backend and security/privacy before the first service connection; QA before pilot closure; Commercial and Backend before any customer Credit or paid processing change
**Source proposal:** [Momelo Post Processing Service](../099-technical-dept/Technical-Documents/momelo-post-processing-service-implementation-plan.md), version 0.1, 2026-09-08

## 1. Outcome And Delivery Boundary

Provide a separate, versioned Post-Processing API for owner-authorized media
derivatives after Generation. Deliver **Faceless previs first** for Cinematic
Storyboard stills and the approved preceding Take's extracted last frame.
Prepare contracts and ordered work for the source proposal's image, video,
audio, model, commercial and operational capabilities without activating them.

This folder is the canonical requirement owner for the new service. The source
technical document remains the architectural inventory, not permission to
deploy GPU workers, move media ownership, activate pricing or replace current
Generation workflows.

## 2. Current State And Ownership

- Cinematic currently compiles a provider prompt for blank/white Faceless
  images. Its two existing treatments and normal full-face Generate remain
  available and unchanged until an explicit later implementation.
- Assets currently extracts and stores a verified, immutable PNG from the
  preceding approved video Take through CinematicLastFrameService. That source
  is never overwritten by Post Processing.
- Generation owns image/video provider submission and its Job lifecycle.
  Cinematic owns Storyboard source selection and approval. Assets owns
  customer-facing original/derivative Asset records and delivery. Credits
  alone owns customer quotes, reservation, settlement and refunds.
- The separate Post-Processing service owns its model adapter and inference;
  durable internal processing Jobs remain planned. It must not directly
  mutate Cinematic Projects, Generation Jobs, Core Assets or Credit ledgers.
  Core calls it through an authenticated, bounded capability facade.

The first API slice lives under [post-processing-service](../../post-processing-service/README.md).
The service architecture is specified as a **Python 3.10+ FastAPI + Uvicorn** microservice returning 100% JSON responses.
To preserve space on Drive C:, all Python runtime components (virtual environment, heavy ML libraries, PyTorch/CUDA packages, and model checkpoints) must reside under **`D:\applications`** (e.g., `D:\applications\momelo-post-processing\`).
The service structure, scoped agent guidance and configuration contract are
owned by [009](009-service-structure-and-configuration.md).
The dev launcher starts it separately. It uses an authenticated Core-to-service
transfer and a bounded synchronous JSON request while the durable async Job
contract is still pending. Core imports the derivative through Assets and
does not auto-approve it. The existing /outputs/ delivery path remains a
pilot privacy gap; signed owner-scoped delivery is required before production.

## 3. Release Sequence

1. **P0 Faceless previs pilot:** a minimal independent API process with
   capability discovery, private media transport, durable bounded processing
   job state, a pinned face-landmark model and deterministic white-face
   composition. Core imports a new immutable derivative. No GPU, new customer
   Credit charge, automatic paid fallback or production entitlement.
2. **P1 Platform qualification:** production auth, retention, model licenses,
   persistence, retry/recovery, usage evidence, pricing decision and
   operational budgets before other customer-facing processing.
3. **P2 Image enhancement:** upscale, restoration and image pipelines only
   after model/quality/commercial qualification.
4. **P3 Basic video processing:** upscale, interpolation, FPS/re-encode and
   audio-preserving render, with temporal and cost evidence.
5. **P4 Audio analysis:** transcript, word timing, diarization and speaker
   mapping without voice replacement.
6. **P5 Voice, dialogue and lip-sync:** consent-bound voice assets,
   selective replacement/repair, timing, preservation of unaffected audio
   and optional lip-sync, each separately qualified.

No later phase is implicitly enabled by completing an earlier phase.

## 4. Requirement Owners

| Requirement | Responsibility | First release |
|---|---|---|
| [001](001-api-jobs-assets-and-security.md) | API, jobs, media transport, ownership, security | Minimal subset in P0 |
| [002](002-faceless-previs.md) | Faceless detect, mask, Storyboard choice and fallback | P0 |
| [003](003-image-processing.md) | Image upscale, restore, enhancement, formats | Deferred P2 |
| [004](004-video-processing.md) | Video enhance, interpolation, render, audio preservation | Deferred P3 |
| [005](005-audio-analysis.md) | STT, diarization, transcripts, speaker mapping | Deferred P4 |
| [006](006-voice-dialogue-and-lipsync.md) | Voice consent, selective repair/replacement and lip-sync | Deferred P5 |
| [007](007-model-registry-quality-and-licensing.md) | Model adapters, registry, licenses, benchmarks, quality | Minimal face-model gate in P0 |
| [008](008-usage-pricing-and-operations.md) | Cost, Credits boundary, workers, observability and release | Minimal telemetry in P0; full P1 |
| [009](009-service-structure-and-configuration.md) | Service layout, agent rules and validated configuration | P0 API pilot |

## 5. Source-Proposal Coverage

Every numbered section of the source proposal has an owner; a mapped section
is **planned**, not implemented:

| Source sections | Canonical owner here |
|---|---|
| 1-9: purpose, scope, API, media transfer and Job state | 001, 000 |
| 10: image operations and output | 003; 002 for Faceless |
| 11: video operations and pipeline | 004 |
| 12-14: audio analysis, speakers and transcript | 005 |
| 15-19: voice asset, replacement, repair, timing and lip-sync | 006 |
| 20-23: technology, adapters, model registry and initial matrix | 001, 007 |
| 24: Thai voice strategy | 006, 007 |
| 25-29: data schema, validation, errors, idempotency and webhook | 001 |
| 30-34: cost, pricing, usage units, estimates and charge policy | 008 |
| 35-40: scheduling, workers, warm cache, security, retention, telemetry | 001, 008 |
| 41-44: quality, difficult audio, speaker UX and license gate | 005, 006, 007 |
| 45-46: functional and non-functional requirements | 001-008 by capability |
| 47-54: phases, implementation order, benchmark and Definition of Done | [Implementation master](implementation-plan/000-master.md), 007 |
| 55-57: decisions, references and license notes | 001, 007, 008 |

## 6. Non-Negotiable Contracts

- Original media is immutable; every output is a separate owner-scoped Asset
  with parent Asset/version/hash, operation, options, model/version and time.
- A Post-Processing failure never deletes an original, approves a Storyboard,
  calls a provider, submits paid Generate or reserves a Credit automatically.
- Faceless processing is an option beside existing provider-generated blank
  and white treatments. A white face visible at the beginning of video is
  accepted for this pilot and is not a blocking gate.
- Only Core resolves user ownership. The service receives scoped internal
  authority, never a user-supplied arbitrary media URL or actor ID as proof.
- No public media bucket, raw image/voice payload in logs, second Credit ledger
  or browser-owned pricing. Future GPU/voice pricing requires its own approval.
- Model code, weight/checkpoint, dataset restrictions and dependencies are
  verified separately before a production capability is marked available.

## 7. Decisions Still Open

Before paid or production rollout, explicitly decide retention periods,
customer price and refund rules, external service deployment/storage region,
GPU model licenses, voice consent language and audio rights. Until decided,
those capabilities remain hidden/off. P0 uses only private test media and
does not imply those decisions.

## 8. Implementation Plan

See [ordered implementation plan](implementation-plan/000-master.md).
Documentation is complete only when all owner files and source coverage are
present. Behavior remains unimplemented until its focused checks and explicit
live qualification pass.
