# Package 003 - Seedance First-Frame Vertical Slice

**Plan ID:** `016-PVP-IP-003`  
**Status:** In progress; deterministic implementation complete, three live qualifications pending  
**Requirement owners:** `../004`, `../006`, `../010`  
**Primary capability:** Generation/provider execution  
**Reviewers:** Generative Cinematic Production, Commercial Integrity, QA

**Detailed deterministic subplan:** `003a-seedance-deterministic-lifecycle.md`

**Development POC override:** `003b-development-unverified-seedance-poc.md`

## 1. Goal

Qualify Seedance 1.0 Pro Fast internally for one Cinematic first-frame I2V Shot,
including durable provider task recovery, Asset copy/poster/probe and complete
Credit evidence. This package qualifies a draft tier only and does not enable
customer-paid or final-clip access.

## 2. Expected Existing Touchpoints

- `server/config/cinematic-video-models.json`
- `server/config/credit-pricing-policy.json`
- `server/config/providers.json` and server environment policy
- `server/providers/ModelArkSeedanceProvider.js`
- `server/providers/VideoProviderAdapterRegistry.js`
- `server/domain/generation/VideoGenerationApplicationService.js`
- `server/domain/generation/VideoProviderTaskService.js`
- `server/domain/generation/QueueManager.js`
- `server/repositories/generation/VideoProviderTaskRepository.js`
- `server/domain/assets/CinematicVideoAssetService.js`
- `server/domain/assets/VideoPosterService.js`
- process startup/composition in canonical `server/app/` and `server/server.js`
- existing provider, task, Asset, Credit and Cinematic tests

## 3. Steps

### 003.1 Sandbox preflight

Implement provider/account/model/region, first-frame, duration, ratio,
resolution, audio-disabled and trust checks. Known failures occur before
reservation. Confirm provider documentation against the live account on the
qualification date.

### 003.2 Adapter payload and response tests

Map the normalized request into the documented ModelArk payload. Omit
unsupported options. Normalize task status, output, errors and usage while
redacting prompt/reference payloads from logs.

### 003.3 Durable lifecycle and resumption

- persist task before/with accepted dispatch according to current idempotency
  contract;
- wire `resumeRecoverable()` through server-owned startup/background lifecycle;
- prevent duplicate polling/completion/copy/capture;
- distinguish provider timeout from final failure.

### 003.4 Durable media and technical probe

Copy provider output before URL expiry, create video Asset and poster, and add a
typed ffprobe result required for review. Keep last-frame strategy disabled
until Package 005.

### 003.5 Financial review

Prove displayed no-user-Credit qualification quote, provider-cost evidence,
provider usage and unchanged creator balance under success, known preflight
failure, provider failure, timeout/recovery and Asset-copy recovery. Also prove
the dormant billable reservation/capture/refund contract with deterministic
tests. Keep `pricingStatus` research-only and paid routing false.

### 003.6 Internal UI exposure

Expose Seedance only to the internal qualification actor/feature policy when the
selected Shot is compatible. Show exact model, mode, reference, duration,
resolution, audio limitation and estimate.

### 003.7 Three live qualification runs

Execute and record the three cases from `../004`. Review motion, identity,
wardrobe, first frame, environment, latency, technical media and finances.

## 4. Tests

- provider payload snapshot for one first-frame request;
- malformed/missing reference, unsupported settings and entitlement failure;
- status/usage/error normalization;
- idempotent create/poll/resume/copy and qualification settlement, plus mocked
  billable capture/refund parity;
- provider URL expiry and recoverable Asset copy;
- valid/corrupt/probe metadata behavior;
- actor/feature policy hides model from ordinary users;
- existing Seedance/other provider adapter and pricing regressions;
- three recorded live attempts after deterministic tests pass.

## 5. Exit Gate

- One internal Shot reaches `ready_for_review` with durable clip, poster, probe,
  task, attempt and Credit evidence.
- Restart/navigation does not lose or duplicate the attempt.
- All three live cases satisfy lifecycle gates; visual caveats are classified.
- Customer-paid exposure remains disabled.

## 6. Stop Conditions

- Live account capability differs from catalog/request assumptions.
- Source cannot be delivered without exposing private/untrusted media.
- Provider usage cannot be reconciled to the quote policy.
- Retry/resume can produce duplicate billable tasks.
- Output cannot be durably copied/probed before expiry.

## 7. Rollback

Disable the Seedance qualification policy/model combination. Keep historical
tasks, attempts, Assets and Credit evidence readable. Existing provider paths
remain active according to their prior policies.
