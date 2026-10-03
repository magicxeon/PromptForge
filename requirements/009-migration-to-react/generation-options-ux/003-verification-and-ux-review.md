# Generation Options Verification And UX Review

Owner: [GEN-UX-021](../021-generation-options-ux.md). Updated: 2026-10-03.
Status: R7 implemented; focused component and intercepted browser
checks passed. Earlier evidence remains below as historical verification.
No paid generation was run.

## R7 Motion Verification

GO-T33-T34 complete: UX Turing approved source/screenshots; QA Peirce approved
the source fix/regression evidence (browser execution not independently repeated).
Shared setup slides up/down in240ms using native browser
animation of height, top padding, opacity and an8px vertical offset. Entry stays
expanded without animation. Reversal samples the current visible position; obsolete
finish callbacks cannot hide reopened content. Exit content stays mounted but is
immediately inert/aria-hidden. Reduced motion (including preference changes during
a slide) and unsupported animation use immediate disclosure. Cleanup cancels motion.

Automatic output reveal waits for the close to finish and cancels if the result
changes/disappears, a new attempt starts, the user reopens or focuses outside setup.
Independent QA found the result/focus cancellation gaps before closure; both fixed
and covered by native-animation mock tests.

GO-T34 evidence so far:
- `options-workspace`:41 pass, including4 new delayed-reveal/cancellation cases.
- `types` and `git diff --check`: final pass (existing line-ending notices only).
- `options-visual --view composer`:18 cases at390/820/1440, TH/EN, all themes,
  with mid-slide snapshots and height/direction, reversal, restored overflow and
  live reduced-motion cancellation checks. OS-temp evidence
  `mpf-generation-options-Vtskjy`; no provider or wallet call.
- `options-visual --view look-sheet`:18 cases across the same matrix, including
  long guided content, mounted fields and motion interactions; evidence
  `mpf-generation-options-0itg37` in OS temp. Final UX/QA sign-off passed.

Existing workspace and browser runner extended; no new files, moved consumers,
runtime data, strings, dependencies or provider/Credit contracts.
Manual check: click Generation Setup to close/open; observe upward/downward slide;
toggle quickly, then enable OS reduced motion and verify immediate disclosure.
Live-provider and physical-device UAT remain separate.

## R6 Delivery And Verification

- GO-T30 complete: owning requirement reconciled with new entry rule; independent
  UX reviewer Curie approved bounded slot layout, corner gradient and disclosure
  behavior before runtime edits.
- GO-T31 complete: scoped Comparison layout/gradient and entry-safe disclosure
  implemented. Callers provide observed active identity and transient submitted
  attempt; generic loading/upload/quote activity never arms completion collapse.
- GO-T32 complete: independent QA Volta approved after the P2 remount fix.
  ComparisonConfigurator5 tests pass.
  Isolated comparison visual matrix18 cases passed (2/3/4 slots,390/820/1440,
  TH/EN, three themes), evidence `mpf-generation-options-Gg8YdP` in OS temp.
  Actual Image Comparison route36 fresh/restored cases passed at all viewports,
  locales/themes: `mpf-video-references-layout-tmOhhz`. Read/quote fixtures only,
  unexpected mutations blocked. These runs preceded the R6 lifecycle completion.

Additional R6 evidence:
- `mpf-generation-options-BwFCD5`:18 comparison cases rerun with explicit active
  render identity; preserved completion deferral, reopen and draft retention.
- `mpf-video-references-layout-PJM2r7`:12 desktop actual-route cases including
  real General Image/Look Sheet tab clicks, expanded entry and preserved prompt.
- `mpf-generation-options-YFagG3`:18 unchanged standalone slot cases, all three
  viewports/locales/themes, shared picker keyboard, focus and contrast checks.
- `types` and `git diff --check` pass (existing line-ending warnings only).
- Independent QA Volta reproduced a P2 before closure: enabling Compare after
  reopening a successful Image could remount setup during catalog loading and
  replay the retained submission. Fixed by baselining submissions present at mount,
  rather than treating them as newly requested. Regression failed before the fix
  and passed afterward, including the real caller's asynchronous catalog remount.
- Final focused runtime checks:98 pass (workspace37, GenerationExperience32,
  Video29). Main-agent `options-image` rerun:53 pass, including unchanged shared
  engine, Studio, shell and command consumers. No full application suite was run.
- Independent QA reran workspace37 and targeted caller lifecycle16, both pass;
  post-fix types and diff checks pass. No remaining blocking findings.
- UX Curie approved actual-route desktop/mobile/tablet and all-theme screenshots;
  no visual blockers. Comparison's below-fold Generate remains naturally reachable.

