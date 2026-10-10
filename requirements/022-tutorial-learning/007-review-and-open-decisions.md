# TUT-007 Review, Decisions And Evidence

**Updated:** 2026-10-08  
**Documentation:** Draft packet written and locally checked.  
**Implementation:** Increment A draft workspace delivered; isolated API/browser checks passed.
Live application UAT, billing, streaming and complete commerce remain pending.

## Open Decisions

Confirmed follow-up: creators choose the free Chapter count per Tutorial; three
is not mandatory. AI Cinema is a separate planned catalog with Admin-only upload
and publication initially. This does not approve public viewing or actual debits.

| Decision | Proposal | Blocks |
|---|---|---|
| D01 Instructor eligibility | Admin/Momelo content for POC; member teaching later with approval | Member publishing and revenue sharing |
| D02 Purchase unit and duration | One-time Course unlock; duration and inclusion of future Lessons undecided | Live offer/entitlement terms |
| D03 POC charging | Isolated test ledger until real Admin debit explicitly approved | Real wallet mutations |
| D04 Refund/archive policy | Technical delivery failures compensated; voluntary refund and archive access require approval | Public sales and destructive publication changes |
| D05 Course prices and allocation | Per-Course Credit price; paid/promo lot attribution in Credits, not a fixed cash conversion | Actual cash-backed course reporting |
| D06 Source clips and limits | MP4, one HLS rendition first; need typical size/duration and samples | Upload/storage budgets and capacity signoff |
| D07 Calendar/currency | Existing Asia/Bangkok calendar-month/year; retain source currencies | Report-default signoff |
| D08 Retention and privacy | Separate raw activity, aggregates, originals and financial evidence policies | Cleanup and public launch |
| D09 External instructors | No payouts in POC; later rights/licensing, revenue split and liability review | Instructor earnings/payouts |
| D10 Cinema offer scope | Propose Film/whole-Series unlock; Season/Episode sales, duration and future releases undecided | Cinema paid offers |

No unanswered decision prevents documentation. It does prevent implementation
from silently choosing price, rights, actual debit, retention or public exposure.

## Sequential Design Review

Product: confirmed menu/landing, free/configurable-preview/paid modes, backend and reporting
are mapped to owning requirements. Course purchase and instructor policy remain open.

UX: discovered the existing static home `EditorialTutorialRail`. TUT-002 specifies
conditional replacement on home, keeps other consumers, and preserves sibling
sections. New screens include locked, pending, error, retry and mobile behavior.
Visual screenshots and independent UX-agent approval remain implementation gates.

Commercial: inspected `CreditApplicationService` and `FinanceReportService` plus
FIN-003/FIN-007. Existing balances/reporting do not prove Course cash revenue.
TUT-004 requires immutable capture/refund linkage and paid-Credit funding evidence,
keeps unknowns visible, and prevents admin/test usage from becoming customer sales.
Credits remain a shared authority; no duplicate course wallet or cash ledger.

Privacy/security design: no public learner list or ungated static paid video.
Scope authorization covers API, manifests, segments, captions, reports and exports.
This is a requirements-level check, not a completed security assessment.

## Traceability

| User requirement | Owner | Future validation |
|---|---|---|
| Separate Tutorial menu and landing section | 002 | access + ux |
| Member teaching with Admin-only POC | 001,002 | access + catalog |
| Free / first N Chapters or episodes / paid | 001,004,008 | catalog + credits |
| AI Cinema Admin upload/publish; separate menu and shared foundation | 008 | access + media + ux + finance |
| Upload and local streaming | 003 | media + access |
| Credit deductions and replay-safe access | 004 | credits |
| Who learned, usage and unique counts | 005 | analytics + access |
| Monthly/yearly course money | 004,005 | finance |
| Do not duplicate existing workflows | 000,006 | ownership review + scoped diff |

## Evidence And Gaps

- Inspected canonical route registry/home route, shared video player, feature
  policy, Credit facade, Finance report and current financial requirements.
- Increment A added draft-only source modules and runtime path configuration;
  no live runtime data, balances or environment feature flags were changed.
- Focused API/contract/persistence, frontend, identity/route and TypeScript checks
  passed. Twelve isolated responsive browser cases saved through actual catalog
  APIs using temporary repositories. See 009 for commands and evidence.
- UX review ran before screen work. Independent QA found actor-switch late-save
  and server/client limit mismatches; both were fixed and regression-tested.
- The selectable runner exists for Increment A only. Undelivered media, commerce,
  analytics and finance groups cannot be reported as passed.
- Production money accuracy remains gated on payment/funding-lot evidence and
  approved allocation; a Credit-only POC must not be marked financially complete.
