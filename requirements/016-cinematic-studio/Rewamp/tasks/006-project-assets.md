# 006 - Project Assets And Final Looks

Screen: UX05. Status: Planned. Parent tasks: T04.1, T04.2, T04.3, T04.4, T04.5, T04.6, T04.7.
Sources: [004 assets/references](../004-production-assets-and-reference-planning.md),
[010 UX05](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic bindings/UI; Assets, Profiles and Reference Processing keep authority.
Depends on RW00.05 binding scope and stable dossier/Scene IDs. Finalize Looks uses
the accepted Story baseline. Existing-Look selection can ship before crop/multiview work.

## Scope And Ownership

Build one category-filtered Assets destination using `GeneratedCastDialog`, Profile
Look selection and `SceneEnvironmentControl` contracts. Reuse existing Asset storage
and generation; no separate gallery repository or image cache. New Cinematic bindings
go through its public facade. Category and owner filtering happen before pagination.
Shared API/config changes are coordinated with packet 001; Render host extraction
is packet 009. This packet passes explicit asset context to the existing image Render.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW05.01 | Build category navigation, bounded thumbnail list and selected-asset detail. | Correct categories, empty/error/history states; no unrelated images in Look chooser | Planned |
| RW05.02 | Connect project Looks, Chapter/Scene/Shot override selection and dossier handoff. | Explicit identity binding; optional recurring background Looks; own-Look authority preserved | Planned |
| RW05.03 | Connect Character-bound Expression parent sheet, 12 configured slots and selected-slot intent. | One same-Character parent; missing Expression advisory; template/locale parity | Planned |
| RW05.04 | Implement crop selection/correction and immutable derivative reuse through Assets. | Correct bounds/lineage; no paid AI crop; malformed grid can be corrected | Planned |
| RW05.05 | Recompose Environment master/view/state selection and optional Hero Prop bindings. | One environment view sufficient; OFF retains asset; recurring Prop state remains explicit | Planned |
| RW05.06 | Connect Generate actions to existing image Render and reference planner capacity/order summary. | Exact originating binding on return; explicit result selection; no silent reference drop or automatic paid retry | Planned |
| RW05.07 | Verify owner/category boundaries, references and responsive asset interactions. | A01-A06/R07/R08; keyboard crop/selection, long names and all three widths | Planned |

## First Review And Closure

Review RW05.01-RW05.02 first using existing Look assets. Then Expressions, crop tools
and Environment/Props can be inspected in separate increments. Use real authorized
fixtures for thumbnails; tests use isolated image bytes. Paid image quality is a
separate pilot, not a side effect of viewing Assets.
Planned page group: `rewamp-assets-ui`; extend existing `rewamp-assets` contract
tests for bindings/crops and `references` only if payload authority changes. Provider
dispatch and billing reviews apply if an integration changes those boundaries.

## Feedback And Evidence

No implementation yet. Log which category/subtask was reviewed, parent/derivative
fixture IDs, reference manifest evidence and outstanding Render integration. Avoid
redesigning Engine/Render/Queue to make the Assets panel fit.
