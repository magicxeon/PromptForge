# 005 Template Usage Credits, Lineage and Earnings Foundation

## Business Requirement

Users see one price before generation while the system keeps AI cost and
Template value separate. Creator earnings must be attributable without
implementing cash payouts in this MVP.

## Pricing Contract

```text
estimatedTotalCredits =
  generationCredits
  + referenceCredits
  + templateUsageCredits
```

`templateUsageCredits` is loaded server-side from the pinned published version.
The client cannot submit or lower this value.

For the MVP mock policy, a paid Template defaults to a 75% creator share and a
25% platform share (`7500/2500` basis points). A free Template records `0/10000`.
The split is pinned in the published pricing snapshot so the commercial phase
can replace the policy without rewriting historical usage.

Estimate response exposes:

```ts
{
  generationCredits: number;
  referenceCredits: number;
  templateUsageCredits: number;
  totalCredits: number;
  templatePricingSnapshot?: {
    templateId: string;
    templateVersionId: string;
    creatorUserId: string;
    creatorShareBps: number;
    platformShareBps: number;
  };
}
```

The existing reservation captures or refunds the combined amount. No second
balance system is introduced.

### Pricing Changes And Use Sessions

Template access-credit edits apply to use sessions created after the edit.
Every use session pins the pricing snapshot that was shown when the user chose
the Template, so an in-progress session and any quote derived from it must not
change price underneath the user.

The expected transition is:

```text
session A created while accessCredits = 20 -> session A remains 20
owner changes accessCredits to 12
session B created after the edit          -> session B uses 12
```

Clients must start a new Template handoff when validating or presenting the
new price. A listing price and an older active session price may differ by
design; the quote, reservation, capture and usage event must all use the pinned
session value. The UI must never replace the server-owned session snapshot with
the current listing price during an active flow.

## Lineage

Every Template result records:

```text
templateId
templateVersionId
templateUseSessionId
sourceCommunityPostId
replacement summary without private values
owner/creator attribution
pricing snapshot
```

My Images must render a compact `Created from a reusable template` lineage
section when `templateUseContext` exists. It links to
`sourceCommunityPostId`, identifies the pinned Template version and summarizes
how many permitted inputs were supplied without exposing private replacement
values. A generation submitted without a valid Use Session must not be labeled
as Template-derived.

Successful generation records one idempotent use/remix event. Failed generation
does not increment success counts and refunds the reservation normally.

## Earnings Foundation

MVP does not transfer cash. Captured ledger metadata is sufficient to derive:

```text
creator pending share
platform share
template uses
gross template credits
refund/reversal status
```

Commercial payout later consumes immutable captured entries.

## Testing

- estimate/submission parity
- fee cannot be client-tampered
- owner may use own Template with configured fee policy
- refund includes Template component
- duplicate completion does not duplicate usage
- ledger metadata contains version and split snapshot
- editing access credits preserves existing use-session pricing while a newly
  created use session receives the updated price
