# 005 - Character Text Dossiers

Screen: UX04. Status: Planned.
Parent tasks: T03.1 (dossier scope), T03.3 (role proposal scope), T03.5 (Character scope).
Sources: [003 dossiers](../003-story-authoring-and-revisions.md),
[004 Looks](../004-production-assets-and-reference-planning.md),
[010 UX04](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic role/dossier authoring; UX/QA review.
Depends on stable role IDs and Story baseline commands from packets 001/004.
Text dossier preview/edit can be developed independently of generated image assets.

## Scope And Ownership

Latest presentation/usage contract: [011](../011-story-chapters-and-shared-characters.md).
Deliver this scope through shared contextual Characters panels on Full Story and
Chapter, coordinated by [packet 012](012-story-chapter-character-integration.md).
Early Look selection/generation is optional; confirmation recommends finalization.
There is no mandatory separate dossier page or return-to-Full-Story step to add a
Character discovered while writing a Chapter.

Use one name/identity control and readable dossier text in the Story context. Reuse
existing provisional dossier materialization and Cast upsert commands. The page
must not create a reusable Profile or generate a Look just to save a Character.
Keep existing role bindings through text edits. New local presentation belongs in
Cinematic components; shared role/application schemas are coordinated with packet 001.
Actual Look/Expression binding remains packet 006 and existing asset owners.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW04.01 | Build Character list and single-dossier writing panel with draft/finalized state. | Readable text-first view; no empty media wall; return to same Chapter and focus | Planned |
| RW04.02 | Connect manual add/edit/remove through versioned role commands and show affected scope. | Role IDs stable; main/background intent explicit; preserve referenced media and historical bindings | Planned |
| RW04.03 | Present Analyze Roles proposals as Characters, apply explicitly, and link accepted dossiers to Finalize Looks. | Visibly distinct from Enhance prose preview; stale proposal cannot overwrite; no image dependency for story | Planned |
| RW04.04 | Verify draft-only story, role updates, panel navigation and visual states. | S01/S02, R03/R07/R08; cross-actor isolation; all three widths and locales | Planned |

## First Review And Closure

Demonstrate two editable text Characters before Full Story confirmation, then the
same IDs with Finalize Looks available after confirmation. Editing a name or
appearance must not trigger paid regeneration.
Planned group: `rewamp-dossiers`; extend provisional-dossier and role-analysis
assertions in the existing Story group where backend behavior changes. Review text
wrapping and panel focus independently of image quality.

## Feedback And Evidence

No implementation yet. Record dossier IDs, text-only save/confirm evidence, role
proposal screenshots and return navigation. Do not mark final Look selection
complete here; it belongs to packet 006.
