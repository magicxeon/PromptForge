# FIN-002 Versioned Rates And Scheduled Publication

**Status:** Planned; extends the single Admin Configuration lifecycle in
[018-010](../../018-implementation-backend/010-versioned-runtime-configuration-and-video-rate-cards.md)

## 1. Independent Versions, Coherent Snapshot

Separate provider-cost rate version, customer retail Credit policy version,
pricing FX version and cost-reporting FX evidence. A published pricing snapshot
resolves compatible immutable versions and a calculator/schema version.

Editing a provider rate may produce a cost-only revision and a retail impact
preview. It never automatically changes Credits, Template fees or FX. A retail
change requires explicit validated publication. Existing fixed Credit tables
and formulas remain available through the current calculator; do not silently
replace fixed prices with a new margin formula.

Every revision has a human-readable version label plus an opaque immutable ID,
scope, predecessor/base-active ID, fingerprint, validation evidence, actor,
reason and optimistic version. Display labels are not uniqueness/authority keys.

## 2. Date Semantics

| Field | Meaning |
|---|---|
| createdAt / recordedAt | When the system first records the revision/evidence |
| announcedAt | Optional declared announcement date; not activation or automatic customer messaging |
| providerEffectiveFrom / To | External provider's documented rate interval |
| effectiveFrom / To | Intended application rate interval |
| scheduledAt | Approved UTC activation target, equal to effectiveFrom for future application publication |
| publishedAt | Actual successful activation time recorded by the server |

Store UTC instants; show date, time and explicit timezone in the editor, diff,
history and confirmation. Convert local input unambiguously. Application
intervals are half-open `[from, to)`; exact boundary selection is deterministic.
No backdated application publication. Historical provider-rate evidence may
arrive late with a past provider-effective date, but it is new evidence and
cannot silently rewrite an old customer quote or a reconciled cost record.

## 3. Lifecycle And Scheduling

Reuse draft -> validated ready -> scheduled or publishing -> active ->
superseded, with failed/cancelled activation events from 018-010.

- Save Draft has no live effect. Validation binds the exact payload and base
  active version. Changing either invalidates approval/validation.
- Schedule requires publication permission, reason, approved fingerprint and
  a future UTC instant. Editing a scheduled revision cancels/replaces its
  schedule through the owning command, never mutates the approved payload.
- MVP allows one approved pending schedule per configuration scope, matching
  018-010. Multiple future drafts are allowed with bounded lists. A conflicting
  schedule is rejected, not silently overwritten; chained schedules are later.
- A new manual publication when a schedule exists requires an explicit decision
  to cancel or revalidate that schedule against the new baseline. No unnoticed
  future overwrite of the intervening admin change.
- Durable activation uses compare-and-swap/transaction, active-pointer update,
  schedule completion and Audit/outbox evidence. Repeated delivery has one
  publication effect; multi-worker races cannot publish different snapshots.
- Restart catches up due schedules in scope order. Report scheduled vs actual
  activation time and scheduler delay; never falsely claim exact-time execution.
- At a due boundary, new quote resolution must ensure the due revision has been
  committed or return a scoped pricing-publication-pending error. Do not silently
  issue stale prices past an approved boundary. Alert on delay/conflict; preserve
  unrelated scopes and reads/settlement for accepted work.
- Validate dependencies again at activation. Missing FX/schema/rate evidence,
  expired approval or conflicting baseline fails with persistent error and
  Audit. Explicit cancellation/repair is required; no automatic guessed price.

## 4. Pinning And In-Flight Work

Quotes pin retail policy, quoted provider cost, pricing FX and calculator/input
fingerprints. Submission verifies the existing quote and its expiry; it does
not replace the quote with whatever rate is active at submit time. Preserve
current invalidation rules for genuine input, availability or qualification
changes; never silently switch the model or reprice.

Customer charge remains bounded by accepted authorization through queue wait,
retry and completion. Record a separate execution-cost rate basis at the
provider's applicable billing event. A provider rate increase during queue wait
can raise platform cost without increasing that accepted customer charge.
If actual provider terms determine cost only later, mark it provisional until
reconciled rather than assuming the quote-time cost is actual.

Publication invalidates canonical policy/catalog caches by scope/revision,
including the currently cached image Credit policy. No Finance-specific client
poller or pricing copy. All new quote consumers must read a coherent snapshot;
cross-worker stale/mixed-version resolution has explicit tests and diagnostics.

## 5. Validation And Rollback

Validate exact model/operation/billing dimensions, decimal units, positive FX,
nonnegative costs, explicit evidence for a genuinely free unit, rounding,
retail policy limits, source dates, scope overlaps, interval gaps and successor
rules. Unpriced is not free. Expired rates without successors block only new
quotes that depend on them. Cost-only unknowns remain visible in reporting.

Preview current vs proposed costs and Credits using deterministic examples,
including reference/output counts, multiple Comparison slots, Template fees,
video audio/duration and AI-text token categories. Impact preview is not a quote
the browser can submit as authoritative pricing.

Rollback clones the chosen previous payload into a new validated revision and
records a new activation event. It does not delete scheduled/publication history,
change settled Credits, undo real provider expenses or bypass emergency controls.
Emergency provider disable remains the existing audited provider-control command.

## 6. Acceptance

Supplier billing agreements/bindings in FIN-006 use this same immutable revision
and schedule infrastructure but a separate configuration scope. A prepaid/
postpaid change is not a retail rate change or provider account mutation.
Funding metadata delay is reported as a reconciliation/activation issue; it
does not inherit the rate-specific new-quote block unless an independently
approved pricing/dispatch dependency actually requires that scope. Preserve
existing availability and accepted work rather than guessing a zero balance.

- `FIN-RATE-01`: draft/cost-only edits do not alter retail Credits or live quotes.
- `FIN-RATE-02`: announcement, provider-effective, scheduled and actual activation
  dates remain distinct and render with timezone.
- `FIN-RATE-03`: exact-boundary, concurrent publisher, restart, repeated delivery,
  cancellation and intervening manual-publication cases have deterministic outcomes.
- `FIN-RATE-04`: old valid quotes/Jobs retain accepted retail versions after
  publication; cost observations may use a different evidenced execution basis.
- `FIN-RATE-05`: invalid/missing/overlapping/expired rules cannot become active;
  delayed activation never silently quotes stale prices after its due boundary.
- `FIN-RATE-06`: public endpoints never expose costs/margins/drafts; unauthorized
  callers cannot publish, schedule, select a draft or tamper with accepted versions.
- `FIN-RATE-07`: rollback creates forward history and all active readers converge
  through the owning cache contract without duplicate policy stores.
