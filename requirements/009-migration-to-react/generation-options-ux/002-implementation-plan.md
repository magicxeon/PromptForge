# Generation Options Implementation Plan

Owner: [GEN-UX-021](../021-generation-options-ux.md).
Status: R2 implemented with focused fixture verification, authorized 2026-10-02.
R1 was delivered on 2026-10-02 with focused checks passed. Its evidence below is
historical and does not validate the new left-tools/right-result placement.

## R2 Placement Revision: Delivery

Scope: GV01 Playground Video and GI01 Playground Image, including their Comparison
host. Other shared consumers retain their settings/slot placement. Reuse the
accepted model/output controls. UX reviewed layout budgets before application edits.

| Task | Small delivery unit / owner | Dependency | Acceptance and focused checks | Status |
| --- | --- | --- | --- | --- |
| GO-T14 | Capture Image/Video first-entry baseline and review left-tool/right-output layout with UX; inspect existing image/video action composition | R2 requirement | Agree1440x900,820x1180,390x844 regions and all state placements before editing; identify exact source edit/summary duplication and single action owner | Complete: UX pre-edit review and actual-shell baseline; workspace top reduced from311px to203px at1440x900 |
| GO-T15 | Recompose `PlaygroundGenerationWorkspace.tsx` and scoped `playground.css`; adapt `GenerationExperience.tsx` and `PlaygroundVideoWorkspace.tsx` region inputs | T14 | Engine first in left panel, Reference second, Prompt third, one action group; result/actions/Queue/Recent right; DOM/tab order matches visual order; default guided consumers unchanged | Complete: Image33/Playground41 focused tests pass; actual Image36/maximum-reference Video18 viewport cases pass |
| GO-T16 | Compact Playground reference presentation through existing image/video reference owners; use labelled disclosure for detailed editors | T15 | Thumbnail summary bounded to two rows; Add/Change, count and errors visible; editing, source authorization, protected preview, rejected index and reference order retained | Complete: two visible thumbnails plus remainder, collapsed editors, visible rejected-item recovery; Shared45 tests pass |
| GO-T17 | Complete output action grouping and stacked-layout navigation using current result/viewer/focus owners | T15,T16 | Existing post-render actions accessible; one-time relevant completion navigation, View result/return to settings, input preservation and no repeated focus jump; Comparison/Queue/Recent preserved | Complete: explicit labelled Eye navigation, interrupted completion focus guards and Comparison placement verified in focused tests; existing post-render owners retained |
| GO-T18 | Independent UX/QA review, focused regressions and real-route fixture screenshots for both Image and Video; update evidence | T15-T17 | Pass the R2 acceptance matrix, theme/locale/keyboard/viewport checks and unchanged guided-consumer checks; fix failures before marking R2 complete | Focused checks complete; UX/QA evidence and remaining real-provider/manual UAT gaps recorded in003 |

### Boundaries And Dependencies

R2 adds `GenerationReferenceDisclosure.tsx` and its test to shared Generation
presentation, extends `PromptEditor`'s existing compact prop, and compacts the
Playground Image/Video entry header in `PlaygroundRoute.tsx`. These are explicit
presentation relocations reviewed by UX. Guided Look Sheet headers and non-composer
workspace branches are preserved. No file moves or runtime data paths changed.

Healthy Video quotes use Generate's existing badge; pending/error/expired/
insufficient states remain outside. Quote ownership, freshness checks, consent,
idempotency and dispatch are unchanged. Two preview thumbnails are a display bound,
not a reduction of submitted references. The existing canonical editors remain mounted.

- Extend the existing workspace contract; do not add another Playground controller,
  prompt store, generation action, quote request path or provider selector.
- Inspect the current Video panel footer/quote and `GenerationCommandRegion`
  arrangement before moving regions so Generate and price remain a single group.
- Left tool sizing and responsive rules belong to `web/src/styles/playground.css`;
  keep `generation-options.css` and its accepted controls unless fit requires a
  narrowly scoped adjustment. Use existing tokens instead of per-page constants.
- Reference disclosure state is transient presentation state; do not create a new
  preference, draft version, cache or polling loop. Reuse existing authenticated
  previews, source editors, readiness and existing reference-plan errors.
- Preserve all non-Playground callers, guided Look Sheet forms and existing
  Comparison slot semantics. Review the scoped diff for accidental region moves.
- Reuse existing result focus/navigation helpers and result actions. Add small
  optional presentation props only where current public regions cannot express
  the arrangement; avoid forks by media type.

### Focused Verification Plan

Use existing selectable runner groups rather than running the entire suite:

