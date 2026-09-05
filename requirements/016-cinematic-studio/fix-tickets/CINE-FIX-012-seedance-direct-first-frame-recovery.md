# CINE-FIX-012 - Seedance Direct First-Frame Recovery

**Status:** Implemented and locally verified; live Seedance acceptance pending
**Priority:** P0
**Owner:** Generation video workflow, consumed by Cinematic Produce
**Primary:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect and QA Release Engineer; sequential
checks by the implementation agent, not independent agents. Backend includes
privacy/ownership and financial-invariant review.
**Skills:** implement-generation-workflow, direct-generative-cinematic-production,
review-generative-media-pipeline, review-commercial-integrity,
verify-release-regressions.

## 1. Outcome And Scope

Restore approved Storyboard -> ModelArk Seedance 2.5 first-frame generation
using a private GCS signed URL first, with Base64 fallback before submission.
ModelArk Asset Library is not required. The creator will perform the
live test; automated checks must not send paid image or video requests.

User correction: retain GCS as the preferred reusable image transport. Before
this fix, quote called Asset Library preflight; submit registered Character images
before dispatch. This does not prove that this synthetic image requires that
feature. The direct reference resolver and ModelArk Base64 adapter already exist.

This ticket supersedes mandatory GCS/Asset Library transport, setup prerequisites
and asset:// acceptance criteria in 016-PVP-011 and plan 003f. Other authority,
Credit and provider-contract requirements remain active. Do not delete storage,
credentials, registered Assets, historical tasks or shared modules.

## 2. Protected Behavior

- Keep Seedance 2.5, its endpoint, selected settings and pricing policy.
- Keep approved image bytes, source IDs, fingerprints, Cast, Looks and prompts.
- Never regenerate/replace images, revoke approval, switch to Veo/LAS or
  substitute Lite for Pro automatically.
- Keep actor ownership, immutable Asset verification, reference limits,
  provenance checks, quote-submit parity, reservation before dispatch,
  idempotency, capture/refund, task recovery and persisted video preview.
- Keep provider moderation. Rejection does not establish that the AI image is
  a real person or needs a specific subscription.
- Do not redesign Storyboard, Produce, shared controls, Playground or Finish.

## 3. Ordered Implementation

### Step 1 - Direct Transport

`Produce -> cinematic quote/attempt -> Generation validation -> owned immutable
Asset -> Assets first-frame transport -> private GCS signed HTTPS URL -> ModelArk
adapter -> first_frame`. If GCS setup/upload/signing fails before dispatch, use
the same verified bytes as a Data URL; never switch provider or replace an image.

Remove the Asset Library dependency/calls from Generation quote and submit.
Quotes upload nothing. Reuse GoogleCloudProviderAssetStorage behind an Assets
service. Reload/verify owned source bytes before URL upload or Base64 fallback.
GCS objects use owner + source Asset + content hash keys in a dedicated
video-first-frame namespace. Verify matching remote metadata/checksum before
reuse; create missing objects with generation-match preconditions. Repeated
Shots reuse the object and obtain a fresh signed URL, not a new upload.
No in-memory URL cache or new runtime JSON file. Retain the object for reuse;
do not invoke the old registration cleanup. Bucket lifecycle/retention remains
operator-owned; no automated deletions are added.

Signed URLs are private bearer links usable without cookies/extra headers.
Default validity is 72 hours, covering the default 48-hour provider task window;
`CINEMATIC_PROVIDER_ASSET_VIDEO_URL_TTL_SECONDS` allows 49 hours through 7 days.
Do not persist/log the signed URL or Base64; retain only transport mode and a
bounded fallback code for diagnostics. Existing registration metadata remains.
Storage errors permit one local Base64 fallback before the single provider
submission. Provider rejection, timeout or unknown delivery never triggers a
second automatic submission. Keep ratio absent for first-frame requests.

### Step 2 - Honest Readiness And Errors

Preserve a bounded provider error code/request ID through adapter, task and
public schema. Do not expose raw prompts, signed URLs, images or credentials.
Use neutral image-rejection classification rather than inferred authorization.
Continue interpreting historical stored error codes.
Redact provider-echoed HTTPS URLs from diagnostic messages; a provider error
must not turn the new signed read link into a logged credential. Extend the
existing video diagnostic sanitizer, not a separate logging path.

Generate must show the actual blocking condition: source/context loading or
failure, missing source/prompt, packet validation, quote loading/error/missing,
insufficient Credits, active task or uncertain delivery. Prevent stale-quote
submission during requoting. Immediate/async failure stops the spinner and
shows error code/request ID. Media-copy recovery or reconciliation must not
create another paid task. Reuse existing status/alert/footer slots and EN/TH
localization. No automatic provider or keyframe recovery. Completed videos use
the existing preview/player and explicit approval.

### Step 3 - Focused Test Scripts

Add `scripts/test-cinematic-video.js` with fixed `payload`, `flow`, `ui`, `full`
suites, Node child_process, shell:false and repository-relative paths. Default
to help. Report timings/nonzero failures. No dotenv, live calls or default full
suite. Full runs groups once plus adjacent regressions. Build and responsive
browsers are separate opt-in checks, not run after every small edit.

Run payload after adapter edits, flow after Generation edits, ui after status
edits. Reuse existing tests instead of recreating an end-to-end test system.

## 4. Acceptance Matrix

