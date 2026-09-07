# Phase 2-08 Packages, Pricing, Checkout and Payments

**Status:** Payment/purchase adapters pending; existing generation pricing is reused (2026-09-07)

No checkout or payment persistence is established by local Credit success.
One-time Credit packs remain the first paid scope; the Fashion bundles below
are product examples, not a reason to delay DB/Auth or change existing rates.
Keep current server pricing and immutable accepted quotes; select the payment
gateway, currency/tax and refund rules before payment implementation, not before
the first local Identity slice.

## 1. Business Requirement

Customers see understandable package prices before work starts, while internal accounting records versioned operation costs. Payment processing must be secure, idempotent and independent from Fashion logic.

## 2. Pricing Model

```text
Package display price
  != mutable provider cost
  != final internal operation settlement
```

Each quote stores:

- Package and price version
- Included operations/output count
- Optional additions such as Product Analysis or Model Creation
- Maximum credits to reserve
- Currency/payment amount if purchasing credits
- Expiry timestamp and tax/fee snapshot where applicable

Changing the rate card does not change an accepted quote or historical purchase.

## 3. Initial Fashion Packages

Exact values remain configurable; requirement examples are not final prices:

- Starter: one product, one model, one scene, four outputs
- Small Collection: up to five products using a shared consistency profile
- Optional Product Analysis
- Optional Template Model Variation
- Optional Custom Model Setup

## 4. Checkout Flow

```text
build plan -> request quote -> display full price and inclusions
-> user confirms -> verify credits or create payment checkout
-> verify provider webhook -> grant credits/entitlement
-> revalidate accepted plan/quote and authorization -> reserve plan credits -> execute
```

User confirmation must not be inferred from opening a page or selecting an option.
The webhook grants purchased Credits; it is not implicit permission to generate.
Execution requires the still-valid explicit plan confirmation and idempotency
contract. Expired or changed quotes require a fresh quote and confirmation.

## 5. Payment Gateway Boundary

- Use a payment adapter interface.
- Verify webhook signature and event origin.
- Store gateway event ID uniquely.
- Webhook processing is idempotent and retry-safe.
- Never trust client-reported payment success.
- Payment secrets remain server-side.
- Persist raw provider payload only if required and protected by retention/privacy policy.

## 6. Payment States

```text
created -> pending -> paid
                   -> failed
                   -> expired
paid -> partially_refunded -> refunded
```

Credits are granted only from verified eligible payment state transitions.

## 7. Acceptance Criteria

- Complete maximum price appears before confirmation.
- Accepted quote remains immutable and traceable.
- Duplicate webhooks cannot grant credits twice.
- Payment and credit ledger reconcile.
- Fashion module consumes a quote/plan contract and contains no gateway code.
- Failed, expired and refunded payments have tested state transitions.
