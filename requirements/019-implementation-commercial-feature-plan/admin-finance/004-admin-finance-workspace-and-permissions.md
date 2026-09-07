# FIN-004 Admin Finance Workspace And Permissions

**Status:** Local `/admin/finance` workspace implemented in FIN-008; full
production/evidence mutation contracts below remain pending FIN-009.

## 1. Placement And Reuse

Proposed route: `/admin/finance`, with route-registry metadata and permission-aware
navigation in the existing AdminWorkspaceLayout. Reuse AdminFilterBar,
AdminPagination, AdminStatusBadge, entity links, shared dialogs/buttons and
date/form primitives. Do not redesign sibling Admin/Provider/Operations pages.

Use existing tokens/i18n catalogs and the
`requirements/Knowledge/ui-design-system-and-visual-language.md` conventions.
Finance is a compact table/form workspace, not a marketing landing page.

## 2. Views

| View | Content and actions |
|---|---|
| Overview | Known incurred cost, reconciled portion, reserved exposure, missing-cost count, internal expenditure, Credit captures/refunds; receipts/profit unavailable when sources are absent |
| Usage And Costs | Date/workflow/provider/model/payer/environment/evidence filters; operation/attempt rows, source links, Credit breakdown and cost evidence drawer |
| Provider Rates | Every model/operation with coverage, cost basis, retail Credits, active versions/effective time, next approved schedule; draft/validate/diff actions |
| Versions And Schedule | Scope, revision, announcement/effective/actual time, actor/reason, persistent lifecycle state; publish/schedule/cancel/rollback for authorized staff |
| Reconciliation | Missing usage/rates, unmatched provider costs, pending reporting events and evidenced adjustments; no generic balance editor |
| Monthly / Yearly Reports | FIN-007 period selector and cash/usage/balance views, 12-month rows/YTD, source completeness, drilldown and authorized CSV |
| Provider Billing Accounts | FIN-006 service/model bindings, prepaid/postpaid/hybrid versions, shared pools, top-ups/packs/payables, reported balance as-of and discrepancy/expiry warnings |

Provider Rates links to existing provider controls for enable/disable. It cannot
enable a model by editing a rate, duplicate provider/model capability options
or reveal drafts/costs on customer catalogs.
Funding settings show external-change confirmation separately from local version
publication. Manual funding evidence entry is not a Buy Credits or auto-top-up
action against a provider. Do not add such payment execution buttons in this scope.

## 3. Rate Editor

Sections: provider/model/operation and applicable dimensions; evidence/unit cost;
retail/FX policy references; version/dates/reason; deterministic current-vs-draft
preview. Unsupported dimensions are hidden based on owning capability metadata.

Save Draft, Validate, Publish Now and Schedule are separate commands. Cost-only
changes show unchanged customer Credits unless a retail policy revision is
included explicitly. Scheduled revisions are locked to their approved content;
the editor offers cancel-and-revise instead of silently saving over them.

Date controls show timezone next to the effective date. Confirmation shows the
exact affected scope, costs/Credits before and after, approval state and UTC/local
activation instant. Every success/error has persistent status; a Toast alone
is insufficient. Financial history is never an editable grid of settled values.

## 4. Staff Permissions

Extend the server-owned permission/command matrix in Backend 018-007:

| Permission responsibility | MVP default |
|---|---|
| Finance totals/provider expense read | Admin with explicit Finance read grant |
| Case-linked quote/Credit diagnostics | Support within existing Case/customer scope; no implied access to all costs/margins |
| Draft author/validate | Explicit configuration author grant |
| Publish/schedule/cancel/rollback | Explicit pricing/configuration publisher grant, approval according to financial risk policy |
| Reconciliation evidence/adjustment | Explicit Finance reconciliation grant and Audit; cannot mutate Credits/Payments through Finance |
| Supplier funding/evidence entry and report export | Explicit Finance grants, scoped evidence access and Audit; no external payment permission implied |
| Ordinary user | No Finance/Admin cost endpoints; own quote/credit history remains in customer APIs |

Suggested new Finance permission names are finalized with Identity before coding;
reuse configuration author/publish/schedule/rollback permissions rather than
inventing a competing permission system. No financial grant is inferred from
an ordinary request header. Production staff auth/Audit are mandatory.

Publishing and evidence adjustments require reason, expected version, idempotency
and actor from authenticated context. Approval binds immutable impact/fingerprint;
high-risk two-person approval cannot be self-approved. Unresolved thresholds
keep the corresponding risky command disabled, not silently allowed.

## 5. API And Performance Contract

HTTP endpoints under a proposed Admin Finance route adapter delegate to
`FinanceApplicationService` for reporting/evidence and to the owning Admin
Configuration facade for rate commands. No route-level SQL, provider call,
Credit calculation or direct cross-capability repository mutation.

Reads: overview, coverage, usage page, cost detail, reconciliation issues,
version history, supplier account/funding and monthly/yearly reports. Reuse
configuration mutation contracts from 018-010 for draft,
validate, publish, schedule, cancel and rollback; no parallel Finance publisher.

Responses use owning Zod schemas and apiClient; actor-scoped query keys also
include filters, source/as-of or active snapshot version as relevant. Bound
date ranges/page sizes and stable cursor ordering before implementation. Totals
and pages identify the same timezone/as-of/evidence basis so pagination does
not silently change the report denominator. Aggregation belongs server-side.
Return incomplete/stale/source-unavailable status, not fabricated totals.
Monthly/yearly report filters additionally include account/pool, billable-event
mode and report basis from FIN-007. Annual aggregate requests cover 12 months;
daily-detail bounds remain independent. Export uses the same authorized as-of
snapshot and neutralizes spreadsheet formulas in user-controlled labels.

Reuse canonical catalog/configuration invalidation. Finance queries refetch on
explicit action/invalidation; a new continuous browser polling loop requires
documented owner, interval, TTL, invalidation and size budget. Measure report
queries against representative data before index/cache tuning.

## 6. Responsive And Interaction States

Desktop: aligned numeric columns with units, compact filters, unframed section
layout. Tablet/mobile: wrap filters and commands, prioritize essential columns,
use contained table scrolling or expandable rows without page overflow.
Use lucide icons with labels/tooltips for unfamiliar actions; semantic badges
include text so evidence/status is not communicated by color alone.

Loading, empty, partial, unavailable, unauthorized, stale edit, dirty draft,
validation failure, scheduled, delayed, failed activation, active and superseded
states are required. Support keyboard/focus, confirmation cancellation and
locale/theme variants; verify approximately 390/820/1440px before UI closure.

## 7. Acceptance

- `FIN-UI-01`: overview and drilldown reconcile under the same filters; absent
  sources show incomplete/unavailable, not zero or invented profit.
- `FIN-UI-02`: active, draft and future pricing are distinguishable, with
  explicit timezone and before/after Credit impact.
- `FIN-UI-03`: server and UI enforce every role/permission; public responses
  contain no provider costs, margins or private evidence.
- `FIN-UI-04`: stale edits and failed/delayed schedules remain actionable and
  visible after refresh; no financial action relies only on a Toast.
- `FIN-UI-05`: scoped layout/i18n/keyboard/theme checks pass at mobile, tablet
  and desktop; existing Admin/Provider/Operations interactions stay intact.
- `FIN-UI-06`: period reports and billing-account views satisfy FIN-PERIOD and
  FIN-FUND criteria; users can distinguish money paid, usage cost and balance,
  along with scheduled versus externally confirmed billing-mode changes.
