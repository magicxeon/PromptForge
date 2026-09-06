# Template-Derived Image Sharing

Status: Implemented; focused automated/visual gates passed. Live owner UAT pending.
Primary: Product Requirement Architect. Reviews: QA and UX/privacy, sequential.
Skills: review-product-ux, verify-release-regressions. No dispatch, reference,
Credit calculation, reservation or settlement changes.

## Outcome

Images generated through Use Template can be shared as images, never published
as a new reusable Template, even by the original Template owner or after outfit
and Character replacements. Apply to every entry using the common Share dialog,
including result preview, History/Recent and individual Comparison outputs.

## Scope And Order

1. AGENTS.md records requirement-first, incremental delivery and focused runners.
2. Requirement 020 owns authoritative origin checks and publication privacy.
3. Requirement 021 owns the shared dialog and preserved Template attribution.
4. implementation-plan/022 owns ordered tasks and isolated verification.

User follow-up: derived images must always share with private prompt and no
Prompt visibility control. Requirement 022 prevents sharing the same generated
image twice, including ordinary original images. Existing posts are untouched.

Keep existing Template records, sessions, images and engagement untouched. No
retroactive unpublish/delete or bulk migration. Ordinary original Scene images
remain Template eligible under requirements 016-018. The presence of a Scene
snapshot alone does not mean the result was generated from a published Template.

No source provider calls, paid tests, worker restarts or user-data writes.
Character thumbnail selection/centering discussed separately remains pending;
it is not authorization to change generation references in this task.

## Acceptance

- Derived draft hides reusable publishing and related fields.
- Crafted or stale requests cannot bypass backend origin checks.
- Image sharing and attribution remain functional within source privacy limits.
- Existing Template publication/input policy, ownership and prices do not regress.
- Split server/UI/compatibility/visual tests and an explicit aggregate script.

Legacy results without recorded provenance cannot be reliably inferred from
pixels or prompt text. Audit/backfill is pending, not a speculative migration.

Verification: 60 focused tests and 18 browser cases passed; production build,
scoped lint, route syntax and i18n validation passed. Independent server/privacy
QA recheck passed; UI/visual review by implementation agent. No live publishing
or generation. Evidence and commands: implementation-plan/022.
