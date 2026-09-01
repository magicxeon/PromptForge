# Gemini Omni Flash Interactions Video Provider

**Status:** Playground internal testing and Interactions adapter implemented;
customer-paid publication remains gated
**Provider:** Google Gemini API
**Canonical model:** `gemini-omni-1.1-flash`
**API family:** Interactions API (`v1beta/interactions`)
**Primary role:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect, Generative Media Pipeline reviewer
**Skill:** `review-generative-media-pipeline`
**Source review date:** 2026-09-01

## 1. Outcome

Momelo shall be able to evaluate Gemini Omni Flash as a video-generation and
video-editing candidate in Playground and Cinematic Studio without treating it
as a Veo model, bypassing the canonical Generation lifecycle, or changing any
existing Image, Veo, Seedance, Credit, Queue, Asset, or UI contract.

Omni 1.1 Flash is generally available and uses the Gemini Interactions API.
General availability does not by itself qualify it for Momelo customer-paid
publication; internal testing still requires the server testing gate and
catalog exposure.

The former `gemini-omni-flash-preview` ID is a server-only compatibility alias
for historical tasks and actor-scoped drafts. New catalog output, quotes and
submissions use `gemini-omni-1.1-flash`.

### 1.1 Implementation checkpoint - 2026-09-01

- A separate `GeminiOmniProvider` uses `v1beta/interactions`; Veo remains on its
  existing `generateVideos` adapter.
- Video adapter resolution now supports model-specific adapters before the
  provider fallback, preserving all existing Gemini Veo routing.
- Text-to-video, image-to-video, stored Interaction polling, inline output
  materialization, URI/File polling and sanitized diagnostics have mocked tests.
- The testing catalog publishes the three Playground source operations so Omni
  appears in the existing model selector. The official Standard effective rate
  of USD 0.10 per second for 720p video is routed through the existing
  output-second Credit calculator. Momelo exposes 3 through 10 seconds as
  timing targets and compiles the selected duration into the prompt because the
  Interactions request has no dedicated duration field.
- Internal testing can quote, reserve, submit and settle Credits through the
  canonical lifecycle. General paid routing remains disabled.
- Cinematic internal-testing exposure uses the same qualified 720p
  image-to-video subset, approved Storyboard source and canonical Credit
  lifecycle. Customer-paid publication remains blocked.
- Existing Veo, Seedance, durable Video task and Credit lifecycle tests remain
  unchanged in behavior.

This is an implementation scaffold, not live qualification. No provider-funded
request was executed in this checkpoint.

## 2. Official Evidence

Canonical source:

