# Fashion Model Qualification And Routing Optimization

**Parent product workflow:** `../../013-implementation-fashion-blueprint/000-master-fashion-blueprint-roadmap.md`
**Status:** MVP baseline implemented; commercial qualification follow-up moved to Phase2-19
**Benchmark period:** 2026-08-01 through 2026-08-03
**Future local-processing option:** `../../013-implementation-fashion-blueprint/013-template-pose-proxy-and-dummy-cache.md`
**Commercial follow-up:** `../../019-implementation-commercial-feature-plan/Phase2-19-fashion-routing-qualification-and-promotion.md`

## Provider Qualification Skills

Qualification must use the provider-specific skill matching the tested route:

| Provider | Required skill |
|---|---|
| OpenAI GPT Image | `../../013-implementation-fashion-blueprint/skills/qualify-openai-fashion-images/SKILL.md` |
| Google Gemini Nano Banana | `../../013-implementation-fashion-blueprint/skills/qualify-gemini-fashion-images/SKILL.md` |
| xAI Grok Imagine | `../../013-implementation-fashion-blueprint/skills/qualify-grok-fashion-images/SKILL.md` |
| BytePlus ModelArk Seedream | `../../013-implementation-fashion-blueprint/skills/qualify-seedream-fashion-images/SKILL.md` |

Each skill translates the same canonical authority contract into a
provider-specific benchmark strategy. Skills do not override Reference
Processing policy, pricing, provider capabilities or the acceptance thresholds
in this requirement.

When official documentation changes, update the owning skill's
`<provider-skill>/references/source-notes.md`, record the verification date and re-run affected
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

This requirement began as the first manual benchmark and promotion plan. Its
MVP implementation record now owns the fixed qualification gate, Pose Proxy
cache and accepted single-stage baseline. Broader commercial promotion is
separated into Phase2-19 so later experiments do not silently redefine this
accepted contract.

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
- Advanced final generation still requires the selected qualification record
  to include `fashion_final_composition`. An `operation_only` model qualified
  only for `template_pose_proxy_prepare` is rejected before quote creation and
  cannot leak mannequin/proxy anatomy into a customer output.
- A failed or unqualified model must never become an automatic Simple fallback.
- Server routing remains authoritative; React must not contain a duplicate
  qualification table.

### 2.4 Fashion model catalog contract

Fashion Blueprint must obtain its Advanced model choices from a Fashion-owned
server projection of the public provider catalog. The projection includes only
models whose current qualification record permits `fashion_final_composition`.
React must not infer eligibility from model names or duplicate
`fashion-model-qualifications.json`.

When the provider default model is qualified only for Pose Proxy preparation,
the Fashion projection replaces that provider default with its first eligible
final-composition model. A blank, restored, or stale client selection must be
reconciled to the projected default before quote construction. This prevents a
valid server safety gate from becoming a customer-facing quote error.

Regression checklist:

- [x] the general Studio/Playground provider catalog remains unchanged;
- [x] Fashion Advanced excludes `operation_only` and `failed` models;
- [x] Gemini Lite remains available to Template Pose Proxy preparation;
- [x] a stale Fashion selection of Gemini Lite reconciles to an eligible final
  model before quote creation;
- [x] direct crafted quote requests using an ineligible model remain rejected
  by the server;
- [x] provider/model/resolution in the displayed quote still matches the
  submitted Fashion plan.

Implementation checkpoint (2026-08-15): Fashion now exposes
`GET /api/fashion-blueprints/model-catalog` as the server-owned Advanced model
projection. React consumes that projection and reconciles stale selections;
the general provider catalog and Pose Proxy qualification remain unchanged.

## 3. Initial Manual Benchmark

The following observations are provisional evidence from one
Template + Character + Outfit scenario. They must be reproduced with a
versioned benchmark fixture before becoming a release policy.

| Provider | Model | Observed result | Initial disposition |
|---|---|---|---|
| Google Gemini | Nano Banana 2 Lite | Failed as a direct three-authority Fashion compositor, but produced the most accurate low-cost identity-neutral Dummy/Pose Proxy | Selected for MVP Pose Proxy preparation only; not approved for final Simple Fashion output |
| Google Gemini | Nano Banana 2 | Good result | Candidate for Proof and Selling Quality |
| OpenAI | GPT-Image 1 Mini | Failed to preserve the required role separation | Remove from Simple Fashion candidates |
| OpenAI | GPT-Image 1 | Usable but identity/composition fidelity remained weak | Advanced/experimental pending wider benchmark |
| OpenAI | GPT-Image 1.5 | Good result | Candidate for Selling Quality or Premium Campaign |
| OpenAI | ChatGPT image generation manual surface | Produced a usable identity-neutral Dummy in manual testing | Capability observed; exact API model, settings, cost and repeatability remain unbound, so it is not the MVP route |
| xAI | Grok Imagine | Produced a usable identity-neutral Dummy in manual testing; the application Fashion run was separately blocked by locked-estimate mismatch | Pose Proxy fallback candidate only after API repeatability and quote parity are verified |
| BytePlus ModelArk | Seedream 4.0 | Partially usable but weak Template/identity match | Advanced/experimental |
| BytePlus ModelArk | Seedream 4.5 | Retained Template face while partially using Character body | Not eligible for Simple Fashion |
| BytePlus ModelArk | Seedream 5.0 Lite | Failed the earlier photorealistic-mannequin strategy and followed the Template person too strongly in direct Fashion tests; a later technical-wireframe experiment produced a usable identity-neutral pose artifact | Eligible only for reviewed wireframe Pose Proxy preparation under `SEEDREAM5L-WIREFRAME-PROXY-V1`; not eligible for final Simple Fashion output |
| BytePlus ModelArk | Seedream 5.0 Pro | Character closer, but reproduced the three-view Character layout | Prompt-strategy experiment only; not yet Simple-certified |

No model in this table is permanently approved or rejected across all
generation surfaces. Qualification is operation-specific: preparing a Pose
Proxy and composing a final Fashion image are separate capabilities. The
catalog route is **Seedream**, not Seedance; any manual note using `Seedance 5.0
Lite` in this benchmark refers to `seedream-5-0-lite-260128` and must not create
a second provider/model identifier.

### 3.1 Gemini Nano Banana 2 manual strategy evidence

The following evidence was collected manually on 2026-07-31 with one fixed
Fashion scenario. Private image bytes are intentionally not committed. The
fixture manifest records only these roles:

```text
Template: person-containing gallery scene with walking movement
Character: full three-view Character reference; never a face crop
Outfit: wearer-based front reference for Scenario A
Outfit: flat-lay product reference for Scenario B
Output: one 6:8 vertical image
```

All scores use `0` through `5`. Template leakage includes copied or blended
face, skin tone, hair, height or body proportions; it is not limited to a fully
recognizable copy of the Template person. Any Template leakage is a critical
failure for Simple routing.

| Strategy | Projection/order | Attempts | Identity outcome | Other outcome | Disposition |
|---|---|---:|---|---|---|
| `GNB2-S1` | Structured JSON; Template, Character, Outfit | 3 | Only one useful identity result; two identity failures | Single-image output remained stable | Failed |
| `GNB2-S2` | Concise ordered prose; Template, Character, Outfit | 4 | Three clean results; one Template identity leak | Garment and scene adherence improved | Best early candidate, but failed repeatability |
| `GNB2-S3` | Character, Outfit, Template | 3 valid | One full Template identity substitution and persistent skin/body drift | Garment remained strong; composition averaged about `3/5` | Failed; Character-first ordering did not solve Template dominance |
| `GNB2-S4-A` | Human-deconflicted prose; Template, Character, wearer-based Outfit | 3 | Identity, skin and body passed `3/3`; no Template leakage | Core garment passed `3/3`; composition scores `3, 3, 5` | Passed this pilot scenario provisionally |
| `GNB2-S4-B` | Human-deconflicted prose; Template, Character, flat-lay Outfit | 3 | Two clean results and one approximately 70/30 Character/Template blend | Flat-lay garment passed `3/3`; composition scores `5, 4, 4` | Failed repeatability; do not qualify single-stage Simple routing |

