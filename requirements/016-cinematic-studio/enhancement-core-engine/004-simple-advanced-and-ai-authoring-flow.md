# Simple, Advanced And AI Authoring Flow

**Status:** Implemented; proposal review readability follow-up added 2026-09-02  
**Primary user:** A creator who understands the story but is not a film director

## 1. UX Outcome

A user must be able to prepare a valid Scene without understanding every camera,
performance or continuity term. Professional detail remains available to AI and
advanced users without creating a second workflow.

## 2. Information Architecture

### 2.1 Simple Mode

Simple mode is default for Setup, Cast direction and Scene Director where an
existing control-level contract applies. It shows only decisions that materially
change what the audience sees or hears.

Scene Director Simple groups:

1. **Scene:** title, place and time.
2. **Story change:** what happens and what is visibly different at the end.
3. **Cast and Looks:** who appears and the approved Look used.
4. **Shots:** visible moment, one physical action, emotional target and duration.
5. **Optional direction:** dialogue/audio summary or user constraint when needed.

Advanced terminology is not shown as helper prose on the main Simple form.
Validation tells the user what outcome is missing, not which film-school term
they failed to provide.

### 2.2 Advanced Mode

Advanced mode presents the same Scene and Shot IDs and values, grouped by:

- Narrative and state;
- Cast, performance and blocking;
- Camera and composition;
- Lighting and environment;
- Dialogue and audio;
- Continuity and transition;
- Timing and provider-independent motion.

Groups may collapse, but required errors must remain discoverable and focusable.

## 3. AI Direction Flow

1. User enters or inherits Simple essentials.
2. `Generate direction with AI` opens a proposal state immediately.
3. The dialog shows loading before network dispatch and remains open on error.
4. The server receives the authorized Project/Plan/Scene context and locked
   field paths.
5. AI returns structured field-level proposals, findings and provenance.
6. Comparison defaults to selecting missing or stale unlocked fields.
7. User may inspect Advanced groups before applying.
8. Apply writes through the canonical Project save with optimistic versioning.
9. Result reports applied, skipped, locked and conflicting fields.
10. User returns to the same Scene and scroll/focus context.

### 3.1 Proposal Review Selection

- Every unlocked field with outcome `proposed` is selected by default, including
  a populated field that AI proposes changing.
- The proposal header exposes one `Select all suggested changes` checkbox. It
  selects or clears only editable proposed fields and never selects locked or
  unchanged fields.
- Partial selection is visibly indeterminate and the selected/available count is
  announced in text.
- Scalar, duration, dialogue and audio values render as readable review text.
  The UI must never show `[object Object]`, raw localization keys or an
  unformatted millisecond value to the user.
- Applying continues through the existing field-level canonical save and sends
  only the selected stable field keys.

AI generation must never approve the Story Plan or Storyboard automatically.

## 4. Mode Switching

- Switching mode is presentation-only and performs no save.
- Unsaved edits remain in the same draft object.
- Advanced values are never cleared when returning to Simple.
- Simple save completes only safe missing derived values and records their
  source as `default` or `inherited`.
- If a hidden Advanced blocker exists, Simple mode shows one concise readiness
  summary with a direct `Review details` action.
- User mode preference may be device-local and actor-scoped where it represents
  work preference; Project content remains server-owned.

## 5. Lock And Stale UX

- User-authored values may be locked from their field or group menu.
- AI-generated fields show a restrained source indicator in Advanced mode.
- Simple mode avoids badges on every field; it shows only actionable status.
- Editing an upstream field shows which downstream groups need review before
  saving when impact is material.
- Stale fields retain their previous value and offer `Refresh with AI`, `Keep`
  or manual edit.
- `Keep` records a user decision and makes the field current for the selected
  source revision.

## 6. Screen And State Inventory

Every affected screen must define:

| State | Required behavior |
|---|---|
| Loading Project | Preserve stable layout and existing Stage header |
| Empty Scene | Offer manual essentials and AI generation without fixture content |
| Partial Simple | Save disabled only for visible essential blockers |
| Advanced incomplete | Save draft allowed; downstream approval blocked with findings |
| Generating proposal | Dialog visible immediately, cancel/close policy explicit |
| Proposal ready | Diff, provenance and locked-field outcomes visible |
| Proposal failed | Current draft retained with retry action |
| Version conflict | Proposal retained; refresh and rebase offered |
| Stale downstream | Existing output retained but clearly requires review before reuse |
| Read-only/unauthorized | No mutation controls; stable error translation |

## 7. Reuse And Visual Rules

- Reuse `CinematicControlLevel` for the mode selector.
- Reuse established form, dialog, button, status and confirmation components.
- Reuse shared Generation controls for provider/model, estimate and submission.
- Use one Scene/Shot field-group component contract with Simple/Advanced
  visibility supplied by the manifest.
- Do not put page sections inside decorative cards or create nested cards.
- Keep primary actions obvious and stable; AI proposal is not styled as approval.
- Preserve theme tokens, Thai/English localization and visible keyboard focus.
- No horizontal page or dialog overflow at approximately 390px, 820px and
  1440px.

## 8. Accessibility And Recovery

- Mode selector exposes selected state and keyboard operation.
- Validation summary links focus to the owning field/group.
- Collapsed Advanced group opens before focus is moved to an error.
- Dialog focus is trapped and restored to the invoking Scene/Shot.
- Async buttons expose pending state and reject duplicate submission.
- Status does not rely on color alone.
- Destructive reset/regeneration requires clear scope; it never silently clears
  user-authored values.

## 9. Acceptance Criteria

- A first-time user can save a Storyboard-ready Scene using only Simple fields.
- AI can fill all required Advanced authority without changing locked Simple
  decisions.
- An expert can inspect and edit every generated field.
- Mode switching loses no data and changes no IDs.
- A failed or conflicting AI call leaves the draft and proposal recoverable.
- The user can identify the next required action without reading all Advanced
  fields.
- Existing Stage and generation actions retain their current behavior and
  location unless explicitly named in this requirement.