- [Generate and edit videos with Gemini Omni Flash](https://ai.google.dev/gemini-api/docs/omni)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)

The reviewed API contract establishes:

- model ID `gemini-omni-1.1-flash`;
- request endpoint `POST /v1beta/interactions`;
- text, image, audio, and video input modalities, subject to task and regional
  restrictions;
- explicit video tasks `text_to_video`, `image_to_video`,
  `reference_to_video`, `edit`, and `extend`;
- output aspect ratios `16:9` and `9:16` through a video response format;
- inline Base64 video output or URI delivery, with URI delivery recommended for
  output larger than 4 MB;
- stateful follow-up editing through `previous_interaction_id` when the prior
  Interaction was stored;
- Files API upload and processing for owned source-video editing;
- generated video provenance through SynthID;
- full English support while other languages are not yet evaluated;
- GA-documented first/last-frame interpolation, 360p/720p/1080p/4K response
  formats and end-of-clip extension;
- no system instruction, temperature, `top_p`, stop sequence, native negative
  prompt field, uploaded audio reference, voice editing, or multi-video
  reasoning support in the reviewed GA contract.

The additive GA capabilities above are evidence only. Momelo keeps them hidden
until each exact operation has provider, reference, Asset, Credit, policy and
visual qualification. The GA model-ID migration exposes only the previously
implemented 720p operation subset.

The official Gemini pricing page publishes Standard input at USD 1.50 per one
million tokens and video output at USD 17.50 per one million tokens. At 5,792
output tokens per second of 720p video, Google states an effective price of
approximately USD 0.10 per second. Momelo uses that effective output rate for
the locked estimate. Input-token cost is not guessed before dispatch; the
existing operating safety buffer covers this small variable during internal
qualification.

Duration, output FPS, retention,
regional availability, request idempotency, provider-side billing on ambiguous
outcomes, and production quota must be verified against current official
model/pricing documentation and live account evidence before promotion.

## 3. Capability Ownership

| Concern | Canonical owner |
|---|---|
| Model/API metadata and adapter translation | Generation Providers |
| Submit, durable Job, recovery and terminal normalization | Generation |
| Input authority and provider-safe reference plan | Reference Processing |
| Generated video, poster and download persistence | Assets |
| Quote, reservation, capture, refund and reconciliation | Credits |
| Single-clip prompt/source UX | Playground |
| Project, Scene, Shot, attempt and continuity intent | Cinematic Studio |
| Draft/publish/scheduled exposure and rate card | Admin configuration |

React and Cinematic code must not call `interactions.create`, the REST endpoint,
or Files API directly.

## 4. Adapter Contract

### 4.1 Separate adapter, shared lifecycle

Implement Omni behind a focused Gemini Interactions adapter under
`server/providers/`. Do not add Omni branches to Veo's `generateVideos`
request/poll translation. Both adapters register through the existing Video
provider adapter registry and return the same Generation-owned normalized task
and result contracts.

The adapter uses the existing Gemini credential contract. It must not introduce
a browser-visible key or log request authorization, raw prompts, private media,
Base64 data, or signed download URIs.

### 4.2 Provider-neutral operation mapping

| Momelo request | Omni task | Input contract |
|---|---|---|
| Prompt-only clip | `text_to_video` | structured prompt text |
| Approved first-frame clip | `image_to_video` | one authorized image plus prompt |
| Character/wardrobe/environment reference clip | `reference_to_video` | qualified ordered images plus prompt |
| Revise an Omni result | `edit` | prior Interaction ID or one authorized source video plus concise edit direction |

The operation is selected from the prepared Generation request, never inferred
inside the adapter from whichever fields happen to be populated. Unsupported
authority combinations fail before Credit reservation and dispatch.

### 4.3 Interaction and output normalization

Persist safe provider metadata needed for recovery and audit:

```text
providerId = gemini
providerApi = interactions
modelId = gemini-omni-1.1-flash
interactionId
previousInteractionId?
task
delivery = inline | uri
providerFileName?
status
requestFingerprint
createdAt / lastPolledAt / completedAt
```

- Inline video data is decoded only in the server adapter/Asset path and is not
  stored in provider-task JSON or returned as durable browser state.
- URI output is downloaded promptly through an authorized server request and
  copied to Momelo-owned durable storage.
- Files API `PROCESSING`, `ACTIVE`, and `FAILED` states normalize into the
  existing durable provider-task lifecycle without creating a second queue.
- The initial create response is captured before any follow-up read because the
  documentation notes that URI delivery may later be represented as inline data
  by `GET /interactions/{id}`.
- Unknown submit/download outcomes enter reconciliation and do not trigger
  automatic duplicate submission.

### 4.4 Stateful edit rules

- Every edit creates a new immutable Generation attempt and output Asset. It
  never mutates or replaces the accepted source Asset.
- `previous_interaction_id` is provider metadata, not the canonical product
  version chain. Playground History and Cinematic Shot attempts remain the
  source of truth.
- Using `store=false` disables follow-up editing by Interaction ID and must be
  reflected in capability data. Momelo must not offer an edit action that the
  selected retention mode cannot execute.
- Editing an uploaded video requires owner authorization, Files API lifecycle
  handling, regional eligibility, a new exact quote, and explicit consent.
- Conversational context is a convenience, not identity or continuity
  authority. Approved Character, wardrobe, Storyboard, and continuity versions
  remain authoritative on every new attempt.

## 5. Provider Constraints And Prompt Policy

1. Publish only verified `9:16` and `16:9` aspect options.
2. Expose only the verified 3-10 second prompt targets and qualified 720p
   operation subset. Do not describe target duration as an exact API control.
   Keep additional resolution, FPS, audio, reference and edit controls gated.
3. Omni may generate audio by default; audio intent belongs in the structured
   prompt until the API exposes and Momelo qualifies a deterministic control.
4. Negative constraints are compiled into ordinary prompt text because no
   dedicated negative-prompt field is supported.
5. For a single Cinematic Shot, compile explicit one-scene, one-continuous-shot,
   no-cut direction. The provider otherwise may create multiple shots.
6. Uploaded audio references, multi-video inputs, first/last-frame
   interpolation, extension, and audio editing are rejected as unsupported.
7. Source videos accepted by schema but not reliably processed are not exposed
   until live qualification proves the exact path.
8. People, minors, recognizable-person, region, ownership, and public reuse
   policies are validated before provider dispatch.
9. Non-English prompts require separate qualification; the adapter may compile
   the canonical provider prompt in English while preserving the user's source
   language in owner-authorized project state.

## 6. Playground Requirement

Playground consumes Omni through the existing Video mode and shared Engine &
Target Output, quote, Generate, result, Recent, detail viewer, Comparison, and
Job Center components.

Initial exposure is limited to:

- Prompt only -> `text_to_video`;
- Start from image -> `image_to_video` after reference qualification;
- Use Character -> `reference_to_video` only after Character identity and
  person-policy qualification;
- no uploaded-video editing in the first Playground exposure;
- no edit button until immutable attempt/history UX and a priced edit operation
  are approved;
- no Video Comparison slot until the exact Omni operation is commercially and
  semantically comparable with the other selected slot.

The provider and model selectors consume server catalog entries. Adding Omni
must not alter Image mode, default provider/model, existing Veo/Seedance
visibility, form layout, result focus, Recent placement, two-slot Video
Comparison, actor draft isolation, or settled historical output display.

## 7. Cinematic Studio Requirement

Omni may be evaluated for `cinematic_motion_preview`, `cinematic_draft_clip`,
and `cinematic_final_clip` only after operation-specific qualification.

- Produce resolves the exact approved immutable Storyboard Asset Version as
  the source image for `image_to_video` when that route is selected.
- A `reference_to_video` attempt uses the prepared Character/Look/environment
  authority order and must block rather than silently remove an authority that
  exceeds a qualified limit.
- Each Scene/Shot stores its own Generation attempt and provider metadata;
  one Interaction chain must not be shared across unrelated Shots.
- Follow-up edits create a new Shot attempt linked to the prior attempt while
  preserving the original accepted clip and Credit evidence.
- Cross-Shot continuity never relies only on `previous_interaction_id`.
  Cinematic recompiles the approved continuity packet and source version for
  each Shot.
- The existing contextual Generate panel, per-Shot provider/model selection,
  quote confirmation, loading surface, approval, retry, Project cost summary,
  navigation, header, footer, and responsive layout remain unchanged unless a
  later UX requirement explicitly changes them.

## 8. Pricing And Promotion Gates

`gemini-omni-1.1-flash` internal testing starts with:

```text
qualificationStatus = internal_testing
testingRoutingEnabled = true
paidRoutingEnabled = false
pricingStatus = research_only
billingMetric = output_second
ratesByResolutionUsd.720p = 0.10
durationControlMode = prompted
```

Promotion requires all of the following:

1. verified duration, output, audio, reference and regional matrix;
2. mocked adapter/request/response/error tests with no provider spend;
3. authorized live tests for every exposed operation;
4. repeated identity, wardrobe, anatomy, motion, continuity, audio,
   commercial-quality, latency and failure evidence;
5. exact quote-to-request parity and one terminal Credit outcome;
6. restart, URI/inline download, reconciliation and disable/rollback evidence;
7. Admin draft publication or scheduled activation; direct configuration edits
   must not change customer behavior immediately.

Do not derive Omni price from Veo, Gemini text token pricing, or observed wallet
movement. If official billing evidence remains unavailable, the model remains
internal and non-billable.

## 9. Stable Errors And Diagnostics

At minimum normalize:

```text
video_model_operation_not_supported
video_provider_interaction_failed
video_provider_file_processing_failed
video_provider_output_missing
video_provider_output_download_failed
video_provider_region_not_supported
video_provider_reconciliation_required
video_model_not_qualified
video_pricing_unavailable
```

Sanitized debug events include task, model, interaction/file IDs, input type
counts, prompt length/fingerprint, delivery mode, status, latency, byte count,
provider error code, and correlation ID. They exclude raw content and secrets.

## 10. Implementation Sequence

1. Add model/API evidence and disabled server capability metadata.
2. Add mocked Interactions adapter for inline and URI results.
3. Normalize Files API and Interaction lifecycle behind Generation tasks.
4. Add capability and reference-policy validation.
5. Add Playground catalog-only internal exposure after deterministic tests.
6. Add Cinematic operation mappings and immutable edit-attempt metadata.
7. Capture official pricing and add the Credits-owned internal rate card.
8. Run authorized live qualification by exact operation.
9. Publish paid routing through a separate Admin action.

Each step must preserve existing Image, Veo, Seedance, Generation Job Center,
Credit, Asset, Playground, and Cinematic regression suites.

## 11. Acceptance Criteria

- `OMNI-01`: Omni is registered as Gemini Interactions video capability, not a
  Veo `generateVideos` model.
- `OMNI-02`: React receives all Omni options from the server catalog.
- `OMNI-03`: unsupported modes and controls are absent and rejected server-side.
- `OMNI-04`: inline and URI outputs become authorized durable Assets without
  persisting Base64 in browser/task state.
- `OMNI-05`: duplicate submit and ambiguous transport outcomes cannot create an
  automatic second paid request.
- `OMNI-06`: an edit creates a new immutable attempt and preserves its source.
- `OMNI-07`: each Cinematic Shot uses its approved Storyboard and continuity
  versions rather than conversational context as authority.
- `OMNI-08`: internal quotes use the official effective 720p output rate and
  customer-paid publication remains disabled until promotion.
- `OMNI-09`: actor, reference, recognizable-person, region, and private-media
  authorization are enforced at quote and dispatch.
- `OMNI-10`: existing Image, Veo, Seedance, Playground, Cinematic, Comparison,
  Job Center, Credits, and historical output behavior remains unchanged.

## 12. Open Evidence Before Paid Promotion

- exact generated duration/resolution/FPS and audio behavior by task;
- maximum image count and reference-role semantics;
- output retention and URI expiry;
- Interaction storage/retention policy and deletion contract;
- rate limits, quota, timeout, idempotency and retry guidance;
- regional availability and recognizable-person policy by deployment region;
- provider billing outcome for safety blocks, failed processing, failed
  downloads, cancellation, and unknown submit outcome.