The `GNB2-S4-B` record normalizes two contradictory checkbox notes according to
their detailed descriptions: the `5/5` identity result is treated as clean,
while the result explicitly described as a 70/30 Character/Template mix is
treated as Template leakage. Correct this evidence if the source review shows
otherwise.

Several attempts made while the uploaded image order did not match the prompt
labels are classified as `invalid_reference_order` and excluded from all
scores. Before every manual run, record both upload position and semantic role:

```text
upload position 1 = IMAGE_0
upload position 2 = IMAGE_1
upload position 3 = IMAGE_2
```

Current conclusion:

- `GNB2-S4` is the strongest observed single-stage Gemini strategy.
- Nano Banana 2 is not yet eligible for automatic Simple routing because the
  flat-lay case produced critical identity leakage in one of three attempts.
- Further wording-only retries would encourage cherry-picking and are not an
  acceptable qualification method.
- The next controlled experiment is `GNB2-S5`, a two-stage prepared-look
  strategy. It is initially a Selling Quality or Premium candidate because it
  requires two billable generation operations.

`GNB2-S5` calibration progress:

| Pair | Stage | Face | Skin/body | Outfit | Single image | Unexpected accessories | Result |
|---|---|---:|---:|---:|---|---|---|
| Calibration 1 | Prepared-look Stage 1 | `5/5` | `5/5` | `5/5` | Pass | No | Passed; proceed with this exact output to Stage 2 |
| Calibration 1 | Template-composition Stage 2 | `5/5` | `5/5` | `5/5` | Pass | No | Passed; Template pose/scene `5/5`, no Template identity leakage |
| Pair 2 | Prepared-look Stage 1 | `5/5` | `5/5` | `4.5/5` | Pass | No | Passed with `garment_detail_invention`: an asymmetric bow appeared at one side of the collar |
| Pair 2 | Template-composition Stage 2 | `5/5` | `5/5` | `5/5` | Pass | No | Passed; Template pose/scene `3/5`, hand did not reproduce the chest-level garment hold, no Template identity leakage |
| Pair 3 | Prepared-look Stage 1 | `5/5` | `5/5` | `5/5` | Pass | No | Passed |
| Pair 3 | Template-composition Stage 2 | `5/5` | `5/5` | `5/5` | Pass | No | Passed; Template pose/scene `5/5`, no Template identity leakage |

Do not regenerate or conversationally edit the accepted Stage 1 image before
the paired Stage 2 run. The final qualification evidence must preserve the
lineage between both operations.

Calibration Pair 1 passed the complete `GNB2-S5` authority contract. Two more
independent pairs were then produced with identical source references, prompts
and output settings. Each pair used a fresh Stage 1 output only in its own
Stage 2 operation.

Completed result: `GNB2-S5` passes the flat-lay Scenario B repeatability gate
provisionally across three independent pairs:

```text
final Character identity: 3/3 clean
final skin/body fidelity: 3/3 clean
final Outfit fidelity: 3/3 at 5/5
final Template pose/scene: 5, 3, 5; average 4.33/5
final Template identity leakage: 0/3
final single-image compliance: 3/3
```

The isolated Stage 1 bow invention remains a known limitation even though its
paired Stage 2 output was scored at full Outfit fidelity. Qualification policy
must retain intermediate-stage evidence and must not judge only the final
image. The two-stage strategy remains a Selling Quality or Premium candidate,
not a low-cost Draft route, until two-operation pricing and latency are
accepted.

### 3.2 `GNB2-S6` Sanitized Pose Template Experiment

The next controlled experiment removed the real Template person before final
composition. This prevents the final provider operation from receiving two
competing human identities while retaining the Template's pose, camera, scene
and lighting authority.

The accepted operation sequence was:

```text
Stage 1 - Prepared dressed Character
  Character three-view + Outfit reference(s)
  -> one full-body image of the correct Character wearing the correct Outfit

Stage 2A - Sanitized pose Template
  Original Template
  -> same scene, camera, framing, lighting and exact human pose
  -> replace the Template person with a featureless matte-gray mannequin

Stage 2B - Final composition
  Sanitized pose Template + accepted Stage 1 dressed Character
  -> replace the mannequin with the dressed Character
  -> copy the mannequin's complete joint layout and contact points
```

Observed final result from the accepted manual run:

```text
Character identity: 5/5
Skin and body fidelity: 5/5
Outfit fidelity: 5/5
Template pose and hand placement: 5/5
Template identity leakage: none
Single-image compliance: pass
Unexpected accessories: none
Overall reviewer result: 100%
```

The successful end-to-end composition evidence belongs to the Gemini strategy.
For the MVP pipeline, the inexpensive Gemini Nano Banana Lite route prepares
the cached identity-neutral Pose Proxy, while the qualified non-Lite Gemini
Fashion strategy performs Character/Outfit preparation and final composition.
Do not interpret the Lite Dummy result as qualification for the final Fashion
operation.

This result is recorded as a **successful strategy candidate**, not yet as a
qualified production route. Before promotion it requires at least three fresh,
independent end-to-end runs across different Character, Outfit and Template
pairs. Each run must preserve operation IDs, ordered input asset IDs, output
asset IDs, provider/model version, prompt-strategy version, latency and billed
credits.

The mannequin output is a reusable Template preprocessing artifact. Production
must create it once per immutable Template version and pose variant, validate
it, store it privately, and reuse it for every compatible Fashion run. It must
not be regenerated and billed again for every customer output unless its
source Template or sanitization strategy version changes.

This changes the likely cost model from three operations per customer output
to:

```text
Template publication cost (platform/creator-side, amortized):
  1 x Template sanitization per Template version and pose variant

Customer Fashion run cost:
  1 x Character + Outfit prepared-look operation
  1 x final composition operation using the cached sanitized Template
```

For Bulk generation, the prepared-look and final-composition operations remain
per Outfit/output. The sanitized Template is shared across the Batch. Future
pose packs may cache one sanitized mannequin artifact per approved pose rather
than regenerating it for each Product Item.

Open product and architecture decisions:

- whether Template sanitization is paid by Momelo, charged once to the Template
  creator, or recovered through future Template access fees;
- whether Scene Builder produces a human preview plus a hidden sanitized
  execution artifact in the same publication workflow;
- whether a creator may publish a Template until mannequin QA confirms pose,
  hands, camera, framing, scene and lighting fidelity;
- how sanitization artifacts are invalidated when the Template, provider/model
  or prompt-strategy version changes;
- whether Simple tiers use only pre-sanitized Templates while Advanced mode may
  accept unsanitized composition sources;
- how multiple poses in one scene are versioned, previewed and priced without
  multiplying customer-visible complexity.

### 3.3 MVP Template Pose Proxy Contract

The generative Dummy and Template cache are implemented under this requirement
because they are part of provider qualification, prompt strategy, routing and
cost. `013` is reserved for replacing this provider operation with local
processing later.

Product rules:

- The public Template preview remains the attractive generated human image.
- The identity-neutral Dummy is a private execution artifact called a
  `TemplatePoseProxy`.
- It owns pose, hand placement, camera, framing, scene and lighting only.
- It never owns identity, face, skin, hair, body shape, clothing or accessories.
- Prepare one proxy per immutable Template version and pose variant, then reuse
  it across single and Bulk Fashion runs.
- Cache hits enqueue no provider operation and consume no additional setup
  credit.
- A Template cannot advertise Fashion compatibility until its required proxy
  passes automatic or manual QA.

Domain record:

```text
TemplatePoseProxy
- id
- schemaVersion
- templateId
- templateVersionId
- poseVariantId
- status: pending | processing | review_required | active | failed | superseded
- processorType: generative_provider | local_processor
- providerId?
- modelId?
- processorStrategyVersion
- sourcePreviewAssetId
- proxyAssetId?
- sourceFingerprint
- confidenceSummary
- qaDecision: pending | automatic_pass | manual_pass | rejected
- qaReasonCodes[]
- operationId
- correlationId
- createdByUserId
- reviewedByUserId?
- createdAt
- reviewedAt?
- activatedAt?
- supersededAt?
```

