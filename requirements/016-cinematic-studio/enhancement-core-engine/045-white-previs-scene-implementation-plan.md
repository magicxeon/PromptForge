# Implementation Plan

## Follow-Up: Shot 3 And Scene Gallery (2026-09-13)

Scope: final video prompt presentation, Scene image preview/selection/toggle,
Shot image reference controls only. Preserve working sibling UI and workflows.

1. Reproduce Shot 3 budget with local read-only compiler and retain all inputs.
   Done: 4072 full / 4003 compact against 4000, two named Looks.
2. Implement compact section labels only on remaining overflow; focused compiler
   file plus live-data read-only recompile. Done: 30/30 compiler tests; Shot 3
   now 3922/4000, all direction/dialogue/references retained, runtime unchanged.
3. Extend canonical Scene/Asset reads with paged Project environment candidates,
   explicit reuse and enable/disable commands; persist through saved Plan.
   Done: environment/reference group 12/12. Includes private Project membership,
   pagination, older cross-Scene reuse, off/on, Plan round-trip and unchanged
   keyframe/video fingerprints, old media and Take records.
4. Add gallery/current preview/switch to existing SceneEnvironmentControl and Shot
   image reference lead, API schemas and EN/TH strings; no separate workspace.
   Done: environment-ui 3/3; existing Shot dialog 14/14 and Generate All 12/12.
   TypeScript noEmit passed. New test file lives beside SceneEnvironmentControl.
5. Extend existing browser verifier with selectable scene-gallery group. Verify
   affected controls at 390/820/1440 with intercepted requests; diff/i18n checks
   Done: `node scripts/verify-cinematic-manual-storyboard.mjs scene-gallery`
   passed EN/TH 390/820/1440 with real components and intercepted APIs. Inspected
   dialog/current image/gallery/Advanced controls in OS temp directory
   `mpf-manual-storyboard-nOJub8`. Existing unrelated Scene header translation
   fallback remains outside this change; new gallery has localized title fallback.
   i18n catalogs, diff whitespace and production build passed (existing vendor
   chunk size warning). No old assets deleted (`--emptyOutDir false`).

Read-only live-data check found the Project's completed environment image
`job_1789273101460_wd0xy6akb` in the new listing. No selection/approval was made
on behalf of the user. UI/QA/media/security lenses applied sequentially, not as
independent agents. No new runtime path, provider dispatch or Credit behavior.
Scene-only changes use Project optimistic concurrency without changing authored
Scene.version, avoiding false invalidation of existing video packets.

Use: Storyboard -> Scene environment -> Project scene images -> select a result.
The selected image is on by default; Use scene reference toggles future still
attachment without deleting the selection. The same control appears among Shot
image references. Existing Generate/Use for this scene remains available.
Production build is ready; a non-watch backend must load the changed server code.

Use `node scripts/test-cinematic-manual-storyboard.mjs environment` for the small
backend/reference group. Add selectable `environment-ui` to the same runner;
aggregate remains explicit offline/fail-fast. No paid generation, live Project
writes or worker restart. Existing Vite server serves browser verification.

Parent 042; implementation and offline verification complete, visual UAT pending.
No paid AI calls, live data writes or worker/server restarts.

1. Reconcile 038-041 and current compiler/Generation/reference ownership: done.
2. Implement White Previs policy branch, immutable style and end-to-end setting:
   implemented; existing policy/composer checks 19/19 passed, focused White
   branch and normal/blank compatibility passed. Settings UI and schemas passed.
3. Implement derived lead-in, temporal/audio offset, actual priced duration and
   per-Attempt usable range/default Finish trim: implemented. White/duration/
   Timeline group 10/10 passed, including legacy and explicit-trim preservation.
   Final White group 5/5 passes temporal/audio offsets and quote/submit delegation
   at 4.5 s with a 5 s task plus immutable per-Take range. Produce timing UI passed.
4. Implement Scene environment context/save/approval and extend existing batch
   registration; owner-verified reference binding/processing/dispatch: implemented.
   Scene group 6/6 and existing Reference Processing group 5/5 passed. Includes
   cross-actor/hash/version rejection, batch preflight, original media retention,
   saved-Plan round-trip and ignoring forged environment bindings in Plan input.
5. Add shared Scene environment generation dialog and scoped Simple/Advanced
   access, Facial Treatment selector, timing summary and EN/TH: implemented.
   Browser fixtures exercised save/generate/approve and normal-price display;
   existing approval/action/draft controls and both mode entry points retained.
6. Run short isolated groups, responsive browser checks with intercepted requests,
   typecheck/build, scoped diff/ownership review and record evidence: passed.

Extend scripts/test-cinematic-manual-storyboard.mjs with selectable treatments,
lead-in and environment groups; explicit aggregate remains offline and fail-fast.
Run individual groups after each task. Actual white-face/video quality and Scene
consistency remain separate paid user UAT, never inferred from contract tests.

New source modules belong to server/domain/cinematic for policy/projection and
web/src/features/cinematic/components for the Scene dialog. Assets and Reference
Processing extensions stay in their canonical owners. Existing JSON Project and
Generation/Assets stores persist additive fields only, without backfill.

## Verification Evidence (2026-09-13)

- `node scripts/test-cinematic-manual-storyboard.mjs environment`: 11/11.
- White group `node --test test/cinematicWhitePrevis.test.js`: 5/5; existing
  VideoPacketCompiler 29/29 and Timeline/duration 7/7. `lead-in` runner also
  includes existing Generation quote/submit/Credit duration parity tests.
- Manual Storyboard 33/33; existing normal captured-video approval regression
  passed using the focused cinematicApplicationService test-name pattern.
- UI run split into short files: Shot dialog 14/14, Produce 33/33, Simple 19/19,
  result surface 7/7, Studio workspace 3/3, ReferenceSlotGrid 4/4. Reference count
  includes Scene/Cast bindings; disabled Enhancement no longer hides image price.
- `node scripts/test-cinematic-manual-storyboard.mjs requests`: 33/33.
- `node scripts/verify-cinematic-manual-storyboard.mjs`: intercepted browser,
  EN/TH at 390/820/1440; real components, environment save/generate/approve, White
  selection, dirty navigation guards, approved preview and Advanced entry points.
  Screenshots in OS temp `mpf-manual-storyboard-CECrrZ`; inspected scoped dialog,
  treatment and Advanced controls. All provider/network writes are intercepted.
- TypeScript app noEmit, `node scripts/validate-i18n-catalogs.js` and
  `git diff --check` passed. Vite production build passed with existing large
  vendor chunk warning; retained old assets using `--emptyOutDir false`.
- Reviews applied sequentially (Backend, UX, Commercial, media and QA), without
  claiming independence. No foreign repository writes or duplicate pipeline.

## Handoff And Visual UAT

Open `/create/cinematic`, Storyboard. Scene controls precede Shot image controls
in Simple and appear under each Scene heading in Advanced. Generate an empty
location and explicitly Use for this scene; generate subsequent Shot images to
apply that reference. Faceless ON -> Facial treatment -> White Previs generates
the new white facial placeholders. Existing images are not relabeled.

For a new White-source video with a 4 s Shot, inspect the actual duration quote
(5 s when supported), usable start at 0.5 s and all faces/action/audio. Finish
defaults to 0.5..4.5 s; raw downloads/ZIP intentionally retain the full original.
The buffer cannot guarantee facial completion or environment consistency.
No live provider acceptance or exact output motion/quality is asserted. A running
non-watch backend must load the new server code before using the new endpoints;
this work did not restart processes or submit live test requests.
