# CINE-FIX-009 - Provider-Aware Shot Duration Reconciliation

**Status:** Implemented; provider output-duration evidence remains gated  
**Priority:** P0  
**Owner:** Generation, consumed by Cinematic Studio  
**Primary role:** Product And Requirement Architect  
**Reviewers:** Backend Platform Architect, QA Release Engineer  
**Skills:** `direct-generative-cinematic-production`,
`implement-generation-workflow`, `review-commercial-integrity`,
`verify-release-regressions`

## 1. Problem

Story Plan owns editorial timing in milliseconds, while video providers accept
different render-duration contracts. The Produce UI currently falls back to a
model's first duration when a planned Shot duration is unsupported. For example,
a seven-second Shot can silently become a four-second request. That can cut the
performance, invalidate the Story Plan handoff and quote fewer Credits than the
clip needed to cover the approved action.

Gemini Omni has a different constraint: the Interactions API does not expose a
dedicated duration parameter. Momelo can compile a target duration into the
temporal prompt, but the result is provider-controlled and must not be described
as exact.

## 2. Outcome

Every Cinematic video quote and attempt shall preserve both:

- `plannedDurationSeconds`: the editorial duration inherited from the approved
  Story Plan Shot; and
- `renderDurationSeconds`: the provider-supported duration used for dispatch
  and Credit calculation.

Generation owns the reconciliation rule. Cinematic supplies the approved Shot
timing and displays the authoritative result. Credits always quote and reserve
against `renderDurationSeconds`.

## 3. Duration Contract

The server capability catalog exposes `durationControlMode`:

| Mode | Meaning | Current providers |
|---|---|---|
| `exact` | the adapter sends a provider duration parameter | Veo, Seedance |
| `prompted` | duration is a temporal prompt target, not an exact API control | Gemini Omni |

The reconciliation result is:

```text
plannedDurationSeconds
renderDurationSeconds
trimDurationSeconds
durationControlMode = exact | prompted
strategy = exact | pad_and_trim | prompt_target | split_required
supportedDurations[]
requiresSplit
reasonCode
```

Rules, in order:

1. Resolve the canonical provider/model and operation before estimating.
2. Apply combination constraints. Veo image/reference modes or non-720p output
   may reduce the eligible duration set to eight seconds.
3. Select the smallest eligible duration greater than or equal to the planned
   duration. Never round down or silently truncate an approved Shot.
4. When an exact provider renders longer than planned, Finish receives the
   deterministic trim amount. The generated source remains immutable.
5. For `prompted`, compile the selected target into the temporal prompt and
   describe the estimate as a target. Do not claim frame-exact control.
6. If the planned duration exceeds the maximum eligible duration, block quote
   and dispatch with `video_duration_split_required`. Recovery returns the user
   to Story Plan/Scene Director to split the Shot at an action boundary.
7. A manual duration override may choose an eligible value that still covers
   the planned Shot. Shorter values are not valid for Cinematic dispatch.
8. Playground remains user-duration-driven and is not assigned a Cinematic
   planned duration implicitly.

### 3.1 Portable Story Plan timing guidance

Story Plan remains provider-neutral and must not select or price a video model.
The AI Director nevertheless uses a portable timing matrix so a new Plan is
less likely to require avoidable padding, trimming or a late Shot split:

| Planned Shot shape | Preferred editorial duration | Reason |
|---|---:|---|
| insert, reaction or one simple action | 4 seconds | common exact duration across the initial qualified families |
| action plus readable emotional response | 6 seconds | allows performance to breathe without exceeding Veo's current bound |
| dialogue, transition or complex continuous action | 8 seconds | portable maximum for the initial cross-provider baseline |

- Prefer `4`, `6` or `8` seconds when the performance and Project total allow.
- Never stretch, shorten or split dialogue solely to satisfy the matrix. Story
  meaning, performability and continuity remain authoritative.
- A Project total that cannot be expressed only with preferred values may use
  another editorial duration. Produce then reconciles it against the selected
  provider and exposes any render padding/trim.
- A Shot over eight seconds receives a Film Readiness production warning to
  review its action boundary before Storyboard. It is not rejected at Story
  Plan because a later Seedance route may support it exactly.
- A Shot is blocked only after a concrete provider/model/operation is selected
  and its eligible maximum is known.

## 4. Provider Matrix

The catalog remains the source of truth. Initial verified routing semantics:

