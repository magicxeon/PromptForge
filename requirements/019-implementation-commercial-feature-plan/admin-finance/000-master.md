# Admin Finance MVP Master

**Status:** Local Finance delivery implemented and verified in FIN-008.
Production activation and actual-money reporting remain pending FIN-009.

Monthly/yearly Excel export of the current partial report is owned by
[FIN-010](010-monthly-yearly-excel-export.md). It preserves missing-money evidence,
selected filters and the report snapshot without changing financial state.

**Updated:** 2026-09-07

**Primary role:** Product And Requirement Architect

**Reviewers:** Backend Platform Architect, QA And Release Engineer; sequential
review, not independent certification. Commercial integrity is a mandatory
design gate through the commercial charter and `review-commercial-integrity`.

## 1. Outcome

Admin can explain expenditure by provider/model/workflow and trace it to the
Credits charged, prepare rate changes with explicit versions, and publish now
or schedule a future effective date without rewriting history. Finance is an
operational workspace, not a second pricing calculator, wallet or provider UI.

The user authorized implementation on 2026-09-07. This does not authorize paid
requests, new live prices, automatic repricing or cloud purchases. Execute the
[detailed delivery plan](008-execution-tasks-and-flow-review.md); production
publication remains dependent on the DB/Auth gates below.

## 2. Scope

- Inventory every configured image, video and AI-text operation, including
  internal preparation/refinement/authoring calls and disabled models.
- Provider expense rates, retail Credit policy and FX assumptions with separate
  version identities and immutable publication history.
- Manual and scheduled activation through Backend Requirement 018-010.
- Costs, Credit movements, internal/test spending and completeness reporting.
- Monthly/yearly/YTD summaries separating customer cash receipts, supplier cash
  payments, generation usage costs and period-end funding/payable balances.
- Versioned supplier billing accounts/service bindings supporting prepaid,
  postpaid and evidenced hybrid arrangements without changing retail Credits.
- Drilldown from totals to usage/attempt, Job/Task, quote/reservation/ledger and
  source rate evidence, without revealing private media or prompts by default.
- Management views for receipts/refunds/fees when authoritative sources exist;
  show unavailable states before Payments is implemented.

Not in this delivery: checkout, subscriptions, tax filings/statutory accounting,
creator payouts, automatic invoice scraping, unrestricted database editing,
Support financial grants, or enabling unlimited Admin generation. Admin expense
classification is designed here; a new staff-funded execution mode needs its
own Credits/Generation authorization before activation.
Recording supplier funding or auto-reload settings does not authorize top-ups,
external billing-plan changes or automatic cash movement. Balance sync is
optional only through a documented permitted integration; manual evidence is
supported without assuming every provider has a balance API.

## 3. Requirement Parts

| Requirement | Responsibility | Status |
|---|---|---|
| [001 Inventory And Mapping](001-provider-model-pricing-inventory-and-mapping.md) | Existing sources, coverage, normalized rate/data mapping | Planned |
| [002 Versioned Rates](002-versioned-rates-and-scheduled-publication.md) | Dates, revisions, future activation, immutable quote protection | Planned |
| [003 Cost And Credit Attribution](003-cost-credit-attribution-and-reconciliation.md) | Cost evidence, units, reconciliation and safe totals | Planned |
| [004 Admin Workspace](004-admin-finance-workspace-and-permissions.md) | Screens, permissions, API and responsive states | Planned |
| [005 Delivery And Tests](005-implementation-and-focused-verification.md) | Ordered tasks, migration gates, isolated tests and aggregate runner | Planned |
| [006 Provider Funding](006-provider-billing-accounts-and-funding.md) | Billing accounts, prepaid/postpaid/hybrid terms, balances and settlement evidence | Planned |
| [007 Period Reports](007-monthly-yearly-generation-finance-reports.md) | Monthly/yearly cash, generation usage and funding reports | Planned |
| [008 Execution And Evidence](008-execution-tasks-and-flow-review.md) | Local inventory, Credit reports and typed planning drafts | Local slice verified |
| [009 Production Dependencies](009-production-dependency-implementation-plan.md) | Detailed DB/Auth, cost capture, funding and complete report tasks | Pending |

