# Source Selection And Preparation Experience

**Requirement ID:** `016-CLWR-002`  
**Status:** Implemented; Thai 390/820/1440 responsive smoke passed  
**Priority:** P0 workflow simplification  
**Owning UI capability:** Character Profiles, adapted by Cinematic Cast

## 1. Outcome

Make the next action obvious for each source type and remove the close-dialog,
find-card and reopen-dialog loop. Preserve one resumable Look draft before any
paid image Generation.

## 2. Source Choices

The existing shared source dialog retains three real choices:

1. **AI Wardrobe Suggestion**
   - analyzes persisted Story/Cast context;
   - returns editable Look name and wardrobe direction;
   - creates no image and starts no media Generation Job;
   - offers `Save & prepare Look Sheet` and `Save as draft`.
2. **Upload Wardrobe**
   - Full Look: one required owned image;
   - Separate Pieces: Upper and Lower required; Outerwear, Footwear and
     Accessory optional;
   - offers `Save & prepare Look Sheet` and `Save as draft`.
3. **Upload completed Character Look Sheet**
   - one owned image intended to contain one Character with front, exact-side
     and back views;
   - does not require image Generation or a provider quote;
   - proceeds to preview, rights acknowledgement and Review.

Do not represent these choices as Look records. Reuse the current dialog entry
and API ownership rather than adding another Add Look command.

## 3. Save And Continue Contract

`Save & prepare Look Sheet`:

1. validates source fields;
2. creates the source-ready Look draft idempotently;
3. keeps the same logical workflow open;
4. replaces source fields with the preparation view for the returned Look ID and
   Version ID;
5. does not call provider, estimate, reserve Credits, approve or bind.

`Save as draft` uses the same create mutation, closes the workflow after
success, and leaves one preparation card. Repeated clicks use one idempotency
key and cannot create duplicate drafts.

If create succeeds but the UI transition fails, reloading the Look list shows
the saved draft and `Prepare Look Sheet` resumes it.

## 4. Preparation Dialog Information Architecture

For an existing source-ready Look, replace the four-card progress strip with:

1. compact **Source summary** containing Character name, pinned identity
   version status, Look name, source type and only references that exist;
2. two visible stages: **Create Look Sheet** and **Review & Use**;
3. one source-specific primary action;
4. one secondary method-switch action where safe.

The Project Cast list remains the Character selection authority. The dialog may
show a compact name/status reference but must not add another large duplicate
portrait.

## 5. Source-Specific Preparation

### AI direction

- show the saved wardrobe direction and optional suggestion summary;
- show Character identity as pinned;
- primary action: `Generate Look Sheet`;
- secondary action: `Upload a completed Sheet instead`;
- do not display file controls, upload rights checkbox or empty outfit slots.

### Uploaded wardrobe

- show thumbnails/labels for actual Full Look or Separate Piece Assets;
- primary action: `Generate Look Sheet`;
- optional disclosure: `Add back reference` only when the source contract and
  active provider candidates can use it;
- secondary action: `Upload a completed Sheet instead`;
- absent reference roles remain hidden.

### Uploaded complete Sheet

- show the selected file and a bounded `contain` preview;
- do not show the AI Generation panel by default;
- show the rights acknowledgement only after the file has decoded and the
  preview is available;
- place acknowledgement immediately above or beside the terminal Review action;
- allow continuation when the user acknowledges the mismatch warning, even if
  optional validation is skipped or fails.

## 6. User-Uploaded Identity Warning

Do not block upload based on automatic content inference. Display:

> This uploaded Sheet has not been confirmed as the selected Character. If the
> face, body or views do not match, generated images or video may drift and
> Momelo cannot show a verified Character status for downstream media.

Thai and English copy must retain the same meaning. The warning is not a rights
declaration and is not a quality-validation result.

Actions after preview:

- optional `Check Character match` when that feature is qualified;
- `Continue without check` or the context-appropriate Review action;
- no misleading Verified badge.

## 7. UI State And Recovery

| State | UI behavior |
|---|---|
| source validation failed | retain all fields/files and focus first error |
| AI analysis loading | keep dialog open, disable duplicate analysis |
| AI analysis failed | retain creator input and show retry |
| draft create loading | disable both save actions |
| draft create failed | remain on source step with stable error |
| draft saved | transition or close according to chosen action |
| uploaded image decoding | show stable media skeleton; rights disabled |
| invalid/unreadable image | keep file control and request replacement |
| complete Sheet ready | show preview, warning, rights and Review action |

## 8. Component Reuse And Scoped Preservation

- Refactor `CharacterLookDialog` into source/preparation/review state sections;
  do not create a parallel Character Look dialog with new mutations.
- Reuse `Button`, `ConfirmDialog`, authenticated media presentation and existing
  upload/reference adapters.
- Keep `CharacterLookGenerationDialog` separate.
- Preserve Cast heading, Control Level, role progress, Project Cast, Direction,
  Continuity, Look preparation list, bound Look, Project Cost and Stage footer.
- Preserve unapproved preparation removal from `016-CLSG-007`.

## 9. Responsive And Accessibility

- Modal remains one column at 390px with no horizontal file-input overflow.
- At 820px and 1440px, summary and media may use bounded columns without nested
  cards or nested vertical scroll regions.
- Terminal actions remain visible without occluding fields or preview.
- Source alternatives use radio/segmented semantics and clear selected state.
- Focus moves to the preparation heading after `Save & prepare`; close returns
  to the initiating preparation card/source command.
- Rights and warning text are associated with the relevant input and action.

## 10. Implementation Steps

1. Add tests for all three source paths, both save actions and protected sibling
   sections before changing markup.
2. Introduce one typed workflow controller state while preserving existing API
   functions and `onSaved` behavior.
3. Add `Save & prepare` transition using the returned draft, with one
   idempotency key and no re-fetch requirement.
4. Replace the four visible step cards with source summary and two-stage
   progress only inside the owned modal section.
5. Render source-specific controls; hide unrelated controls rather than disable
   them without explanation.
6. Gate the complete-Sheet rights row on decoded preview readiness and move it
   next to the Review action.
7. Add uploaded identity warning and assurance status copy.
8. Add i18n, keyboard/focus, 390/820/1440 and all-theme regressions.

## 11. Acceptance

- AI and wardrobe users can save and enter preparation without closing/reopening.
- Saving a draft remains available and creates exactly one card.
- Complete Sheet upload remains free and bypasses provider Generation.
- AI direction never displays an upload-rights checkbox or empty outfit slots.
- Uploaded Sheet cannot be approved before preview and rights acknowledgement.
- User may continue with unverified uploaded media after an explicit warning.
- No unrelated Cast or global layout changes.

## 12. Implementation Evidence (2026-09-01)

- `CharacterLookDialog` provides AI direction, wardrobe upload and completed
  Sheet upload as explicit source choices within the existing modal boundary.
- Source save and preparation resume use one Look ID; switching to completed
  Sheet does not create another Look.
- Uploaded Sheet rights are disabled until the local image decodes, and failed
  previews remain unapprovable.
- Existing Cast selection, Control Level, tabs, Project Cost and Stage footer
  were preserved. React regressions cover all source paths and adjacent flows.
- Playwright verified the real owner-scoped Cast route and Preparation dialog at
  390/820/1440 with no horizontal overflow and reachable terminal actions.
