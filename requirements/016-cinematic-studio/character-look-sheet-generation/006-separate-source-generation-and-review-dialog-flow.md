# Separate Source, Generation And Review Dialog Flow

**Requirement ID:** `016-CLSG-006`  
**Priority:** P0  
**Status:** Implemented; manual responsive and live-provider verification pending  
**Owning capability:** Character Profiles / reusable Character Looks  
**Primary role:** UX/UI Product Designer  
**Reviewers:** QA Release Engineer; Backend contract review limited to data handoff

## 1. Problem

The source upload, complete-sheet review, provider/model controls, Generation
result and approval actions are currently rendered in one expanding dialog.
The user loses the boundary between a free source operation and a billable
Generation attempt, the dialog develops nested scrolling and horizontal
overflow, and a completed result appears to finish the workflow before the
required human approval.

## 2. Required Four-Step Flow

1. **Assign Character** remains owned by Cinematic Cast.
2. **Choose Wardrobe Source** uses `CharacterLookDialog` to save an AI wardrobe
   direction, Full Look, Separate Pieces or a user-owned complete Look Sheet.
3. **Prepare Look Sheet** uses a separate
   `CharacterLookGenerationDialog` for provider/model, exact estimate, Queue,
   result and candidate selection. Uploading a complete Sheet remains in the
   source/review dialog and skips AI Generation.
4. **Review And Use In Film** returns to `CharacterLookDialog`, where the user
   reviews and explicitly approves the adopted candidate. Cinematic binding
   remains the existing post-approval mutation.

The visual progress strip may describe all four states, but each modal displays
controls for one responsibility only.

## 3. Modal Transition Contract

```text
source/review modal
  -> request authorized generation plan
  -> generation modal
      -> close/back: source/review modal, no Look mutation
      -> queued/processing: may close/back; canonical Job remains durable
      -> choose completed result: server adopts result into Review
  -> source/review modal with adopted Review candidate
  -> explicit approve
  -> existing onSaved callback and optional Cinematic bind
```

- The two dialogs must never be visibly open together.
- Generation must not be appended below source fields.
- Closing the Generation modal returns to the source/review modal rather than
  closing the whole Character Look workflow.
- Returning from Generation preserves the selected Look and immutable Version.
- A generated candidate must not call the consumer's final `onSaved` callback
  until the user closes the flow or approves it; this prevents Cinematic from
  clearing the selected preparation record midway through review.
- If the user closes after adoption but before approval, the latest Review Look
  is projected to the consumer so the persisted state is not visually stale.

## 4. Data Handoff

The authorized plan passed to the Generation modal must retain:

- actor-authorized Character Profile ID and pinned Character Profile Version;
- Character Look ID and active source-ready Look Version ID;
- operation, recipe ID/version/fingerprint and compiled prompt;
- authorized identity and wardrobe reference IDs plus reference roles;
- fixed aspect ratio and one-output contract;
- persistence scope derived from Look and Look Version;
- provider/model/estimate/Job state owned by the shared Generation workflow.

Candidate adoption submits only the owned Generation result ID together with
the pinned Character/Look/Version route identity. The server remains
authoritative for result ownership, mode and lineage. The returned Look becomes
the local Review state. Approval and Cinematic binding continue through their
existing APIs and do not charge Credits.

## 5. Component Ownership And Reuse

| Responsibility | Owner |
|---|---|
| Source selection, file upload and final approval | `CharacterLookDialog` |
| Generation modal shell and return action | `CharacterLookGenerationDialog` |
| Provider/model, estimate, submit, Queue and result | existing `GenerationExperience` |
| Plan authorization and generated-result adoption | existing Character Profile API/service |
| Credit reservation/capture/refund | Credits |
| Durable Job/polling/history | Generation and Job Center |
| Approved Look binding | Cinematic |

No provider table, Credit calculation, poller, Look repository or prompt recipe
may be duplicated in either React dialog.

## 6. State And Error Matrix

| State | Required behavior |
|---|---|
| plan loading | source modal stays visible; trigger is busy and cannot duplicate |
| plan failed/stale | source modal retains files/state and shows the server error |
| generation ready | only Generation modal is visible |
| queued/processing | user may return; Job remains resumable in Job Center |
| provider failed/refunded | Generation modal displays canonical failure and retry path |
| completed, not selected | remain in Generation modal |
| candidate adoption loading | disable duplicate selection |
| candidate adoption failed | remain in Generation modal with result intact |
| candidate adopted | return to source/review modal in Review state |
| review approved | call final `onSaved`; Cinematic may bind approved Version |
| review closed without approval | publish persisted Review state to caller, never bind |