Deterministic cache key:

```text
hash(
  templateVersionId,
  poseVariantId,
  sourcePreviewAssetFingerprint,
  processorType,
  providerId or localProcessorId,
  modelId,
  processorStrategyVersion,
  outputDimensions
)
```

Concurrent requests for one key converge on one idempotent operation. Changing
the source Template, pose, output dimensions, model or strategy creates a new
proxy version; it never mutates lineage already referenced by a quote or run.

Scene and Template publication flow:

```text
Generate and approve the visible Scene preview
-> choose Publish as reusable Fashion Template
-> show Pose Proxy preparation quote
-> reserve the minimum MVP setup credits
-> prepare the Dummy through Nano Banana Lite
-> validate person removal and pose/scene fidelity
-> optionally request creator/admin review
-> activate immutable Fashion-compatible Template version
```

Normal users see `Preparing reusable pose`, not provider prompts or the terms
MMPose, SAM, ControlNet or processor internals.

### 3.4 Qualification forensic record - 2026-08-02

The first application-driven candidate sweep did not use one equivalent
execution pipeline and therefore cannot promote or permanently reject a final
Fashion model. The observed visual results remain useful diagnostic evidence,
but every affected candidate must be rerun after the pipeline controls below
are active.

Root cause:

- Simple routing bound the approved `TemplatePoseProxy`, while Advanced routing
  bypassed it and sent the original person-containing Template;
- all final Fashion candidates were still executed as `single_stage` with
  Character, Outfit and Template/Proxy references in one provider request;
- the accepted manual `GNB2-S6` evidence instead used prepared-look Stage 1,
  cached Pose Proxy Stage 2A and final composition Stage 2B;
- the application therefore claimed a qualified Gemini strategy without yet
  reproducing its full two-customer-operation execution contract;
- `gpt-image-2` additionally received unsupported `input_fidelity`, so its
  provider failure was an adapter capability bug rather than model-quality
  evidence.

Candidate observations collected before correction:

| Candidate | Job | Technical finding | Qualification use |
|---|---|---|---|
| Gemini Flash baseline | `job_fashion_a93517bdfdec1719f4_1` | Active Pose Proxy + Character + Outfit, but `single_stage`; identity failed manual review | Invalid as `GNB2-S6` proof; pipeline diagnostic only |
| Gemini Pro | `job_fashion_25bd77c3137542dd8b_1` | Original person-containing Template was sent because Advanced mode skipped proxy | Invalid comparison |
| GPT-Image 1.5 | `job_fashion_0f5ab1d050c17b9a90_1` | Original person-containing Template was sent because Advanced mode skipped proxy | Invalid comparison |
| GPT-Image 2 | `job_fashion_5f8ac6b3f4c2ae454a_1` | Rejected unsupported `input_fidelity`; 110-credit reservation refunded | Adapter defect; no visual score |
| Seedream 4.0 | `job_fashion_0e731c3e18699d638e_1` | 55 credits, 34.1 seconds, 864x1152, three references ordered Character/Outfit/Template, `single_stage`, and no Pose Proxy lineage | Invalid comparison; retain `experimental` |
| Seedream 5.0 Lite | `job_fashion_8ed8208c29f87d8597_1` | Original person-containing Template was sent; model remains operation-only for reviewed wireframe proxy preparation | Invalid final-compositor comparison |

The Seedream 4.0 total is correct under the current mock policy:

```text
45 generation credits + 10 Template access credits = 55 credits
```

The durable run record for `frun_0e731c3e18699d638e` remained `queued` after
the generation history showed completion. Fashion run hydration must persist
terminal operation/result state back to the run repository so support and
restart recovery do not depend on an in-memory queue.

Correction gate:

1. Every Fashion route, including Advanced qualification runs, must bind the
   exact approved Pose Proxy and include its ID, source operation, policy,
   strategy and representation in run lineage.
2. Provider adapters must emit only capabilities supported by the exact model;
   `gpt-image-2` must not receive `input_fidelity`.
3. Fashion history must retain sanitized Fashion run and proxy lineage for
   support lookup without logging image bytes.
4. A fair candidate sweep uses one Template version, Pose Proxy, Character,
   Outfit, dimensions and output count, and records one fresh Job ID per model.
5. This was the original correction gate for the prepared-look experiment. The
   later clothed-grid benchmark accepted a fixed single-stage
   Proxy + Character + Outfit route as the MVP baseline. Stage 1 plus Stage 2B
   is now a separate commercial promotion gate and is not a blocker for the
   fixed MVP route; its remaining orchestration, pricing and repeat benchmark
   work is owned by Phase2-19.

#### 3.4.1 Corrected-pipeline candidate sweep

The 2026-08-02 rerun bound the same approved Pose Proxy to Advanced routes.
The reviewer supplied the following manual results. Model identity is taken
from persisted Fashion run data, not the UI label or handwritten note.

| Actual model and Job | Identity / body / Outfit | Pose / scene / polish | Critical observations | Disposition |
|---|---|---|---|---|
| `gemini-3.1-flash-lite-image` / `job_fashion_e458673a36d0d38f06_1` | `5 / 5 / 5` | `5 / 5 / 5` | No Template leakage, accessory drift or visible Proxy; one image passed | Strong single-scenario result, but this was Lite rather than `gemini-3.1-flash-image`; retain operation-only policy until repeated and until the two-stage customer pipeline is evaluated |
| `gemini-3-pro-image` / `job_fashion_2be074bbe1d33d5125_1` | `0 / 0 / 0` | `2 / 4.5 / 0` | Wrong person/skin/Outfit, switched hand, necklace and footwear drift | Failed this prompt strategy; provider-specific strategy required before retest |
| `gpt-image-1.5` / `job_fashion_a7567066c521b3d64b_1` | `5 / 5 / 5` | `5 / 4.5 / 5` | No Template leakage or Proxy; small body slimming, sunlight drift and an attractive but unauthorized necklace | Selling-quality candidate; repeat with explicit accessory suppression |
| `gpt-image-2` / `job_fashion_aa602f8ffcd24507ef_1` | `5 / 5 / 2` | `5 / 5 / 0` | Outfit color/detail failed and necklace appeared; one-image acceptance failed | Failed current prompt strategy; retain Experimental only |
| `seedream-4-0-250828` / `job_fashion_51d36eb32f4cd4bf3d_1` | Not scored | Not scored | Provider rejected the Proxy input with `InputImageSensitiveContentDetected` | Input representation failure, not visual model evidence |
| `seedream-5-0-lite-260128` / same attempted source set | Not scored | Not scored | Provider rejected the same Proxy input with `InputImageSensitiveContentDetected` | Input representation failure; no final-compositor score |

The first row was initially reported as `gemini-3.1-flash-image`, but both the
durable run and history identify `gemini-3.1-flash-lite-image`. Do not use that
score to certify the non-Lite route.

The rejected Pose Proxy was a smooth anatomically contoured matte mannequin.
Although identity-neutral, it can be interpreted by provider moderation as an
unclothed body. The replacement strategy is
`GNB2-S6-CLOTHED-GRID-PROXY-V2`:

- opaque neutral-gray high crew-neck short-sleeve fitting top;
- separate opaque mid-thigh fitting shorts with visible hems;
- subtle non-text contour grid across the garment surface;
- no nude anatomy, nipples, genital contours, cleavage, transparency,
  underwear, lingerie or swimwear;
- the fitting uniform remains safety-visible geometry only and has no garment
  authority in final Fashion generation.

Changing the policy and strategy versions invalidates the old active Proxy.
The Template creator must calculate, prepare, review and approve the new Proxy
before another Fashion quote can use that Template.

The Grok `fashion_quote_stale` failure was unrelated to model quality. The
locked estimate stored resolution as `1K`, while the exact provider model
reported `1k`; Fashion aggregate reservation compared those values
case-sensitively. Resolution parity must be normalized before comparison while
all other fingerprinted fields remain exact.

