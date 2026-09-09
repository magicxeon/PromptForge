# Momelo Enhancement Implementation Plan

ID: ME-PLAN. Date: 2026-09-08.
Status: implemented and isolated verification passed; live paid provider UAT pending.
Owner: [011](011-momelo-enhancement-master.md).

## Execution Rules

2026-09-08 decision update: user authorized a rate-derived small whole-Credit fee.
G1 now has official Luna input/output rates (see 014); a scoped fixed-service fee
uses a conservative complete-request token budget, existing FX/buffer/margin and
one-Credit rounding. It is not token-actual customer settlement; G3 partial capture
is not needed. Do not cap the price at two Credits when that would violate cost.
Implement definition/form -> pricing and prompt recipe -> durable operation ->
authorized API/artifact handoff -> UX -> focused isolated tests/review.
Durability: atomically claim quote once per actor, reserve via Credits, persist
dispatch before provider, persist result before capture. Replays never redispatch.
On restart, delivered/capture-pending operations finish capture; interrupted
operations refund with unknown-cost evidence and no retry. Startup preserves the
new operation kind before generic orphan reconciliation. Status is explicit read,
not a second unbounded polling loop. Capacity/retention are documented in 099.

Execute each row in order within its stage; attach evidence/status before the next
dependent stage. Do not mark a gate passed from document review. UI visual work
may proceed after schema freeze while active pricing is unresolved, but keep paid
Enhance unavailable until Credits/recovery gates pass. Do not enable the old
generation-time refinement as a shortcut. No live generation in automated checks.

## Stage 0: Contracts And Rate Evidence

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| G0.1 | Confirm current facade, normalized Look Sheet input, reference auth, provider call and Credits flow | Recorded owner/caller map; no duplicate pipeline | Implemented / verified below |
| G0.2 | Inspect configured Prompt Refine model and active text price source without logging secrets | Provider/model, path/record, unit, version/date, retail conversion documented | Implemented / verified below |
| G0.3 | Classify fixed-fee vs token-rated active policy | Exact consent/settlement rule; missing rate remains unavailable | Implemented / verified below |
| G0.4 | Choose durable Generation text record/repository and startup reconciliation hooks | No image-Job impersonation; private path/ownership registered | Implemented / verified below |
| G0.5 | Freeze artifact schema, per-actor authorization, retention and bounded status strategy | Financial evidence retained; no unbounded private prompt cache | Implemented / verified below |
| G0.6 | Commercial/Backend review recovery and rate gate G1 | No invented price, free fallback or unsupported partial capture | Implemented / verified below |

G1 output is a short evidence record, not a new published price. Missing active
text rates or retail units block paid activation only. Ask the user for a precise
configuration decision only if repository inspection cannot resolve it.

## Stage 1: Definition And Prompt Contract

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| D1.1 | Raise appearance limit in shared Zod and server normalizer | 2,000 Unicode code points; boundary parity | Implemented / verified below |
| D1.2 | Adjust definition UTF-8 cap to 24 KiB; retain bounded other fields | Maximum multilingual fixture accepted; over-limit rejected, no truncation | Implemented / verified below |
| D1.3 | Version actor draft migration; enhancement defaults OFF | Old form/pinned identity preserved | Implemented / verified below |
| D1.4 | Define complete immutable brief/default/identity mapping | Every field represented; approved range/outfit wins | Implemented / verified below |
| D1.5 | Reuse Natural Realism loader with Look Sheet-specific policy | ON/OFF, portrait/full-body and stylized intent fixtures | Implemented / verified below |
| D1.6 | Add bounded structured AI response and deterministic authority validator | Omission/change/refusal/malformed fixtures rejected | Implemented / verified below |
| D1.7 | Finalize fingerprints and canonical effective prompt composition | No duplicate realism/layout/identity; no partial form loss | Implemented / verified below |

Run groups `definition` and `prompt` before money integration. Test doubles only;
do not qualify live output quality from these results.

