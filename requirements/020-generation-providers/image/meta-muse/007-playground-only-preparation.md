# 007 - Muse Playground-Only Preparation

Status: Playground-only development testing implemented and offline-verified; live qualification creator-owned
Date: 2026-09-05
Primary: Product And Requirement Architect
Reviewers: Backend/Commercial integrity and QA, applied sequentially by the
same agent; no independent review claimed. Backend includes secret/privacy review.
Skills: implement-generation-workflow, review-generative-media-pipeline,
review-commercial-integrity, verify-release-regressions.
Additional UX review uses review-product-ux because shared catalog filtering
changes visible model choices. The financial and shared-UI boundaries require
these additional checks; all reviews are sequential, not independent agents.

## Scope And Evidence

The creator requests Muse text-to-image in Playground only. Cinematic,
Studio, Fashion and other operation paths remain excluded. This supersedes
the initial multi-product exposure scope in 004 for the current rollout.
No change to Seedance, approved media, other provider defaults or prices.
The creator will execute live tests personally; the agent must not send them.

The supplied Create Image and pricing URLs require login from the agent's
browser. The creator supplied the pricing page contents on 2026-09-05:
- Muse Image: USD 0.01 per successfully generated and returned image.
- Failed and safety-filtered, unreturned images are not counted.
- Image token usage and built-in search are not separately billed.
- 150 requests per minute per team, shared across API keys.
Source: https://dev.meta.ai/docs/pricing-rate-limits#image-generation
This is creator-supplied primary documentation, not an independently
authenticated account/billing check.

The creator subsequently supplied the Create Image endpoint page. It confirms
POST https://api.meta.ai/v1/images/generations, Bearer authentication, and the
example payload `model: muse-image-1.0`, `prompt`, `n: 1`, matching the existing
adapter's minimal request. HTTP 200 supports application/json or text/event-stream.
That endpoint excerpt alone did not establish response defaults; the subsequently
supplied Image generation guide below closes the single-image evidence gap.
Source: https://dev.meta.ai/docs/api-reference/images/create-image

The pasted OpenAPI block contains `components.schemas: {}` and links the
actual definitions to a separate schemas page. The supplied full image guide
now documents the fields needed here. Do not infer additional capabilities
from SDK compatibility. Existing mock fixtures are not live evidence; no live
request has been made.

## Step 1 - Surface Boundary

### Activation Addendum - Supplied Image Generation Guide

The creator supplied the full Image generation guide, Models and Image
understanding documentation. The image guide closes the needed single-shot
request/response evidence gap: `data[].b64_json`, top-level `output_format`
(default webp), optional `size` controlling ratio rather than exact pixels,
explicit `response_format: b64_json`, and output encodings webp/png/jpeg.
Source: https://dev.meta.ai/docs/image-generation (creator-provided contents).
Image understanding uses Muse Spark, not this Muse Image adapter.

Implementation substeps, in order:
1. Keep `/images/generations`, one returned image per canonical child Job and
   no SDK migration. Explicitly request Base64 plus the configured output
   format; map catalog aspect ratios to configured WxH values. No token charge,
   native n>1, edit/reference, streaming or conversational state in this scope.
2. Normalize image MIME from top-level format and verify original image bytes
   with a bounded metadata probe, without recompression. Reject empty/invalid
   responses visibly. Preserve normal Queue -> output -> History settlement.
3. Publish the 15-Credit flat record in a new pricing policy version; all prior
   model rates and historical estimates remain unchanged. Keep public paid
   routing false and qualification internal_testing. Enable model testing only
   in development/test (unset NODE_ENV retains this local repo's development
   convention); production and other named environments fail closed.
4. Reuse the shared image catalog and expose resolved testing availability.
   Accept it in Playground while preserving server surface restrictions.
   Fix reference-processing preview to forward the same surface; it must work
   even for text-only drafts. No new provider/queue/Credit endpoint.
5. Hide read-only pixel width/height for aspect-ratio-only models, keep the
   existing ratio buttons, and show a localized internal-test/normal-Credits
   notice. Other model layouts remain unchanged. Comparison was excluded from
   this activation step and is subsequently governed by Requirement 008.
6. Run mocked adapter, catalog, price, lifecycle and scoped UI regressions;
   inspect the shared controls at 390/820/1440px without live provider traffic.
   Handoff the existing one-image test prompt. Do not send a live request.

Stop conditions: missing credentials, invalid response, stale quote or
insufficient Credits retain existing visible errors; no automatic provider
fallback, extra generation or bypass of unsupported reference validation.
Rate documentation (150 RPM/team) is evidence, not a new distributed quota
guarantee; existing bounded Queue concurrency and no adapter retry remain.

- Declare allowed generation surfaces in server model configuration.
- Registry selection denies excluded or missing surfaces for restricted
  models; models without the field retain existing behavior.
- Generation preview/submission and structured Credit estimates pass the
  actual operation surface to the same registry contract before side effects.
- Shared UI filters the catalog using the server declaration. Reuse the
  existing selector and Generate/result/history components; no layout redesign.
- Cinematic single and batch image selectors must exclude Muse.
- This is capability scope, not actor authorization. Actor ownership and
  canonical Cinematic route context validation remain mandatory.

## Step 2 - Price Preparation

- Reuse CreditPricingPolicyService and its existing immutable estimates.
- USD 0.01 * 35 THB/USD * 1.15 safety / (1 - 0.70 margin) * 10
  Credits/THB = 13.4167, rounded up to the existing increment of 5 = 15.
- Store one flat per-image rate, with pricing evidence/date. No token or
  reference surcharge. Unsupported references remain rejected, not dropped.
- Publish the verified record for development testing only; a priced record
  does not itself grant production/public qualification.
