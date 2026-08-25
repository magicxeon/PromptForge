# 003 Restart Recovery And Reconciliation

## Current Boundary

- Video Provider Tasks are durable and keep existing recovery behavior.
- Image Queue execution records are process-memory records.
- Completed Images remain recoverable through History.
- Job Center must never imply that an Image job survives backend restart.

## Reconciliation Contract

A durable group child that is non-terminal, missing from Queue, and absent from
History becomes `reconciliation_required`. The group resolves to failed or
partially completed according to its siblings. Existing Credit startup orphan
reconciliation remains the only Credit authority.

Before Credits refunds a startup orphan, the composition root asks Generation
whether the reservation is still owned by a durable Video Provider Task. The
lookup must match `jobId`, `reservationId`, and owner `userId`. A matching task
preserves the reservation regardless of estimate expiry because the provider
may still be processing billable work. Missing ownership keeps the existing
Image/orphan refund path. If ownership cannot be checked, reconciliation fails
closed and preserves the reservation for Support review rather than risking a
premature refund.

A durable Video task that completes after its reservation was already refunded
must not attempt a second capture. It becomes `reconciliation_required` with a
stable `video_credit_settlement_conflict` code, while preserving provider usage
and the durable output for Support review. This state is terminal for polling
and must not keep the global Job Center activity indicator spinning.

The ownership query is a read-only Generation application contract injected by
`server/app/createApp.js`; Credits does not import or mutate a Generation
repository. Startup reconciliation never dispatches, retries, polls, captures,
or changes a Video task.

Automatic Image replay is prohibited until encrypted request retention,
provider idempotency, settlement replay, reference reauthorization, and
duplicate-charge tests exist. Job Center stores no duplicate prompt/reference
execution envelope.

## Local Failed-Video Cleanup Contract

- `scripts/cleanup-failed-video-data.bat` is the operator-friendly entry point
  for one Video Task; `scripts/cleanup-failed-video-data.ps1` owns preview,
  validation, backup and atomic mutation.
- Cleanup defaults to dry-run and must run while the backend is stopped before
  `-Apply`, preventing a later process write from restoring stale JSON state.
- A Task is removable only when it is `failed`, `cancelled`, or `expired`, has
  no durable `outputAsset.publicUrl`, and has no unsettled Credit reservation.
  A reservation-bearing Task requires `billingStatus=refunded`.
- Active, completed, captured, reserved and `reconciliation_required` Tasks are
  preserved for recovery or Support investigation even when no preview exists.
- Credit estimates, reservations, ledger entries and Support evidence are never
  deleted by this maintenance command.
- A non-approved Cinematic Attempt linked only to an eligible removed Task is
  removed in the same maintenance run. Approved Shot/Attempt lineage blocks
  cleanup. Each store write is atomic; the backup remains the rollback source
  if the two-store maintenance run is interrupted.
- The original Video Task and Cinematic Project stores are copied under
  `_temp/manual-video-cleanup-backups/<timestamp>/` before mutation.
- Bulk cleanup requires an explicit positive `-OlderThanHours`; optional
  `-OwnerUserId` limits actor scope. The `.bat` wrapper intentionally supports
  one explicit Task ID to reduce accidental deletion scope.
