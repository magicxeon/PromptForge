# Package 003E - Seedream To Seedance Synthetic Character Keyframes

**Plan ID:** `016-PVP-IP-003E`  
**Status:** Deterministic implementation complete; live provider qualification pending  
**Owning requirement:** `../011-seedream-seedance-synthetic-character-keyframe-flow.md`  
**Execution rule:** Complete and test each step before the next; no paid call in automated validation

## 1. Scope Guard

This package repairs the Character first-frame trust path for Seedance 2.0+
and improves configured photorealism/video prompting. It does not add real-person
consent, cloud storage, batch video generation, final assembly, or paid rollout.

## 2. Implementation Order

### 003E.1 Configuration and schemas

1. Declare Seedream downstream compatibility in the server provider catalog.
2. Declare the Seedance 2.x generated-source trust policy in the video catalog.
3. Add additive server/client schemas for provenance and compatibility.
4. Add a versioned photorealistic capture profile and ModelArk video strategy.

**Exit:** configuration parses; legacy sources/models still parse; no UI/runtime
behavior depends on an undocumented literal.

### 003E.2 Image output provenance

1. Normalize non-secret ModelArk image result metadata.
2. Persist bounded provenance with image History when output bytes are saved.
3. Never persist response Base64, provider URL, API key or raw payload.

**Exit:** provider and Queue tests prove requested/resolved model, timestamp,
request ID, credential scope and original-byte flag.

### 003E.3 Storyboard Asset compatibility

1. Derive compatibility from History provenance plus current provider catalog.
2. Copy provenance and compatibility to immutable Storyboard Asset metadata.
3. Project the snapshot through `approvedStoryboardSource` and Zod schemas.
4. Leave legacy Asset replay unchanged and non-compatible by default.

**Exit:** owner-scoped approval test proves exact hash/provenance/compatibility;
wrong-owner and unsafe-path tests remain passing.

### 003E.4 Authoritative video preflight

1. Normalize the request without granting client-supplied trust.
2. Load and validate Cinematic reference Assets before model trust validation.
3. Hydrate one bounded server-derived reference-authority summary.
4. Validate provider/model, source model, credential scope, exact-byte flag,
   content hash and trust-window expiry before quote and submit.
5. Bind the authority fingerprint into quote/submit fingerprint parity.
6. Continue resolving the exact Asset bytes as Base64 for provider dispatch.

**Exit:** compatible source accepts quote/submit; incompatible/expired/mismatched
source fails before estimate/reservation/dispatch with one stable error.

### 003E.5 Prompt optimization

1. Point keyframe configuration to the new hidden realism profile.
2. Keep capture-profile text out of the visible Storyboard prompt.
3. Render a concise ModelArk motion strategy from the existing video packet.
4. Omit duplicate author direction for ModelArk and append bounded live-action
   temporal realism instructions from configuration.

**Exit:** deterministic compiler tests prove motion/action/continuity retained,
Story dump absent, duplicate author direction absent and prompt within budget.

### 003E.6 Compatibility presentation

1. Add localized Storyboard engine guidance using server catalog capability.
2. Show approved-source compatibility in Produce/preflight failure without
   removing current source, attempts or alternate video providers.
3. Preserve compact/mobile layouts and all existing actions.

**Exit:** React tests cover compatible/incompatible/legacy states in English and
Thai; 390px, 820px and 1440px have no overlap or horizontal page overflow.

### 003E.7 Verification and live handoff

1. Run focused provider, Queue, Storyboard Asset, registry, video application,
   Cinematic application, packet compiler, schema and UI tests.
2. Run protected generation/Cinematic regressions and production build.
3. Review the diff under UX, media-pipeline and QA roles.
4. Record a manual test script for one explicit Seedream 5.0 Lite -> approve ->
   Seedance 2.0 Mini attempt; do not execute a billable call automatically.

**Exit:** deterministic gates pass and remaining provider/account uncertainty is
named before the creator spends the one development Credit.

### 003E.8 Seedream 5.0 Pro POC compatibility recovery

1. Add `dola-seedream-5-0-pro-260628` to the image-side Seedance 2.x downstream
   capability and to each Seedance 2.x generated-source trust allowlist.
2. Keep exact model matching and all existing owner, immutable Asset, hash,
   original-byte, credential-scope and trust-window checks.
3. Refresh Produce's compatibility read projection from current server catalog
   data when an approved source contains provenance; do not rewrite the Asset or
   Project JSON merely because capability configuration changed.
4. Add registry and Produce-context regression tests proving an existing Pro
   source can quote while an unlisted Seedream model remains blocked.
5. Verify the real project with a quote-only request before the creator starts
   the one-Credit provider generation.

**Exit:** the current approved Seedream 5.0 Pro source is shown as ready, the
Seedance quote succeeds, Generate Video is enabled when the account can afford
the quote, and no paid provider call occurs during automated verification.

### 003E.9 Storyboard-to-Produce keyframe reference parity

1. Reconstruct the immediate previous approved Shot reference in the video
   packet compiler with the same Scene order used by Storyboard generation.
2. Compare the approved attempt fingerprint against both the continuity-aware
   and no-prior-reference deterministic candidates to support batch timing
   without accepting changed semantic authority.
3. Select only the matching contract as video start-frame authority; keep a
   blocking stale finding when neither candidate matches.
