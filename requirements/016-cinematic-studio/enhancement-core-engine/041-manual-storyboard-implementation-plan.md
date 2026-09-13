# Manual Storyboard Implementation Plan

Parent 038. Status: implemented and offline-validated; live visual UAT remains.
No paid provider calls or automatic worker restart.

1. Requirements and ownership reconciliation: done. 038-040 supersede only Simple
   navigation/authoring and mandatory still faceless mode, preserving Advanced.
2. Canonical bounded manual row normalization, additive contracts and facade/routes:
   done; 33 focused manual/API tests passed. Targeted mutations preserve sibling records,
   source assets and Takes; timelines are bounded/validated without truncation.
3. Still option request -> compiler -> output-style metadata, coherent OFF/ON policy:
   done; full flag normalization, quote/batch parity and metadata assertions passed.
   New defaults are normal faces; ON applies
   the complete faceless policy, including reference/subject/capture instructions.
4. Video face authority at time zero and exact manual timeline rendering: done.
   36 focused offline compiler/production tests passed. Full face reconstruction
   precedes frame zero; exact timed events replace inherited action instructions.
   No provider generation was run. Actual face quality remains user visual UAT.
5. Shared generation owners gain opt-in embedded layouts; Simple row workspace,
   Cast-to-Storyboard navigation and EN/TH/theme controls: implemented.
   19 isolated row tests plus existing image/video owner regression tests passed.
   Dirty draft aggregation guards mode/stage/Chapter changes and browser unload.
6. Focused backend/API/schema/UI groups, then responsive browser screenshots at
   390/820/1440 with intercepted APIs; targeted adjacent Advanced regressions:
   done. UI owners 74 passed, request/schema group 33 passed, navigation and
   adjacent Advanced prototype 76 passed (run in small groups, not aggregate).
   Prompt groups 55 passed. EN/TH real embedded owners verified at all
   three widths with intercepted APIs and in-memory facade mutations; no overflow,
   images loaded, dirty edits survived row switches and blocked generation.
   Mode/rail controls re-enable after Save. Screenshots are in OS temp:
   mpf-manual-storyboard-IAbVwo (EN/TH, 390/820/1440).
7. Review diff, update evidence, typecheck and build the actual 6500-served web:
   done for local code/build. App and Node TypeScript noEmit passed, scoped
   git diff --check passed (existing CRLF notice only), Vite build passed with
   the existing large shared-vendor-chunk advisory. Existing build assets retained.
   web/dist/index.html points to index-DoBCkBNz.js and the generated Cinematic
   chunk is CinematicStudioRoute-DpJlmhuh.js. HEAD localhost:6500 timed out during
   verification; live served entry/backend routes are NOT claimed verified.

Each implementation step records focused evidence here before proceeding. The
aggregate runner belongs under scripts/test-cinematic-manual-storyboard.mjs with
separate groups and explicit all; no tests trigger real AI, live writes or restarts.
Existing approved frames, Look identity authority, quote/submit binding, Take
selection, previous-plan media and actor isolation are protected behaviors.

## Commands And Boundaries

- `node scripts/test-cinematic-manual-storyboard.mjs manual`: isolated repository,
  facade, HTTP route, concurrency, reference authority and still preference tests.
- `node scripts/test-cinematic-manual-storyboard.mjs prompts`: short compiler and
  prompt-policy groups; no provider requests.
- `node scripts/test-cinematic-manual-storyboard.mjs ui`: selected React/schema and
  adjacent shared Generation tests (74 assertions).
- `node scripts/test-cinematic-manual-storyboard.mjs requests`: image batch,
  Generation API and Cinematic Zod response contracts (33 assertions).
- `node scripts/test-cinematic-manual-storyboard.mjs navigation`: Simple rail and
  existing Advanced navigation/prototype contracts (76 assertions).
- `node scripts/test-cinematic-manual-storyboard.mjs aggregate`: explicit offline
  aggregate, stops at first failed group. Requires installed Node/web dependencies.
- `node scripts/verify-cinematic-manual-storyboard.mjs`: requires existing Vite on
  6501 (or CINEMATIC_WEB_ORIGIN localhost override), intercepts all API/paid requests.
  Uses real compilers/facade with in-memory data; generated screenshots go to OS temp.
- `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false`.
- `node node_modules/typescript/bin/tsc -p web/tsconfig.node.json --noEmit --incremental false`.
- From web/: `node ../node_modules/vite/bin/vite.js build --configLoader runner --emptyOutDir false`.

## Manual Handoff

1. Start/restart the backend through the existing operator workflow if it still
   has the old route/prompt modules loaded, then refresh the built application.
   This implementation did not start/restart workers or replay queued work.
2. Simple: Setup -> Cast -> Storyboard. Add Scene, write its image prompt, select
   Cast/Looks and manual timed events, then Save. Image/Video actions stay separate.
3. Generate an image with Faceless OFF or ON as desired. Approve the image when
   using it as the video composition source; existing Looks-only mode remains.
4. Generate one chosen video manually. Inspect every visible face at 0:00 and
   through head turns; compare identity with each own Look Sheet. Inspect exact
   event order and natural motion. Model compliance is not guaranteed by tests.
5. Review/select the desired Take, download selected clips. Old media is retained.

Final QA corrections: future Faceless preference does not bump Shot.version;
timeline-only conversion of legacy Shots preserves still authority; full manual
image text is preserved or rejected explicitly when composed provider budget is
exceeded. No silent reference/text removal or additional paid reconstruction pass.

UX and backend/prompt review were delegated in disjoint scopes; each worker also
reviewed related integration, so this is not claimed as a fully independent release
audit. No live Project or runtime data paths introduced or rewritten. New UI files
are SimpleStoryboardWorkspace/Row and the owning test in web/src/features/cinematic/components.
Browser tooling lives under scripts/; canonical data remains cinematic Projects.
