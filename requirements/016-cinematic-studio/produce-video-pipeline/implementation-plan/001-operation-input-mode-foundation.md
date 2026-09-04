# Package 001 - Operation And Input-Mode Foundation

**Plan ID:** `016-PVP-IP-001`  
**Status:** Complete on 2026-09-04  
**Requirement owners:** `../001`, `../003`, `../010`  
**Primary capability:** Generation contract with Cinematic orchestration

## 1. Goal

Correct the product-operation/input-mode mismatch, establish deterministic
provider-neutral video compilation and expose one compatibility result used by
UI, quote and submit without changing provider availability.

## 2. Expected Existing Touchpoints

- `server/config/cinematic-video-models.json`
- `server/config/cinematic/video-packet-policy.v1.json`
- `server/domain/cinematic/CinematicVideoPacketCompiler.js`
- `server/domain/cinematic/CinematicVideoPacketConfigurationService.js`
- `server/domain/cinematic/CinematicApplicationService.js`
- `server/domain/generation/VideoCapabilityRegistry.js`
- `server/domain/generation/VideoGenerationApplicationService.js`
- `server/domain/generation/prepareGenerationReferences.js`
- `server/providers/VideoProviderAdapterRegistry.js`
- `server/app/routes/cinematicRoutes.js`
- `web/src/features/cinematic/schemas/cinematicSchemas.ts`
- `web/src/features/cinematic/api/cinematicApi.ts`

New versioned prompt/config files remain under `server/config/cinematic/`.
Tests extend current video packet, capability, application, route and web schema
suites rather than creating an unrelated harness.

## 3. Steps

### 001.0 Baseline

Complete Step 0 in `000-master.md` and record current operation shapes and all
callers with `rg`. Do not edit the catalog first.

### 001.1 Add additive schemas

- add `commercialOperation`, `inputMode` and semantic reference roles;
- keep a bounded legacy `operation` reader for current callers/tasks;
- validate catalog combinations and reject unknown modes/configuration;
- add current normalized selection/fingerprint to quote responses.

### 001.2 Correct capability evaluation

- evaluate commercial eligibility and provider input capability separately;
- preserve current actor/research/paid exposure policy;
- expose duration, ratio, resolution, audio and reference findings from one
  server result;
- do not activate Seedance in this package.

### 001.3 Version video packet and prompt strategies

- add packet policy v2 and provider prompt strategy configuration;
- compile one temporal action, start/end state, performance, camera,
  environment, audio and prohibitions without Story Plan dumping;
- persist policy/strategy/prompt fingerprints;
- keep v1 readable for historical attempts.

### 001.4 Normalize reference preparation

- preserve ordered reference roles through application normalization;
- authorize and resolve references only at dispatch;
- represent first/last/additional references without sending unsupported ones;
- ensure first implementation still uses exactly one first frame.

### 001.5 Migrate Cinematic quote/submit

- route one-Shot preparation, quote and submit through the same normalized
  selection/packet/reference use case;
- reject stale or browser-overridden compiled prompts;
- prove estimate and submission fingerprints match;
- retain existing API response fields needed by current UI.

### 001.6 Update typed clients and diagnostics

- extend Zod schemas and API types additively;
- expose stable findings and recovery stage;
- update the bounded lineage/read model with new fingerprints;
- do not expose signed URLs or provider prompt bodies by default.

## 4. Tests

- packet/config schema and deterministic fingerprint tests;
- capability combinations for every current provider/model fixture;
- legacy operation inference and historical task read tests;
- ordered reference-plan and unsupported-reference tests;
- one-Shot quote/submit parity and browser override rejection;
- Cinematic route actor/version/stale-source tests;
- existing Playground Video, Veo, Gemini Omni and video pricing regressions;
- JSON parsing, TypeScript/schema tests and `git diff --check`.

## 5. Exit Gate

- Current Produce can prepare a compatible Seedance I2V selection without the
  old `operation` mismatch, while Seedance remains hidden/internal.
- UI, quote and submit consume one compatibility result.
- Existing providers/callers retain behavior through tested compatibility.
- Data-lineage checklist covers packet, prompt and reference fingerprints.

## 6. Stop Conditions

- Catalog cannot represent a model's mode without provider-specific branching
  in React.
- Existing pricing requires the overloaded `operation` field and cannot be
  migrated additively.
- Current callers cannot be identified or parity-tested.
- Prompt strategy changes alter existing in-flight task interpretation.

## 7. Rollback

Disable v2 preparation and return callers to the legacy adapter while leaving
new fields/config unread. Do not delete or rewrite tasks, attempts, quotes or
Assets. Remove compatibility only in Package 007 after all callers migrate.

## 8. Completion Evidence

- Catalog schema v3 separates `commercialOperations` from `inputModes` while
  retaining legacy `operations` and paid-routing flags.
- Cinematic quote and submit now bind the approved first-frame reference plan,
  provider prompt strategy and one deterministic request fingerprint.
- Credits compare the new cost/authority fields when present while historical
  estimates remain readable through bounded compatibility.
- Packet policy v2 and ModelArk/Gemini prompt strategies are server
  configuration; provider prompt bodies are not projected in normal task reads.
- Focused server result: 69 passed, 0 failed.
- Focused Web result: 65 passed, 0 failed; production TypeScript/Vite build
  passed after typed catalog fixtures were updated.
- JSON parsing and `git diff --check` passed. No paid model was enabled.
