# Meta Muse Image Provider - Master Requirement

Status: Playground-only development testing implemented; production and live qualification pending
Last updated: 2026-09-05
Primary role: Backend Platform Architect  
Reviewers: Product Requirement Architect, QA Release Engineer  
Triggered skill: `review-generative-media-pipeline`

## 1. Objective

Current rollout override (2026-09-05):
[007 Playground-only preparation](007-playground-only-preparation.md) owns the
requested first release. Other surfaces remain excluded. Pricing and full
Image generation contents have been supplied by the creator; 15-Credit
development testing is implemented. Creator-run live qualification remains
pending. Earlier multi-product scope
below is deferred, not permission to enable Studio/Fashion/Cinematic.

[008 Playground Comparison mode](008-playground-comparison-mode.md) extends
that development-only exposure to Comparison slots inside Playground. It does
not promote Muse to production or authorize another generation surface.

Add Meta Muse as an image-generation provider through the existing Generation,
Provider Registry, Credits, Reference Processing, and Fashion qualification
contracts. The change must add capability without replacing or weakening any
existing provider, model, estimate, queue, history, comparison, reference, or
Fashion workflow.

Initial provider identity:

- provider ID: `meta-muse`
- adapter ID: `meta-muse`
- initial model ID: `muse-image-1.0`
- create endpoint candidate: `POST https://api.meta.ai/v1/images/generations`
- confirmed input from supplied cURL: `model`, `prompt`, and `n: 1`
- requested destinations: Playground, Studio, and Fashion Studio

### 1.1 Implementation checkpoint - 2026-08-30

- `MetaMuseProvider` sends only `model`, `prompt`, and `n: 1`.
- Provider Registry accepts `META_MUSE_API_KEY` and the supplied
  `META_MUSE_API-KEY` compatibility alias.
- The provider/model may be visible in the shared catalog when configured so
  every image-generation surface can disclose its availability consistently.
  Visibility is not paid-routing approval: unqualified/unpriced operations and
  requests containing unsupported references remain disabled with a reason.
- References, edits, batch output and unverified controls fail before transport.
- Mocked adapter, secret-alias, hidden-catalog and existing-provider regression
  tests pass without a live Meta request or provider spend.

This checkpoint completes only the hidden scaffold. It does not satisfy the
authenticated documentation, live response, pricing, qualification, Fashion,
or customer-release gates below.

## 2. Source Of Truth And Evidence Status

The user-supplied cURL is the only request contract confirmed in this phase.
The linked Meta developer pages could not be read through an unauthenticated
documentation fetch on 2026-08-30. They appear to depend on project/team access.
Implementation must therefore pass the evidence gate in Requirement 001 before
any unverified request or response field is introduced.

Never infer image-edit payloads, aspect ratios, resolutions, reference limits,
response encodings, output URL lifetime, error shape, rate limits, pricing, or
batch limits from another provider.

## 3. Capability Ownership

| Concern | Canonical owner | Required integration |
|---|---|---|
| provider/model metadata | `server/providers/ProviderRegistry.js` and `server/config/providers.json` | add catalog configuration; do not hard-code UI options |
| provider transport | `server/providers/MetaMuseProvider.js` | implement behind `BaseProvider` |
| adapter resolution | `server/providers/providerAdapters.js` | register one adapter key |
| generation lifecycle | Generation application service and queue | reuse estimate, reservation, queue, persistence, terminal settlement |
| references | Reference Processing | reject unsupported references before dispatch |
| pricing and Credits | Credits capability and `server/config/credit-pricing-policy.json` | no client-side pricing and no paid routing while unpriced |
| Playground and Studio UI | shared Generation experience and Engine/Target components | consume public catalog automatically |
| Fashion Studio | Fashion model qualification and Fashion Blueprint service | expose only after `fashion_final_composition` qualification |
| output/history | existing Generation output and History repositories | persist normalized media; do not add Meta-specific history |

## 4. Non-Negotiable Compatibility Rules

1. Existing provider records and ordering remain unchanged except for adding
   Meta Muse at a new stable display order.
2. Existing default provider/model remain unchanged.
3. Meta Muse may be catalog-visible for development validation, but Generate
   remains blocked until API contract, pricing, and qualification gates pass.
4. Playground and Studio must not add bespoke model selectors or request code.
5. Fashion Studio must not consume the general public catalog as proof of
   Fashion qualification.
6. Multi-output generation continues through the existing Generation Group
   workflow. Provider-side `n > 1` must not be used until documented and tested.
7. Reference images are rejected while `imageReferences` is false. The adapter
   must never silently discard a selected reference.
8. Existing estimates remain immutable and must match the submitted provider,
   model, aspect ratio, resolution, reference count, and output count.
9. Historical Meta Muse jobs remain readable if the provider is later disabled.
10. Secrets, raw private prompts, Base64 inputs, and provider responses are not
    written to normal logs.

## 5. Requirement Set And Order

1. [001 API Contract And Evidence Gate](001-meta-muse-api-contract-and-evidence-gate.md)
2. [002 Provider Adapter And Normalization](002-meta-muse-provider-adapter-and-normalization.md)
3. [003 Catalog, Secrets, Pricing And Qualification](003-meta-muse-catalog-secrets-pricing-and-qualification.md)
4. [004 Playground And Studio Exposure](004-meta-muse-playground-and-studio-exposure.md)
5. [005 Fashion Studio Qualification And Routing](005-meta-muse-fashion-studio-qualification-and-routing.md)
6. [006 Release Validation, Observability And Rollback](006-meta-muse-release-validation-observability-and-rollback.md)

Requirements are sequential. A later step may be scaffolded behind disabled
configuration, but it must not be exposed before its preceding gates pass.

## 6. Delivery Checkpoints

### Checkpoint A - Contract captured

- authenticated documentation evidence and sanitized live response captured;
- unknown capabilities remain disabled;
- error and output schemas are documented.

### Checkpoint B - Adapter hidden

- mocked adapter tests pass;
- Provider Registry resolves Meta Muse only when configured;
- no customer UI exposure and no paid dispatch.

### Checkpoint C - General image qualification

- text-to-image succeeds through the canonical queue;
- output is persisted and survives provider URL expiry;
- estimate/reserve/capture/refund behavior passes;
- Playground and Studio internal qualification passes.

### Checkpoint D - Fashion qualification

- Fashion reference operations are supported by verified API capabilities;
- model passes the Fashion rubric;
- model receives an explicit qualification record and pricing status.

### Checkpoint E - Customer release

- pricing is published through the canonical policy;
- security, observability, rollback, and regression gates pass;
- exposure is enabled without changing existing defaults.

## 7. Out Of Scope

- a Meta-specific frontend workflow;
- direct browser calls to Meta;
- video generation;
- automatic provider fallback that could create an unquoted charge;
- claiming image editing or reference support from documentation links alone;
- changing existing model prices, qualification results, or default routing;
- database migration unrelated to provider integration.

## 8. Master Acceptance Criteria

- Meta Muse uses one canonical adapter and the existing Generation entry point.
- Playground and Studio options are catalog-driven.
- Fashion Studio remains gated independently.
- Unsupported controls are hidden and unsupported request fields are rejected.
- Credits cannot be reserved without published pricing and a locked estimate.
- Provider failures settle jobs and Credits through existing terminal contracts.
- Existing provider tests and user workflows remain green.
