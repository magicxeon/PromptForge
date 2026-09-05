# Package 003F - ModelArk AIGC Asset First-Frame Transport

> Superseded for Cinematic first-frame transport by
> [CINE-FIX-012](../../fix-tickets/CINE-FIX-012-seedance-direct-first-frame-recovery.md).
> Asset Library is no longer required; GCS is preferred with Base64 fallback.
> Retain this plan
> as implementation history; do not use it to restore mandatory registration.

**Plan ID:** `016-PVP-IP-003F`  
**Status:** Deterministic implementation complete; deployment setup and creator-confirmed live qualification pending  
**Owning requirement:** `../011-seedream-seedance-synthetic-character-keyframe-flow.md`  
**Execution rule:** Requirement and contract tests precede implementation; no paid provider call in automated validation

## 1. Scope Guard

This package transports the exact currently approved Storyboard keyframe to
Seedance through ModelArk's private AIGC Asset Library. It does not regenerate,
edit, reapprove or replace the keyframe, does not change the selected provider,
does not bypass moderation and does not alter Story/Cast/Look/Shot authority.

## 2. Canonical Path

```text
Cinematic Produce submit
  -> VideoGenerationApplicationService
  -> verify owner + immutable Storyboard Asset + content hash
  -> ModelArkAigcAssetRegistrationService (Assets public contract)
       -> private GCS provider-handoff object + ephemeral signed read URL
       -> ModelArkAssetLibraryClient (AK/SK signed control-plane calls)
       -> ProviderAssetRegistrationRepository sidecar
  -> VideoProviderTaskService
  -> ModelArkSeedanceProvider with asset:// first_frame
  -> existing task polling, media copy, Credit capture/refund and preview
```

## 3. Implementation Order

### 003F.1 Configuration and persistence

1. Add documented ModelArk Asset Library and GCS environment variables.
2. Add an Assets-owned registration data file resolved through `paths.js`.
3. Implement an actor-scoped repository with an idempotency lookup over local
   Asset ID, content hash, provider, credential scope and provider Project.
4. Persist only bounded transport metadata; never persist a signed URL, raw
   bytes, API Key, AK or SK.

**Exit:** repository contract tests pass and actor isolation is proven.

### 003F.2 Provider and storage adapters

1. Add a private GCS handoff adapter that uploads the verified local bytes and
   creates a bounded V4 signed read URL.
2. Add a ModelArk Asset Library client using official HMAC-SHA256 AK/SK signing
   for `ListAssetGroups`, `CreateAssetGroup`, `CreateAsset` and `GetAsset`.
3. Keep `Moderation.Strategy` at `Default`.
4. Redact source/signed URLs and credentials from diagnostics and errors.

**Exit:** deterministic payload/signature tests and mocked transport tests pass.

### 003F.3 Registration orchestration

1. Resolve/reuse the configured or exact named AIGC group.
2. Reuse an `Active` sidecar registration; resume `Processing`; create only
   when no matching registration exists.
3. Poll with bounded interval/timeout and persist every terminal status.
4. Return only the provider Asset URI and bounded registration evidence to
   Generation.

**Exit:** active reuse, processing resume, failed ingest, timeout, ownership and
hash-change tests pass.

### 003F.4 Generation integration

1. Quote validates that Asset Library/GCS/account binding is configured but
   performs no remote mutation.
2. Submit registers the source before Credit reservation so ingestion failures
   cannot charge Credits.
3. Replace only the provider transport value with `asset://<asset-id>` while
   preserving source authority, reference count, quote fingerprint and role.
4. Persist sanitized registration identity in the submitted task for Support;
   no URL or credentials are included.

**Exit:** quote/submit parity, pre-reservation failure and Seedance payload tests
pass; existing task/settlement behavior is unchanged.

### 003F.5 Produce recovery correction

1. Remove automatic/suggested keyframe replacement and alternate-provider
   actions from the post-submit privacy failure state.
2. Do not permanently disable a fresh creator-confirmed Generate action because
   an earlier task failed.
3. Keep failed Attempt ID, provider error and refunded state visible.
4. Show missing Asset Library/GCS setup as the quote error from the canonical
   server contract.

**Exit:** React regression proves no source/provider mutation action is shown,
the approved source remains visible and a newly valid quote can be submitted.

### 003F.6 Verification

1. Run focused Assets, Generation, provider, Cinematic route and Produce tests.
2. Run TypeScript, i18n validation, production build and `git diff --check`.
3. Do not run a paid attempt automatically.
4. After credentials, rights and GCS are configured, the creator performs one
   explicit live Seedance attempt and records Asset status, task ID, Credit
   settlement, preview and moderation outcome.

## 4. External Setup Gate

- Enable/purchase ModelArk Advanced Creation Rights.
- Accept the first Asset Group authorization letter in ModelArk Console.
- Grant server AK/SK `ark:*Asset*` in the same Project as inference.
- Create a private GCS bucket and grant the server service account object
  create/read/delete plus signing capability.
- Confirm that inference API Key and Asset AK/SK share one account and Project;
  configure a stable non-secret account scope before production rollout without
  invalidating an existing approved POC source.

Until this gate is complete, the system must fail with configuration guidance
before Credit reservation. It must not fall back to Base64, another provider or
a replacement keyframe.

## 5. Rollback

Disable the Asset Library integration flag. Existing approved Storyboard
sources, failed Attempts, Credits and sidecar records remain intact. No rollback
may delete or replace an approved keyframe.

## 6. Verification Record - 2026-09-05

Implemented and verified without a paid provider request:

- exact approved bytes are re-hashed, uploaded once to the private handoff and
  registered into the ModelArk AIGC Asset Library;
- concurrent and repeated submission preparation reuses one registration;
- ambiguous provider mutation delivery fails closed for reconciliation rather
  than creating another Asset;
- Seedance receives an `asset://` first frame and omits `ratio` for first-frame
  generation;
- registration and ingestion failure occur before Credit reservation;
- Produce keeps the approved keyframe and selected provider unchanged, exposes
  the previous failed Attempt and requires a fresh creator click to retry;
- 54 focused Assets/Generation/Seedance tests pass;
- 10 focused Produce UI tests, Web typecheck, i18n validation and production
  build pass.

The complete server JavaScript suite currently reports 708 passing and 13
pre-existing failures in agent-orchestration and Fashion prompt/taxonomy tests.
Those failures are outside this package and were not modified to hide them.

Live qualification remains intentionally unexecuted until Advanced Creation
Rights, same-account Asset Library AK/SK, a private GCS bucket and signing
credentials are configured. No automatic provider call or Credit mutation was
made during this package.
