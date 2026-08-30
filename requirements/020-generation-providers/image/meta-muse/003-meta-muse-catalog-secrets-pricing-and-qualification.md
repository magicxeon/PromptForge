# 003 - Meta Muse Catalog, Secrets, Pricing And Qualification

Status: Proposed  
Depends on: Requirements 001-002

## 1. Purpose

Register Meta Muse without duplicating capabilities or pricing in clients, and
prevent unverified or unpriced customer-paid generation.

## 2. Provider Registry Configuration

Add a provider record to `server/config/providers.json` using:

- `id`: `meta-muse`
- `adapter`: `meta-muse`
- canonical key: `META_MUSE_API_KEY`
- compatibility alias: `META_MUSE_API-KEY`
- base URL override: `META_MUSE_BASE_URL`
- default model: `muse-image-1.0`
- display order after existing providers without reordering them
- existing default provider remains unchanged

Initial model capabilities must be conservative:

```text
imageGeneration: true only after create response evidence passes
imageEdit: false
imageReferences: false
maxReferenceImages: 0
streaming: false
batchOutput: false
aspectRatios: only verified values, otherwise no user-selectable ratio exposure
resolutions: only verified values, otherwise omitted
```

If the current provider schema requires an aspect-ratio array for UI stability,
extend the schema/catalog contract to represent provider-managed or fixed size
explicitly. Do not claim unsupported ratios merely to satisfy a UI default.

## 3. Exposure States

Use explicit operational states rather than one ambiguous `enabled` switch:

1. `configured`: secret exists and adapter can instantiate;
2. `internal`: available to approved development actors only;
3. `qualified_general`: passed general image workflow rubric;
4. `priced`: published Credit pricing exists;
5. `customer_paid`: eligible for public paid routing;
6. `qualified_fashion`: separately approved for Fashion operations.

If current configuration cannot express these states, document and implement a
small server-owned exposure projection. Do not hard-code actor gating in React.

## 4. Pricing Gate

Provider cost and billing unit are unknown until Requirement 001 is complete.
Therefore:

- do not add a guessed priced model to `credit-pricing-policy.json`;
- an unpriced model must not produce a reservable customer estimate;
- internal qualification must use a clearly authorized non-customer test path;
- once pricing is verified, add a versioned pricing record through the Credits
  capability with provider/model, cost basis, currency, FX snapshot, margin,
  reference/output adjustments, effective time, and evidence date;
- UI reads estimated Credits only from the existing estimate response.

Changing pricing later must use draft/publish/effective-time controls owned by
the commercial/admin requirements; it must not mutate historical snapshots.

## 5. General Image Qualification

Run at least three attempts for each enabled operation and supported control
combination. Record:

- provider/model and request ID;
- operation and reference count;
- aspect ratio/resolution/output count;
- queue wait, provider latency, persistence latency, and total duration;
- provider cost and estimated Credits when known;
- prompt adherence, anatomy, text artifacts, commercial polish, safety result;
- error and retry behavior;
- normalized output validity and History persistence.

General qualification does not grant Fashion qualification.

## 6. Provider Health And Admin Readiness

Admin provider health should show Meta Muse using the existing provider health
projection: configured/unconfigured, enabled state, model count, qualification,
pricing status, recent success/failure, and safe request correlation. No secret
or raw prompt is exposed.

## 7. Tests

- provider config schema accepts the record and rejects duplicate IDs;
- missing both key names keeps provider unavailable;
- canonical key wins over compatibility alias;
- public catalog hides disabled/internal/unpriced customer models as policy
  requires;
- unsupported capabilities remain absent/false;
- provider/model selection rejects mismatched model IDs;
- existing default provider and provider order remain stable;
- Credits rejects an unpriced Meta Muse estimate;
- published pricing creates a locked estimate matching submitted parameters.

## 8. Acceptance Criteria

- Server configuration is the only provider/model capability source.
- Meta Muse cannot become customer-paid by adding an API key alone.
- Pricing evidence and qualification are independent required gates.
- Existing models, prices, defaults, and historical estimates are unchanged.

