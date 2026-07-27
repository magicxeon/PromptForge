# Standardized Character Casting Export

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented; validation pending

## 1. Business Requirement

Every reusable Character needs a clear, neutral reference that shows face,
proportions and silhouette consistently enough for Fashion Blueprint and Scene
Builder.

This export applies only to `reusable_model`. A `styled_character` keeps its
outfit-bound Character Sheet until the owner explicitly converts it into a new
Reusable Model version.

## 2. Export Standard

The output is one casting sheet containing:

1. front view
2. exact side profile
3. back view

Presentation:

- same character identity and body proportions in every view
- full body visible from head to feet
- all three figures arranged side by side in one horizontal row at equal scale
- generous clear margins above hair and below feet; no cropped body parts
- neutral standing pose and level camera
- no dramatic gesture, perspective or crop
- plain light-neutral background
- even studio lighting
- no props, logos, text labels or accessories that hide the silhouette

Uniform policy:

- opaque white fitted short-sleeve top and fitted mid-thigh shorts
- modest coverage; never underwear, lingerie, swimwear or transparent fabric
- no cleavage emphasis or sexualized styling
- neutral footwear or bare-foot treatment chosen consistently
- no branded details

Policy ID: `casting-uniform-white-v1`  
Layout ID: `character-casting-three-view-v2`

Legacy `character-casting-four-view-v1` records remain readable and usable when
already approved, but new direct casting candidates must use the current
three-view policy. Do not rewrite historical generation or approved profile
records during this policy change.

Selection derivatives:

- Create a front full-body card thumbnail from the approved export.
- Create a small face crop for fast identity recognition.
- Derivatives are deterministic crops/resizes and do not require another AI
  generation or additional generation credits.
- The three-view original remains available in Character detail; list cards must
  not shrink the whole sheet until the model is unreadable.

## 3. Generation Contract

For a new `reusable_model`, the normal Character Sheet generation request is the
casting request. Client and server must both enforce:

- layout `character-casting-three-view-v2`
- uniform `casting-uniform-white-v1`
- aspect ratio `6:8`
- output count `1`
- no Clothing selection, custom color or Outfit Reference in prompt/state/payload

The server records these values in `characterSheetConfig`. Profile creation may
enter `review` directly only when all policy markers and an owned output image
are present. Caller-supplied flags without the canonical server snapshot are not
sufficient.

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

- Display the exact estimate before the initial Reusable Model generation.
- The initial generation is the normal billable casting generation. Creating
  the Character Profile and approving that same result costs no additional
  generation credit.
- Reserve before queue acceptance.
- Capture on successful output.
- Release/refund only for eligible technical/provider failure.
- User rejection or identity preference change is a new billable attempt.
- Store pricing policy, provider/model and reference count with the job.

## 5. User Flow

```text
Choose Reusable Model
-> see locked three-view layout and Casting Uniform
-> select supported engine settings
-> See credit estimate
-> Generate Character Sheet once
-> Create Character Profile from that result
-> Review
-> Approve as canonical or regenerate
```

Fallback flow:

```text
Rejected initial result | legacy Reusable result | Styled-to-Reusable conversion
-> Generate Casting Export / Regenerate
-> normal credit estimate and generation
-> Review
-> Approve
```

Reuse:

- `characterTypeControl.js`
- `engineTargetComparisonPanel.js`
- `generationActionBar.js`
- `generationResultSurface.js`
- current reference slot and credit estimate services

Do not build a Character-only generation client.

## 6. Files

```text
client/character-profiles/characterCastingExport.js
client/character-profiles/characterProfilePage.js
server/domain/character-profiles/CharacterCastingExportService.js
server/config/character-casting-policy.json
test/characterCastingExport.test.js
```

The service creates a validated generation plan and delegates to the canonical
generation service. It never calls a provider or ledger repository directly.
The review state is intentionally composed by `characterProfilePage.js`; a
separate `characterCastingReview.js` was not added because it would only wrap
the same profile/version API and duplicate profile actions.

## 7. Validation

- Reject unsupported provider reference count/resolution before reservation.
- Reject profile/version mismatch.
- Reject public approval if no successful canonical candidate exists.
- Reject Casting Export plans for Styled Characters until converted to a
  Reusable Model version.
- Confirm all three views and modest uniform instructions precede optional style
  details in compiled prompt.
- Confirm the server removes a conflicting user-selected layout and Clothing text.
- Confirm the front preview is cropped from the first of three horizontal
  columns, not from a legacy 2x2 tile.
- Confirm Profile creation reuses the initial generation result ID and does not
  enqueue or charge another job.
- Confirm technical failure releases credits.
- Confirm duplicate submission does not create duplicate charge/job.
- Confirm card and face thumbnails inherit canonical export ownership and
  visibility.