## Stage 2: Credits And Durable Execution

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| C2.1 | Add owning Credits text quote contract using G1 configured rates | Amount/units/FX/rounding/expiry exact; missing/disabled denied | Implemented / verified below |
| C2.2 | Lock operation fingerprints, output budget and rate versions | Changed form/identity/policy request cannot reuse stale quote | Implemented / verified below |
| C2.3 | Extend reservation parity for the new operation kind | Actor, request ID, quote and durable operation match before AI | Implemented / verified below |
| C2.4 | Implement atomic durable idempotent acceptance through repository | Same-key concurrent requests produce one operation/reservation | Implemented / verified below |
| C2.5 | Extend PromptRefinementService task mode behind Generation facade | AI called once only after successful reserve | Implemented / verified below |
| C2.6 | Validate and persist artifact before success settlement | Invalid output never becomes generate-usable | Implemented / verified below |
| C2.7 | Fixed-fee capture or token actual/cap release per G1 | No charge beyond consent; accounting equations verified | Implemented / verified below |
| C2.8 | Persist failure/refund/reconciliation states; disable auto provider retry | Duplicate refund/capture harmless; unknown outcome not silently retried | Implemented / verified below |
| C2.9 | Startup recognition and interrupted settlement recovery | No orphan refund of active text operation; no duplicate provider call | Implemented / verified below |
| C2.10 | Emit safe usage/cost/ledger attribution to existing reporting contract | Actual vs estimated vs missing distinct; no raw prompt in Finance | Partial: safe ledger evidence stored; Finance screen adapter pending P3 |

Run `pricing`, `lifecycle`, `recovery`. Stop rollout on financial/authorization
failure even when UI appears functional. Do not claim full Finance production
reporting or publish/schedule implementation; FIN-009 still owns those dependencies.

## Stage 3: API, Artifact And Image Handoff

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| A3.1 | Add thin estimate/execute/read adapters with request validation | Dedicated exposure + actor checks; no-store/private errors | Implemented / verified below |
| A3.2 | Remove only duplicate Look Sheet preview route while editing owner | One handler, old preview semantics retained | Implemented / verified below |
| A3.3 | Add typed Generation API/Zod boundaries | No trusted client rate, provider config or final prompt override | Implemented / verified below |
| A3.4 | Resolve selected artifact server-side during quote/Generate | Foreign/stale/unsettled/revoked artifacts rejected | Implemented / verified below |
| A3.5 | Bind artifact/effective-prompt identity into image quote parity | Form/default/identity/recipe changes invalidate correctly | Implemented / verified below |
| A3.6 | Disable second automatic refinement for accepted Look Sheet artifact | Exactly zero text calls when generating/retrying from valid artifact | Implemented / verified below |
| A3.7 | Carry accepted artifact/brief into Job/History/export metadata | Old result Download uses its own accepted fields | Implemented / verified below |
| A3.8 | Status/reload capability integrates with canonical state owner | Bounded queries; actor/mode switch isolates late responses | Implemented / verified below |

Run `api`, `integration`, `privacy`; keep old image/video/Template contracts covered.

## Stage 4: UX/UI Implementation

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| U4.1 | Shared identity block and prominent Character Prompt textarea | Name/age/picker existing locks; clear visual hierarchy | Implemented / verified below |
| U4.2 | Secondary situation/outfit/personality layout | All data available; no working controls removed | Implemented / verified below |
| U4.3 | Controlled Momelo Enhancement switch and priced Enhance action | Toggle/edit never calls AI; unavailable price not actionable | Implemented / verified below |
| U4.4 | Wire explicit consent, pending and duplicate prevention | One user action per quoted purchase; source text preserved | Implemented / verified below |
| U4.5 | Original/Enhanced read-only review and stale state | No silent overwrite; Generate requires matching artifact when ON | Implemented / verified below |
| U4.6 | Errors, insufficient balance, quote expiry and refund-pending states | Explicit retry only; no false success/refund promise | Implemented / verified below |
| U4.7 | EN/TH keys, live status, focus, icons and theme tokens | Locale parity; keyboard access; no hidden instructions required | Implemented / verified below |
| U4.8 | Playground-only exposure and shared Studio visual regression | No global realism/refine enablement or second Studio fee | Implemented / verified below |

Run `ui` and `types`, then fixture layouts individually. Protect existing result,
engine, quote, Generate, Character selection and Download sibling areas.

## Stage 5: Review And Controlled Release