| Provider family | Duration mode | Reconciliation |
|---|---|---|
| Google Veo | `exact` | choose 4/6/8; apply the existing 8-second reference/resolution rule |
| ModelArk Seedance | `exact` | choose the smallest catalog duration that covers the Shot |
| Gemini Omni 1.1 Flash | `prompted` | choose a 3-10 second target and compile timing into the prompt |

No UI-local provider matrix or pricing table may be introduced.

## 5. Gemini Omni GA Migration

- Canonical model ID becomes `gemini-omni-1.1-flash`.
- `gemini-omni-flash-preview` remains a server-only alias for historical tasks,
  persisted drafts and polling. It is not published as a second model option.
- Existing actor-scoped Playground drafts migrate the old model key to the GA
  key without resetting unrelated controls.
- Both model IDs resolve to the same Interactions adapter so in-flight or
  historical Preview tasks remain readable.
- Internal routing remains gated. This migration does not qualify new
  resolutions, edit/extend operations, reference counts or paid publication.
- The internal 720p effective rate remains USD 0.10 per output second under a
  new immutable rate version. Existing estimates and completed Preview tasks
  retain their original model/rate evidence.

Official sources reviewed 2026-09-01:

- [Gemini Omni documentation](https://ai.google.dev/gemini-api/docs/omni)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-omni-1.1-flash)

The GA documentation describes 3-10 second output and Interactions video
generation. The pricing page publishes the same Standard input and video-output
rates as Preview: USD 1.50 per million input tokens and USD 17.50 per million
video-output tokens, approximately USD 0.10 per second at 720p.

The GA API also documents 1080p/4K output, first/last-frame interpolation and
video extension. Those capabilities remain production-gated because the
existing Momelo operation, reference, Asset, Credit and visual-quality evidence
does not yet qualify them. This migration must not expose them accidentally.

## 6. UX Requirements

Within the existing Produce command group only:

- show `Planned`, `Generate target` and `Trim after generation` when they differ;
- show that Omni duration is a target rather than an exact API control;
- disable Generate and provide `Split Shot in Story Plan` when the Shot exceeds
  the model maximum;
- preserve provider, model, resolution, audio, source approval, sticky quote,
  navigation, header, footer and responsive behavior;
- do not redesign Story Plan, Storyboard or sibling Produce sections.

The summary must remain readable at approximately 390, 820 and 1440 pixels and
must not create horizontal overflow.

## 7. Implementation Plan

1. Add a pure Generation-owned duration reconciler and unit tests.
2. Add catalog duration-control metadata and migrate Omni to the GA model ID.
3. Add the Preview-to-GA compatibility alias at catalog and adapter boundaries.
4. Reconcile Cinematic quote and submit from the approved Shot duration before
   capability validation and Credit estimation.
5. Return the reconciliation result in typed API schemas and display it in the
   existing Produce command group.
6. Migrate the actor-scoped Playground Preview model preference.
7. Add the portable Story Plan timing matrix to the versioned AI recipe and add
   a non-blocking Film Readiness warning for Shots over the baseline.
8. Run focused Generation, Credit, provider, Cinematic and React tests, followed
   by the available broader regression suites.

## 8. Acceptance Criteria

- `DUR-01`: a seven-second Cinematic Shot routed to an exact 4/6/8-second model
  quotes and submits eight seconds, never four or six.
- `DUR-02`: Credit estimate and reservation use the same render duration.
- `DUR-03`: a Shot longer than the provider maximum is blocked before Credit
  reservation with a stable split-required error.
- `DUR-04`: Omni visibly identifies prompted target timing and never claims an
  exact provider duration parameter.
- `DUR-05`: catalog and new drafts expose only `gemini-omni-1.1-flash`.
- `DUR-06`: old Preview tasks still resolve their adapter and old Playground
  preferences migrate without losing the rest of the draft.
- `DUR-07`: existing Veo special constraints and Seedance duration validation
  continue to pass.
- `DUR-08`: no client-side pricing or provider capability table is added.
- `DUR-09`: unrelated Produce, Story Plan, Storyboard, header and footer UI is
  unchanged.
- `DUR-10`: AI-generated Story Plans prefer 4/6/8-second Shots where editorially
  possible, while manual/non-portable timing remains valid and visible.

## 9. Deferred Evidence

Actual Omni output duration must be measured from the persisted video Asset
before exact trim automation or final settlement variance is promoted. Until
then, `renderDurationSeconds` for Omni is a requested target and provider usage
is identified as provisional qualification evidence.
