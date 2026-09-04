# Step-By-Step Implementation Plan

**Status:** Implemented through Step 11; conditional visual/live-provider qualification remains  
**Execution rule:** Complete and test one checkpoint before starting the next

Execution followed Packages 001-005 under `implemetation-plan/`. Exact test
evidence, baseline exceptions and residual qualification work are recorded in
`implemetation-plan/006-execution-log.md`.

## Step 0 - Baseline And Fixture Freeze

Work:

- record current Cinematic focused test commands and results;
- add sanitized fixtures for one single-Character, one multi-Character and one
  legacy Project;
- capture current Simple/Advanced, proposal, Storyboard manual/batch and Produce
  handoff behavior;
- record responsive screenshots for affected screens where browser tooling is
  available.

Test gate:

- current focused server and Web Cinematic suites pass or existing failures are
  documented before edits;
- fixtures contain stable IDs but no secrets, Base64 or private media.

Rollback: no runtime change.

## Step 1 - Field Inventory And Configuration Schemas

Work:

- implement schema validation for field manifest, dependencies and readiness
  policy;
- map every current Setup, Cast, Plan, Beat, Scene and Shot field;
- record Simple/Advanced/system visibility and downstream consumers;
- fail safely on invalid configuration.

Test gate:

- configuration parser unit tests;
- unknown paths, dependency cycles, missing localization key and invalid
  consumer tests;
- no Project payload or UI behavior change.

Rollback: remove unconsumed configuration and service registration only.

## Step 2 - Additive Authoring Metadata

Work:

- add optional `authoringContractVersion` and field-state sidecar;
- infer deterministic legacy metadata on read;
- persist metadata only through normal Cinematic mutations;
- add merge, lock, stale and source-provenance rules.

Test gate:

- old/new Project repository round trip;
- optimistic version conflict;
- locked field merge;
- targeted stale dependency;
- approved Plan and media lineage unchanged.

Rollback: readers ignore optional sidecar; no destructive migration.

## Step 3 - Data Lineage And Readiness Projection

Work:

- implement read-only lineage service and authorized API projection;
- produce within-stage and between-stage findings from requirement `003`;
- connect findings to the smallest recovery stage/field;
- retain current Stage blockers until parity is proven.

Test gate:

- complete single/multi-Character lineage fixtures;
- duplicate, inactive, missing and stale ID cases;
- unauthorized actor case;
- deterministic no-write report check.

Rollback: remove route projection; existing blockers remain authoritative.

## Step 4 - Reusable Authoring Presentation

Work:

- extract authoring mode header, field groups, Cast/Look selector, Shot sequence
  editor and readiness summary where justified;
- keep existing orchestration and API calls unchanged;
- add explicit controlled component contracts and compatibility exports.

Test gate:

- component behavior parity;
- keyboard/focus tests;
- Thai/English and theme checks;
- 390px, 820px and 1440px visual checks;
- unchanged sibling actions remain available.

Rollback: restore existing consumer imports while leaving isolated pure
components unused; do not revert unrelated user edits.

## Step 5 - Simple/Advanced Manifest Projection

Work:

- make Simple the default projection of the canonical manifest;
- group Advanced fields without changing persisted data;
- show concise readiness and direct recovery links;
- keep mode switching presentation-only;
- replace client-only hidden completion with server-validated completion while
  preserving values and IDs.

Test gate:

- Simple required-field readiness;
- Advanced values survive Simple edit/save;
- mode switch performs no mutation;
- legacy Project editing;
- no overlap/overflow or inaccessible fields.

Rollback: return visibility selection to current component while retaining
additive metadata and server validation.

## Step 6 - AI Field-Level Proposal And Apply

Work:

- request only missing/stale fields with locked paths;
- return strict field-level proposal and provenance;
- implement reusable proposal state shell;
- apply selected values through Cinematic optimistic save;
- preserve proposal across provider, transport and version-conflict errors.

Test gate:

- loading dialog appears before dispatch;
- locked/user fields are not overwritten;
- missing/stale defaults are selected appropriately;
- duplicate Apply is rejected;
- failed call and version conflict retain work;
- no Credits charged until a separate commercial contract enables them.

Rollback: disable new field-level apply and retain existing whole-proposal flow.

## Step 7 - Server Storyboard Keyframe Compiler

Work:

- implement structured compiler, precedence, conflict findings and fingerprint;
- run in shadow comparison mode against current client adapter;
- reconcile intended differences with fixtures;
- keep provider-independent output and reference plan.

Test gate:

- deterministic contract tests;
- future-state leakage, multi-action, environment and text-conflict cases;
- Character/Look authority cases;
- current Shot emotion overrides broad arc;
- no provider-specific wording in Cinematic core.

Rollback: retain current client compiler as active until cutover gate passes.

## Step 8 - Manual And Generate All Compiler Cutover

Work:

- route both workflows through one server compile use case;
- enforce quote/submit fingerprint parity;
- retain Queue, Credits, polling, attempt and approval ownership;
- remove final client assembly after all consumers migrate.

Test gate:

- same Shot yields same manual/batch fingerprint;
- provider/model/reference/count and estimate parity;
- idempotent batch submission;
- completed/unapproved attempts restore correctly;
- approved source cannot attach to a stale Shot contract.

Rollback: feature-gated server compiler switch during observation; do not keep
two permanent active compilers.

## Step 9 - Produce/Video Handoff Reconciliation

Work:

- compile provider-independent video packets from current Shot and approved
  keyframe authority;
- validate duration, reference and audio capability before quote;
- report exact upstream recovery paths;
- preserve existing video provider task lifecycle.

Test gate:

- supported and unsupported duration matrices;
- first/last/reference-frame strategies;
- multi-Character identity/Look continuity;
- audio-capable and silent provider paths;
- stale Storyboard source blocks only affected Shot.

Rollback: retain current Produce adapter until packet parity passes.

## Step 10 - Finish Timeline And Export Lineage

Work:

- connect current approved video sources to deterministic timeline entries;
- validate order, trim, transition and assembled duration;
- calculate export eligibility from current source fingerprints;
- preserve current qualification limits and delegate any billable operation to
  Credits;
- include timeline and export nodes in the lineage report.

Test gate:

- missing/stale approved source blocks only its timeline entry;
- trim and transition bounds;
- unrelated edits preserve current entries;
- deterministic timeline fingerprint;
- incomplete or qualification-only assembly cannot mark the Project completed.

Rollback: retain existing Finish timeline/export methods and hide only the new
readiness projection; no source Asset is deleted.

## Step 11 - Cleanup And Release Verification

Work:

- remove superseded client prompt assembly and compatibility exports;
- reconcile requirements and architecture paths;
- review source diff for out-of-scope UI churn;
- run full Cinematic, shared Generation, TypeScript, i18n and production build
  gates;
- record residual provider-quality risks separately from deterministic closure.

Test gate:

- all cases in `008-cinematic-specific-test-suite.md` pass;
- full existing test suites show no new regression;
- responsive visual evidence recorded;
- data-lineage matrix from Setup through Finish/export has no unexplained
  blocking gap;
- rollback and configuration-version procedures are documented.

## Checkpoint Reporting Template

After every step report:

```text
checkpoint completed
files changed and owning capability
contracts added or changed
data linkage added or verified
focused tests and result
preservation tests and result
responsive/manual evidence, when applicable
remaining gap before next checkpoint
rollback readiness
```
