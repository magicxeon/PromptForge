# Community Page Enhancement Implementation Plan

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
