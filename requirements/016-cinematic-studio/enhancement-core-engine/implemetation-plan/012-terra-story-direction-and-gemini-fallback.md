# Implementation 012: Terra Story Direction And Gemini Fallback

**Status:** Implemented; paid Storyboard visual qualification pending
**Owning requirement:** `../013-terra-story-direction-and-gemini-fallback.md`

## Step 1: Freeze Policy And Failure Boundaries

**Status:** Complete

- Change only the Cinematic Story Plan/Scene Direction primary default.
- Add explicit Gemini fallback model, key, enablement and reasoning policy.
- Define eligible transient failures and protect invalid request/auth/schema
  failures from automatic provider switching.

## Step 2: Share Structured Schemas

**Status:** Complete

- Move Story Plan and Scene Direction JSON schemas into one provider-neutral
  module.
- Keep OpenAI request behavior and response normalization unchanged.
- Add a Gemini Interactions structured-output adapter with no response storage.

## Step 3: Add Operation-Scoped Routing

**Status:** Complete

- Introduce one router behind `CinematicStoryPlanService`.
- Try Terra first, switch once on an eligible failure and remain on Gemini for
  repair rounds in that operation.
- Record actual execution provider/model and sanitized fallback evidence.

## Step 4: Strengthen Authored Visual Fields

**Status:** Complete

- Version Story Plan and Scene Direction recipes.
- Require framing-visible anatomy, prop placement/use, fixture state, exposure
  relationship and reference-expression isolation.
- Preserve IDs, locks, timing and the existing bounded repair contract.

## Step 5: Strengthen Final Storyboard Prompt

**Status:** Complete

- Version the provider prompt policy independently of keyframe authorship.
- Add explicit expression, gaze, portrait-stance, prop-display and exposure
  guards.
- Simplify camera-imperfection wording and keep it optional.
- Keep the complete composed prompt within provider limits.

## Step 6: Verify

**Status:** Complete for automated gates; paid visual qualification pending

- Policy defaults and opt-out behavior.
- Gemini request shape and structured response parsing.
- Router success, eligible fallback, sticky repair and non-fallback errors.
- Recipe policy and final prompt anti-bias assertions.
- Existing Story Plan, Scene, compiler and Generation regressions.
- JSON parsing, static checks and `git diff --check`.

## Completion Record

```text
owner: Cinematic Story Plan and Storyboard prompt compilation
primary: gpt-5.6-terra with medium reasoning by default
fallback: gemini-3.8-flash with medium reasoning on eligible transient failures only
shared schema: server/providers/cinematicTextSchemas.js
story recipe: cinematic/story-plan.v7.json
scene recipe: cinematic/scene-direction.v6.json
provider prompt policy: cinematic/storyboard-provider-prompt-policy.v2.json
server tests: 160 passed
focused provider/recipe/prompt tests: 30 passed
web schema tests: 6 passed
web typecheck: passed
scoped eslint: passed
remaining gate: one paid first-Shot render scored for emotion, prop behavior,
  exposure, identity/Look continuity and photographic realism
```