| Task | Deliverable / owner | Exit check | Status |
|---|---|---|---|
| V5.1 | Run short groups and store evidence per task | Failing groups stop aggregate; no placeholder passes | Implemented / verified below |
| V5.2 | Browser screenshots 390/820/1440, EN/TH, three themes | Prompt/price/control bounds, no overflow, old Studio unaffected | Implemented / verified below |
| V5.3 | Commercial/Backend/UX/QA scoped review | Financial, privacy and shared UI gates passed | Implemented / verified below |
| V5.4 | Documentation-only manual UAT cases prepared | Minimum paid calls, expected charges/outcomes clear | Implemented / verified below |
| V5.5 | Owner-approved live UAT later | Real model rewrite coverage/latency and one optional image validated | Pending explicit paid test instruction |
| V5.6 | Final status, compatibility and rollback record | Unverified provider/production gaps remain explicit | Implemented / verified below |

## Focused Runner Plan

Extend existing `scripts/test-look-sheet-exports.mjs` without widening its current
baseline `all` unexpectedly. Add prefixed selectable `enhancement-*` groups and
one explicit `enhancement-all` aggregate for deterministic checks. UI fixture
checks use `scripts/verify-look-sheet-exports.mjs` or a small owning extension;
`enhancement-layout` remains explicitly invoked with an existing dev server.
Runner groups listed below are now implemented except `enhancement-layout`, which is an explicit browser script command.

| Group | Minimum evidence |
|---|---|
| enhancement-definition | Empty/max/overflow/Unicode/default/age-range/outfit lock; old draft migration |
| enhancement-prompt | All fields/defaults; realism scoping; identity/style/layout conflicts; refusal/invalid output |
| enhancement-pricing | Configured fixed/token fixtures; missing rates; inactive versions; rounding/ceiling; no invented fee |
| enhancement-lifecycle | Reserve-before-provider; insufficient balance; same/different-key replay; success/failure/capture/refund |
| enhancement-recovery | Multi-tab concurrency; timeout/crash points; durable replay; no orphan misclassification |
| enhancement-api | Server gates, actor access, request/response validation and status replay |
| enhancement-integration | Quote/Generate fingerprint parity; stale result; no second refine; History/export snapshot |
| enhancement-privacy | Foreign ID denial, private references, sanitized logs, no public auto-disclosure |
| enhancement-ui | Toggle/typing no spend; consent/price; stale/error/refund states; actor switch/reload |
| enhancement-compatibility | Old Prompt Refine fallback, ordinary image, Studio, Scene, Template, Comparison, Video/export |
| enhancement-types | TypeScript and enabled locale key/interpolation parity |
| enhancement-layout | Playground and Studio separately; mobile/tablet/desktop; long Thai and pending/error states |

Commands: `node scripts/test-look-sheet-exports.mjs enhancement-pricing`
and `node scripts/test-look-sheet-exports.mjs enhancement-all`. Document fixtures,
prerequisites and exact implemented groups when adding them; unknown group fails.
Tests use injected providers and temporary repositories. No live JSON modification,
paid AI, model activation, worker restart or automatic build inside aggregate runs.

## Pending Register

| Gate | State / why | Unblocks when |
|---|---|---|
| G1 active text-rate mapping | Verified, scoped rate authorized | Luna rate and whole-Credit fixed fee implemented; review by 2026-10-08 |
| G2 durable text recovery | Verified in isolated JSON single-writer tests | Multi-process production transactions remain pending DB work |
| G3 token partial settlement | Not needed for authorized fixed-service fee | Future token-actual billing needs separate partial-capture work |
| G4 retention/status limits | Implemented: 30-day artifact, 5,000-record cap, explicit status reads | Archive policy required before capacity expansion |
| G5 paid provider UAT | Not authorized by documentation request | User explicitly schedules minimum paid test after implementation |
| P1 GPU/pixel enhancement and upscaling | Not this feature | Separate Post Processing requirement |
| P2 paid Studio/Scene/general-image expansion | Not first rollout | Separate surface authorization and compatibility/consent tests |
| P3 full Finance publication/reporting/DB/Auth | Existing large dependency, not silently pulled into this work | Owning commercial/backend production gates |

## Implementation Evidence

2026-09-08: implementation authorized; later user approval resolved G1 with a
rate-derived fixed service fee. Source and policy details are in 014. Earlier
missing-price observations were the baseline, not the current execution status.

