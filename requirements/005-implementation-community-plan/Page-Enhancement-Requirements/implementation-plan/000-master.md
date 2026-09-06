# Community Page Enhancement Implementation Plan

Character-only follow-up: `../010-character-discovery-identity-master.md` and
`../011-character-discovery-data-trace.md` control plans 013-016 below. Their
live-data visual gate is pending; the original delivery status does not close it.

Status: Executed in sequence; focused verification passed (2026-09-06)

Owning requirement: `../000-master.md`

## 1. Execution Principle

ทำทีละ slice และปิด test gate ของ slice นั้นก่อนเริ่มส่วนถัดไป ห้ามเปิดหลายหน้าพร้อมกันเพราะ shared component ที่ยังไม่นิ่งจะทำให้ regression กระจาย

Primary implementation role: UX/UI Product Designer for material page work

Reviewers: Product/Requirement reconciliation after each slice; QA Release Engineer at integration gate

## 2. Dependency Order

```text
01 Contract freeze
        |
02 Shared discovery foundation
        |
03 Template Gallery
        |
04 Character Gallery
        |
05 Comparison Gallery
        |
06 Landing + Community Feed
        |
07 Integration and release
```

Template Gallery is the first consumer because its current public data and existing `TemplateUseButton` provide a bounded way to validate the shared discovery contract. The root Community page is last because it has the widest navigation and feed blast radius.

## 3. Plan Files

| Step | File | Requirement coverage |
|---|---|---|
| 1 | `001-contract-freeze.md` | Current routes, data, baseline and protected behavior |
| 2 | `002-shared-discovery-foundation.md` | Shared controls/layout and component tests |
| 3 | `003-template-gallery.md` | Requirement 001 |
| 4 | `004-character-gallery.md` | Requirement 003 |
| 5 | `005-comparison-gallery.md` | Requirement 002 |
| 6 | `006-community-landing-feed.md` | Requirement 004 |
| 7 | `007-integration-and-release.md` | Requirements 006-008 and cross-page release |
| CDI-01 | `013-character-identity-cards.md` | Public identity presentation and effective availability |
| CDI-02 | `014-character-spotlight-and-discovery.md` | Compact header, moments, filters and Studio entry |
| CDI-03 | `015-character-create-handoff.md` | Shared authorized handoff and destination menu |
| CDI-04 | `016-character-visual-verification.md` | Focused test evidence, visual review and pending live gate |
| CHP-01..03 | `017-character-highlight-polish.md` | Requirement 012: Gallery-source circles, complete Featured media and scoped visual polish |
| CFR-01..03 | `018-character-featured-row-and-engagement.md` | Requirement 013: graduated Header circles, unified cover/fade Featured row and shared post likes/views |

## 4. Step Execution Contract

For every step:

1. Re-read the owning requirement and current canonical modules
2. Record the exact files and behavior owned by the slice
3. Run only the focused pre-change tests and capture failures
4. Implement the smallest complete behavior
5. Run component/schema tests for the slice
6. Verify the page at 390px, 820px and 1440px when UI changed
7. Review the scoped diff for unrelated churn
8. Update that plan file with executed files, evidence and remaining gaps
9. Stop on a failed exit gate; do not compensate by changing unrelated capabilities

## 5. Change Boundaries

- React route composition: `web/src/features/community/` and `web/src/features/profiles/`
- Shared visual components: `web/src/components/discovery/`
- Shared styles: `web/src/styles/community-discovery.css` only after two consumers exist
- Existing page styles remain with their current files until safe extraction is proven
- API boundaries: existing `communityApi`, `profileApi` and Comparison APIs
- Localization: existing locale catalogs and manifest
- Tests: colocated React tests, existing `test/` domain tests and focused Playwright specs
- Optional runner: `scripts/test-community-page-enhancements.js`

No provider, generation, Credit, Queue, database or runtime-data file is owned by this plan.

## 6. Stop Conditions

Pause the affected slice and mark it Pending when:

- A design requires private data in a public response
- A metric lacks an authoritative source
- A CTA has no existing destination or permission contract
- A route change would replace AppShell/global navigation
- A shared component requires feature-specific API calls or condition branches
- A visual requirement requires a new ranking, review, billing or social mutation
- Current baseline tests fail for reasons unrelated to the slice

Other independent slices may continue only when they do not depend on the blocked behavior.

## 7. Completion Record Template

Append this block to the executed step file, not to the master:

```text
Execution status:
Files changed:
Protected behavior checked:
Focused tests:
Viewport evidence:
Requirement deviations:
Pending follow-up:
```

## 8. Final Gate

Implementation is complete only after Step 07 passes. Requirement files remain `Proposed` until code, focused tests, responsive checks and final regression evidence are all present.

## Template Detail Follow-up

Plan 020-template-scene-workspace.md owns the subsequent Template-aware Scene
presentation and reusable Character picker. Default Studio ordering is preserved;
only Template mode puts configuration before the existing output/Queue section.

Plan 019-template-detail-and-creations.md owns the additive Template Detail,
Post preview and verified public creations work under requirement 014.
# Template Input Policy Follow-up

021-template-input-policy.md sequences requirements 016-018. Existing Template
Detail and Scene presentation plans remain scoped to their prior work.
# Template-Derived Sharing

Plan 022 owns the ordered implementation and focused gates for requirements
019-021. Existing Template records and paid generation remain untouched.
