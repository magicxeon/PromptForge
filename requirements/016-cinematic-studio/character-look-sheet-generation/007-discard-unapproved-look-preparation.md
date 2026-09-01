# Discard Unapproved Look Preparation

**Requirement ID:** `016-CLSG-007`  
**Priority:** P0  
**Status:** Implemented; manual responsive verification pending  
**Owning capability:** Character Profiles / reusable Character Looks  
**Primary role:** Product and Requirement Architect  
**Reviewers:** UX/UI Product Designer; QA Release Engineer

## 1. Problem

Creators can save multiple incorrect wardrobe directions or garment-source
drafts, but Cast & Wardrobe exposes only `Prepare Look Sheet`. The existing
owner-only `retire` backend mutation is not reachable from React and retired
records are still returned by the visible Look list. Incorrect preparations
therefore remain indefinitely and obscure the candidate that should continue.

## 2. Outcome And Scope

- Each unapproved Look preparation exposes `Remove preparation` beside its
  preparation action.
- Removal requires an explicit destructive confirmation naming the Look.
- The Character Profiles owner performs an actor-authorized soft delete by
  retiring the Look and all of its unapproved Versions.
- Retired and deleted Looks are absent from reusable Look lists and disappear
  from Cast & Wardrobe after a successful response.
- Approved Looks cannot be removed through this operation, whether or not the
  current Cinematic Project has bound them.

Physical Asset, Generation Job, result and Credit-ledger deletion is outside
this requirement. Those records retain audit and paid-operation lineage.

## 3. Lifecycle Contract

| Current state | Remove preparation |
|---|---|
| `draft` / active Version `source_ready` | allowed |
| `review` / generated or uploaded candidate | allowed; media lineage retained |
| `approved` or `approvedVersionId` present | rejected with `character_look_discard_not_allowed` |
| `retired` or `deleted` | absent from visible lists |
| another actor owns the Look | `character_look_not_found` |

The operation is a soft delete. It changes the Look lifecycle to `retired`,
sets `retiredAt`, and changes every non-approved Version to `retired`. It must
not delete files, Generation results, Jobs, reservations or ledger entries.

## 4. Component And API Ownership

- `CharacterLookService.retire` owns approval and actor guards.
- `CharacterLookRepository.retire` owns the atomic lifecycle mutation.
- The existing `POST /api/character-profiles/:id/looks/:lookId/retire` route
  remains the single HTTP entry point.
- `profileApi.retireCharacterLook` is the shared React API adapter.
- Cast & Wardrobe owns only confirmation, pending/error presentation and local
  list reconciliation. It never edits persistence directly.

## 5. UX And Responsive Rules

- `Prepare Look Sheet` remains the primary action.
- `Remove preparation` is a secondary destructive icon-and-text action.
- The confirmation explains that the preparation disappears but historical
  Generation and Credit records remain.
- Pending removal disables duplicate submission for that Look only.
- On mobile, preparation actions occupy a stable full-width row without card
  overflow or overlap.

## 6. Implementation Plan

1. Add repository and service tests for unapproved removal, list filtering,
   owner isolation and approved-Look protection.
2. Complete the existing retire lifecycle so retired records are hidden and
   their non-approved Versions become retired.
3. Add the shared React API adapter.
4. Add a confirmed remove action to unapproved preparation cards and reconcile
   local state only after success.
5. Add Thai/English localization and scoped responsive styles.
6. Run Character Look service, Cinematic component, TypeScript, i18n and full
   frontend regressions.

## 7. Acceptance Criteria

- Removing one incorrect preparation removes only that Look from the list.
- Refreshing the page does not restore the retired Look.
- Canceling confirmation changes nothing.
- A failed request leaves the card visible and presents the server error.
- An approved Look never displays the remove action and direct API attempts are
  rejected server-side.
- Generate, Review, Approve, Bind, Story Plan, Storyboard and Credit contracts
  remain unchanged.

## 8. Implementation Record (2026-08-31)

- Completed the existing owner-scoped retire path as the canonical soft-delete
  operation for unapproved preparations.
- Retired Looks and Versions are no longer returned by visible Look lists.
- Cast & Wardrobe now provides a confirmed per-card removal action and updates
  only local preparation state after server success.
- Approved and bound lineage remains protected; historical media and commercial
  records are intentionally retained.
