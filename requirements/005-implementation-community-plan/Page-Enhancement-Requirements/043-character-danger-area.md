# Character Details Danger Area

Status: implemented and fixture-verified. Owner: Profiles. Parent: [042](042-profile-danger-and-public-work-master.md).

## Contract

Move DeleteCharacterDialog's trigger from between management and Looks to the
last block in owner Details, after CharacterFeaturedImagePicker. Render a red
semantic-danger border/background with a heading and persistent warning. Owner
permission remains `access === owner && character.isOwner`; public viewers get
no danger area. Preserve every sibling management/Look/cover action.

Warn that the Character cannot be restored through the product, disappears from
lists and cannot be reused for new generation. Existing generated images/posts
and historical usage are not automatically deleted. Do NOT promise physical
erasure, automatic Credit refund, deletion of post likes/views, or deduction of
creator popularity. The canonical operation is soft delete; scoring changes are
out of scope. Use the same warning in confirmation, with exact DELETE still
required, pending/double-submit guard, cancel/focus return and retry unchanged.

## Tasks And Acceptance

- [x] D1 Move owner-only trigger to final Details block, without hiding cover picker.
- [x] D2 Add EN/TH truthful warning and semantic danger treatment in three themes.
- [x] D3 Verify ordering, DELETE/cancel/retry and original owner controls.
- [x] D4 Inspect mobile/tablet/desktop danger block and modal. No live deletion.

Evidence: runner `danger` passes 11 tests. Browser `profile` passes 18
locale/viewport/theme cases plus public-view exclusion; warning is the final
Details child and existing cover source selector remains mounted. Exact DELETE
enables confirmation; cancellation sends no request. See Plan 037 for limits.
