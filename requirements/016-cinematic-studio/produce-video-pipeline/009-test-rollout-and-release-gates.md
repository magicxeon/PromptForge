# Test, Rollout And Release Gates

**Requirement ID:** `016-PVP-009`  
**Status:** Requirement complete; Package 001-002 and Package 003 deterministic evidence recorded, live and later gates pending  
**Priority:** Mandatory evidence and release gate

## 1. Test Strategy

Testing follows implementation packages. Each package must pass its focused
tests and protected regressions before the next begins. Live-provider evidence
supplements but never replaces deterministic automated coverage.

## 2. Baseline Gate

Before source changes:

- record current focused Cinematic, Generation, Credits, Assets and video test
  results;
- capture Produce and Finish at approximately 390px, 820px and 1440px;
- record current API response fixtures for one-Shot quote/submit/poll/approve;
- confirm current Storyboard image flow and Playground Video behavior;
- record all pre-existing failures separately.

Later packages must not claim an existing failure as a regression or silently
change a fixture to hide it.

## 3. Canonical Cinematic Fixture

Create a rights-cleared deterministic fixture with:

- one 30-second 9:16 Project;
- at least two Scenes and five ordered Shots;
- one and multi-Character Shots;
- one approved Look per visible Character;
- approved Storyboard sources for every Shot;
- varied durations within qualified provider limits;
- cut, continuing action and dissolve/fade transition examples;
- one exact-audio requirement and one explicitly silent Shot;
- one stale source variant and one legacy Project variant.

Fixtures reference tiny local media. They do not embed production Base64 data.

## 4. Automated Server Coverage

### Package 001

- product operation versus input-mode schema and compatibility;
- legacy request inference and existing task readability;
- packet/prompt strategy determinism and fingerprints;
- quote/submit parity and pre-reservation validation;
- existing Playground/Veo/Gemini regression.

### Package 002

- Produce read models and findings projection;
- actor ownership and route validation;
- no mutation from read-only sequence selection.

### Package 003

- Seedance adapter request mapping and omitted unsupported fields;
- provider state/error/usage normalization;
- timeout/backoff/idempotent poll and completion;
- durable Asset copy/poster/probe and Credit capture/refund/reconciliation;
- recoverable-task resume registration.

### Package 004

- batch eligibility snapshot and aggregate fingerprint;
- Group and child idempotency;
- bounded dispatch and rate-limit behavior;
- partial failure, cancellation and retry-only-failed;
- narrow Project updates under concurrent version changes;
- aggregate Credit reservation and per-child settlement reconciliation.

### Package 005

- transition-to-reference strategy matrix;
- last-frame Asset version/provenance and re-extraction;
- ffprobe normalization, corrupt/zero-duration rejection;
- technical/creative approval gates and selective staleness.

### Package 006

- Timeline duration with trim/transition overlap;
- assembly manifest/fingerprint and source authorization;
- FFmpeg command/filter construction as structured arguments;
- mixed input normalization, audio modes and exact-dialogue blocking;
- final probe, durable master/poster, idempotent retry and cleanup;
- Project completion and stale-master behavior.

## 5. Automated Web Coverage

- readiness counts and exact recovery links;
- Scene/Shot selection and read-only Story order;
- provider/model controls driven by compatibility;
- one-Shot quote, submit, durable progress, result and approval;
- batch confirmation, aggregate price, child progress and retry failures;
- draft/final tier labeling, no hidden second render, test-one-Shot recommendation
  and final-source blocking;
- source changed, insufficient Credits, timeout, reconciliation and invalid
  media states;
- generated video versus approved keyframe comparison;
- rough sequence playback preserves order, exposes gaps and creates no Job,
  Asset, quote or Credit request;
- Finish duration/audio gates, render progress, final preview and download;
- focus restoration, keyboard operation, bounded `aria-live` and localization;
- protected Storyboard, Playground, Job Center and global navigation behavior.

## 6. Media Integration Fixtures

Maintain small deterministic clips covering:

- MP4 H.264 without audio;
- MOV or differently encoded source requiring normalization;
- clip with AAC audio and clip requiring inserted silence;
- different source frame rates/resolutions/orientation metadata;
- intentionally corrupt and zero-duration media;
- trims plus cut, dissolve and fade;
- final 9:16 master probe expectations.

Tests assert normalized metadata and output validity, not binary checksum of an
encoder-dependent master.

## 7. Live Provider Qualification

Use the three scenarios in `004-seedance-activation-and-qualification.md`.
Before each run, record the exact no-user-Credit qualification quote and
available balance. After each run,
record provider task, durable output, probe, attempt, Credit and latency
evidence and confirm the creator balance did not change. Exercise one
recoverable timeout/restart without intentionally causing
duplicate billable requests.

Live failure does not weaken deterministic tests or trigger a silent provider
fallback.

## 8. Manual UX Matrix

Test Produce and Finish at 390px, 820px and 1440px in all enabled themes and
Thai/English:

1. enter from a complete Storyboard;
2. identify first unresolved Shot;
3. inspect previous/current/next context;
4. quote/generate one Shot and navigate away/back;
5. review, reject/regenerate and approve;
6. generate an eligible set and recover one failed child;
7. observe source-stale and audio-blocked states;
8. trim, choose transition, render final master and download;
9. use keyboard only and inspect focus/progress announcements;
10. switch actor and confirm no state/media leakage.

Check no overlap, clipping, inaccessible footer/action or page horizontal
scroll. Preserve screenshot evidence for changed layouts.

## 9. Commercial And Security Gates

- Credits reviewer confirms quote/reserve/capture/refund/idempotency/reconcile.
- Authorization tests deny cross-actor Project, task, Asset and download access.
- Logs and errors contain no raw prompt, signed provider URL, Base64 or private
  reference payload.
- Real-person reference trust is enforced before provider dispatch.
- Assembly temporary storage and output URLs are owner-scoped and bounded.
- Paid flags remain false until all release evidence and pricing decisions pass.

## 10. Release Decisions

**Pass:** deterministic tests, responsive/theme/localization checks, three live
qualifications, financial evidence, recovery and final multi-Shot assembly all
pass with no P0/P1 finding.

**Conditional internal only:** lifecycle works but visual quality, latency,
provider entitlement, trust or assembly pricing remains unresolved. Keep
research/internal and paid routing disabled.

**Fail:** duplicate financial/provider effects, data loss, authorization leak,
unplayable media, stale approval/export, unsupported silent fallback or broken
protected workflow. Roll back exposure/configuration and retain evidence.

## 11. Rollback

- Feature policy can hide Seedance, batch and final assembly independently.
- Prompt strategy/config versions remain selectable for in-flight task reading.
- Additive schema fields retain legacy read compatibility.
- Rollback never deletes Jobs, Assets, attempts, Groups, quotes or settlements.
- Existing single-Shot research flow remains available when later packages are
  disabled, provided its own qualification state is unchanged.

## 12. Commands And Evidence

Each implementation package records exact focused commands using current repo
scripts. Final validation must include the relevant server test suites, React
tests, TypeScript check, production build, JSON/config parsing and
`git diff --check`. If an expected command cannot run, record the reason and
remaining risk rather than marking the package complete.

## 13. Acceptance

- Every acceptance criterion maps to automated or named manual evidence.
- The canonical multi-Shot fixture reaches one downloadable master.
- Financial, provider and Asset idempotency are tested under retry/restart.
- Responsive/themed UI evidence exists for every materially changed screen.
- No unqualified model or operation is enabled by test-fixture success alone.