#### 3.4.2 Clothed-grid Proxy sweep

After activating `GNB2-S6-CLOTHED-GRID-PROXY-V2`, the following Jobs used the
same new Proxy `tpp_6d6030c940fa8813d8` and can be compared as one corrected
single-stage sweep:

| Actual model and Job | Identity / body / Outfit | Pose / scene / polish | Reviewer result | Disposition |
|---|---|---|---|---|
| `gemini-3.1-flash-image` / `job_fashion_2d34cce9b7e070369d_1` | `5 / 5 / 5` | `5 / 5 / 5` | No leakage, accessories or visible Proxy; one image passed | Qualified current single-stage baseline; retain Simple route while two-stage promotion remains separate |
| `seedream-4-0-250828` / `job_fashion_03e6f588c72bad56fb_1` | `2 / 3 / 2` | `1 / 1 / 0` | Face direction, Outfit, pose and scene drifted; one-image acceptance failed | Failed final Fashion composition for MVP |
| `seedream-5-0-lite-260128` / `job_fashion_bda6a6fe891f28e65b_1` | `4 / 5 / 4.5` | `5 / 5 / 0` | Strong structure but one shoe disappeared and the other merged visually with the foot | Keep operation-only for Pose Proxy preparation; not a final Simple route |
| `dola-seedream-5-0-pro-260628` / `job_fashion_26ae67179bbdae7fe6_1` | `5 / 5 / 5` | `5 / 5 / 4` | Identity looked slightly mannequin-like and footwear was omitted | Advanced experiment only; retest with explicit complete-footwear contract |
| `grok-imagine-image-quality` / `job_fashion_d4b42c50ae5c067d04_1` | `5 / 5 / 3` | `5 / 5 / 2` | Fast result but garment shape/color failed | Failed final Fashion composition for MVP |
| `grok-imagine-image` / `job_fashion_d41cb7ff2ae7cbc329_1` | `5 / 5 / 3` | `3 / 3 / 2` | Garment waistband, camera angle and scene position drifted | Failed final Fashion composition for MVP |

The Seedream 5.0 Lite score originally referenced
`job_fashion_51d36eb32f4cd4bf3d_1`, but that ID belongs to the earlier failed
Seedream 4.0 moderation attempt and has no history output. The persisted Lite
result is `job_fashion_bda6a6fe891f28e65b_1`; qualification evidence must use
that canonical ID.

The existing Gemini Pro result
`job_fashion_2be074bbe1d33d5125_1` is not part of this corrected sweep. It used
the obsolete `GNB2-S6-PROXY`, while the passing Flash result used
`GNB2-S6-CLOTHED-GRID-PROXY-V2`. Both received the same 5,877-character prompt
and the same Template/Character/Outfit role order. No special Gemini Pro API
parameter is currently missing; rerun Pro with a fresh quote and the new Proxy
before introducing a provider-specific prompt strategy.

#### 3.4.3 Semantic reference envelope and Gemini Pro pilot

The provider-neutral reference-processing contract owns semantic roles and
authority, but each provider adapter owns how those semantics are serialized.
Do not force every provider API to accept one identical wire payload.

Canonical role order for the current Fashion operation is:

```text
POSE_PROXY -> pose, movement, camera, framing, environment and lighting
CHARACTER_IDENTITY -> face, hair, skin, body shape and body proportions
OUTFIT_PRODUCT -> garment construction, silhouette, color, material and detail
```

Every adapter must preserve this contract and its immutable processing-plan
order. An adapter that supports interleaved multimodal input may bind a concise
role marker directly to each image. An adapter that accepts only a separate
image array must retain the same array order and compile the role mapping into
its provider-specific prompt. Models that cannot reliably honor all authorities
must use a staged operation rather than silently weakening the contract.

The first rollout is limited to `gemini-3-pro-image` under strategy
`GEMINI-PRO-ROLE-INTERLEAVED-V1`:

```text
GLOBAL INSTRUCTION
<compiled Fashion prompt>

IMAGE_0 - POSE PROXY
<Pose Proxy image>

IMAGE_1 - CHARACTER IDENTITY
<Character image>

IMAGE_2 - OUTFIT PRODUCT
<Outfit image>

FINAL EXECUTION
Use every labeled image only for its assigned authority and return the requested
final image.
```

Markers are derived from `referenceRoleManifest`; they are never inferred from
file names or client labels. Unknown roles use a neutral reference marker and
must not receive invented authority.

The official Gemini image-generation guide documents interleaved text/image
input, automatic Thinking for Gemini 3 Pro Image and a final `output_image`
convenience result representing the last generated image block:

`https://ai.google.dev/gemini-api/docs/image-generation`

The REST adapter iterates raw interaction steps. Gemini Pro may expose interim
thought images before its completed output, so the adapter must retain the last
valid image block across all `model_output` steps. Selecting the first image is
not equivalent to the documented final output behavior. This last-image rule is
piloted only for Gemini Pro until regression evidence supports broader rollout.

Pilot acceptance gate:

1. Assert exact interleaved role/image order from the immutable provider plan.
2. Assert that multiple model-output images return the last valid image.
3. Keep Flash and Lite serialization behavior unchanged.
4. Repeat the fixed Fashion benchmark at least three times before promoting
   Gemini Pro from Experimental.
5. Record Job IDs, strategy version, Proxy lineage and manual quality scores.

#### 3.4.4 Gemini Pro authority-first correction

The first application run using `GEMINI-PRO-ROLE-INTERLEAVED-V1` still allowed
the Template person and Template garment direction to dominate. Review against
Google's image-generation documentation and the external reference workflow
guide below identified three request-shape defects:

- the long execution prompt appeared before the role-bound images;
- the Pose Proxy appeared before the Character identity image;
- the immutable Template `finalPromptSnapshot` still contributed its original
  garment direction even when an Outfit Product reference replaced it.

References:

- `https://ai.google.dev/gemini-api/docs/image-generation`
- `https://www.aifreeapi.com/en/posts/nano-banana-pro-reference-images`

The corrected Gemini Pro-only strategy is
`GEMINI-PRO-AUTHORITY-FIRST-V2`:

```text
REFERENCE AUTHORITY CONTRACT

IMAGE_0 - CHARACTER IDENTITY
<approved Character image>

IMAGE_1 - OUTFIT PRODUCT
<Outfit Front image>

IMAGE_2 - OUTFIT PRODUCT BACK VIEW        # when supplied
<Outfit Back image>

IMAGE_3 - POSE PROXY                      # IMAGE_2 when no Outfit Back exists
<private Pose Proxy image>

FINAL EXECUTION INSTRUCTION
<compiled Fashion prompt with IMAGE_n references remapped to this order>
```

Rules:

1. Provider-neutral reference processing retains its canonical immutable order,
   lineage and fingerprint. The Gemini Pro adapter creates a provider-local
   authority view and does not mutate the shared plan.
2. Face identity, when explicitly available as a separate approved reference,
   precedes the Character full-body reference. The MVP must not derive an
   automatic face crop from the three-view sheet.
3. Character identity precedes garment authority; Outfit Front and Back precede
   the structural Pose Proxy. Supporting style references come last.
4. Every `IMAGE_n` token in the structured authority brief must be remapped to
   the provider-local order before dispatch. Reordering binary images without
   remapping the contract is invalid.
5. The full execution instruction appears after all labeled images. The opening
   text is only a concise authority contract.
6. When a Fashion-ready Template has a Pose Proxy, its creator-time
   `finalPromptSnapshot` and `manualPromptSnapshot` must not be copied into the
   final Fashion prompt. Pose, scene, camera and lighting come from the Proxy and
   resolved Fashion direction; garment authority comes only from Outfit
   references. This prevents an original Template blazer, trousers or other
   clothing direction from competing with the selected product.
7. A legacy Template without a Pose Proxy retains its prompt snapshot as a
   compatibility fallback and cannot be promoted as Fashion-ready by this rule.
8. Flash, Lite, OpenAI, xAI and ModelArk serialization remain unchanged until
   their own benchmark evidence justifies adopting this ordering.

