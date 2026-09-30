# 011 - Integration, Cutover And Cleanup

Screen: cross-screen. Status: Partial; task 015 implements bounded flow hardening.
Parent tasks: T07.1, T07.2, T07.3, T07.4, T07.5, T08.1, T08.2, T08.3, T08.4, T08.5.
Sources: [008 verification](../008-verification-migration-and-cleanup.md),
[010 acceptance](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic delivery; QA primary for closure, with affected Backend/UX reviews.
Depends on verified working page slices and recorded protected-surface baselines.
Local dead-code removal may occur with its page after proven consumer replacement;
shared cleanup and default cutover wait for this packet's integration evidence.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW10.01 | Run the explicit deduplicated isolated aggregate; rehearse migration/rollback on fixture copies. | Acceptance linked to actual tests; stable ID/hash/count and receipt lineage; no live mutation | Planned |
| RW10.02 | Review full manual/AI paths and UX01-UX09 at three widths/locales/themes against baseline. | Keyboard/focus/draft continuity; protected Engine/Render/queues intact; request/payload timings compared | Planned |
| RW10.03 | Execute a separately authorized live pilot, or record it awaiting live verification. | Actual model/mode/output quality evidence; no false complete claim from mocks; no auto paid run | Planned |
| RW10.04 | Cut over default authoring and remove only verified obsolete forms, mode branches, glue and CSS. | Old links usable; no active historical reader/protected dependency removed; rollback documented | Planned |
| RW10.05 | Consolidate useful assertions, update ownership/status and measure source-only cleanup. | Same denominator for before/after file/LOC counts; remaining risks and compatibility consumers listed | Planned |

## Scope And Ownership

Use the consumer inventory in 008 and packet 001. Engine & Target Output, Render,
Take actions, Shot/Generation queues, Job Center and current Final dependencies are
protected. Generated assets, user data, receipts and unrelated service changes are
never cleanup targets. Do not delete a file only because static imports missed a
dynamic route or historical reader.

## Review And Verification

`node scripts/test-cinematic-video.js rewamp-all` is the explicit aggregate only
after page selectors/tests are registered. Runtime migration uses its documented
dry-run/apply contract separately; aggregate tests never run it on live stores.
User feedback stays on the affected screen's log with a linked follow-up task here
only when the defect crosses screens. An unavailable paid pilot is reported plainly;
do not block useful local page fixes while waiting for provider-quality evidence.

## Feedback And Evidence

Task 015 records focused recovery/round-trip/export/Final checks and responsive
fixtures, plus an explicit task-only aggregate. Full `rewamp-all`, migration
rehearsal and live pilot have NOT been run for that slice. The duplicate local
clip-bundle schema/read request was consolidated into the existing Cinematic
API/schema owner. Zero source files deleted or moved; no project-size reduction
claim. Protected legacy/timeline readers remain active consumers, not trash.
