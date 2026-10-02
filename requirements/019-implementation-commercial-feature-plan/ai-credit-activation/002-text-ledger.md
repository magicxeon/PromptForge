# 002 Durable Text Billing

Scope: Credits quote/reserve facade and Generation durable writing receipts.
Dependency: 001. No new wallet or runtime data file.

1. Validate rate freshness, configured floor, category markup and input bounds.
2. Persist actor/input/source-bound expiring quote before accepting work.
3. Claim once, reserve before provider dispatch and persist result before capture.
4. Refund known failed deliverables; retry capture without another AI call.
5. Preserve ambiguous interrupted dispatch for reconciliation, not auto replay.
6. Keep Look Sheet recovery isolated by receipt kind; bound retained result data.

Checks: `node scripts/test-ai-credit-activation.mjs text`.
Evidence: text15 and ledger4 pass using temporary repositories. Independent QA
verified durable capture/refund, metadata preservation, immutable accepted quotes,
recovery of delivered results and kind-isolated startup handling. Lost responses
do not create another paid request; wallet/ledger queries refresh on settlement.
