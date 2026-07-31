# Fashion Model Qualification And Routing Optimization

**Parent:** `000-master-fashion-blueprint-roadmap.md`
**Status:** Requirement defined from prototype benchmark; implementation deferred
**Benchmark date:** 2026-07-31

## Provider Qualification Skills

Qualification must use the provider-specific skill matching the tested route:

| Provider | Required skill |
|---|---|
| OpenAI GPT Image | `skills/qualify-openai-fashion-images/SKILL.md` |
| Google Gemini Nano Banana | `skills/qualify-gemini-fashion-images/SKILL.md` |
| xAI Grok Imagine | `skills/qualify-grok-fashion-images/SKILL.md` |
| BytePlus ModelArk Seedream | `skills/qualify-seedream-fashion-images/SKILL.md` |

Each skill translates the same canonical authority contract into a
provider-specific benchmark strategy. Skills do not override Reference
Processing policy, pricing, provider capabilities or the acceptance thresholds
in this requirement.

When official documentation changes, update the owning skill's
`references/source-notes.md`, record the verification date and re-run affected
qualification fixtures before changing Simple routing.

## 1. Purpose

Fashion Blueprint combines three independently authoritative reference roles:

```text
Template -> pose, camera, framing, environment and lighting
Character -> face, identity, skin tone and body proportions
Outfit -> garment construction, color, material and visible details
```

A provider model advertising generic image-reference support is not necessarily
capable of preserving these three roles in one generation. Simple Mode must
therefore route only to models that have passed a Fashion-specific fidelity
gate. Lowest provider cost alone is not an acceptable routing rule.

This requirement records the first manual benchmark and defines the work needed
before changing production routing. It does **not** implement provider routing
or prompt changes.

## 2. Business Requirement

### 2.1 Customer promise

A non-technical customer choosing Simple Mode must receive a model that can:

- replace the person in the Template with the selected Character;
- retain the selected Character's recognizable identity and skin tone;
- apply the uploaded Outfit without retaining its source wearer;
- preserve the Template's intended scene and composition;
- return one final fashion photograph rather than a casting sheet or contact
  sheet.

Simple Mode must not expose a cheaper model when that model regularly violates
this promise.

### 2.2 Draft means proof scope, not weak quality

`Draft` must be redefined as a **one-output proof workflow**:

```text
same qualified Fashion model
+ one proof operation
+ lower commitment through output count
```

It must not mean selecting the cheapest available model. If no lower-cost model
passes the Fashion fidelity gate, Draft uses the same qualified model as
Selling Quality but generates only the minimum proof output.

The customer-facing label may later be changed from `Draft` to `Proof` or
`Test one look` after UX review. This requirement does not change the label.

### 2.3 Simple versus Advanced exposure

- Simple Mode lists only Fashion-certified routes.
- Models that accept references but have not passed Fashion qualification may
  remain available in Advanced Mode with a clear `Experimental for Fashion`
  status.
- A failed or unqualified model must never become an automatic Simple fallback.
- Server routing remains authoritative; React must not contain a duplicate
  qualification table.

## 3. Initial Manual Benchmark

The following observations are provisional evidence from one
Template + Character + Outfit scenario. They must be reproduced with a
versioned benchmark fixture before becoming a release policy.

| Provider | Model | Observed result | Initial disposition |
|---|---|---|---|
| Google Gemini | Nano Banana 2 Lite | Failed to preserve the required role separation | Remove from Simple Fashion candidates |
| Google Gemini | Nano Banana 2 | Good result | Candidate for Proof and Selling Quality |
| OpenAI | GPT-Image 1 Mini | Failed to preserve the required role separation | Remove from Simple Fashion candidates |
| OpenAI | GPT-Image 1 | Usable but identity/composition fidelity remained weak | Advanced/experimental pending wider benchmark |
| OpenAI | GPT-Image 1.5 | Good result | Candidate for Selling Quality or Premium Campaign |
| xAI | Grok Imagine | Run blocked by locked-estimate mismatch | Quality not yet evaluated; fix quote/request parity first |
| BytePlus ModelArk | Seedream 4.0 | Partially usable but weak Template/identity match | Advanced/experimental |
| BytePlus ModelArk | Seedream 4.5 | Retained Template face while partially using Character body | Not eligible for Simple Fashion |
| BytePlus ModelArk | Seedream 5.0 Lite | Followed Template person too strongly | Not eligible for Simple Fashion |
| BytePlus ModelArk | Seedream 5.0 Pro | Character closer, but reproduced the three-view Character layout | Prompt-strategy experiment only; not yet Simple-certified |

