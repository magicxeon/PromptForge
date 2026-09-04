# Provider-Ready Storyboard Prompt Composition

**Status:** Implemented; paid-provider visual qualification pending
**Capability owner:** Cinematic Storyboard prompt compilation
**Primary role:** Product and Requirement Architect
**Reviewers:** Cinematic Experience Director and QA Release Engineer
**Triggered skills:** `design-cinematic-experience`, `review-generative-media-pipeline`, `verify-release-regressions`
**Implementation package:** `implemetation-plan/011-provider-ready-storyboard-prompt-composition.md`

## 1. User Outcome

The final Storyboard render prompt must be complete, concise and ready to
generate without requiring the creator to repair or rewrite it. `Generate Plan`
remains the one-button AI path. Storyboard compilation automatically turns the
approved structured Shot authority into one provider-ready prompt while
preserving identity, Look, continuity and reference boundaries.

## 2. Confirmed Problem

The provider-independent keyframe prompt is currently bounded, but Generation
later prepends reference, Character and outfit instructions and appends still,
capture and age policies. The composed provider prompt therefore bypasses the
keyframe budget. A qualified production request reached 6,955 characters:

- 2,285 characters of reference and Character authority before the Shot;
- 1,698 characters of keyframe direction;
- 695 characters of still policy;
- 1,415 characters of capture policy;
- 862 characters of age policy.

The result is traceable but artistically weak: the visible event arrives late,
repeated realism and identity instructions dilute each other, personality may
compete with the current performance, and outfit references can push an
observational Scene toward a posed fashion image.

## 3. Canonical Flow

```text
Setup and Cast authority
  -> Generate Plan AI creates structured visual fields
  -> AI Director self-review and bounded visual repair
  -> optional field-level Scene Director proposal
  -> deterministic keyframe visualSpec
  -> reference authority resolution
  -> provider-aware final prompt composition
  -> de-duplication, precedence and final budget validation
  -> estimate and submit the identical prompt
  -> persist prompt fingerprint and Job evidence
```

No additional AI call, prompt-polish button or mandatory creator edit is added
at Storyboard render time.

## 4. AI Responsibility

AI may create or repair only structured Story Plan, Scene and Shot fields. The
Story Plan and Scene Direction recipes must:

- express one exact visible moment and one simultaneous action;
- convert abstract emotion into observable face, gaze, posture, hand or weight
  cues appropriate to the framing;
- use observational, non-presentational behavior for narrative Scenes unless
  fashion/editorial presentation is explicitly authored;
- describe motivated light as source, direction and physical effect;
- preserve readable environment context and physically plausible material,
  prop and weather state;
- keep `shot.prompt` to exceptional author direction not already represented by
  structured fields.

AI must not rewrite final reference safeguards, identity policy, pricing,
provider capability, request fingerprint or lifecycle state.

## 5. Final Prompt Authority

The deterministic provider-ready composer uses this order:

1. current keyframe visual authority;
2. concise ordered reference-role authority;
3. current Character age, outfit behavior and anti-posing behavior;
4. physically motivated photographic behavior and subtle imperfections;
5. concise failure-mode constraints.

Current Shot action, emotion, placement and light always outrank Character
personality. Character personality is omitted from provider execution when the
Shot already owns performance. A Character or outfit sheet supplies identity,
proportions or garment details only and must never supply output layout, studio
background, pose or presentation style.

## 6. Generic Natural-Scene Rules

For narrative Storyboard Scenes the composer applies concise rules rather than
large booster arrays:

- subject appears observed in the Scene rather than posing for the camera;
- posture, shoulders, hands and weight distribution retain ordinary asymmetry;
- props are used as part of the action, not deliberately displayed;
- environment remains readable with moderate depth separation;
- available and practical light has a physical source, falloff and believable
  shadow/reflection response;
- skin remains source-consistent and unretouched;
- hair, fabric, contact compression and gravity remain physically plausible;
- sensor noise, fine grain, optical softness, focus falloff, halation and lens
  imperfection remain subtle;
- beauty posing, synthetic glamour, plastic skin, excessive HDR, artificial
  sharpness and copied reference-sheet layout are prohibited.

