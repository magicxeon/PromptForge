# Image 2.5 Provisional Estimation

Date: 2026-09-09. Updated: 2026-09-10. Status: implemented; isolated checks passed.
Owner: Credits pricing policy/service. Live paid UAT and invoice reconciliation
remain pending, separate from this estimate-policy activation.
Supersedes the sample-only size/quality/reference gate in 007.

## P1: Estimated Quote

User authorizes approximate usage pricing for Sunburst/Flare without a paid test
for every combination. Keep published modality rates and four measured samples.
Allow supported ratios, qualities and reference counts through the existing
catalog/adapter contract. Never use an unconditional one-Credit test tariff.

For unmeasured settings, estimate tokens from the measured pixel baseline and
configured quality multipliers; charge conservatively for additional references
using the measured edit bucket. Factors are internal assumptions, not official
provider token predictions. Store dimensions, factors, version, reference count,
rate evidence and estimated cost basis in the immutable quote. Keep measured
768x1024 auto baseline behavior. Actual provider-reported usage remains separate.

Implementation formula per output: text-only measured USD multiplied by
max(1, actual pixels / 786432) and the configured quality factor, plus the
measured edit-minus-text USD bucket times ceil(reference count / 2). Initial
quality factors: auto/low/medium=1, high=2, xhigh=3, max=4. Scaling the whole
text-only baseline is conservative relative to output-only scaling; it is still
an assumption, not a guarantee. The OpenAI adapter derives dimensions from ratio,
not the UI resolution label. Shared config keeps quote dimensions identical.

Use existing FX/safety/margin/rounding policy; no browser prices or surprise
post-generation debit. Already reserved quotes retain their price; retries,
refunds and stale one-Credit estimate rejection remain unchanged. Preserve missing
usage as unknown, not zero. New usage may update a future policy version only.

## P2: Verification

Test all catalog ratios, supported qualities, zero through maximum references,
output counts, invalid input rejection, estimate snapshot, known sample costs,
ownership, duplicate capture, insufficient balance and refund regression.
Run node scripts/test-openai-image25.mjs all. No paid generations or live ledger
mutation. Approximate costs cannot guarantee exact provider invoice or margin.

## Delivery Evidence

Policy: mock-2026-09-09-image25-estimated-v2. New shared output-size map:
server/config/openAIImage25.js. Existing OpenAIImage25Pricing and provider adapter
use the same dimensions. No new public API, browser price table or runtime store.
Existing measured baselines retain Sunburst 55 Credits text / 70 with 1-2
references and Flare 55 / 75 at 768x1024 auto, one output. Other supported
settings use provisional_usage_estimate with the pinned assumption version.

node scripts/test-openai-image25.mjs all passed 44 checks on 2026-09-10.
Rates/samples were not changed. Production catalog/quote access no longer needs
a measured sample for every supported setting; actual provider access and valid
credentials are still required. No paid generation, live balance mutation or
historical rebilling was performed. Normal backend restart loads the new policy;
obtain a fresh estimate instead of reusing an old unreserved quote.
