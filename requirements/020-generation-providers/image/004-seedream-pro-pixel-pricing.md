# 004 Seedream Pro Pixel Pricing

Status: scoped implementation verified (2026-09-08).
Master: ../video/004-byteplus-pricing-reconciliation.md.

1. Resolve requested pixels with existing resolveModelArkOutputSize, the same
   function used by dispatch; do not duplicate resolution/aspect-ratio maps.
2. For dola-seedream-5-0-pro-260628, <=2,610,000 pixels costs $0.045/output;
   above costs $0.090/output. Reference input #1 free, later inputs $0.003 each
   per provider request. Costs use integer USD micro-units during arithmetic.
   Other Seedream per-image rates unchanged. Layer decomposition not enabled.
3. Keep existing published retail tiers (60 low / 120 high Credits) and reference
   surcharge (5 Credits after the first). Correct tier selection means 2K now
   uses high tier instead of the erroneously selected low default. Do not silently
   reprice every model using target margin: low 60 Credits is below the existing
   formula floor of 65; commercial margin approval is separately pending.
4. Existing outputCount represents separate single-output requests (Pro batch
   generation disabled); multiply per-request reference costs as dispatch does.
5. Auto aspect ratio has no exact requested pixels. Use high-tier cost/retail
   upper bound and mark estimate provisional; never claim exact cost. Do not
   disable supported Auto or change the provider's output size behavior.
6. Add provider-cost evidence to estimate breakdown (unit costs, reference count,
   output count, resolved size/pixels or upper-bound basis, rate version/source).
   Existing parity on resolution/aspect/reference/output count remains authority.
   Unsupported mapped dimensions or invalid tier config fail pricing closed.
7. Update stale 2.36M config/reference notes to 2.61M; bump pricing policy version.
   Preserve stored quotes and reservations; no live JSON migration.

Verification: exact threshold/one pixel above, 1K/2K across supported ratios,
Auto bound, first/extra reference, multiple outputs, unrelated provider parity,
Finance inventory and existing lifecycle tests. No paid generation.

Evidence: image group 20/20 tests; shared integration group 14/14 tests.
Implementation owner: server/domain/credits/BytePlusImagePricing.js, called by
CreditPricingPolicyService. Existing provider resolver and dispatch are unchanged.
No runtime data paths introduced or migrated. Auto actual output cost and the
retail margin approval described above remain pending commercial validation.
