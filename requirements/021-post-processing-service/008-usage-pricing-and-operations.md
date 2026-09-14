# 021-OPS - Usage, Pricing, Workers And Operations

Status: Planned. P0 needs bounded operation telemetry and cleanup only. Paid charging and cloud/GPU deployment are deferred. Owns source-proposal sections 30-40, 46-51 and operational decisions in 55-56.

## Usage And Commercial Boundary

The service records measured usage evidence: input/output megapixels, video seconds/FPS/resolution, audio minutes, generated dialogue seconds, processed face-seconds, worker profile, compute duration, queue time, retries and model version. These are not Credit balances. Core Credits remains the only owner of estimates, reservations, capture, refund and audit. No Post-Processing operation is billable by default in P0.

Later customer-facing units may be image plus MP tier, video second and resolution/FPS factor, audio minute, generated/repaired dialogue second or face-second, matching the source proposal. Raw cost, loaded cost, margin and Credit conversion need explicit product/commercial approval and server-side pricing configuration. Estimate and submitted options must match. Capture only successful billable work once, refund/cancel per policy, and reconcile duplicated/partial worker attempts. Separate internal cost evidence from customer price. Never hard-code price or retry charges in the service or browser.

## Workers And Deployment

P0 is a bounded CPU face-mask worker with explicit concurrency, queue limit, timeout, size limit, retry count, terminal cutoff and cleanup. Do not create a full GPU platform to deliver P0. For later phases, evaluate the source proposal's FastAPI + queue + Postgres + object storage + GPU workers and GCP deployment reference against actual capacity/security needs. Separate API/control plane from heavy workers. GPU profiles, model warm cache, scheduling, maximum job size and autoscale budgets require measured baselines; cache owner, TTL and size bound must be documented.

## Security, Retention And Observability

Use scoped service credentials, signed private media transfer, encryption, least privilege, secret rotation, consent-protected voice data, audit and data deletion. Decide source/derivative/temp/voice retention by product/privacy policy before production; worker scratch files have shorter bounded TTL and are cleaned on terminal or cutoff. Never log raw images, transcripts, audio, private URLs or credentials.

Trace Core request, service Job, worker attempt and output Asset with correlation IDs. Separate API latency, queue wait, media transfer, model time, encode and Asset registration. Record failure codes, worker saturation, retry counts, quality rejection and cost evidence. Alerts cover stuck Jobs, timeouts, failed cleanup, data-leak signals and budget.

## Acceptance

- P0 queue and Job have a bounded terminal outcome after interruption; status does not oscillate forever.
- Kill/restart, duplicate callback/poll, service outage and deletion tests preserve original Assets and actor isolation.
- Future paid releases pass Backend, Commercial, Privacy/Security and QA gates with explicit pricing/consent/retention decisions.
- Aggregate automated checks are explicit and isolated: no paid generation, live media mutation or worker restart as a side effect.

See [platform plan](implementation-plan/002-platform-readiness.md) and
[implementation master](implementation-plan/000-master.md).