Regression evidence must assert the actual request sequence, binary image
ordering, `IMAGE_n` remapping, last-image response selection and removal of the
Template garment prompt when a Pose Proxy is active.

#### 3.4.5 Gemini Pro concise authority projection

The 2026-08-04 manual Postman benchmark passed Character identity, Outfit,
Template scene and composition when the same three production assets were sent
with a concise final instruction. The application request used the same binary
references and provider-local order but its final prompt was approximately
twice as long because the generic compiler also contributed structured JSON,
Character personality, product notes and repeated authority directives.

Fashion generation therefore uses
`GEMINI-PRO-CONCISE-AUTHORITY-V4` only when all of these conditions hold:

- provider is `gemini`;
- model is `gemini-3-pro-image`;
- an approved Pose Proxy is active;
- the immutable manifest contains Character, Outfit Front and Template
  Baseline roles.

The Fashion domain projects the canonical context into one concise instruction
before enqueue. It declares Character as the exclusive person authority,
Outfit as the exclusive garment authority and Pose Proxy as the exclusive
pose/composition authority. It retains complete-body framing, coherent fallback
footwear and accessory prohibitions from the passing manual request. It does
not include Template-person identity, Character personality, product marketing
copy, structured authority JSON or repeated generic prompt fragments. An
explicit immutable Template `Expression` remains a concise non-identity
performance direction executed by the selected Character.

The provider adapter remains responsible only for interleaving role labels and
images, provider-local ordering, `IMAGE_n` remapping and response parsing. Flash,
Lite, OpenAI, xAI and ModelArk continue receiving the canonical compiled prompt.
If any required manifest role is absent, Gemini Pro also falls back to that
canonical prompt rather than inventing an authority mapping.

Every dispatched job records the effective `promptStrategyVersion` in its
routing snapshot, Fashion lineage, safe generation diagnostic and history
entry. Advanced routing resolves qualification metadata from the same model
qualification catalog as Simple routing. Gemini image resolution is propagated
from canonical `imageResolution` to the provider `image_size` field.

Manual verification checkpoint:

1. Create one Advanced Fashion run with `gemini-3-pro-image` and the fixed
   Character, Outfit and Fashion-ready Template benchmark.
2. Confirm the enqueue/provider-dispatch diagnostic reports
   `GEMINI-PRO-CONCISE-AUTHORITY-V4` and the selected resolution.
3. Score identity, body, outfit, pose, scene, commercial polish and leakage
   using the qualification rubric in this requirement.
4. Keep Gemini Pro Experimental until three repeat runs pass the promotion
   gate; this single Postman success proves request shape, not production
   reliability.

### 3.5 Creator publication and Fashion-readiness status

The owner Template-management surface must present two independent lifecycle
rows before its Fashion-readiness actions:

```text
Sharing status
  setup_required | public | unlisted | members_only | private

Fashion readiness
  not_prepared | pending | processing | review_required | active | failed |
  superseded
```

Each row shows a concise human-readable state and one short explanation. A
reusable Template begins as the owner's `setup_required` draft and is not
discoverable or usable by other actors. It becomes a published Community
listing only after the creator approves an active Pose Proxy. A private listing
is described as not shared even when its immutable Template version exists.

Readiness interaction follows the existing estimate/reservation pipeline:

- `Calculate preparation cost` and the confirmed `{credits}` preparation CTA
  use a prominent Theme-aware yellow treatment;
- estimating shows an inline spinner and disables duplicate submission;
- `pending`, `processing`, and an in-flight prepare request show the same
  rotating `LoaderCircle` progress convention used by image generation;
- the owner endpoint continues polling while preparation is active;
- `review_required` presents the private review image and approval action;
- `active` is the only state labeled Fashion-ready;
- `failed` or request errors use the shared error surface, preserve a sanitized
  message and expose the correlation ID when available;
- retries continue through the locked estimate and idempotent preparation
  contracts; the UI must not create a second credit path.

### 3.6 Internal pose-proxy artifact visibility

Pose-proxy and Dummy generations are internal Template preparation artifacts,
not customer creations. New history records must persist
`artifactVisibility = template_owner_only` and
`operationPurpose = template_pose_proxy_prepare`. Customer history projections,
Recent Generations, My Images, collection pickers and reference pickers must
exclude these records. Legacy `job_pose_proxy_*` records receive the same
projection rule without requiring an eager data migration.

The Queue must not add an internal pose proxy to the actor's default collection.
The original output remains visible to the owning creator through Edit Shared
Template during review and after activation, and remains available to audit,
credit recovery and support through canonical repositories. Public readiness
projections never expose the artifact URL.

Automatic or manual QA checks:

- exactly one primary mannequin;
- no recognizable face, skin, hair, identity, clothing texture, logo or
  accessory remains;
- head, torso, limbs, hands, contact points and weight distribution retain the
  source pose;
- camera, crop, framing, environment and lighting remain compatible;
- output is one continuous image, not a contact sheet or multi-view result.

OpenAI/ChatGPT and Grok manual successes remain fallback evidence only.
Seedream 5.0 Lite is accepted only for the provider-specific technical-wireframe
strategy. Its output requires owner visual review before activation. It is not
an automatic fallback, because changing provider must require a new locked
estimate and an explicit operation decision.

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

### 7.2 MVP Pose Proxy Preparation Cost

The selected MVP processor is:

```text
providerId = gemini
modelId = gemini-3.1-flash-lite-image
operationPurpose = template_pose_proxy_prepare
outputCount = 1
referenceCount = 1
```

Under `server/config/credit-pricing-policy.json` policy
`mock-2026-07-24-v2`, the current mock estimate is:

```text
base output                      45 credits
one source Template reference  + 1 credit
MVP minimum setup charge        46 credits
```

The value is a locked policy result, not a React constant. If pricing changes,
the quote uses the current configured policy and stores the pricing-policy
version. A valid cache hit costs `0` preparation credits because it performs no
new provider operation.

For MVP, charge the minimum locked setup amount once per new proxy cache key.
Momelo may subsidize part or all of this cost for official Templates, but the
ledger must separately record customer charge, provider cost and subsidy. A
failed idempotent retry must not charge twice.

This is cheaper than the current Seedream 5.0 Lite mock base of `50` credits,
and Nano Banana Lite also produced the more accurate Dummy in manual testing.
Therefore cost and observed quality currently select the same MVP route.

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

Current Gemini continuation within this phase:

1. Preserve the accepted `GNB2-S6` prompt and reference order without further
   conversational edits.
2. Repeat three fresh end-to-end pairs using different Character, Outfit and
   Template fixtures.
3. Record Pose Proxy preparation, Stage 1 and Stage 2 operation IDs, latency
   and billed credits independently.
4. Reject any pair with Template identity leakage, recognizable identity in the
   Dummy, or unacceptable pose/hand drift.

### Phase B - Configuration and domain

1. Add versioned Fashion model qualification configuration under
   `server/config/`.
2. Add its schema and a Fashion-owned resolver under
   `server/domain/fashion-blueprint/`.
3. Extend `FashionRoutingPolicyService` to require qualification for Simple
   routes.
4. Keep unqualified models available only through Advanced policy when allowed.
5. Bind qualification and strategy versions into plan/quote fingerprints.

### Phase B.1 - MVP Pose Proxy and Template cache

1. Add `template-pose-proxy-policy.json` and schema with the selected Gemini
   Lite route, accepted prompt strategy, setup-credit purpose, QA thresholds
   and no unqualified automatic fallback.
2. Add `TemplatePoseProxyRepository` and `TemplatePoseProxyService` using the
   existing JSON repository, asset ownership and queue conventions.
3. Add `template_pose_proxy_prepare` to quote, reservation, ledger, audit and
   correlation contracts.
4. Implement the generative processor through the existing provider gateway;
   do not copy provider transport into the Template domain.
5. Bind proxy ID, source fingerprint, provider/model, strategy and QA decision
   to the immutable Template version.
6. Integrate preparation into Scene-to-Template publication while leaving
   ordinary non-Fashion Community Template publication available.
