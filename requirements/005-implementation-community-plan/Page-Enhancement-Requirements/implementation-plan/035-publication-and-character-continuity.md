# Publication And Character Continuity Delivery Plan

Parent: [033](../033-publication-and-character-continuity-master.md).
Status: Documentation complete; all implementation/testing below NOT STARTED.
Execute only after user discussion. Complete one gate and record evidence before
the next; no full-system testing required for individual slices.

## Ordered Tasks

| Step | Tasks | Requirement / acceptance | Gate |
|---|---|---|---|
| 00 | Review current versus proposed flows; resolve Template privacy, labels and legacy-data scope | 033/037 decisions | User discussion; pending choices stay held |
| 01 | Add source-inspected fixtures for public hero image, missing Character context, sharing defaults and current reuse guards | Baseline in 033 | Reproduce failures without live data mutation |
| 02 | Update ordinary image private defaults across shared form, schema, draft and publish; preserve explicit/derived/legacy policies | PVT-01..05 | privacy group; Template compatibility decision required before relevant UI |
| 03 | Preserve feed entries despite editorial placement; refresh scoped queries after publish | DISC-01/02/04/05 | discovery group; pagination/filter/privacy regressions |
| 04 | Add approved post-action destinations and already-shared recovery through existing status/publication contracts | DISC-03 and approved 037 | share-ui group; permission and stale/partial-failure tests |
| 05 | Trace Character source selection -> request -> saved result -> public/owner work; fix verified linkage gaps | LIN-01..04 | lineage group, one consumer at a time |
| 06 | Define versioned identity metadata and preserve source attrs through Face -> Sheet -> Profile | ID-01/02/07/08 | identity-storage group; immutable legacy fixtures |
| 07 | Integrate identity directive into canonical compilation/refinement and each supported reuse consumer | ID-03..06 | identity-prompt group plus reference/estimate parity |
| 08 | Implement only approved flow presentation / normal Scene picker slice | approved 037 scope | flow-ui group + scoped responsive checks |
| 09 | Review evidence, remaining legacy gaps, focused aggregate and owner UAT checklist | all implemented ACs | QA/privacy; no automatic live/paid calls |

Legacy repair LIN-05 is separate and pending explicit approval/dry-run evidence.
Approval-time crop changes remain deferred: inspect actual source and approve a
display/export-specific requirement before changing pixels. Do not infer closure
from new picker, feed or identity tests.

## Focused Test Entry Point (Planned, Not Yet Created)

During implementation add scripts/test-publication-character-round.mjs as a thin
owning runner with selectable groups, reusing existing suites rather than copying
test logic. Planned commands, NOT executable deliverables of this documentation:

```sh
node scripts/test-publication-character-round.mjs privacy
node scripts/test-publication-character-round.mjs discovery
node scripts/test-publication-character-round.mjs share-ui
node scripts/test-publication-character-round.mjs lineage
node scripts/test-publication-character-round.mjs identity-storage
node scripts/test-publication-character-round.mjs identity-prompt
node scripts/test-publication-character-round.mjs flow-ui
node scripts/test-publication-character-round.mjs layout
node scripts/test-publication-character-round.mjs all
```

Prerequisites to document when runner is implemented: installed root/web packages,
supported Node, browser fixture toolchain for layout. Unknown group/nonzero test
must fail. No default full aggregate; all is explicit. No live runtime JSON,
secrets, external provider, Credit mutation, workers or database needed. Layout
uses an isolated fixture server and screenshots, not live publication requests.
Existing reuse candidates: test-template-derived-sharing.mjs,
test-template-scene.mjs, test-character-discovery.mjs and focused compiler tests.
Inspect their side effects before composing; do not invoke broad runners blindly.

Each UI group checks loading/error/empty/stale/unauthorized and adjacent actions.
Layout checks 390/820/1440, EN/TH, existing themes and keyboard focus. Cover image
selection must not alter canonical reference; sharing must not change Character
rights; identity additions must not change quotes/credits or trusted-video policy.
Provider likeness UAT remains a separately approved model/budget exercise.

## Rollout, Rollback And Evidence

- Release source/UI slices only after their own tests pass; no runtime migration
  is assumed. Preserve existing post policies and approved Character versions.
- Coordinate privacy defaults with Template eligibility and consent. Do not ship
  a selectable Template action that inevitably fails on the new default.
- Roll back UI/cache changes independently; retain saved provenance/identity
  data, derived-image guards and duplicate constraints. No destructive rollback.
- For each task record changed files, test command/count/result, screenshot
  evidence, scope review and unverified runtime behavior here before closing it.
- Documentation checks this turn cover links, paths, requirement dependencies and
  whitespace only. Application tests and browser/provider UAT are NOT RUN.
