# Cinematic Rewamp Delivery Master

Status: runtime implementation in progress behind `CINEMATIC_REWAMP_ENABLED`;
P00/P01/P02 foundations are partially implemented. Updated: 2026-09-20.

Owner: Cinematic Studio. Primary role: Product Requirement Architect.
Review lenses: UX/UI Product Designer and Cinematic Experience Director, applied
sequentially by the same agent. This is not independent multi-agent sign-off.

## 1. Outcome And Scope

Make a short film or mini series from a brief in one organized Project. Creators
can understand the next action without learning the six current internal stages.
One Shot represents one clip; existing Generation, Credits, media, Takes and
continuity capabilities remain the execution foundation.

The latest design update covers all authoring screens in 010. Runtime foundations
are partially implemented; UX01 Project Library and UX02 New Project are implemented
and under user review, while the remaining replacement screens stay planned. The user's branch permits
targeted replacement and cleanup during subsequent implementation. That permission does
not make live media, user work, financial evidence or active legacy consumers
disposable. Code retirement has explicit checkpoints in Part 08.

## 2. Reading And Ownership Map

2026-10-02 shared selector addendum:
[Shared Generation Options UX](../../009-migration-to-react/021-generation-options-ux.md)
maps Cinematic Produce, Shot Video, Environment, First Frame, Look Sheet and bulk
selectors to shared presentation variants. It supersedes exact Engine UI
preservation only for the controls and relocations named in that inventory.
Render/results, Take actions, Queue, reference authority and commercial behavior
remain protected. Shared selectors are implemented with focused checks passed;
actual Cinematic parent-screen UAT remains explicit in its inventory/evidence.
This does not reset historical task completion or authorize unrelated screen changes.

[018 Project Brief and navigation visual refresh](018-project-brief-and-navigation-visual-refresh.md)
owns the scoped Story/Characters navigation, Brief authoring surface and readable
Format/Orientation choices. Existing routes, settings and generation contracts stay unchanged.
Its latest BV05 replaces the earlier 75/25 tabs with a compact Project Header and
one Characters / Back to story link. References to the old ratio below are historical.

2026-10-01 implementation addendum:
[017 Project Characters and bulk consent](017-project-characters-and-bulk-consent.md)
records the confirmed Look unlink/import, mandatory bulk Credit confirmation,
Chapter Outline navigation and separate Story/Characters destinations. Its
[task packet](tasks/017-project-characters-and-bulk-consent.md) contains PC01-PC09,
including the added First Frame preview beside Shot direction and timeline (B6).
It supersedes embedded right-panel Character settings and bulk consent opt-out,
not single-operation preferences or protected Engine/Render/Queue behavior.
Story/Characters buttons are 75/25 in width; their pages are separate. The reported
First Frame Look-selection issue is user-resolved, not pending implementation.
Implementation and focused deterministic/browser checks are delivered. Task 017
records source ownership, selectable test groups, review evidence and remaining
live/provider UAT; no paid generation or live Project mutation was performed.

2026-09-27 confirmation addendum:
[016 Writer tools and Generation confirmation](016-generation-confirmation-and-writer-tools.md)
owns native-textarea preservation, Full Story tool tabs, regeneration confirmations
and shared Credit consent with actor-profile opt-out. Contains ordered tasks and
focused validation commands; does not alter billing or settlement.

2026-09-27 flow-hardening addendum:
[015 Cinematic flow hardening](015-cinematic-flow-hardening.md) implements bounded
draft recovery, Writer/Render selection continuity, advisory readiness, partial
reference export and Chapter Final review. Its [task/evidence packet](tasks/015-cinematic-flow-hardening.md)
owns focused checks and integrated UAT. Earlier Planned labels are historical;
they are not evidence that these shipped slices need a second implementation.
Live provider quality and full migration/release closure remain separate.

2026-09-26 authoring addendum:
[014 Authoring continuity and portable production](014-authoring-continuity-and-portable-production.md)
owns the requested Chapter/Scene reordering, continuity-context refinement,
Project video direction, external Shot handoff, portrait consistency, editorial
Look Sheet and scoped reading UX. Core implementation and focused checks are recorded
in its task packet; empty-instruction revision affects only the selected Chapter.
Remaining visual/model qualification is explicit. It does not reopen Advanced mode
or authorize a redesign of Engine, Render and Queue.

