# Phase 2-08 Packages, Pricing, Checkout and Payments

**Status:** Proposed - Awaiting Review

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
-> reserve plan credits -> execute
```

User confirmation must not be inferred from opening a page or selecting an option.

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