```powershell
node scripts/test-playground-video-references.mjs options-playground
node scripts/test-playground-video-references.mjs options-image
node scripts/test-playground-video-references.mjs options-batch-comparison
node scripts/test-playground-video-references.mjs types
node scripts/test-playground-video-references.mjs options-visual --view composer
node scripts/verify-playground-video-references.mjs
node scripts/verify-playground-video-references.mjs --trusted
```

These existing commands describe the R1 checks today. During T18, update the
composer fixture and owner interaction assertions for R2; add a focused Image
route fixture through the existing verifier/runner ownership so both routes have
first-viewport evidence. Add selectable cases for empty/completed output, many
references, a rejected item, Comparison and mobile completion/return navigation.
Do not substitute unchanged R1 screenshot counts for R2 acceptance. Run locales
only if new strings are introduced, and shared/dialog groups only if those
contracts are affected. All checks use isolated fixtures, with no paid generation.

Roll out the new arrangement only for the existing Playground composer callers.
Rollback restores their region placement without reverting accepted selector
controls, actor drafts, references, completed outputs or commercial contracts.

## R1 Historical Delivery

## Delivery Rules

Work one small task at a time. Record its code diff, focused checks and visual
evidence before moving on. The user may review a screen and request iteration.
Maintain one shared selection contract while allowing composer/settings/slot
presentation. Preserve feature-owned callbacks, queues, references and Credits.

| Task | Scope and files/owner | Depends on | Reviewable output and acceptance |
| --- | --- | --- | --- |
| GO-T01 | Characterize current shared panels,17 caller contexts, preference/quote contracts and protected siblings | None | Before screenshots and behavioral fixtures for each variant; confirm canonical defaults, live consumers and billing labels |
| GO-T02 | Focused shared model chooser under `web/src/components/generation/`, using existing UI/Radix patterns | T01 | Search, selected state, provider/model pair callback, incompatibility and keyboard/focus contract; image/video/slot adapter inputs agreed |
| GO-T03 | Video option toolbar in `VideoEngineTargetPanel` and compact frame treatment | T02 | Current values, duration/aspect/resolution/audio controls, capability hiding, locked values and container-driven wrapping |
| GO-T04 | Playground Video composer in `PlaygroundVideoWorkspace` and opt-in existing workspace contract | T03 | GV01; prompt/reference/options/price/Generate adjacency; result, Recent, recovery and drafts preserved |
| GO-T05 | Cinematic live Video settings in `CinematicProduceRuntime` and existing route integration | T03 | GV02-GV04; sidebar/embedded framing, Shot/Take switch, locked Project values and approval/recovery retained |
| GO-T06 | Image variant in `EngineTargetPanel`/`GenerationExperience`; Playground composer | T02,T04 | GI01; output count, capability resolution/dimensions, negative prompt and free refinement; image quotes still match submissions |
| GO-T07 | Guided Studio and Scene Builder integration | T06 | GI02-GI04; settings remain separate from generated/read-only prompt; guide forms and source-authority controls preserved |
| GO-T08 | Character Look Sheet form and generation dialog integration | T06 | GI05-GI07; both entry routes, modal focus, sheet format, candidate review and paid enhancement breakdown |
| GO-T09 | Cinematic Environment and First Frame integrations | T06 | GI08-GI10; Scene image selection/refresh, inline direction preview, reference roles and approval actions survive |
| GO-T10 | Batch and Comparison selectors, shared chooser consumers | T02,T06 | GB01/GC01; item/slot scope, per-slot state/order, aggregate totals, active Comparison visibility and mandatory bulk consent |
| GO-T11 | Fashion engine presentation integration | T06 | GB02; existing routing mode and aggregate business workflow preserved; no new per-item generation path |
| GO-T12 | Consistent TH/EN copy, theme tokens, container layouts and mobile picker behavior | Each consumer task as it lands |390/820/1440 and narrow desktop containers; no clipping, overlap, hidden actions or inaccessible modal layers |
| GO-T13 | Coverage audit, obsolete presentation cleanup and focused QA | T04-T12 | Every inventory row has evidence or an explicit open gap; one chooser behavior; no duplicated selector/provider/credit workflow |

Each row may be delivered separately. T12 is a per-task gate, not permission to
postpone mobile/accessibility work until the end. Per-task status appears below.
UI prototype review is permitted during future implementation with isolated
fixtures; it is not proof of production or paid-provider behavior.

## Source And Configuration Boundaries

- Prefer extending existing components and public props. A shared model chooser
  is cohesive; a second Generation controller or universal all-in-one form is not.
