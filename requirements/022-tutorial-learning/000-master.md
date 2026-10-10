# Tutorial Learning, AI Cinema And Shared Credit Access

**ID:** TUT-022  
**Updated:** 2026-10-08  
**Status:** Increment A implemented and fixture-verified; complete learning/commerce delivery remains pending.  
**Delivery:** Implementation authorized. Admin draft catalog only; no live billing or uploads yet.

## Outcome

Give Momelo a separate Tutorial area for learning and teaching, with recorded
video courses, free/partially free/paid access, and auditable course-level
learner and financial reporting. Extend the same access/media foundation to a
separate AI Cinema catalog. Start with an admin-only local POC.

## Requirement Packet

| File | Ownership |
|---|---|
| [001-product-access-and-catalog.md](001-product-access-and-catalog.md) | Actors, course structure, publication, enrollment and permissions |
| [002-navigation-landing-and-learning-ux.md](002-navigation-landing-and-learning-ux.md) | Separate menu, landing integration, player and teaching workspace |
| [003-private-video-upload-and-streaming.md](003-private-video-upload-and-streaming.md) | Upload, processing, local streaming and future cloud boundary |
| [004-credit-purchase-and-course-finance.md](004-credit-purchase-and-course-finance.md) | Purchase, entitlement, reconciliation and course revenue evidence |
| [005-learning-analytics-and-admin-reports.md](005-learning-analytics-and-admin-reports.md) | Learner identities, activity, monthly/yearly reports and privacy |
| [006-implementation-plan.md](006-implementation-plan.md) | Small ordered tasks, dependencies, rollout and validation groups |
| [007-review-and-open-decisions.md](007-review-and-open-decisions.md) | Review findings, unresolved decisions and acceptance evidence |
| [008-ai-cinema-and-shared-content-access.md](008-ai-cinema-and-shared-content-access.md) | Admin-only cinema, configurable free episodes and shared access ownership |
| [009-increment-a-handoff-and-uat.md](009-increment-a-handoff-and-uat.md) | Delivered draft workspace, configuration, focused evidence and next steps |

## Confirmed Requirements

- Separate Tutorial navigation section, not another Playground/Cinematic mode.
- A real-course section on the existing landing/home page.
- Teaching mode for eligible members as the eventual product direction;
  admin-only access during POC, including learner preview and backend/API/media.
- Free courses; creator-configured first N Chapters free with the rest paid;
  fully paid courses. Three is an editable default, not a fixed restriction.
- Separate AI Cinema menu; only Admin may upload and publish in its initial phase
  (explicitly confirmed). Free/all-paid/configurable first N free episodes.
- Video upload and streaming backend; local delivery for POC.
- Use existing Credits, not a second wallet.
- Admin can see how many learners, who they are, usage, Credit deductions,
  course-level earnings evidence, and monthly/yearly breakdowns.
- Do not confuse Credit spending, cash receipts and profit.

## Proposed Defaults, Not Approved Policy

- Course -> Chapter -> Lesson, with one video per Lesson and optional text.
- One purchase unlocks all paid Chapters in that Course; watching again is free.
- Momelo/admin-authored content first; member instructor onboarding and payouts later.
- Local HLS with one output rendition first; storage/transcode/delivery adapters
  allow cloud migration without rewriting purchases.
- Follow existing Finance calendar-month/year and Asia/Bangkok defaults.
- Hide the new menu and course landing section from non-admins during POC.
  Public marketing exposure is a separate later release decision.

Purchase duration, refunds, actual POC debits, instructor rights and paid-Credit
allocation require the decision gate in 007. No unanswered question is approval.

## Capability And Reuse Map

Current code, inspected 2026-10-08:

- Credits: `server/domain/credits/CreditApplicationService.js` exposes the
  existing wallet facade. Extend it for tutorial commerce; do not repurpose
  `reserveWriting` or an AI Generation operation as a course purchase.
- Finance: `server/domain/finance/FinanceReportService.js` already supports
  period/as-of reporting but currently leaves cash/profit unavailable. Add an
  explicit tutorial dimension/projection without fake provider/model IDs.
- Assets: existing video probe/poster/storage infrastructure can be extended.
  Provider-handoff GCS is not automatically private paid-course delivery.
- UI: `web/src/components/media/VideoMediaPlayer.tsx`, shared discovery controls,
  confirmations, async feedback and `FeaturePolicyProvider.tsx` are reuse candidates.
- Home owner: `web/src/features/community/routes/CommunityHomeRoute.tsx`.
  Existing `EditorialTutorialRail` is static illustrative content, not enrollable
  courses; its other callers must remain intact.

Increment A owns shared catalog presentation under `web/src/features/content-catalog/`,
thin Tutorial/Cinema route modules, separate `server/domain/tutorials/` and
`server/domain/ai-cinema/` facades/repositories, and
`server/app/routes/learningRoutes.js`. Course business rules enter through
`TutorialApplicationService`. Assets owns future bytes/processing, Credits owns
monetary mutation, Finance owns financial projections. Tutorials owns course
content and learning progress. Shared purchase workflows, offers and entitlements
belong to the proposed Content Access capability described in 008; Tutorials and
AI Cinema delegate to it instead of implementing separate purchase pipelines.
This supersedes the earlier tutorial-only order/entitlement ownership proposal.

## Related Sources Of Truth

- [Architecture master](../099-technical-dept/000-master.md)
- [Capability entry points](../009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md)
- [Financial attribution](../019-implementation-commercial-feature-plan/admin-finance/003-cost-credit-attribution-and-reconciliation.md)
- [Monthly/yearly finance](../019-implementation-commercial-feature-plan/admin-finance/007-monthly-yearly-generation-finance-reports.md)
- [Assets/storage boundary](../019-implementation-commercial-feature-plan/Phase2-06-assets-storage-and-product-catalog.md)
- [Visual language](../Knowledge/ui-design-system-and-visual-language.md)

## Role Routing

Primary: Product Requirement Architect. Document reviews: UX/UI Product Designer
and Commercial Financial Integrity, applied sequentially by the same agent;
the original documentation review was sequential. Increment A additionally received
independent UX (James), Backend implementation (Anscombe) and QA (Planck) passes.
Implementation must additionally
pass Backend, QA and security/privacy gates for paid access and learner data,
in separate task-sized review rounds (006). No runtime validation is claimed.

## Non-Goals For POC

Live classes, subscriptions, per-minute charging, DRM, certificates, exams,
instructor marketplace payouts, AI course generation, automated tax accounting
and cloud deployment. Record their future ownership rather than adding them to
the initial course/player build. No changes to existing generation billing.