- Do not change ledger/capture/refund, existing prices or history snapshots.

## Step 3 - Adapter And User Test Handoff

- Compare supplied API docs to the existing adapter before enabling requests.
- Mock success, empty/safety-filtered output, authentication, rate limit,
  malformed response, secret redaction and unsupported reference paths.
- No automatic provider retry from the adapter; preserve canonical lifecycle.
- Supply a focused offline test runner and prompts. It must never load .env
  or send live requests by default or as an optional mode.
- Creator's live check: one output, no references, no comparison, AI prompt
  refinement off; verify exact quote, progress, preview, History and Credits.
- A failed local persistence after provider success is not proof that Meta
  charged zero; preserve existing recovery/accounting behavior.

## Gates

| Gate | Evidence required |
|---|---|
| Local scope | Playground allowed; missing/Cinematic/Studio/Fashion rejected even with a test-enabled provider |
| Price | Flat 15-Credit published record matches current floor; other model quotes unchanged |
| Controls | Only documented size/ratio/quality fields are shown and sent |
| Dispatch | Documented create request and response mapped; no references silently discarded |
| Lifecycle | Existing quote, reserve, queue, terminal and History tests pass |
| Live | Creator records job/request ID, output, charged Credits and latency |

## Creator Test Prompt

Use one image with no attachments:

```text
A realistic photograph of a matte red ceramic mug on a pale gray kitchen
counter beside a folded white linen towel. Soft daylight enters from a window
on the left. Eye-level close-up, natural shadows, subtle ceramic texture,
realistic proportions, quiet everyday atmosphere. No people, no writing,
no logos, no watermark.
```

Assess red/gray/white colors, one mug, left-side light, natural shadows, valid
preview and durable History. This is general image qualification, not Character
identity, cinematic continuity or reference qualification.

## Implementation Checkpoint

- Added `allowedGenerationSurfaces` to the Muse model and validated it in the
  existing ProviderConfigLoader. Registry selection enforces it before normal
  Generation dispatch; the public catalog projects only the safe allowlist.
- GenerationApplicationService preview/submit and structured Credit estimate
  preparation pass their operation surface to the registry. Existing models
  without a restriction retain their selection behavior.
- Shared GenerationExperience and Cinematic Storyboard batch use the same
  pure catalog filter through Query `select`, without changing the shared
  cached catalog. No new production component or polling loop. Shared controls
  hide exact pixel dimensions only for aspect-ratio-only models and show a
  localized internal-testing notice; other providers retain their controls.
- Published USD 0.01 / 15 Credits per image in policy
  `mock-2026-09-05-v3`. Other numeric model rates and historical estimates
  remain unchanged. Existing credit reservation/capture/refund owners remain.
- Provider is available only in development/test with configured credentials,
  `qualificationStatus: internal_testing`, and paid routing false. Production
  and staging dispatch fail closed. Cinematic/Studio/Fashion remain excluded;
  Playground Comparison is subsequently governed by Requirement 008. This is
  not live quality or account qualification.
- Adapter explicitly requests Base64 and WebP, maps catalog ratios to size,
  reads top-level output_format, and probes original bytes for PNG/JPEG/WebP
  compatibility without recompression. References and invalid outputs fail
  explicitly without a provider fallback or automatic adapter retry.
- New files: this requirement (Generation Providers) and
  `scripts/test-meta-muse.js` (offline maintenance/test orchestration),
  `scripts/test-meta-muse-layout.js` (mocked browser verification), and
  `web/src/components/generation/EngineTargetPanel.test.tsx` (shared controls).
- No moved files, new runtime data paths, provider calls or .env changes.

### Validation

- `node scripts/test-meta-muse.js`: 28 tests passed, including model scope,
  PNG/JPEG/WebP bytes, response errors, price/floor, protected registry,
  estimate parity and Playground reservation -> queue -> mocked dispatch.
  This runner does not load .env or offer a live mode.
- `node --test test/creditGenerationBilling.test.js test/generationGroup.test.js test/cinematicStoryboardGenerationRoutes.test.js test/generationPromptRefinementEntryPoint.test.js`:
  13 protected lifecycle, ownership, billing and Cinematic tests passed.
- `npm.cmd run test --workspace web -- src/components/generation/EngineTargetPanel.test.tsx src/components/generation/engineTargetPanelHelpers.test.ts src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx src/components/generation/PlaygroundGenerationWorkspace.test.tsx`:
  24 tests passed; includes Muse controls, production and reference guards,
  Cinematic exclusion and preserved existing Playground controls.
- `npm.cmd run build --workspace web`: TypeScript and production build passed.
- `git diff --check`: passed (existing line-ending warnings only).
- `node scripts/validate-i18n-catalogs.js`: passed.
- `node scripts/test-meta-muse-layout.js`: actual shared component on Vite
  6501, with all API requests mocked, passed ratio interaction/no overflow at
  390/820/1440px in default/fashion/creative themes. Screenshots inspected at
  mobile default and desktop fashion. This is not a live full-page flow test.
- Full account-backed submit -> actual output -> History remains creator-run.
  Byte preservation is verified against fixtures, not a live Meta result.

### Creator Live Check

No further documentation is needed for this scoped text-to-image test.
Restart the backend to reload provider configuration/pricing, then refresh
`/create/playground`. Select Meta Muse / Muse Image 1.0, one image, no
references, no comparison, and disable AI Prompt Refine. Use the prompt above;
confirm the quote is 15 Credits before Generate. Verify progress, preview,
History, downloaded format and settlement. Record job/provider request ID and
any failure; do not silently broaden capability exposure. The agent must not
request a spending budget or run a paid request on the creator's behalf.
