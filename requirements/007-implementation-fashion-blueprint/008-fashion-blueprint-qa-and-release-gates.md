# Fashion Blueprint QA and Release Gates

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

## 1. Automated Coverage

Required test groups:

```text
template version and slot validation
Character visibility/reuse authorization
pose/environment ownership conflicts
single/bulk outfit validation
Simple/Advanced settings normalization
quote hash and expiry
credit reservation/capture/release
idempotent run submission
partial success result grouping
actor-scoped state/history/assets
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
```

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

## 3. UX Gate

- Beginner reaches valid quote with no prompt/provider knowledge.
- Primary action is visible at each step.
- Optional pose/environment controls remain collapsed by default.
- Back/forward preserves draft without stale quote.
- Generate moves to active processing/results.
- Empty, loading, error, partial and completed states are distinct.
- Desktop/mobile, keyboard, focus and Thai/English parity pass.

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

## 6. Release Gate

- All credit/job/ownership invariants pass.
- No duplicate generation pipeline or engine component exists.
- Product Owner approves at least three Template previews and pose packs.
- Pilot user completes Simple flow without assistance.
- Commercial Phase `008` records remaining PostgreSQL/GCP/payment blockers
  before paid production enablement.