R6 extends existing visual runners with `options-visual --view comparison` and
`layout-image-workspace --comparison`. The actual-route fixture now provides two
distinct models, rather than the old single-model catalog. Slot readability and
Generate reachability are asserted; Comparison's full list may exceed one viewport.

### R6 Manual Check

1. In Playground enable Compare, select2-4 models with long names, check each
   full-width slot on narrow panels, reorder/remove bounds and aggregate Credits.
2. Resize to390/820/1440, check the subtle corner gradient, menu focus and visible
   price/action using natural page scroll. Other render/result controls stay intact.
3. Fold setup, switch General Image/Look Sheet/Video and return. Setup opens;
   saved draft/references remain. Repeat with a completed result and page reload.
4. In separately authorized live UAT, submit a render. Success with usable output
   folds once; failure/cancel/partial result does not. Editing or IME defers folding.
   Open Recent or reload a completed result: historical media must not fold setup.

No new files, file moves, runtime data paths, translations, providers, pricing,
consent or job/polling contracts. Existing component/caller tests and the two
visual runners were extended. Live paid-provider and physical-device UAT deferred.
Actor switching during an outstanding provider submission has no new targeted
lifecycle test in this slice; existing actor-consent guards pass.

## R5 Delivery And Verification

GO-T26-T29: implemented and fixture-verified on2026-10-03. Independent UX design
review preceded code; visual review approved expanded/collapsed layout. QA reviewed
state behavior and reproduced two issues (stale completion after a newer failed
attempt, and hiding Generate on focus before click); both corrected and covered.

### Behavior And Ownership

- Playground setup is now a full-width disclosure, initially expanded without a
  current render. Wider writing/Character/reference region is left, one yellow
  Model/options/Generate frame is right. Narrow screens follow natural DOM order.
- A new completed current output with media folds setup once. Missing media,
  pending, failure, cancellation and partial output do not trigger success folding.
  Manual reopening stays open through repeated polling of the same result.
- Editable fields, model menus, reference dialogs and IME defer folding until the
  interaction leaves setup. Generate activation ends editing only at click, not
  pointer focus; newer busy attempts supersede a deferred old completion.
- Fields stay mounted under `hidden`; references and drafts survive. Back to
  settings focuses/reopens the stable setup. Empty output is hidden before any
  activity; result/error/processing, Queue, Recent and messages remain outside fold.
- No new runtime files, file moves, state storage, APIs, polling or billing path.
  `PlaygroundGenerationWorkspace.tsx` owns transient UI only; `GenerationExperience`
  provides existing Image/group/Comparison completion signals; Video workspace
  provides existing task completion. Existing non-composer/Studio/dialogs preserved.

Changed runtime files: shared PlaygroundGenerationWorkspace, GenerationExperience,
PlaygroundVideoWorkspace, playground.css and EN/TH playground catalogs. Updated
their existing tests, both existing visual runners,021 and packet001/002/003 plus
099 architecture addendum. Model/credit/provider capabilities remain unchanged.

### Focused Evidence

| Check | Result |
| --- | --- |
| `options-workspace` |30 pass: collapse-once, reopen, DOM retention, errors/pending, editing/menu portal, IME, Back focus, unrelated navigation, superseded result, pointer activation |
| `options-playground` |66 pass, including30 workspace tests and26 Video caller tests; current successful media folds, failed/missing-media does not, Back reopens |
| `options-image` |37 pass: existing consent/exact-quote/actor guards, guided pending locks, empty-result disclosure and non-Playground owners |
| `types`, `options-locales` |pass |
| `git diff --check` |pass; existing line-ending notices only |

Browser evidence under OS temp (not committed runtime/user data):

- `mpf-generation-options-dBfQe6`:18 composer cases,390/820/1440, TH/EN, three
  themes. Left/right versus stacked order, only right frame, no control overflow,
  keyboard/menu/contrast, pending/completion during editing, fold/reopen and drafts.
- `mpf-generation-options-mpXlt8`:18 guided Look Sheet cases across the same matrix,
  mounted fields/definition disclosure, readonly prompt and completion interaction.
- `mpf-video-references-layout-JkhtLP`:12 actual Image desktop1440 fresh/restored
  cases across TH/EN/themes, exact authoring estimate/draft parity and Recent actions.
- `mpf-video-references-layout-HRkwMm`:12 actual Look Sheet mobile390 cases,
  definition fields, adult validation, readonly prompt, enhancement quote parity,
  collapsed/reopened incomplete draft and Recent inspection/reload.
- `mpf-video-references-layout-iWf5Kc`:6 actual Video tablet820 max-reference cases;
  source summaries, localized settings, authoring order and result controls retained.

Existing visual assertions were reconciled with intentional R5 relocation, not
removed: writing left/settings right/output below replaces the old narrow tools
left/output right checks. Actual-route API calls remain intercepted, unexpected
mutations fail closed. No live backend/worker restart, provider charge or paid job.

