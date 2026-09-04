# Seedance Activation And Qualification

**Requirement ID:** `016-PVP-004`  
**Status:** Requirement complete; Package 003 deterministic implementation complete, live qualification pending  
**Priority:** P0 provider activation gate

## 1. Objective

Enable Seedance for Cinematic Produce through the canonical Generation and
Credits lifecycle without presenting an unqualified model as customer-ready.
The first vertical slice proves that an approved Storyboard image can become a
durable, reviewable 9:16 Shot clip with correct financial and recovery evidence.

## 2. Ownership Boundary

- Cinematic owns Shot intent, approved first-frame authority and approval.
- Generation owns model eligibility, prepared requests, dispatch, polling,
  terminal state and durable Group/Job identity.
- The Seedance adapter owns ModelArk request and response translation only.
- Reference Processing and Assets own authorization and delivery of source
  media.
- Credits owns estimate, reservation, capture, refund and reconciliation.
- React consumes these contracts; it must not call ModelArk or construct a
  provider payload.

## 3. Activation Phases

### Phase A: deterministic contract and sandbox

1. Add the `commercialOperation` and `inputMode` distinction.
2. Model Seedance capabilities by supported input mode, duration, aspect ratio,
   resolution, audio and reference roles.
3. Keep every Seedance row internal/research and paid routing disabled.
4. Prove quote/submit parity and stable preflight errors with provider calls
   mocked.

### Phase B: internal live qualification

1. Qualify Seedance 1.0 Pro Fast for `cinematic_draft_clip` plus
   `image_to_video` only.
2. Use one authorized approved Storyboard image, 9:16, 720p, a catalog-supported
   duration and audio disabled.
3. Persist provider task, polling transitions, usage, copied clip Asset, poster,
   probe evidence and settlement.
4. Expose the model only to the internal qualification actor/feature policy.

### Phase C: controlled expansion

Seedance 1.0 Pro, 1.5 and 2.x may be added one model/mode combination at a time
after the same evidence exists. Paid routing requires a separate Commercial and
QA decision; a successful provider request is not paid-launch approval.

## 4. Required Preflight

Before quote and again before dispatch, the canonical workflow validates:

- provider credentials, account entitlement, endpoint/region and model ID;
- selected product operation and input mode are a qualified combination;
- first-frame Asset ownership, availability, MIME, dimensions and aspect ratio;
- provider-accessible reference delivery and URL expiry budget;
- real-person/face authorization required by the selected provider/model;
- Shot duration, resolution, ratio, audio mode and output count;
- rendered prompt and reference count within provider limits;
- current Storyboard, Character, Look, Scene, Shot and packet fingerprints;
- current Credit quote and reservation policy versions.

A failed preflight must occur before Credit reservation whenever the condition
is knowable locally.

## 5. Initial Provider Request

The first qualified request contains:

- the catalog-owned Seedance model identifier;
- one provider-rendered temporal prompt;
- one approved Storyboard source in the provider's first-frame content shape;
- explicit 9:16 aspect ratio, 720p resolution and supported Shot duration;
- audio disabled and watermark disabled where provider policy permits;
- correlation metadata that does not expose private prompt/reference content.

`return_last_frame` is requested only after last-frame response semantics and
Asset persistence have passed Package 005 qualification. Unsupported fields are
omitted, not sent with guessed defaults.

## 6. Response And Lifecycle Normalization

Map provider states into canonical states without exposing provider spellings:

```text
accepted -> queued -> processing -> completed
                                -> failed
                                -> cancelled
                                -> reconciliation_required
```

Completion requires:

- a fetchable provider output before its URL expires;
- durable copy into an owner-scoped video Asset;
- normalized duration, dimensions, codec and file-size metadata;
- poster derivative or an explicit recoverable poster state;
- provider usage and task identifiers recorded for reconciliation;
- a qualified no-charge settlement record, or successful Credit capture/a
  visible reconciliation state when the operation is later billable.

Provider success with failed Asset copy is recoverable, not a second billable
generation. Poll retries and completion handlers are idempotent.

## 7. Pricing And Credit Integrity

- Estimate uses the server catalog and Credits policy; React has no video rate.
- Internal qualification returns an explicit `no user Credits charged` quote
  while retaining provider-cost and pricing-policy evidence for review. It does
  not reserve or capture the creator's balance.
- The quote binds provider, model, operation, input mode, duration, resolution,
  audio, output count, reference plan and packet fingerprint.
- Submit rejects a quote whose bound inputs differ from the final request.
- When paid routing is later enabled, reservation occurs once per idempotency
  key after accepted consent and capture uses the configured settlement basis
  plus provider usage evidence.
- For a billable operation, eligible terminal failure releases/refunds once;
  artistic rejection does not.
- Unknown usage or settlement enters reconciliation and blocks approval.

## 8. Live Qualification Evidence

Run at least three fresh provider attempts using an internal, rights-cleared
fixture:

1. a static restrained performance with subtle face and hand movement;
2. a simple continuing body action with fixed screen direction;
3. a practical-light/environment change without dialogue.

Record for each attempt:

- model/endpoint/configuration and qualification date;
- source/packet/reference fingerprints;
- requested versus probed duration, ratio and resolution;
- task latency, queue wait, provider duration and Asset-copy duration;
- identity, wardrobe, first-frame, action, camera and environment findings;
- provider usage, quote, reservation, capture/refund and balance evidence;
- retries, timeout behavior and any provider safety response.

No fixture with an unapproved real person may be used.

## 9. Qualification Decision

A model/mode passes internal qualification only when:

- all three attempts complete through the canonical lifecycle;
- first-frame, identity and wardrobe authority are materially retained;
- requested motion and direction are understandable and bounded;
- output probes valid and is playable after durable copy;
- timeout/retry does not create duplicate provider or Credit effects;
- displayed estimate and submitted/captured basis are explainable;
- failure messages provide a safe recovery action.

Visual quality findings may mark a model as draft-only even when lifecycle
qualification passes.

## 10. Observability And Recovery

Diagnostics separate application preparation, queue wait, provider processing,
download/copy, media probe and settlement time. Normal logs contain IDs,
versions, timing and error codes, not raw prompts, signed URLs or images.

Server startup must register the Generation-owned recoverable-task resumer.
Recovery checks ownership and idempotency before polling or copying. Support can
inspect but cannot mutate provider, Credit or Asset records directly.

## 11. Stable Errors

- `cinematic_video_provider_not_qualified`
- `cinematic_video_provider_unavailable`
- `cinematic_video_reference_delivery_failed`
- `cinematic_video_provider_timeout`
- `cinematic_video_provider_output_expired`
- `cinematic_video_asset_copy_failed`
- `cinematic_video_usage_reconciliation_required`

Each response includes a correlation/support reference and retry eligibility,
but never a private provider payload.

## 12. Acceptance

- Seedance appears only when policy, actor and Shot compatibility permit it.
- One qualified Shot produces a durable clip, poster, probe and complete
  financial trail through existing Generation/Credits owners.
- Navigating away or restarting the server does not lose an accepted task.
- No browser or Cinematic route calls ModelArk directly.
- Existing video providers and Playground behavior retain their current
  eligibility and payloads.
- Paid availability remains disabled until the explicit rollout gate passes.