| Document | Owns | Implementation parts |
|---|---|---|
| [001 Structure and Draw.io mapping](001-cinematic-studio-rewamp-structure-and-drawio-mapping.md) | Existing inventory and original diagram mapping, with reconciled decisions | All |
| [002 Contracts and configuration](002-project-contracts-and-configuration.md) | Hierarchy, canonical owners, configuration, migration and API rules | P01, P02 |
| [003 Story authoring](003-story-authoring-and-revisions.md) | Provisional dossiers, Full Story, revisions, Scene/Shot planning | P03 |
| [004 Production assets](004-production-assets-and-reference-planning.md) | Final Looks, Expressions, Environments, Hero Props and reference selection | P04 |
| [005 Shot production and final](005-shot-production-and-final.md) | Preparation, images, video, Takes, continuity and Chapter exports | P05, P06 |
| [006 UX/UI specification](006-ux-ui-workspaces-and-interactions.md) | Screens, wireframes, actions, responsive layout and states | P02-P06 |
| [007 Implementation plan](007-step-by-step-implementation-plan.md) | Ordered small tasks, prerequisites, outputs and review gates | P00-P08 |
| [008 Verification and retirement](008-verification-migration-and-cleanup.md) | Acceptance matrix, selective tests, UAT, rollout and deletion ledger | P07, P08 |
| [009 Single-mode writer Shot authoring](009-single-mode-writer-shot-authoring.md) | One authoring mode, canonical Shot document, writer-first editor and removed complexity | P02, P03, P05, P08 |
| [010 Complete screen redesign](010-complete-authoring-screen-redesign.md) | Project entry through Shot authoring, full screen inventory/wireframes and protected Engine/Render/Queue boundary | P00, P02-P08 |
| [011 Story, Chapters and shared Characters](011-story-chapters-and-shared-characters.md) | Chapter recovery, regeneration/revisions/AI Assist, shared Characters and Looks, UX and acceptance | P03, P04 |
| [tasks/000 Screen delivery index](tasks/000-task-index.md) | Page-owned work packets and the 012 Story/Chapter/Character integration extension | Decomposes existing P00-P08 scope |

Priority: user-confirmed decisions below, then the owning numbered specification,
then 001 inventory, then the Period profile and original examples. Documents own
different rules; do not implement duplicate policies from overlapping prose.
011 is the latest scoped authority for Full Story, Chapter revisions/regeneration
and shared Character panels. It permits optional Looks during writing and extends
revision retention to individual Chapters. Current delivery evidence is in the
screen task packets; the original plan is not a runtime status inventory.
010 supersedes earlier layout proposals that recompose the existing Render, Engine
or Queue. 009 still owns the single Shot document and one-mode authoring contract.
Both original Period files remain in place. The `.txt` is preserved source input,
not a second active specification. Its accepted additions are mapped into 003-005.

2026-09-25: 009 section 13 is the latest scoped authority for Shot Character/speaker
binding, shared voice direction and a separate creator Video Prompt section. The
script stays canonical while focused binding controls are permitted. Task 008
records inspected runtime foundations and SD01-SD07 remaining work; task 009 records
the existing First Frame entry and the still-planned video handoff. Older blanket
"no speaker controls" and "all compiler work planned" wording is superseded.

## 3. Confirmed Decisions

| ID | Decision | Owner |
|---|---|---|
| D01 | Project -> optional Season -> Chapter -> Scene -> Shot. One Chapter is valid for Movie, Mini Series or demo. | 002 |
| D02 | Text dossiers first; optional Looks during writing; recommend finalization after confirmation. Share Characters across Full Story and Chapters. | 011, 003, 004 |
| D03 | First Frame is optional and recommended. Seedance 2.5 users may select composition + Looks or Looks only, subject to actual adapter capability. | 005 |
| D04 | Default dialogue target is at least 60% of dialogue-driven Scene duration. Action, montage, establishing and atmosphere Scenes are exempt. User overrides remain possible. | 003 |
| D05 | Expression parent sheet: 3 columns x 4 rows, 12 named slots; deterministic crops; identity remains with Character Look. | 004 |
| D06 | Reference priority: selected composition/First Frame, Character Looks, Expressions, Environment. Required Character identities are never silently dropped. | 004 |
| D07 | Background/supporting Looks are optional; recommend for important or repeated appearances/speaking. Main identity-bound Characters use Looks. | 004 |
| D08 | Object generation is for recurring story-critical Hero Props. | 004 |
| D09 | Full Story and each Chapter retain an active head plus 10 previous revisions by configurable rotation. Production evidence stays separate. | 011, 003 |
| D10 | Scene groups continuous location/time; changed camera or event alone does not create a new Scene. | 003 |
| D11 | Preserve original `.txt`, examples and Draw.io; updated Markdown is the implementation source of truth. | 000, 008 |
| D12 | The Rewamp exposes one authoring mode only. There is no Simple/Advanced switch or separate expert Shot editor. | 009 |
| D13 | One versioned timeline-oriented `shotDocument` is the user-authored Shot source; structured execution data and provider prompts are derived projections. | 002, 005, 009 |
| D14 | The Production screen is writer-first and keeps only writing, references, optional First Frame, generation, Takes and status/estimate functions. | 006, 009 |
| D15 | Redesign all Cinematic authoring screens from Project entry to Render handoff; preserve existing Engine & Target Output, Render/results, Take actions and both Shot/Generation queues. | 010 |
| D16 | Shot participants and dialogue speakers bind to existing Scene/Project Cast IDs. Shared voice direction belongs to the Character; local emotion/delivery belongs to the Shot. | 009 section 13 |
| D17 | Show a separate creator-readable Video Prompt with a directly editable Shot-local override, explicit reset and source-change review. Raw technical packets remain administrator/support-only. | 009 section 13 |

