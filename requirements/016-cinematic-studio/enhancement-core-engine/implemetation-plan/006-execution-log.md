# Cinematic Core Engine Execution Log

## Step 0 - Baseline And Fixture Freeze

**Status:** Complete

Baseline before runtime implementation:

- Server focused Cinematic tests: 55 passed, 0 failed.
- Web focused Cinematic tests: 14 files, 102 tests passed, 0 failed.
- Web test runner required `npm.cmd` and permission to write Vite temporary
  configuration under `web/node_modules`; the initial PowerShell `npm.ps1`
failure was environmental, not a product test failure.

Added deterministic single-Character, multi-Character and legacy fixtures under
`test/fixtures/cinematic/` without copying runtime Project data.

Validation:

- fixture contract tests: 3 passed, 0 failed.

Protected dirty-worktree changes were present before this implementation in
Cinematic source, tests, localization, runtime JSON and generated Web output.
They are treated as user-owned baseline and must not be reverted.

## Step 1 - Canonical Field Manifest

**Status:** Complete

- Added versioned authoring field, dependency and readiness configuration under
  `server/config/cinematic/`.
- Added a server-owned loader that rejects duplicate paths, unknown references
  and dependency cycles.
- Exposed a read-only public manifest through the Cinematic application facade
  and HTTP route.

Validation:

- field manifest service tests: 3 passed, 0 failed.

## Step 2 - Authoring State And Legacy Compatibility

**Status:** Complete

- Added an additive `cinematic-authoring-v1` envelope for new and legacy
  Projects.
- Added field authority, lock and scoped stale-dependency behavior without
  changing existing canonical values.
- New Projects use explicit state; existing Projects use legacy inference until
  a field is intentionally authored.

Validation:

- authoring state and repository compatibility tests passed.

## Step 3 - Data Lineage Contract

**Status:** Complete

- Added a deterministic, read-only Setup-to-Finish lineage report with recovery
  targets for Cast, Look, Plan, Scene, Shot, Storyboard, Produce and Finish.
- Added actor-owned application and HTTP access, plus matching React Zod schemas
  and API facade methods.
- The public report excludes Story text, generated prompts and media URLs.

Validation:

- focused Step 0-3 server regression: 45 passed, 0 failed.
- Web TypeScript build check: passed.
- application ownership test confirms a second actor cannot read the Project
  lineage and that the read does not mutate Project version.

## Step 4 - Progressive Authoring UI

**Status:** Complete

- Preserved one Scene draft across Simple/Advanced mode switching.
- Moved additive Simple completion to a server-owned pure service; the browser
  now submits visible decisions without inventing hidden production authority.
- Projected Advanced visibility from the public field manifest with a legacy
  fallback when the manifest is temporarily unavailable.
- Extracted controlled mode, readiness, Cast/Look and Shot sequence components
  while preserving existing add, reorder, remove, dialogue and timing actions.

## Step 5 - Field-Level AI Direction

**Status:** Complete

- Scene Direction opens its proposal dialog before dispatch and keeps the draft
  recoverable on transport or version failure.
- AI receives the latest unsaved Scene draft plus requested and protected field
  keys.
- Server converts the complete provider response into bounded field-level
  `proposed`, `unchanged` and `locked` outcomes while preserving Scene/Shot IDs.
- The user applies only selected proposed fields; locked and unselected values
  remain unchanged.
- Selected AI fields are recorded separately from user/default/inherited field
  authority during the canonical Story Plan save.

## Step 6 - Package Regression

**Status:** Complete

Validation:

- focused authoring/generation server regression: 42 passed, 0 failed.
- full Cinematic frontend suite: 17 files, 109 tests passed, 0 failed.
- post-extraction Scene Director and authoring components: 55 passed, 0 failed.
- Web TypeScript build check and both Cinematic locale JSON parses passed.

## Step 7 - Server Keyframe Contract Compiler

**Status:** Complete

- Added versioned keyframe, prompt-budget and photorealistic capture-profile
  configuration with schema validation and deterministic fingerprints.
- Added one server-owned Storyboard keyframe compiler with explicit Shot-first
  precedence, Character/Look authority, continuity references, prompt budget and
  conflict findings.
- Current Shot emotion and visible action remain authoritative over broad future
  story context. Environment conflicts such as unexplained interior wetness are
  reported instead of silently compiled.

## Step 8 - Manual And Generate All Cutover

**Status:** Complete

- Manual Shot generation and Generate All now request the same server context
  and submit the same keyframe fingerprint through the Cinematic batch command.
- Browser-authored final prompt overrides are rejected before pricing and stale
  fingerprints require a fresh context/quote.
- Shared Generation retains provider selection, estimate, Credit, Queue, polling
  and result presentation ownership.
- Manual generation uses the latest server Project/Shot versions and rotates its
  idempotency key only after an accepted operation.

Validation:

- Step 7-8 focused server regression: 42 passed, 0 failed.
- Storyboard route and contract coverage includes manual/batch fingerprint and
  submitted prompt parity.
- Web cutover coverage passed with the shared Generation experience.

## Step 9 - Produce Video Packet

**Status:** Complete

- Added versioned provider-independent video-packet policy and deterministic
  compiler.
- Produce context binds the current approved Storyboard source as immutable
  first-frame authority and carries Shot timing/action, Character/Look,
  performance, camera, environment, continuity and audio intent.
- Quote and submit require the current video-packet fingerprint and exact server
  prompt. Stale keyframe authority and browser prompt substitution fail before
  pricing or provider dispatch.
- Current provider catalog qualification remains unchanged. Unqualified private
  reference routing was not enabled as part of this requirement.

## Step 10 - Finish Timeline And Export Lineage

**Status:** Complete

- Added deterministic timeline compilation with exact Project Shot membership,
  trim bounds, transition bounds, assembled duration and source fingerprints.
- Source changes invalidate only affected timeline entries and export eligibility.
- Export manifest reconciles source fingerprints at read time, including legacy
  snapshots that once reported eligible.
- Finish controls now save actual Shot order/trim/transition state. Export remains
  qualification-only and cannot charge Credits or complete the Project.

Validation:

- Produce packet, timeline, application and duration reconciliation: 41 passed,
  0 failed.
- Focused Cinematic/Storyboard/Video/shared Generation server suite: 128 passed,
  0 failed.

## Step 11 - Cleanup And Release Verification

**Status:** Complete with conditional live/visual qualification

Deterministic validation after the final manual-Storyboard concurrency fix:

- full Web Vitest suite: 100 files, 373 tests passed, 0 failed;
- Web TypeScript project build: passed;
- i18n manifest/key parity validation: passed;
- production Web build: passed;
- targeted changed-file ESLint: 0 errors; 7 pre-existing warnings remain in the
  large Cinematic stage component;
- `git diff --check`: recorded at final handoff.

Repository-wide baseline findings, outside this capability:

- direct server suite: 625 passed and 13 failed; failures are five missing or
  stale professional-agent artifacts and eight Fashion taxonomy expectations;
- full ESLint has five pre-existing errors in Admin and Generation test files;
- root `npm test` recursively executes script files and Vitest TypeScript files
  through Node's test runner, so it is not a valid unified gate in its current
  form. Correct scoped Node and Vitest runners are recorded above.

Manual release evidence still required:

- live paid-provider keyframe/video visual qualification;
- interactive desktop/tablet/mobile checks at approximately 1440px, 820px and
  390px. Automated component, TypeScript and production-build coverage passed,
  but browser screenshot tooling was not available in this execution.

No unrelated provider qualification, pricing, global navigation, Character Look
lifecycle or Fashion behavior was intentionally changed.
