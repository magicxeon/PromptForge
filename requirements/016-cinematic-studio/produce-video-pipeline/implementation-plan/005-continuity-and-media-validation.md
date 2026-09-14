# Package 005 - Continuity And Media Validation

**Plan ID:** `016-PVP-IP-005`  
**Status:** 005.2a implemented with focused validation; remainder pending
**Requirement owners:** `../006`, `../010`  
**Primary capability:** Cinematic continuity with Generation/Assets evidence  
**Reviewers:** Generative Cinematic Production, QA

## 1. Goal

Choose a qualified reference strategy from authored transition intent, persist
last-frame evidence, technically validate every video and strengthen approval
without silently changing Storyboard authority.

## 2. Expected Existing Touchpoints

- `server/domain/cinematic/CinematicVideoPacketCompiler.js`
- `server/domain/cinematic/CinematicTimelineCompiler.js`
- `server/domain/cinematic/CinematicApplicationService.js`
- `server/domain/generation/prepareGenerationReferences.js`
- `server/domain/generation/VideoCapabilityRegistry.js`
- `server/domain/assets/CinematicVideoAssetService.js`
- `server/repositories/assets/AssetRepository.js`
- provider adapters only where a documented last-frame result is available
- Produce attempt review components from Packages 002-004
- Cinematic video packet, Asset, Timeline and application tests

## 3. Steps

### 005.1 Transition strategy service

Map cut, continuing action, match/dissolve, fade and Scene change to an explicit
semantic reference strategy. Return findings when the selected model cannot
honor it. Keep current first-frame path as the default for cuts/new Scenes.

### 005.2 Last-frame derivative contract

Extend typed Asset metadata and versioning for provider-returned or
server-extracted last frames. Record provenance, timestamp, checksum and source
fingerprints. Add derivative recovery independent of provider generation.

### 005.2a Storyboard source reuse from the approved preceding Take

After 005.2 and the existing completed-task/Asset/probe gates are available:

1. Expose read-only predecessor eligibility from Cinematic's current Shot order
   and `approvedVideoAttemptId`; include disabled reasons for no video, no
   selected/approved Take, stale or inaccessible source and Scene boundary.
2. Extend Assets' bounded media derivative workflow to extract the last usable
   decodable frame from the selected Take. Pin timestamp and source version;
   do not reuse the poster or create an Image Generation Job/Credit operation.
3. Extend the existing Storyboard source-approval command with typed
   `previous_video_last_frame` authority and actor/version checks. Preserve
   generated images as history and record parent Take/Asset dependency.
4. Add the compact action, preview, disabled reasons and explicit approval to
   Storyboard Shot Image Settings. Keep image Generate and existing settings.
5. Selectively stale dependent Storyboard/video consumers when parent Take,
   media, cut point or Shot order changes. Never auto-regenerate descendants.

Implemented: eligibility uses current Shot order and approved Take; Assets
extracts a local immutable PNG from the verified video; Cinematic reuses the
existing source-approval command; the Storyboard Image Settings control previews
before approval in Simple and Advanced. Parent Take/source and Shot reorder
invalidate dependent approvals. The exact extracted timestamp and usable out
point are pinned to the derivative. Finish trim changes after approval still
need explicit reconciliation in the broader package; no live provider UAT was
performed for this step.

Focused groups: eligibility/actor/order; derivative timestamp/probe/retry;
source approval/version/lineage; dependency staleness; EN/TH responsive UI.
Use disposable local video fixtures for automated checks, no paid provider
request, live Project mutation or worker restart. Aggregate under the owning
Cinematic runner only when explicitly requested. Live UAT should include one
approved continuing Shot and one hard-cut/new-Scene negative case.

Automated commands: `node scripts/test-cinematic-video.js last-frame`,
`node scripts/test-cinematic-video.js last-frame-ui`,
`node scripts/verify-cinematic-last-frame-layout.mjs` (Vite server required).

### 005.3 Media probe service

Add a bounded ffprobe wrapper with structured arguments, timeout, normalized
metadata and safe errors. Probe/capture poster/last frame as one media evidence
workflow without leaking raw command output.

### 005.4 Approval gate

Require durable Asset, passing probe, settled/reconciled Credits and current
fingerprints. Add concise technical/creative findings and exact recovery. Keep
human approval mandatory.

### 005.5 Selective staleness

Track consumers of previous approved clip/last-frame authority. Replacing one
source stales only truly dependent attempts/Timeline entries and preserves all
history.

### 005.6 Qualify one continuing action

After first-frame I2V is stable, qualify one provider/model strategy for a
continuing-action transition. Do not enable first/last or multiple references
for other models by analogy.

## 4. Tests

- complete transition strategy matrix;
- ordered first/last/reference plan and unsupported capability;
- Asset last-frame version, authorization, provenance and recovery;
- valid, corrupt, missing stream, zero-duration and orientation probes;
- approval blocked by invalid media/reconciliation/stale authority;
- previous source replacement selectively stales consumers;
- missing previous video or unapproved Take disables the Image Settings action;
- a pinned last usable frame becomes a Storyboard source without an Image Job,
  while an existing approved image remains until explicit replacement;
- switching the predecessor Take/trim invalidates only dependent sources;
- creative findings advise without auto-approve/regenerate;
- one live continuing-action qualification when capability permits.

## 5. Exit Gate

- Every reviewable clip has normalized probe evidence.
- Cut and continuing-action Shots produce deliberate different strategies.
- Last-frame derivative can be recovered without another provider charge.
- Approval and staleness tests prove no hidden authority replacement.

## 6. Stop Conditions

- Provider last-frame semantics are undocumented or untraceable.
- ffprobe cannot be bounded/available in target runtime.
- ffmpeg cannot extract and persist a valid last usable frame in the target
  runtime; keep Generate Image available and do not offer a broken reuse action.
- Reference limits require silently dropping Character/Look authority.
- Staleness cannot identify actual consumers without invalidating unrelated
  Shots.

## 7. Rollback

Disable enhanced continuity modes and use qualified first-frame generation.
Retain probe as an approval safeguard if already proven. Historical derivatives
and attempts remain readable; do not remove Assets.
