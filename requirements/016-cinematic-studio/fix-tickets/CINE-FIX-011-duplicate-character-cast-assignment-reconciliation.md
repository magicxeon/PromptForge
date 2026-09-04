# CINE-FIX-011 - Duplicate Character Cast Assignment Reconciliation

**Status:** Implemented and verified  
**Priority:** P0  
**Owner:** Cinematic Studio Cast  
**Primary role:** Backend Platform Architect  
**Reviewers:** UX/UI Product Designer, QA Release Engineer

## 1. Problem

When Setup replaces an AI-recommended role, selecting the same Character for
the new role can create another Cast Assignment ID. Scene Director then renders
the same Character and approved Look more than once even though Cast prepared
one Character Look.

## 2. Required Contract

- One active Character Profile may own only one Cast Assignment in a Cinematic
  Project.
- Selecting the same Character for a new or renamed role reuses the existing
  Assignment ID and preserves its pinned version, approved Looks and Scene
  references.
- The newly selected current role direction replaces obsolete role metadata.
- Existing legacy records remain available for audit. Current Scene authoring
  projects only active Assignments linked to current Setup roles (plus manual
  unbound Cast) and deduplicates that projection by Character Profile.
- Distinct Character Profiles remain separate Cast Assignments.
- Scene Director continues to render one card per active Cast Assignment and
  one Look selector per Character.

## 3. Implementation Steps

1. Reuse an active Assignment with the selected Character Profile in the Cast
   client before submitting the mutation.
2. Enforce the same invariant in `CinematicApplicationService` for all callers.
3. Add a non-destructive current-Cast projection for Scene Director that
   excludes obsolete role-slot Assignments and deduplicates by Character.
4. Add backend and React regression coverage.
5. Verify the affected Project without deleting historical Assignment data.

## 4. Acceptance Criteria

- `CAST-01`: selecting the same Character after a role rename does not increase
  active Cast count.
- `CAST-02`: the existing Assignment ID and approved Look remain available.
- `CAST-03`: Scene Director shows the Character once.
- `CAST-04`: existing Scene, Shot and dialogue speaker references are unchanged.
- `CAST-05`: Storyboard authority and approved media are not invalidated.
- `CAST-06`: unrelated Cast, Wardrobe, Story Plan and Scene Director behavior is
  unchanged.

## 5. Verification Evidence

- Cinematic domain tests: 28 passed, including reuse of the Assignment ID after
  a role rename.
- Cinematic React tests: 51 passed, including the current-Scene Cast projection.
- TypeScript typecheck and production React build passed.
- Project `cineproj_1787841798259_d5rmu2tx` was verified without data cleanup:
  Setup owns role `นารา`, current Scenes reference its Assignment, and the
  obsolete `Young Woman` record remains retained for audit.
- Chromium smoke checks at 1440 x 1000 and 390 x 844 rendered one Scene Cast
  card and one approved Look selector with no page-level horizontal overflow.
