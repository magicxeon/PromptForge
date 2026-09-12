# Simple Production And Sketch Storyboards

Status: implemented within the guided-production boundary; offline validation
passed 2026-09-12. Live AI/provider pilot remains open.
Primary: Product Requirement Architect.
Reviewers: Generative Cinematic Production and QA; Backend/security/financial
gates applied for reference/quote changes. Sequential review, not independent.
Skills: design-cinematic-experience, direct-generative-cinematic-production,
implement-generation-workflow, review-product-ux, verify-release-regressions.

## Ordered Tasks

1. 030: Preserve access to previous-plan Takes and reconcile terminal task state.
2. 031: Sketch storyboard composition reference plus Look Sheets, photoreal video.
3. 032: Playground audio default, remembered tab and compact attachment layout.
4. 033: Progressive Simple interface over existing Advanced data and workflows.

No live generation, paid retry, data backfill or worker restart during delivery.
Run only short owning checks per task, not full repository suites. The aggregate
runner is explicit opt-in. Keep user provider/UAT separate from offline tests.
Existing approved Takes, Storyboards, Cast, Series/Season/Chapter and Advanced
actions remain accessible. No separate simplified Project schema or provider path.
Automatic Character/Look generation incurs extra cost and has not been separately
authorized: present its existing quote/confirmation flow, never call it silently.
Preserve sequence first: time-zero still, causal action, resulting state; sketch
style does not fix a contradictory plan or guarantee provider acceptance.

## Evidence

Child requirements 030-033 record completed tasks and explicit UAT boundaries.
Focused groups passed: takes (1), sketch (4), sketch-quote (1), still-policy
(14), preferences (2), setup (9), produce (27), video packet compiler (12).
TypeScript no-emit check passed. No aggregate suite or paid generation was run.
Browser fixtures passed EN/TH at 390, 820 and 1440 pixels: six attachment cases
and six Simple Setup cases, including mode round-trip and optional controls.
Final screenshots: temporary directories `mpf-video-references-layout-Q3VYn5`
and `mpf-simple-production-txhFyO`; no horizontal overflow or clipped controls.
Fixtures use isolated mocked APIs; these are not evidence of live provider quality.

## Repeatable Checks

Install existing project dependencies first. Run one short group at a time:

```powershell
node scripts/test-cinematic-simple-production.mjs takes
node scripts/test-cinematic-simple-production.mjs sketch
node scripts/test-cinematic-simple-production.mjs sketch-quote
node scripts/test-cinematic-simple-production.mjs still-policy
node scripts/test-cinematic-simple-production.mjs preferences
node scripts/test-cinematic-simple-production.mjs setup
node scripts/test-cinematic-simple-production.mjs produce
node scripts/test-cinematic-simple-production.mjs types
node --test test/cinematicVideoPacketCompiler.test.js
```

Browser groups require an already-running Vite frontend and installed Playwright
Chromium. They mock API calls, do not start workers and do not generate media.

```powershell
$env:VIDEO_LAYOUT_ORIGIN = 'http://127.0.0.1:6501'
node scripts/test-cinematic-simple-production.mjs attachments
node scripts/test-cinematic-simple-production.mjs layout
```

The runner's `all` argument explicitly runs its listed groups, stops on failure,
and requires the browser prerequisites. It is not part of automatic startup.

## Runtime And User Pilot

No new runtime directory, cache, polling loop, endpoint or file move. Additive
style metadata lives in existing Generation History and approved Cinematic Assets;
UI/audio preferences remain in existing actor-scoped storage. No live backfill.
New test files belong to `test/`; owning runners belong to `scripts/`.

Backend was not restarted. Rebuild/restart through `scripts/start-dev.bat` when
active work permits. Generate and approve a NEW Storyboard to receive sketch
provenance. Old photoreal approvals are never silently relabeled. Use storyboard
sketch is explicit; a saved Looks-only preference remains unchanged.

Manual pilot: prepare a Simple brief, select authorized Looks, generate/review the
plan and sketch, check sketch plus Looks in Produce, confirm cost and generate one
video. Verify photoreal output, chronological motion and saved Takes after reopen.
Simple reduces authoring fields but does not auto-create paid Cast, auto-approve,
or silently render a whole film. Provider acceptance is not guaranteed by a sketch.
