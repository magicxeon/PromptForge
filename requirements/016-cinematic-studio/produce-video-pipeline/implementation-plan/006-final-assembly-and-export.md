# Package 006 - Final Assembly And Export

**Plan ID:** `016-PVP-IP-006`  
**Status:** Pending  
**Requirement owners:** `../007`, `../010`  
**Primary capability:** Cinematic export orchestration through Generation  
**Reviewers:** Backend, Commercial Integrity, UX/UI, QA

## 1. Goal

Render the active approved Timeline into one durable final master, enforce audio
and technical readiness, and complete the Project only after explicit final
acceptance.

## 2. Expected Existing Touchpoints

- `server/domain/cinematic/CinematicTimelineCompiler.js`
- `server/domain/cinematic/CinematicApplicationService.js`
- `server/app/routes/cinematicRoutes.js`
- canonical Generation Job/Queue services and repositories
- `server/domain/assets/CinematicVideoAssetService.js`
- `server/domain/assets/VideoPosterService.js`
- `server/repositories/assets/AssetRepository.js`
- `server/config/paths.js` for bounded temp/runtime paths
- a new versioned assembly policy under `server/config/cinematic/`
- Finish composition in `web/src/features/cinematic/components/`
- shared video viewer, stage state, queue and operation dock components

A focused Generation-owned media processor/service may be added only behind the
canonical operation entry point. Routes and React never execute FFmpeg.

## 3. Steps

### 006.1 Prepare immutable export manifest

Resolve current approved video Asset Versions, trims, transitions, audio plan,
predicted duration and output profile. Return ordered blockers with no mutation.
Add deterministic manifest and assembly fingerprints. Enforce final-source tier
for customer completion while labeling draft-source renders as internal
qualification only.

### 006.2 Runtime health and structured media commands

Implement FFmpeg/ffprobe startup/capability health, minimum codec/filter checks,
bounded structured arguments, timeout/concurrency limits and temporary Job
directories. Never build a shell command from user text.

### 006.3 Normalize and assemble

Decode inputs, normalize pixels/frame rate/audio/timestamps, apply trims and
cut/dissolve/fade, mix/insert permitted audio, encode the initial MP4 profile
and run a final probe against predicted duration/profile.

### 006.4 Durable Generation/Asset lifecycle

Represent assembly as `cinematic_final_assembly` Job with idempotency, progress,
restart recovery, output copy, final master Asset Version, poster and cleanup.
Preserve intermediate evidence needed for safe copy recovery.

### 006.5 Credits decision implementation

Keep qualification no-charge until Commercial chooses included/free/separate
pricing. Implement only the approved policy through Credits; do not hard-code a
UI estimate or infer a fee from provider clips.

### 006.6 Finish UX

Show completeness, Timeline edits, predicted duration, audio readiness,
quote/no-charge status, render progress, final preview/download/history and an
explicit completion action. Reuse shared media/generation surfaces.

### 006.7 Completion and staleness

Pin the accepted master/Timeline fingerprint when completing. Upstream source
change marks export stale and preserves the historical master.

## 4. Tests

- manifest determinism, source authorization and stale blockers;
- trim/transition bounds and predicted duration;
- structured FFmpeg arguments and malicious text isolation;
- MP4/MOV, mixed frame rate/resolution/orientation/audio fixtures;
- silent, clip-audio, approved-assets and exact-dialogue gate;
- runtime unavailable, timeout, disk/copy/probe failure and cleanup;
- idempotent Job/restart/master copy/Credit settlement;
- final Asset stream/download ownership and expired provider URL independence;
- Finish responsive/theme/localization/keyboard flow;
- Project completion and stale historical master behavior.

## 5. Exit Gate

- The canonical five-Shot fixture produces one probed, playable and downloadable
  MP4 master in correct order with trim and dissolve evidence.
- Exact-dialogue and silent-intent rules behave correctly.
- Retry/restart duplicates no Job, render Asset or Credit effect.
- Finish can complete only the current accepted master.

## 6. Stop Conditions

- Deployment cannot guarantee bounded FFmpeg/codec support.
- Audio authority or rights cannot be represented deterministically.
- Commercial policy is required for paid rollout but remains undecided.
- Assembly reads mutable/latest source instead of immutable manifest Versions.
- Temporary media cannot be isolated, bounded or cleaned safely.

## 7. Rollback

Disable final assembly/export feature policy and retain approved Shot clips,
Timeline metadata, Jobs and master history. Revert Finish to qualification
blocked without deleting a successfully created master Asset.
