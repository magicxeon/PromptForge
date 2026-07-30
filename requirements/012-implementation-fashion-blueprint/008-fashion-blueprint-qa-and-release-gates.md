# Fashion Blueprint QA and Release Gates

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Prototype domain coverage present; complete Fashion E2E and visual QA pending

## 1. Automated Coverage

Required test groups:

```text
template version and slot validation
Character visibility/reuse authorization
Character recommendation ranking and picker tabs
pose/environment ownership conflicts
single/bulk outfit validation
Simple/Advanced settings normalization
quote hash and expiry
credit reservation/capture/release
idempotent run submission
partial success result grouping
actor-scoped state/history/assets
route/deep-link/navigation hierarchy
shared estimate isolation
reference upload registration and Base64 stripping
Reference Processing authority, ordering, derivative reuse and fingerprint parity
Template Core immutable version/use-session lineage
outfit-scope parity from UI through provider directive
```

Suggested files:

```text
test/fashionBlueprintTemplate.test.js
test/fashionDirectionResolver.test.js
test/fashionOutfitValidation.test.js
test/fashionGenerationMode.test.js
test/fashionBlueprintQuote.test.js
test/fashionBlueprintRun.test.js
test/fashionBlueprintAuthorization.test.js
test/fashionReferenceProcessing.test.js
web/src/features/fashion-blueprint/**/*.test.tsx
```

The current `test/fashionBlueprint.test.js` covers basic plan routing and atomic
reservation only. It is not sufficient evidence for Bulk, authorization,
Template compatibility, processing lineage or result recovery.

## 2. Manual E2E

```text
TC-FB-001 Simple single outfit
Template -> public Character -> front/back outfit -> Selling Quality
-> quote -> generate -> grouped results -> download
```

```text
TC-FB-002 Simple bulk
One setup + five valid outfits -> quote all operations
-> one operation fails -> successful outputs remain and credits reconcile
```

```text
TC-FB-003 Advanced
Select provider/model/resolution -> unsupported field hidden
-> valid quote matches Studio shared engine behavior
```

```text
TC-FB-004 Privacy
Actor B cannot use Actor A private Character, outfit or result by changing IDs.
```

```text
TC-FB-005 Stale quote
Change pose/environment/outfit after quote -> Generate disabled
-> server rejects forged stale estimate.
```

```text
TC-FB-006 Non-technical model selection
Open a Template with a reusable default model -> click Use this model once
-> selected summary appears -> focus moves to Outfit upload.
```

```text
TC-FB-007 Recommendation fallback
Template default model becomes private -> reopen Template
-> picker shows other compatible models and exposes no unauthorized handoff.
```

```text
TC-FB-008 Navigation and resume
Open Studio > Fashion Studio -> begin a draft -> open Character detail
-> Back returns to the Fashion draft -> refresh /create/fashion
-> actor-scoped draft is restored without reusing a stale quote.
```

```text
TC-FB-009 Reference transport
Upload front/back/detail -> inspect saved draft/quote/run
-> only private asset/reference IDs are present -> no data:image value appears.
```

```text
TC-FB-010 Estimate isolation
Create a Studio estimate -> open Fashion and quote a batch
-> Fashion displays its aggregate quote -> returning to Studio preserves the
Studio estimate and neither workflow can submit the other's estimate ID.
```

```text
TC-FB-011 Reference authority
Use a Template with an original model/garment -> select an authorized reusable
Character -> upload a person-worn replacement Outfit -> choose Full Look
-> preview shows Character owns identity, Outfit owns garment and Template owns
scene -> generated result lineage records the same processing fingerprint used
by the quote.
```

```text
TC-FB-012 Derivative reuse
Use the same Outfit asset in multiple Product Items -> quote/run
-> deterministic normalization creates/reuses one owner-scoped derivative
-> each operation retains its own Product Item lineage without duplicate
reference billing.
```

## 3. UX Gate

- Beginner reaches valid quote with no prompt/provider knowledge.
- Primary action is visible at each step.
- Optional pose/environment controls remain collapsed by default.
- Character step initially shows the Template model and two alternative paths,
  not the complete filter interface.
- Character cards use readable full-body and face previews.
- `Change model` restores prior picker tab, filters and scroll position.
- Back/forward preserves draft without stale quote.
- Generate moves to active processing/results.
- Empty, loading, error, partial and completed states are distinct.
- Desktop/mobile, keyboard, focus and Thai/English parity pass.
- Fashion Reference Processing warnings use the shared warning UI and identify
  the affected Product Item.

## 4. Quality and Policy Gate

- Product fidelity disclaimer is visible.
- Character attribution is preserved.
- Casting uniform never appears as requested Fashion garment.
- Template previews have provenance.
- Face/product references remain private unless explicitly reusable.
- Generated images are not promised as exact virtual try-on.

## 5. Rollout

```text
internal official Templates
-> owner Character only
-> public Characters
-> single outfit pilot
-> bulk up to five
-> Advanced Mode
-> Community creator Templates
```

Feature flags should independently control public Character, bulk, Advanced and
community Template entry points.

The internal `/create/fashion` prototype may remain reachable before public
rollout. Public navigation/discovery must not imply that a gated source is
available.

## 6. Release Gate

- All credit/job/ownership invariants pass.
- No duplicate generation pipeline or engine component exists.
- Product Owner approves at least three Template previews and pose packs.
- Pilot user completes Simple flow without assistance.
- Commercial Phase `013` records remaining PostgreSQL/GCP/payment blockers
  before paid production enablement.
- Full server suite, React tests, i18n parity, typecheck, lint and production
  build pass with no Fashion-owned regression.
