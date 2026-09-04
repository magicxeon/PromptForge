# Seedream To Seedance Synthetic Character Keyframe Flow

**Requirement ID:** `016-PVP-011`  
**Status:** Deterministic AIGC Asset transport implemented; deployment setup and live qualification pending  
**Priority:** P0 internal qualification recovery  
**Capability owner:** Generation video compatibility, orchestrated by Cinematic Studio  
**Primary role:** Generative Cinematic Production Director  
**Reviewers:** UX/UI Product Designer, QA Release Engineer  
**Triggered Skills:** `direct-generative-cinematic-production`,
`implement-generation-workflow`, `review-generative-media-pipeline`,
`review-product-ux`, `verify-release-regressions`

## 1. Outcome

Allow an approved Storyboard keyframe containing an AI-authored Character to
reach an internal Seedance 2.0-or-newer image-to-video test without generating,
replacing or editing that keyframe. The exact approved bytes are registered in
the same ModelArk account's private AIGC Asset Library and dispatched as an
`asset://<asset-id>` first frame.

This package does not represent the synthetic Character as a real person, does
not create a consent workflow, and does not bypass provider moderation. It
models the provider-supported generated-output trust path and fails before
Credit reservation when that trust cannot be proved from server-owned data.

## 2. Creator Flow

```text
Storyboard Shot
  -> choose a Seedream model marked compatible with Seedance 2.x
  -> generate through canonical image Generation
  -> preserve sanitized provider provenance with the exact output bytes
  -> explicitly approve that output as the immutable Storyboard source
  -> Produce reads compatibility from the approved Asset
  -> choose Seedance 2.0+
  -> quote preflight validates the Asset and same-account trust window
  -> confirm the development POC quote
  -> upload the exact bytes to a private short-lived provider handoff object
  -> register/reuse an AIGC Asset and wait until it is Active
  -> dispatch one first-frame image-to-video request with asset://<asset-id>
  -> poll, persist, preview and explicitly approve the clip
```

Images from other providers remain valid Storyboard sources. They are not
silently regenerated or rejected by Storyboard, but a Character-containing
Shot cannot use them with Seedance 2.x until a compatible source is approved.

## 3. Server-Owned Provenance

Image Generation must persist a bounded `providerOutputProvenance` record:

- source provider ID;
- requested and resolved model IDs;
- provider request ID when returned;
- provider account/credential scope identifier that contains no secret;
- generation timestamp;
- response format;
- confirmation that Momelo persisted the original provider output bytes.

Storyboard approval copies a sanitized immutable snapshot into Asset metadata
and projects a derived `videoCompatibility` result into the approved source.
The source URL itself is not provenance. Provider-signed URLs are not stored as
durable authority and are never forwarded after expiry.

The server must load the approved Asset again during both quote and submit.
Claims supplied by React are advisory only and cannot grant compatibility.
When `MODEL_ARK_ACCOUNT_SCOPE_ID` is absent, the scope is derived as a bounded
one-way credential fingerprint. A deployment may set the non-secret account
label to retain the same scope through an API-key rotation.

## 4. Seedance 2.x Trust Gate

For a Character-containing first frame, the selected Seedance model is eligible
only when all of the following are true:

1. the source is an owner-scoped immutable `cinematic_storyboard_source` Asset;
2. its source fingerprint matches the approved Shot source and the current
   stored bytes are re-hashed to the immutable Asset content hash;
3. provenance identifies a configured ModelArk Seedream model whose catalog
   capability declares Seedance 2.x compatibility;
4. the image and video adapters use the same non-secret credential scope;
5. original bytes were preserved without edit, recompression or replacement;
6. the generation timestamp is inside the configured provider trust window;
7. all ordinary MIME, dimensions, aspect ratio and size gates pass.

Failure returns `video_provider_synthetic_character_source_required` with the
recovery `regenerate_storyboard_with_compatible_seedream`. The check must run
before estimate/reservation and again before provider dispatch. Expired or
legacy sources are never granted fabricated provenance.

The development POC remains non-production, one Credit, and explicitly
unverified. Passing this deterministic gate does not guarantee provider safety
acceptance and does not qualify paid routing.

For the current POC, the qualified generated-source allowlist contains
`seedream-5-0-lite-260128` and `dola-seedream-5-0-pro-260628`. This is an exact
model allowlist, not a family-name match: another Seedream version remains
ineligible until both the image capability catalog and every consuming Seedance
2.x trust policy declare it. All Asset, owner, hash, original-byte, credential
scope and trust-window checks still apply.

The compatibility stored at Storyboard approval is an audit snapshot. Produce
must refresh only its read-model projection from current server capability
configuration when provenance exists, so a newly qualified model does not leave
an already-approved source incorrectly blocked. This projection must not mutate
the immutable Asset or replace authoritative quote and submit validation.

Produce must also rebuild the keyframe authority with the same immediate prior
approved-Storyboard reference plan used by Storyboard generation. For a source
created before that prior frame was available, the compiler may accept the
no-prior-reference candidate only when its deterministic fingerprint exactly
matches the approved attempt. It must never suppress a genuine Shot, Cast, Look,
environment or prompt-authority change merely to enable generation.

