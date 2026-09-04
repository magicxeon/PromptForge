# Package 005 - Continuity And Media Validation

**Plan ID:** `016-PVP-IP-005`  
**Status:** Pending  
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
- Reference limits require silently dropping Character/Look authority.
- Staleness cannot identify actual consumers without invalidating unrelated
  Shots.

## 7. Rollback

Disable enhanced continuity modes and use qualified first-frame generation.
Retain probe as an approval safeguard if already proven. Historical derivatives
and attempts remain readable; do not remove Assets.

