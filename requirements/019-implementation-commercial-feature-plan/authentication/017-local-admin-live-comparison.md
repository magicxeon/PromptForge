# Local Admin Live Image Comparison

User confirmed2026-10-12: local Admin must Compare real images through their
provider API, including its actual provider charges. This supersedes AUTH016's
blanket Generation prohibition only for this explicit local opt-in.
2026-10-14: [AUTH-018](018-local-admin-video-playground.md) extends the same
qualified local Admin opt-in to existing Video Playground routes. Earlier
IMAGE-only/no-video wording below describes the original017 scope.
Product requirement owner Root; implementation primary Backend Platform
Architect. Mandatory Backend, Commercial, Security, QA and UX reviews apply in waves:
five reviewers are justified by billable dispatch, private output transport and
consumer consent. Main plus at most two reviewers; no child delegation.
Skills: implement-generation-workflow, review-commercial-integrity,
verify-release-regressions, review-product-ux.

## Authorized Boundary And Canonical Workflow

`AUTH_DEV_BYPASS_GENERATION_ENABLED=true`, defaultfalse, enables IMAGE Generation
and Comparison only with qualified local bypass/admin. Setting alone cannot
enable authentication or admin. Exact bool parsing; unsafe environment, user
role, unqualified roster or external Origin/peer still deny. Bypass off ignores
the opt-in and cannot restore old authority. Existing local data/output roots
remain isolated; real API credentials use the ordinary server provider registry.
The user's approved opt-in may be added to the local `.env`; no other key changes.

Trace: existing React model/Compare controls → apiClient → Comparison estimate/
create routes → ComparisonOrchestrator → GenerationApplicationService → Credits
quote/reserve → Queue → registered provider adapter → capture/refund → actor-owned
Comparison/History/output → existing polling/media UI. No provider or lifecycle
fork, no price bypass, no billable startup recovery, no free provider API calls.

Support the whole selected image workflow through an exact Identity allowlist:
quote/create/list/detail/edit/winner/delete Comparison; normal image generation/
prompt preview; references/upload/composite/processing plan; Job/Group status and
guarded streams; Job Center; own History/detail/presentations; own Credits ledger
and mock-grant; source-authorized fixture output GET/HEAD and media export. Every
unsafe request uses existing same-origin browser CSRF. Existing domain owner,
model limits, reference authority and stable owner checks remain required.
No video, Cinematic text, real credentials/security, arbitrary Admin financial
commands or production media. Normal user/default bypass stays restricted.

Provide a fresh local Identity reauthorization callback for owned output/stream
delivery: recheck local request, runtime opt-in/admin, entire roster and selected
active fixed actor each call. Reuse AssetDeliveryService and guarded stream;
never restore unrestricted static outputs. A revoked/disabled/downgraded fixture
loses delivery; accepted work remains with Queue/settlement, never auto-cancel.

## Credits And Consent

Fixture wallet starts atzero. User uses existing Credits “add mock” control to
fund ONLY the selected synthetic wallet. No automatic grant during implementation.
For development mock grants require fixed active mock admin identity, explicit
CSRF, positive integer1..1000, actor-matching user ID and mandatory bounded replay
key. Namespace the key by actor; atomic canonical grant rejects replay with a
different amount/actor, while identical replay returns the original ledger.
These virtual Credits do not pay the provider invoice. Show localized live-mode
text in the existing bypass banner: real provider charges apply; Credits/data
remain local fixtures. Default banner/layout and production session stay intact.
No existing price changes. Every slot requires locked server quote and normal
funds; reserve before dispatch, capture once on success, refund once on failure,
total includes only enabled slots, retries do not create new jobs/charges.
Comparison uses Generation's additive `reservePreparedOperations` facade and
Credits' existing atomic plan repository contract, with full quote parity for
every slot and all durable Job/reservation bindings before the first dispatch.
Unaccepted reservations are compensated on binding/enqueue failure; accepted
work retains canonical settlement. Reads during active admission must never
classify a reserved but not yet enqueued slot as a lost Job and refund it.
Failed compensation retains durable bindings and is retried by existing owned
Comparison reconciliation; no new poller, cache or recovery worker is introduced.
Comparison owns a process-local Set keyed by Set/Run, sourced from its active
create calls, limited to128 entries. Capacity denies before reservation/dispatch.
The guard ends in `finally`, has no premature TTL and resets with the process;
durable reservation bindings remain the source for restart reconciliation.

