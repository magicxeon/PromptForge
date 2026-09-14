# P0 - Faceless Previs First

Status: API-first local pilot implemented in part; full P0 remains open. Owners: [Faceless](../002-faceless-previs.md), [shared API](../001-api-jobs-assets-and-security.md), [model gate](../007-model-registry-quality-and-licensing.md). No paid provider call is part of this service. Core existing Assets, Cinematic and Generation behavior must be preserved.

## Scope And Dependencies

Inputs: a newly generated photorealistic Storyboard still or a verified last frame extracted from a selected/approved preceding Take. Output: one separate matte-white Faceless previs image suitable for explicit Storyboard preview/approval. Existing provider Generate blank/white/full-face paths stay. No 0.5-second mask cleanup, manual polygon editor, GPU pipeline, voice/video enhancement or new customer charge.

## API-First Checkpoint (2026-09-14)

- P0.1 traced existing LastFrameService, StoryboardAssetService, approval and Asset ownership; observed local real-sample detector startup and single/two-face processing around 1-2 seconds, not a production latency benchmark.
- P0.2 partial: service capability, binary POST, hashes, 25 MiB/16 MP/8-face bounds and stable failures work. Durable submit/status/cancel Job protocol remains open.
- P0.3 partial: Core verifies owner and source hash, then pushes binary over authenticated loopback. No browser-direct call or arbitrary URL. Signed media grants and private output delivery remain open.
- P0.4 partial: a separate process is launched by scripts/start-dev.mjs with bounded synchronous work. Durable Job store, restart/retry/cancel and hard worker cutoff are open.
- P0.5 partial: MediaPipe package and task model are pinned by version/hash, CPU inference was exercised on one- and two-face samples. Model-bundle commercial rights, profile/rain/occlusion qualification and full fixture set are open; production capability defaults off.
- P0.6 implemented for API pilot: deterministic pale-white mask/guide, checksum and immutable derivative Asset. It is a mask preview, not AI face replacement.
- P0.7 partial: Core can prepare and explicitly approve the derivative through the existing command; the Storyboard UI control, localized pending/error states and visual comparison are open. Existing provider Generate paths remain untouched.
- P0.8 partial: focused runner scripts/test-post-processing.mjs covers api/mask/cinematic/security/all with no paid calls; targeted Cinematic regressions and TypeScript check passed. Human two-person Storyboard UAT, responsive UI and full production review are open.

The API-first synchronous bridge is temporary compatibility work. Remove it when the durable Job/private media transport owner in 001 is implemented and proven equivalent. It does not mark P0 complete.

## Ordered Tasks

1. **P0.1 Confirm contracts and baseline.** Trace current Storyboard reference selection, approval invalidation, last-frame extraction, Asset registration, actor authorization and UI controls. Capture representative fixture sizes/latency and adjacent tests. Record exact canonical files and measured baseline before adding a service boundary.
2. **P0.2 Define service wire contract.** Version capability, submit/status/cancel, typed input Asset grant, operation options, output metadata and stable errors; define owner/workspace, source version/hash, request idempotency, timeout/cutoff and maximum image/face counts. Add Zod/typed Core boundary and API schema tests. Never accept user-supplied arbitrary URLs.
3. **P0.3 Establish private media bridge and service authentication.** Core issues short-lived source-specific read authority; service returns private temporary output with checksum; Core imports via Assets and verifies source version. Test replay, expired grant, wrong actor, oversized/corrupt input, path/SSRF tricks and cleanup. No browser-to-service direct access.
4. **P0.4 Build independent minimal API and bounded worker.** Separate process and internal durable Job store using its chosen repository contract; atomic state transitions, restart recovery, retry budget, cancel, terminal cutoff and scratch cleanup. One operation only: faceless_previs. Test kill/restart and duplicate requests. Do not deploy the proposed cloud/GPU stack.
5. **P0.5 Pin and qualify face model.** Verify MediaPipe Face Landmarker package/model bundle license, checksum and CPU environment. Decode orientation, detect all visible faces, use confidence/size thresholds, fail safely for zero/partial/uncertain faces or an unaccounted second face. Benchmark two-person rainy and profile fixtures before enabling.
6. **P0.6 Render deterministic derivative.** Derive polygons/head-direction guides from landmarks; composite a pale matte-white face mask with restrained guide lines over decoded pixels, preserve everything outside polygons, encode one image, attach policy/model/source hashes and import as immutable Asset. Golden pixel checks and provenance assertions cover repeat requests and source changes.
7. **P0.7 Integrate Cinematic choice and fallback.** Present explicit mask action on eligible photoreal image or last-frame Asset, localized processing/retry/errors and before/after. Require user selection then normal Storyboard approval; never auto-approve, replace selected source or submit a paid Generate. Service failure shows reason and keeps existing blank/white provider Generate and full-face actions usable. On source mismatch discard stale derivative, leave approved source unchanged.
8. **P0.8 Focused verification and pilot gate.** Run service/API, mask, Cinematic, security groups separately, then explicit aggregate; inspect two-person/golden visual output and mobile/tablet/desktop interaction. Opt-in private media UAT follows isolated checks. Record latency/face failures, license evidence, remaining false-negative risk and reviewer signoffs before marking P0 complete.

## Proposed Focused Checks

Current isolated commands: node scripts/test-post-processing.mjs --group=api, --group=mask, --group=cinematic, --group=security and --group=all. No model or provider credential is required because the runner uses injected fixtures. The real-model smoke check uses the locally pinned model and a public official sample separately. Aggregate fails if any group fails and never includes live provider generation or customer data.

## Acceptance

One eligible still and one eligible preceding Take frame can yield a private derivative; failing detection changes neither source nor approval. Two faces are both masked or the request fails. Existing provider blank/white/full-face still work. Every Job terminates within configured cutoff after interruption. No paid generation, automatic fallback or Credit mutation occurs. The video may show the white mask at the start; it is an accepted limitation, not a failure to conceal.

The API-first evidence is above. Remaining task portions stay open until their own focused evidence and reviewer gates pass.