### Manual Walkthrough

1. Open `/create/playground` in Image, Look Sheet and Video. Without a current job,
   setup is expanded and there is no empty result placeholder consuming space.
2. Write a prompt or Character details and select references. Fold/reopen using
   the setup header, including keyboard Enter/Space. All values must remain.
3. During authorized render UAT, pending stays visible. On successful usable media,
   setup folds; failure or missing media does not count as successful completion.
4. While a render completes, continue editing a field or reference dialog. Setup
   stays open until leaving the interaction. Try typing followed immediately by
   Generate: the click must not be swallowed by a delayed old completion.
5. Expand or use Back to settings; same completed-result polling must not fold it
   again. Check preview/download/collection actions, Queue and Recent remain intact.
6. Check390/820/1440, Thai/English and all themes. On a physical phone verify
   keyboard and safe-area behavior. Do not spend Credits just to inspect layout.

Commands use the existing runner: `node scripts/test-playground-video-references.mjs
<group>`. Browser groups: `options-visual --view composer`, `options-visual --view
look-sheet`, `layout-image-workspace --width 1440`, `layout-look-sheet-workspace
--width 390`, `layout-max-references --width 820`. No full suite run.

Frontend dev server is available at `http://localhost:5173/create/playground`;
API6500 was not listening. Real usage needs the separately started API. Remaining
gaps: real-provider completion/credit settlement, physical mobile keyboard/safe
area and full parent-screen UAT. Automated completion tests use controlled fixtures.

## R4 Delivery And Verification

Scope: only Playground Image, Video and guided Look Sheet tools. GO-T23 UX review
preceded runtime changes; GO-T24 implements the following presentation:

- Stronger model chooser with yellow identity accent and readable provider/name.
  Compare uses an opt-in in-flow label action. Other callers keep existing headers.
- Consistent settings, two columns when narrow and three where capacity allows;
  no vacant third track. Reference thumbnails/count hierarchy stays compact.
- Prompt textarea is180px minimum,220px on viewports at least900px tall. These
  numbers describe the editable element, not a promise that the entire textarea
  is visible without scrolling. Dense max-reference/testing-notice states retain
  accessible initial entry and use the existing composer scroll for the remainder.
- Guided form spacing and headings are scoped to Playground. Generate has normal
  case15px type, a readable Credit badge, restrained static glow and a48px minimum.
  Enhancement breakdown, maximum quote, consent and errors retain their contracts.
- No right-output, Queue, Recent, catalog, provider, Credit, draft or storage change.

### Files

Runtime owners: `GenerationModelPicker.tsx`, `EngineTargetPanel.tsx`,
`VideoEngineTargetPanel.tsx`, `GenerationExperience.tsx` under shared generation;
`PlaygroundVideoWorkspace.tsx` under Playground; `playground.css` and
`generation-options.css` under shared styles. New optional presentation props reuse
existing callbacks. No new/moved runtime files or runtime data paths.

Focused assertions extend existing Engine/Video tests and the existing actual-route
browser verifier. Requirements changed:021,002 and this003 only for R4.

### Evidence

- `node scripts/test-playground-video-references.mjs options-shared`:48 pass,
  including Compare availability, one action, exit and focus in both directions.
- `node scripts/test-playground-video-references.mjs types`:pass.
- `git diff --check`:pass; existing LF/CRLF notices only.
- Actual Image:12 desktop1440 cases in `mpf-video-references-layout-QHKG7T`;
  12 mobile390 in `mpf-video-references-layout-hiAxoA` after narrow-grid fix.
  Final12-case rerun `mpf-video-references-layout-UdksS6` also passes the explicit
  two-computed-column assertion and180px minimum textarea assertion.
- Actual Look Sheet:12 mobile390 cases in `mpf-video-references-layout-h7quM5`,
  preserving fields, readonly prompt, draft reload and quote definition parity.
- Actual Video maximum references:6 desktop1440 in
  `mpf-video-references-layout-yz8Kl1`,6 tablet820 in
  `mpf-video-references-layout-1YrEAo`. Post-spacing adjustment, no clipped input
  entry, hidden model, reference overflow or inaccessible pinned Generate.
- Isolated composer18 cases in `mpf-generation-options-tDIIPz`; guided composer18
  in `mpf-generation-options-pPyAEd`.390/820/1440, TH/EN and all three themes,
  with menu/keyboard/contrast/frame checks. Actual-route tests provide footer evidence.

Evidence folders live in the OS temp directory, not committed user/runtime data.
QA independently found narrow-grid specificity and Compare focus regressions;
both fixed and re-reviewed with a source-review pass. UX signed off reviewed
desktop, Look Sheet mobile and maximum-reference Video tablet screenshots;
no header overlap reproduced in intercepted application screenshots. Early failed
Image/Video attempts were corrected and superseded by successful evidence above.

