# Shot Card Selection And Reference Preview

Status: implemented; shared-card and responsive browser checks passed 2026-09-12.
Final evidence: implementation plan 009 and requirement 020.
Owner: Cinematic shared StoryboardSequenceBoard and its source read models.
Plan: implementation-plan/009-take-review-and-shot-navigation.md.

## Before Implementation And Scope

StoryboardSequenceBoard renders a clickable cinematic-storyboard-card__media
button beside a non-clickable body. ProduceShotQueue reuses the board. User's
screenshot describes Shot cards grouped under Scene headings, not a request to
make all Scene containers clickable. Preserve existing selection/open behavior.

## Requirements

1. Make the card's image, title, description, duration, status and unused body
   area one coherent selection target in Storyboard and Produce queue variants.
   Use valid button semantics or a full-card button overlay. No nested buttons.
   Reorder controls remain separate actions and must not select/open the Shot.
   Preserve drag/reorder, visible focus, Enter/Space activation and dialog focus
   restoration currently targeting cinematic-storyboard-card__media.
2. Source preview derives from the persisted Shot videoReferenceMode, including
   current controlled updates. looks_only displays a purposeful Look Sheet icon
   tile instead of either the approved or latest generated First Frame image.
   Do not infer the mode from whether an image exists or whether a task failed.
3. Visual direction: a compact sheet/contact-sheet outline with character and
   film cues using existing Lucide icons; restrained Momelo accent treatment,
   theme-token background/border and a short localized Look Sheet label. Stable
   thumbnail dimensions, clear at queue size, no marketing decoration or fake
   rendered result. Tooltip/accessibility text identifies the reference mode.
4. Re-enabling First Frame restores the existing preview/empty-state selection.
   Disabling it never deletes an image, unapproves a still or mutates Cast. A
   looks_only Shot with missing Looks still shows the mode tile plus the proper
   unavailable/readiness status; the icon must not imply generation eligibility.
5. Reference source thumbnail is distinct from generated video output/poster.
   Preserve existing task status pills, error states, counters and selected Shot
   accent. Shared ProcessingSpinner remains visible for actual active processing;
   an unused historical still job must not masquerade as the current video job.
6. EN/TH parity, all supported themes, no clipped labels, and usable focus/touch
   targets at 390, 820 and 1440px. Keep sibling controls and layouts unchanged.

## Acceptance

Select by title, body, status, image and keyboard; reorder once without selecting
or double-opening. Test Storyboard and Produce. Test looks_only with an approved
still, no still and missing Looks; first-frame on/off, reload and Shot switching.
Assert the unused First Frame is absent from the tile, its Asset remains intact,
and the toggle does not trigger generation. Verify focus return and responsiveness.