- Provider/model eligibility, legal option combinations, durations, resolutions,
  role limits and prices remain from the server catalog and canonical validators.
- Shared visual ordering, density and responsive tokens may be configurable in
  the existing shared presentation layer; do not duplicate a per-page table.
- Existing settings/extraControls/summary/footer contracts must remain available
  until all callers migrate. Temporary aliases require a removal checkpoint inT13.
- Preserve existing actor-scoped preferences and selection precedence. New fields,
  migrations or precedence changes require a separately scoped requirement; this
  presentation rollout adds no persistence or preference keys.
- Keep display values and submitted values on the same controlled state. Changing
  the model updates provider/model together; estimates retain current race/expiry
  protections and exact-input parity.
- Selection rendering should not introduce new capability/price polling or per-
  option quote fan-out. Measure current request counts and layout behavior inT01;
  retain existing query owners and stale-response handling.

## Task Evidence

| Task | Delivery status / focused evidence |
| --- | --- |
| GO-T01 | Baseline and 17 callers inspected. Existing browser fixture initially lacked `/api/me/preferences`; QA added its stub. The actual Playground route now passes six TH/EN viewport checks. No live API calls are permitted in fixtures. |
| GO-T02 | Implemented `GenerationModelPicker` and `GenerationOptionSelect`, pure controlled presentation. Shared group passes 41 tests. Atomic selection, IME/search, disabled reasons, Arrow/Escape/Tab and dialog focus verified. |
| GO-T03 | Implemented compact Video fields, supported-value hiding, audio toggle, locked aspect and changed-value notice. Existing model normalization/quote callbacks retained. Shared Video tests pass. |
| GO-T04 | Implemented opt-in composer in the existing workspace; Video adopts it. Prompt/references/options/quote/action stay together while result/Queue/Recent remain available. Ordered thumbnails show role/name and exact rejected image; missing/failed previews use an icon. Protected API previews reuse actor-aware media loading; model/operation changes dismiss stale rejection marks. Playground group passes 29 tests; uploaded and trusted-source route checks pass 12 viewport cases. |
| GO-T05 | Shared settings reach Produce/Shot/embedded callers without new controllers. Cinematic group passes 109 tests. Actual parent-screen UAT remains listed per GV02-GV04. |
| GO-T06 | Image panel/Playground composer implemented; negative prompt/count and dimensions use existing owners. Free refinement remains visibly marked. Image group passes 33 tests. |
| GO-T07 | Guided Studio/Scene forms retain settings placement and authored/read-only prompts through existing public contracts. Workspace/image tests pass; individual route UAT remains open. |
| GO-T08 | Look Sheet forms/modal inherit shared chooser; composer is excluded for Look Sheet definitions. Look Sheets group passes 37 tests; dialog fixture passes. Actual route/candidate UAT remains open. |
| GO-T09 | Environment/First Frame inherit shared settings. Scene gallery refresh and Shot dialog tests pass in Cinematic group. Inline/modal parent UAT remains open. |
| GO-T10 | Batch and Comparison adopt shared selection with original bounds/IDs/quotes/consent. Batch/Comparison group passes 40 tests. Old Provider-select test expectations updated to the new model radio-menu. |
| GO-T11 | Fashion keeps its existing routing mode/workflow; shared panel presentation only. Fashion group passes 9 tests; actual manual engine region UAT remains open. |
| GO-T12 | TH/EN parity and typecheck pass. Browser fixtures pass 72 cases across 4 containers, 3 themes and 3 widths; selected/hover text contrast, pointer/search focus, modal stacking and 44px controls checked. |
| GO-T13 | Runtime adoption and protected workflow diff audited. UX findings repaired; evidence and explicit gaps mapped to all 17 contexts. No obsolete compatibility API/controller was added. Requirement closure awaits manual parent-route UAT, not more duplicate selector code. |

The client Video quote schema previously rejected the server's existing
`actual_usage` charge mode. It now accepts that value and labels its estimate as
an upper Credit bound in Playground and Cinematic. The server pricing/reservation/
capture policy is unchanged; a parsing regression test covers this integration gap.

## Focused Validation Delivery

During implementation, add selectable presentation groups to the existing
`scripts/test-playground-video-references.mjs` rather than creating a competing
Generation runner. These selectable groups are now implemented:

```text
options-shared
options-playground
options-cinematic
options-image
options-look-sheets
options-batch-comparison
options-fashion
options-locales
options-visual
options-all
```

