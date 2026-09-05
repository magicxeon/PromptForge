# Storyboard Render Engine Memory And Deferred Prop Continuity

**Status:** Implemented  
**Capability owner:** Cinematic  
**Primary role:** Product and Requirement Architect  
**Reviewer:** UX/UI Product Designer, QA Release Engineer  
**Owning surfaces:** Storyboard Shot render and Generate All  

## 1. Outcome

Remember the last provider and model whose Storyboard image render request was
accepted for the active actor. Reuse that choice when the actor opens another
Shot or Generate All, while falling back safely when the saved engine is no
longer usable for the current Storyboard request.

This package also records the observed cross-Shot prop appearance drift as a
separate deferred requirement. It does not alter prop compilation, reference
roles or approval behavior in this implementation.

## 2. User Flow

1. The actor opens a Storyboard Shot or Generate All.
2. The UI reads the actor-scoped Storyboard engine preference.
3. The UI checks the saved provider/model against the current server catalog,
   requested aspect ratio and required reference count.
4. A usable saved engine is selected. An unavailable saved engine falls back
   to the nearest usable model, then to another usable catalog engine.
5. Merely changing a provider/model does not update the preference.
6. The preference is updated only after the server accepts at least one render
   operation.
7. The next Storyboard render surface starts with that accepted engine.

## 3. State And Ownership

- Cinematic owns the Storyboard engine preference and its actor-scoped browser
  persistence.
- The preference contains only `provider` and `model`; it is not creative
  Project state and must not increment the Project version.
- Existing actor isolation must remain intact. One actor must never inherit
  another actor's selection.
- The existing Storyboard batch storage key is retained for compatibility with
  already saved preferences, but both single-Shot and batch rendering consume
  the same preference contract.
- Provider capabilities, qualification, paid-routing status and available
  aspect/reference support continue to come from the server provider catalog.
- Generation continues to own estimates, accepted jobs and provider dispatch.
  Credits and idempotency behavior are unchanged.

## 4. Availability And Fallback Rules

Candidate engines are evaluated in this order:

1. saved provider and saved model;
2. saved provider's default and remaining models;
3. catalog default provider and model;
4. remaining catalog providers and models.

A candidate is restorable only when the existing image-model availability
policy accepts its release, pricing, qualification, reference count and aspect
ratio. If the catalog has no usable candidate, retain the existing unavailable
state and explanation rather than fabricating a model or submitting silently.

## 5. Shared Component Contract

`GenerationExperience` may receive an optional initial engine preference. The
shared component resolves that preference through the same helper used by the
engine controls; it does not read Cinematic persistence directly.

`StoryboardShotDialog` and `StoryboardGenerateAllDialog` remain responsible for
reading and writing the Cinematic preference. Both paths persist only after an
accepted server submission.

## 6. Deferred Gap: Prop Visual Authority

Observed failure: a `CLOSED` sign that is white with printed lettering in one
approved Shot can become a wooden sign in a later Shot even though its semantic
identity remains `CLOSED`.

The current contract protects the prop's meaning and text but does not provide
a stable visual specification or a prop-specific continuity reference. A
general solution requires a future package with:

- a stable Story Prop ID shared by Scenes and Shots;
- canonical appearance fields for material, color, shape, dimensions,
  typography, condition and distinguishing marks;
- per-Shot state and placement separated from immutable appearance;
- an approved previous-source reference role capable of carrying prop visual
  continuity instead of style influence alone;
- deterministic conflict findings when Shot direction changes an authorized
  prop appearance;
- backward-compatible inference for Projects that only contain free-text prop
  notes.

This gap is intentionally recorded but not implemented here so provider/model
memory cannot accidentally change Story, prompt, reference or approval output.

The deterministic audit and implementation boundary are continued in
`016-story-prop-visual-authority.md`. That requirement remains pending and does
not change current Storyboard behavior.

## 7. Acceptance Criteria

1. A successful single-Shot render is the default engine in the next Shot.
2. A successful Generate All submission updates the same preference.
3. Selection changes, quoting failures and rejected submissions do not update
   the preference.
4. A removed, disabled, unqualified, incompatible-aspect or insufficient-
   reference model is not restored when a usable alternative exists.
5. Preferences remain isolated by actor.
6. Existing Generation estimates, submission payloads, result previews,
   approval actions, natural-realism controls and batch behavior remain intact.
7. The deferred prop issue is documented without changing runtime behavior.

## 8. Verification

- Unit-test deterministic engine restoration and fallback.
- Unit-test actor-scoped preference isolation.
- Component-test single-Shot restoration and accepted-submission persistence.
- Component-test Generate All restoration, fallback and accepted-only
  persistence.
- Run focused Web tests, TypeScript validation and `git diff --check`.

## 9. Implementation Result

- Single-Shot and Generate All now share one actor-scoped Storyboard engine
  preference.
- The shared Generation engine accepts a caller-owned initial preference and
  resolves it against current catalog capabilities.
- Both render paths persist provider/model only after accepted work; opening a
  dialog, changing a selector or requesting a quote does not persist it.
- The original browser storage key remains readable, so existing batch choices
  continue to work.
- The prop material/color drift remains explicitly deferred to a dedicated
  visual-authority contract and was not mixed into this scoped change.
