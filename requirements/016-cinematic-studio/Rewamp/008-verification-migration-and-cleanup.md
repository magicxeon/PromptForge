# 008 - Verification, Migration And Cleanup

Status: planned runtime verification. Requirements: [master](000-master.md).
Task order: [007](007-step-by-step-implementation-plan.md).
Page-level tasks and review logs: [tasks/000](tasks/000-task-index.md).

## 1. Focused Verification Contract

Extend `scripts/test-cinematic-video.js`; do not create a second all-purpose runner.
The existing `rewamp-*` foundation groups listed in tasks/000 are implemented, but
they do not yet prove the new screens. `rewamp-writer`, `rewamp-render-integration`
and the per-page selectors below remain planned until registered with real tests.
Run one relevant group after a cohesive task and check the runner's `--help`.

| Proposed group | Acceptance IDs | Evidence and nearest existing tests |
|---|---|---|
| `rewamp-config` | C03 | Authoring/config policy validation and override/version tests |
| `rewamp-hierarchy` | C01,C02,C04,C05 | `cinematicSeries.test.js`, `cinematicProjectRepository.test.js`, schemas, routes and isolated migration fixtures |
| `rewamp-story` | S01,S02,S04,S06,S07 | Story plan/enhancement tests, scoped apply, manual story/dossier tests |
| `rewamp-revisions` | S03,C02 | Rotation boundary, restore, pinned receipt evidence, atomic conflicts |
| `rewamp-writer` | W01-W10 | Shot document schema/parser, migration, save/conflict, proposal/apply, production integration, responsive editor and role-gated diagnostics |
| `rewamp-render-integration` (planned) | R02,R04-R06,R09,R10 | Entry/return context, protected Engine/Render/Take/Queue snapshots, no submit-on-navigation and selected Shot/version parity |
| `rewamp-assets` | A01-A05 | Generated Cast filtering, Scene environment, asset derivative/reference tests |
| `rewamp-preparation` | A06,V02-V04,S05 | Existing reference, packet, keyframe, dialogue and generation prompt-budget tests |
| `rewamp-production` | V01,V05,V06 | Take eligibility, duration, recovery, `CinematicProduceRuntime.test.tsx` and preview selection |
| `rewamp-ui` | U01-U07,R01,R03,R07,R08 | UX01-UX09 navigation, reference layout, draft return, actor/role, locale and responsive checks |
| `rewamp-final` | V07 | Timeline/bundle tests, Chapter-scoped selected clips/manifest |
| `rewamp-migration` | C01,C05 | Idempotent dry-run/apply/rollback on copies, lineage and old-link parity |
| `rewamp-all` | All | Explicit deduplicated aggregate of the above; fail on errors |

Examples to run AFTER groups exist:

```powershell
node scripts/test-cinematic-video.js rewamp-hierarchy
node scripts/test-cinematic-video.js rewamp-story
node scripts/test-cinematic-video.js rewamp-production
node scripts/test-cinematic-video.js rewamp-all
```

For iterative page work, RW00.07 registers `rewamp-projects`, `rewamp-new-project`,
`rewamp-story-ui`, `rewamp-dossiers`, `rewamp-assets-ui`, `rewamp-scenes`,
`rewamp-writer`, `rewamp-render-integration` and `rewamp-final-ui` incrementally.
These names are planned, not currently runnable. Each packet defines its fixtures,
local review checkpoint, acceptance IDs and smallest relevant contract group.
The explicit aggregate must include implemented groups without duplicated test runs.

Existing usable baseline commands (no execution claimed by this planning task):

```powershell
node scripts/test-cinematic-video.js references
node scripts/test-cinematic-video.js prompt-budget
node scripts/test-cinematic-video.js take-eligibility
node scripts/test-cinematic-video.js preview-selection
node scripts/test-cinematic-video.js last-frame
```

Prerequisites: installed repository dependencies, isolated temporary fixture stores,
mocked adapters and current Node toolchain. UI groups use existing Vitest runner
conventions. Browser checks need Playwright dependencies and an isolated/intercepted
app route. They must not submit to real provider endpoints, mutate live projects,
start paid generation, restart workers or run migrations as a test side effect.