`options-all` is an explicit offline aggregate of the focused tests, locale check
and typecheck. It fails on errors and uses fixtures/stubs only. Browser verification
is intentionally separate (`options-visual`); it starts an isolated temporary Vite
fixture server and closes it on success or failure. Neither command starts paid
jobs, mutates live Projects/wallets or restarts application workers.
Keep a separate manual UAT checklist. The existing runner's `all` group must not
silently start new servers or paid runtime tests. Reuse existing browser fixtures
and allow a screen selector for bounded visual checks.

Normal focused commands (Node dependencies and Playwright Chromium installed):

```powershell
node scripts/test-playground-video-references.mjs options-shared
node scripts/test-playground-video-references.mjs options-playground
node scripts/test-playground-video-references.mjs types
node scripts/test-playground-video-references.mjs options-visual --view dialog
```

For all shared visual containers omit `--view dialog`. Supported filters:
`composer`, `settings`, `dialog`, `slot`. Browser output is written to an OS-temp
evidence directory and printed on completion. Actual mocked Playground route check
requires the existing Vite dev server: set `VIDEO_LAYOUT_ORIGIN` if not using
`http://localhost:5173`, then run `node scripts/verify-playground-video-references.mjs`.

Run only the changed task's groups and affected shared consumers. Use the explicit
aggregate for final requested UAT/pre-release preparation, not after each edit.

## R5 Ordered Tasks

1. GO-T26: reconcile approved expanded/collapsed interaction, UX review and caller
   state contracts. Completed requirement before code; record UX findings in003.
2. GO-T27: extend PlaygroundGenerationWorkspace with transient expansion,
   completion signal and model summary; keep regions mounted, pending/errors
   visible and input focus protected. Add responsive writing/render columns.
3. GO-T28: wire Image/group/Comparison and Video existing terminal results into the
   shared presentation. Preserve exact quote, consent, queues and actor resets.
   Localize shared toggle/status strings in existing EN/TH catalogs.
4. GO-T29: focused component/caller tests plus updated existing browser fixtures;
   test completion, edit deferral, reopen, no-result layout and responsive bounds.
   Independent QA; record results and live/manual gaps in003.

Dependencies: existing job/group/comparison and Video query state, shared workspace,
theme tokens and GenerationResultSurface. No new API/storage/polling. Reuse
`options-workspace`, `options-image`, `options-playground`, `types`, `options-locales`
and add selectable R5 browser view to the owning existing visual runner. No paid
jobs, live mutation, worker restart or aggregate suite. Legacy R2-R4 visual placement
assertions are historical, not valid acceptance for the intentionally changed flow.

GO-T26 complete: independent UX review approved bounded design and safeguards.
GO-T27 complete: mounted disclosure, wider authoring, right render frame, accessible
toggle and busy/typing/IME protection implemented. GO-T28 complete: existing caller
completion state and localized summary wired; no lifecycle/provider/price changes.
GO-T29 complete for scoped fixture delivery: isolated composer/Look Sheet and
intercepted actual routes, focused state/quote regressions and independent QA pass.
Evidence and remaining live/manual gaps are recorded in003.

## R4 Ordered Tasks

1. GO-T23: completed UX design review and scoped requirement before code. Reuse
   GenerationModelPicker, EngineTargetPanel, VideoEngineTargetPanel, composer,
   ReferenceDisclosure and CharacterLookSheetForm; no new runtime owner.
2. GO-T24: implement opt-in in-flow model action and composer-only visual hierarchy,
   stronger model/inputs, larger prompt, compact reference rows and balanced action
   footer. Preserve all sibling screens, quote/consent and pending/error behavior.
3. GO-T25: focused shared/model/workspace tests, types and bounded browser evidence
   at390/820/1440. Reuse options-visual and actual-route layout runners. Review
   both requested panels and unchanged output controls; record any live/manual gap.

Dependencies: existing R3 composer/frame, theme tokens and controlled callbacks.
No server, runtime data, polling or price changes. Do not run options-all for R4.
Rollback consists of presentation props and scoped styles only.

GO-T23-T25 complete for the scoped presentation delivery. Source/UX review and
focused evidence are recorded in003; narrow-grid and Compare keyboard-focus
findings were fixed before closure. Live/manual gaps remain explicitly separate.
No additional runtime dependency, file move, service or data migration.

## R7 Ordered Tasks

1. GO-T33: review scoped slide motion, then extend workspace disclosure with native
   browser animation. Reuse current expanded state, focus and mounted children.
   Preserve instant reduced-motion fallback, safe reversal and unmount cleanup.
2. GO-T34: options-workspace and types; extend existing options-visual fixture to
   check slide direction, inert closing controls, rapid reversal and reduced motion
   at390/820/1440. No aggregate suite or live provider request.

