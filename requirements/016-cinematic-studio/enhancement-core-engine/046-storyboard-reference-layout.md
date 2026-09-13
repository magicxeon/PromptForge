# 046 - Storyboard Reference Image Layout

Status: Scoped reference presentation implemented and isolated component/browser
validation passed (2026-09-13). No paid/live-data UAT performed.

Scheduling: [050](050-pilot-stability-consolidated-plan.md) includes this scoped
layout work in the final UX pass of the consolidated pending round. This replaces
the earlier parked scheduling label, not the preservation rules below.
Parent owns master 050, all prompt work and GenerationExperience. This pass owns
StoryboardShotDialog, SceneEnvironmentControl, opt-in ReferenceSlotGrid presentation,
scoped styles/localization and focused component/browser tests. No master 050 edits.

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

Execution plan (UX/UI primary; sequential QA, no independent review):

- Task 1 baseline complete: current real Shot modal browser runner passed EN/TH
  at 390/820/1440 with themes/tabs/prompt/processing/failure. Attached Shot 3 image
  is unavailable in this execution context; inspected canonical Momelo references
  and current modal screenshots instead. No exact screenshot-match claim.
- Tasks 2-4 complete: added a controlled opt-in row presentation wrapper to the reference
  region, named Cast previews from the existing immutable generation binding,
  Scene compact presentation and readable style labels. Keep canonical count and
  submission unchanged. Keep all processing warnings and authority information.
- Task 5 complete: extended directed-openings runner with reference-layout component group;
  extend existing verify-storyboard-shot-workspace.mjs with an explicit references
  mode. Run small groups, then intercepted browser checks using existing Vite
  at http://127.0.0.1:6501. No live API mutation, paid call or server restart.

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

Implemented through existing owners:

- StoryboardShotDialog wraps only its modal reference region in ReferenceRows;
  embedded Simple presentation and all sibling regions retain their defaults.
  Named rows use cinematicCastReferences order/IDs. Generated preview matching
  checks generation ID and content hash; Character Look previews use the bound
  immutable profile/Look/version route. Missing previews retain named fallbacks.
- ReferenceSlotGrid exports a controlled presentation-only ReferenceRows wrapper.
  Existing count, value, authority, callbacks and submission remain unchanged.
  Cast/style processing status moves into its corresponding row; overall warning,
  unmatched role and authority information remains in ReferenceProcessingPreview.
  The opt-in pending state uses ProcessingSpinner and retains existing images.
- SceneEnvironmentControl has an opt-in compact row. Scene name, contained image,
  select/change button and toggle stay together. OFF retains the selected image
  with an explicit localized inactive label. Existing gallery/mutations are unchanged.
- references.css and cinematic.css constrain 80x64 previews (64x64 in panels under
  300px), with contained images and container-width layout. EN/TH add three
  functional label keys; no new locale namespace or user-data localization.

Focused evidence, all passed:

```powershell
node scripts/test-cinematic-directed-openings.mjs reference-layout
# 24/24: existing shared chooser and Shot dialog tests + named rows/status/count,
# Scene OFF/ON, empty state, gallery reuse, unsaved edits and error preservation.
node scripts/verify-storyboard-shot-workspace.mjs references
# EN/TH, 390/820/1440, all three themes, portrait/landscape containment,
# equal preview boxes, named read-only Cast, long text, missing preview,
# keyboard toggle, 4-to-3 active count with OFF image retained, processing/errors.
node scripts/verify-storyboard-shot-workspace.mjs
# Existing full Shot modal: tabs, unsaved editor, result/approval, prompt,
# sticky Generate, processing/failure, EN/TH and all viewport/theme combinations.
node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false
# Passed.
```

Scoped git diff --check passed. Parsed the three new EN/TH keys and confirmed
interpolation parity. Reviewed desktop Pearl and mobile Thai screenshots, including
complete portraits/landscape, wrapping and controls. Reference screenshots:
`C:/Users/punya/AppData/Local/Temp/mpf-shot-workspace-NhZje2`; adjacent Shot dialog:
`C:/Users/punya/AppData/Local/Temp/mpf-shot-workspace-fVsrx6`.

Browser checks used an existing Vite server at http://127.0.0.1:6501 and intercepted
all APIs/media. Unexpected API/mutation/network requests fail closed. No app server
or worker restart, paid generation, persisted user-data mutation, new runtime data
path, provider payload/order/price change, file move or new source file. No changes
to GenerationExperience, master 050, stage/application/prompt compiler owners.

Review was sequential, not independent. The original Shot 3 attachment was not
available, so exact visual comparison with that attachment remains unverified.
Production-provider and live gallery UAT were intentionally not run; isolated
gallery component regressions and adjacent workflow checks passed. Parent owns
cross-workstream integration and any later full release aggregate.

### Scoped Catalog Follow-Up

Removed the repeated agent-added environment enabled/gallery/refresh/loading/
empty/select/more block from EN and TH, retaining each value once. The owning
`test/cinematicReferenceLocalization.test.js` uses TypeScript's JSON AST to inspect
raw object keys before JSON.parse, including a nested-duplicate fixture, and
checks EN/TH key and interpolation parity. Run:
`node scripts/test-cinematic-directed-openings.mjs reference-localization` (1/1
passed). No source/UI behavior or sibling catalog values changed.

The whole catalogs are NOT duplicate-free: comparison against HEAD confirmed
13 EN and 16 TH pre-existing duplicate keys outside this scope. Shared debt is
enhance.generateStory/applyStory/rolesPreserved, roles.source/empty/operationTitle/
operationDescription/generate/apply/applyNote, and save.idle/saved/failed (all
prefixed cinematic.). TH additionally duplicates produce.modelAuthorizationTitle,
produce.modelAuthorizationDescription and produce.sourceCheckModel. The focused
check explicitly reports this baseline debt and rejects other duplicate keys;
it does not silently equate parsed parity with raw uniqueness. These baseline
entries remain unchanged per the scoped preservation instruction.

Parent reports its latest full pilot browser passing EN/TH at 390/820/1440 after
the harness FeaturePolicyProvider update. This follow-up did not rerun browsers
or start/restart a server; the scoped browser evidence above remains applicable.