7. Require an active compatible proxy for approved Simple Fashion execution.
8. Reuse one proxy across every compatible Product Item in a Batch and one
   proxy per approved pose variant.
9. Expose only sanitized readiness metadata publicly; raw prompts, private
   asset paths and provider requests remain private.
10. Add support diagnostics and prove cache hit, retry, invalidation and
    no-double-charge behavior.

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
6. Display Pose Proxy preparation as a one-time Template setup operation and
   show `0` additional preparation credits on a valid cache hit.

## 10. Canonical File Ownership For Future Implementation

```text
server/config/fashion-quality-tiers.json
server/config/fashion-model-qualifications.json
server/config/fashion-model-qualifications.schema.json
server/config/template-pose-proxy-policy.json
server/config/template-pose-proxy-policy.schema.json
server/config/reference-processing-policy.json
server/domain/fashion-blueprint/FashionRoutingPolicyService.js
server/domain/fashion-blueprint/FashionQuoteService.js
server/domain/template-pose-proxy/TemplatePoseProxyService.js
server/domain/template-pose-proxy/GenerativePoseProxyProcessor.js
server/repositories/template-pose-proxy/TemplatePoseProxyRepository.js
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
- Nano Banana Lite is used only for the qualified Pose Proxy preparation
  operation and is not silently promoted to final Simple Fashion generation.
- One matching Template/pose cache key creates at most one active proxy and one
  customer setup charge.
- A cache hit performs no new provider request and consumes no preparation
  credit.
- Public Template APIs expose proxy readiness without exposing the private
  Dummy, raw prompt or provider request.
- Seedream 5.0 Lite is operation-only for reviewed wireframe Pose Proxy
  preparation and is not an automatic fallback or final Simple Fashion route.

## 12. MVP Implementation Record (2026-08-01)

Implemented in this increment:

- server-owned Fashion qualification configuration and schema;
- Simple routing certification gate with Draft/Proof using the same qualified
  final model as Selling Quality;
- Nano Banana Lite limited to `template_pose_proxy_prepare`;
- versioned Pose Proxy policy containing the accepted `GNB2-S6` sanitization
  prompt and no automatic fallback;
- actor-owned, idempotent JSON repository with deterministic cache keys;
- locked estimate, reservation, queue, capture/refund-compatible preparation;
- private review artifact, explicit creator review and active readiness state;
- sanitized public readiness projection without proxy image or raw prompt;
- Fashion quote fingerprint binding for qualification, prompt strategy and
  active Template Pose Proxy;
- Simple Fashion execution using the active identity-neutral proxy instead of
  the original person-containing Template preview;
- owner management UI for estimate, preparation, polling, visual review and
  approval.
- Pose Proxy binding parity for Simple and Advanced Fashion routes;
- durable Pose Proxy lineage on plans, runs and generated history;
- exact-model OpenAI input-fidelity gating so GPT-Image 2 does not receive an
  unsupported edit parameter;
- durable Fashion run status/result synchronization from queue/history during
  hydration.

The MVP final customer operation currently composes the active Pose Proxy,
Character and Outfit through the canonical Fashion generation operation. The
fully chained prepared-look Stage 1 plus final Stage 2B orchestration remains a
separate promotion gate: do not describe that two-operation customer pipeline
as production-complete until its queue lineage, quote allocation and partial
failure recovery are implemented and benchmarked. This explicit boundary keeps
the accepted evidence from being overstated.

Commercial closure work is intentionally carried by Phase2-19 rather than
keeping this MVP requirement open. That follow-up owns the two remaining Gemini
Flash fixtures, the first honest Premium policy, candidate-model promotion and
any future two-stage route. The current qualified single-stage route may remain
available while those broader qualification activities continue.

Canonical runtime data:

```text
server/data/template-pose-proxy/poseProxies.json
```

Public APIs expose only readiness. The owner-only readiness route may expose
the generated review image while status is `review_required`.

## Appendix A - Gemini Nano Banana 2 Prompt Evidence

### A.1 `GNB2-S4` single-stage human-deconfliction prompt

Reference order:

```text
IMAGE_0 = Template
IMAGE_1 = full three-view Character
IMAGE_2 = Outfit
```

```text
Create exactly one photorealistic vertical commercial fashion photograph.

IMAGE_0 provides only the non-human composition direction:
- body joint positions and walking action
- camera position and full-body framing
- gallery environment and architectural layout
- lighting direction

Treat the person visible in IMAGE_0 as an anonymous pose placeholder.
Discard every human appearance attribute from that person.
Do not use their face, facial geometry, skin tone, hair, height, body shape,
body proportions, clothing, accessories, or footwear.
Do not use the Template person's body silhouette as the new character's body
shape.

IMAGE_1 is the exclusive authority for the final person.
Reconstruct the final person from IMAGE_1 before applying the target pose.
Preserve the exact recognizable facial identity, facial proportions, skin
tone, hairstyle, height relationship, body shape, and complete body
proportions from IMAGE_1.
Render this same character walking with a natural joyful expression.
The joyful expression must be newly performed by the character from IMAGE_1
and must not copy facial features from IMAGE_0.

IMAGE_2 is the exclusive authority for the clothing.
Dress the character from IMAGE_1 in the outfit from IMAGE_2.
Preserve the garment silhouette, construction, color, pattern, material,
seams, fit, and visible garment details.
Do not introduce a bag, accessory, footwear, bow, or decoration unless it is
clearly present in IMAGE_2.

Compose the reconstructed character and outfit inside the environment from
IMAGE_0.
Use only the walking action and spatial composition from IMAGE_0 while
retaining the character's own anatomy and proportions.

Identity, skin, hair, height, and body proportions must come from IMAGE_1 only.
Garment must come from IMAGE_2 only.
Pose joints, camera, framing, environment, and lighting must come from IMAGE_0
only.

Output one person in one continuous full-frame 6:8 vertical photograph.
Do not blend identities. Do not reproduce the Template person. Do not create
multiple views, a contact sheet, split screen, text, labels, or watermark.
```

For a flat-lay Outfit, replace the IMAGE_2 paragraphs with:

```text
IMAGE_2 is a flat-lay product reference and the exclusive authority for the
clothing.
Convert the flat-lay garment into naturally worn clothing on the exact
character from IMAGE_1.
Preserve its garment category, silhouette, construction, color, pattern,
material, seams, closures, and visible product details.
Infer only the physically necessary fit, drape, folds, and occluded areas.
Do not invent accessories, bags, footwear, decorative elements, or additional
garment layers.
```

### A.2 `GNB2-S5` two-stage prepared-look calibration

Stage 1 reference order:

```text
IMAGE_0 = full three-view Character
IMAGE_1 = flat-lay Outfit
```

Stage 1 prompt:

```text
Create exactly one photorealistic full-body fashion fitting photograph.

IMAGE_0 is the exclusive authority for the person. Reconstruct the exact same
recognizable character, preserving facial identity, facial proportions, skin
tone, hairstyle, height relationship, body shape and complete body
proportions. Do not reproduce the casting-sheet layout, white casting clothes,
labels or multiple views.

IMAGE_1 is the exclusive authority for the clothing. Dress the exact character
from IMAGE_0 in this flat-lay Outfit. Preserve the garment category,
silhouette, construction, color, pattern, material, seams, closures and visible
product details. Infer only physically necessary fit, drape, folds and hidden
areas. Do not invent accessories, bags, footwear, decorative elements or extra
garment layers.

Show one person in a relaxed neutral full-body standing pose against a plain
light studio background. Produce one continuous 6:8 vertical photograph. Do
not create multiple views, a contact sheet, split screen, text, labels or a
watermark.
```

Stage 2 reference order:

```text
IMAGE_0 = Template
IMAGE_1 = accepted Stage 1 dressed-Character output
```

Stage 2 prompt:

```text
Create exactly one photorealistic vertical commercial fashion photograph.

IMAGE_0 provides only pose joint positions, movement, camera, full-body
framing, environment, architecture and lighting. Treat its person as an
anonymous pose placeholder. Discard that person's face, skin tone, hair,
height, anatomy, body shape, body proportions, clothes, accessories and
footwear.

