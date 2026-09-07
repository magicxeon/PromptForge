# FIN-005 Implementation Plan And Focused Verification

**Status:** Partially implemented; local read workspace and planning drafts.
Execution details/evidence are in FIN-008; production dependencies are in FIN-009.

## 1. Delivery Order

Each row is a separate task boundary. Read the owner, implement, run its focused
checks and record evidence before advancing. Do not mark rows complete from
this plan or from existing unrelated test success.

| Step | Deliverable | Dependency / verification |
|---|---|---|
| F01 | Read-only provider/model/caller/rate/usage inventory and source hashes | FIN-001; exact coverage and missing-source fixture |
| F02 | Logical schema, event IDs, precision, scope and permission mapping | F01; Backend/commercial review, no speculative full DB migration |
| F02A | Supplier account/pool/terms inventory and period/FX basis | FIN-006/007; shared-account and mode-change mapping, approved opening balances |
| F03 | Cost/read projection from available legacy evidence | F02; historical unknowns, duplicate/partial results and totals vs detail |
| F03A | Monthly/yearly cash, usage and balance projections | F03/F02A; missing-source states, no top-up/usage double count, annual reconciliation |
| F04 | Read-only Admin Finance overview/coverage/usage view | F03; permission/API schema, isolated UI and responsive checks |
| F04A | Period report and supplier account read views | F03A; date/basis filters, statements/as-of and permission-aware export |
| F05 | Shared Admin Configuration revision/validation/bootstrap adapter | F02; existing static quote parity, immutable source IDs and no live price change |
| F06 | Durable manual publication and coherent pricing consumers | F05 plus DB/Auth/Audit; atomic snapshot, stale edit, quote pinning and cache convergence |
| F07 | Rate draft/diff/manual-publish UI | F06; cost-only vs retail-change preview, denied actions and current layout preservation |
| F08 | Future schedule/cancel/rollback through shared publisher | F06; UTC boundaries, delayed activation, restart, race and duplicate delivery |
| F09 | Durable usage/cost observation capture for missing workflow sources | F02 plus owning workflow event contracts; replay without changing Job or Credit outcomes |
| F10 | Reconciliation evidence and complete internal-expense attribution | F09; permission, append-only corrections, unallocated invoice handling |
| F10A | Supplier funding/cash evidence and settlement reconciliation | F02A/F10; duplicate import, pack units/expiry, partial invoices and outside-app usage |
| F10B | Versioned prepaid/postpaid service bindings and future transitions | F06/F08/F10A; preserved old obligations/funds, external confirmation, no provider-side mutation |
| F11 | Enable adopter scopes individually after parity/reconciliation | F06-F10B plus F04A; focused integration and explicit UAT approval |

F03/F04 may expose existing local data as an explicitly incomplete development
report before DB/Auth. They must not claim actual-cost completeness or enable
financial mutation. F09 can be prioritized before F04 if inventory shows that
existing evidence cannot support a useful report; record that decision first.
The same applies to F03A/F04A: monthly/yearly views can show available history
and explicit gaps before Payments, but do not invent receipts or actual revenue.

Production scheduled publication does not ship on JSON or process timers. Avoid
building a second credential/rate-history implementation on JSON simply to make
the page appear complete. Migrate the shared publication infrastructure with
Phase2-03; no broad application migration is hidden in the Finance UI task.

## 2. Ownership And Files

Planned runtime locations (not created by this requirement):

```text
server/domain/finance/FinanceApplicationService.js
server/domain/finance/                    focused internal cost/read services
server/repositories/finance/              cost evidence/reconciliation adapters
server/app/routes/adminFinanceRoutes.js
web/src/features/admin/routes/           Finance route composition
web/src/features/admin/components/       focused Finance presentation
web/src/features/admin/api/ and schemas/  typed boundaries
client/i18n/locales/<locale>/admin.json    existing namespace
test/ and test/fixtures/                  isolated owner fixtures
scripts/test-admin-finance.bat            planned selectable/aggregate runner
```

Rate storage/publication remains under `server/domain/admin-configuration/`
and its repositories per 018-010. Retail evaluation stays in existing Credits
services. Caller telemetry must enter the Finance facade, not write its repo
directly. Register new configuration/storage paths in canonical path ownership
when implemented; proposed Finance tables enter Phase2-03's reviewed wave map.

## 3. Focused Test Groups

Implemented runner commands (no live mutations or paid requests):

```bat
scripts\test-admin-finance.bat inventory
scripts\test-admin-finance.bat pricing
scripts\test-admin-finance.bat drafts
scripts\test-admin-finance.bat periods
scripts\test-admin-finance.bat permissions
scripts\test-admin-finance.bat ui
scripts\test-admin-finance.bat types
scripts\test-admin-finance.bat all
```

Publication, schedule, actual costs and funding groups remain unimplemented and
return failure when requested. `all` covers the implemented slice only, not the
complete production gate described below. `periods` currently tests Credit
history and explicit unavailable monetary sources, not cash/funding aggregation.
For browser evidence, start Vite then run
`node scripts/verify-admin-finance-layout.mjs`. It intercepts all API requests,
reads sanitized local Finance sources, writes drafts only in its temporary
fixture store, and blocks unexpected requests. It never starts the backend.

