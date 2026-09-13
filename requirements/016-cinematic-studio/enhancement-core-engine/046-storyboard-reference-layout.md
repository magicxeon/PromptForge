# 046 - Storyboard Reference Image Layout

Status: Planned / parked, documentation only (2026-09-13).
Implementation and runtime validation have NOT started.

## Outcome And Scope

Make the Storyboard Shot dialog's reference images section orderly, readable and
professional within the existing Momelo theme. Visual input is the user-attached
Shot 3 screenshot from this request; no repository attachment path is assumed.

Exact scope: `.cinematic-dialog__content.cinematic-storyboard-shot-dialog`,
Image settings tab, reference images section only. Current issues are uneven
thumbnail sizes, an isolated Scene reference row, a narrow oversized style card,
detached duplicate Character badges and inconsistent control alignment.

This refines presentation in [037](037-faceless-previs-and-shot-workspace.md) and
[044](044-scene-environment-generation.md). Their working behavior remains
authoritative. Prompts, provider qualification, pricing, source expiry policy
and approval rules are not reopened.

## Ownership

- Document primary: Product And Requirement Architect. Future implementation:
  UX/UI Product Designer, followed by QA review. No independent review is claimed.
- Applicable UX Skill: `.agents/skills/review-product-ux/SKILL.md`.
- Follow `requirements/Knowledge/ui-design-system-and-visual-language.md`.
- Cinematic owns Shot context and selection; Generation owns shared reference
  presentation/submission; Reference Processing owns authority/order/validation.
- Reuse `StoryboardShotDialog`, `SceneEnvironmentControl`, `GenerationExperience`
  and `web/src/components/generation/ReferenceSlotGrid.tsx`. Extend their public
  presentation contracts with an opt-in compact layout as needed. Do not create
  a parallel reference pipeline, storage path or global layout change.

## Layout Requirements

1. Use consistent compact reference rows for Scene, named Character/Look Sheet
   and style/previous-Shot sources. Align thumbnail, source name, role, status
   and existing controls. Keep the section unframed; avoid nested cards.
2. Use stable responsive thumbnail boxes with contained fitting. Show complete
   portrait, landscape and Look Sheet images without stretching or cropping
   useful details. Retain existing preview actions where available.
3. Identify each bound Character by name and role with its available authorized
   preview, not only repeated generic identity badges. Missing previews have
   stable fallbacks without collapsing the row.
4. Keep Scene select/change and enable controls together with its thumbnail.
   Disabled selections stay visible and clearly inactive; switching OFF must
   not clear the selected image.
5. Use readable names for style/previous-Shot sources. Raw Job IDs belong in
   secondary details or accessible tooltips rather than dominating the card.
   Long names wrap or truncate accessibly without displacing controls.
6. Consolidate redundant detached role badges into their reference rows without
   losing authority, processing, error or warning information from
   `ReferenceProcessingPreview`.
7. Show active-reference count and model limit in the heading, derived from
   canonical enabled-reference state. Disabled Scene selections do not consume
   active count. Display must agree with submitted references.
8. Adapt to the actual panel width, not viewport width alone. Prefer readable
   stacked rows in the narrow desktop right pane over a viewport-driven
   three-column grid. Controls wrap predictably at smaller sizes.
9. Use Momelo tokens, existing Lucide icons, localized functional labels and
   accessible tooltips. Preserve consistent control sizes and spacing. Do not
   add tutorial or implementation explanation text to the interface.

## State And Preservation Rules

| State | Required behavior |
| --- | --- |
| No Scene selection | Existing selection action remains visible and operable. |
| Selected and enabled | Preview, source identity, enabled state and active count agree. |
| Selected but disabled | Keep preview/selection visible, clearly inactive; exclude from submission. |
| Bound Cast | Each source is named; preserve read-only authority and existing edit entry points. |
| Processing | Shared ProcessingSpinner and accessible status; retain images and duplicate prevention. |
| Missing preview/error | Stable fallback and existing error/recovery controls; never silently remove references. |
| Long text/narrow pane | Readable wrapping or accessible truncation; no overlap, clipping or horizontal overflow. |

- Presentation grouping must not change provider reference order, identity
  mappings, source authority, payload, fingerprints, estimates or billing.
  Any displayed reference index must match the canonical submitted index.
- Preserve actor authorization and authenticated previews. No new public URLs,
  client Base64 persistence or additional polling is needed.
- Preserve the Scene gallery, cross-Scene reuse and toggle semantics from 044.
  Do not introduce remove/upload/toggle actions for read-only Cast references.
- Preserve left result preview, download/share/collection actions, approval,
  Edit Shot, all three tabs, Engine controls, Natural Realism, facial treatment,
  sticky estimate/Generate area and established scroll behavior.
- Preserve drafts, old images, Takes, history, Simple/Advanced behavior and
  pending/error/retry states. No migration or live generation is authorized.
- Shared presentation changes are opt-in. Playground and other Generation
  consumers retain their current layout unless explicitly scoped later.

## Ordered Implementation Tasks

All tasks are pending and require a later implementation instruction.

1. Inventory current reference sources, authorized preview data and controls;
   record narrow-panel and adjacent working states. Resolve display data through
   existing public contracts only.
2. Implement the scoped compact row presentation using existing components,
   preserving Scene gallery/actions and defaults for other consumers.
3. Connect named Cast previews, Scene active/inactive state and readable style
   labels to the same canonical reference context and count used for submission.
4. Complete localization, keyboard/focus behavior, loading/error fallbacks and
   responsive constraints. Review the diff for unrelated sibling UI changes.
5. Run focused component and browser layout checks in small groups; record
   evidence before closing. No paid generation or worker restart is needed.

## Acceptance And Verification

- With two Characters, one style image and an optional Scene image, every
  reference is independently identifiable with aligned previews and controls.
- Scene OFF retains the selected preview while count/payload exclude it; ON
  restores use. Read-only Cast sources cannot be accidentally removed.
- Portrait/landscape sources, long EN/TH labels, missing images and pending/error
  states remain usable within the existing themes.
- Verify approximately 390px, 820px and 1440px, including the narrow desktop
  right pane. No overlap, clipping, horizontal overflow or inaccessible controls;
  sticky generation actions and keyboard focus remain predictable.
- Extend existing owning component tests and the selectable Cinematic browser
  runner. Verify references plus adjacent Scene selection, tabs, generation and
  approval controls, and unchanged shared consumers.
- Record exact commands/prerequisites during implementation. Use fixtures and
  intercepted responses, not paid provider calls. Keep aggregate runs explicit.
- Rollback removes only opt-in presentation changes; no reference data, prior
  results or persisted selections are deleted.

## Current Evidence

Requirement recorded only. No UI/code/config changes, tests, builds or paid
generation for this request. Implementation and visual UAT remain pending.
