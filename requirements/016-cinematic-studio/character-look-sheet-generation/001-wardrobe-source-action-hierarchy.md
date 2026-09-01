# Wardrobe Source Action Hierarchy

**Requirement ID:** `016-CLSG-001`  
**Priority:** P0  
**Status:** Implemented; visual release verification pending  
**Scope:** Cast & Wardrobe presentation and interaction hierarchy only

## 1. Problem

`Primary Look`, reusable Look records, `Upload wardrobe` and `AI wardrobe
suggestion` currently share nearly identical row styling. Existing state and
commands therefore look like one list, and a creator cannot quickly tell what
must happen first or which action creates a new Look.

## 2. Information Hierarchy

The Wardrobe tab must render in this order:

1. `Wardrobe Looks` heading and existing Add Look action.
2. Source -> Prepare Sheet -> Review -> Bind readiness strip.
3. Current authority area:
   - Primary Look summary;
   - reusable Character Look drafts/versions;
   - the next valid action on each record, such as `Prepare Look Sheet` or
     `Use this Look`.
4. A visually separate, unframed action region titled `Start a new Look` with
   the instruction `Choose one source`.
5. Two equal source actions:
   - `Upload wardrobe`: owned Full Look, Separate Pieces or complete Sheet;
   - `AI wardrobe suggestion`: analyze persisted story context and create an
     editable direction draft.

The source actions are commands, not Look records. They must use button
semantics, distinct icons, visible focus and action-oriented descriptions.
They must not be styled as additional `cinematic-look-card` records.

## 3. Interaction Rules

- `Add Look` and `Upload wardrobe` open the same `CharacterLookDialog` in
  `upload` mode using the existing callback.
- `AI wardrobe suggestion` opens the same dialog in `ai` mode using the
  existing callback and persisted Cinematic analysis function.
- No click in this phase creates a Generation Job, changes Credits, auto-saves,
  approves or binds a Look.
- If a source-ready draft exists, its `Prepare Look Sheet` action remains on
  that draft row and is visually stronger than starting another Look.
- Disabled actions include a reason; unsupported actions are not represented
  as inert cards.
- Success, error and loading behavior inside the dialog remains unchanged.

## 4. Responsive And Accessible Layout

- Desktop/tablet: two source buttons share one stable two-column grid.
- Mobile: source buttons stack in workflow order with at least 40px action
  height; no horizontal page scrolling.
- Long Thai/English labels wrap without changing neighboring card dimensions.
- The action region uses a heading or `fieldset`/`legend` so screen-reader users
  hear that the controls are alternative starting methods.
- Meaning must not rely on Cyan, warning or gradient color alone.
- All themes use semantic tokens; no hard-coded dark-only colors.

## 5. Component Reuse And Scope Preservation

- Extend the Wardrobe branch in `CinematicStageContent.tsx` and its scoped CSS.
- Reuse `Button`, Lucide icons and `CharacterLookDialog`.
- Do not move or restyle the Cast heading, Control Level, role-readiness strip,
  Project Cast list, Direction/Continuity tabs, Project Cost or Stage footer.
- Do not change `CharacterLookService`, Generation, Credits, APIs or persisted
  Look records in this phase.

## 6. Implementation Steps

1. Add React assertions that distinguish Look records from source commands and
   protect existing callbacks.
2. Introduce one scoped source-action region below the Look records.
3. Reuse current dialog state/callbacks for both source actions and Add Look.
4. Add i18n keys in every enabled locale.
5. Add responsive styles at mobile, tablet and desktop without changing global
   card or button contracts.
6. Verify keyboard order, focus, loading/error preservation and every protected
   sibling section.

## 7. Acceptance

- A first-time creator can identify the current Look status, the next required
  step and the two ways to start a new Look without opening a dialog.
- Upload and AI controls are visually distinct from Primary/reusable Look rows.
- All three entry controls invoke their existing mode and callback exactly once.
- No business/API behavior changes and adjacent Cast layout remains present.