### Manual Check

1. Open `/create/playground` on the frontend, select Image, Character Look Sheet
   and Video. Model stays first, tools left and results right on desktop.
2. Open model chooser, search and use keyboard/Escape. Toggle Compare twice and
   confirm focus stays on its action. Test long model names and locked settings.
3. Add references, expand/collapse their editor, edit/copy Prompt. Inputs persist.
4. In Look Sheet edit required fields and expand its definition; inspect the
   enhancement breakdown. No paid Generate is necessary to inspect this design.
5. At390/820px confirm natural scrolling and two-column narrow Image options;
   at1440px confirm footer visibility. Compare all themes and Thai/English.

Rerun only relevant groups using the commands above and `layout-image-workspace
--width 390`, `layout-look-sheet-workspace --width 390`, `layout-max-references
--width 1440`, or `options-visual --view composer` under the same runner. Actual
route checks need the existing Vite server at5173; API calls are intercepted and
unexpected mutations fail closed. No full suite, backend restart or paid job.

Remaining manual gaps: physical mobile keyboard/safe areas, short desktop840px
height, live provider/credit settlement and customer UAT. Desktop evidence uses
900px height. API6500 was not listening; frontend5173 is available, but real use
requires the separately started API. No new startup command is needed.

## R2 Acceptance Matrix

Run these checks for both Playground Image and Video with a loaded catalog and
normal application navigation. Existing defaults/provider capabilities remain the
inputs. Record viewport width and height, scroll position and reference disclosure.

| Check | Measurable pass condition | Required future evidence |
| --- | --- | --- |
| R2-01 First-entry discovery | At1440x900,390x844,820x1180 with scrollTop0, the selected Model and chooser are visible without opening another panel; long names remain readable | Actual Image/Video route screenshots; fresh and restored drafts; TH/EN |
| R2-02 Desktop workspace | At1440x900 left engine/options, compact references, Prompt entry and one Generate are visible without page scrolling; selected output and actions occupy the larger right region | Region coordinates, screenshots and DOM/keyboard order; empty and completed output |
| R2-03 Compact references | Detailed editors start collapsed; at most two summary thumbnail rows with remaining count; Add/Change and blocking issues remain visible; at390x844 Prompt label reached within one viewport of page scroll | Zero, one, and maximum supported references; rejected/missing/protected reference cases; no order/payload changes |
| R2-04 Editor access | Expand/collapse preserves selections and errors; affected-item action reaches its editor; no hidden required controls, covered final input or nested mobile tool scroll | Keyboard and pointer walkthrough; large reference set; accessible disclosure state |
| R2-05 Output actions | Existing primary actions directly below selected output; optional details expand; approval/recovery remains available; selecting Recent does not replace the authoring draft or submit | Owner interaction checks and completed/error/recovery fixtures |
| R2-06 Responsive action |820px portrait stacks tools before output;390px uses natural page scrolling and safe action placement; keyboard/safe-area changes do not cover input or Generate | Mobile/tablet screenshots and keyboard checks; all themes; no horizontal overflow |
| R2-07 Completion navigation | A matching user-started completion can reveal the result once while waiting; editing/navigation/background completion does not steal focus or open keyboard; explicit View result/return preserves work | Focus/scroll assertions with polling repetitions, user typing, selected context change and reduced motion |
| R2-08 Comparison and tasks | Comparison does not precede/displace Model; result slots, single aggregate quote/consent, Queue and Recent remain operable | Active Comparison and pending/completed task fixtures; no extra submission |
| R2-09 Scoped preservation | Accepted selector behavior stays intact; guided Look Sheets, Studio, Cinematic, Scene Builder and Fashion retain their region placement | Scoped diff plus affected existing workspace/owner checks, no broad unrelated redesign |

R2 evidence is recorded below separately from R1. Actual-route means the production
React route/application shell with API interception, not a paid-provider run.
Real provider/wallet settlement and device keyboard behavior remain manual UAT.

## R2 Implementation Evidence (2026-10-02)

- `options-shared`:45 tests; `options-playground`:41; `options-image`:33.
- Video focus helper and owner checks:35 tests passed in the worker's focused run.
- `types`, `options-locales`, `git diff --check`: passed.
- Final isolated composer:18 TH/EN/theme/viewport cases. Other R1 fixture containers
  were not re-run wholesale; their guided placement remains unchanged.
- Actual Image:36 cases, fresh and restored six-reference drafts across TH/EN,
  three themes,1440x900/820x1180/390x844. All first-view Model, desktop Prompt entry/
  Generate, stacking, disclosure, navigation and overflow assertions pass.
