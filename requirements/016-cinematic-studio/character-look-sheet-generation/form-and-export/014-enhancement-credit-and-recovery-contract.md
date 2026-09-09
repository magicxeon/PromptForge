# Enhancement Credits And Recovery

ID: ME-CREDIT. Status: implemented; scoped fixed-service rate and isolated settlement tests passed.
Parent: [011](011-momelo-enhancement-master.md). Owner: Credits, coordinated by Generation.

## Price Authority

Updated user decision (2026-09-08): derive a service fee from the AI call rate;
one or two Credits are acceptable only when supported by cost. Publish a scoped
text-only fixed-service quote, calculated conservatively from bounded input and
maximum output cost, using existing FX, safety buffer and margin, rounding up to
one Credit (not the image policy's five-Credit increment). The fee may exceed two
Credits for larger requests. Show the fixed fee before explicit purchase; capture
that fee on delivery, not an alleged actual-token charge. Preserve actual token
usage separately. No free fallback, tools, automatic retries or hidden image fee.

Rate evidence: configured `.env` model is `gpt-5.6-luna`, max output 1,800 tokens.
[Official model rate](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
checked 2026-09-08: USD 0.20/M input, 0.02/M cached input, 1.20/M output.
Quote conservatively uses uncached input, no cache writes/tools; count the complete
serialized request with a UTF-8 byte upper budget and bounded protocol allowance.
Unknown models, missing/expired rate versions and unsupported budgets fail closed.
Do not change the existing global Prompt Refine configuration or image prices.

Original constraints below remain applicable unless superseded by the explicitly
authorized fixed-service pricing decision above.
Resolve the exact configured Prompt Refine provider/model and active rate version,
unit, effective dates, customer policy, FX/margin/rounding and model output budget.
Do not use image/video prices for text. A Finance planning draft is not active pricing.

Gate G1 evidence: `server/config/credit-pricing-policy.json:textEnhancement`,
version `momelo-look-sheet-text-2026-09-08-v1`. This new scoped fixed-service quote
does not migrate the old best-effort refinement path. Units are USD per million
tokens; the active entry has an explicit review deadline of 2026-10-08.
If the configured model lacks a usable published text rate or retail mapping,
return pricing_unavailable and mark activation pending; do not invent numbers.
Existing FX/margin/rounding rules are reusable only through Credits' public contract.

If active policy is a fixed fee, lock and charge that fee on successful delivery.
If active policy is token-based, quote a finite authorized ceiling, reserve it,
settle supported measured input/output/reasoning/cached units and release unused
credits. Never charge beyond consent. If Credits cannot safely perform partial
capture/release, that adapter is a blocking task, not permission to charge the cap
as an invented flat price. Missing usage is unknown, not zero cost.

## Two Separate Purchases

1. Enhancement: complete form -> price quote -> explicit Enhance confirmation ->
   durable operation + Credit reserve -> one AI call -> validated artifact -> settle.
2. Image: selected current artifact or original -> image quote -> explicit Generate
   -> existing image reservation/Queue -> capture/refund -> History/export.

Display these charges separately. Image retries never purchase enhancement again
when reusing the same valid artifact. Turning the toggle off or abandoning image
generation does not refund an already delivered text service. A technical failure
of image generation follows image settlement only.

## Financial Invariants

- Server actor owns quote, reservation, operation and artifact; client numbers,
  username, status, final prompt and price are not authoritative.
- Lock quote to normalized input/default/identity/reference/recipe fingerprints,
  text provider/model, surface, token budget, rate/policy versions and expiry.
- Reserve before any provider call. Existing ordinary refinement currently runs
  before image reservation; it must not be reused as the paid orchestration path.
- Same idempotency key and payload replays one result/status with one reservation,
  call and settlement. Changed payload conflicts. Concurrent requests cannot both
  win. A second browser tab and network retry do not cause extra provider spend.
- Persist accepted/in-flight/terminal state durably, not only in memory. Reuse
  Credits' mutation APIs; no second wallet, ledger or direct balance decrement.
- Persist the validated artifact before declaring successful service delivery.
  If capture is unresolved, do not expose a generate-usable artifact as settled.
- Known technical failure/refusal/invalid output releases/refunds through the
  owning policy; do not label an unenhanced fallback as paid success.
- A timeout/crash with unknown provider outcome needs reconciliation. No automatic
  redispatch or success claim. Provider cost may exist despite customer refund.
- Startup orphan recovery must recognize these Generation-owned text operations;
  do not refund a live operation merely because it has no image Queue Job.
- Explicit retry after terminal failure uses a new quote/request ID. Automatic
  transport status recovery is not an automatic new billable attempt.

## Trace And Reporting

Current reporting boundary: reservation and capture/refund ledger entries carry
the operation kind, rate and conservative cost/usage evidence. Full AI-text cost
aggregation into Finance screens is pending the owning Finance adapter (P3), not
claimed by this implementation. Cached-token cost is conservatively reported at
uncached input rate, explicitly marked as an upper cost, not actual invoiced cost.

Record operation kind, actor, quote/reservation/ledger IDs, request fingerprint,
provider/model/response ID, accepted rate versions, usage, provider-cost evidence,
timestamps, terminal state and refund/recovery reason. Keep raw prompt text out
of normal logs and Finance projections. Separate estimated/actual/missing cost;
do not recalculate historical costs using today's rate.
Finance consumes the canonical records; do not build a new report or production
rate publisher here. Extend existing attribution only as needed for the new kind.
Admin/Support retain current permission/charge policy, not a new unlimited bypass.

## Acceptance And Gates

Prove known-rate amount/units/rounding, missing-rate denial, disabled provider,
insufficient funds, expired quote, changed input, actor spoof, duplicate/concurrent
submit, invalid output, timeout, capture/refund retry and restart reconciliation.
Tests use isolated fixtures only. Existing image/video wallet and quote tests must
pass. Complete commercial/backend/QA review before activating paid UI.