D09 now includes per-Chapter prose per 011. It does not extend rotation to
Character, Shot, media, Takes or audit retention.

## 4. Design Defaults Adopted For Planning

- Project navigation now uses separate Story / Characters destinations per 017.
  Story retains authoring, Production and Final entry paths; Project Assets and
  existing Engine/Render/Queue behavior remain available. The old three-workspace
  proposal does not override the new top-level separation.
- Redesign Project entry, brief, Story/Chapter/dossier, assets, Scene and Shot writing.
  Open protected existing Render from the active Shot and restore its context on return.
- Shot authoring uses one writer-first timeline document; no contextual expert form
  or Advanced mode remains. Raw technical prompts remain administrator/support-only,
  including server response authorization.
- Environment starts with one master image. Additional consistent views are
  optional and demand-driven; selected views, not an entire collage, guide Shots.
- AI edits are scoped proposals with Apply. Structural rewrite is explicit.
- Story settings, templates, defaults, limits and prompt policies are configurable;
  authorization, Credit integrity and actor isolation are fixed invariants.
- Preserve old deep links only as temporary compatibility adapters until the writer
  workspace has verified generation/recovery parity; then retire both Simple and
  Advanced presentation branches.
- No new whole-film autopilot, generic Agent framework, database migration,
  durable chat system, pricing changes or unimplemented post-processing suite.

## 5. Delivery Order And Status

| Part | Deliverable | Depends on | Status |
|---|---|---|---|
| P00 | Baseline fixtures, contract matrix and focused verification entry | None | In progress: focused runner added; baseline metrics/fixtures remain |
| P01 | Project/Chapter compatibility, config and bounded contracts | P00 | In progress: validated config and additive root/Chapter projection implemented |
| P02 | Three-workspace shell, writer workspace and reusable production controller | P01 | In progress: gated workspace navigation implemented; prior mode assumptions must be replaced per 009 |
| P03 | Story, dossiers, Full Story revisions and scoped planning | P01, P02 | In progress: provisional text dossiers implemented; revision/editor work remains |
| P04 | Shared asset library, Expressions, Environment and Props | P01, P03 identity contract | Planned |
| P05 | One Shot document, image/video workflow and automatic preparation | P02-P04 | Planned |
| P06 | Chapter review, selected Takes and existing export operations | P05 | Planned |
| P07 | Cross-part regression, migration rehearsal and pilot UAT | P03-P06 | Planned |
| P08 | Default cutover and verified obsolete-code cleanup | P07 | Planned |

Milestone A: P00-P03, story authoring works without generating images.
Milestone B: P04-P05, one Chapter can produce and review its first clip.
Milestone C: P06-P08, Chapter export, migration and cleanup complete.

Each part updates its evidence before the next dependent part begins. A document
being written is not evidence that its feature works. See 007 for task-level
outputs and 008 for test groups; no full test sweep after every small edit.

For page-by-page work, start at [the task index](tasks/000-task-index.md).
Its narrower contract prerequisites allow a page to be built and reviewed before
all tasks in a parent phase are complete. Parent milestones still require their
full mapped scope. Each page's feedback and implementation evidence stays in its
own task packet; the 53 parent tasks are not duplicated as additional features.

## 6. Acceptance For This Planning Delivery

- Every confirmed decision has one owning document and testable acceptance IDs.
- UX includes minimal default controls, error/recovery and three viewport layouts.
- The Rewamp has one writer-first authoring mode and no per-attribute Shot form.
- Every implementation part names reused modules, dependencies and validation.
- Legacy hierarchy, original files and live media have an explicit migration path.
- Configuration values are separated from provider capabilities and billing rules.
- Runtime status remains Planned until code and required checks are complete.

Evidence: repository/module inspection, original Draw.io node inspection, sequential
UX/Cinematic document review and scoped Markdown/link/whitespace checks. No runtime
tests, provider calls, migration or UI implementation are part of this delivery.
