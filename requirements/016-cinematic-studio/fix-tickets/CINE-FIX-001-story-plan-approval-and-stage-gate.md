# CINE-FIX-001 Story Plan Approval And Stage Gate

**Priority:** P0
**Status:** Implemented
**Reported surface:** Story Plan and Scene Director

## Defect

`Qualification operation - no Credits charged` is visually presented like a
warning although it is only billing/exposure information for an AI text
operation. Next stage can be disabled without explaining that the latest
working Story Plan draft has not been approved.

The affected Project currently has approved Plan version 6 and newer draft
version 8. `project.scenes` reflects the latest draft, while the approved Plan
references the earlier Scene/Beat IDs. The current draft must therefore be
approved before Storyboard; the UI must not imply that qualification status is
the blocker.

## Required behavior

1. Present qualification as a compact neutral operation status next to the AI
   action. It is not a validation error.
2. Keep AI Story Plan and Scene Direction text operations no-charge while the
   server returns `qualification_no_charge`; do not invent a Credit estimate.
3. Story Plan Next is enabled only when the current working Plan is approved,
   structurally complete, source-current and duration-valid.
4. When blocked, the footer names the reason and directs the owner to review
   issues or approve the current Plan.
5. Saving a newer draft intentionally makes Storyboard unavailable until that
   draft is approved. Older approved structure must not be presented as if it
   matches newer working Scenes.

## Regression checklist

- Manual draft save remains available.
- Generate proposal remains available when required Cast roles are assigned.
- Apply proposal does not approve automatically.
- Approving the current complete Plan enables Next.
- Qualification status never appears in the structural validation issue count.

## Evidence (2026-08-30)

- Added working-draft and approved-current footer/gate regressions in
  `CinematicUxPrototype.test.tsx`.
- Full Web regression: 94 test files, 334 tests passed.
- TypeScript and i18n catalog validation passed.
