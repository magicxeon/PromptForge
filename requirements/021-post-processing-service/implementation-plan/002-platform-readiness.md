# P1 - Platform Readiness

Status: Planned. Depends on measured P0 evidence. Owners: [API/security](../001-api-jobs-assets-and-security.md), [models](../007-model-registry-quality-and-licensing.md), [operations](../008-usage-pricing-and-operations.md).

## Tasks In Order

1. **P1.1 Review P0 evidence and capacity.** Measure CPU time, queue wait, media transfer, memory, model warm time, face failure rate and cleanup. Decide whether P0 worker can be production hardened or needs queue/object storage; do not select GPU/cloud by assumption.
2. **P1.2 Finalize private transport and persistence.** Choose service Job repository, private object store or equivalent scoped transfer, migration/rollback, expiry and replay rules. Confirm Core Assets is still the only customer media registrar; prove restart and cross-process idempotency.
3. **P1.3 Security and privacy.** Threat-model grants, service credentials, SSRF, actor boundary, object encryption, logs, secrets, deletion and regional processing. Approve retention and voice-specific segregation before any voice Asset exists.
4. **P1.4 Build operations controls.** Bounded queue/concurrency, cancellation, terminal cutoff, dead-letter recovery, temp cleanup, telemetry and alerting. Record baseline and budget for every cache/poll loop, including TTL and size.
5. **P1.5 Establish model registry/quality.** Pin code/weights/license separately, qualification fixtures, deployment profiles, reproducible benchmarks and rollback. Capability API advertises only signed-off operations.
6. **P1.6 Resolve commercial policy only if needed.** Commercial/Backend/QA approve quote units, price version, settlement/refund and reconciliation through Core Credits. If undecided, keep every later paid capability disabled and still allow non-billable internal qualification.

## Verification And Gate

Extend the explicit focused runner with platform/security/ops groups; mock cloud services and use disposable stores. Test restart, duplicate delivery, stale grants, cross-actor access, stuck Job cutoff, corrupt media, queue saturation and secret redaction. A separate staging soak test measures capacity and clean shutdown; no live customer data or paid generation in aggregate. Document actual commands, environment prerequisites and evidence when implemented. Exit only after Backend, Privacy/Security and QA signoff; Commercial signoff is mandatory before billable release.