- G0 / C2: Generation facade, private repository, Credits-owned rate/reserve/
  capture/refund and startup recovery are implemented. No second wallet or fake
  image Job. Quote ID is the idempotency key; same-key replay never redispatches.
- D1: 2,000-code-point appearance, 24 KiB definition limit, backward-compatible
  draft-v1 extension (old fields and approved selection preserved, toggle OFF),
  complete canonical brief, shared realism, structured coverage and conflict guards.
- A3: thin private routes, one preview registration, Zod boundary, authorized
  artifact resolution and changed image-quote fingerprint. Regression fixed:
  selected Character identity must participate in both quote and resolve prompts.
- U4: identity/picker grouping, larger prompt, compact secondary fields, opt-in
  quote/confirmation, read-only Original/Enhanced, source preservation, explicit
  status recovery and actor-scoped operation draft. No new Studio paid control.
- V5: sequential Product/Backend/Commercial/UX/QA review applied by one agent;
  review independence is limited. No claim of independent subagent approval.

### Automated Checks

- `node scripts/test-look-sheet-exports.mjs enhancement-all`: definition,
  pricing, prompt, lifecycle, recovery, privacy, integration, API, provider, UI,
  compatibility and TypeScript groups. Injected provider and temp wallet only.
- `node scripts/test-look-sheet-exports.mjs compatibility-ui`: 27 existing
  EngineTargetPanel/Studio workspace/GenerationResult/API tests passed.
- `node --test test/lookSheetEnhancement.test.js`: 16 focused cases passed,
  including concurrent replay, insufficient funds, bad output, capture/refund
  retry, interrupted acceptance, foreign/stale/expired artifacts, selected identity,
  output request contract and locale/placeholder parity.
- `node scripts/verify-look-sheet-exports.mjs enhancement`: EN/TH,
  390/820/1440px, default/fashion/creative themes; fixed-price confirmation,
  reload with no second call, source unchanged, textarea height and no overflow.
- `node scripts/verify-look-sheet-exports.mjs playground` and `studio`:
  EN/TH at 390/820/1440px; Studio has no paid Enhancement switch.
- `git diff --check` passed. No generated image/video, live data change,
  paid provider call, worker restart or built `web/dist` overwrite.

Browser fixture source server: http://127.0.0.1:5173.
Screenshot evidence (temporary local folders):
`mpf-look-sheet-enhancement-cNXXee`, `mpf-look-sheet-playground-eDaNgA`,
`mpf-look-sheet-studio-r7p9hz` under the Windows temp directory.
Source API changes and cached pricing need the normal dev-server restart before
live UAT; do not restart an active paid worker as part of an automated test.

### Minimal Manual UAT (Not Executed)

1. Restart the development stack when current jobs have finished. Open Playground
   > Image > Character Look Sheet. Fill name, age, Character Prompt and situation.
   Defaults for outfit/personality must appear and reach the original preview.
2. Enable Momelo Enhancement: no Credit change. Get price: still no AI purchase.
   Record the quoted fixed fee; do not assume it is always one or two Credits.
3. Confirm exactly once. Verify one text reservation/capture, completed prompt,
   all six fields, age/style/outfit consistency and usable Enhanced review.
4. Reload and reuse the accepted prompt for at most one optional image generation.
   Verify only the image fee is added and no second text call occurs.
5. Edit age or Character selection. Old enhancement must not become the active
   image prompt. Turning enhancement OFF still permits ordinary original generation.
   Failure/concurrency/refund testing stays in isolated automated fixtures.

### Remaining Release Risks

- No real provider rewrite/latency/visual quality qualification yet. Coverage and
  explicit contradiction guards are not full semantic proof; retained canonical
  identity/layout is authoritative, and visual age remains probabilistic.
- Existing JSON wallets/records require one API writer. Multi-process database
  transactions, distributed locking and archival are not claimed production-ready.
- C2.10/P3: safe cost and usage evidence is stored on text settlement entries;
  the full Finance AI-text cost-screen projection remains a separate adapter task.
- Fixed-service fee uses a conservative byte/token upper budget; real usage is
  retained separately. Review the model rate by 2026-10-08. Disabled/unpriced
  models must not fall back to an invented fee or free paid-provider call.