## 5. Reference Delivery

Live evidence disproved direct Base64 delivery for the current Character frame:
ModelArk accepted the request shape but rejected the first frame under
`InputImageSensitiveContentDetected.PrivacyInformation`. For Seedance 2.0 and
2.5 Character first frames, the provider transport is therefore:

1. Preserve the exact approved output bytes in Momelo storage as authority.
2. Re-hash those bytes immediately before any provider registration.
3. Upload those same bytes to a private Google Cloud Storage provider-handoff
   prefix and create a short-lived signed HTTPS read URL. Never persist the
   signed URL.
4. Call the ModelArk Private Asset Library with server-only AK/SK credentials,
   `GroupType: AIGC`, `AssetType: Image`, the configured Project name and the
   default moderation strategy. Do not request a moderation bypass.
5. Poll `GetAsset` until `Active`; treat `Failed` or timeout as a pre-dispatch
   failure.
6. Dispatch the resulting `asset://<asset-id>` in the existing `first_frame`
   content slot. Continue omitting top-level `ratio` for first-frame modes.

Registration is idempotent by owner, approved Asset ID, content hash, provider,
credential scope and ModelArk Project. An active registration is reused. A
processing registration is resumed. Provider Asset IDs, group IDs and status
are persisted in an Assets-owned sidecar record; the immutable Storyboard Asset
itself is not mutated. GCS object keys may be retained for bounded cleanup, but
signed URLs, image bytes and credentials are never persisted in the sidecar or
logged.

The following deployment prerequisites fail before Credit reservation with a
stable actionable error when absent:

- ModelArk Advanced Creation Rights and the first Asset Group authorization
  letter accepted in the console;
- ModelArk API Key for inference plus AK/SK with Asset Library permission in
  the same account and Project;
- a private GCS bucket and server service account able to create objects,
  delete bounded handoff objects and sign read URLs;
- confirmation that the inference API Key and Asset Library AK/SK belong to the
  same account and Project. A stable non-secret `MODEL_ARK_ACCOUNT_SCOPE_ID` is
  required for new production provenance; an existing POC Asset may retain its
  current API-key fingerprint so it is not invalidated or regenerated.

- Do not log Base64 data, object URLs, signed URLs or credentials.
- Do not manufacture a new image, replace the approved keyframe or switch the
  selected video provider as recovery.
- Direct Base64 remains available only for provider/model paths whose catalog
  contract permits it; it is not the Seedance 2.x Character transport.
- For ModelArk first-frame and first-last-frame Seedance requests, omit the
  top-level `ratio` parameter because output aspect ratio is inherited from the
  first-frame image. Continue sending the selected `resolution` and duration.
  Text-to-video and ordinary multimodal-reference requests retain explicit ratio
  behavior where the provider contract permits it.

## 6. Storyboard Compatibility UX

The existing Storyboard generation workspace remains intact. Add concise,
progressive guidance near provider/model selection:

- Seedream models with the capability show a `Seedance 2.x ready` indication;
- other models remain selectable and explain that the resulting Shot cannot be
  animated with Seedance 2.x when a Character is present;
- an approved Shot may generate another review candidate without confirmation
  because generation does not replace or delete its current source; the new
  source becomes authoritative only after the creator approves it, and the
  previous attempt is retained as superseded;
- Produce shows the approved source status and blocks only incompatible
  Seedance choices for Shots that contain a Character, not environment-only
  Shots or other qualified video providers;
- the recovery returns the creator to Storyboard with the affected Shot still
  visible and does not erase its current source or attempt history.

All new strings are localized in Thai and English. Existing Generate, approval,
preview, provider selection, loading and error states remain available.

### 6.1 Immediate submit and moderation feedback

- Produce enters a visible submitting state as soon as the creator confirms
  Generate, before a provider task ID or polling state exists.
- A `202` Cinematic response containing an already-terminal Generation task is
  applied to the actor-scoped task cache immediately. The UI must not wait for
  another poll or Project reload to reveal the result.
- Provenance preflight failure and post-submit provider content moderation are
  distinct states with distinct explanations. A compatible Seedream source
  must not be described as missing provenance when Seedance itself rejected the
  submitted first frame.
- A terminal portrait/privacy rejection remains visible beside the media
  preview with the failed Attempt ID and refunded settlement evidence. The
  approved keyframe and Attempt history remain intact.
- The UI does not offer or perform automatic keyframe replacement or provider
  switching. Generate becomes available for a new explicit attempt after the
  AIGC Asset transport is configured; clicking it creates a fresh idempotency
  key and never silently resubmits the failed task.
- Asset upload/registration/preprocessing is represented by the existing
  submitting state and any failure is returned as a stable actionable error.

## 7. Configurable Realism And Video Prompt

### 7.1 Storyboard image

Upgrade the hidden photorealistic capture profile rather than adding visible
prompt boilerplate. The profile should request:

