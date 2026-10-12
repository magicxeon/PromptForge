# Gemini Nano Banana 2.1

Status: source implementation, independent contract reviews and scoped responsive
fixture verification passed2026-10-12. Capability: Providers, consumed through Generation
and Credits. Primary: Backend Platform Architect. Reviewers: Backend, Security,
QA and Commercial Financial Integrity in waves; Root applies Generative Media Pipeline checks.
Skills: review-commercial-integrity, review-generative-media-pipeline and
verify-release-regressions. No product screen redesign or settlement change.

## Outcome And Source Evidence

Add `gemini-nano-banana-2.1` as a selectable Gemini image model. Keep all existing
models and the default model unchanged. Use the existing server credential
`GEMINI_API_KEY`, provider registry, reference-processing plan, Generation facade
and Credit workflow. No client dispatch or hard-coded client pricing.

Official sources checked 2026-10-12:

- https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/interactions-overview

The stable model supports 1K/2K/4K, default 1K, and up to 14 provider references.
This delivery retains the current Gemini application limit of six references and
its five established ratios (1:1,16:9,9:16,6:8,4:5). Map 6:8 to provider 3:4.
Broader reference counts and panoramic ratios require separate workflow/UI
qualification. Unsupported 0.5K/512px and unknown ratios/resolutions fail before
submission. Provider default thinking is medium. Do not enable search grounding,
multi-turn state, video/PDF input, Batch API or additional tools in this delivery.

Interactions REST uses the existing endpoint with `x-goog-api-key` in a header,
text plus immutable ordered image inputs, and `response_format` for MIME, ratio
and size. Use `store:false` for stateless private input and no previous interaction
ID; never silently opt into provider interaction storage. The SDK `output_image` is a convenience accessor for the last generated
image; the REST adapter must select the final non-thought `model_output` image
from steps and preserve its MIME. Support an explicit `output_image` fixture
projection too, without assuming it replaces the documented REST steps schema.
HTTP/provider failures and missing final image fail safely; never return a
thought preview as the completed result or silently fall back to another model.

## Price And Customer Consent

Independent preparatory Commercial review recommends extending the existing
fixed Gemini service tariff contract: 50/70/155 Credits per output at 1K/2K/4K,
plus the existing one Credit per effective reference per output. This is a new
explicit server tariff, not a claim that image-output-only cost covers the whole
invoice or follows the measured-image 30% cost-plus branch. Existing tariffs
remain unchanged. The amounts use the existing legacy minimum-floor helper on
the verified image-output rates (35 THB/USD,15% buffer,70% gross-margin assumption,
10 Credits/THB, round up to five); 1K rounds to50 rather than inherited Lite45.

Standard token prices in USD/million: input1.50, text/thinking7.50, image30.
Image output tokens: 1K1120,2K1680,4K3780; exact output-only costs
0.0336/0.0504/0.1134 (the official page rounds4K to0.113).
Record source/date/version and explicitly provisional OUTPUT-ONLY cost evidence.
Input/thinking/search are excluded from this cost projection. Do not reuse the
OpenAI-specific `breakdown.tokenRates` capture parser for Gemini usage.

The fixed customer quote includes resolution, ratio, effective reference count,
output count and Template fees and remains immutable after confirmation. Existing
actor checks, reservation, capture/refund and idempotency own all money changes.
Validate supported parameters in Credits before any quote/reservation; do not
allow generic publishedCredits fallback to price an unsupported resolution.
No live generation, historical rebilling or balance changes during qualification.

## Ordered Task Packets And Acceptance

1. NB21-T01: freeze source/API/capability/pricing scope in this document and its
   adjacent task plan; preparatory Commercial review above. No application writes.
2. NB21-T02: one Backend owner implements the cohesive catalog/adapter/Credits
   addition. Exact scopes: `server/config/providers.json`,
   `server/config/credit-pricing-policy.json`, `server/providers/GeminiProvider.js`,
   `server/domain/credits/CreditPricingPolicyService.js`, a focused internal
   `server/domain/credits/GeminiNanoBananaPricing.js`, owning tests/runner and docs.
   Reuse public contracts; no new runtime data or independent workflow.