## Ordered Acceptance And Validation

1. Reviewed contract and exact scope, Commercial/UX feasibility.
2. Identity gate/callback, bounded canonical mock grants and honest banner.
3. Focused isolated tests plus actual createApp/Vite Comparison through registered
   Gemini adapter, using fake credential/strict mock HTTP responses only.
4. Independent sensitive/Commercial/UX review, static frontend build, map and
   evidence closure. No paid provider request is executed by agents/tests.

Success: opt-in local Admin adds virtual Credits, locks two Nano Banana2.1 image
quotes, accepts Comparison and polls two real Queue→adapter→capture results,
then reads both owned images and Comparison again. Automated responses are mocked
images but production source routes through the real adapter/provider registry.
Negative: flagoff/user/prod/remote, missingCSRF, tampered quote, insufficient
funds, grant abuse/conflicting replay, unsupported request, foreign/unmapped output
and prohibited financial/security/video calls deny before dispatch/delivery.
Recovery: duplicate submission/settlement is idempotent; one provider failure
preserves the successful slot and refunds only failed slot; role/off/fixture
revocation stops private HTTP and late frames/bytes without canceling accepted work.

Runner groups: development-bypass for focused gate checks; local-comparison for
explicit sanitized owned actual-app qualification. The latter uses only OS-temp
fixture paths, ephemeral loopback HTTP and strict intercepted Gemini responses;
external sockets, real credentials/data, workers/recovery are prohibited.
Existing aggregate Login is separate. Representative actual UI banner/Compare
entry at390/768/1440; no full paid live or visual quality claim.

## Evidence

2026-10-12 deterministic source verification:

- `node scripts/verify-authentication.mjs --group development-bypass`:14/14,
  including explicit live Admin eligibility and fresh actor/Origin revocation.
- `node scripts/verify-authentication.mjs --group local-comparison`:12/12.
  Actual createApp/Vite, registered Gemini adapter, canonical Queue, success,
  partial failure, capture/refund, replay and owned PNG delivery use strict mock
  transport/fake credentials. Atomic tests cover insufficient total/second quote/
  runtime failure with zero dispatch, binding/enqueue persistence failures,
  compensation retry, concurrent GET, admission capacity and restart refunds.
  Both children confine filesystem access before domain imports; atomic checks
  qualify a temporary bootstrap target for eager availability constructors.
- `node scripts/verify-authentication.mjs --group private-access`:44/44,
  protecting ownership, pinned files, late private frames/bytes and cleanup.
- React ActorProvider/AccountMenu:13/13; nonincremental application TypeScript
  check and `vite build --configLoader runner --emptyOutDir=false` pass. Existing
  bundle-size warning remains; no unrelated build/cache deletion or user restart.
- Native UX `/root/login_completion_ux`: actual TH/Neon Compare and Credits at
  390/768/1440, six views, readable charge disclosure/fixed actor and Add100mock
  action, no page overflow. EN/TH93-key/interpolation parity passes. APIs were
  intercepted; no grant or dispatch in the browser.
- Native Commercial `/root/nano21_commercial_review` and native Backend
  `/root/auth_backend_contract_review`: independent source review and12/12
  reruns pass after all blocking findings were fixed.

- Native `/root/login_bypass_release_review`: author-separated Security then QA
  review pass, with independent reruns14+44+12=70/70. The same reviewer applied
  those two charters sequentially; dedicated Backend, Commercial and UX reviews
  remained separate. No blocking findings remain.
- Authorized local `.env` now contains
  `AUTH_DEV_BYPASS_GENERATION_ENABLED=true` beside the existing Admin alias and
  bypass toggle. Only this public opt-in was added; actual wallet was not funded.
  Restart is left to the user. Current designated local fixture qualification
  and static dist entry assets are checked read-only before handoff.

AUTH-DEV-COMPARE-01 source delivery complete after required reviews. Existing
runtime namespaces retained: `.local-auth-fixture/data/` and its private outputs;
no new real data paths, account grants or credential changes. The new test belongs
to `test/` and both new requirement/plan files to this authentication capability.
Canonical ownership rows and Auth index/009/014/016 links are updated.

This is source acceptance for a single-process local Admin image workflow.
No paid provider call, visual-quality assessment, distributed crash consistency
or production authentication readiness is claimed. Other themes, screen-reader
and successful browser quote/consent execution remain outside this scoped visual
qualification; canonical backend tests verify charged workflow independently.
