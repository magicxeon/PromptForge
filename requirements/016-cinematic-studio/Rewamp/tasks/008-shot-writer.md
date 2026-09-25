# 008 - Single Shot Timeline Writer

Screen: UX07. Status: In progress; code/requirement reconciliation 2026-09-25.
Parent tasks: T01.6 (document consumer), T02.4 (editor), T05.1, T05.2, T05.5, T05.8 (writer scope).
Sources: [009 document contract](../009-single-mode-writer-shot-authoring.md),
[010 UX07](../010-complete-authoring-screen-redesign.md),
[Shot example](../Example/shot-example.txt), [task index](000-task-index.md).
Owner: Cinematic authoring/compilation; Generation and References retain execution.
Depends on RW00.05 and stable Scene/Shot selection. Fixture editor can be inspected
before compiler integration; live Render waits for a saved/prepared document.

## Scope And Ownership

One accessible plain-text editor owns human direction. Extend the existing versioned
Shot facade/API/schema, actor drafts and compiler adapters. Reuse interval/dialogue
validation rules from existing owners when sound, but do not mount their old forms.
Keep structured execution data a derived projection. New parser/compiler helpers
belong under current Cinematic domain ownership, with no React-built final prompt.
Shared schema/config edits are integrated through packet 001. Reference chooser is
packet 006; protected Render navigation is packet 009.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW07.01 | Add additive document/version contract and deterministic legacy-field conversion against fixture copies. | Old Shot/Take/source IDs intact; no second editable truth; unknown prose retained | In progress: additive contract and compatible legacy projection |
| RW07.02 | Build single writer with readable sections/timing anchors, insert block and explicit undoable formatting. | Thai input composition/caret/undo works; no attribute panels; accept decimal and clock markers | In progress: single plain-text writer; timeline decoration remains |
| RW07.03 | Connect versioned save/autosave, actor drafts, duration reconciliation and navigation recovery. | Save failure/stale version preserves text; exact submitted duration; switching restores active Shot | In progress: explicit versioned save and route recovery; autosave/conflict comparison remains |
| RW07.04 | Parse recognized intervals and resolve deterministic preparation/reference intent through existing owners. | Bounds validated; independent overlap/holds allowed; prose semantics do not become invented hard locks | Partial: section/decimal/clock parsing exists; document speaker binding and timing review remain |
| RW07.05 | Compile still/video projections, preserve exact dialogue/action/reference authority and apply final budget checks. | No truncation; no hidden AI optimizer; quote/submission input parity; normal users lack raw payload diagnostics | Partial: opening/timeline feed existing compilers; structured dialogue and creator Video Prompt projection remain |
| RW07.06 | Connect explicit Draft/Enhance proposal/apply and compact References/First Frame/Render entry summaries. | Stale Apply rejected; actual Look mapping; opening a tool never submits generation | Partial: Scene AI Shot proposal and First Frame entry exist; Shot AI revision, bindings and video handoff remain |
| RW07.07 | Verify writing/reload/conflict/timing and responsive editor, then apply local feedback. | W01-W10 writer scope, R01/R05/R08; three widths; runtime gaps named | Partial: initial writer/visual checks recorded in 013; new dialogue workspace is not yet verified |

## First Review And Closure

The original first review was a manual text editing slice: paste the example, edit time blocks,
save, switch Shot, return, and retain text/caret. Then verify preparation and AI
proposal behavior separately. Do not require paid video generation for typography
or editor-state validation. Live Render readiness needs RW07.04-RW07.06 and packet 009.
Planned group: `rewamp-writer`. Use `rewamp-preparation`/`prompt-budget` only for
compiler changes; keep screenshot feedback independent of provider-quality evidence.

## Feedback And Evidence

Historical baseline (superseded for compiler/First Frame status by packet 013):
the first implementation slice connects Scene-level AI/manual Shot creation to the
single writer and an explicit versioned save. It does not yet parse timeline markers,
compile provider packets, invoke AI Enhance, or redesign Render. Those remain
RW07.02-RW07.06 and must not be represented as production-ready preparation.

### 2026-09-25 - Next Shot Slice: Cast, Exchange And Video Prompt

