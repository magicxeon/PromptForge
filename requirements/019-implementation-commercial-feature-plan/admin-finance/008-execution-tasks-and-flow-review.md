# FIN-008 Execution Tasks And Flow Review

Updated: 2026-09-07. Primary: Commercial Financial Integrity. Backend and QA
review sequentially; UX review before the screen verification. Review is not
independent certification. Skills: review-commercial-integrity,
review-product-ux, verify-release-regressions. No Generation mutation is owned
by this delivery.

## 1. Reconciled Scope

Inspection confirms JSON Credits and mock actor identity, an existing
AdminConfigurationService draft facade, and an explicitly unimplemented
publisher. Do not create a second publisher, claim a future draft is scheduled,
or enable production Finance through an environment override. First delivery
provides a usable local Finance read workspace and typed planning drafts.
Production publication, automatic cost capture and supplier money-entry remain
open dependencies, not completed features.

No existing generation button, price, provider selection, settlement, or sibling
Admin screen changes. No new runtime Finance database or wallet. Drafts use the
existing Admin Configuration repository and audit owner. No credentials, media,
prompts, or arbitrary JSON editor in Finance.

## 2. Ordered Tasks

| Task | Files / owner | Verification | Status |
|---|---|---|---|
| E01.1 | Inventory current policy, video rates, provider catalog and Credits event fields | No inferred actual cost or payment | Reviewed |
| E01.2 | Add non-mutating Credits reporting read; whitelist fields, preserve source hash and schema gaps | Missing file, old schema, secrets, no migration/write | Verified (local slice) |
| E01.3 | Finance inventory joins configured AND rate-only models; exact source rate/retail dimensions | Missing AI-text rates, disabled/retired coverage | Verified (local slice) |
| E02.1 | Finance period projection: Bangkok calendar year/month, captures/refunds separately, dedupe, bounded page | Year boundary, duplicate ID, unknown vs zero, totals/page parity | Verified (local slice) |
| E02.2 | Expose unavailable cash/cost/profit/funding explicitly; never reprice historical work | No top-up as cost or Credits as receipts | Verified (local slice) |
| E02.3 | Pin as-of and source fingerprint across pages; reject stale snapshot rather than mix reports | Changed source and future range | Verified (local slice) |
| E03.1 | Typed provider cost and supplier agreement planning drafts in shared configuration | Decimal strings, dates, IDs, reason, no secrets, no live changes | Verified (local slice) |
| E03.2 | Admin-only local access and draft commands; production hard gate pending trusted identity | User/support/direct API denied; env cannot enable publication | Verified (local slice) |
| E04.1 | Admin Finance route/nav, actor-scoped queries and Zod boundary | Admin nav preserved, unauthorized no fetch | Verified (local slice) |
| E04.2 | Overview/monthly-yearly table and Credit-event drilldown with same filters | Loading/error/retry/empty/partial/pagination | Verified (local slice) |
| E04.3 | Rates searchable by provider/model/media; inspect unit/dimensions and current version | No frontend rate table or FX calculator | Verified (local slice) |
| E04.4 | Draft form with current vs proposed cost, announcement/intended date, history; billing mode account/service form | Save/error states; future date labeled draft, not scheduled | Verified (local slice) |
| E04.5 | Theme tokens, EN/TH parity, keyboard, 390/820/1440 screenshots | No page overflow; no sibling restyle | Verified (local slice) |
| E05.1 | Small isolated test groups plus scripts/test-admin-finance runner | Explicit aggregate, no live writes/paid calls | Verified (local slice) |
| E05.2 | Requirements evidence and remaining gap audit | Do not close FIN-001..007 wholesale | Verified (local slice) |

## 3. User Flows

### Incremental Verification Record

- E01.1-E01.3 complete for existing catalog/rate inventory and sanitized Credits
  read. Actual AI caller completeness remains C01 in FIN-009.
- E02.1-E02.3 complete for Credit events and explicit absent-money states.
  No actual cost, cash or profit calculation is claimed.
- E03.1-E03.2 complete for typed local drafts, same-command replay, admin-only
  access and hard production denial. Central Audit and JSON draft writes are
  not a cross-file transaction; production remains blocked.
- E04.1-E04.4 verified in focused UI tests. Existing Admin navigation is preserved.
- E05.1 implemented: groups inventory, periods, permissions, drafts, pricing,
  ui, types and explicit implemented-slice all. Unimplemented groups fail.
- E04.5/E05.2 verified for the local slice; evidence and exclusions below.

Detailed remaining work: [FIN-009](009-production-dependency-implementation-plan.md).

Admin -> Finance -> calendar year/provider filters -> captured/refunded Credits
and source gaps -> month drilldown -> paginated event IDs and pinned price
versions. Current source without invoice telemetry means costs unavailable,
not a guessed current-price multiplication. Refresh starts a new as-of snapshot.

Finance -> Rates -> search model -> inspect source rates, dimensions and
published Credit table -> prepare cost-only draft -> review current/proposed
value and unchanged retail policy -> Save Draft -> persistent revision history.
Publish/schedule stays unavailable with DB/Auth/approval prerequisites.

Finance -> Supplier accounts -> no invented accounts/balances -> prepare an
account/service/provider/model binding proposal with prepaid/postpaid/hybrid,
currency and evidence -> save draft. This records neither funding nor an
externally confirmed billing switch. Old balances/obligations cannot be erased.