Extend the nearest existing browser fixture runner when its ownership matches;
otherwise one Cinematic Rewamp browser runner under `scripts/` with selectable
story/production/final groups. Capture 390/820/1440 widths and desktop/tablet/mobile
failure states, not just the happy path. Record any unsupported/unavailable check.

## 2. High-Risk Regression Matrix

| Scenario | Required evidence |
|---|---|
| First Frame OFF with Looks only | No keyframe approval blocker, no hidden image sent, exact quote/submit reference order |
| Provider rejects a selected image | Same source/model remain; no implicit removal or retry |
| Older Takes after reload | Visible media/history, status/reason and approved selection preserved |
| Change Shot/Take during in-flight work | Preview follows current selection; completion updates submitted Shot only |
| Duration change | Save/re-quote permitted; approved media not erased; existing override semantics retained |
| Long Thai dialogue | Estimated duration/reaction warning, exact line preserved, no arbitrary four-second lock |
| Masked source | Correct video face authority and optional lead-in; no promise of exact frame-one restoration |
| Reference capacity | Required Looks retained, optional reduction disclosed, actual manifest equals quote |
| Prompt over limit | Safe compaction then final guard; no truncation or surprise paid optimizer |
| Power loss/worker interruption | Bounded recovery, terminal spinner stop, no automatic repeat charge |
| Chapter switch and revision restore | Correct scope, no cross-Chapter overwritten Shot or dropped media |
| Wrong actor or role | No private assets/drafts; raw compiled prompt unavailable to normal user |
| Scene or Character change | Only affected descendants need review; unaffected Takes remain usable |
| Optional no-Cast/environment Shot | No unnecessary Look or dialogue requirement |
| Shot document contains unknown prose | Text survives save/prepare unchanged; only execution-relevant uncertainty warns |
| Duration text differs from generation setting | Draft remains intact; user resolves mismatch before quote/submit |
| Old Shot has attribute fields only | Deterministic migration creates one document; existing media/Takes/receipt lineage remains reachable |
| Old Simple/Advanced deep link | Resolves to the same Shot in the writer workspace; no second editable representation |
| Writer -> Render -> writer | Correct Shot/document version; no submission on open; local text, selection and return focus retained |
| Authoring CSS/cleanup | Existing Engine, Render/result/Take and both Queue surfaces match the baseline and keep all consumers |

## 3. Manual Pilot

1. Create a one-Chapter Project from an empty brief and configured genre; also test
   a manually authored brief. Confirm story with text dossiers only.
2. Edit/apply/restore a Chapter; verify configured 10-revision UI and preserved work.
3. Finalize two Character Looks; select one Expression panel and one master Scene
   environment. Add a second view only when the next Shot requires it.
4. Generate Scene Shots; inspect dialogue, gaze, causal order and prop state. Edit
   one Shot as a single timeline document, preserve custom prose, then choose its
   model/duration/audio without opening an attribute form.
5. Authorize the displayed cost before any actual image/video request. Produce one
   composition+Looks clip and one Looks-only clip; record provider/model/mode and
   failures without silently changing inputs.
6. Generate an alternative Take, switch previews, approve intended result and
   reload. Select the previous eligible Take's last frame for continuity.
7. Review Chapter and export selected clips. Verify clip/manifest order and duration.
8. Test a second Chapter and optional Season, actor switching, and old deep links.

Assess story readability, identity, expression, environment, prop placement, timing,
voice, natural motion and continuity separately. Unit tests prove payload/contracts;
manual media evidence is required for model quality. Record model limitations rather
than disguising them as a guaranteed feature.

## 4. Migration And Rollout

- Baseline snapshot lists IDs/counts/asset hashes and source/Take receipts before
  applying any migration to a copied representative project store.
- Dry-run identifies standalone vs grouped Projects, broken membership, duplicate
  aliases and unsupported records; ambiguous ownership is not repaired by guessing.
- Additive apply retains old record IDs, media locations and financial references.
  A second run makes no additional change. Actor ownership is checked server-side.
- Use exposure flag for development cutover; no customer-visible POC/beta disclaimer
  is required by this plan. Keep tested old-link routing during transition.
- Disable new exposure to roll back presentation. Do not overwrite a store snapshot
  after new authoring or generation has occurred; reconcile forward if necessary.
- Full replacement requires old and newly created Chapter data to remain accessible
  via the documented recovery path. Remove old UI only after replacement evidence.

