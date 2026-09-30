# 012 - Setup Story File Import

Status: implemented; focused automated and isolated browser checks passed. Live provider UAT remains separate. Owner: Cinematic Studio. Primary: Product Requirement Architect; UX and Backend/QA review applied sequentially by the implementation agent (not independent subagents).

## Scope and UX

Setup for both new and existing Projects accepts one `.md` or `.txt` story file. Put a compact Upload Story action immediately above the Story Idea field. Selecting a file opens an inline preview with filename, character count, destination selector and explicit Apply/Cancel. Treat Markdown as plain text, without executing markup or remote resources. Preserve surrounding Setup settings and mobile/tablet/desktop layout.

Recommend Draft for text up to the configured threshold (initially 600 characters); recommend Full Story above it. This is a length heuristic, not a claim that the plot is complete. The user may choose Full Story for a short complete work. Draft cannot accept more than its existing brief limit; never truncate an import silently. Explain invalid/empty/oversized/unsupported encoding errors in TH/EN. Import waits for configuration and uses the existing shared processing indicator.

Draft Apply replaces the visible brief after explicit confirmation and follows the existing save/generate flow. Full Story Apply creates an active manual revision, opens the Full Story writer, preserves previous revisions, Characters and production work, and leaves confirmation to the user. A new Project and its initial Full Story are created atomically. Import itself does not call a provider. Existing Project edits use the canonical revision save and optimistic version check.

The Full Story writer adds a scoped Generate Characters From Story action for saved text. It requests only dossiers, keeps the story byte-for-byte after input normalization, reuses known Character IDs, and applies through the existing revision/cast path. A failure leaves the imported story available for retry. Confirm then Generate Chapters works without generating another Full Story first. Existing Cast and Look references are preserved.

## Imported source disclosure follow-up

Status: implemented; focused automated and isolated visual checks passed. Primary: UX/UI Product Designer; Backend and
QA checks are sequential, not independent agents. Skill: review-product-ux.
Scope is only the Setup import/source/Story Idea area and its saved provenance.
Format, Genres, Story Settings, navigation and existing production remain intact.

1. Persist optional `setup.storyBriefImport` (filename, edited flag) alongside the
   existing brief, including actor-scoped new-project drafts. Preserve Full Story
   filename through manual/AI revisions with an edited flag; replacement resets
   that flag. Metadata is descriptive, never authorization or a filesystem path.
2. For an imported source, show filename, destination and edited state instead of
   the initially expanded Story Idea textarea. Edit Brief expands the same editor;
   Edit Full Story opens the canonical writer. A separate brief remains accessible.
   Non-imported projects keep the existing editor. Do not infer filenames from titles.
3. Reuse Upload/Preview/Apply for Replace File. Preview must name the destination
   and offer explicit Replace/Cancel. Cancel, invalid input and failed saves retain
   the original work. Full Story replacement creates a revision, not a reset.
4. No provider calls or automatic regeneration. Preserve cast, Chapters, Scenes,
   Shots and media. Reuse existing expectedVersion/actor checks and storage paths.
5. Focused domain/import/composer checks, TypeScript and isolated responsive
   browser checks at 390/820/1440px, TH/EN. No aggregate tests or paid UAT.

Legacy brief imports did not retain filenames and cannot be labelled retroactively
without evidence. Existing Full Story revisions with filenames are supported.
Only filename/edited metadata is added; no duplicate story or raw file is stored.

All five tasks above are implemented and checked. Full Story is the primary source
summary when both it and a separately imported brief exist; Edit Brief still opens
the retained brief. Revisions created before filename lineage was retained may
lack origin metadata; do not guess it or rewrite live records to fill it.

Evidence for this follow-up:
- `node scripts/test-cinematic-video.js rewamp-story-import`: 8 domain + 31 UI/route
  tests passed. Includes origin persistence/re-entry, edited metadata, replacement
  with identical prose, restore, cancelled/failed import, hidden editor, offline
  navigation, neighboring writer actions and actor-scoped cache behavior.