IMAGE_1 is the exclusive authority for the complete dressed person. Replace
the Template person completely with this exact recognizable character while
preserving the character's face, facial proportions, skin tone, hairstyle,
height relationship, body shape and complete body proportions. Preserve the
Outfit already worn in IMAGE_1, including garment silhouette, construction,
color, pattern, material, seams, fit and visible details.

Adapt only the dressed character's pose and placement to the walking action in
IMAGE_0. Preserve the character's own anatomy rather than the Template
person's silhouette. Render a natural joyful expression on the character
without copying facial features from IMAGE_0.

Identity and clothing must come from IMAGE_1 only. Composition and scene must
come from IMAGE_0 only. Output one person in one continuous full-frame 6:8
vertical photograph. Do not blend identities, reproduce the Template person,
invent accessories, or create multiple views, text, labels or watermark.
```

Run one Stage 1 operation followed by one Stage 2 operation as a single
calibration pair. If it passes, repeat the complete pair three independent
times; never reuse a preferred Stage 1 output across all three qualification
pairs.

### A.3 `GNB2-S6` sanitized pose Template candidate

#### Stage 1 - Prepare the dressed Character

Use the same reference order and prompt as `GNB2-S5` Stage 1. The accepted
output must pass Character identity, skin/body and Outfit fidelity before it
can enter the final composition operation.

#### Stage 2A - Sanitize the Template person

Reference order:

```text
IMAGE_0 = original Template
```

Prompt:

```text
Create exactly one photorealistic vertical pose-template image from IMAGE_0.

Preserve exactly the original environment, architecture, camera position,
camera angle, full-body framing, crop, perspective, lighting direction,
shadows and the person's complete pose geometry.

Replace the visible person completely with one anonymous featureless
matte-gray fashion mannequin. The mannequin must preserve the exact head
orientation, shoulder rotation, torso angle, arm positions, elbow bends,
forearm angles, wrist angles, hand positions, finger/contact placement, hip
rotation, leg positions, knee bends, foot placement, walking action and weight
distribution from IMAGE_0.

The mannequin must have no recognizable face, skin, hair, ethnicity, age,
identity, clothing texture, logo or personal appearance. Do not retain or
reconstruct the original person's identity. Do not change the scene, pose,
camera, framing or lighting.

Output one person-shaped mannequin in one continuous full-frame 6:8 vertical
image. Do not create multiple views, a contact sheet, split screen, text,
labels or watermark.
```

Reject this artifact if the person remains recognizable or if important hand
contact, limb position, camera, framing or scene details drift.

#### Stage 2B - Compose the final Fashion image

Reference order:

```text
IMAGE_0 = accepted sanitized pose Template from Stage 2A
IMAGE_1 = accepted dressed-Character output from Stage 1
```

Prompt:

```text
Create exactly one photorealistic vertical commercial fashion photograph.

IMAGE_0 is the exclusive authority for pose, movement, camera, framing,
perspective, environment, architecture and lighting. Its gray mannequin is
only a spatial pose guide and has no identity, skin, hair, body or clothing
authority.

IMAGE_1 is the exclusive authority for the complete dressed person. Replace
the mannequin completely with this exact recognizable Character. Preserve the
Character's facial identity, facial proportions, skin tone, hairstyle, height
relationship, body shape and complete body proportions. Preserve the Outfit
already worn in IMAGE_1, including garment category, silhouette, construction,
color, pattern, material, seams, closures, fit and visible product details.

POSE LOCK - HIGH PRIORITY:
Copy IMAGE_0 as an exact spatial constraint. Preserve the mannequin's head
orientation, shoulder rotation, torso angle, arm positions, elbow bends,
forearm angles, wrist angles, hand positions, finger/contact points, hip
rotation, leg positions, knee bends, foot placement, walking action and weight
distribution. Do not simplify the pose into a generic front, back, standing or
walking pose. Where Character proportions differ, preserve the same joint
relationships and contact intent while retaining the anatomy and proportions
from IMAGE_1.

Identity, skin, hair, body and Outfit must come from IMAGE_1 only. Pose, camera,
framing, environment and lighting must come from IMAGE_0 only.

Output one person in one continuous full-frame 6:8 vertical photograph. Do
not blend identities, reproduce any person from the original Template, invent
accessories or garment details, or create multiple views, a contact sheet,
split screen, text, labels or watermark.
```

The accepted manual result for this prompt/process scored `5/5` in Character,
skin/body, Outfit and exact Template pose/hand placement, with no Template
identity leakage. Preserve the prompt and reference order verbatim for the
repeatability benchmark; do not tune it between attempts.

## Appendix B - MVP Pose Proxy Runtime Storage And Inspection

### B.1 Where the Dummy image is stored

The customer-facing term is `Reusable Pose`; the domain record is
`TemplatePoseProxy`; the generated image itself is the identity-neutral Dummy
or mannequin.

The current JSON MVP uses the canonical generation queue. A successfully
generated Dummy is therefore stored with the normal generated-output naming
rule:

```text
Physical original image:
  client/outputs/job_pose_proxy_<18-character-token>.<extension>

Browser/runtime URL:
  /outputs/job_pose_proxy_<18-character-token>.<extension>

Generated preview thumbnail:
  client/outputs/thumbnails/job_pose_proxy_<18-character-token>.webp

Pose Proxy lifecycle and lineage record:
  server/data/template-pose-proxy/poseProxies.json

Generation recovery/history record:
  server/data/generation/history.json

Credit estimate, reservation, capture or refund:
  server/data/credits/database.json

Source Template and immutable version:
  server/data/templates/templates.json
  server/data/templates/versions.json
```

`<extension>` is selected from the provider response MIME type and is normally
`jpg`, `png` or `webp`. Code must not assume one fixed extension. The exact
path is taken from `TemplatePoseProxy.proxyImageUrl` after generation finishes.

Example relationship:

```text
TemplatePoseProxy.id
  = tpp_a1b2c3d4e5f6071829

TemplatePoseProxy.operationId
  = job_pose_proxy_a1b2c3d4e5f6071829

TemplatePoseProxy.proxyImageUrl
  = /outputs/job_pose_proxy_a1b2c3d4e5f6071829.jpg

Physical file
  = client/outputs/job_pose_proxy_a1b2c3d4e5f6071829.jpg

Thumbnail
  = client/outputs/thumbnails/job_pose_proxy_a1b2c3d4e5f6071829.webp
```

The 18-character token is derived from the deterministic cache key plus the
preparation idempotency key. The cache key itself binds:

```text
Template version ID
+ pose variant ID
+ source preview fingerprint
+ processor type
+ provider and model IDs
+ processor strategy version
+ output resolution and aspect ratio
```

Changing any bound value creates a new artifact lineage. An active artifact is
never overwritten in place.

### B.2 Generation process flow

```text
1. Creator saves a reusable Template draft
   -> visible human preview remains the owner-visible marketing image
   -> the draft is absent from public discovery and Template use

2. Creator opens Edit Template -> Prepare reusable pose
   -> POST /api/templates/:templateId/pose-proxy/estimate

3. Server resolves the owner-owned immutable Template version
   -> reads preview.imageUrl
   -> calculates sourceFingerprint and deterministic cacheKey

4. Cache lookup
   -> active/processing/review_required hit: return existing record
   -> estimated setup credits = 0
   -> no reservation and no provider job

5. Cache miss
   -> CreditPricingPolicyService calculates a locked estimate
   -> Gemini Lite + 1 Template reference + 1 output
   -> current mock policy result is 46 credits

6. Creator confirms preparation
   -> POST /api/templates/:templateId/pose-proxy/prepare
   -> server atomically creates one TemplatePoseProxy record
   -> duplicate concurrent requests converge on that record

6A. Creator reviews and approves the prepared Pose Proxy
   -> the same Community post changes from draft to published
   -> the public marketing image remains the human Scene preview
   -> no duplicate Template, version or post is created

