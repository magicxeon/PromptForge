# 004 Video Actual Usage

Scope: video calculator, provider claim and atomic settlement. Dependency: 001.

1. Quote a consented bound with immutable rate/discount/FX/markup evidence.
2. Activate only qualified new paid requests; preserve historical fixed/POC quotes.
3. Atomically claim provider dispatch to prevent duplicate external effects.
4. Validate returned usage and media; compute documented metric cost plus markup.
5. Capture within consent once and atomically release unused Credits.
6. Missing/invalid/over-cap evidence goes to reconciliation, not extra debits or
   silent zero-cost completion.
7. A definite rejection before provider dispatch releases its reservation
   immediately and idempotently. Ambiguous dispatch keeps its hold for recovery;
   concurrent submission/replay must not refund another active dispatch.
   Replaying a refunded/terminal reservation without a durable task must not
   dispatch again; a new attempt requires a new request and valid reservation.
   The existing Video application facade may coalesce active same-key submissions
   in the single-process JSON runtime. Scope by task store/actor/idempotency key,
   compare immutable request/quote/workflow fingerprints and remove only when
   submission/refund settles. Bound new flights through configuration and reject
   overload before reservation; never evict an active side effect by timeout.
8. Existing Finance returned-Credit totals include the new unused-reservation
   `release` events alongside refunds. This read-only projection must not infer
   cash/profit, double-count captures or rewrite historical ledger entries.

Checks: focused BytePlus runner, partial-capture ledger and historical quote tests.
No paid provider request is required. Other provider modes remain gated by evidence.

2026-10-02 independent QA found a post-reservation preflight rejection could leave
an orphan hold until startup. The scoped fix and missing/empty-status guard are
verified: settlement82, focused Video40, recovery13 and Finance6 passed. Independent
QA passed Video40/40 and Finance6/6 plus fault injection, with no remaining findings
in reviewed scope. No live account is modified by tests; production remains gated.