Owning product rules: [009 section 13](../009-single-mode-writer-shot-authoring.md#13-character-dialogue-and-video-prompt-workspace-2026-09-25).
Inspection confirms the opening/timeline compiler and Scene/First Frame controls
already exist. Reuse them; do not reimplement a separate Scene, Generation or
reference pipeline. No runtime changes are included in this requirements update.

Additional compatibility finding: `CinematicShotWriter.legacyShotDocument` currently
leaves dialogue blank, whereas `CinematicShotAuthoring.resolveShotDocument` converts
legacy cues but does not resolve Cast display names for their speaker IDs. The next
slice must unify the public conversion contract and preserve these lines/speakers
before allowing a legacy document to be saved as the new authority.

| Order / ID | Small deliverable and owning modules | Acceptance / review checkpoint | Status |
|---|---|---|---|
| 1 / SD01 | Extend the existing Shot facade/API/Zod contracts for explicit Scene Cast subset, visible/off-screen participants and stable speaker binding metadata. Reuse `CinematicCastCoverage`; reconcile client/server legacy-document conversion. | Save/reload preserves IDs, legacy lines and unknown prose; explicit no-Cast stays empty; invalid IDs are surfaced; no new storage owner | Planned |
| 2 / SD02 | Expose shared `dialogueStyle` voice baseline through `CinematicSeriesService` and shared Character controls; retain it when Looks/Character sources are updated. Snapshot effective baseline plus local delivery during preparation. | Character changes propagate through the existing shared owner; Shot emotion stays local; old Take snapshots remain unchanged | Planned |
| 3 / SD03 | Extend `CinematicShotDocumentCompiler` to resolve dialogue cues, visibility, listener direction and exact source text; reuse `CinematicDialogueTiming`. Feed the same derived model to existing still/video compilers. | Speaker/multiple-line preservation, advisory speech/reaction time, no duplicate legacy dialogue, First Frame only uses the opening instant | Planned |
| 4 / SD04 | Add explicit draft/revise-dialogue proposals through `CinematicFullStoryService`, existing Shot proposal commands and configured recipe/router. Preserve original lines unless revision requests a change. | Missing dialogue can be drafted with assigned Characters; Preview/Apply and stale version checks; silence remains intentional; no media dispatch | Planned |
| 5 / SD05 | Extend `CinematicShotWriter` with the four ordered sections, Cast/Look thumbnails, speaker tools and readable exchange tied to the same script source. Keep details collapsible and separate Video Prompt from writing. | TH/EN input/undo/caret, mapping errors next to lines, focused empty/loading/error states, 390/820/1440 visual review | Planned |
| 6 / SD06 | Add creator-readable generated Video Prompt and explicit editable Shot-local override through canonical compilation, with source freshness, reset/reconfirm and final payload budget validation. | Custom text survives refresh; stale override needs review; provider reference rules remain; estimate/submission use the same text | In progress; direct editing confirmed |
| 7 / SD07 | Finish packet 009 video entry/return for the same Shot, reference mode and saved revision. Review after each small group and preserve Take/media selection. | First Frame -> video and supported direct-video round trips; authoring returns to the same Shot; no implicit generation | Planned |

Dependency order: SD01 -> SD02/SD03 -> SD04 -> SD05 -> SD06 -> SD07. SD05 may be
reviewed with contract fixtures after SD01 while compiler work continues. SD07 is
owned by packet 009; this row tracks the dependency, not another Render workflow.

Configuration extends existing workflow, dialogue timing, text recipes and model
policies. Section defaults, supported speaker/timing syntax and proposal bounds
belong in validated server configuration; actual voice prose remains Character data.
No model prices, provider capacities or speech-rate literals belong in the UI.

Focused checks, added/run only for each affected slice:

- SD01-SD02: `test/cinematicShotAuthoring.test.js`, relevant shared-Character tests
  and Zod/API contracts; fixture Cast rename/removal and Look-source changes.
- SD03-SD04: `test/cinematicShotDocumentCompiler.test.js`,
  `test/cinematicDialogueTiming.test.js`, existing packet/compiler and text recipe
  tests. Use a two-person Thai exchange, silent listener and off-screen voice.
- SD05-SD06: `CinematicShotWriter.test.tsx`, relevant prompt API boundary tests
  and existing `scripts/verify-cinematic-rewamp-shots.mjs` or authoring visual runner.
- Existing selectors `rewamp-shots` and `rewamp-visuals` are available in
  `scripts/test-cinematic-video.js`. Extend that runner with small selectable groups
  when the new tests land; do not advertise a planned selector as runnable.
- All automated work uses fixtures. Natural spoken delivery, face/voice consistency
  and actual provider duration require a separate explicit live trial.

Definition of the reviewable delivery: an existing Scene opens a Shot with
its assigned Cast/Looks, mapped conversation and visible First Frame / Video Prompt
sections. The latter uses a saved-version preview; video dispatch remains in the
existing Render command. The original planning statuses above are superseded by
the scoped implementation evidence below; broader RW07 acceptance remains open.

### 2026-09-25 - Implementation And Focused Evidence

| Slice | Implemented behavior | Verification / remaining boundary |
|---|---|---|
| SD01 | Scene subset, stable alias/ID bindings, visible/off-screen Characters, server legacy conversion; invalid IDs rejected without silently dropping prose | Domain tests and writer legacy-load test pass |
| SD02 | Shared voice-only API and Character voice editor; voice preserved on source updates, baseline combined with local delivery | Version/identity preservation tests pass; provider voice consistency is not guaranteed |
| SD03 | Named/timed dialogue projection, exact lines, listener prose, advisory timing; canonical still/video compiler consumers | Compiler tests pass; free-form unrecognized dialogue remains prose and may need explicit mapping |
| SD04 | Explicit single-Shot revision through existing bounded proposals, Preview/Apply/Discard and source-version checks | Targeted apply preserves siblings, old Takes and custom prompt; live AI wording not tested |
| SD05 | Four ordered sections, Scene/Character previews, dialogue insertion and exchange view, collapsible AI Assist/Video Prompt | TH/EN 390/820/1440 fixture browser checks pass; existing reference chooser remains in First Frame tools |
| SD06 | Direct Video Prompt editing, exact persisted override, explicit reset/reconfirm, source fingerprint, normal final payload budgeting | Save/reload browser check, stale-state UI/domain and provider-rendering tests pass; no gates bypassed |
| SD07 | Same Shot route opens existing video runtime with Back to Shot; first-frame modal retained | Existing Produce runtime regressions pass; full live generation/return UAT remains in packet 009 |

Changed owners: CinematicShotAuthoring, CinematicShotDocumentCompiler,
CinematicVideoPacketCompiler, CinematicApplicationService, CinematicSeriesService,
CinematicFullStoryService, existing Cinematic routes/config/recipe; matching React
API/Zod contracts, Shot Writer, shared Character panel, route and localized styles.
The only new file is `scripts/verify-cinematic-shot-workspace.mjs` (Cinematic QA).
No moved source files or new runtime data paths. Existing Project JSON contains
`speakerBindings`, nullable `videoPromptOverride`, and targeted proposal metadata.

Commands and results:

- `node scripts/test-cinematic-video.js rewamp-writer`: 24 backend + 6 writer UI
  tests passed. This selector is now runnable, unlike the original planning entry.
- `node --test test/cinematicVideoPacketCompiler.test.js test/cinematicShotDocumentCompiler.test.js`:
  42 passed, including existing provider/reference/duration behavior.
- Focused Full Story service/config tests: 5 passed; selected application tests:
  Shot document/source behavior, saved custom prompt and shared voice passed.
- From `web`: `node ../node_modules/vitest/vitest.mjs run --configLoader runner src/features/cinematic/components/CinematicProduceRuntime.test.tsx src/features/cinematic/schemas/cinematicRewampContracts.test.ts`:
  58 passed. Existing Render/Take/quote/recovery presentation is retained.
- From `web`: `node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`:
  passed.
- Start Vite locally, then `node scripts/verify-cinematic-shot-workspace.mjs`.
  Set `CINEMATIC_WEB_ORIGIN` when not using its default `http://127.0.0.1:6502`.
  All API calls are intercepted fixture operations: no provider, live data or
  Credits. TH/EN 390/820/1440, rendered images, overflow, custom-prompt persistence
  and reload passed. Screenshots are written to a temporary QA directory.

Primary: Product Requirement Architect. UX and QA review applied sequentially;
Cinematic design and generation-workflow skills inform compilation/reference
boundaries. No independent subagent review is claimed. Live speech, lip-sync,
identity continuity, full Render round trips and server restart visibility remain
manual verification, not claimed passing from fixture tests.

Documentation verification on 2026-09-25: inspected the current authoring,
shared-Character, dialogue timing, compiler and reference owners; checked 53 local
file links across the updated Rewamp documents and scoped `git diff --check`.
Product, Cinematic and UX review were applied sequentially by one agent, not
independent reviewers. No runtime tests or provider requests were run for this
documentation-only reconciliation.

### 2026-09-21 - Scene-to-Shot writer slice

- Added persisted per-Scene Shot proposals with Apply/Discard, Scene and Chapter
  stale-source checks, configurable limits and no hidden media dispatch.
- Applying preserves matching-position Shot IDs and all existing Take/source/media
  evidence. Changed production Shots and unmatched retained Shots require review.
- Added idempotent manual Shot creation and one versioned `shotDocument` save API.
  Unknown headings and free-form Thai/English prose remain unchanged.
- Added a writer deep link that opens the Chapter Project directly, a compact
  Scene/Shot navigator and one timeline textarea. In-app navigation is disabled
  while edits are unsaved.
- `node scripts/test-cinematic-video.js rewamp-shots`: 14 backend and 6 UI tests
  passed. Focused recipe/config tests: 8 passed. TypeScript no-emit passed.
- `node scripts/verify-cinematic-rewamp-shots.mjs` passed the real Shot deep link
  in Thai and English at 390/820/1440 with one canonical editor, non-empty legacy
  projection and no page overflow. Autosave/reload recovery, timeline parsing,
  preparation and Render handoff remain open before RW07 is complete.

### 2026-09-21 - Shot proposal transport recovery

The Scene-to-Shot AI proposal must remain usable when the configured OpenAI text
endpoint has a transient transport, timeout, rate-limit or retryable server failure.
The existing Cinematic text-provider router owns one bounded fallback to the
configured Gemini provider for this operation. It must not retry the failed OpenAI
POST, and it must not fall back for authentication, invalid request, schema or
invalid-output failures. Both providers consume one shared strict Shot schema.

The saved proposal records the provider and model that actually produced it plus
bounded fallback provenance. No raw Chapter, Scene or Shot text is logged. If both
providers fail, the API returns a stable 503 transport error with non-sensitive
transport/fallback reason codes instead of the generic `fetch failed` message.
This correction does not dispatch media, reserve Credits, alter existing Shots or
create a proposal until one provider has returned a complete valid response.

Focused acceptance:

1. A successful primary request never calls Gemini.
2. One OpenAI transport failure invokes Gemini once when configured and preserves
   the same schema, source-version checks and proposal review flow.
3. Invalid request/auth/schema failures do not invoke Gemini.
4. If both transports fail, the response identifies that fallback was attempted
   without exposing endpoint, key, prompt or private story content.
5. Existing injected provider tests and manual Shot creation remain unchanged.

Implementation evidence:

- `CinematicFullStoryService.proposeShots` now uses the existing provider router;
  Full Story, Chapter and Scene authoring paths remain unchanged.
- OpenAI and Gemini consume one exported `CINEMATIC_SCENE_SHOTS_SCHEMA`. The
  configured Gemini key enables fallback by default unless the new environment
  switch explicitly disables it.
- Transport errors are sanitized to a stable 503 with a bounded cause code. A
  dual-provider failure also reports bounded primary/fallback codes without raw
  prompt, endpoint or credential data.
- `node --test test/openAITextProvider.test.js test/geminiCinematicTextProvider.test.js test/cinematicTextProviderRouter.test.js test/cinematicDirectedOpeningConfiguration.test.js test/cinematicFullStoryService.test.js`
  passed 25 of 25 tests.
- `node scripts/test-cinematic-video.js rewamp-shots` passed 14 backend and 6 UI
  tests. JavaScript syntax checks and scoped `git diff --check` passed.
- No live provider request was made during verification. Creator retry remains
  the required runtime check because provider reachability and output quality
  require configured external services.
