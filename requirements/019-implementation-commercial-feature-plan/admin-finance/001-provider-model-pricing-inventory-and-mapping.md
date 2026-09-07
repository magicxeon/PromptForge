# FIN-001 Provider Model Inventory And Data Mapping

**Status:** Planned; source baseline inspected 2026-09-07

## 1. Current Source Baseline

| Existing source | Current information | Missing Finance contract |
|---|---|---|
| `server/config/credit-pricing-policy.json` | policyVersion/effectiveAt, FX, buffer, margin, Credit denomination/rounding, model costs and published Credit tables | Revision history and scheduled resolver; evidence/coverage by exact billable dimensions |
| `server/domain/credits/CreditPricingPolicyService.js` | Model lookup, quality/resolution/reference/output/Template breakdown; cached policy and quote expiry/version | Controlled snapshot injection/invalidation, not another calculator |
| `server/config/cinematic-video-models.json` | Video rate versions, output-second/token metrics, audio/resolution/input modes and qualification | Reuse versioned rate adopter; do not conflate qualification with priced state |
| `server/domain/credits/VideoPricingCalculator.js` | Video cost preview, FX/buffer/margin/rounding | Pin inputs and distinguish token estimates from provider billing evidence |
| `server/providers/ProviderRegistry.js`, `server/domain/generation/VideoCapabilityRegistry.js` | Canonical image/video catalogs | Joined coverage with rates, not a hard-coded Finance model list |
| `server/domain/admin-configuration/ProviderControlApplicationService.js` | Image/video/AI-text workflow inventory and runtime controls | Reuse/extend its inventory boundary; do not add a second availability policy |
| `server/domain/generation/PromptRefinementService.js` and configured AI authoring policies | Some sanitized token usage and routed model identity | Inventory all actual calls, account/service tiers, fallbacks and missing usage |
| `server/repositories/credits/CreditAccountRepository.js`, `CreditLedgerRepository.js` in the same directory | Estimates, reservations, pricing snapshots and ledger history | Cost/usage evidence linkage; Credits are not provider invoices |
| `server/domain/generation/QueueManager.js`, `VideoProviderTaskService.js` | Some result usage and provider task/attempt state | Complete attempt-level cost events, including failures/retries |

The image estimator currently selects published Credit tables. Its minimum
retail floor helper is not proof that editing `providerCostUsd` recalculates all
quotes. `effectiveAt` is metadata in the inspected image policy, not a durable
scheduler. Some source notes are historical; notes must not override catalog
capabilities, qualification or accepted Muse availability.

## 2. Inventory Output Before Coding

Produce a read-only manifest for every provider/model/operation with:

- source owner and file/config revision, stable IDs, account/region/service
  tier where pricing differs, and supported workflows;
- billing dimensions, units, source evidence/date and coverage status;
- cost estimator, retail calculator, quote consumer, dispatch consumer and
  usage/settlement writer; whether it is customer-funded or internal/unpriced;
- available historical fields and missing links; immutable source hashes and
  row counts for later import, not raw prompts, keys or references.
- supplier account/service/model binding, funding pools, evidenced billing mode,
  shared-balance scope, opening balances and external statement coverage from
  FIN-006. Seedance/Seedream may share a provider ID but need different terms.

Coverage states: priced with reviewed evidence, provisional, unpriced,
unsupported and retired. Also expose missing usage and unreconciled costs.
Disabled/retired models stay discoverable for past expenditure. A newly added
model appears as unpriced, not free and not automatically enabled. Registry-only
and rate-only historical entries must both be accounted for.

## 3. Exact Rate Key And Numeric Contract

Use stable provider/model/operation IDs plus the applicable currency, account/
region/service tier and validated billing dimensions. Model aliases require an
explicit mapping; never infer by display name or wildcard string similarity.