4. Add a compiler regression for a second Shot generated against the first
   Shot's approved source and re-run quote-only checks for the real project.

**Exit:** valid later Shots no longer report
`cinematic_video_keyframe_contract_stale`; materially changed Shots remain
blocked, and no runtime JSON is patched by hand.

### 003E.10 ModelArk first-frame ratio constraint

1. Classify provider references by their normalized role before constructing
   the ModelArk request body.
2. Omit `ratio` whenever a `first_frame` role is present, including
   first-last-frame generation; let the provider inherit the first image ratio.
3. Preserve explicit `ratio` for text-to-video and non-keyframe reference modes.
4. Keep quote, UI aspect-ratio selection and internal request fingerprints
   unchanged because they still describe the intended output and reference
   validation; only provider translation omits the forbidden field.
5. Verify 4xx submit rejection remains terminal, non-billable and refunded.

**Exit:** a 9:16 approved first frame submits without the provider
`InvalidParameter.TaskTypeConstraint` ratio rejection, while other task types
retain their current payload behavior.

### 003E.11 Immediate terminal task visibility

1. Treat the Cinematic submit mutation as active progress before a durable task
   response is available.
2. Seed the actor-scoped Generation task cache from the `202` response so an
   immediate provider rejection renders without a second network round trip.
3. Keep local provenance preflight and provider moderation recovery messages
   separate; place terminal feedback adjacent to the media preview.
4. Prevent unchanged retries for a non-retryable rejection while allowing a new
   provider/model or approved source to obtain a new quote.
5. Preserve the failed Attempt, task ID, provider code and refunded settlement
   in existing canonical stores. Do not create a client-only Job record.
6. Add React regressions for in-flight submit and an immediate failed/refunded
   task response.

**Exit:** Generate never appears idle while the POST is active, and a provider
rejection cannot disappear between submit, task hydration and Project refresh.

## 3. Stop Conditions

- official/account behavior does not identify the configured Seedream model as
  a trusted source for Seedance 2.x;
- credential scope cannot be compared without exposing a secret;
- quote and submit derive different Asset authority;
- exact persisted bytes cannot be proven;
- a provider call would occur in tests;
- the change would enable production or paid routing;
- unrelated dirty-worktree changes conflict with an owned file.

## 4. Rollback

Disable `CINEMATIC_VIDEO_POC_ENABLE_UNVERIFIED_SEEDANCE`, restore the prior
capture-profile/strategy pointers, and leave additive provenance fields stored.
Older readers ignore the fields; no historical Asset or attempt is deleted.

## 5. Implementation Record

- `003E.1` complete: image/video capability, provenance, capture-profile and
  provider-prompt configuration parse through canonical server catalogs.
- `003E.2` complete: ModelArk image results retain bounded provenance after the
  exact provider bytes are persisted; credential values are never stored.
- `003E.3` complete: approval stores immutable provenance, hash and current
  Seedance compatibility while legacy sources remain readable.
- `003E.4` complete: quote and submit reload owner-scoped Assets, re-hash the
  stored bytes, validate the source trust window and bind the same authority
  fingerprint before reservation and dispatch.
- `003E.5` complete: Storyboard uses hidden photorealistic v2 configuration and
  ModelArk receives a bounded motion-focused prompt without duplicate author
  direction.
- `003E.6` complete: Storyboard identifies compatible and incompatible image
  models; Produce provides Seedream recovery for Character Shots while leaving
  environment-only Shots, alternate video models and existing attempts intact.
- Storyboard replacement follow-up complete: a single-Shot regeneration creates
  a review candidate without a replacement gate, retains the approved source
  until approval, and supersedes the old attempt only when the new source is
  approved.
- `003E.8` complete: Seedream 5.0 Pro is allowlisted for the development
  Seedance 2.x POC under the same exact-byte, owner, credential-scope and
  trust-window gates; Produce refreshes stale compatibility only in its read
  projection.
- `003E.9` complete: video packet compilation reconstructs Storyboard's prior
  approved-frame reference plan and accepts only the deterministic candidate
  matching the approved attempt fingerprint.
- `003E.7` deterministic gates complete: focused server tests, React tests,
  TypeScript and i18n validation pass. The one-Credit live provider attempt is
  intentionally left for explicit creator execution.
- Follow-up verification passed: 48 focused server tests, 8 Produce React tests,
  TypeScript no-emit checking, JSON parsing and quote-only checks against the
  current Project. Four approved Seedream Pro Shots quote at one Credit each;
  no provider generation was submitted during verification.
- `003E.10` complete after task `videotask_f600c360ccc8558cd661`: ModelArk
  rejected the redundant first-frame `ratio` before acceptance and the existing
  Credit workflow refunded its one-Credit reservation. The adapter now omits
  only that forbidden provider field for first-frame and first-last-frame tasks,
  retains it for text-to-video, and passes focused provider and workflow tests.
- `003E.11` complete after task `videotask_ffa793a479b3c222496e`: the provider
  returned a terminal privacy moderation rejection inside a successful `202`
  Cinematic response. Produce now represents the mutation wait, hydrates the
  actor-scoped task cache from the response, shows the distinct provider
  rejection and refund beside the preview, and blocks only an unchanged retry.
  Focused React, TypeScript, i18n, Cinematic and Generation regressions pass.
