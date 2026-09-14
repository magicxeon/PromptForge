# Post-Processing Service Agent Rules

These rules apply under post-processing-service/ and extend the repository
AGENTS.md. This is an independent internal API, not a second Core server or
customer-facing Generation pipeline.

## Ownership Map

| Area | Responsibility | May depend on |
|---|---|---|
| api/ | HTTP transport, token check, bounded requests, stable wire errors | config, domain, adapters |
| domain/ | Operation policy and deterministic media transforms | config, processing libraries |
| adapters/ | Pinned local ML/runtime integrations and failure isolation | config, model artifacts |
| config/ | Validated runtime loader and versioned non-secret JSON policy | standard libraries, dotenv |
| models/ | Ignored local model artifacts and provenance notes | no application state |
| setupModel.mjs | Developer-only checksum-verified artifact preparation | config |

Add workers/, repositories/ or deployment/ only after the owning 021
requirement and Core contract are approved. Do not build a second queue,
provider router, Asset store or Credit ledger here. Core owns actor
authorization and private media sourcing; Assets owns immutable derivatives;
Cinematic owns Storyboard selection/approval; Credits alone owns billing.

## Configuration

- .env is ignored local runtime configuration. Commit only .env.example,
  never tokens, customer paths or private media. Process environment wins.
- config/policy.json is reviewed non-secret operation policy. Validate it at
  startup. Do not read process.env inside an operation or duplicate policy
  constants across API, domain and adapters.
- Model hash, detector behavior or mask appearance changes require a policy
  version bump, focused visual/regression evidence and licensing review.
- Pilot availability is explicit and defaults off. Keep loopback binding
  under the current binary/token bridge. A model file alone does not imply
  production qualification.

## Code Style And Operations

Use ESM .mjs, two-space indentation and named exports. Keep HTTP parsing in
api/, media behavior in domain/ and browser/model I/O in adapters/. Validate
all boundary data before processing and return stable machine-readable error
codes with safe messages. One module should own each policy value; avoid a
new directory or abstraction for a single trivial helper. Keep service logs
free of media and credentials. Treat /health as process liveness, not model
readiness; use authenticated /v1/capabilities for executable operations.

## Adding An Operation

1. Update requirements/021-post-processing-service and its ordered plan.
2. Define bounded, versioned input/output, errors, privacy and cutoff rules.
3. Add one domain operation and replaceable adapter if inference is needed;
   register through the existing API capability contract.
4. Keep sources private, outputs separate and checksums explicit. Never log
   images, Base64, internal tokens or raw private prompts.
5. Add focused tests and prove the Faceless path and Core ownership still work.

## Pilot Limits

The synchronous Faceless endpoint remains local pilot work. Durable Jobs,
signed private delivery, retention, model rights and production auth remain
open in 021. Health 200 is not production readiness. Require security/privacy
review for media/auth changes and Commercial plus QA for any billable change.