The single runner dispatches named short groups and explicit `all`, returns
nonzero for failure/unknown group/missing required tests, and reports the failing
group. Existing test owners and runners are reused rather than duplicated.
`all` is for requested integration/UAT/pre-production validation, not every edit.

| Group | Acceptance coverage and minimum cases |
|---|---|
| inventory | FIN-MAP-01/02/03/05; unmapped model/caller, retired model, source hash rerun, orphan/missing data |
| pricing | FIN-MAP-04, FIN-RATE-01/04; exact existing Credit parity, sub-cent precision, fixed tables/formula, reference/Template fees, Comparison slots and video dimensions |
| publication | FIN-RATE-06/07; draft isolation, stale editor, invalid dependency, atomic Audit/activation, old quote and rollback |
| schedule | FIN-RATE-02/03/05; timezone/exact boundary, competing schedule/manual publish, cancel, crash before/after commit, duplicate delivery, due-but-delayed resolution |
| costs | FIN-COST-01 through 07; partial outputs, failed/refunded cost, bundled search, token categories, actual fallback model, evidence upgrades, duplicate projection and unavailable profit |
| funding | FIN-FUND-01 through 07; shared/mixed billing scope, prepaid/postpaid/hybrid, pack units/expiry, negative/stale balances, outside-app usage, duplicate cash evidence and scheduled transition |
| periods | FIN-PERIOD-01 through 06; synthetic Jan/Feb cash-vs-usage cases, annual flow/balance reconciliation, timezone/year/leap boundaries, late evidence, missing income and safe CSV |
| permissions | FIN-UI-03 plus FIN-RATE-06; user/support/admin grants, direct API attack, stale approval, no cost leak or self-approval bypass |
| ui | FIN-UI-01/02/04/05/06; totals/detail and period/funding filters, version dates, unavailable sources, dirty/error states, mobile/tablet/desktop, themes/i18n and neighboring Admin actions |

Existing anchors to inspect/extend: `test/creditPricingPolicy.test.js`,
`test/creditEstimateGenerationParity.test.js`,
`test/creditComparisonBilling.test.js`, `test/providerControlRepository.test.js`,
`test/providerAvailabilityPolicy.test.js`, `test/videoProviderTaskService.test.js`
and `web/src/features/admin/routes/AdminRoute.test.tsx`. Their presence is not
an execution/pass claim for this task.

## 4. Test Safety And UAT

- Unit tests use fake time/providers and bounded fixtures. Integration uses an
  isolated disposable DB/schema, never live JSON, user media or production DB.
- No provider/payment request, worker restart or production rate activation is
  hidden in a test runner. Paid/live UAT requires separate approval.
- Mock quote/cost schedules may use synthetic rates explicitly labeled test
  data; never copy them into bootstrap/live policy.
- UAT checks: read one evidenced cost, inspect unknown historical costs, draft
  a cost-only change, compare unchanged Credits, separately preview retail
  change, schedule/cancel, test old quote at a version boundary, confirm history
  and permission denial. No generated media is needed for these checks.
- Period/funding UAT uses synthetic top-up/usage/invoice fixtures, a mid-period
  service billing-mode switch and one shared supplier pool across models. Compare
  month/year totals to cash/usage/closing balances and test late corrections.
  Never actually purchase provider credits or change its billing plan in tests.

## 5. Migration, Rollout And Rollback

Inventory -> backup -> deterministic bootstrap/dry-run -> unchanged quote
parity -> read-only shadow comparison -> owner-controlled adapter switch ->
manual publication -> durable scheduler -> per-scope observation. No permanent
dual write and no editing static JSON as the live Finance editor.

Cost/usage coverage rolls out by actual caller, not just by visible page. Missing
collectors remain visible as gaps. BytePlus qualification is not a prerequisite
for image/text Finance; no provider substitution or video regeneration.

Before authoritative DB writes, adapter rollback may restore the validated
baseline. After financial/publication writes, preserve durable history and fix
forward with compatible code/migrations; never restore stale JSON prices or
balances. A rate rollback is a new publication; a cost correction is new evidence.

## 6. Review And Completion Record

FIN-010 adds `node scripts/test-admin-finance.mjs export` for the current partial
report XLSX contract, also included in `all`. The separate `export-layout` group
checks only the Reports screen and browser downloads against intercepted local
read-only Finance data; it requires Vite on 127.0.0.1:5173 (override with
FINANCE_LAYOUT_ORIGIN). It does not require starting the provider Job runtime.
Full financial-source export certification remains gated by FIN-009.

Before implementation: primary owner, Backend/commercial/security contract
review. Add QA for financial integration and UX review before the material UI
change; apply required roles sequentially when independent reviewers are absent.
Generation Workflow Skill is mandatory when adding cost-event capture across
lifecycle stages or touching quote/dispatch/settlement. Do not use reporting as
permission to refactor the provider, reference or Credit pipeline.

Record task, files, source revision, test command/result, unknowns, migration
reconciliation and manual viewport evidence in FIN-008. The original
requirement-only validation is superseded by that implementation evidence; it
does not certify pending production publication or complete financial reporting.
