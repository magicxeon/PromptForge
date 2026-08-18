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

Automatic Image replay is prohibited until encrypted request retention,
provider idempotency, settlement replay, reference reauthorization, and
duplicate-charge tests exist. Job Center stores no duplicate prompt/reference
execution envelope.

