# FIN-010 Monthly And Yearly Excel Export

**Status:** Implemented; focused automated/browser verification passed.

**Owner:** Admin Finance presentation, extending FIN-007. Primary role: Product
Requirement Architect; QA review is sequential, not independent. Triggered Skill:
verify-release-regressions. No billable state or financial calculation changes.

## Scope And Acceptance

- Add an icon + Export Excel button to existing monthly/yearly report controls.
- Download a real XLSX workbook, not renamed CSV, in the selected UI language.
- Summary contains selected month or the year's monthly rows plus server totals.
  Export uses the displayed authorized response, provider/model filters, as-of,
  revision and Asia/Bangkok period basis. No second report query or recalculation.
- Numeric Credits remain numbers; known zero stays zero. Unknown/future amounts
  remain explicitly unavailable, never invented zero cash, expense or profit.
- Metadata sheet records filters, source statuses, invalid/unallocated counts,
  Credit units, UTC as-of, timezone and partial management-report limitations.
- This bounded summary excludes paginated event detail, prompts, media and actor
  secrets. Metadata states that limitation; do not export 50 rows as a full ledger.
- Preserve Finance Admin authorization and production gate. No new endpoint,
  persistence, rate changes, provider calls or local runtime data writes.
- Disable export while loading/refetching, on report failure and while exporting.
  Prevent rapid duplicates; failure is visible and retryable. Cancel a pending
  download when the screen unmounts/actor changes or selected scope changes.
- Spreadsheet labels are typed strings, never formula/hyperlink objects. Lazy-load
  XLSX tooling only on export; release the temporary download URL.
- Preserve neighboring Admin navigation, reports, pagination and planning forms.

## Implementation Steps

1. [x] Add a focused workbook helper beside existing Admin components, using an
   established XLSX library; no hand-written ZIP/XML spreadsheet engine.
2. [x] Add localized export state/control to FinanceReports; use existing Button,
   Lucide icon and filter wrap layout. No redesign.
3. [x] Verify workbook round-trip: year/month, totals, filters/snapshot, zero versus
   unavailable, literal formula-like strings and no ledger detail leakage.
4. [x] Verify UI success, error/retry, disabled and stale/unmounted export states;
   check mobile/tablet/desktop. Add an export group to the focused script and all.
5. [x] Update FIN-007/master and record evidence; full cash/cost/funding reporting
   remains pending FIN-009. No production financial certification from this task.

## Files And Rollback

- `web/src/features/admin/components/financeReportExcel.ts` and colocated test:
  workbook projection/serialization owned by Admin Finance presentation.
- FinanceReportExport owns pending/error/unmount behavior. Its key includes actor,
  filters, language and report snapshot; scope changes discard unfinished export.
- Existing FinanceReports, admin EN/TH catalogs and test-admin-finance runner.
- Optional library dependency belongs to web/package.json plus root lockfile.
- Rollback removes the export control/helper only; report APIs and ledger unchanged.

## Verification

- `node scripts/test-admin-finance.mjs export`: 8 tests passed, XLSX round-trip,
  month/year bounds, unchanged totals, zero/unknown, filters/snapshot, Thai text,
  literal formula-like cells, export errors/retry, duplicate and unmount guards.
- `node scripts/test-admin-finance.mjs ui`: 12 tests passed, including Finance
  export enable/error/Support visibility and neighboring Admin routes/forms.
- `node scripts/test-admin-finance.mjs export-layout`: 6 responsive checks passed,
  EN/TH at 390/820/1440. Four browser downloads (year/month in both locales)
  reopened as XLSX and matched report as-of/revision/totals. No paid requests.
- Evidence: `%TEMP%/mpf-finance-layout-iSmRNj/` screenshots and XLSX artifacts.
  Desktop, tablet and mobile screenshots inspected; no export overlap/clipping.
- TypeScript, scoped ESLint, i18n validation and diff whitespace checks passed.
- Excel desktop interoperability is not claimed from serialization tests alone;
  opening a downloaded workbook in the user's Excel remains a manual UAT check.
- Review applied sequentially, not independently. No runtime persistence, server
  API, price, reservation, funding or generation behavior changed.

## Library Reference

Workbook serialization uses lazy-loaded ExcelJS 4.4.0 and explicitly typed scalar
cells, following its [official API documentation](https://github.com/exceljs/exceljs/blob/v4.4.0/README.md).
No formula evaluation or user-uploaded workbook import is exposed.
