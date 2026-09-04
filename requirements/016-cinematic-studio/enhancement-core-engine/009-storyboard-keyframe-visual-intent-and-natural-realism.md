# Storyboard Keyframe Visual Intent And Natural Realism

**Status:** Implemented and locally verified; paid-provider visual qualification pending  
**Capability owner:** Cinematic, through `CinematicApplicationService`  
**Primary role:** Product and Requirement Architect  
**Reviewers:** Cinematic Experience Director, UX/UI Product Designer, QA Release Engineer  
**Implementation package:** `implemetation-plan/007-storyboard-keyframe-visual-intent-and-natural-realism.md`

## 1. User Outcome

A Storyboard Shot must produce one understandable, filmable keyframe rather
than a long concatenation of Story, Beat, Scene, continuity and policy prose.
The user must be able to inspect the visual prompt, understand which field to
edit when the image is wrong, choose natural photographic texture without
editing prompt text, and receive the same contract through manual and batch
generation.

## 2. Confirmed Problems

1. The current compiler preserves authority but serializes nearly every
   available field. The result is traceable yet too broad to direct one still.
2. The first Shot of a Scene may be planned as a close insert even when the
   Scene needs an establishing frame that shows subject, location and spatial
   relationship.
3. A still-image action may contain two temporal phases, such as tightening and
   then releasing a hand, which cannot be represented unambiguously in one
   keyframe.
4. Capture realism is duplicated between the Cinematic keyframe capture profile
   and the Generation Cinematic-still recipe.
5. The modal currently exposes the intermediate provider-independent contract,
   while Generation may append reference and execution policy later.
6. The shared prompt preview has a hard-coded dark background, producing an
   unreadable dark panel inside light themes.

## 3. Scope

In scope:

- additive Shot coverage semantics for `establishing`, `action`, `reaction`,
  `insert`, `transition` and `payoff`;
- Story Plan and Scene Direction AI rules for one visible keyframe state;
- an internal structured keyframe visual specification;
- concise provider-independent visual prompt serialization;
- one `Natural camera realism` render option, enabled by default;
- manual and Generate All request parity for that option;
- read-only visual prompt preview and direct editing guidance;
- Storyboard prompt-surface theme, keyboard and responsive compatibility;
- deterministic, UI and preservation regression coverage.

Out of scope:

- provider/model additions or pricing changes;
- Credit, Queue, Job Center, approval or Asset lifecycle changes;
- raw user editing of the final execution prompt;
- changes to Cast, reusable Character Look or Wardrobe ownership;
- redesign of Storyboard cards, Story Plan navigation or unrelated Generation
  surfaces;
- automatic approval of generated media;
- paid provider qualification during automated testing.

## 4. Shot Visual Semantics

### 4.1 Additive coverage role

Add optional `shot.coverageRole` with these canonical values:

```text
establishing | action | reaction | insert | transition | payoff
```

Rules:

- AI-generated Shots always return a coverage role.
- The first Shot of each Scene defaults to `establishing` unless the AI provides
  a concrete dramatic reason for an intentional insert or reaction opening.
- Existing Projects remain valid. A missing role is inferred for presentation
  and compilation without a destructive migration.
- Compatibility inference must respect concrete visual evidence. A legacy first
  Shot with explicit close-up, insert or detail framing is inferred as `insert`
  instead of being mislabeled `establishing`; otherwise the first-Shot fallback
  remains `establishing`.
- Simple mode does not add another required user decision. AI/default authority
  supplies the role. Advanced mode may inspect and change it.
- Reordering Shots must not silently rewrite an explicitly authored role.

### 4.2 One-frame contract

Every Shot used for Storyboard generation must describe:

- one exact visible moment;
- one physically visible action or held action state;
- one dominant visible emotional target;
- an observable facial, gaze, posture, breath or gesture cue;
- subject placement relative to the environment;
- motivated light and the environment elements necessary to understand the
  moment.

An action that contains sequential phases or a second narrative event produces
an actionable finding. For an establishing Shot, the visual moment must show
the subject and enough location context to establish spatial authority. A
close-up or insert opening is valid only when explicitly authored as such.

The original authored action remains in `currentState` for traceability. When a
legacy action contains multiple temporal phases, `visualSpec` and the visible
prompt use the authored exact visible moment as the single held-state fallback;
they must not serialize the unresolved action sequence as one still. The same
rule applies to an observable performance cue: retain and report the authored
value, but serialize only the first simultaneously visible state.

## 5. Structured Visual Specification

`StoryboardKeyframeContractCompiler` remains deterministic and server-owned.
It adds a structured `visualSpec` while retaining existing IDs, versions,
authority, findings, reference plan and provenance.

```text
visualSpec
  moment
    description
    action
    coverageRole
    framePosition
  subject
    characters[]
    approvedLooks[]
  performance
    emotion
    expressionAndPosture
    observableCue
    gaze
  environment
    location
    time
    requiredElements[]
    propState
  composition
    aspectRatio
    framing
    cameraAngle
    lensIntent
    blocking
    screenDirection
  lighting
    sourceAndMotivation
    contrastAndFalloff
  continuity
    requiredVisibleConstraints[]
    previousApprovedSourceFingerprint
```

The JSON shape is the canonical internal representation. Image providers still
receive a normalized string because current Gemini and Muse adapters accept a
string prompt. Provider adapters must not reinterpret Cinematic field meaning.

## 6. Prompt Selection And Budget

The visible provider-independent prompt contains only information that changes
the selected still:

1. exact moment and one action;
2. Character and approved Look authority;
3. current expression, posture, gaze and observable cue;
4. framing, angle, placement and lens intent;
5. motivated lighting and required environment elements;
6. visible continuity constraints and concise prohibitions;
7. saved Additional Shot direction.