No model in this table is permanently approved or rejected across all
generation surfaces. The disposition applies only to the Fashion Blueprint
multi-reference workflow.

## 4. Proposed Simple Routing Baseline

The first implementation review should start from:

| Tier | Intended route | Customer meaning |
|---|---|---|
| Draft/Proof | Nano Banana 2 candidate | One qualified proof output before a larger run |
| Selling Quality | Nano Banana 2 or GPT-Image 1.5 candidate selected by approved fixed policy | E-commerce-ready identity and garment fidelity |
| Premium Campaign | GPT-Image 1.5 or another model that passes the premium benchmark | Highest validated polish and fidelity |

This is a **candidate policy**, not a final config change. Nano Banana Pro and
other premium routes require the same benchmark before selection.

Simple routing remains fixed and versioned for MVP. Automatic cross-provider
optimization remains deferred.

## 5. Fashion Capability Contract

Provider catalog capability such as:

```text
imageReferences: true
```

only means that a model accepts references. Fashion routing additionally needs
a server-owned qualification record:

```text
FashionModelQualification
- schemaVersion
- policyVersion
- providerId
- modelId
- enabledForFashion
- simpleTierEligibility[]
- status: qualified | experimental | failed | blocked
- benchmarkSuiteVersion
- benchmarkedAt
- referenceRoleCapacity
- scores
  - characterIdentityFidelity
  - skinToneFidelity
  - bodyProportionFidelity
  - garmentFidelity
  - templateCompositionFidelity
  - singleImageCompliance
- providerPromptStrategyId
- knownLimitations[]
- evidence[]
```

Rules:

- Qualification belongs to the Fashion domain and references provider catalog
  IDs; it does not redefine provider capabilities or pricing.
- Missing qualification defaults to `experimental`, never Simple-eligible.
- Qualification is versioned so a model or provider behavior change cannot
  silently alter an accepted quote.
- A Fashion quote records the qualification policy version and prompt strategy
  ID used to resolve its route.

## 6. Provider-Specific Prompt Strategy

The canonical Reference Processing Pipeline remains responsible for role
authority. Provider optimization may change **projection syntax**, ordering and
provider-safe constraints, but must not change the underlying business
authority:

```text
Character identity > Outfit garment > Template person identity
Template composition > Character source pose/background
```

Future strategies may include:

- structured authority JSON for models that follow role-separated schemas;
- ordered prose sections for models that respond poorly to JSON;
- provider-specific image order;
- explicit single-image/contact-sheet prohibitions;
- model-specific reference limits and optional derivative selection;
- post-generation validation signals and retry guidance.

Required contract:

```text
ProviderPromptStrategy
- id
- version
- providerId
- supportedModelIds[]
- generationSurface: fashion
- referenceOrder[]
- projectionFormat: structured_json | ordered_prose
- promptSections[]
- prohibitions[]
- validationRules[]
```

Prompt strategies must be stored as versioned server configuration and resolved
through `server/domain/reference-processing/`. Provider adapters remain
transport owners and must not accumulate Fashion business prompts.

## 7. Credit Verification

The displayed Fashion total is:

```text
base output credits
+ billable reference credits
+ Template usage credits
```

Current mock pricing expectations for one output are:

| Model | Base | Reference policy |
|---|---:|---|
| Seedream 4.0 | 45 | Free |
| Seedream 5.0 Lite | 50 | Free |
| Seedream 4.5 | 60 | Free |
| Seedream 5.0 Pro | 60 | 5 credits/reference after one free reference |

Example with a Template fee of 10 credits:

```text
Seedream 4.0                      45 + 0 + 10 = 55
Seedream 4.5                      60 + 0 + 10 = 70
Seedream 5.0 Lite                 50 + 0 + 10 = 60
Seedream 5.0 Pro with 3 refs      60 + 10 + 10 = 80
```

Therefore:

- 55 for Seedream 4.0 is consistent when Template usage is 10;
- 70 for Seedream 4.5 is consistent when Template usage is 10;
- 65 for Seedream 5.0 Lite is not explained by the current policy and requires
  quote-breakdown inspection;
