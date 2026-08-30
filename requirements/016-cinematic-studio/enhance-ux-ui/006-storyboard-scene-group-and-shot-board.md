# 006 Storyboard Scene Group And Shot Board

**Status:** Implemented; responsive live validation pending  
**Owner:** Cinematic + UX/UI  
**Depends on:** 005 and an approved Story Plan

## 1. Outcome

Replace the current three-column Storyboard prototype with one scan-friendly
board. Scenes appear in Story Plan order. Each Scene is a full-width group and
its Shots flow left to right, wrapping to the next row when space is exhausted.
On narrow screens cards become one or two columns without horizontal page
overflow.

## 2. Information hierarchy

Each Scene group shows title, Beat, purpose/story change, location/time,
duration, Cast and Look summary. Each Shot card shows:

- approved image with `contain`, or the shared Momelo waiting-image state;
- `Scene N / Shot N` label, title, purpose/action, framing and duration;
- Cast portraits, Look names and continuity status;
- `waiting`, `generating`, `review`, `approved`, `failed` or `stale` status;
- exact attempt Credit when available;
- accessible earlier/later controls and drag affordance.

## 3. Interaction

- Selecting a Shot opens one `Storyboard Shot` dialog rather than expanding a
  long editor beneath the board.
- The dialog contains Story Plan context, image/result, prompt, references,
  Engine & Target Output, exact estimate, generation state, attempt history and
  explicit Approve action.
- Reordering within a Scene uses the existing Shot-order endpoint.
- Cross-Scene movement is not part of MVP; route the user to Story Plan because
  Beat, duration and continuity authority would change.
- Focus returns to the originating card when the dialog closes.

## 4. Preservation

Reuse `StoryboardSequenceBoard`, shared `Dialog`, `GenerationStageState`, media
viewer, Engine presentation and existing Cinematic Stage shell where their
contracts fit. Remove the prototype Scene sidebar/focused editor/sticky fake
engine only after parity tests cover prompt save, reset, reorder, source
approval, Stage navigation, Project Cost and footer.

## 5. Implementation steps

1. Generalize `StoryboardSequenceBoard` to render media and metadata supplied
   by Cinematic without owning API calls.
2. Render every persisted Scene group, not only the active Scene.
3. Create a controlled `StoryboardShotDialog` under Cinematic.
4. Move existing prompt save/reset, order and approval callbacks into the
   dialog adapter.
5. Add desktop/tablet/mobile, keyboard/focus, empty/loading/error and theme
   tests.

## 6. Acceptance

- All Scenes and Shots from the approved Plan are visible in one board.
- Cards wrap left-to-right and never clip media or actions.
- A missing image has a stable waiting presentation.
- Existing approved image, prompt and ordering behavior remains available.

## 7. Implementation record (2026-08-30)

- [x] Renders all persisted Scenes in Story Plan order.
- [x] Renders Shot cards left-to-right with responsive wrapping.
- [x] Shows approved media or a stable waiting state, timing, Cast and Look.
- [x] Opens one controlled Shot dialog and restores focus to its card.
- [x] Preserves prompt reset/save, within-Scene ordering and explicit source
  approval.
- [x] Removed only the Storyboard prototype sidebar, expanded editor and fake
  Engine controls; Produce and sibling Stage UI remain unchanged.
- [ ] Verify contain framing and control reachability at approximately 390px,
  820px and 1440px in the running app.