- Actual Video:18 maximum-nine-reference cases across the same locale/theme/
  viewport matrix. Normal two-reference desktop additionally passed6 cases.
  Thumbnails are40x50, bounded to one row with remaining count; all nine references
  stay in the quote snapshot. Editing/rejection recovery remains on the owner.
- At1440x900 the workspace starts at203px rather than311px. Image has a430px model
  control in a460px tool panel and648px output region. Restored Image exposes
  at least126px of the Prompt; maximum-reference Video exposes over44px above
  its action boundary. Entry is checked unobstructed, not just by offscreen bounds.
- Initial desktop failures were fixed, not excluded: redundant headings, large
  entry header, hidden Prompt, clipped four-column Video values and duplicate
  healthy quote row. Video now has three readable output fields plus a full-width
  Audio row; qualification information expands separately.
- QA found a disabled-feature stale `imageMode=look-sheet` header mismatch; header
  selection now follows effective feature availability, matching the body branch.
- Independent UX approved R2 placement after reading actual screenshots and
  metrics; independent QA found no remaining severe scoped issue after fixes.
  Main owns final browser execution, so independent browser reproduction is not
  claimed. The inherited dark Recent background in Pearl was also fixed only in
  the composer, using theme surface/text tokens and44px disclosure controls.

Screenshots/evidence are OS-temp artifacts (not application persistence):

| Final fixture | Evidence directory under `C:/Users/punya/AppData/Local/Temp/` |
| --- | --- |
| Image desktop / tablet / mobile | `mpf-video-references-layout-3Jaf42` / `-Wt0cp8` / `-wFrHwg` |
| Video maximum desktop / tablet / mobile | `mpf-video-references-layout-lr2C0M` / `-xYbQgV` / `-VjPmNI` |
| Video normal desktop | `mpf-video-references-layout-3AljMB` |
| Shared composer | `mpf-generation-options-OcRx5u` |

Re-run only affected groups; browser commands require an existing frontend server:

```powershell
node scripts/test-playground-video-references.mjs options-shared
node scripts/test-playground-video-references.mjs options-playground
node scripts/test-playground-video-references.mjs options-image
node scripts/test-playground-video-references.mjs options-locales
node scripts/test-playground-video-references.mjs types
node scripts/test-playground-video-references.mjs layout-image-workspace --width 1440
node scripts/test-playground-video-references.mjs layout-max-references --width 1440
node scripts/test-playground-video-references.mjs options-visual --view composer
```

Use `--width 820`/`--width 390` for bounded viewport checks, or omit the filter for
the three-width matrix. `VIDEO_LAYOUT_ORIGIN` defaults to`http://localhost:5173`.
All fixture requests are intercepted and mutations fail closed; no live Projects,
Credits or providers were changed. Do not use an aggregate for a local edit.

Remaining manual checks: real-provider generation and post-render actions on real
outputs, actual mobile keyboard/safe-area behavior, guided parent-route UAT from
R1, and enabled Video Comparison with a production-qualified catalog. The backend
was not started/restarted for this verification; frontend Vite was started when
port5173 became unavailable. The application API on6500 must be running for live UAT.

## R2 Requirement Review

Primary: Product Requirement Architect. UX Expert reviewer: Confucius. The review
identified six specification gaps: superseded order, measurable first-view model
visibility, compact references/Prompt reachability, lifecycle focus, scoped caller
preservation, and historical-versus-current evidence. The revised owner/inventory/
plan address these points. Confucius reviewed the updated 021/001/002/003 packet
and approved R2 with no blocking contradictions or required clarifications.
This records the historical requirement-phase approval. The user subsequently
authorized implementation; current delivery evidence is recorded above.

Historical documentation validation: all nine relative links in the four owning documents
resolve; `git diff --check` passes. This revision changed requirement/plan/index
documents only. No application code, runtime data or tests were changed or run.

## R1 Historical Verification

## Acceptance Matrix

