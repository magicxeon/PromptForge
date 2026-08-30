# 005 Story Plan Scene Cast And Look Authority

**Status:** Implemented; live UX validation pending  
**Owner:** Cinematic  
**Reviewers:** UX/UI, Backend/Generation, QA  
**Depends on:** `003-layout-cinematicstudio-story-plan-design.md`

## 1. Outcome

Make every persisted Scene an explicit continuity contract before Storyboard.
The Scene Director must let the owner select which active Cast Assignments
appear and which approved Character Look each selected Character uses. Shot
skeletons inherit this authority by default and may narrow it, but may not
reference another Character's Look.

The hierarchy remains `Beat -> Scene -> Shot`. Do not introduce a second
`sub-scene` entity; multiple visual passages inside one Scene are Shots.

## 2. Preservation

Change only Story Plan Scene/Shot authority controls. Preserve Setup, Cast,
proposal review, manual authoring, Scene fields, Shot ordering/duration,
approval, Project Cost, Stage navigation, footer, optimistic versioning and all
existing generated IDs. Do not redesign sibling sections.

## 3. Scene Director contract

Add a `Cast and Looks` section using current Project data:

- list active Cast Assignments with portrait, role and readiness;
- select zero or more Characters for the Scene;
- for every selected Character choose one compatible approved/locked Look;
- show `Character wardrobe` when the approved profile look is intentionally
  preserved;
- disable Looks owned by another Character or not ready for use;
- removing a Character removes only its Look IDs from this Scene and its Shots;
- adding a Character to a Scene offers to inherit it into existing Shots;
- new Shots inherit Scene Cast and Look IDs automatically.

Simple mode exposes Cast and primary Look. Advanced mode may expose per-Shot
overrides and continuity notes.

## 4. Validation

Approval is blocked when a required Scene Character has no usable identity or
the selected Look is missing, unauthorized, owned by another Character or not
ready. Empty Cast is valid only for a Scene intentionally marked as having no
people. Existing Story Plan validation and stable IDs remain authoritative.

## 5. Implementation steps

1. Extend the existing `SceneDirectorDialog` controlled props; do not create a
   second Scene editor.
2. Add pure helpers that resolve Cast/Look ownership and inheritance.
3. Persist through the existing `saveCinematicStoryPlan` contract.
4. Add server validation to `normalizeStoryPlan`/approval readiness if current
   validation does not reject cross-owner Look IDs.
5. Add React and domain regression tests for selection, inheritance, removal,
   authorization and unchanged Scene fields.

## 6. Acceptance

- Story Plan visibly identifies the Characters and Look used in every Scene.
- Saved Scene and Shot IDs remain unchanged.
- Storyboard receives the same `castAssignmentIds` and `wardrobeLookIds`.
- A cross-owner Look cannot be approved or dispatched.

## 7. Implementation record (2026-08-30)

- [x] Extended the existing Scene Director; no parallel editor was created.
- [x] Added Scene Cast selection and one owned Look selector per Character.
- [x] Existing and new Shots inherit the Scene Cast/Look authority.
- [x] Removing a Scene Character removes only that Character and owned Look
  IDs from the Scene and its Shots.
- [x] Added server approval validation for active identity readiness, locked
  Looks, Look ownership and Scene-to-Shot authority.
- [x] Added domain regression coverage without changing Setup, Cast, Stage
  navigation, proposal or footer contracts.
- [ ] Validate the Scene Director at mobile, tablet and desktop widths in the
  running app.