Supported adapters may price returned images, requested operations, output
seconds, input/cached-input/output/completion tokens, reference inputs and tools.
Each rule defines unit quantity/divisor, minimum/step rounding, free/bundled
units and dimensions such as resolution, quality, audio and reference mode.
Do not bill bundled tokens/search twice for a per-image product. Tiered or
unmodeled provider contracts remain provisional until implemented and tested.

Credits stay integer units. Financial unit rates and FX use explicit fixed
decimal precision/scale and serialized decimal values, never binary-float or
rounded-to-cents storage that loses sub-cent AI costs. Payment settlement uses
its owning currency/minor-unit contract. All currency conversion records the
source/target currency, direction, rate version, as-of time and rounding rule.

## 4. Target Logical Mapping (DDL Pending)

| Source/current concept | Target responsibility | Key integrity requirement |
|---|---|---|
| Static pricing/video config | Existing planned runtime_configuration revisions/publications/schedules | Import immutable bootstrap with original source fingerprint |
| Provider cost rule | Version-owned provider rate entries/dimensions/evidence | Unique exact key per effective scope; history retained |
| Published Credits/reference pricing/FX/buffer/margin | Version-owned retail and FX policy entries | Preserve original tables/calculator modes; no forced global formula |
| Existing estimate/pricingSnapshot | Existing quote snapshot extension | Pin retail, quoted cost, FX, calculator, policy and input fingerprints |
| Provider attempt and sanitized usage | Proposed Finance cost observation/evidence records | Unique source-event identity; usage linked to actual provider/model and attempt |
| Ledger/reservation/template allocation | References to owning Credit records | Read only through Credits contract; never copy a mutable balance authority |
| Provider bill/manual adjustment evidence | Proposed cost reconciliation and adjustment events | Append-only history, expected version, idempotency and reason |
| Finance totals | Rebuildable bounded read models | Same filter/as-of/evidence basis as detail rows |
| Supplier account/funding/statement evidence | FIN-006 accounts, agreement bindings, pools, cash events and settlement allocation | No balance duplication per model; funding is not another usage expense |
| Month/year management summaries | FIN-007 period projections/export snapshots | Distinct cash/usage dates, annual flow sums and opening/closing balances |

Do not create a second runtime-configuration revision table under Finance.
Use bounded payloads for approved policy snapshots, but normalize queryable
ownership, state, monetary amounts and relationships. Raw media belongs in
authorized object storage, not these tables.

## 5. Initialization And Historical Import

1. Import current static policy exactly as the initial active baseline with
   its existing source version. Bootstrap is idempotent by scope/source hash.
2. Preserve original quote/ledger/entity IDs and amounts, including legacy
   unknown version markers. Never replay paid jobs to obtain missing history.
3. Link history only when evidence identifies the original rule/usage. Current
   rates are not retroactive historical truth; a what-if calculation is separate.
4. Seed system permissions/configuration independently from production history
   and dev fixtures. Never seed fake purchases or provider invoices.
5. Dry-run report: coverage, duplicates, orphans, conflicting dimensions,
   missing usage and unchanged Credit totals. Unknowns stay visible.
6. Import opening supplier balances/payables only with their as-of evidence;
   they are not current-period top-up income or usage. Reconcile external and
   outside-app movements explicitly; user-reported modes are draft candidates.

## 6. Acceptance

- `FIN-MAP-01`: all canonical image/video/AI-text consumers have a mapped row
  or explicit unpriced gap, including hidden internal work.
- `FIN-MAP-02`: model/capability IDs come from canonical owners; no Finance
  setting enables provider access or bypasses master controls.
- `FIN-MAP-03`: bootstrap rerun changes no existing quote/ledger and creates
  no duplicate rates or cost events.
- `FIN-MAP-04`: sample quotes match the existing calculators exactly before
  cutover across supported dimensions and Template/reference fees.
- `FIN-MAP-05`: historical missing rates/usage and decimal precision loss are
  detected, never silently coerced to zero or current-price history.
