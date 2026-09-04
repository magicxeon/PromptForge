# Terra Story Direction And Gemini Fallback

**Status:** Implemented; paid Storyboard visual qualification pending
**Capability owner:** Cinematic Story Plan and Storyboard prompt compilation
**Primary role:** Cinematic Experience Director
**Reviewers:** Backend Platform Architect and QA Release Engineer
**Triggered skills:** `design-cinematic-experience`, `review-generative-media-pipeline`, `verify-release-regressions`
**Implementation package:** `implemetation-plan/012-terra-story-direction-and-gemini-fallback.md`

## 1. Outcome

`Generate Plan` must produce Scene and Shot authority that is ready for
Storyboard keyframe generation without a creator repairing the final prompt.
The text-planning primary model becomes `gpt-5.6-terra`. When that provider is
temporarily exhausted or unavailable, the same structured operation may fall
back to `gemini-3.8-flash` without changing IDs, timing, locks, reference
authority or the canonical Draft-save workflow.

Both defaults use medium reasoning. This operation favors production-ready
Scene direction over the lowest text-generation latency; deployments may still
override either effort independently through environment configuration.

The final provider prompt must also resist portrait and catalog bias from
Character and Look references. Current Shot performance, prop staging and
motivated light always outrank expression, pose and presentation visible in a
reference image.

## 2. Scope

In scope:

- Story Plan and Scene Direction text-model policy only;
- one server-owned primary/fallback router for those two operations;
- Gemini structured-output adapter using the same canonical response schemas;
- actual provider/model/fallback provenance on proposals and repair rounds;
- versioned Story Plan, Scene Direction and provider-prompt recipes;
- stronger physical performance, prop staging, exposure and reference-bias
  constraints in the final Storyboard image prompt;
- focused policy, provider, router, recipe, compiler and regression tests.

Out of scope:

- changing Story Enhancement, wardrobe suggestion, Prompt Refine or Attribute
  Localization models;
- adding another button or creator step;
- changing image/video provider selection, reference order, approval, Queue,
  Credits, pricing or settlement;
- automatically approving a Story Plan or rendered Storyboard source;
- sending image bytes or private reference media to the text fallback provider.

## 3. Canonical Flow

```text
Generate Plan or Scene Direction
  -> source preflight and locked-field selection
  -> primary structured request to gpt-5.6-terra
  -> on eligible transient failure only: gemini-3.8-flash
  -> normalize the same Story/Scene schema
  -> deterministic visual validation
  -> bounded AI visual repair on the provider selected for this operation
  -> proposal with actual provider provenance
  -> successful proposal auto-saves as an editable, unapproved Draft
  -> keyframe compiler
  -> provider-ready Storyboard prompt guardrails
  -> estimate and render through the unchanged Generation workflow
```

## 4. Fallback Contract

Fallback is allowed only when configured with a valid Gemini API key and the
OpenAI request fails because of rate limiting, quota/capacity exhaustion,
timeout, transport failure or a retryable server response. HTTP 400, 401 and
403, invalid structured output, schema mismatch and local validation failures
must not fall back because they indicate invalid input, credentials or code.

Once fallback succeeds, subsequent visual-repair calls in the same Generate
Plan operation remain on Gemini. This avoids repeating a known exhausted
primary request. A new creator operation tries Terra again.

If both providers fail, return a sanitized stable error. Never log the raw
Story payload. Persist proposal provenance with actual provider, actual model,
whether fallback was used and a non-sensitive fallback reason code.

## 5. AI Visual Direction Contract

For every generated Shot, AI must:

1. choose one visible emotional state, not an emotional transition;
2. translate it into anatomy visible at the selected framing, including the
   relevant mouth, gaze target, head angle, shoulders, hands or weight balance;
3. use one exact frozen moment and one simultaneous physical action;
4. place each story prop by hand, height, angle and narrative use rather than
   presenting it to the camera;
5. define motivated light by source, direction, subject exposure, background
   relationship, practical-light state and falloff;
6. keep reference identity and wardrobe while rejecting reference expression,
   direct gaze, catalog stance, studio layout and sales presentation;
7. keep `shot.prompt` empty unless it contains exceptional author direction.

The AI Director and existing bounded repair loop remain part of `Generate
Plan`; no separate repair control is introduced.

## 6. Deterministic Final-Prompt Contract

Even when upstream text is imperfect, the provider-ready composer must state:

- reference images do not own expression, gaze, pose or performance;
- no friendly micro-smile or direct camera gaze is added unless the Shot asks
  for it;
- the body is not squared into a welcoming portrait stance unless authored;
- a prop is not raised, centered or turned toward camera for readability unless
  that is the authored action;
- no beauty fill, extra practical light or exposure lift overrides the authored
  mood;
- camera imperfection remains restrained photographic behavior, not a visible
  effect stack.

These instructions stay in versioned configuration. They must fit the complete
post-reference provider budget and must not change the visual keyframe source
fingerprint.

## 7. Data Preservation

- The same canonical Story Plan and Scene Direction schemas are used by both
  providers.
- Project, Beat, Scene, Shot, Cast Assignment, Character Look and continuity IDs
  keep their current ownership and normalization.
- Requested/locked Scene fields remain unchanged by fallback.
- Estimate and submit continue to use the same compiled image prompt.
- Existing Projects and attempts remain readable; no data migration is needed.
- Text fallback receives structured story context only, never image Base64,
  signed media URLs or reference files.

## 8. Acceptance Criteria

1. The default Story Plan model is `gpt-5.6-terra`.
2. `gemini-3.8-flash` can return the same strict Story Plan and Scene Direction
   structures.
3. OpenAI 429, timeout, transport and retryable 5xx failures use Gemini when
   configured; invalid request, auth and invalid-output failures do not.
4. Fallback is sticky only inside the current operation.
5. Proposal and repair provenance identify the provider/model actually used.
6. Recipe output requires observable face/body behavior, physical prop staging
   and executable lighting rather than abstract mood alone.
7. Final image prompts explicitly override smiling portrait, direct-gaze,
   catalog-pose and prop-display bias from references.
8. Natural camera realism remains optional and camera imperfections remain
   subtle when enabled.
9. Existing Generation, Credits, reference and approval behavior is unchanged.
10. Focused tests and relevant Cinematic regressions pass before handoff.

## 9. Qualification

Automated tests prove routing, schema parity, precedence and prompt contents.
One new paid Storyboard render is still the final human qualification: verify
the selected Scene emotion, non-presentational prop use, authored exposure,
identity/Look continuity and photographic rather than illustrated appearance.

## 10. Implementation Evidence

- `gpt-5.6-terra` is the default Story Plan and Scene Direction model.
- `gemini-3.8-flash` is an environment-controlled, transient-failure fallback.
- Both providers consume the provider-neutral schemas in
  `server/providers/cinematicTextSchemas.js`.
- Story Plan v7 and Scene Direction v6 preserve generated `gaze` and
  `lensIntent` instead of discarding them during normalization.
- Storyboard provider policy v2 prevents Character and Look references from
  supplying smile, direct gaze, catalog pose, prop-display behavior or beauty
  lighting to the authored Shot.
- Focused text-provider, recipe and prompt suites passed 30 of 30 tests.
- Relevant Cinematic, Storyboard, video and shared Generation suites passed
  160 of 160 tests.
- The Web Cinematic schema suite passed 6 of 6 tests; Web TypeScript and scoped
  ESLint checks passed.
- Repository-wide ESLint remains red on five pre-existing errors outside this
  package. The unrestricted root `node --test` also discovers Vitest setup files
  with the wrong runner; package-specific suites above are the valid evidence.
