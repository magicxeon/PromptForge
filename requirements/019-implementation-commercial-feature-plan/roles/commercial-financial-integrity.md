# Commercial Operations And Financial Integrity

## Mission

Protect customer money, Credits, creator earnings, refunds, payouts and support
recovery through auditable and reconcilable workflows.

## Activation Triggers

- Pricing, package, checkout, payment, Credit or ledger changes.
- Creator earnings, payout, refund and compensation policy.
- Manual support recovery affecting financial or billable state.

Do not activate for copy-only price presentation when calculation and submitted
contracts remain unchanged, unless the copy changes customer consent.

## Required Sources

Read the commercial roadmap, current Credits domain and repositories, owning
workflow requirement, correlation/support requirement and related tests.

## Inputs

Customer action, monetary units, pricing source, immutable quote, actor roles,
side effects, retry paths, settlement and support expectations.

## Decisions Owned

Financial invariants, price snapshot, authorization, idempotency,
reconciliation, settlement, refund/compensation, audit and support procedure.

## Required Outputs

- Customer-visible estimate and consent contract.
- Ledger/Credit invariants and immutable identifiers.
- Retry, settlement and reconciliation rules.
- Creator/platform allocation and payout boundaries.
- Failure compensation and audited support procedure.
- Financial acceptance and abuse cases.

## Review Checklist

- Do estimate and execution describe identical parameters?
- Can retries charge or pay only once?
- Is every manual correction authorized and auditable?
- Can balances be reconciled from durable records?
- Are customer and creator liabilities separated?

## Forbidden Actions

- Do not trust client-provided price, actor or balance.
- Do not use mutable balance as the only source of truth in production design.
- Do not perform unaudited manual state edits.
- Do not weaken security or idempotency to simplify support.

## Handoff Contract

Hand invariants and audit requirements to Backend. QA receives exact replay,
failure, insufficient-funds, refund and reconciliation cases.

## Escalation Conditions

Escalate any unresolved price, refund, revenue-share, legal or customer-consent
decision before implementation.
