# 002 Playground Form And Navigation

Follow-up: [012](012-character-prompt-form-and-enhancement-ux.md) plans the larger
Character Prompt field and optional paid Momelo Enhancement. Not implemented yet.

ID: CLSFE-002. Status: baseline implemented; remaining acceptance checks tracked in PLAN. Owner: Playground with controlled shared form.
Depends on [001](001-definition-identity-and-lineage.md).

## Exact UI Scope

Keep current Image / Video controls in the header. In Image only, add a compact
segmented selector immediately above the authoring inputs, not a third media tab:

```text
Image | Video

General image | Character Look Sheet

Name                         Age
Appearance
Role / situation
Additional details: outfit, personality, optional existing Character
Prompt preview (collapsed, read-only)
```

This sketch describes only the authoring area. It does not relocate the existing
latest result, engine selector, quote, Generate button, job indicator or history.
General image keeps the existing prompt/reference controls. Look Sheet replaces
that prompt input with the form; do not show two editable prompt authorities.

No new sidebar link or required page. Proposed deep link:
`/create/playground?imageMode=look-sheet` (current canonical entry).
Absence/unknown mode selects General image; `media=video` ignores Image submode.
Use existing search-param navigation, retain unrelated supported parameters and
correct Back/Forward behavior. Apply submode independently of Video feature
exposure, so an Image-only deployment still shows the new Image selector.

## Interaction And Preservation

- Label/icon segmented buttons with pressed state and keyboard/focus support.
- New definition requires no Character selection; existing picker is optional.
- Keep legacy selected-owner Create Look Sheet dialog behavior reachable. It
  creates an approved-Look candidate, unlike this new standalone authoring form.
  Do not replace it with an incompatible path or broaden owner-only mutations.
- Shared form receives value/errors/locks/callbacks, not provider or Credit APIs.
- Scope results, draft, quote and Job resume by actor + media + image submode.
  Switching preserves work; no prompt/reference leakage into another mode.
- A running Job remains tracked by the canonical Job Center after switching.
  Late completions cannot overwrite the currently selected mode's form/result.
- Recalculate quote when normalized input/identity/model changes. Block submit
  on incomplete inputs, invalid reference, stale quote or unavailable model.
- Preserve errors and retry, collection/share controls and provider master gates.
- One-image baseline fixes output count at one and disables Comparison execution
  only inside the new preset; ordinary Image Comparison remains unchanged.
  This restriction is conditional on D-01, not a general Comparison removal.
- Use existing result inspection; Download chooses the branded export from 005.
  Do not automatically switch to Video or replace its current selections.

## Responsive And Localization Contract

Use the [design system](../../../Knowledge/ui-design-system-and-visual-language.md).
At 1440px, name/age may share a row; at 820/390px stack as needed. Both modes
remain readable without horizontal scrolling. Form errors, Thai names and long
labels must not resize fixed controls or overlap Generate/credits.

Keep preview collapsible and secondary; no marketing section or redundant
instruction panels. Localize labels, defaults-as-display, errors and tooltips
through existing locale catalogs; AI prompt recipe text is not a translation.
Actor switching clears current authorization and other actor's draft/query data.

## Tasks

- [ ] UI-01 Add URL normalization and accessible Image submode selector.
- [x] UI-02 Add shared form and read-only identity/age states from 001.
- [x] UI-03 Compose form into GenerationExperience's existing extension points.
  Prefer current showPromptEditor/readOnlyPromptSupplement/studioBuilder hooks;
  add a narrow controlled slot only if their placement cannot preserve layout.
- [x] UI-04 Implement separate versioned drafts and scoped Job/result restoration.
- [ ] UI-05 Wire quote/validation/terminal/download states without a new poller.
- [ ] UI-06 Add EN/TH, keyboard and 390/820/1440px fixtures.

## Acceptance

UI-A1: direct link/reload/Back/Forward select the correct form without data loss.
UI-A2: General image, Image Comparison and Video controls remain unchanged.
UI-A3: invalid form cannot generate; model/reference changes invalidate quote.
UI-A4: draft/late response isolation works across modes and actors.
UI-A5: all controls remain accessible and non-overlapping at three viewports.
Groups: `navigation`, `drafts`, `ui-playground`, `layout-playground` in [009](009-verification-and-release.md).
