# 003 Runtime Git Hygiene

Owner: repository maintenance. Status: implemented; index/file-preservation guard passed.

## Daily Development Backup Amendment

Status: implemented and verified 2026-09-07.

1. Every invocation of `scripts/start-dev.bat` must stop the previous development
   process, then back up the complete local `server/data` directory before
   rebuilding or starting the development stack. Stopping first prevents writes
   during compression.
2. Store the archive at
   `_temp/server-data-backups/server-data-YYYY-MM-DD.zip`, using the local
   calendar date. A later invocation on the same date replaces that date's ZIP;
   invocations on later dates retain prior daily archives.
3. Build a temporary ZIP first and replace the daily destination only after
   compression succeeds. A backup failure must stop startup and preserve any
   existing daily archive.
4. Include the `data` directory as the archive root so restoration is clear.
   The backup location remains covered by the existing `_temp/` ignore rule and
   must never be placed below `server/data`.
5. The backup helper may accept explicit source, destination and date parameters
   for isolated testing. Production startup always uses repository defaults.

Acceptance: an isolated run creates a readable ZIP containing nested runtime
files; a second same-date run replaces the archive; failure returns non-zero;
`start-dev.bat` invokes backup after stop and before build/start commands.

Evidence: `node scripts/test-studio-video-hardening.mjs backup` passed creation,
archive-root, same-date replacement, invalid nested-destination and batch-order
checks. A real local backup was also created and replaced successfully at
`_temp/server-data-backups/server-data-2026-09-07.zip`. The test uses isolated
data under `_temp` and removes it afterward; it does not start the application.

1. Ignore server/data contents except its source README; keep .env exclusions.
   History, provider registrations/tasks, trusted source URLs, account state,
   backups and migration reports are mutable private runtime data, not fixtures.
2. Remove already tracked runtime files from the Git index ONLY. Preserve every
   local file and all existing modified contents; do not reset/rewrite history.
3. Add a read-only check listing offending paths, never their secret contents.
   Fail if runtime JSON is tracked; scan staged text for concrete signed URL
   query parameters without matching examples of parameter names in source.
4. Document that ignore rules do not clean old commits. If push protection still
   identifies old history, stop and coordinate separate history cleanup. Rotate
   exposed credentials where applicable; do not bypass push protection.
5. Fresh clones need approved initialization, not copied live datasets. Existing
   repositories provide empty/lazy stores; identity seed readiness is recorded
   separately and must not be confused with production login readiness.

Acceptance: files still exist locally, no runtime JSON tracked, hygiene guard
passes. Never stage unrelated source changes or commit/push automatically.

Rollout precaution: before pulling the eventual runtime-removal commit on other
existing checkouts, back up their server/data directory outside the repository.
Git may remove previously tracked files during that pull. Restore each machine's
own backup afterward into the ignored runtime directory; never use another
environment's private records as seed data. This workspace's index-only removal
has already preserved and verified its local files. No commit/push was performed.