No new files, dependencies, runtime paths, translations or architecture owner.
Record status/evidence in003 after each task.
GO-T33-T34 complete: native slide motion, reduced-motion/reversal behavior and
delayed reveal validated. UX Turing and QA Peirce approved bounded closure.

## R6 Ordered Tasks

- GO-T30: requirement and UX pre-edit review; inspect Comparison width and setup
  completion ownership. Preserve caller jobs, quotes, tabs and actor drafts.
- GO-T31: container-aware slot layout, scoped corner gradient and entry-safe
  completion disclosure. Extend existing workspace/callers, not a new workflow.
- GO-T32: focused state/Comparison tests, types and intercepted browser checks;
  QA reviews regression safeguards and evidence before closure.

Dependencies: R5 workspace, ComparisonConfigurator, existing caller task state,
theme tokens and current visual runner. No new runtime paths or services.
Validation: options-workspace, options-image, options-playground, types and
options-visual selected views through scripts/test-playground-video-references.mjs.
Additional R6 commands (fixture-only):

```powershell
node scripts/test-playground-video-references.mjs options-visual --view comparison
node scripts/test-playground-video-references.mjs layout-image-workspace --comparison
```

Actual-route checks require the existing frontend at5173, not a live backend;
API reads/quotes are intercepted and mutation requests are blocked.
Run only affected groups; no options-all, paid generation or worker restart.
Record each task's completion/evidence in003. Existing aggregate stays opt-in.
GO-T30-T32 complete on2026-10-03. UX Curie and independent QA Volta approved;
the QA-discovered catalog-remount collapse was fixed and regression-tested before
closure. Scoped evidence, exact commands and remaining manual gaps are in003.

## Rollout And Review

## R3 Ordered Tasks

1. GO-T19: UX Expert review of the three user screenshots and existing workspace
   contracts before runtime edits. Confirm exact header/form/output relocation.
2. GO-T20: unify Playground header and opt guided Playground Look Sheets into
   existing composer. Keep Studio placement and all form/workflow contracts.
   Add focused workspace/definition/pending/read-only regression assertions.
3. GO-T21: shared yellow render signature through existing shell/frame owners;
   standalone panels inherit it, nested panels suppress duplicate borders/glow.
   Preserve dimensions, sticky scrolling, selectors and result controls.
4. GO-T22: run selected Look Sheet/workspace/shared tests, types and intercepted
   browser fixtures at390/820/1440 across TH/EN/themes. QA checks adjacent Image/
   Video and settings/dialog consumers. Record evidence/gaps before closure.

Dependencies: existing controlled GenerationExperience regions, shared composer,
EngineTargetPanelFrame/GenerationEngineShell, actor-scoped Look Sheet drafts and
theme tokens. No new service, runtime data, catalog, polling or Credit workflow.
Use existing selectable runner; no aggregate suite or paid generation. Each task
status/evidence is recorded in003 before advancing. Rollback presentation only.

GO-T19-T22 are complete for this scoped presentation delivery on2026-10-03.
UX/source/visual review and focused QA pass;003 records exact evidence and deferred
live/manual checks. Additional focused commands (not automatic live generation):

```powershell
node scripts/test-playground-video-references.mjs options-look-sheet-workspace
node scripts/test-playground-video-references.mjs layout-look-sheet-workspace
node scripts/test-playground-video-references.mjs layout-look-sheet-workspace --width 390
node scripts/test-playground-video-references.mjs options-visual --view look-sheet
node scripts/test-playground-video-references.mjs options-visual --view settings
node scripts/test-playground-video-references.mjs options-visual --view dialog
```

Actual-route fixtures need the frontend dev server at5173 (override
`VIDEO_LAYOUT_ORIGIN` if needed), installed dependencies and Playwright Chromium;
all API reads/previews are intercepted and mutations fail closed. Shared container
fixtures start/close their own temporary Vite server. No backend/worker restart.
Existing `options-all` covers the new runtime tests through existing groups,
including Shell through `options-image`; it remains an explicit later aggregate.

Keep rollout per caller/variant through existing presentation props; finish each
consumer's focused evidence before switching it. Do not present a second customer
mode selector. Rollback changes presentation and preserves the same saved inputs,
accepted quote, media, tasks and ledger. Any necessary state migration must have
its own compatibility check before that caller switches.

UX reviews each visual slice before edits and screenshots before closure. QA
reviews shared behavior and the final caller matrix. If an implementation changes
financial/consent or provider/reference contracts, bring in the owning Backend,
Commercial or Reference reviewers before expanding that task. This packet changes
their presentation only; it does not waive their business constraints.