Specific camera body, aperture, shutter speed or ISO must not be invented for
every Shot. Authored lens intent remains authoritative; otherwise the composer
uses only moderate documentary-style camera behavior.

## 7. Configuration And Budget

Prompt wording, block order, role templates, per-block limits and provider total
limits live in versioned configuration under `server/config/cinematic/`.
Lifecycle and authority validation remain in code.

Provider execution policy has its own fingerprint. Updating provider wording or
budgets must not change the visual keyframe configuration fingerprint or make an
already-approved Storyboard source stale.

The final limit applies after every reference and execution policy is included.
Truncation must occur only at sentence or block boundaries and must never remove
the keyframe moment, Character identity boundary, approved Look boundary or
reference-role meaning. A malformed configuration fails startup/tests rather
than silently producing an unbounded prompt.

## 8. UI Contract

- `Storyboard visual prompt` remains read-only and represents complete current
  visual authorship.
- Reference safeguards and the selected capture profile remain execution
  controls and need not expose their boilerplate in the visual prompt field.
- Additional Shot direction remains optional; the generated Plan must be ready
  without it.
- Generate is available when authority, references, provider and quote are
  ready. No prompt-edit gate is added.
- Manual Shot and Generate All use the same final composer and profile.

## 9. Preservation

- Generation continues to own estimate, Credits, Queue and provider dispatch.
- Reference Processing continues to own reference validation and ordering.
- Existing Character/Profile/Look ownership and approved media remain intact.
- Existing non-Cinematic prompts retain their current compiler.
- Existing Storyboard attempts remain readable and retryable.
- Provider pricing, output count, dimensions and approval behavior do not
  change.

## 10. Acceptance Criteria

1. The complete provider prompt is bounded after all reference, Character,
   capture and age rules are composed.
2. The current keyframe appears before generic execution policy.
3. Each active reference is represented once with its exclusive role.
4. Character personality does not compete with current Shot performance.
5. Narrative Scenes include anti-posing, physical-light and subtle photographic
   behavior without repeating long realism arrays.
6. Multi-view or catalog references cannot request a sheet-like output.
7. Natural camera realism can still be disabled without removing baseline Scene
   and authority safety.
8. Manual and batch submission compile the same prompt for the same input.
9. Estimate and submit fingerprint the same composed prompt.
10. Story Plan and Scene Director recipes produce complete structured visual
    direction without adding another user step.
11. Non-Cinematic Generation output is unchanged.
12. The known cafe fixture produces a shorter prompt with the event first,
    concise reference authority and camera imperfection present.

## 11. Verification

- configuration schema, stable fingerprint and invalid-budget tests;
- final composer block order, role exclusivity, de-duplication and budget tests;
- known cafe regression fixture compared against the 6,955-character baseline;
- realism enabled/disabled and Character age authority tests;
- non-Cinematic prompt preservation test;
- manual/batch request parity and stale fingerprint tests;
- focused Cinematic and Generation tests, TypeScript, i18n, lint, production
  build and `git diff --check`;
- one paid Seedream visual qualification remains a human quality gate and must
  record Job ID, final prompt length, model, references, Credits and visual
  scores.

## 12. Implementation Evidence

- `CinematicStoryboardPromptComposer` now owns final Cinematic Scene prompt
  composition after Reference Processing.
- `storyboard-provider-prompt-policy.v1.json` owns block order, compact role
  wording, realism behavior and the 4,700-character ModelArk limit.
- Story Plan recipe v6 and Scene Direction recipe v5 create observable,
  physically motivated visual fields without duplicating `shot.prompt`.
- Cinematic Storyboard requests cannot invoke a second prompt-refinement model
  after deterministic composition.
- The qualified cafe regression prompt decreased from 6,956 stored characters
  to 3,754 characters while retaining Character, Face and Outfit role
  authority, apparent age, anti-posing behavior and camera imperfection.
- Focused Cinematic, Generation, Character handoff and non-Cinematic parity
  tests pass. Paid Seedream output comparison remains intentionally manual.