- 80 for Seedream 5.0 Pro is consistent with three references and a
  10-credit Template fee.

The UI must display the operation breakdown rather than only the aggregate.
Pricing anomalies must be fixed in quote construction; routing must not hide or
compensate for them.

### 7.1 Grok estimate mismatch

`A Fashion operation does not match its locked estimate` is a quote/request
parity defect, not a provider quality result. Investigation must compare:

- provider and model IDs;
- normalized resolution;
- aspect ratio;
- processed reference count;
- output count;
- Template use-session ID;
- Reference Processing plan fingerprint.

No Grok Fashion quality disposition may be finalized until the same locked
estimate can be reserved and dispatched successfully.

## 8. Benchmark And Release Gate

Create a versioned Fashion benchmark suite containing at least:

1. Template person + three-view Character + front Outfit.
2. Template person + Character with different skin tone/body proportions.
3. Outfit reference containing another wearer.
4. Flat-lay Outfit without a wearer.
5. Front and optional back Outfit references.
6. Template with strong movement/pose.
7. Character casting sheet that must not become a multi-view result.

Each run records:

```text
provider/model/version
prompt strategy version
reference processing policy version
reference order and count
pricing/quote breakdown
output IDs
manual fidelity scores
failure classification
```

A model becomes Simple-eligible only after:

- no critical identity-source inversion;
- no Template-person leakage;
- no contact-sheet/multiple-view output;
- acceptable garment and composition scores;
- repeatable success across the minimum benchmark suite;
- quote and reservation parity;
- pricing is available and locked.

## 9. Implementation Plan

### Phase A - Evidence and policy

1. Read the matching provider qualification skill and verify its official
   source notes against the current provider/model version.
2. Convert the current manual scenario into private actor-owned benchmark
   fixtures without committing private image data.
3. Define score thresholds and failure classifications.
4. Re-run candidate models with identical references and output settings.
5. Approve the first fixed Simple routing matrix.

### Phase B - Configuration and domain

1. Add versioned Fashion model qualification configuration under
   `server/config/`.
2. Add its schema and a Fashion-owned resolver under
   `server/domain/fashion-blueprint/`.
3. Extend `FashionRoutingPolicyService` to require qualification for Simple
   routes.
4. Keep unqualified models available only through Advanced policy when allowed.
5. Bind qualification and strategy versions into plan/quote fingerprints.

### Phase C - Prompt strategy optimization

1. Add versioned provider prompt strategies to the Reference Processing config.
2. Compile the same authority contract into provider/model-specific projection
   formats.
3. Ensure provider adapters receive a finalized prompt and ordered references
   without owning Fashion rules.
4. Add regression tests for reference order, strategy selection and
   single-image prohibitions.

### Phase D - Pricing and UX

1. Fix Grok locked-estimate parity before benchmarking output quality.
2. Investigate the unexplained Seedream 5.0 Lite total.
3. Display base, references and Template usage components in Review.
4. Redefine Draft as one qualified proof output.
5. Show experimental status only in Advanced Mode.

## 10. Canonical File Ownership For Future Implementation

```text
server/config/fashion-quality-tiers.json
server/config/fashion-model-qualifications.json
server/config/fashion-model-qualifications.schema.json
server/config/reference-processing-policy.json
server/domain/fashion-blueprint/FashionRoutingPolicyService.js
server/domain/fashion-blueprint/FashionQuoteService.js
server/domain/reference-processing/
server/domain/credits/CreditPricingPolicyService.js
web/src/features/fashion-blueprint/
test/fashionGenerationMode.test.js
test/fashionBlueprintPolicy.test.js
test/referenceProcessingPolicy.test.js
test/referenceProcessingService.test.js
```

Do not add provider/model qualification or pricing tables to React.

## 11. Acceptance Criteria

- Draft is defined as proof scope, not an unqualified cheap model.
- Simple routing cannot resolve a model without current Fashion qualification.
- Advanced can identify experimental Fashion models without promising fidelity.
- Prompt strategy varies by provider/model while preserving one canonical
  authority contract.
- Grok estimate mismatch is classified separately from provider quality.
- Seedream totals reconcile exactly with base, references and Template fees.
- Every accepted quote binds qualification, prompt strategy and Reference
  Processing versions.
- Benchmark evidence can be repeated without relying on undocumented manual
  judgment.
