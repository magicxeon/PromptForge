# OpenAI GPT-Image 2.6 — all image generation modes

Date: 2026-11-18. Status: source complete; focused checks and independent review passed. Owner: Generation Providers / Credits.
User authorizes requirements and implementation for both products in every existing
image-generation mode. Case F (new model pricing); primary Backend Platform Architect.
Commercial, Backend, Security and QA review the bounded delta independently before
closure; four review perspectives cover price integrity and private reference transport,
not four parallel implementers. Skills: implement-generation-workflow,
review-generative-media-pipeline, review-commercial-integrity, verify-release-regressions.

## Sources and scope

Official sources checked 2026-11-18:
- [Catalog](https://developers.openai.com/api/docs/models)
- [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst)
- [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare)
- [Image guide](https://developers.openai.com/api/docs/guides/image-generation#gpt-image-26)

Exact IDs: `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`. Both accept text/image
inputs via Images generations/edits. Published USD/1M tokens: text input 5,
cached text 1.25, image input 8, cached image 2, image output 30.
Quality supports low/medium/high/xhigh/max/auto. Custom dimensions follow the
existing shared size constraints. Complexity is separate, defaults high when omitted.

Deliver existing raster-image creation and reference-edit workflows; this request
does not introduce SVG/GIF authoring, markup editors or a new complexity control.
Keep PNG default, existing JPEG/WebP transport and non-streaming completion.
Retain the application's six-reference cap and existing nine exact ratio mappings.

## Required behavior

1. Append enabled, selectable entries in the canonical provider JSON; preserve all
   existing defaults and models. Shared catalog consumers include Playground,
   Comparison, Face Creator, Character Sheet/Look Sheet, Scene Builder, templates
   and Cinematic still/storyboard creation. No per-screen model lists or surface locks.
2. Add both to Fashion's existing explicit-model qualification list as experimental
   final-composition options. Do not claim visual qualification or change automatic
   tier/default selection. Video/audio model catalogs stay separate.
3. Extend OpenAIProvider's shared modern-image handling for exact dimensions,
   quality validation and omission of unverified input_fidelity. Preserve ordered
   resolved references, one output per dispatch and usage/format metadata.
4. Reuse existing provisional pixel/quality/reference pricing with each corresponding
   2.5 baseline, explicitly identified by baselineModelId. This is a local estimate
   assumption, not measured 2.6 usage or a provider cost guarantee. Every 2.6 quote
   must say provisional_usage_estimate, including baseline size/auto requests.
   Freeze source model, baseline version and rates in the quote. Actual response
   usage remains separate; absent usage is unknown. No copying a 2.5 job as a 2.6 job.
5. Preserve FX/markup policy, immutable accepted charge, output-count scaling,
   reference fees, reservation-before-dispatch, idempotency and refund behavior.
   Save/retry must not silently substitute a model. No paid calls or live ledger edits.

## Ordered work and acceptance

- T1: record source evidence and contract, then update catalog/adapter/pricing.
- T2: verify all catalog surfaces and Fashion explicit routing; quote dimensions
  must equal adapter dimensions for both aliases and supported ratios.
- T3: focused isolated mock checks for request body, six ordered references,
  invalid inputs, provider errors, provisional provenance, existing 2.5 behavior,
  reservation/capture/refund invariants; independent sensitive review.

Trace: existing React catalog selectors → apiClient → Generation facade → Credits /
Reference Processing / Queue → OpenAIProvider → existing results and History.
No new API, runtime data store, background loop or UI component. Configuration remains
server-owned. Existing jobs/voice requirements and unrelated changes are preserved.
Rollback: disable only the two new catalog entries, retaining historical quotes/jobs.

## Delivery evidence

Implementation and focused checks complete. Independent scoped Backend, Commercial,
Security and QA review passed by `/root/image26_sensitive_review`, with no material
code findings. Reviewer separately ran the 11 adapter/catalog/pricing checks and
540 in-memory 2.6 quote combinations, including provenance, dimensions, quality,
references, four outputs, invalid reference counts and Fashion eligibility.
`node --test --test-reporter=spec test/openAIImage25.test.js test/openAIImage25Cost.test.js test/creditReservationService.test.js test/creditGenerationBilling.test.js`
passed 20/20 checks. Existing adapter/cost tests now cover 2.6 IDs, all shared image
workflow catalogs, Fashion explicit routing, exact ratio/size parity, six ordered
references, provisional source-model provenance, output count, invalid parameters,
unknown usage, frozen-charge capture, foreign replay and idempotent refund. The
historical four-job assertion now explicitly selects original-model samples rather
than interpreting newly added cross-model estimates as additional measured jobs.
Task-plan structure validation passed. Config JSON is parsed/validated by these checks.
No browser/layout check or build: no frontend source/layout changed; live UI and
provider account entitlement remain unverified. No live generation or service restart.
Account entitlement, live image quality, latency and real 2.6 token consumption
are not established by offline checks.
Architecture map unchanged: existing provider, configuration, pricing and Fashion owners.
New files are this requirement and its JSON plan under the existing Providers owner;
no source files moved or runtime paths introduced. Git diff unavailable because this
workspace has no repository metadata; affected source/config sections inspected directly.
Restart the backend and refresh the application to load the updated catalog/config.
Optional follow-up only: user-run live image comparison and real usage calibration.
