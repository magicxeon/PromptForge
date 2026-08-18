# Video Provider Pricing And Credit Model

**Status:** Research baseline and implementable pricing contract; retail launch
rates remain gated by provider qualification and Commercial approval
**Owner:** Credits with Cinematic Studio orchestration
**Primary role:** Commercial Financial Integrity
**Reviewers:** Backend Platform Architect, QA And Release Engineer
**Skills:** `review-commercial-integrity`, `review-generative-media-pipeline`,
`verify-release-regressions`
**Source review date:** 2026-08-17
**Implementation in this change:** server-owned capability/rate-card registry
and deterministic `VideoPricingCalculator` with Veo output-second and Seedance
completion-token test coverage. Customer quotes, reservation and settlement
remain disabled until a model is qualified and Commercial approves retail
rates.

## 1. Outcome

Momelo shall estimate, reserve, settle and reconcile video-generation Credits
from the exact model, duration, resolution, audio mode, service tier, input
media and output count submitted to the provider. Video pricing must not reuse
the current fixed per-image `publishedCredits` lookup because both Veo and
Seedance have parameter-dependent costs.

This requirement provides:

- an official provider rate-card snapshot;
- the conversion from provider USD cost to the current Momelo Credit policy;
- planning examples for one Shot and a complete short film;
- the immutable quote, actual-usage and settlement rules required before
  implementation.

The figures below are planning baselines, not an instruction to expose a model
to customers. A model must pass the qualification gate in
`006-video-generation-provider-contract.md` before its price becomes selectable.

## 2. Authoritative Sources