7. Credit reservation
   -> requestId  = req_pose_proxy_<token>
   -> jobId      = job_pose_proxy_<token>
   -> correlationId = corr_pose_proxy_<token>
   -> operationPurpose = template_pose_proxy_prepare

8. GenerativePoseProxyProcessor builds the queue request
   -> provider = gemini
   -> model = gemini-3.1-flash-lite-image
   -> strategy = GNB2-S6-PROXY
   -> ordered source = original Template preview only
   -> prompt comes from template-pose-proxy-policy.json

9. Canonical QueueManager dispatches the provider request
   -> successful output is written to client/outputs/
   -> thumbnail is written to client/outputs/thumbnails/
   -> credit reservation is captured
   -> generation recovery record is written to history.json
   -> provider/enqueue failure refunds the reservation

10. Owner UI polls the owner readiness endpoint
    -> GET /api/templates/:templateId/pose-proxy
    -> synchronize() reads the queue/history result
    -> proxyImageUrl is copied into poseProxies.json
    -> status changes processing -> review_required

11. Creator visually checks the Dummy
    -> it must preserve pose, hands, framing, scene and lighting
    -> it must not preserve face, skin, hair, identity or clothing detail

12. Creator approves the result
    -> POST /api/templates/:templateId/pose-proxy/:proxyId/review
    -> qaDecision = manual_pass
    -> status = active
    -> activatedAt is recorded

13. Fashion Simple quote resolves the exact active proxy
    -> binds proxy ID, Template version, policy and strategy into plan hash
    -> uses proxyImageUrl as Template composition authority
    -> original person-containing public preview is not sent as the final
       Simple Fashion composition reference
```

The record status progresses through:

```text
not_prepared (projection only)
-> pending
-> processing
-> review_required
-> active

Failure/replacement paths:
processing -> failed
failed -> superseded -> new immutable retry record
active old Template version -> remains immutable but is not selected for a new version
```

### B.3 How to verify a generated file on Windows

From the repository root in PowerShell:

```powershell
$records = Get-Content .\server\data\template-pose-proxy\poseProxies.json -Raw |
  ConvertFrom-Json

$proxy = $records |
  Sort-Object { [datetime]$_.updatedAt } -Descending |
  Select-Object -First 1

$proxy | Select-Object `
  id, templateId, templateVersionId, status, qaDecision, `
  operationId, correlationId, proxyImageUrl

$relativeOutput = $proxy.proxyImageUrl.TrimStart('/') -replace '/', '\'
$physicalPath = Join-Path .\client $relativeOutput

Test-Path $physicalPath
Get-Item $physicalPath | Select-Object FullName, Length, LastWriteTime
```

Expected result after provider completion:

```text
Test-Path = True
status = review_required or active
proxyImageUrl starts with /outputs/job_pose_proxy_
physical file length is greater than zero
```

Verify the matching generation recovery record:

```powershell
$history = Get-Content .\server\data\generation\history.json -Raw |
  ConvertFrom-Json

$history |
  Where-Object id -eq $proxy.operationId |
  Select-Object id, username, provider, submodel, imageUrl, `
    creditCost, generationDuration, width, height
```

Verify the thumbnail when required:

```powershell
$thumbnail = ".\client\outputs\thumbnails\$($proxy.operationId).webp"
Test-Path $thumbnail
Get-Item $thumbnail | Select-Object FullName, Length, LastWriteTime
```

### B.4 Privacy boundary and Commercial migration note

In the current local JSON MVP, `private execution artifact` means:

- public Template contracts expose readiness but not `proxyImageUrl`, raw
  processor prompt or provider request;
- only the owner readiness endpoint returns the review image while review is
  required;
- Fashion domain resolves the private record server-side.

However, the physical image currently uses the shared `/outputs` static file
boundary because QueueManager owns all generated-file persistence. A person
who already knows the exact local URL may request that file directly. This is
not the final Commercial security boundary.

Before production storage migration, move Pose Proxy originals to a private
object-storage namespace, for example:

```text
gs://<private-bucket>/template-pose-proxies/
  <templateId>/<templateVersionId>/<poseVariantId>/<proxyId>.<extension>
```

Access must then use server-authorized reads or short-lived signed URLs. Keep
the domain fields and cache key stable so the storage adapter can change
without changing Fashion quote, Template version or lineage contracts.

## Appendix C - Seedream Wireframe Pose Proxy Strategy

### C.1 Decision and scope

Manual testing on 2026-08-01 established that Seedream 5.0 Lite can produce a
usable Dummy when the requested representation is a technical pose wireframe,
even though its earlier photorealistic mannequin strategy failed. Therefore:

- `seedream-5-0-lite-260128` is `operation_only` for
  `template_pose_proxy_prepare`;
- it remains disallowed for final Simple Fashion composition;
- Nano Banana Lite remains the default MVP Pose Proxy processor;
- Seedream is a configured alternative, not an automatic fallback;
- switching processor requires an explicit policy/configuration decision and a
  fresh locked estimate;
- every generated wireframe requires owner review before it becomes `active`.

The runtime policy owns provider-specific prompts in
`server/config/template-pose-proxy-policy.json`. The policy service selects the
matching prompt profile by the exact `providerId + modelId`. A profile changes
`processorStrategyVersion`, which participates in the deterministic cache key;
old matte-mannequin artifacts can therefore never satisfy a new wireframe
request accidentally.

### C.2 Wireframe authority contract

The Seedream wireframe is an internal identity-neutral pose authority. It must
encode all of the following independently:

- pelvis and rib-cage orientation;
- shoulder axis and torso rotation;
- neck rotation relative to the shoulder line;
- head yaw: left/right rotation;
- head pitch: looking up/down;
- head roll: lateral tilt;
- chin elevation and face-plane direction;
- gaze axis without forcing the eyes toward the camera;
- arm, elbow, forearm, wrist, hand and finger/contact placement;
- hip, knee, ankle and foot positions;
- walking phase, balance and weight distribution;
- camera, crop, framing, perspective, environment and lighting.

The wireframe may contain geometry guides such as a face-plane contour,
nose-direction line, shoulder axis, sternum axis, pelvis axis and joint
connections. It must not contain text, arrows, labels, recognizable facial
features, skin, hair, body identity, clothes, accessories or logos.

### C.3 Final Fashion consumption rule

The final Fashion compositor must treat a matte mannequin and a technical
wireframe as the same abstract `pose proxy` role. It may copy pose geometry,
head/face direction, camera, scene and lighting only. It must replace the proxy
completely and must not reproduce wireframe lines or mannequin surfaces.
Character identity and anatomy continue to come only from the authorized
Character reference; garment authority continues to come only from Outfit
references.

### C.4 Manual QA checklist

A Seedream wireframe can be approved only when all checks pass:

1. Exactly one coherent full-body figure appears in one continuous image.
2. Torso, pelvis, limbs, hands, contact points and weight distribution match.
3. Neck rotation matches the source independently from torso rotation.
4. Head yaw, pitch and roll match the source.
5. Face plane, nose direction and gaze direction do not default to the camera.
6. Camera, crop, framing, environment and lighting remain compatible.
7. No source identity, face, skin, hair, clothing or accessory remains.
8. No labels, text, multi-view layout, contact sheet or watermark appears.

If body pose passes but neck/head/face direction fails, reject with QA reason
codes such as `neck_rotation_mismatch`, `head_orientation_mismatch`,
`face_plane_mismatch` or `gaze_axis_mismatch`. Do not activate a partially
correct proxy, because that error will propagate into every Template use.

### C.5 Fashion discovery invariant

Fashion Blueprint Template discovery must contain only canonical Templates
whose current immutable version has an active Pose Proxy and reports
`fashionCompatible: true`. A Community Template post is presentation metadata,
not proof of Fashion readiness. The client must join its Community cards against
the canonical `/api/templates` readiness index by `templateId` before rendering
selection controls.

Templates in `not_prepared`, `pending`, `processing`, `review_required`,
`failed` or `superseded` state must not appear as selectable Fashion looks.
This rule also applies to restored drafts and `templateId` deep links. The
server quote boundary continues to call `requireActive` as defense in depth.