## 7. Responsive And Accessibility

- Source/review modal remains bounded and never changes width when Generation
  starts.
- Generation modal has its own desktop workspace width; tablet and mobile stack
  shared Generation regions without horizontal page or dialog overflow.
- Upload grids use `minmax(0, 1fr)` and every label/input has `min-width: 0`.
- Escape/close in Generation means Back to Look preparation; Escape/close in
  source/review closes the full flow.
- Dialog titles/descriptions remain announced and focus returns to the Generate
  trigger when coming back.
- Thai and English text may wrap without obscuring file controls or actions.

## 7.1 Cast Context And Look Terminology

- The Project Cast list remains the visual Character selector and portrait
  authority for the detail workspace.
- The detail header must not repeat the same large portrait. It displays a
  compact `Selected from Project Cast` relationship indicator, role, name and
  preparation status so multi-Character projects retain clear context.
- `Primary Look` is renamed to `Look used in this film`. It represents only the
  approved immutable Look Version currently bound to the Cast Assignment.
- Draft, Review and reusable approved Looks are displayed as preparation
  candidates, not as a second Primary/Current Look.
- The `Add Look` shortcut is removed where it duplicates the visible source
  actions. Upload Wardrobe and AI Wardrobe Suggestion remain the two canonical
  new-source commands.
- Wardrobe content is ordered as source commands, preparation candidates, then
  the final bound Look. Existing mutations and IDs remain unchanged.

## 8. Implementation Plan

1. Add tests for mutually exclusive dialogs and protected free-upload behavior.
2. Extract the Generation shell into `CharacterLookGenerationDialog` while
   continuing to render the shared `GenerationExperience` unchanged.
3. Convert `CharacterLookDialog` into a small controller for source, Generation
   transition and local returned Review state.
4. On generated candidate adoption, return to source/review and require explicit
   approval; preserve the persisted Review state on close.
5. Remove inline Generation width/state CSS and add scoped responsive modal and
   upload-grid constraints.
6. Remove the duplicate detail portrait, clarify its Project Cast relationship,
   and replace Primary Look terminology without changing assignment selection.
7. Order source, preparation candidates and bound Look by the four-step flow.
8. Add i18n for Back, generation modal description and review-return status.
9. Run component, Cinematic, TypeScript, i18n and full web regressions; record
   manual mobile/tablet/desktop checks separately when a browser is available.

## 9. Gap Review And Acceptance

- Free uploaded complete-Sheet approval remains unchanged.
- AI wardrobe suggestion remains a non-media source proposal.
- Active/completed Jobs survive modal transitions because persistence scope and
  canonical Job ownership are unchanged.
- Source mutation after plan creation is rejected by the existing server
  version check.
- No generated media is approved or bound automatically.
- The Story Plan/Storyboard receives the same approved Look binding, canonical
  face authority, approved view assets and crop manifest as before.
- No horizontal scrolling occurs inside manual Full Look or Separate Pieces
  upload at supported viewport widths.
- Existing Cast, Character Profile, Generation, Credit and Job Center consumers
  retain their public contracts.
- The selected Character remains unambiguous with multiple Cast members while
  the same portrait is not repeated in the adjacent detail header.
- `Look used in this film` can only describe the approved bound Look; source
  drafts and review candidates are never presented as the active film Look.

## 10. Implementation Record (2026-08-31)

- Added `CharacterLookGenerationDialog` as a dedicated modal shell around the
  existing `GenerationExperience`; provider, estimate, Credit, Queue, polling
  and result ownership remain unchanged.
- `CharacterLookDialog` now coordinates mutually exclusive source/review and
  Generation views and retains the returned Review Look locally until explicit
  approval or workflow close.
- Selecting a generated result returns to Review without auto-approval. Closing
  before approval publishes the persisted Review state to the existing caller
  without triggering Cinematic binding.
- Manual Wardrobe controls now constrain intrinsic file-input width and dialog
  overflow at responsive widths.
- Cast detail no longer repeats the Project Cast portrait. Wardrobe is ordered
  by source, preparation candidates and the approved Look used in the film.
- Automated component, Cinematic, TypeScript, i18n and full web regressions
  pass. Human viewport inspection and real-provider quality/Credit evidence
  remain release gates and are not claimed by this record.