| Check | Pass condition | Focused evidence |
| --- | --- | --- |
| UX01 model choice | One menu open and one item selection changes provider/model together; search optional; current model is visible | Shared chooser keyboard/callback checks |
| UX02 capabilities | Correct options/locked summaries for each media type; unsupported modes never appear as usable | VideoEngineTargetPanel/EngineTargetPanel fixtures |
| UX03 context change | Valid choices retained, incompatible references visible, changed defaults explained, old quote unusable | Owner-level state/request parity tests |
| UX04 narrow containers |390/820/1440 plus narrow sidebar inside1440; menu never clipped by parent/dialog | Screenshots, overflow and interaction assertions |
| UX05 references | Ordered role/name thumbnails; exact error item; authorized inspection; no silent dropping | Existing reference chooser and rejection tests |
| UX06 pricing | Fixed total versus usage maximum labelled correctly; pending/expired/error/insufficient states clear | Quote/consent fixture checks; no live debit |
| UX07 batch/comparison | Enabled item/slot scope, exclusions, per-slot and total prices remain correct; bulk always confirms | Existing batch/Comparison tests plus new selector integration |
| UX08 pending/results | Accepted operation immutable; result/Take/Queue/Recent remain visible and operable; no repeated dispatch/focus | Existing lifecycle UI tests with mocked providers |
| UX09 actor/preferences | No cross-actor draft/selection leakage; Project constraints override remembered values | Existing actor-scoped preference tests |
| UX10 accessibility | Correct combobox/listbox/radio semantics, keyboard, selected state, touch targets, desktop Tab exit, modal-sheet focus containment, Escape/focus restoration and reduced motion | Component interaction and browser checks |
| UX11 themes/locales | TH/EN in default/fashion/creative themes; long names and Thai wrapping; normal text at least 4.5:1 and essential controls/focus at least 3:1 | Locale parity, contrast measurements and representative screenshots |
| UX12 complete adoption | All17 inventory contexts mapped to evidence; prototypes excluded; no old live duplicate picker left unintentionally | Call-site search plus per-screen review checklist |

## Existing Test Owners To Extend

- `web/src/components/generation/VideoEngineTargetPanel.test.tsx`
- `web/src/components/generation/EngineTargetPanel.test.tsx`
- `web/src/components/generation/EngineTargetPanelFrame.test.tsx`
- `web/src/features/playground/components/PlaygroundVideoWorkspace.test.tsx`
- Existing Video model-selection/readiness and reference-source tests.
- `web/src/features/cinematic/routes/CinematicStudioRoute.test.tsx`
- `web/src/features/cinematic/components/StoryboardShotDialog.test.tsx`
- `web/src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx`
- `web/src/features/cinematic/components/SimpleStoryboardWorkspace.test.tsx`
- `web/src/features/profiles/components/CharacterLookDialog.test.tsx`
- Existing credit consent/actor persistence tests for adjacent behavior.

Add focused tests for the shared chooser, Comparison integration and currently
uncovered caller behavior when implementing those tasks. Do not test CSS class
spelling in place of the user's selection/focus/price interaction. Reuse existing
isolated Playwright patterns and the selectable runner planned in taskT01.

## Manual Screen Walkthrough

1. Open each live inventory context with a valid saved draft and sample media.
2. Read the current model/options without opening any menu. Change a model and
   confirm its provider, compatible values, references and refreshed Credit quote.
3. Switch aspect/duration/resolution/audio where supported; test a fixed Project
   value and a provider with fewer capabilities. No control change starts AI.
4. Open/close pickers using mouse, touch and keyboard, including inside a dialog.
   Check long labels, scrolling, Escape ordering and focus restoration.
5. Check empty references, multiple Characters, locked environment, a rejected
   image and a stale quote. Each issue must identify the relevant action/item.
6. Review single, Comparison and batch prices. Cancel confirmation and verify zero
   submissions. Use intercepted provider fixtures for accepted-operation checks.
7. Revisit the selected Shot/Take, candidate approval, Scene image list, Queue and
   Recent items. These sibling workflows must remain intact.
8. Switch actor and reopen the previous route. Confirm actor-scoped preference and
   draft behavior using existing authorized test accounts/fixtures.

For each context record: variant, before/after screenshot, viewport/container,
locale/theme, options used, preserved siblings, focused command/result, open gap
and reviewer. Never mark an unvisited dialog complete because its shared panel
passed in Playground. Live paid UAT remains separate and explicit.

## Expert Review Record

- UX/UI Expert agent Tesla reviewed the reference and current selection owners.
  Recommended three variants: composer/settings/slot, container-driven density,
  atomic provider/model selection and explicit batch aggregation.
- Accepted design cautions: preserve guided/read-only prompts and caller-owned
  actions; do not force every page into a composer; preserve active Comparison
  visibility; do not revive prototype controls or remove Fashion routing modes.
- Coordinating agent mapped17 live contexts, the two non-live findings, current
  component owners, quote/consent constraints and scoped requirement precedence.
- Written-packet review: Tesla reviewed all four documents and confirmed the
  17-context inventory, layout variants and protected adjacent workflows. Two
  findings were incorporated: preserve existing preference precedence without
  introducing persistence changes, and specify picker semantics, Tab/focus behavior
  and measurable contrast. No blocking product questions were raised.
- Follow-up Expert review confirmed both corrections and passed the requirement
  packet with no remaining UX blockers. This is design approval, not runtime QA.
- Implementation design review: Gibbs approved the controlled shared radio-menu,
  native capability fields and opt-in composer before edits. No new dependency,
  catalog, queue or credit controller was introduced.
