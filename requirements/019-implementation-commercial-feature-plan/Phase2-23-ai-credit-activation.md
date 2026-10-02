# AI Credit Activation

Status: implemented and independently offline-verified for bounded development/
test, 2026-10-02. Live paid UAT and production qualification remain open. User
explicitly authorizes real
Credit reservations/capture. This replaces the deferred-charge decisions in
Phase2-22 and video/005 for NEW, explicitly priced requests only.

## Ownership And Review

Primary: Commercial Financial Integrity. Backend and QA are mandatory reviewers.
UX reviews user-facing consent before editing. Four roles are justified by the
financial gates and the user's explicit UX-review requirement. Credits owns all
money transitions; Generation owns durable AI operations; Cinematic owns source
validation, proposals and project mutation. No second wallet/provider pipeline.

## Operation Matrix

| Operation | Billing |
| --- | --- |
| Full Story generation/revision including returned Characters | Free for now |
| AI Brief enhancement/role analysis before Full Story | Paid |
| Characters extracted separately from imported/saved story | Paid |
| Chapter outline; all Chapters; selected Chapter revision | Paid |
| Scene and Shot/dialogue planning/revision | Paid |
| Legacy Story Plan and Scene Direction generation, including streaming | Paid |
| AI Environment description; Wardrobe suggestions | Paid text step |
| Legacy image prompt refinement | Free |
| Look Sheet AI enhancement explicitly quoted as a service | Existing paid service |
| Images, Look Sheets, First Frames, Environment images | Paid media step |
| Qualified video with supported cost evidence | Paid usage-based video |
| Unqualified model/rate or missing video usage | Block/reconcile; never silently free |
| Faceless and audio post-processing POC | Pending, billing not activated |
| Manual editing/import/save/copy/prompt assembly | Free |

Environment/Wardrobe text and image generation remain independent actions.
Display selected step prices and their sum before any combined paid action;
do not charge an image when only the text step was requested. No new automatic
image dispatch is introduced. Free controls display a localized green notice.

## Price And Consent

- Configuration owns rates, operation floors, FX, buffer, rounding and profit.
- Initial profit **markup on buffered provider cost**: text 30%, image 30%,
  video 30%. This is NOT 30% gross margin. Existing fixed image tariffs remain
  pinned for historical quotes; new activation must not reprice accepted work.
- Wire the category markup into NEW measured/token-cost image quotes and the
  existing paid Look Sheet text enhancement quote. Fixed image tariffs are the
  exception, not a reason to leave cost-based quote branches on old gross margin.
- Use verified configured provider rates; never infer model price from its name.
  GPT-6 Sol Standard rates rechecked 2026-10-02: USD2 input, USD0.20 cached input,
  USD10 output per million tokens. Long-context/tier premiums are not claimed to
  be covered by these Standard rates. [Official model pricing](https://developers.openai.com/api/docs/models/gpt-6-sol).
- Text uses a bounded upfront service quote (input/context estimate plus output
  allowance, floor and markup). Explain that this is a service price, not measured
  tokens. Persist available provider usage as cost evidence.
- Video reserves a consented maximum; actual token-based cost + markup is captured
  atomically, unused reservation is released. Seconds-based providers retain their
  documented metric rather than fictional tokens.
- Invalid/missing usage remains reconciliation-required. Actual cost above the cap
  never causes an additional debit: retain evidence and reconcile within consent.
- Quotes bind actor, operation, source/context and input, version, expiry, rate
  snapshot and markup. Changed data requires a new quote/consent.
- Paid calls require a server quote ID. Bulk and destructive operations always
  confirm with total Credits; existing profile preference may skip only individual
  confirmations, never quotes or server validation.
- Reserve before AI effects. Persist deliverable before capture. Capture/refund
  and duplicate replay are idempotent. Ambiguous dispatch is not auto-resubmitted.

## Durable State And Security

Use the existing Generation operation repository for text receipts, distinguished
by kind. Do not expose another actor's quote, private context or recovered result.
Keep delivered-but-unsettled results recoverable after crashes without another AI
call. Protect operation reservations from generic startup orphan refunds; the
owning service performs recovery. Retention is bounded, no raw prompt logging.
Client recovery receipts are actor-scoped, contain IDs/fingerprints only and are
saved before dispatch. A changed request must not silently create a second paid
operation while the previous receipt still needs review or reconciliation.
Dashboard edits use the existing Admin configuration revision/publication gate,
strict percentage validation, expected-version checks and audited activation.

## Small Ordered Tasks

See [ai-credit-activation/000-task-index.md](ai-credit-activation/000-task-index.md).
Record focused validation per task. Aggregate tests must be explicitly requested,
offline, fail on errors and never trigger paid generation or mutate live data.

## Acceptance

1. Free Full Story is usable with zero balance; Characters extraction is not free.
2. Every listed paid text endpoint rejects missing/stale/foreign quotes before AI.
3. Confirm/cancel, insufficient balance, duplicate and success/failure settlement
   are tested using temporary repositories and stubbed providers.
4. Video actual usage settles once, releases unused Credits, respects cap and
   preserves old/in-flight POC/fixed quotes.
5. Dashboard shows and validates three independent profit markup percentages.
6. Green Free notices, paid totals, bulk confirmation and responsive UI verified.
7. Trace API -> quote -> reserve -> provider -> durable result -> settle/recovery.
8. Post-processing is explicitly pending, not mislabeled free/complete.

## Activation Boundary

Real wallet reservation/capture is enabled for the configured paid text actions
and qualified video profiles in development/test. Production video qualification
is not granted by this change. Seedance 2.5 activation is limited to the measured
profiles in `server/config/videoPaidActivation.js`; unsupported profiles fail
closed instead of falling back to free/POC prices. Existing fixed image tariffs
remain explicit exceptions to cost-based image markup. Accepted historical quotes
retain their original settlement policy.

Final independent QA: no remaining findings in the reviewed scope; prior P1/P2
issues are closed. Video40/40 and Finance6/6 independently passed, including
missing/null/empty reservation status fault injection with zero provider calls
and unchanged ledger. See task007 and task008 for full evidence and live UAT.