## 4. One Owner Per Responsibility

| Responsibility | Owner |
|---|---|
| Provider/model IDs, capabilities, qualification, master disable | Existing provider catalog and Admin Configuration availability policy |
| Draft/revision/schedule/publication/Audit lifecycle | Admin Configuration, [018-010](../../018-implementation-backend/010-versioned-runtime-configuration-and-video-rate-cards.md) |
| Customer quote, Credit conversion, reservation/capture/refund | Existing Credits domain and its canonical application facade |
| Actual call/attempt identity, sanitized usage and terminal state | Owning Generation/AI workflow; Finance does not call providers |
| Expense evidence, supplier funding/cash records and reporting projection | Proposed Finance capability; no parallel customer Credit wallet or payment execution |
| Supplier agreement/binding draft and future version activation | Shared Admin Configuration lifecycle; Finance validates terms and consumes the published metadata |
| Purchases/payment receipts/refunds | Future Payments under Phase2-08; no invented payment rows |
| Staff permission/Audit and recovery | Identity/Admin/Audit plus Backend 018 command matrix |

Proposed placement, not existing code: `server/domain/finance/`,
`server/repositories/finance/`, HTTP adapter under `server/app/routes/`, and
the Finance workspace under `web/src/features/admin/`. Schema and any local
development data paths must be registered in `server/config/paths.js` during
implementation; no root-level files or generic JSON editor.

## 5. Product Rules

1. Editing provider cost does not automatically change customer Credits.
2. Historical accepted prices, reservations and settlements are immutable.
3. Provider expenditure and customer refunds are independent: refunded work
   can still cost the platform money.
4. Missing usage/rates/invoices are unknown, not zero expenditure.
5. Finance coverage does not enable an unsupported/disabled provider/model.
6. Future publication is not a browser timer or editing a static file.
7. Existing local workflows and accepted prices remain unchanged until an
   explicit parity-verified consumer cutover and authorized publication.
8. Financial production publication requires trusted staff identity, durable
   configuration/Audit and transactional activation. A read-only development
   preview may precede DB/Auth, but does not waive those production gates.
9. Supplier top-up/payment and generation usage are separate facts, not two
   expenses for the same consumed service. Annual balances are not monthly sums.
10. Billing mode is account/service/model-binding configuration, not a hard-coded
    property of a provider name. User-reported account modes need evidence before
    activation; a configured future switch does not perform the external switch.

## 6. Open Decisions Before Relevant Implementation

- Confirm reporting currency/timezone defaults (existing pricing uses THB/USD;
  display may propose THB and Asia/Bangkok without inventing a new FX rate).
- Confirm staff publication/approval grants and financial risk thresholds.
  Until resolved, Support cannot publish or adjust rates.
- Approve source evidence, billing units and effective terms for each rate;
  this requirement copies no current web pricing into production.
- Choose invoice reconciliation/manual evidence workflow and retention/access
  policy before accepting financial evidence uploads.
- Confirm any overhead allocation and realized revenue/margin policy before
  labeling a chart as profit. Credit denomination is not cash received.
- Confirm account/service bindings, externally announced cutover dates, funded
  lot eligibility/expiry/consumption rules and imported opening balances before
  supplier settlement or historical period reports are marked reconciled.
- Confirm period defaults and any generation-revenue/paid-Credit allocation
  policy. Calendar year management summaries do not imply statutory closing.

## 7. Completion Gate

Requirement completion is not feature completion. Implementation closes only
with the acceptance IDs in 001-007, protected quote parity, permission tests,
durable schedule/restart proof, evidence-aware reporting and scoped UI checks.
There is no need to resolve BytePlus video generation to deliver the image/text
Finance slice; video inventory can remain read-only/unqualified.