- Independent UX review found pointer-leave focus loss and insufficient selected
  provider-text contrast in Pearl. Both were fixed and verified with pointer
  crossing/leaving and composited selected/hover state contrast checks. Gibbs
  granted approval for reviewed shared selectors and Playground Video; actual
  unvisited parent contexts remain open.
- Independent QA reviewer Plato found no substantive issues in the final targeted
  diff. Atomic provider/model selection, slot bounds, references, actor isolation,
  quote/consent/submission ownership and the `actual_usage` schema repair retained
  their existing contracts. This is focused review, not paid-provider qualification.
- Follow-up GO04 design review approved the ordered thumbnail strip with identity-
  based source lookup, a failed-image fallback, and exact rejection text/border.
  The source-editing actions remain unchanged. Focused tests and uploaded/trusted
  browser cases cover the final implementation; per-parent UAT is still open.
- Final QA spot review found protected preview loading and stale rejected-image
  highlighting after model/operation changes. Protected `/api/` thumbnails now use
  existing `AuthenticatedMediaImage`/actor-aware `apiMediaBlob`; public output
  previews keep the existing media URL handling. Actual model/operation changes
  dismiss the old issue using the existing draft field. QA confirmed both code
  fixes; final Playground 29-test and TypeScript reruns passed. No new media
  authorization policy or browser persistence contract was created.

## Delivery Evidence

### Runtime And Ownership

- New reusable presentation: `GenerationModelPicker.tsx`,
  `GenerationOptionSelect.tsx`, `generation-options.css`. The shared chooser also
  replaces provider/model controls in existing Comparison slots. No files moved.
- New isolated browser verifier: `scripts/verify-generation-options-layout.mjs`.
  Existing `scripts/test-playground-video-references.mjs` owns all selectable test
  groups; there is no competing aggregate runner.
- Playground uses the existing workspace with `composer` opt-in. Guided Studio,
  Scene, Look Sheet and Cinematic settings keep their existing locations/actions.
- `videoQuoteSchema` accepts the existing server `actual_usage` mode; maximum
  estimates are labelled appropriately. No settlement or price policy changed.
- No new runtime data paths, actor preferences, polling loops or caches. No live
  Project, wallet, provider task or output mutation occurred during verification.

### Focused Commands And Results

Run from the repository root; dependencies must be installed. Counts below overlap
between groups, so do not sum them as unique tests.

| Command suffix for `node scripts/test-playground-video-references.mjs` | Result |
| --- | --- |
| `options-shared` | 41 passed; final rerun includes pointer-leave protection |
| `options-playground` | 29 passed; final rerun covers ordered previews, failed-image icon, protected loading and stale rejection on model/operation changes |
| `options-cinematic` | 109 passed |
| `options-image` | 33 passed; final rerun after refinement notice change |
| `options-look-sheets` | 37 passed |
| `options-batch-comparison` | 40 passed |
| `options-fashion` | 9 passed |
| `options-locales` | TH/EN option keys/interpolation parity and catalog validation passed |
| `types` | TypeScript no-emit check passed |
| `options-visual` | 72 fixture cases passed: four containers x TH/EN x three themes x three widths |

`options-all` is available for a later explicit offline aggregate; it was not run
in addition to every focused group. This delivery does not run the entire project
test suite. `git diff --check` passes; Git may report normal LF/CRLF warnings.

### Browser Evidence

Final shared evidence: `%TEMP%/mpf-generation-options-UdGGRi/` (`evidence.json`,
144 screenshots with closed/open picker states). Composer, narrow settings,
Radix dialog and Comparison-slot fixtures use actual shared components/styles.
Checks include menu collision bounds, no page overflow, keyboard/search/IME-related
behavior, pointer focus protection, Escape/Tab, 44px controls, text >=4.5:1,
control/focus >=3:1 and selected/hovered provider-text contrast.

Actual mocked Playground Video route final evidence:
`%TEMP%/mpf-video-references-layout-sSIRXa/` (uploaded references) and
`%TEMP%/mpf-video-references-layout-fN1Egp/` (trusted generated sources). Twelve
TH/EN x 390/820/1440 cases passed, including 64x80 summary previews and wrapping.
References render, source browse is available, ordering/payload checks pass, and
no unexpected API/page error occurs. The runner
defaults to `http://localhost:5173`; the existing server listens on IPv6 localhost.
No application server was restarted. Shared fixture servers close automatically.

Route commands:

```powershell
node scripts/verify-playground-video-references.mjs
node scripts/verify-playground-video-references.mjs --trusted
```

### Manual Acceptance Still Required

