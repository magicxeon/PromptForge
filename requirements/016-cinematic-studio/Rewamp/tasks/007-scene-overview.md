# 007 - Scene Overview And Shot Navigation

Screen: UX06. Status: Approved for implementation. Parent tasks: T02.4
(navigation), T03.6, T05.8 (Scene scope).
Sources: [003 planning](../003-story-authoring-and-revisions.md),
[010 UX06](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic Scene/Shot organization; UX/Cinematic/QA checks per affected scope.
Depends on selected Chapter context and versioned Scene/Shot contracts. Manual Scene
editing does not wait for optional Expression crop or Environment generation.

## 2026-09-21 Chapter-To-Scene Decision

The shortest safe path is:

`Saved Chapter -> Generate Scenes for this Chapter -> review proposal -> Apply -> Scene Overview`

The Chapter page also exposes `Add Scene manually`. Do not navigate the author into
an unexplained empty Scene page. Once accepted Scenes exist, the Chapter primary
action opens them; regeneration moves to Scene Overview. There is no first-release
bulk generation across every Chapter.

The AI operation returns Scene outlines only. Shot generation remains a separate
explicit operation scoped to the selected Scene. A Scene outline includes title,
readable situation, dramatic purpose, location, time/weather, environment intent,
entry/exit state, Cast IDs and target duration. Image generation, Look selection,
Shot creation and provider dispatch are out of scope for this operation.

Chapter navigation derives accepted counts from persisted Chapter production data.
It shows `N Scenes`, `N Shots`, `Shots not planned`, pending proposal and stale
Chapter-source states without counting unaccepted proposal items as completed work.

## State And Safety Rules

| State | Required behavior |
|---|---|
| Empty Chapter prose | Generate is disabled with a readable reason; Manual remains available |
| Unsaved valid Chapter | Save first, then generate against the resulting active revision |
| No accepted Scenes | Generate or Manual are both available |
| Pending proposal | Persist and reopen Review/Discard; do not dispatch again automatically |
| Chapter changed after proposal | Block Apply as stale and preserve the proposal for comparison/discard |
| Accepted Scenes exist | Chapter opens Scene Overview; regeneration lives in that workspace |
| Regeneration affects Scene with Shots/Takes | Preserve IDs and all production evidence; show impact and mark continuity review |
| Interrupted or failed AI request | Stop loading, retain current Scenes and expose retry; never auto-submit |

## Scope And Ownership

Build a new authoring navigator and Scene prose overview under Cinematic components.
Reuse stable Scene/Shot selection, current manual-storyboard/order commands and
existing Scene direction proposal owner. Do not repurpose or restyle the protected
`ProduceShotQueue`/queue variant of `StoryboardSequenceBoard` for this layout.
Reference/Environment selection opens packet 006. Shot text editing opens packet 008.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW06.00 | Add Chapter handoff, actual Scene/Shot metadata and Scene-only proposal/apply/discard contracts. | Selected Chapter only; pinned revision; no hidden Shots; pending/stale/retry states | Complete |
| RW06.01 | Build Scene navigator, title/context prose and concise ordered Shot summary rows. | Whole-row selection; stable labels/IDs; no per-attribute Shot form or nested buttons | Complete |
| RW06.02 | Connect manual add/edit/reorder using canonical versioned commands. | Manual Scene starts without a hidden Shot; preserve Takes; adjacent continuity impacts shown; keyboard reorder | In progress: add/edit complete; reorder deferred |
| RW06.03 | Connect explicit Scene proposals, then separate per-Scene Shot proposals returning readable Shot documents and scoped Apply. | Location/time groups Scene; Scene Apply creates no Shots; later Shot generation preserves gaze/causal order/dialogue budget | In progress: Scene proposal complete; Shot proposal deferred |
| RW06.04 | Link Environment, selected Shot writer and Chapter return navigation. | Correct IDs across back/refresh; no asset/image prerequisite to manual writing | In progress: Chapter and existing Shot links complete; Environment deferred |
| RW06.05 | Verify empty/manual/proposal states and apply Scene layout feedback. | S04-S07/R01/R07/R08; no-person Scene and three responsive widths | In progress: focused automation and responsive review complete |

## First Review And Closure

Review RW06.01-RW06.02 on one Scene with three Shots, then add a second Scene. Test
continuity warnings without deleting outputs. AI proposals are a later increment of
this same packet. Planned group: `rewamp-scenes`; extend `rewamp-story` only for the
changed planning output. Preview a Shot navigation target with agreed fixtures until
the live writer is ready, and label that implementation gap in evidence.

## Feedback And Evidence

Implemented on 2026-09-21 through the canonical Cinematic application service,
repository record and React feature boundary. The delivered increment includes:

- selected-Chapter AI Scene proposal, persisted review/apply/discard and stale
  revision rejection;
- manual Scene creation and versioned Scene outline edits without hidden Shots;
- accepted Scene/Shot counts plus pending/stale state in Chapter navigation;
- a Scene Overview with whole-row Scene/Shot navigation, readable empty states and
  explicit regeneration impact; and
- preservation of stable Scene IDs, Shots and production evidence when a proposal
  updates an existing Scene order position.

Focused evidence:

- `node scripts/test-cinematic-video.js rewamp-scenes`: 12 backend and 6 UI tests
  passed, including stale proposal rejection and Shot evidence preservation.
- `tsc --noEmit --incremental false -p web/tsconfig.app.json`: passed.
- `node scripts/verify-cinematic-rewamp-scenes.mjs`: TH/EN passed at 390, 820 and
  1440 px with no horizontal overflow or browser page errors.

Scene reorder and Environment entry remain explicit later tasks above. Per-Scene
Shot proposal/document generation is delivered by the Scene-to-Shot increment
below; media generation remains outside this screen.

## Scene To Shot Authoring Increment

The selected Scene owns the next authoring action. A creator may generate a
reviewable ordered Shot proposal for that Scene or add one manual Shot. Generation
must stop at text authoring: it must not generate a First Frame, Video, Take, quote
or Credit reservation.

Applying a proposal preserves an existing Shot ID at the same order position and
therefore preserves its historical Takes, approved sources and media evidence.
Existing Shots beyond a shorter proposal remain present and are marked for review;
they are never silently deleted. A proposal becomes stale when either the selected
Scene version or its Chapter revision changes.

The Scene Overview presents Generate/Regenerate Shots and Add Shot in the selected
Scene's Shot section. It shows the proposed duration and readable document excerpt,
states the preservation impact, and requires Apply or Discard before another
proposal can be created. Applying or creating a Shot may open the single Shot
Writer. Existing Scene editing and Chapter navigation remain unchanged.

Focused deterministic evidence on 2026-09-21: `node scripts/test-cinematic-video.js rewamp-shots`
passed 14 backend and 6 UI tests.
Provider calls were mocked and no Generation, Credit or media operation ran.

### 2026-09-21 - Chapter Scene recipe loader correction

The Chapter-to-Scene prompt recipe now uses the canonical `instructions` array
required by `loadPromptRecipe`. A focused policy test loads this exact recipe and
checks its Scene-only and continuous-location/time direction. This closes the
`Prompt Recipe is invalid: cinematic/chapter-scenes.v1.json` failure before provider
dispatch without changing the Scene generation workflow or prompt intent.