## 4. Contract And Performance

- Only canonical facade dependencies: Credits, provider controls, video catalog,
  shared Admin Configuration. Finance computes reporting projections only.
- JSON source adapter is read-only and schema-aware. Bound output to 50 events
  per page and one calendar year. Full JSON read is legacy cost, not a new cache;
  future DB replaces this with indexed range reads. Measure representative read.
- One server response contains report + paginated details and fingerprint;
  changing source with an expected fingerprint returns 409. No browser polling.
- Missing IDs/dates/unsafe integer amounts degrade completeness; no invented
  ledger events. Provider/model filters never allocate unknown rows arbitrarily.
- Money rates are decimal strings; no monetary aggregation from current rates.
  Existing Credits calculator remains unchanged. Empty authoritative Credit
  months can be zero; financial sources without records/connectors are null.
- Local mock-admin grant is development-only. Production cannot use Finance
  until trusted authentication and explicit Finance permissions are integrated.

## 5. Remaining Dependency Tasks

1. F06/F08: transactional configuration revisions, approvals, durable scheduler,
   cancellation/forward rollback, concurrent activation and old-quote parity.
2. F09/F10: durable attempt-level usage/cost events for image/video/text/internal
   calls, retries/fallbacks, immutable evidence corrections and reconciliation.
3. F10A/B: supplier account/pool ledger and cash evidence with funding lots,
   externally confirmed agreement changes, invoices and opening balances.
4. Payments/paid-Credit allocations before actual income and realized margin.
5. Evidence-aware monthly cash/cost/balance aggregation and safe authorized CSV
   after those sources exist. No export button pretending absent data is final.

These are explicit MVP gaps, not reasons to mutate the working JSON Credit flow.
Keep their acceptance cases in FIN-005; unsupported test groups must fail with
an unmet-dependency message instead of passing a release gate.

## 6. Evidence And Handoff (2026-09-07)

New Finance domain facade/read projections, thin HTTP adapter, Admin React
route/components/API/Zod schema and scoped stylesheet are implemented. Credits
only gains a sanitized, non-mutating read contract. Shared configuration gains
two typed planning scopes, explicit optional command replay and Finance-only
access checks; existing non-Finance draft semantics are preserved. No files
moved. No new runtime data path. Existing price files are unchanged.

Validation, executed as separate groups rather than a whole-application suite:

- Finance reports/inventory/permissions/drafts: 10 tests passed.
- Existing Admin safe MVP and Comparison Credit settlement: 4 tests passed.
- Existing Credit pricing and estimate parity: 10 tests passed.
- Finance, Admin dashboard, Providers and Control Plane React: 12 tests passed.
- TypeScript no-emit project check and Finance-scoped ESLint passed.
- Enabled-locale catalogs validated; EN/TH Finance key parity retained.
- Playwright: 24 layout checks (4 tabs x EN/TH x 390/820/1440), no page overflow,
  missing translation keys, uncaught page errors or unexpected API calls.
- Isolated browser draft save succeeds and Publish/Schedule remain disabled.
  Pearl/Creative screenshot checks were added; Finance status notices were
  corrected for light-theme contrast. Manual screenshot inspection covered
  desktop, tablet and mobile. Unsaved tab/route leave requires confirmation;
  browser unload warns and pending save disables form fields.

Screenshots from final visual run:
`C:/Users/punya/AppData/Local/Temp/mpf-finance-layout-7qCYXf/`.
The visual script intercepts API traffic, uses real sanitized read projections
and an isolated temporary draft repository/Audit stub. It is NOT a production
auth, real central Audit integration, invoice or scheduled-publication test.

One local facade measurement: 31 configured/catalog-or-rate-only models,
1,112 Credit events, zero invalid source rows, about 40 ms for inventory+report
and 48.6 KB combined serialized output. Of 31 rows, 12 have configured unit
rates, 14 require billing-unit verification, 5 have no rate. This is a local
sample, not a scalability SLA or proof that every AI caller is metered.

Commands for later repeat runs:

```text
node scripts/test-admin-finance.mjs inventory
node scripts/test-admin-finance.mjs periods
node scripts/test-admin-finance.mjs permissions
node scripts/test-admin-finance.mjs drafts
node scripts/test-admin-finance.mjs pricing
node scripts/test-admin-finance.mjs compatibility
node scripts/test-admin-finance.mjs ui
node scripts/test-admin-finance.mjs types
node scripts/test-admin-finance.mjs all
node scripts/test-admin-finance.mjs layout
```

`all` means implemented-slice unit/UI/type checks only. `layout` is explicit and
requires Vite at 127.0.0.1:5173 (override FINANCE_LAYOUT_ORIGIN for another local
port); it does not require or start the normal backend. The usual tsc build-info
write was denied by the sandbox, so the successful check used noEmit and
incremental=false without changing repository build configuration.

Vite was started for review. Backend localhost:6500 was not running and was not
started by this task: normal bootstrap can resume persisted video tasks.
Use the existing backend when ready for manual application UAT, then open
`http://127.0.0.1:5173/admin/finance` as local Admin. No paid generation, provider
top-up, production publishing or real financial adjustment was performed.

Review outcome: local-slice conditional pass, sequential review only. FIN-001
through FIN-007 remain partially open; complete production readiness requires
the explicit P/C/B/R tasks in FIN-009. Current monetary reports deliberately
remain unavailable until cost/payment/funding evidence sources exist.