3. NB21-T03: independent Commercial and QA review in waves; integrate fixes, run
   focused tests and record actual results. Root owns status/architecture updates.

Success: configured catalog exposes the exact model, existing default/order stay
valid, all three sizes and ordered references reach the native mock request,
final image/MIME return correctly, and matching locked quotes multiply per-output
tariff/reference fees and retain Template fees.

Negative: unsupported resolution/ratio, excess references, invalid counts,
unconfigured/disabled provider, HTTP failure, refusal or missing final image deny
without dispatch/reservation. No tools/search charge or private payload logging.

Recovery: canonical provider failure uses existing idempotent refund/settlement;
confirmed prices remain stable if today's policy changes. Adjacent Gemini Flash,
Pro and existing Credit behavior retain their regression checks.

Validation runner: `node scripts/verify-gemini-nano-banana-21.mjs --group adapter|pricing|catalog`
and explicit `--all`, isolated source fixtures only. No paid dispatch or workers.
New UI capability controls are inherited from the catalog; verify the visible
model and resolution controls in actual React at390/768/1440 using intercepted
APIs when available. Actual paid provider generation and visual quality scoring
remain unverified; this addition makes no quality/default-route promotion claim.
Rollback disables only the new catalog entry and retains historical quotes/jobs.

## Evidence

Implemented through the existing Gemini adapter/registry and Credits facade.
New source files: internal `server/domain/credits/GeminiNanoBananaPricing.js`,
`test/geminiNanoBanana21.test.js` and owning
`scripts/verify-gemini-nano-banana-21.mjs`. No files move or runtime paths change.
The central map records the adapter and pure internal pricing owner; provider
master and local ordering reference include the new model. Existing model tariff
values and default Lite selection remain unchanged; policy version is additive.

Root and author-separated native QA independently ran
`node scripts/verify-gemini-nano-banana-21.mjs --all`:22/22 PASS, exit0, no skips.
Focused adapter6, pricing8 and catalog8 checks pass (overlapping adjacent cases).
Actual owned Credit repository/reservation fixture retains an accepted52-Credit
charge after today's base changes to999; repeat capture returns the same ledger,
foreign capture denies and duplicate refund leaves account448. Unsupported
sizes/ratios/counts, missing final result, thought previews, HTTP failures and
unsafe MIME do not fall back to another image/model or price. Existing Flash/Pro,
registry and Credit checks remain green. No actual provider generation occurred.

Native `/root/login_bypass_release_review`, separate from Root implementation,
applied Backend/Security/Commercial/QA charters sequentially and passed each;
this is one author-separated reviewer across four charters, not four independent
specialists. Native `/root/nano21_commercial_review` additionally independently
reran pricing8/8 and passed final Commercial source review. Both checked the
provisional output-only basis, no OpenAI token-rate capture contamination and
unchanged canonical settlement. Root React EngineTargetPanel/Generation API
checks pass28/28; `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json
--noEmit --incremental false` passed exit0.

Runner uses sanitized environment, offline mocks and an owned temporary root
initialized before private imports, confines JS writes and denies child processes.
Existing trusted native addons are enabled; Node warns these can bypass its
permission model, so this is not hardened native sandbox certification.
Native `/root/login_completion_ux` inspected actual React Playground screenshots
at390/768/1440 in Thai/Neon with intercepted APIs and external network blocked.
PASS: new model selected, all1K/2K/4K selected, Lite initial default and all five
ratios preserved, Compare displayed Lite+2.1 then returned to normal, reference
limit6/prompt/count/history/navigation remained. Controls were readable with no
overlap or horizontal overflow; document scrollWidth equaled viewport width.
No Generate action ran. Unrelated fixture APIs deliberately returned503; this
visual check does not verify live quote/credit paths. Owned browser closed.
EN/other themes and screen-reader behavior remain unverified by this UI check.

Paid live generation, full invoice reconciliation and visual quality qualification
remain unverified. Model disabling is the rollback path; existing quotes and jobs
retain their owning contracts. Owned test data cleanup completed; no live data,
actual `.env`, Git or worker changes.
