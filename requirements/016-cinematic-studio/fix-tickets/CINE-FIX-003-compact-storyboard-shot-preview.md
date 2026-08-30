# CINE-FIX-003 Compact Storyboard Shot Preview

**Priority:** P1
**Status:** Implemented; responsive populated-result visual verification pending
**Reported surface:** Storyboard Shot generation dialog

## Defect

The shared Generation result expands to the full dialog width. A portrait
Storyboard frame therefore dominates the viewport and pushes prompt, engine,
approval and close actions too far apart.

## Required behavior

1. Keep the shared Generation result, action bar and existing image viewer.
2. In the Storyboard Shot dialog only, constrain the inline result to a compact
   centered preview that remains inspectable without dominating the dialog.
3. Clicking the preview continues to open the existing full-size viewer.
4. Preserve loading, error, download, detail, collection, share and approval
   actions.
5. Mobile uses the available width without horizontal overflow; tablet and
   desktop retain a stable bounded preview.
6. The compact boundary owns the media surface and its actions together. It
   must not leave a full-dialog black canvas around a small portrait tile.
7. The Storyboard approval callout spans the complete inline workflow row and
   adapts to a single-column presentation in the shared full-image viewer.
8. The approval label, explanation and button must not clip, overlap, force a
   horizontal scrollbar or wrap one word per line at desktop, tablet or mobile
   widths.

## Acceptance tests

- The dialog owns a scoped compact-preview class; shared Playground and Studio
  result dimensions do not change.
- The inline preview remains a button with the existing open-image label.
- Approval remains visible below the preview.
- Utility actions remain in their established order and the approval action is
  visually separated as the primary Storyboard command.
- Opening the shared full-image viewer preserves its metadata and actions while
  presenting Storyboard approval within the 320px detail column without
  horizontal overflow.

## Evidence (2026-08-30)

- The dimension override is scoped below
  `.cinematic-storyboard-shot-dialog__generation`; shared result CSS is
  unchanged.
- Cinematic UI regression verifies the scoped wrapper and preserved approval
  action.
- Full Web regression: 94 files / 337 tests passed; production build passed.
- Headless browser verified the rebuilt dialog and shared Generation surface.
  The current headless actor state had no resumed completed output, so final
  pixel evidence for the populated compact tile remains a manual check.

## Regression correction (2026-08-30)

- The first compact-preview implementation constrained only the image tile and
  action bar. The full-width media surface remained in place, which produced a
  large empty canvas around portrait output.
- The approval callout was also inserted into the shared two-column workflow
  grid without spanning both columns. Its fixed-width action then compressed
  the explanatory copy and overflowed the full viewer's narrow detail panel.
- The corrected contract bounds the complete Storyboard media surface, spans
  the inline approval across the workflow grid and stacks the same action in
  the existing viewer sidebar. Shared Playground and Studio dimensions remain
  unchanged.
- Targeted Cinematic and shared Generation regression passed: 2 files / 45
  tests. Full Web regression passed: 94 files / 337 tests. The production Web
  build also passed.
- Desktop route verification confirmed the scoped Storyboard dialog after the
  rebuild. Populated-result pixel verification could not be repeated safely:
  the current Project Scenes use newer Shot IDs while its retained completed
  Storyboard attempts belong to the previous Shot set. No paid Generation or
  runtime-data mutation was performed to manufacture visual evidence.
