# Inline Shot Editing And Image Look References

Status: implemented; focused offline and visual verification passed. Primary: Product Requirement Architect; sequential UX and QA
review (no independent reviewers). Skills: review-product-ux, release-regressions.

## Scope And Protected Behavior

1. Storyboard cards and the Shot dialog get an Edit Shot action and inline editing panel. Reuse
   Plan's ShotSequenceEditor in direction-only mode, saving via the existing
   version-checked Shot PATCH. Opening moment, action, emotion, continuity, camera,
   lighting and prompt edit the canonical project.scenes Shot, not a copied plan.
   Additional direction may be blank when structured opening/action is provided.
   Save/Cancel remain on Storyboard; errors retain edits; pending prevents duplicate
   saves. Current Plan selection/navigation, generation and pricing stay unchanged.
2. Direction edits keep approved image/attempt IDs, all previous Takes and files.
   Mark the Shot draft and downstream video packets stale; never present existing
   media as regenerated or automatically enqueue/approve replacement media.
3. Playground general Image gets Choose Look Sheet plus Browse Look Sheet in the
   existing character_reference slot. Reuse the generated Look picker (category
   look-sheet only) and canonical upload. Selection replaces that slot and clears
   a conflicting Character handoff via the existing controlled-reference callback.
   Other references remain unchanged. Read-only, unsupported models, capacity,
   owner-scoped listing, errors and upload status remain enforced. No extra slot,
   provider dispatch, Credit policy, public visibility or Base64 persistence.

## Ordered Tasks

1. Done: extend owning Shot PATCH string fields; retain media with stale markers. Add
   focused domain regression for media preservation and version/owner rejection.
2. Done: add inline editor using shared Plan fields and localized Save/Cancel/error states.
   Keep GenerationExperience mounted while editing; do not lose completed previews.
3. Done: enable shared slot's optional Look picker only on Playground general Image;
   retain existing upload, provider capability and reference-count contracts.
4. Passed: focused UI tests per change, type check, then desktop/tablet/mobile visual check.
   Tests are isolated; no paid image/video calls, live mutations or worker restart.

New modules belong under existing cinematic components/tests. No storage migration
or runtime data path added. Update statuses and commands with evidence below.

## Evidence And Rollout

- `node scripts/test-generated-cast-sheets.mjs inline-shot-domain`: 1 focused domain
  test passed (canonical fields, optional extra prompt, retained media and attempts,
  stale project version and unrelated Shot/reorder preservation).
- `node scripts/test-generated-cast-sheets.mjs inline-shot-ui`: 12 tests passed,
  including direct card action, unchanged preview node, explicit Save, Cancel,
  error-retained draft, stale-image status and existing generation controls.
- `node scripts/test-generated-cast-sheets.mjs image-look-ui`: 7 tests passed,
  including selection replacement, capacity/read-only/unsupported gates, category
  filtering and existing Character picker behavior.
- `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false`
  passed. Locale JSON/new EN/TH key parity and `git diff --check` passed.
- `node scripts/verify-storyboard-inline-edit.mjs`: real shared components with
  isolated intercepted APIs passed EN/TH at 390/820/1440; screenshots inspected.
  Evidence: OS temp `mpf-inline-edit-RXnvBB`. Default theme verified; other themes
  inherit existing tokens but were not separately visually exercised.

The existing selectable runner has an explicit `all` aggregate for later use;
it was not run. Browser script requires the local Vite server, default 6501 or
CINEMATIC_WEB_ORIGIN override. Live project mutation and paid generation remain
user UAT. Backend was not restarted while the user may have active provider jobs.
After jobs finish, restart the app to load the Shot PATCH change; existing media
and persistent history require no migration. No script mutates live project data.
