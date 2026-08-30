# 006 - Meta Muse Release Validation, Observability And Rollback

Status: Proposed  
Depends on: Requirements 001-005 as applicable to release scope

## 1. Purpose

Define the final regression, security, commercial, operational, and rollback
gates for a safe staged release.

## 2. Release Stages

1. **Adapter disabled** - code and mocked tests only.
2. **Internal contract test** - approved actors, `n=1`, no customer Credits.
3. **Internal general qualification** - Playground/Studio candidate.
4. **Priced internal pilot** - locked estimates and real Credit settlement.
5. **General customer release** - text-to-image only as qualified.
6. **Fashion pilot** - only after Requirement 005 passes.
7. **Fashion customer release** - separately approved.

Promotion requires recorded evidence. API key presence alone changes no stage.

## 3. Regression Checklist

### Provider and Generation

- provider config, registry, factory, and adapter tests pass;
- existing provider catalog snapshot/order/defaults remain stable;
- queue accepts one normalized Meta job and reaches one terminal state;
- success persists image, thumbnail, metadata, and History;
- failure stops progress and provides stable UI error;
- Job Center remains actor-scoped and durable;
- multi-output and Comparison retain ownership/idempotency behavior.

### Credits

- unpriced model cannot reserve Credits;
- priced estimate uses exact provider/model/settings;
- reserve happens once;
- successful terminal job captures once;
- failed pre-output job refunds once;
- restart/reconciliation does not double-capture or double-refund;
- historical pricing snapshot does not change after policy updates.

### References And Media

- unsupported references are blocked, never ignored;
- output MIME/bytes are validated;
- expiring URL output is copied to owned storage before success;
- no private provider URL or raw payload enters public snapshots.

### UI

- Playground and Studio use shared catalog controls;
- Fashion exposure follows qualification only;
- loading/error/result/modal/History behavior matches existing models;
- responsive checks pass near 390px, 820px, and 1440px;
- other providers retain all existing controls and behavior.

## 4. Observability

Record safe structured events for request accepted, provider dispatched,
provider responded, output persisted, and terminal settlement. Metrics separate:

- queue wait;
- provider latency;
- output download/normalization latency;
- persistence latency;
- total duration;
- success/failure by stable category;
- estimated versus known provider cost when available.

Never log keys, authorization, raw prompts, Base64, private references, signed
URLs, or full provider bodies. Debug logging is opt-in and follows the same rule.

## 5. Security Review

- secret stays server-side and is redacted from config projections;
- base URL override is restricted to server configuration;
- output URL fetch prevents SSRF and unsafe redirects;
- response size and content type are bounded;
- errors returned to clients are sanitized;
- actor ownership is checked by existing Generation/History services;
- provider moderation is not represented as the product's only safety layer.

## 6. Rollback

Rollback must require configuration, not source deletion:

1. disable customer exposure for model/provider;
2. disable Fashion qualification independently;
3. stop new quotes and submissions;
4. allow accepted jobs to settle or reconcile safely;
5. retain History and job details;
6. preserve Credit ledger and pricing snapshots;
7. keep adapter code available for incident investigation;
8. publish a safe user-facing unavailable state.

Do not remove historical records, generated outputs, or ledger entries as part
of provider rollback.

## 7. Suggested Validation Commands

Exact command lists should be finalized during implementation based on touched
files. At minimum run the provider registry/config tests, Meta adapter tests,
Generation/Credits lifecycle tests, Playground/Studio web tests, Fashion
qualification tests, web typecheck, and repository-wide relevant regression
suites.

No automated test may call the live Meta API. Live tests are manual, explicitly
authorized, cost-recorded, and use non-sensitive prompts.

## 8. Release Evidence Record

For each stage record:

```text
Date:
Environment:
Provider / model:
Enabled operation:
Documentation evidence version:
Pricing policy version:
Qualification version:
Automated test result:
Manual Job IDs:
Provider request IDs:
Known cost and Credits:
Security review:
Rollback rehearsal:
Decision: promote / hold / rollback
Notes:
```

## 9. Acceptance Criteria

- Every release stage has objective evidence and an owner.
- Rollback stops new spend without corrupting active or historical jobs.
- Logs and admin diagnostics are useful without exposing sensitive data.
- Existing image providers and product surfaces pass regression gates.

