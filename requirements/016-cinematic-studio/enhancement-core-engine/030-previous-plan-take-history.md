# Previous Plan Take History

Owner: Cinematic Project attempts; Generation owns durable Video task status.
Show current-Shot Takes as before and expose previous-plan video attempts when
their Shot ID is no longer active. Never attach historical Takes to a new Shot
by title/order. Allow preview/download, not automatic approval or timeline use.
Resolve status and media from the existing authorized Generation task facade
when opening a historical Take; do not dispatch or repoll the provider from UI.
Retain attempts on plan replacement and distinguish pending/failed/completed.
Queries must include actor/task, stay bounded and avoid one polling loop per Take.
Tests: stale Project status with completed task; old Shot not current; no cross-
actor data; existing current-Take selection/approval remains unchanged.
Status: implemented; isolated data and UI checks passed 2026-09-12. Live Project UAT pending.

## Tasks And Evidence

1. Done: Generation.getStoredTaskSummaries reads at most 128 requested task IDs
   in one owner-filtered repository read, without provider polling or settlement.
   Empty ID lists avoid a read. No cache or persistent projection is introduced.
2. Done: Cinematic.getProject projects terminal task status/output; preserves
   approved/superseded states and never writes the Project on read.
3. Done: Produce exposes previous-plan Takes in a disclosure; preview queries use
   existing actor/task keys. Only current-Shot packet matches can be approved.
   History remains paged eight items at a time; older summaries refresh on selection.
4. Passed: runner `takes` (owner isolation and no writes) and `produce` (27 tests,
   including historical playback and current Take selection).

Manual check: reopen a real Project whose plan changed, expand previous-plan Takes,
preview/download one, and confirm the current Shot's chosen Take remains selected.
