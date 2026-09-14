# Post-Processing API (Faceless Previs Pilot)

This is a separate local service process, not an Express route or a second
Generation pipeline. Core authenticates the actor, verifies the Storyboard
source Asset and sends its bytes over authenticated loopback HTTP. The service
has no access to Core repositories and accepts no source URL, filesystem path,
actor ID or Base64 payload from callers. It runs MediaPipe Face Landmarker in
a local headless Chromium context with outbound requests blocked. Its only
operation in this pilot is a deterministic white-face previs PNG. No customer
Credits are charged.

Use scripts/start-dev.mjs (or scripts/start-dev.bat) to start Core, Web and
this service together. The launcher creates a fresh internal token, chooses
port 6501 when free, and downloads a checksum-pinned local model if absent.
If model download or Chromium setup fails, the service still starts and
reports faceless_previs unavailable. To install Chromium manually, run
npx playwright install chromium. The ignored local .env enables the dev pilot;
without an explicit setting, the operation is disabled. The launcher honors
the setting rather than forcing it on.

Service layout and configuration:

- AGENTS.md defines ownership and extension rules. api/ owns HTTP/auth;
  domain/ owns masking; adapters/ owns MediaPipe; config/ owns validated
  runtime and operation policy; models/ holds ignored pinned artifacts.
- .env.example documents runtime values. The local .env is ignored. Process
  environment overrides .env. POST_PROCESSING_HOST stays 127.0.0.1 in this
  pilot; start-dev can reassign the preferred port if it is occupied. The
  launcher generates a fresh internal token when one is not provided.
- config/policy.json owns non-secret image/face/concurrency limits, timeout,
  detector thresholds, mask appearance and pinned model URL/hash. Invalid
  values fail startup. Change policyVersion and regression evidence when
  behavior or artifact changes. Environment settings cannot override policy.

Service routes:

- GET /health: loopback readiness, no media or token.
- GET /v1/capabilities: requires x-post-processing-token.
- POST /v1/faceless-previs: requires token, raw JPEG/PNG/WebP bytes,
  x-input-sha256 and x-expected-faces (1-8). Returns PNG bytes with
  x-output-sha256, x-face-count, x-mask-policy-version and x-model-sha256.

Core routes:

- GET /api/cinematic/faceless-previs/capabilities
- POST /api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/faceless-previs
  with expectedVersion, expectedShotVersion, expectedFaces and either
  sourceType=generation_job plus jobId or
  sourceType=previous_video_last_frame plus frameAssetId.
- PUT /api/cinematic/projects/:projectId/shots/:shotId/storyboard-source
  with sourceType=faceless_previs, assetId, expectedVersion,
  expectedShotVersion and idempotencyKey for explicit approval.

The API slice is synchronous and bounded to 30 seconds; durable async Jobs,
retry/recovery, full private media delivery, UI controls and production model
license qualification remain open in requirement 021. A failed mask preserves
the source and approval. Existing provider-generated Faceless options remain
unchanged. Masked outputs currently use Core's existing /outputs/ media path;
do not treat this pilot delivery as a private production media grant.
