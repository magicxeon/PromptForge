# Character Look Sheet QA, Provider Qualification And Rollout

**Requirement ID:** `016-CLSG-005`  
**Priority:** P0 release gate  
**Status:** Planned

## Environment Gate

`CHARACTER_LOOK_SHEET_GENERATION_ENABLED` controls access to the authorized
generation plan. When omitted it is enabled for local/non-production
qualification and disabled in production. Production rollout must set it to
`true` only after this requirement's media, Credit and recovery evidence passes.

## 1. Protected Regression Inventory

- existing Cast selection/replacement/removal safeguards;
- Wardrobe source draft and AI suggestion analysis;
- free complete-sheet upload -> review -> approval;
- Character Profile Looks library;
- approved Look binding and required-role Story Plan gate;
- normal Playground/Studio/Fashion image Generation;
- exact Credit estimate, Job Center, History and actor isolation;
- Project Cost, navigation, footer, themes and localization.

## 2. Automated Gates

### Domain/API

- source ownership and pinned Character/Look version;
- unsupported reference plan rejected before quote;
- estimate/submission parity and stale-estimate rejection;
- idempotent submit, single reservation/capture/refund;
- restart recovery and terminal polling stop;
- generated Asset adoption without auto-approval;
- review/approval/binding authorization and optimistic conflicts;
- generated lineage retained after rejection, retry and supersession.

### React

- Look records and source commands remain visually/semantically distinct;
- Upload/AI entry points reuse the same dialog and correct mode;
- qualification, quote, insufficient Credit, queued, processing, completed,
  failed/refunded, rejected and approved states;
- leaving/reopening resumes the same Job;
- approval and binding happen only on explicit action;
- adjacent Cast sections and free upload behavior remain present.

## 3. Manual Visual Gate

Validate at approximately 390px, 820px and 1440px in every supported theme and
Thai/English:

1. identify the next Wardrobe action without opening a dialog;
2. start Upload and AI paths with keyboard and pointer;
3. inspect long labels, errors and active Job states without overlap;
4. inspect the complete sheet and crop regions without unintended cropping;
5. refresh/restart during processing and resume;
6. approve and bind, then verify Cast readiness and Story Plan continuation;
7. switch actor and verify no Look, Job or Asset leakage.

## 4. Provider Qualification Matrix

For every candidate provider/model, record at least five varied Characters and
three wardrobe source patterns (Full Look, Separate Pieces and AI direction):

- effective reference count and preprocessing plan;
- provider duration, failure/retry behavior and delivered dimensions;
- identity, face, apparent age, body and hairstyle fidelity;
- outfit/color/material/accessory consistency across views;
- exact-side/back quality, anatomy and one-person/layout compliance;
- Asset/crop compatibility;
- provider cost, Credits, reservation, capture/refund and reconciliation IDs.

A model fails qualification if it repeatedly changes identity/outfit, creates
multiple people, cannot deliver exact side/back authority, has unverified price
or cannot satisfy reference parity.

## 5. Rollout

1. Ship `016-CLSG-001` presentation changes with no generation exposure change.
2. Deploy contracts behind a server feature gate with no customer-paid model.
3. Run sandbox/internal qualification and collect financial/media evidence.
4. Publish one qualified provider/model and pricing through the existing Admin
   draft/scheduled/manual publication contract.
5. Enable for internal actors, then a bounded customer cohort.
6. Monitor submit failure, refund, review rejection and identity/outfit drift.
7. Roll back by unpublishing provider exposure; uploaded-sheet preparation and
   historical Jobs/Looks remain available.

## 6. Closure Rule

The package remains conditionally incomplete until automated gates pass and a
human reviewer signs off provider quality, responsive UI, financial evidence
and actor privacy. Generated screenshots alone cannot close qualification.