| Provider | Source | Pricing basis used |
|---|---|---|
| Google | [Gemini Developer API pricing - Veo 3.1](https://ai.google.dev/gemini-api/docs/pricing#veo-3.1) | USD per generated output second by model tier and resolution |
| Google | [Generate videos with Veo 3.1](https://ai.google.dev/gemini-api/docs/veo) | Duration, resolution, reference and output constraints |
| BytePlus | [ModelArk video model list](https://docs.byteplus.com/en/docs/ModelArk/1330310#7571da3f) and [current pricing page](https://docs.byteplus.com/en/docs/ModelArk/1544106#sd25_price) | USD per million output tokens, time-bounded provider discounts and official example prices |
| BytePlus | [Create a video generation task](https://docs.byteplus.com/en/docs/modelark/1520757) | Duration, resolution, audio, input-media and returned usage contract |

The server-owned rate card must record `sourceUrl`, `sourcePublishedAt` or
`sourceReviewedAt`, `effectiveAt`, provider region/currency and a stable
`providerRateVersion`. A price change creates a new version and never mutates an
accepted quote.

Admin activation, expiry preview and operational inspection follow
`008-cinematic-admin-support-and-observability-contract.md` and the shared
Admin/Support contracts in Requirement 017. Draft, manual/scheduled publish,
rollback and active snapshot behavior are owned specifically by
`requirements/017-implementation-backend/010-versioned-runtime-configuration-and-video-rate-cards.md`.
Cinematic Studio and Playground do not own a separate pricing editor or rate
store.

## 3. Current Momelo Commercial Assumptions

The baseline follows `server/config/credit-pricing-policy.json` as reviewed on
2026-08-17:

| Input | Baseline |
|---|---:|
| Pricing FX | 35 THB / USD |
| Operating safety buffer | 15% |
| Target gross margin | 70% |
| Presentation conversion | 10 Credits / THB |
| Credit rounding | Round upward to the next 5 Credits |

The minimum retail floor is:

```text
providerCostThb = providerCostUsd * pricingFxThbPerUsd
bufferedCostThb = providerCostThb * (1 + operatingSafetyBufferRate)
minimumRetailThb = bufferedCostThb / (1 - targetGrossMarginRate)
rawCredits = minimumRetailThb * creditsPerThbAssumption
publishedCreditFloor = ceil(rawCredits / creditRoundingIncrement)
                       * creditRoundingIncrement
```

Under the current assumptions, the multiplier is approximately:

```text
1.00 USD provider cost = 1,341.67 raw Credits before upward rounding
```

This is intentionally a minimum retail floor, not provider cost converted
directly to Credits. Product discounts, subscriptions or promotions must be
separate funded adjustments and must not silently reduce the recorded cost.

## 4. Google Veo 3.1 Rate Card

Google bills successful Veo 3.1 output by generated second. Native audio is
always on. Official rates reviewed on 2026-08-17:

| Model ID | Tier | 720p USD/s | 1080p USD/s | 4K USD/s |
|---|---|---:|---:|---:|
| `veo-3.1-lite-generate-preview` | Lite | 0.05 | 0.08 | Not supported |
| `veo-3.1-fast-generate-preview` | Fast | 0.10 | 0.12 | 0.30 |
| `veo-3.1-generate-preview` | Standard | 0.40 | 0.40 | 0.60 |

Google states that only successfully generated videos are charged. Momelo must
still retain the failed provider operation and settlement decision for audit.

### 4.1 Veo planning examples

The following table applies the current Momelo commercial assumptions. The
8-second row is the relevant baseline when Character/wardrobe reference images,
1080p or 4K are used.

| Tier | Resolution | Duration | Provider USD | Approx. cost THB | Retail floor Credits |
|---|---:|---:|---:|---:|---:|
| Lite | 720p | 4s | 0.20 | 7.00 | 270 |
| Lite | 720p | 8s | 0.40 | 14.00 | 540 |
| Lite | 1080p | 8s | 0.64 | 22.40 | 860 |
| Fast | 720p | 4s | 0.40 | 14.00 | 540 |
| Fast | 720p | 8s | 0.80 | 28.00 | 1,075 |
| Fast | 1080p | 8s | 0.96 | 33.60 | 1,290 |
| Fast | 4K | 8s | 2.40 | 84.00 | 3,220 |
| Standard | 720p | 4s | 1.60 | 56.00 | 2,150 |
| Standard | 720p | 8s | 3.20 | 112.00 | 4,295 |
| Standard | 1080p | 8s | 3.20 | 112.00 | 4,295 |
| Standard | 4K | 8s | 4.80 | 168.00 | 6,440 |

## 5. BytePlus Seedance Rate Card

BytePlus prices video from model token usage. The generic estimate is:

```text
estimatedTokens =
  (inputVideoSeconds + outputVideoSeconds)
  * outputWidth * outputHeight * outputFps / 1024

providerCostUsd = estimatedTokens / 1,000,000 * usdPerMillionTokens
```

The actual response `usage.completion_tokens` is authoritative for cost
reconciliation. For Seedance 2.0 and 2.5, the token rate varies by resolution
and whether video input is present. Seedance 2.5 also accepts input videos from
2 through 30 seconds and applies a resolution/aspect-ratio/output-duration
minimum-token floor. The quote therefore snapshots the complete media plan,
not only the requested output duration.

### 5.1 Online token rates

| Model ID | Online rate USD/M tokens | Important modifier |
|---|---:|---|
| `dreamina-seedance-2-5-260628` | 10.7 at 480p/720p without video; 6.4 with video; 11.7 at 1080p without video; 7.0 with video | Offline/flex is not supported; input-video minimum-token rules apply; 1080p has a time-bounded provider discount described below |
| `dreamina-seedance-2-0-260128` | 7.0 at 480p/720p without video; 7.7 at 1080p; 4.0 at 4K | With video input: 4.3, 4.7 and 2.4 respectively; minimum-token rules apply |
| `dreamina-seedance-2-0-fast-260128` | 5.6 without video; 3.3 with video | 1080p and 4K not supported |
| `dreamina-seedance-2-0-mini-260615` | 3.5 without video; 2.1 with video | 1080p and 4K not supported |
| `seedance-1-5-pro-251215` | 2.4 with audio; 1.2 silent | Offline/flex is 50% of online where supported |
| `seedance-1-0-pro-250528` | 2.5 | Text-to-video and image-to-video share the rate |
| `seedance-1-0-pro-fast-251015` | 1.0 | Text-to-video and image-to-video share the rate |

### 5.2 Time-bounded provider discounts

Provider discounts are provider-cost rate versions, not Momelo promotions.
They must have explicit activation and expiry instants and must never mutate an
accepted quote. The following discounts were active when reviewed on
2026-08-17:

| Model/rate scope | Effective window (UTC+8) | List rate USD/M tokens | Effective provider rate | Discount |
|---|---|---:|---:|---:|
| Seedance 2.5, 1080p, no video input | 2026-08-14 14:00 through 2026-09-17 14:00 | 11.7 | 8.424 | 28% |
| Seedance 2.5, 1080p, with video input | 2026-08-14 14:00 through 2026-09-17 14:00 | 7.0 | 5.04 | 28% |
| Seedance 2.0 Fast, 480p/720p, no video input | 2026-08-07 14:00 through 2026-09-07 14:00 | 5.6 | 4.2 | 25% |
| Seedance 2.0 Fast, 480p/720p, with video input | 2026-08-07 14:00 through 2026-09-07 14:00 | 3.3 | 2.475 | 25% |
| Seedance 2.0 Mini, 480p/720p, no video input | 2026-08-07 14:00 through 2026-09-07 14:00 | 3.5 | 1.4 | 60% |
| Seedance 2.0 Mini, 480p/720p, with video input | 2026-08-07 14:00 through 2026-09-07 14:00 | 2.1 | 0.84 | 60% |

For quick commercial review, the active discount changes representative
5-second no-video-input examples as follows:

| Model | Resolution | List-price USD | Discounted USD | Discounted retail floor Credits |
|---|---:|---:|---:|---:|
| Seedance 2.5 | 1080p | 2.843 | 2.04696 | 2,750 |
| Seedance 2.0 Fast | 480p | 0.28 | 0.21 | 285 |
| Seedance 2.0 Fast | 720p | 0.60 | 0.45 | 605 |
| Seedance 2.0 Mini | 480p | 0.18 | 0.072 | 100 |
| Seedance 2.0 Mini | 720p | 0.38 | 0.152 | 205 |

The pricing service must resolve a version from provider, model, resolution,
video-input mode and quote acceptance time. On expiry it falls back to a newly
approved list-rate version; it must not silently keep the promotional rate.

### 5.3 Seedance 2.5 official 5-second examples

BytePlus publishes the following list-price examples for 16:9 output. The
Credit values apply the current Momelo commercial assumptions. The per-second
rows are informational; Momelo must quote the complete operation and apply the
minimum-token floor when video input is present.

#### Input without video

| Resolution | Output duration | Provider USD / video | Provider USD / second | Approx. cost THB | Retail floor Credits |
|---|---:|---:|---:|---:|---:|
| 480p | 5s | 0.514 | 0.103 | 17.99 | 690 |
| 720p | 5s | 1.156 | 0.231 | 40.46 | 1,555 |
| 1080p | 5s | 2.843 | 0.569 | 99.51 | 3,815 |

#### Input with video

| Resolution | Input duration | Output duration | Provider USD / video range | Approx. cost THB range | Retail floor Credits range |
|---|---:|---:|---:|---:|---:|
| 480p | 2-30s | 5s | 0.553-2.152 | 19.36-75.32 | 745-2,890 |
| 720p | 2-30s | 5s | 1.244-4.838 | 43.54-169.33 | 1,670-6,495 |
| 1080p | 2-30s | 5s | 3.062-11.907 | 107.17-416.75 | 4,110-15,980 |

For each range, the lower price corresponds to a 2-4 second input and the
upper price corresponds to a 30-second input. These are list-price examples;
an active 1080p discount is applied by its own rate version before conversion
to Credits.

### 5.4 Other Seedance official list-price 5-second examples converted to Momelo Credits

These are official 16:9 example prices converted through the current policy.
Runtime pricing for Momelo's 9:16 output must calculate from the actual target
dimensions and must not copy these example values blindly.

| Model/tier | Mode | Resolution | Provider USD / 5s | Approx. cost THB | Retail floor Credits |
|---|---|---:|---:|---:|---:|
| Seedance 2.0 Mini | No video input | 480p | 0.18 | 6.30 | 245 |
| Seedance 2.0 Mini | No video input | 720p | 0.38 | 13.30 | 510 |
| Seedance 2.0 Fast | No video input | 480p | 0.28 | 9.80 | 380 |
| Seedance 2.0 Fast | No video input | 720p | 0.60 | 21.00 | 805 |
| Seedance 2.0 | No video input | 480p | 0.35 | 12.25 | 470 |
| Seedance 2.0 | No video input | 720p | 0.76 | 26.60 | 1,020 |
| Seedance 2.0 | No video input | 1080p | 1.87 | 65.45 | 2,510 |
| Seedance 2.0 | No video input | 4K | 3.89 | 136.15 | 5,220 |
| Seedance 1.5 Pro | Audio | 480p | 0.12 | 4.20 | 165 |
| Seedance 1.5 Pro | Draft audio | 480p | 0.07 | 2.45 | 95 |
| Seedance 1.5 Pro | Silent | 480p | 0.06 | 2.10 | 85 |
| Seedance 1.5 Pro | Draft silent | 480p | 0.04 | 1.40 | 55 |
| Seedance 1.5 Pro | Audio | 720p | 0.26 | 9.10 | 350 |
| Seedance 1.5 Pro | Silent | 720p | 0.13 | 4.55 | 175 |
| Seedance 1.5 Pro | Audio | 1080p | 0.58 | 20.30 | 780 |
| Seedance 1.5 Pro | Silent | 1080p | 0.29 | 10.15 | 390 |
| Seedance 1.0 Pro Fast | Silent | 720p | 0.10 | 3.50 | 135 |
| Seedance 1.0 Pro Fast | Silent | 1080p | 0.24 | 8.40 | 325 |

## 6. Complete-Film Planning Examples

These examples show why the user must see per-Shot cost before production.
They exclude story planning, storyboard stills, final assembly, music, subtitle,
storage and any failed-but-provider-billable edge case.

| Candidate route | Shot plan | Generated duration | Approx. provider USD | Retail floor Credits |
|---|---|---:|---:|---:|
| Seedance 1.0 Pro Fast 720p | 6 x 5s | 30s | 0.60 | 810 |
| Seedance 1.5 Pro 720p silent | 6 x 5s | 30s | 0.78 | 1,050 |
| Seedance 1.5 Pro 720p audio | 6 x 5s | 30s | 1.56 | 2,100 |
| Veo 3.1 Lite 720p | 4 x 8s, trim to 30s | 32s | 1.60 | 2,160 |
| Seedance 2.0 Mini 720p | 6 x 5s | 30s | 2.28 | 3,060 |
| Veo 3.1 Fast 720p | 4 x 8s, trim to 30s | 32s | 3.20 | 4,300 |
| Seedance 2.0 Fast 720p | 6 x 5s | 30s | 3.60 | 4,830 |
| Seedance 2.0 720p | 6 x 5s | 30s | 4.56 | 6,120 |
| Seedance 2.5 720p, no video input | 6 x 5s | 30s | 6.936 | 9,330 |
| Veo 3.1 Standard 720p | 4 x 8s, trim to 30s | 32s | 12.80 | 17,180 |

Rounding is applied per independently reserved Shot operation. A future
commercial policy may define a separately funded project bundle, but it must
not change provider-cost accounting or hide per-operation settlement.

## 7. Required Video Pricing Shape

The pricing policy must add operation-aware video records rather than overload
image fields:

```json
{
  "providerId": "gemini",
  "modelId": "veo-3.1-fast-generate-preview",
  "operation": "cinematic_draft_clip",
  "pricingStatus": "research_only",
  "providerRateVersion": "google-veo-2026-08-17",
  "billingMetric": "output_second",
  "ratesByResolutionUsd": {
    "720p": 0.10,
    "1080p": 0.12,
    "4K": 0.30
  },
  "audioPricingMode": "included_always",
  "durationRules": [4, 6, 8]
}
```

Seedance records use `billingMetric: completion_token` and versioned rate
selectors for resolution, audio, input-video presence and service tier. A rate
record may additionally carry `effectiveAt`, `expiresAt`, `listRateUsdPerMillionTokens`,
`effectiveRateUsdPerMillionTokens` and `providerDiscountBps`; expired records
are never eligible for a new quote.

## 8. Quote And Consent Snapshot

Every paid video quote must snapshot:

- Project, Scene, Shot and Continuity Lock versions;
- provider, model, operation and provider rate version;
- aspect ratio, exact output dimensions, resolution, frame rate and duration;
- audio mode, draft/final mode and service tier;
- input image/video/audio counts and input video duration;
- reference-plan fingerprint and output count;
- estimated provider tokens or billable seconds;
- provider cost USD, pricing FX and policy assumptions;
- generation Credits, assembly/audio additions, adjustment and total Credits;
- quote expiry and idempotency scope.

Changing any cost-bearing field invalidates the quote. The client never submits
or overrides a price.

## 9. Settlement And Reconciliation

1. Reserve the accepted quote per Shot and operation.
2. Persist the provider operation ID before polling begins.
3. On success, persist durable Asset metadata and provider usage evidence.
4. For fixed per-second providers, capture no more than the accepted output
   specification unless a newly accepted quote exists.
5. For token providers, reconcile estimated and actual completion tokens:
   - capture the accepted quote when actual cost is at or below the protected
     quote envelope;
   - never debit above consent automatically;
   - record excess provider cost as platform variance and trigger rate review;
   - a materially lower actual cost may be captured at the lower amount only if
     the commercial policy explicitly enables customer downward reconciliation.
6. Refund the reservation on a provider-declared non-billable failure.
7. A provider-billable failure or ambiguous timeout enters reconciliation and
   Support review; it must not be guessed from the client state.
8. Every terminal operation has one financial terminal outcome.

## 10. Qualification And Promotion Gate

Before changing `pricingStatus` from `research_only` to `priced`, QA must record:

- at least three repeated runs for the same fixed Character, wardrobe, Scene and
  Shot input per candidate model;
- Job ID, provider task ID, rate version, duration, resolution, references,
  latency, returned usage, provider cost and Credits;
- identity, body, wardrobe, scene, camera, motion, anatomy, audio and commercial
  quality scores;
- error, moderation, timeout and retry evidence;
- estimated-versus-actual cost variance.

A cheap model is not promoted when it cannot preserve required identity or
continuity. A high-quality model is not promoted when price cannot be quoted and
reconciled deterministically.

## 11. Acceptance

- Veo estimates scale by generated seconds and selected resolution.
- Seedance estimates use target dimensions, frame rate, output duration, input
  video duration where applicable, minimum-token floor, audio mode, service
  tier and the rate version effective when the quote is accepted.
- Seedance 2.5 quotes cover 480p, 720p and documented 1080p pricing, but 1080p
  cannot be routed until the provider capability discrepancy is resolved by
  API qualification.
- Provider discount expiry cannot alter an accepted quote or its settlement
  evidence.
- A quote accepted one second before a provider discount expires retains its
  immutable rate version; a new quote after expiry uses the approved list rate.
- A Seedance 2.5 input-video quote applies the correct minimum-token floor for
  resolution, aspect ratio and output duration and reconciles against returned
  `usage.completion_tokens`.
- Quote and submitted request have the same pricing fingerprint.
- Preview, draft, final clip and final assembly are separate charges.
- Partial multi-Shot completion settles successful children independently.
- Retry with the same idempotency key cannot charge twice.
- Actual provider usage and rate version remain inspectable by Support.
- No research-only model appears as a selectable paid route.

## 12. Open Commercial Decisions

- Final target margin for video, which may differ from still-image generation.
- Whether Credit rounding occurs per Shot only or whether an approved project
  bundle funds the rounding difference.
- Whether lower actual Seedance token usage produces an automatic Credit refund.
- Storage/egress and final assembly cost once infrastructure is selected.
- Launch promotions and subscriptions; these are not part of provider cost.
