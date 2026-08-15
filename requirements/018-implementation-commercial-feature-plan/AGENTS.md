# Commercial Requirement Instructions

This file extends the repository root `AGENTS.md` for work launched under this
commercial program. Root security, actor, approval and capability rules still
apply.

Read `roles/commercial-financial-integrity.md` as the primary professional
charter for pricing, Credits, payments, refunds, payouts and billable support
recovery. Use `review-commercial-integrity` and add Backend plus QA for material
financial state changes.

- Define immutable quote, ledger, settlement and reconciliation identifiers.
- Keep retry, idempotency, compensation and audited support behavior explicit.
- Separate customer charge, creator earning and platform liability.
- Never trust client-provided price, actor, balance or payout state.
- Require raw replay evidence for financial acceptance and recovery tests.