Use the walkthrough above and the inventory's per-context gaps. Especially check
actual nested Look Sheet/Environment/First Frame dialogs, guided forms, Fashion,
mobile on-screen keyboards and selected Shot/Take recovery. The four fixture
containers do not prove all 17 complete parent screens. Provider quality, real
credit debit/settlement and real-world task latency were not tested in this UI task.

## R3 Delivery And Review

Primary UX owner applies the existing contract; UX Expert Einstein reviewed before
edits and QA Harvey owns separate fixture/release review. Three user screenshots
are the feature visual reference. No live API, wallet or provider is used.

| Task | Current evidence/status |
| --- | --- |
| GO-T19 | Completed source/design review: explicit guided composer, same media header, dedicated theme render accent, no nested signature frames. |
| GO-T20 | Complete; focused guided group45 and form/dialog/enhancement37 checks pass. Mounted fields, read-only prompt, consent and pending form/engine locks preserved. Recent state forwarded from existing Playground owner; Back uses stable tools ref when no prompt exists. |
| GO-T21 | Complete; existing shell/workspace and standalone engine CSS share the dedicated token. Shared45 plus latest disclosure4 focused checks pass; nested borders/glow suppressed in all three themes. |
| GO-T22 | Complete for scoped presentation. Actual Look Sheet36, late-label mobile12, isolated guided/settings/dialog18 each pass. Types, locales, syntax and diff checks pass. UX source/visual and independent QA signed off; no aggregate/full suite or paid UAT run. |

Changes: `PlaygroundRoute`, `CharacterLookSheetExperience`, `GenerationExperience`,
`PlaygroundGenerationWorkspace`, `GenerationEngineShell`, their existing tests,
`tokens.css`, `themes.css`, `playground.css` and `generation-options.css`.
`GenerationReferenceDisclosure` has an additive caller label; read-only references
use existing Reference images wording in summary/problem reveal. Default editable
wording and expansion/focus behavior are preserved.
No source moved, new runtime files, persistence keys, polling or paid workflow.
The existing visual/reference runners own added focused checks. Visual-language,
GEN-UX-021 packet and099 architecture record the shared signature and relocation.

### Final R3 Evidence

All browser output is under OS temp, not tracked/generated Project data:

| Evidence directory | Checks |
| --- | --- |
| `mpf-video-references-layout-GVreWV` |36 actual Look Sheet cases: fresh/restored x TH/EN x three themes x390/820/1440. Model entry, every form field hit-testable, adult validation, read-only prompt, quoted definition parity, mounted collapse, Recent inspection/collapse/reload, incomplete-form Back focus. General Image after Look Sheet retains at least140px usable Prompt; desktop media-switch bounds match. |
| `mpf-video-references-layout-VKcPQv` |12 additional390px fresh/restored TH/EN/theme cases after read-only reference label update. |
| `mpf-generation-options-qagOpX` |18 guided composer cases, including fields/collapse, controls, menu and signature checks. |
| `mpf-generation-options-pzvJ3p` |18 standalone settings cases: shared Video selectors and render frame. |
| `mpf-generation-options-vxKRcp` |18 dialog cases: standalone image frame, theme/keyboard/menu bounds. |

Fixture stabilization retains strict zero-scroll/unobstructed assertions: wait for
responsive closed-drawer transitions and scroll-to-top completion before measuring.
Fresh viewport contexts avoid treating resize animation as a field obstruction.
Early failed fixture attempts are superseded by the successful directories above.
No runtime Shell redesign, live backend restart or real Credit mutation was used.
Other focused checks: Playground42, workspace9, Image34 before the additional Back
regression (both guided integration cases then pass), and Shell1. Counts overlap;
they are not a unique total. No new Node runtime command is required for users.

### Manual Walkthrough And Gaps

1. Open Playground Image, then Character Look Sheet. Compare the same title/media
   row and left Model/right output placement; test Video switching too.
2. Fill/select Character, age and story fields. Collapse/reopen the definition and
   References; inputs remain. References are read-only and labelled accordingly.
3. Verify enhancement/image Credit breakdown, consent, insufficient/error states
   and disabled Generate when invalid. Do not start paid generation unintentionally.
4. Inspect a Recent image, return to settings with an incomplete form, collapse
   Recent and reload. None of these actions overwrites the Character definition.
5. Inspect shared render settings in Studio, Cinematic, dialogs, Comparison/batch
   and Fashion: one yellow/gold frame, no nested glow; their region order is unchanged.
6. On a physical mobile device, check the keyboard/safe area and reach the final
   field and action. Perform real render/review/export only during explicit paid UAT.

Physical keyboard/safe-area behavior, real-provider execution/quality, Credit
settlement and unvisited complete parent flows remain unverified. API6500 was not
listening during this delivery; frontend5173 remains available, with intercepted
fixtures for verification. Actual use needs the separately started API. No live
Projects, outputs or ledger data were changed.