- live-action photographic rendering and natural human proportions;
- unretouched skin with restrained pores, tonal variation and translucency;
- individual hair strands, subtle flyaways and physically plausible fabric;
- motivated practical light, natural shadow falloff and highlight roll-off;
- subtle sensor/luminance noise, optical softness, focus falloff and mild
  highlight halation;
- explicit rejection of illustration, anime, CGI, doll-like or waxy skin,
  beauty retouching, excessive HDR and artificial hyper-sharpness.

Imperfections must remain subtle. The profile cannot guarantee realism, and it
must not change Character identity, wardrobe, authored emotion or composition.
The visible Storyboard prompt continues to omit the capture-profile text.

### 7.2 Seedance motion

Use a ModelArk-specific configurable prompt strategy that prioritizes, in this
order:

1. exact approved first-frame identity, wardrobe and composition;
2. one bounded physical action and its end state within Shot duration;
3. restrained facial micro-movement, breathing, blink and natural body weight;
4. authored camera movement and physically plausible hair/fabric inertia;
5. stable motivated lighting and environment continuity;
6. subtle live-action optical behavior without face reshaping, beauty filtering
   or mechanically perfect movement.

Omit duplicate still-image author direction from the provider prompt when the
structured video packet already contains the required authority. Prompt text
continues to be compiled on the server from versioned configuration.

## 8. Data Lineage

```text
image request/provider/model
  -> providerOutputProvenance
  -> History image output + exact persisted bytes
  -> Storyboard Asset metadata + content hash
  -> approvedStoryboardSource compatibility snapshot
  -> server-hydrated video reference authority
  -> owner-scoped ModelArk AIGC Asset registration sidecar
  -> asset:// first-frame transport
  -> quote/request fingerprint
  -> Seedance task/clip Asset/video attempt
```

Quote and submit must fingerprint the same derived authority. Changing or
replacing the approved Storyboard source invalidates the quote and any stale
video attempt through the existing Cinematic fingerprint rules.

## 9. Compatibility And Non-Regression

- Existing Storyboard sources without provenance remain readable and usable by
  providers that do not require this trust policy.
- Existing image models and providers remain selectable.
- Existing Seedance 1.x policy remains unchanged.
- No React component calls ModelArk, Queue, Assets or Credits directly.
- No hard-coded image pricing or provider capability is added to React.
- Playground image/video, Cast, Story Plan, History, Job Center, actor ownership
  and Credit settlement retain their current contracts.
- Provider rejection remains terminal/not-billable where confirmed and refunds
  the one-Credit development reservation through the existing Credits owner.

## 10. Acceptance

- A new Seedream-compatible Character keyframe records provenance and approves
  into an Asset with a current Seedance 2.x compatibility snapshot.
- Existing approved Seedream 5.0 Pro keyframes become Produce-ready after the
  catalog qualification change without re-generation or runtime-data mutation.
- A later Shot generated with an approved previous-frame continuity reference
  retains the same keyframe fingerprint when it reaches Produce.
- Regenerating an already-approved Shot preserves the current source during
  generation and replaces it only after explicit approval.
- Quote and submit independently reload that Asset and accept its first frame.
- An OpenAI, edited, expired, legacy or mismatched source fails before estimate
  or reservation with the stable recovery code.
- An environment-only Shot is not blocked by the Character generated-source
  policy.
- The exact approved bytes are uploaded to private GCS, a signed URL is used
  only for registration, and neither that URL nor image bytes enter durable
  registration metadata or logs.
- An active ModelArk AIGC Asset is reused for the same owner/source/hash/account
  tuple; a changed hash or source never reuses it.
- Seedance receives `asset://<asset-id>` as `first_frame`; it does not receive
  the Storyboard Base64 for this Character path.
- ModelArk first-frame payload tests prove `ratio` is absent while text-to-video
  payloads continue to carry the selected ratio.
- Submit displays progress immediately and an immediate terminal task remains
  visible without waiting for a second task fetch. Provider moderation is not
  mislabeled as missing Seedream provenance.
- No recovery action changes the approved keyframe or selected provider.
- The ModelArk video prompt is bounded, motion-focused and does not contain a
  broad Story or duplicate keyframe author-direction dump.
- Natural realism remains hidden configuration and its prohibitions are present
  only in the final image request.
- Focused Generation, Assets, Cinematic, provider, schema and UI regressions
  pass before one explicit live Seedance 2.0 Mini test is attempted.

## 11. Live Qualification Stop Gate

Automated tests must not call the paid provider. After deterministic validation
and external Asset Library/GCS setup, run one creator-confirmed internal attempt
with the existing approved Seedream source, Seedance 2.0 or 2.5, 480p or 720p
and one supported duration.
Record the provider request/task,
registered Asset ID/status, moderation result, latency, copied media/probe and
Credit outcome. If ModelArk still returns privacy/sensitive-content rejection,
keep paid routing disabled and record that the AIGC Asset path is not qualified
for the current account/model pair; do not weaken moderation or retry
automatically.
