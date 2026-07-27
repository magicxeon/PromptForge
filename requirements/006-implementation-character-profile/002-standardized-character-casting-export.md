# Standardized Character Casting Export

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

Every reusable Character needs a clear, neutral reference that shows face,
proportions and silhouette consistently enough for Fashion Blueprint and Scene
Builder.

## 2. Export Standard

The output is one casting sheet containing:

1. front view
2. three-quarter view
3. side view
4. back view

Presentation:

- same character identity and body proportions in every view
- full body visible from head to feet
- neutral standing pose and level camera
- no dramatic gesture, perspective or crop
- plain light-neutral background
- even studio lighting
- no props, logos, text labels or accessories that hide the silhouette

Uniform policy:

- opaque white fitted top and fitted full-length bottoms or one-piece equivalent
- modest coverage; never underwear, lingerie, swimwear or transparent fabric
- no cleavage emphasis or sexualized styling
- neutral footwear or bare-foot treatment chosen consistently
- no branded details

Policy ID: `casting-uniform-white-v1`  
Layout ID: `character-casting-four-view-v1`

Selection derivatives:

- Create a front full-body card thumbnail from the approved export.
- Create a small face crop for fast identity recognition.
- Derivatives are deterministic crops/resizes and do not require another AI
  generation or additional generation credits.
- The four-view original remains available in Character detail; list cards must
  not shrink the whole sheet until the model is unreadable.

## 3. Generation Contract

```text
CharacterCastingExportRequest
- characterProfileId
- characterProfileVersionId
- layoutId
- uniformPolicyId
- providerId
- modelId
- resolution
- referenceAssetIds[]
- outputCount: 1
- pricingEstimateId
- idempotencyKey
```

The final prompt is compiled by the canonical prompt compiler. The request uses
the normal provider capability check, reference limits, credit estimate,
reservation, queue and result history.

## 4. Credit Rules

- Display exact estimate before export.
- Export is a normal billable generation.
- Reserve before queue acceptance.
- Capture on successful output.
- Release/refund only for eligible technical/provider failure.
- User rejection or identity preference change is a new billable attempt.
- Store pricing policy, provider/model and reference count with the job.

## 5. User Flow

```text
Create profile
-> Preview export standard
-> Select supported engine settings
-> See credit estimate
-> Generate
-> Review
-> Approve as canonical or regenerate
```

Reuse:

- `engineTargetComparisonPanel.js`
- `generationActionBar.js`
- `generationResultSurface.js`
- current reference slot and credit estimate services

Do not build a Character-only generation client.

## 6. Files

```text
client/character-profiles/characterCastingExport.js
client/character-profiles/characterCastingReview.js
server/domain/character-profiles/CharacterCastingExportService.js
server/config/character-casting-policy.json
test/characterCastingExport.test.js
```

The service creates a validated generation plan and delegates to the canonical
generation service. It never calls a provider or ledger repository directly.

## 7. Validation

- Reject unsupported provider reference count/resolution before reservation.
- Reject profile/version mismatch.
- Reject public approval if no successful canonical export exists.
- Confirm all four views and modest uniform instructions precede optional style
  details in compiled prompt.
- Confirm technical failure releases credits.
- Confirm duplicate submission does not create duplicate charge/job.
- Confirm card and face thumbnails inherit canonical export ownership and
  visibility.
