# Core Orchestration, Prompt Configuration And Compilation

**Status:** Implemented; deterministic compiler and cutover gates passed

## 1. Ownership Decision

`CinematicApplicationService` remains the public Cinematic use-case facade.
Focused internal services may be added under `server/domain/cinematic/`, but
routes and foreign capabilities enter through the facade.

Generation continues to own estimate, reference preparation, Credit
coordination, Queue dispatch and provider lifecycle. Cinematic supplies an
authorized provider-independent operation contract.

## 2. Target Internal Structure

The names below are targets, not permission to move unrelated modules:

```text
server/domain/cinematic/
  CinematicApplicationService.js
  CinematicFieldManifestService.js
  CinematicAuthoringStateService.js
  CinematicDataLineageService.js
  CinematicSimpleAuthoringService.js
  CinematicKeyframeConfigurationService.js
  StoryboardKeyframeContractCompiler.js
  CinematicVideoPacketConfigurationService.js
  CinematicVideoPacketCompiler.js
  CinematicTimelineCompiler.js
```

Add a service only when its responsibility is cohesive and covered by more than
one caller or test boundary. Small helpers remain internal to the nearest owner.
Existing timeline/export methods in `CinematicApplicationService` remain the
starting authority and may delegate to the focused readiness service without
creating a second export workflow.

## 3. Configuration Structure

```text
server/config/cinematic/
  authoring-field-manifest.v1.json
  field-dependencies.v1.json
  readiness-policy.v1.json
  keyframe-policy.v1.json
  prompt-budget.v1.json
  video-packet-policy.v1.json
  capture-profiles/
    photorealistic-cinematic.v1.json
```

Existing recipes remain under:

```text
server/config/prompt-recipes/cinematic/
```

Every configuration file is schema-validated by its owning loader before use
and exposes stable ID, integer version and fingerprint. Projects store only
provenance and selected profile IDs, not reusable system instructions.

## 4. What Belongs In Configuration

- field visibility and grouping;
- required/optional/derived classification;
- dependency and stale rules;
- AI recipe instructions and output contract version;
- prompt section precedence and budget;
- provider-independent capture profile;
- keyframe still semantics;
- readiness/qualification dimensions and severity policy;
- legacy fallback profile.

## 5. What Must Remain In Code

- actor authorization and ownership;
- ID/version generation and optimistic concurrency;
- state transitions and immutable approvals;
- Character/Look rights validation;
- reference resolution and provider capability enforcement;
- Credit, Queue and provider dispatch;
- schema execution, deterministic normalization and fingerprinting;
- secure error translation and audit/telemetry boundaries.

Editable configuration must not bypass commercial, security or lifecycle
invariants.

## 6. AI Director Orchestration

The existing Story Plan service remains the provider-facing proposal adapter.
Cinematic orchestration supplies:

- current Project, Story Source and Plan versions;
- selected Beat/Scene/Shot IDs;
- stable Cast Assignment and Look Version authority;
- locked field paths;
- missing/stale field paths requested for completion;
- target recipe ID/version;
- field and prompt budget policy.

The provider returns a strict structured proposal. Provider-specific response
schemas must map into a versioned Cinematic proposal contract before domain
normalization. A provider adapter may express transport schema but must not own
the Cinematic field meaning.

## 7. Storyboard Keyframe Contract Compiler

The server compiler becomes the only final Cinematic still-contract owner.

Input:

- authorized Project and active Story Source/Plan versions;
- owning Beat, Scene and Shot versions;
- authoring field states;
- Cast/Profile/Look authority;
- current and previous approved continuity sources according to policy;
- selected capture profile and global prohibitions.

Output:

```text
contractVersion
projectId/projectVersion
storyPlanVersionId
beatId
sceneId/sceneVersion
shotId/shotVersion
currentState
characterAuthority[]
lookAuthority[]
composition
performance
lightingEnvironment
continuity
prohibitions
referencePlan
recipe/profile provenance
sourceFingerprint
providerIndependentPrompt
findings[]
```

The compiler must keep structured fields through validation and serialize
provider-independent prompt text only at the Generation boundary.

## 8. Compiler Precedence

1. Current Shot visible moment, action, emotional target and exclusions.
2. Character identity and approved Look authority.
3. Shot composition, performance, light and environment.
4. Scene current state and continuity anchors.
5. Beat purpose and emotional change as narrative context.
6. Project intent, capture profile and prohibitions.

Conflicts produce findings. The compiler must not concatenate contradictory
values or allow broad future story context to override the selected Shot.

## 9. Manual And Batch Parity

- Manual Shot generation and Generate All call the same compile use case.
- The same Project/Scene/Shot versions produce the same source fingerprint.
- Batch may compile multiple Shots but cannot use a reduced data contract.
- Quote and submit revalidate the fingerprint, provider/model, dimensions,
  references and output count.
- A changed Shot or reference after quote requires re-quote.
- Existing completed attempts remain visible and are not silently rebound.

## 10. Migration Sequence

1. Add configuration schemas and read-only manifest service.
2. Add server compiler in shadow/comparison mode.
3. Capture deterministic differences against current client fixtures.
4. Reconcile intended differences through explicit tests.
5. Switch manual generation to server contract.
6. Switch Generate All to the same use case.
7. Remove client final assembly only after parity and regression gates.
8. Keep a time-bounded compatibility reader for persisted compiled prompt text;
   do not keep two active compilers.

The migration is complete. Compatibility readers retain only saved user
direction and legacy approved-source evidence; no React module remains an
active final Storyboard or Produce prompt compiler.

## 11. Acceptance Criteria

- No React module owns final Cinematic prompt precedence.
- Configuration is versioned, schema-validated and fingerprinted.
- The compiler reports conflicts with owning field paths.
- The same Shot version yields one deterministic provider-independent contract.
- Manual and batch generation share contract identity.
- Generation, Reference Processing and Credits retain existing ownership.
- Existing provider/model behavior is unchanged unless a separate provider
  requirement changes it.
