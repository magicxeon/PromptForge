# Comparison Download And Shared Processing Feedback

Date: 2026-09-09. Status: implemented; scoped automated and Chromium checks passed.
Primary: Product Requirement Architect. Sequential reviewers: UX, Backend/privacy
and QA. Four roles are justified by shared UI plus private image composition;
review independence is limited. Skills: review-product-ux, verify-release-regressions.

Owner: Assets / MediaExportService for export; Comparisons for membership and
order; shared UI for processing feedback. No Generation or Credit state changes.

Source: requirements/099-technical-dept/Technical-Documents/momelo-comparison-download-spec.md
and the two user screenshots. This package supersedes 006's exported layout and
branding only; on-screen comparison zoom, layout, voting and Look Sheet remain.

1. [026 Shared loading](026-shared-processing-loading.md)
2. [027 Black comparison image](027-comparison-black-export.md)
3. [028 Preview and download](028-comparison-export-interaction.md)
4. [029 Ordered tasks and evidence](029-comparison-export-implementation-plan.md)

Use existing Sharp server renderer infrastructure, not a parallel browser image
composer or new service. Export is deterministic, owner-authorized and free of AI
calls; it does not overwrite originals or change publication/reference rights.
No live data migration, backfill or provider UAT required. No production build or
worker restart in automated checks. Rollback restores the previous export UI and
renderer; historical originals and Look Sheet definitions remain untouched.
