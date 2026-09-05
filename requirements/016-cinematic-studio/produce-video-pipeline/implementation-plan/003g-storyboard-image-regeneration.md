# 003G - Restore Storyboard Image Regeneration

Status: Implemented; scoped automated and responsive validation passed.
Live paid provider generation was not performed.
Owner: Cinematic Storyboard image-generation UI.
Requirement: ../../enhance-ux-ui/007-storyboard-image-generation-and-continuity.md
Primary: Product and Requirement Architect. Reviewers: UX and QA, applied
sequentially without independent agent execution.
Skills: review-product-ux, verify-release-regressions.

## Evidence And Scope

The Storyboard toolbar disables Generate when all Shots have approved sources.
The batch dialog also filters every approved Shot out of its context requests.
The single-Shot workflow already supports new candidates on approved Shots.

This package changes only batch availability and explicit scope selection.
Provider adapters, prompts, pricing, reservations, API contracts, approval,
Story/Cast/Looks, Produce and storage configuration remain unchanged. No paid
generation is invoked by verification.

## Steps

1. Update the owning requirement before implementation. Keep missing-only as
   the default batch scope and retain explicit approval of every replacement.
2. Enable the toolbar for any persisted Project with Shots. Reuse the batch
   dialog and existing checkbox styling for an unchecked Include approved Shots
   control. Reuse EngineTargetPanel, summaries, quote and submit APIs.
3. Bind context and quote queries to the selected scope. Recompute the estimate
   and submit only that quoted set. Keep Generate unavailable while checking,
   requoting, unaffordable, failed or submitting. Lock scope during submission.
4. Add English and Thai labels. Preserve single-Shot generation, saved engine,
   natural realism, errors, result preview and the existing approval workflow.
5. Verify toolbar availability with all-approved and empty boards; default
   skipping; explicit approved inclusion; scope changes; quote loading/error;
   no source mutation or automatic approval. Run existing single-Shot tests,
   focused batch tests, typecheck, localization and responsive checks.

## Data Handoff

Project Shots + explicit scope -> authoritative generation contexts -> image
engine/reference validation -> one estimate per eligible Shot -> summed Credits
-> unchanged submitCinematicStoryboardBatch command -> new review candidates.

The original approvedStoryboardSource is never removed by this selection.
Seedance eligibility, GCS and Asset Library are not prerequisites to this path.

## Verification Record

- 2026-09-05: Owning requirement updated before UI implementation. No API,
  provider, approval, prompt, storage or Credit-domain changes were needed.
- Frontend: 75 tests passed across StoryboardGenerateAllDialog,
  StoryboardShotDialog and CinematicUxPrototype. Coverage includes all-approved
  toolbar availability, empty-board protection, default scope, explicit opt-in,
  requotes, failed/pending quotes, source preservation and existing single-Shot
  generation. Command from `web/`:
  `node ../node_modules/vitest/vitest.mjs run src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx src/features/cinematic/components/StoryboardShotDialog.test.tsx src/features/cinematic/components/CinematicUxPrototype.test.tsx`.
- Backend: 11 existing tests passed using temporary fixtures and mocked
  providers. The route accepts replacement candidates; attempt registration
  preserves the approved source; explicit approval and stale-input checks are
  unchanged. Command from repository root:
  `node --test --test-name-pattern="Storyboard" test/cinematicApplicationService.test.js test/cinematicStoryboardGenerationRoutes.test.js`.
- `npm.cmd run build:web` passed TypeScript and Vite production build. The
  generated `web/dist/index.html` now references the rebuilt frontend bundle.
- `npm.cmd run i18n:validate` and `git diff --check` passed.
- Playwright exercised the actual dialog with mocked context/catalog/quote
  functions at 390x844, 820x1180 and 1440x1000. Dark/English and light/Thai
  variants passed keyboard checkbox selection and Generate availability after
  quoting. No horizontal overflow, overflowing controls or browser errors were
  detected. Top and footer screenshots were visually reviewed; evidence is in
  ignored `web/test-results/storyboard-regeneration/`.
- UX and QA were sequential checks by the implementation agent, not independent
  agent reviews. Existing controls and theme tokens were reused; no CSS was
  changed. No runtime data was mutated by this task.
- Remaining live check: refresh Storyboard, choose one Shot for a low-cost retry
  or explicitly include approved Shots for a batch, confirm the exact quote,
  and generate a new review candidate. Keep the old image until explicit new
  approval. Backend on port 6500 was unavailable during browser verification;
  provider acceptance and Seedance video qualification are not claimed here.
