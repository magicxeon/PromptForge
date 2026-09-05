# 009 - Muse Studio Face Creator Release

Status: Implemented and creator live-verified for reference-free Face Creator
Date: 2026-09-05
Primary: Product And Requirement Architect
Reviewers: Backend Platform Architect, Product UX, Commercial Integrity and QA,
applied sequentially by the same agent; no independent review claimed. The
four-role set is justified because one change promotes paid routing, adds a
server capability boundary, changes shared UI behavior and requires regression
evidence.
Skills: `implement-generation-workflow`, `review-generative-media-pipeline`,
`review-product-ux`, `review-commercial-integrity`,
`verify-release-regressions`.
Depends on: 007 Playground preparation and 008 Playground Comparison

## Outcome

Promote the qualified Muse text-to-image operation out of Internal testing and
make it available through the canonical Generation workflow in:

- Playground normal generation;
- Playground Comparison; and
- Studio Face Creator when creating a new identity without references.

Muse does not support references in the currently implemented adapter. It must
therefore remain absent from Studio Character Sheet, Scene Builder, Cinematic,
Fashion and any Face Creator request that contains a reference.

## Evidence And Commercial Decision

- The creator completed live Playground and Comparison generation checks.
- The documented provider price remains USD 0.01 per successfully returned
  image and the published application price remains 15 Credits per output.
- Pricing is closed evidence for this release and must not be presented as a
  pending Studio qualification item.
- Set `qualificationStatus` to `qualified` and `paidRoutingEnabled` to `true`
  for the implemented text-to-image operation.
- Remove the Muse-specific "Internal testing - normal Credits apply; output
  not yet qualified" presentation. Retain generic internal-test presentation
  for any other future model that still uses that state.
- Estimate, reservation, capture, refund and History behavior do not change.

## Capability And Routing Rules

1. Provider configuration owns both surface and generation-mode exposure.
2. Muse permits `playground/playground` and `studio/headshot` only.
3. A missing or mismatched generation mode fails before reference processing,
   Credit reservation, Queue admission or provider dispatch.
4. The public catalog projects the mode allowlist so React can hide unsupported
   models. Server validation remains authoritative against tampered requests.
5. Face Creator with zero references may select Muse. Adding or restoring a
   reference makes Muse unavailable and resolves another compatible engine.
6. Character Sheet and Scene Builder do not show Muse. Text-only generation is
   not an acceptable substitute because those workflows promise identity,
   wardrobe or scene continuity.
7. No Muse image-edit endpoint, reference transport, fallback provider or
   prompt rewrite is introduced.

## Shared UI And Preference

Provider and Model continue through the shared `GenerationExperience` and
`EngineTargetPanel`; Studio must not add a Muse-specific selector. Removing the
Muse internal-test helper also restores equal Provider/Model control alignment.

The shared image Generation experience reads the actor's last explicitly
selected provider/model preference. It revalidates the stored pair against the
current surface, generation mode, reference count, aspect ratio, release and
catalog state. An incompatible preference falls back visibly to an eligible
engine and is not submitted silently.

Explicit workflow-owned preferences retain precedence. In particular,
Cinematic Storyboard keeps its accepted-render-only preference contract and is
not overwritten by the shared selection preference.

## Acceptance Criteria

1. Muse has no Internal testing disclosure in Playground or Comparison.
2. Muse remains priced at 15 Credits per successful output.
3. Muse appears in Studio Face Creator with no reference and uses the existing
   estimate, Generate, progress, result and History workflow.
4. Muse is absent from Character Sheet, Scene Builder, Cinematic and Fashion.
5. A tampered Studio Character Sheet or Scene request is rejected with
   `provider_mode_unsupported` before any billable or provider side effect.
6. A Face Creator reference cannot be silently discarded; the UI selects an
   eligible reference-capable engine or displays the existing unavailable state.
7. Existing provider behavior, prompt compilation, references, Comparison,
   Credits, Queue and output persistence remain unchanged.

## Verification

- Provider configuration and Registry tests for allowed and rejected
  surface/mode pairs.
- Generation and Comparison tests proving mode propagation before side effects.
- React tests for catalog filtering, actor preference isolation, valid restore
  and incompatible fallback.
- Existing Muse adapter, price, Playground, Comparison, Studio and Cinematic
  regressions.
- TypeScript build, i18n parity, JSON parsing and `git diff --check`.

## Implementation Result

- Provider configuration now publishes Muse as `qualified` with paid routing
  and the unchanged 15-Credit price. The Muse Internal testing disclosure is
  no longer emitted.
- A generic `allowedGenerationModes` provider contract is validated, projected
  in the public catalog and enforced by Provider Registry. Generation preview,
  estimate, reference preview and Comparison pass the mode to this boundary.
- Muse is exposed for `playground/playground` and `studio/headshot` only.
  Character Sheet, Scene Builder, Fashion and Cinematic continue to exclude it.
- The Muse adapter, prompt contract, reference rejection, Queue and Credit
  lifecycle were not changed.
- The shared provider selector now chooses an eligible model from a newly
  selected provider instead of briefly choosing an incompatible default.

### Validation

- `node scripts/test-meta-muse.js`: 30 tests passed.
- Focused server Generation, Comparison, Credit and Cinematic regression: 22
  tests passed.
- Focused shared React, Studio and Cinematic regression: 37 tests passed.
- Web production TypeScript/Vite build passed.
- i18n catalog validation, provider/pricing JSON parse and `git diff --check`
  passed.
- Mocked visual harness passed at 390, 820 and 1440 pixels in default, fashion
  and creative themes. Provider/Model select tops align and no page overflow
  was detected. No paid provider request was sent.

### Live Face Creator verification - 2026-09-05

- Creator-provided evidence Job `job_1788603556676_dywvlsppj` is an owned
  `headshot` result from `meta-muse / muse-image-1.0` with zero references.
- The provider returned request ID
  `92cb1890-46fc-4490-8d3d-4c50ed65ba8c`; History projects the result through
  the actor-owned API.
- The original provider output is preserved as WebP at 1344 x 1792
  (339,616 bytes), with a separate 960 x 1280 thumbnail.
- The locked estimate reserved 15 Credits and the terminal success captured
  the same reservation once. No refund or duplicate capture exists for this
  Job.
- The creator confirmed that the generated Face Creator image rendered
  successfully. This closes the requested Studio route check, not Muse
  reference support, Character Sheet, Scene Builder, Fashion or Cinematic
  qualification.
- Focused re-verification passed 31 Muse/Registry/Credit tests and the actual
  History and provider-catalog read APIs without sending another provider
  request.
