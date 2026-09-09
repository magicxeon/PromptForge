# OpenAI Image 2.5 Integration

Updated: 2026-09-09. Status: adapter implemented; production paid rollout gated.
Pricing update: [007](007-openai-image25-measured-pricing.md) supersedes the gate
below for measured 768x1024 auto requests only. The original gate is historical.
Development testing is reopened by [006](006-openai-image-25-testing.md).
Owner: Generation Providers. Primary: Product Requirement Architect.
Sequential review: Backend, Commercial, QA. Four roles are justified by a new
external model contract and financial exposure. Review is not independent.
Skills: openai-docs, review-generative-media-pipeline,
review-commercial-integrity, implement-generation-workflow, verify-release-regressions.

## Evidence

Official sources retrieved 2026-09-09:
- [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
- [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- [Image guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Pricing](https://developers.openai.com/api/docs/pricing)
- [API reference](https://developers.openai.com/api/reference/overview)

Exact IDs: `gpt-image-2.5-sunburst` and `gpt-image-2.5-flare`; dated snapshots
end in `-2026-09-08`. Use the exact IDs, not a ChatGPT alias. Both support text
generation and image editing through the Images API. Model pages describe
non-streaming responses. Existing multipart reference transport remains canonical.
The generic reference lags the model guide; omit optional input_fidelity for
these models until model-specific support is established. Do not assume low
fidelity or change reference ordering. Momelo initially retains its six-image cap.

Both models' USD rates per million tokens: text input 5, cached text 1.25,
image input 8, cached image 2, image output 30. There is no text output rate.
These rates are not a per-image estimate. The guide requires measured usage;
the Image 2 calculator explicitly does not predict Image 2.5 consumption.

## P1: Adapter And Catalog

- Extend OpenAIProvider, not a second adapter/API/queue. Preserve all defaults
  and existing models. Append Sunburst/Flare without claiming cost ordering.
- Advertise explicit supported ratios, each mapped to real custom dimensions:
  1:1 1024x1024; 16:9 1536x864; 9:16 864x1536; 6:8 and 3:4 768x1024;
  4:3 1024x768; 4:5 1024x1280; 3:2 1536x1024; 2:3 1024x1536.
  All satisfy divisible-by-16, edge, area and aspect constraints from the guide.
- Accept low/medium/high/xhigh/max/auto through the existing quality contract;
  default auto is unchanged. No new UI quality selector or auto-to-medium claim.
- Never silently map an unsupported ratio to square for the new models.
- Preserve usage, actual size, quality and output format in the existing result.
  Do not send response_format, partial_images or streaming for these models.

## P2: Pricing And Release

Initial gate below is historical. Requirement 006 supersedes development/test
exposure with a labeled temporary tariff; production retail promotion still
requires measured consumption and approval.

- Add dated token-rate evidence to the server Credit policy, initially unpriced.
  Catalog is visible but unavailable for paid routing; no placeholder one-credit
  price, inferred cost, automatic fallback, key-based bypass or live paid test.
- Promotion requires model-specific measured usage (text and reference requests),
  approved retail pricing/buffer and normal estimate/reserve/settlement tests.
  An explicitly approved temporary retail tariff may reopen this gate separately.
- Existing prices, reservations, finance ledgers and actor authorization unchanged.
- Rollback: disable only these model entries; retain historical model/usage data.

## Ordered Plan And Evidence

- [x] P1a Add catalog entries and versioned unpriced rate evidence.
- [x] P1b Correct size/fidelity handling; mock text/edit transport for both aliases
  and dated snapshots, PNG/WebP output, errors and usage preservation.
- [x] P2 Verify unavailable catalog and Credit estimate gate; existing models unchanged.
- [x] P3 Run focused and aggregate checks; inspect scoped diff.
- [ ] LIVE (pending): account access, actual output/latency/cost and paid promotion.

Runner: `node scripts/test-openai-image25.mjs adapter|catalog|pricing|all`.
Tests must mock fetch, never read API keys or spend funds. New test/runner belong
to Providers; no runtime data paths, deployment restarts or migration required.
Then proceed to CLSFE 022-024 for the Look Sheet format, independently of paid rollout.

Evidence: focused aggregate passed 20 checks (2026-09-09): 3 adapter, 11 catalog
and legacy streaming/registry, 6 pricing. Mock fetch only; no live API key read.
Syntax and scoped diff checks passed. Backend/Commercial/QA reviewed sequentially;
no independent reviewer or paid provider qualification was available. That initial
UI block is now superseded for development/test by 006; production remains gated.