| Case | Required result |
|---|---|
| GCS configured | Submit a signed URL to original bytes; no Asset Library calls |
| Same source used again | Reuse owned hash-keyed GCS object; renew URL without upload |
| GCS unavailable / signing fails | Same verified bytes as Base64 before single dispatch |
| Source verification fails | No GCS upload or Base64 fallback |
| Approved Pro source generated with references | Same image/model/settings retained; local eligibility is not provider trust certification |
| Missing/deleted/foreign/tampered source | Reject before reservation/dispatch |
| No Credits / changed quoted inputs | No provider submission |
| Duplicate accepted request | Reuse task, no second charge/dispatch |
| Immediate image rejection | Visible error/code/request ID; existing not-billable refund rule |
| Processing | Task status visible, duplicate submission unavailable |
| Media retry / uncertain delivery | Recover existing task, no new paid task |
| Completed/persisted video | Existing preview and approval remain usable |
| Failure | No provider switch, keyframe replacement or automatic retry |

## 5. BytePlus Confirmation - External And Pending

https://docs.byteplus.com/en/docs/byteplus_las/video_gen_enhanced confirms
Seedance 2.5 first-frame/reference and Base64 support but documents the LAS
endpoint, not our ModelArk endpoint. It does not settle the specific Pro +
reference trusted-output case. No Support case has been sent/answered by this
agent. Do not claim that code changes certify provider acceptance.

Support handoff, without keys:
- Video model: dreamina-seedance-2-5-260628.
- Failed provider request:
  0217885398110799ded32e803badef81244c2c5f5c7f1be3c208d.
- Local task: videotask_ffa793a479b3c222496e.
- Error: InputImageSensitiveContentDetected.PrivacyInformation.
- Source under investigation: dola-seedream-5-0-pro-260628 using identity/wardrobe
  references. Attach actual image Job/request ID and content hash privately.
- Ask whether that output operation is trusted on same-account ModelArk, which
  check rejected these original bytes, and the supported input contract.

If unsupported, discuss image alternatives with the creator first. Switching
to Lite alone is not a proven fix for reference-conditioned images.

## 6. One-Clip Creator Check

Existing approved image, Seedance 2.5, one clip. Check source ID/hash, one
first_frame, duration/resolution/audio and exact quote first. POC Credits do
not imply a free external provider. Record submit -> provider task ID ->
progress -> terminal result -> persisted preview and Credit outcome. Never
auto-retry. A rejection is failed qualification, not completion.

## 7. Execution Record

- Requirement written before implementation.
- Step 1: complete. Generation uses Assets/CinematicFirstFrameTransportService;
  GoogleCloudProviderAssetStorage reuses verified objects and renews read URLs.
  No Asset Library call, approval mutation or provider switch.
- Step 2: complete. Preserve provider code/request ID, redact diagnostic URLs,
  display real blocking reasons and immediate task failure. Processing/media-copy
  and reconciliation cannot start another task. Existing player/approval retained.
- Step 3: complete. Focused test runner added; no default full suite.
- BytePlus confirmation and creator live test: pending, not performed.

### Validation Evidence

- `node scripts/test-cinematic-video.js payload`: 23 passed, about 0.2 seconds.
  Covers URL/Base64 payload, first-frame ratio omission, unchanged endpoint/model,
  safe diagnostics and production versus development POC capability gates.
- `node scripts/test-cinematic-video.js flow`: 35 passed, about 0.7 seconds.
  Covers original-byte verification, actor/content isolation, GCS reuse, fallback,
  quote/reservation ordering, task idempotency, failure/refund and media recovery.
- `node scripts/test-cinematic-video.js ui`: 16 passed, about 7 seconds including
  startup. Covers Generate gating, stale quote/error, Credits, processing,
  reconciliation, immediate failed response, original provider/source preservation
  and completed video preview. Vite required sandbox escalation for temp files.
- `node scripts/test-cinematic-video.js --help`: passed; full is opt-in via
  `node scripts/test-cinematic-video.js full` and was not run.
- `node scripts/validate-i18n-catalogs.js`: passed.
- `npm.cmd run build:web`: passed, including TypeScript; served frontend rebuilt.
- `git diff --check`: passed; existing .env.example LF/CRLF warning only.
- Actual GCS check on existing approved Asset `ast_1788532559508_3qq8ylp5`:
  HTTPS GET 200, 1,627,735 bytes, SHA-256 matched original. Resolving twice retained
  the same GCS object generation (no second upload/overwrite). URL validity 72h.
  Signed URLs/credentials were not printed or persisted. One private reusable
  object remains; no project/Asset/approval records changed. No paid video call.
- Backend/security and QA checks performed sequentially by the implementation
  agent, not independent reviewers. Reviewed source authority, scoped object keys,
  ephemeral credentials, single provider submit and preserved Credit transitions.
- No page layout redesign. Responsive browser screenshots were not repeated in
  this status-only change; new diagnostic identifiers wrap to avoid overflow.

### Placement And Remaining Gates

- New `server/domain/assets/CinematicFirstFrameTransportService.js`: Assets owns
  transport preparation; Generation remains the only provider dispatch owner.
- New `test/cinematicFirstFrameTransport.test.js` and
  `scripts/test-cinematic-video.js`: capability tests and focused orchestration.
- Existing capability folders reused; no moved files or new runtime JSON store.
  GCS key: `<configured-prefix>/video-first-frames/<owner-hash>/<asset>/<hash>.ext`.
- Restart the backend to load the transport code; reload Produce for built UI.
  Retain existing approved source/model, check one-clip quote and submit explicitly.
- GCS download success does not establish ModelArk trusted-input acceptance.
  Live submit -> provider task ID -> progress -> completion -> persisted preview
  and final provider/Credit cost still require the creator's single-clip test.
