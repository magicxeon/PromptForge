# 004 Studio Character Sheet Integration

ID: CLSFE-004. Status: one-image adapter implemented; automatic draft import pending P-08. Owner: Studio with Character Profiles authority.
Depends on 001-003. Parent: [master](000-master.md).

## Scope

Within existing `/create/studio/character`, add an explicit sheet-format choice:
existing Character Sheet (default) / new Character Look Sheet. This is not a new
Face Creator mode or a replacement for existing GuidedAttributeForm.

Use the shared form/definition/recipe from Playground. New format shows relevant
fields rather than simultaneously showing two conflicting attribute editors.
Switching back restores existing attributes, reference selection, locked fields,
custom colors and additional direction. Profile type and identity are never
rewritten by a presentation format toggle.

## Identity And Results

- Prefill from an authorized Character or Studio identity attributes only when
  their mapping is explicit. Preserve age range, gender/presentation, ethnicity
  and distinctive traits; do not infer missing fields or mutate approved versions.
- Existing reference handoff, ownership and outfit preservation continue to apply.
- Keep the existing three-view generation, Create/Approve Character profile,
  configuration import/export, Scene handoff and queue actions unchanged.
- The new five-view/image-sheet result is NOT compatible by assumption with
  legacy casting crop coordinates or approved Look layout manifests.
- First slice produces an owned candidate and downloadable document. It must
  not auto-approve, auto-create a profile, substitute canonical reference assets,
  or bind itself to Cinematic Cast.
- Reuse existing explicit image-reference handoff only if it accepts the new
  source kind safely; typed profile/casting adoption is pending P-06 in 008.
  Do not reuse a misleading Create/Approve action when its schema cannot accept
  the new layout. Original-format actions must remain available and unchanged.
- Export uses the same immutable snapshot and Download service as Playground.

## Tasks

- [x] STU-01 Add format policy under Studio ownership; isolate new authoring draft.
- [ ] STU-02 Automatic Studio attribute/face-draft import is deferred P-08;
  explicit approved Character selection is implemented through authorized handoff.
- [x] STU-03 Reuse shared form, canonical Generation and scoped result actions.
- [x] STU-04 Guard incompatible profile/Look adoption; no fixed crop assumptions.
- [ ] STU-05 Preserve config import/export and actor/format switching behavior.
- [ ] STU-06 Verify original/new format, face-reference handoff and responsive UI.

## Acceptance

STU-A1: original Character Sheet still behaves identically by default.
STU-A2: equivalent definitions compile the same preset on both entry surfaces,
apart from legitimate surface policy metadata.
STU-A3: format switching does not lose original draft or change a pinned profile.
STU-A4: new outputs cannot accidentally enter incompatible approval/crop paths.
STU-A5: Download text reflects submitted data, not later form edits.
STU-A6: Headshot, Scene Builder, Fashion and Cinematic remain unaffected.
Groups: `ui-studio`, `drafts`, `compatibility`, `layout-studio` in [009](009-verification-and-release.md).