- `node scripts/verify-cinematic-story-import.mjs --import-source`: TH/EN at
  390/820/1440px passed; long filenames wrap, Brief expansion/edit/collapse and
  Full Story return/navigation preserve text. No page errors or horizontal overflow.
  Representative desktop and mobile screenshots were visually inspected.
- TypeScript app check with `--noEmit --incremental false --pretty false` and
  `git diff --check` passed. No aggregate tests, provider calls or live edits.
- Existing owners changed: Composer/import UI, Studio route serialization and
  tests, cinematic schemas, StoryImport/ApplicationService, TH/EN catalogs,
  cinematic CSS, existing focused test/visual runners and this requirement.
  No new files, moved modules, storage roots, caches or polling loops.
- Remaining UAT: real running API end-to-end save/reopen; non-default themes have
  token-based styling but were not visually rechecked in this scoped run.

## Limits and ownership

- `server/config/cinematic/workflow-policy.v1.json` owns allowed extensions, 256 KiB file limit and the 600-character recommendation threshold. Existing brief and Full Story limits remain authoritative (600 and 50,000 currently).
- Client reads UTF-8 text (optional BOM), validates filename/size/encoding/empty/control characters, and holds preview in component memory only. No raw file, Base64 or duplicate durable cache is introduced.
- Server revalidates imported Full Story content/name/byte and character limits. Existing actor-scoped repository and expectedVersion contracts remain authoritative.
- `CinematicApplicationService`, `CinematicFullStoryService`, `OpenAITextProvider`, and versioned prompt recipes own new behavior. No new queue, provider client, storage root or Credit workflow.

## Ordered tasks and acceptance

1. Add validated public import configuration and server initial-story/revision contracts. Check new Project import is atomic, full text survives, and invalid/foreign/stale input cannot overwrite work.
2. Add character-only structured extraction using the existing text policy/adapter and dossier schema. Verify it cannot rewrite the Full Story or fabricate unknown existing IDs.
3. Reuse the Setup composer for Upload/Preview/Apply on new and existing Projects. Add TH/EN messages and the writer action. Check brief/full destination choice, no truncation, errors, pending/offline states and preservation of existing actions.
4. Register `rewamp-story-import` in the existing cinematic test runner and include it in the explicit aggregate. Run only focused import/domain/UI tests. Verify the affected UI at 390/820/1440 px with isolated browser fixtures; no paid requests or live-data edits.

## Evidence

All four ordered tasks are implemented. No new runtime data directory, provider client or queue was introduced. Imported text uses existing Cinematic Project revisions; only the filename is added as optional revision metadata.

- `node scripts/test-cinematic-video.js rewamp-story-import`: 6 backend and 20 UI tests passed. Covers atomic creation, validation, existing revisions, ownership/version conflicts, character-only extraction, confirmation/Chapter continuation, destination preview and preservation of adjacent composer/writer actions. Registered in the explicit `rewamp-all` aggregate; the aggregate was not run.
- `node --test test/cinematicStoryImport.test.js test/cinematicRewampConfiguration.test.js`: 9 tests passed, including configuration bounds.
- `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false --pretty false`: passed. Nonincremental mode avoids local build-cache permission failures.
- `node scripts/verify-cinematic-story-import.mjs`: passed in isolated Vite/Playwright fixtures, TH/EN at 390, 820 and 1440 px. Import preview and Full Story content/character action were checked, with no page JavaScript errors or horizontal overflow. Screenshots were captured under the OS temporary directory; representative mobile preview and desktop writer were visually inspected.
- Browser fixtures mock API reads and forbid mutations. No paid generation or live Project edits were performed. Existing country-flag requests require the backend and were unavailable in the isolated fixture; the affected import/writer controls rendered correctly.

Live checks still needed: import into an existing running Project through the real routes, invoke character extraction with an entitled text model, confirm and generate Chapters. Model quality/latency and provider entitlement were not claimed by mocked tests. Classification is intentionally a configurable length recommendation, not semantic evaluation of story completeness.
