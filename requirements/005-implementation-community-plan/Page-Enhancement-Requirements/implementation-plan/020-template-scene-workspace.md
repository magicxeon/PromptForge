# Template Scene Workspace Execution

Owner: requirement 015. Status: Implemented; focused verification passed.
Live-data smoke testing remains pending.

| Step | Work | Gate | Status |
|---|---|---|---|
| TSW-01 | Schema, image, reference and picker ownership | Requirement gap review | Done |
| TSW-02 | Controlled picker, Profile controller, recents/search | Focused UI/repository tests | Implemented; search/selection tests passed |
| TSW-03 | Template panel, preview, schema fields, handoff | Session/input parity | Implemented; policy and Scene tests passed |
| TSW-04 | Scene branch, draft protection, confirmed exit | Normal/Template regressions | Implemented; normal/Template and exit tests passed |
| TSW-05 | Localization, scoped styles, screenshots and QA | Build and narrow scripts | Passed with isolated fixtures; live smoke pending |

## Gap Review And Execution Constraints

- Pose controls currently render for guided Templates; hide only this branch.
- Reset/randomize/switch clear sessions; remove from Template presentation.
  Pause normal draft writes during Template use and restore on confirmed exit.
- Retain Gallery handoff postId for preview, including legacy snapshots.
- Existing Cinematic picker searches only its page; add server search for new
  controller without migrating Cinematic or changing unfiltered callers.
- Fixed outfit and face-only pack conversion need separate authority design;
  do not silently change rights/wardrobe/roles.
- Keep normal reference upload surface, no duplicate upload or provider pipeline.
- No runtime JSON edits, file moves or changes to Character/Landing/Detail UI.
- Store only bounded actor-scoped recent IDs; server authorizes each selection.

## Final Scoped Verification (2026-09-06)

TSW-05 visual follow-up: Template-only small-screen headers place viewport
actions on a separate wrapping row; reference slots use one full-width column.
This corrects narrow Thai button/slot labels without altering normal Studio CSS.
Rebuild and both locale layout scripts passed again after this correction;
mobile assertions now check header action rows and full-width reference slots.

TSW-05 visual follow-up: Template-only small-screen headers place viewport
actions on a separate wrapping row; reference slots use one full-width column.
This corrects narrow Thai button/slot labels without altering normal Studio CSS.
Rebuild and repeat both locale layout scripts after this scoped correction.

| Gate | Evidence |
|---|---|
| Repository and authorization | 16 passing tests, search before pagination and query/owner cursor isolation |
| Template and picker UI | 13 passing tests, including same-session hash navigation, new Template reference reset, explicit compatible Character handoff and confirmed exit |
| Existing behavior | 19 passing Studio, schema, pose and reference tests; default workspace order preserved |
| Build / catalogs | `npm.cmd run build:web` and `npm.cmd run i18n:validate` passed |
| Scoped lint | No errors; one pre-existing mount-hydration hook warning in SceneBuilderRoute |
| Browser | EN and TH, 390/820/1440, default/fashion/creative: 18 combinations passed |
| Independent QA | All original 8 probes and 2 additional unsupported-handoff probes passed after fixes; no remaining blockers in reviewed state/search/authorization scope |

Browser checks used intercepted fixtures only. Checked configuration-first
Template presentation, unchanged normal workspace ordering via tests, source
preview loading/enlargement, searchable picker beyond page one, confirmed
authorized handoff, Escape and modal bounds, and no horizontal overflow.
The Template preview never entered the observed existing estimate payload;
the confirmed Character reference/context did. No Generate action was invoked.

Screenshots (temporary, not committed):
- EN: `C:/Users/punya/AppData/Local/Temp/template-scene-layout-Wrzk3r`
- TH: `C:/Users/punya/AppData/Local/Temp/template-scene-layout-Caav67`

Primary owner performed UX/browser checks; a separate read-only QA agent
reviewed state, handoff and repository isolation. This was not a full-system
audit or paid provider qualification.

## Focused Commands

Run each group separately; `--part=all` is optional, not the whole-system suite.

```sh
node scripts/test-template-scene.mjs --part=server
node scripts/test-template-scene.mjs --part=ui
node scripts/test-template-scene.mjs --part=compatibility
node scripts/test-template-scene.mjs --part=all
node scripts/verify-template-scene-layout.mjs --locale=en
node scripts/verify-template-scene-layout.mjs --locale=th
```

## Ownership And Remaining Gate

- Shared controlled UI: `web/src/components/profiles/CharacterPickerDialog.tsx`.
- Profiles: `CharacterLibraryPicker`, recent-ID storage and existing repository
  query extension. No new server route or provider dispatch path.
- Scene Builder: `TemplateScenePanel`, eligibility policy and route composition.
- Shared Generation workspace: optional presentation props only; no lifecycle,
  compiler, Credit or Queue behavior change.
- Scoped styles: `web/src/styles/template-scene.css`; EN/TH catalog additions.
- Tests/scripts use existing `test/`, feature test and `scripts/` owners.
- No moved files or server runtime data paths introduced. Browser recent IDs
  use actorScopedStorage feature `character-picker-recents`, schema 1, max 8.
- Restart the usual backend to load repository search changes, then verify an
  actual Template -> Scene -> Character selection with account data. Backend
  was unavailable during final review and was not started automatically to
  avoid resuming unrelated paid work. Paid rendering remains user-controlled.
