# 004 Template Use Session and Replacement Experience

## Business Requirement

A non-technical user must generate from a Template by changing only a short,
visual list of permitted inputs. Prompt knowledge is optional.

## UX Flow

```text
Select Template card
-> inspect full final preview
-> Use Template
-> server creates actor-bound Use Session
-> show required replacements first
-> optional customization collapsed
-> show combined credit estimate
-> Generate
-> show result and attribution
```

Default quick-use surface:

1. Character or Face
2. Outfit
3. Environment
4. Optional adjustments
5. Price and Generate

Do not expose the full Scene Builder form unless the user selects Advanced.

## Readiness And Message Presentation

Template use must never expose raw field IDs as its primary user message.
Shared status presentation supports `info`, `warning`, `error`, and `success`
with a stable bordered panel matching the Momelo visual language.

- Missing required inputs appear as a warning titled `Complete this template`.
- Human labels replace IDs such as `face_reference` and `outfit_front`.
- The warning provides one direct action that scrolls to and focuses the
  reference input area.
- Face and Character references form one identity requirement group: either one
  satisfies the requirement when both are offered by a Template.
- Outfit Front and Outfit Back remain independent when both are required.
- API and generation failures use the error presentation; raw technical details
  remain secondary.
- Settings with `replacementPolicy: locked`, unsupported provider controls, and
  attributes absent from `publicInputSchema` are hidden instead of rendered as
  disabled controls.
- A compact information summary explains that undisplayed settings are fixed by
  the creator.

## Security Contract

- Client sends `useSessionId` and replacement values, not a trusted execution
  snapshot.
- Server loads the pinned Template version.
- Server rejects undeclared or locked replacements.
- Server resolves variables and reference policies.
- Server compiles the final execution context.
- Use Session is actor-bound, version-bound, expiring and single-run/idempotent.

## Template Continuity And Visual Fidelity

- Selecting a Face or Character from History is a reference-only handoff. It
  merges into the active Template Use Session and must never clear the pinned
  Template version, public input schema, pricing context or execution snapshot.
- The actor-scoped Template handoff remains available for the lifetime of the
  Use Session so a route detour to My Images does not silently downgrade the
  next request into ordinary Scene generation.
- Starting a different Template clears references left from the previous
  authoring task. Only references selected for the new Template may satisfy its
  readiness rules.
- The server resolves the published final preview as a canonical
  `template_baseline_reference`. The client cannot provide or replace this
  pointer.
- The baseline instructs supported providers to preserve composition, framing,
  pose, environment, lighting, outfit and visual treatment. Only declared and
  supplied Template inputs may change.
- The source generation ID authorizes the server to resolve the creator-owned
  baseline for this Template execution only. It does not grant general access
  to the creator's private History.
- The baseline counts toward provider reference capacity and the locked credit
  estimate. A missing baseline fails with `template_baseline_unavailable`
  instead of silently generating an unrelated image.

## Shared Components

```text
TemplateHeroPreview
TemplateReplacementForm
TemplateReferenceInput
TemplateUseSummary
TemplatePriceBreakdown
TemplateUseButton
```

Scene Builder may mount these components in quick or advanced mode. Fashion
Studio binds one or many products to the same form contract.

## Testing

- required replacement blocking
- locked override rejection
- hidden prompt execution
- owner and non-owner references
- provider reference capacity
- actor switch isolation
- Face/Character handoff preserves the active Template Use Session
- stale references are cleared when another Template is selected
- canonical baseline precedes replacement references in the provider manifest
- estimate and submission include the same baseline reference count
- mobile and keyboard workflow