Project story, Beat change, Scene entry/exit and motion remain in the structured
contract for traceability but are not copied into the visual prompt unless they
materially constrain the visible frame. Camera movement is video context and
must not be described as an action inside a still.

The compiler must not emit the capture-profile label, the literal text
`Natural camera realism`, `REALISM_BOOSTER`, or the complete booster arrays in
the user-visible prompt.

## 7. Natural Camera Realism

### 7.1 Product behavior

- Add one compact binary option named `Natural camera realism` to the
  Storyboard render controls.
- Default is enabled for both manual generation and Generate All.
- The option is a render setting, not Story or Shot authorship.
- It does not change price, provider eligibility, output dimensions, reference
  authority or output count.
- The selected setting must be included in the normalized estimate/submission
  request and Job evidence so retries are explainable.
- Manual and Generate All must use the same stable profile ID and default.

### 7.2 Hidden execution policy

When enabled, Generation applies the versioned Cinematic-still execution recipe
for natural skin/hair/material behavior, motivated available and practical
light, natural shadow/highlight falloff, restrained sensor noise, optical
softness and unobtrusive lens imperfections. Environment-specific prose such as
office lighting must never be placed in a global profile.

The option label and expanded execution recipe are not displayed inside the
visual prompt preview. The UI may state outside the prompt that the profile is
applied at render time. Disabling the option removes the optional photographic
texture recipe but retains baseline safety, identity, Look, reference and
physical-coherence constraints.

## 8. Preview And Editing Guidance

- The Shot modal displays `Storyboard visual prompt` as a read-only value.
- The description states that the user changes the next image by editing
  `Additional Shot direction` and selecting `Save direction`.
- The description also states that reference safeguards and the selected
  render profile are applied separately and are not printed in the preview.
- Copy and `Go to Prompt` remain available.
- Loading must not present an empty value as a current compiled prompt.
- The preview must not offer a browser-side final prompt override.

## 9. Theme And Responsive Contract

- The Storyboard prompt preview uses semantic `--theme-*`/`--mpf-*` tokens for
  surface, input, border, text, muted text, focus and icon color.
- No hard-coded near-black translucent background may override a light theme.
- Scope the correction to the Storyboard consumer unless changing the shared
  token resolves the same confirmed defect for every consumer.
- Preserve the established Render signature and all result/approval actions.
- At 390px, 820px and 1440px the prompt remains readable with no horizontal
  page overflow, clipped Copy control or inaccessible textarea.

## 10. State And Error Matrix

| State | Required behavior |
|---|---|
| Context loading | Show loading authority; do not claim the prompt is current |
| Context ready | Show deterministic visual prompt and current realism setting |
| Additional direction dirty | Block generation and ask the user to save |
| Save succeeds | Refetch and replace the prompt/fingerprint |
| Save/version conflict fails | Retain user text and current approved source |
| Realism enabled | Apply hidden versioned execution profile |
| Realism disabled | Omit optional texture recipe; preserve safety/authority |
| Unsupported/malformed profile ID | Reject before estimate or submission |
| Generate All | One selected setting applies to every eligible operation |
| Theme changes | Re-resolve semantic colors without remounting workflow state |

## 11. Compatibility And Preservation

- `CinematicApplicationService` remains the public Cinematic entry point.
- Generation remains the owner of prompt execution, estimates, Credits, Queue
  and provider dispatch.
- Existing contract fields remain readable; new fields are additive.
- Existing approved Storyboard sources and attempts are never rewritten.
- Existing Projects without `coverageRole` use deterministic compatibility
  inference.
- Provider/model preference restoration remains unchanged.
- The same keyframe content and render profile must produce manual/batch request
  parity.
- Unrelated shared Generation surfaces retain their existing presentation and
  request defaults.

## 12. Acceptance Criteria

1. An AI-generated ordinary first Scene Shot is establishing and shows subject,
   location and spatial relationship rather than becoming an accidental insert.
2. A keyframe prompt describes one visible action/state and one current emotion.
3. `visualSpec` retains traceable authority without dumping broad narrative into
   the prompt.
4. Natural camera realism is enabled by default, configurable at generation,
   applied through a versioned server policy and absent from prompt-preview text.
5. Manual and Generate All carry the same profile setting and remain
   estimate/submission compatible.
6. The Storyboard prompt preview explains exactly where to make a change.
7. Light, dark and creative themes keep the prompt surface readable.
8. Existing Cast, Look, Credits, Queue, result, approval and recovery behavior
   pass preservation tests.
9. Automated tests use qualified mocks only; live image quality remains a
   recorded human qualification gate.
10. Legacy close-up openings, multi-phase actions and multi-phase performance
    cues compile without a visual contradiction: the inferred coverage role
    matches framing and the prompt contains one held moment while findings
    retain the authoring issue.

## 13. Validation

Required automated evidence:

- configuration and schema validation;
- Story Plan normalization and AI recipe tests;
- compiler tests for establishing, insert, one-action, current emotion,
  environment and prompt budget;
- manual/batch profile parity and invalid-profile rejection;
- Generation prompt compilation with realism enabled and disabled;
- Storyboard modal accessibility and theme-class regression;
- full Cinematic and shared Web regression suites;
- TypeScript, ESLint, i18n validation, production build and `git diff --check`.

Required manual evidence:

- 390px, 820px and 1440px in each enabled theme;
- one fixed Shot rendered at least three times per qualified provider/model;
- human scores for action clarity, emotion, lighting motivation, environment
  completeness, identity/Look continuity and photographic realism;
- Job IDs, model/version, dimensions, references, latency, Credits and observed
  drift recorded without exposing private reference data.