## 5. Reuse And Cleanup Ledger

Authorization: user permits removal/cleanup in the working branch. The following
are candidates, not a statement that they are already unused. Verify imports,
route registry, tests, CSS consumers and runtime receipt readers before each removal.

| Candidate | Replacement/reuse | Earliest retirement gate |
|---|---|---|
| Authoring stage presentation inside `CinematicStageContent.tsx` | Writer workspace; protected Produce/Finish extracted unchanged | P08 after all needed controls/parity |
| Authoring-only wiring in `CinematicDialogs.tsx` | Writer/AI proposal and asset destinations | P08; retain protected Render dialogs and active consumers |
| `CinematicStageRail.tsx` from new default flow | Three-workspace navigation | P02 removes new-flow consumer; file only P08 if no old consumer |
| Duplicate `CinematicControlLevel` / authoring-mode wrappers | No replacement mode control; one writer workspace | P08 after consumers mapped |
| Redundant Simple/Advanced layout branches | One Shot navigator/editor and shared generation controller | P08 after route/recovery parity |
| Separate camera/action/dialogue/sound/expert attribute editors | One `shotDocument` editor; reuse only parser/validation rules that remain valuable | P08 after migration and generation parity |
| Repeated provider/reference selection orchestration | Existing catalog/reference owner with controlled presentation | Per task after payload parity |
| Superseded CSS selectors | Scoped workspace styles using shared tokens | P08 after responsive screenshots and usage search |
| Tests of removed-only presentation | Move useful assertions into owning component/runner | P08; do not delete regression coverage |
| Old prompt/config versions | Retain if any historical receipt/compatibility reader needs them | Separate evidence-based checkpoint, never filename-based deletion |
| Original Draw.io, Period `.txt` and Example files | Preserved design input with source-of-truth notice | Retain by user decision |

Keep navigator/editor responsibilities separate where useful, but do not preserve
Simple/Advanced concepts merely through component names. Keep Reference Processing,
Assets, Generation, Credits and provider adapters behind existing facades. A lower
file count is not worth a larger monolith.
No generated images, video bytes, Take receipts, project data or unrelated
post-processing-service edits are cleanup targets.
010 additionally excludes working Engine & Target Output, Render/result/Take
controls, Shot Queue, Generation Queue, Job Center and Final dependencies from
authoring cleanup. Record their caller/import parity before retiring a wrapper.

Record before/after source file count, source LOC, retired components, remaining
compatibility consumers, repeated workflow paths removed, and measured request/
payload changes. Use `(before - after) / before * 100` with the same stated source
scope. Dependencies, output folders and runtime data are excluded from refactor
reduction. Do not promise a percentage before implementation measurement.

## 6. Evidence And Closure

Each acceptance ID links to its task, focused test and manual evidence where needed.
Statuses begin Planned; no green checkmark from documentation alone. A task with
missing visual/provider evidence remains Implemented awaiting verification or has
an explicit deferred gap/owner. Update 000/007 only after the part's exit gate.

Planning checks for the original documentation delivery: local links resolve,
Draw.io mapping IDs exist, task IDs are unique and confirmed decisions have owners.

Implementation evidence as of 2026-09-19:

- `node scripts/test-cinematic-video.js rewamp-all` passed 183 backend and 64 UI
  tests with mocked providers and no paid generation.
- TypeScript source check passed with `--noEmit --incremental false`; JSON policy
  and both locale catalogs parse successfully.
- Browser checks passed at 390, 820 and 1440 pixels with no horizontal overflow or
  console errors. Legacy `/cast` resolved to Story; workspace navigation resolved
  Production to `/storyboard` and Final to `/finish`.
- The local development `.env` enables the Rewamp shell. `.env.example` remains
  false by default for explicit rollout. Disabling the flag restores the old rail.
- The old rail and mode-dependent shell are transitional rollback evidence only;
  009 requires their product removal after writer-workspace parity.
- Live provider quality, paid Credits, migration rehearsal, Full Story revisions,
  Project Assets and P04-P08 are not verified or complete.
- `scripts/start-dev.mjs` could not start the existing post-processing Python
  process because the configured Python Store executable was unavailable. API and
  Vite were started separately for browser verification; this is an environment
  gap outside the Rewamp change.
