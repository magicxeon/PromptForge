# CINE-FIX-007 Safe Cast Replacement And Removal Feedback

**Priority:** P0  
**Status:** Implemented, pending manual verification  
**Reported surface:** Cast & Wardrobe with an existing Story Plan/Storyboard

## Incident

`Remove assignment` correctly rejects a Cast Assignment referenced by Scenes
or Shots, but the UI presents the rejection as a failed control. The existing
`Change Character` picker creates a new assignment ID instead of replacing the
actor attached to the planned role. A creator therefore has no safe way to
recast an existing role after Story Plan or Storyboard work exists.

The reported Project references one Assignment from three Scenes and six
approved Storyboard Shots. Those paid outputs must not be silently deleted or
remain approved after the identity changes.

## Product Decision

- `Remove assignment` remains allowed only while the Assignment is unused.
- A referenced Assignment exposes `Change Character` as the primary action and
  explains why removal is unavailable.
- Recasting preserves the Assignment ID, story role, Scene/Shot membership and
  authored direction.
- Recasting replaces the pinned Character Profile/Version and clears every
  Look owned by the previous Character.
- Approved Storyboard source pointers for affected Shots are cleared and their
  status returns to draft. Historical Assets, Jobs, attempts and Credit ledger
  entries remain retained as evidence.
- Existing video/timeline work derived from the old Storyboard source becomes
  `source_changed` through the current Cinematic lineage invalidation helper.
- The replacement operation never dispatches Generation and never changes
  Credits. The creator must prepare and bind a new approved Character Look
  before Story Plan/Storyboard work can continue.

## Implementation Steps

1. Reuse the existing Cast upsert endpoint with the existing Assignment ID when
   a picker is opened from `Change Character`.
2. Detect a pinned Character/Profile Version change in the Cinematic domain.
3. Clear old Looks and invalidate only Shots that reference the replaced
   Assignment or its old Looks.
4. Keep historical outputs while preventing an invalidated Storyboard attempt
   from auto-resuming as the current source.
5. Add direct replacement action and referenced-removal explanation in the
   selected Cast dossier without moving sibling UI.
6. Add domain and React regressions for referenced replacement and unused
   removal.
7. Normalize the invalid `null` Storyboard source pointers written by the
   initial implementation to absent optional fields when legacy Projects are
   read or next mutated.

## Acceptance

- Selecting another Character from `Change Character` keeps one Assignment for
  the role and does not create a duplicate Cast card.
- Scene and Shot Cast IDs remain valid because the Assignment ID is stable.
- Old Character Looks are no longer available to the replacement Character.
- Affected approved Storyboard sources become draft and cannot enter Produce.
- Existing generated media and Credit history are retained.
- Referenced removal is clearly unavailable with a count and replacement
  guidance; unused removal continues to work.
- Setup, role progress, Character picker, Wardrobe, Project Cost and stage
  navigation remain otherwise unchanged.

## Automated Evidence

- `node --test (Get-ChildItem test\cinematic*.test.js).FullName`: 46 passed.
- `npx tsc -p tsconfig.app.json --pretty false --incremental false`: passed.
- `npx vitest run --configLoader runner`: 346 passed across 95 files.
