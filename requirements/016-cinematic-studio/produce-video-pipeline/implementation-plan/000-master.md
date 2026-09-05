# Produce Video Pipeline Implementation Plan

**Plan ID:** `016-PVP-IP-000`  
**Status:** Packages 001-002 complete; Seedance live qualification paused awaiting BytePlus Support; local implementation retained
**Execution rule:** Complete, test and record one package before the next starts

## 1. Purpose

Translate `../000-master.md` through `../010-produce-data-lineage-checklist.md`
into small dependency-ordered implementation packages. The plan prevents a UI
mock, direct provider call, duplicate batch loop or non-durable export from
becoming a competing production path.

## 2. Package Order

### 2026-09-05 - Support Hold And Next Priorities

Planning owner: Product And Requirement Architect. This is a documentation-only
backlog review, not new implementation approval or release verification.
Current support evidence and hold boundaries are in
`../../fix-tickets/CINE-FIX-012-seedance-direct-first-frame-recovery.md`, section 5.
That dated record overrides historical active/live-test instructions for 003
and 003H below. The 003F Asset Library path is historical, not a prerequisite
to restoring this flow; CINE-FIX-012 owns current URL-first transport.

Recommended remaining work, ordered by upstream correctness and dependencies:

| Rank | Work and owning requirement | Actual remaining scope | Work possible during support hold |
|---|---|---|---|
| 1 | Prop visual authority: `../../enhancement-core-engine/015-storyboard-render-engine-memory-and-deferred-prop-continuity.md`, section 6 | Stable prop identity and appearance across Shots; separate material/color/shape from per-Shot pose/state; backward-compatible conflict checks | Write the deferred implementation package and deterministic compiler/reference tests. Engine preference memory is already implemented and must not be rebuilt. Do not regenerate existing images. |
| 2 | Eligible video batch: `004-generate-eligible-video-set.md` | Server-prepared eligible set, aggregate quote, durable Group, bounded child dispatch and failed-child-only retry | Prepare contracts and mocked lifecycle/Credit/UI tests after explicitly splitting the local gate from pending provider qualification. No live batch or paid exposure until the single-Shot gate passes. |
| 3 | Cross-Shot video continuity: `005-continuity-and-media-validation.md` | Transition strategy, authorized last-frame derivatives, dependency-aware staleness and continuity review | Use local media fixtures for transition/derivative/recovery tests. Existing media probe and technical approval gates from 003A must be reused, not implemented twice. Live continuing-action qualification remains dependent on provider acceptance. |
| 4 | Final assembly, audio and export: `006-final-assembly-and-export.md` | Immutable approved Timeline manifest, audio readiness, bounded FFmpeg render Job, playable MP4, preview/download and explicit completion | Develop and verify with owned synthetic/local clip fixtures after local dependencies pass. Current application export remains `qualification_blocked`; do not label a manifest as a completed movie. Pricing and live sequence validation remain separate gates. |
| 5 | Release and regression closure: `007-release-verification-and-rollout.md` | End-to-end lineage, refresh/restart/retry, Credits, private media, responsive themes and final rollout decision | Prepare the evidence matrix and focused scripts incrementally. Run full regression after the relevant packages; production release and real Seedance sequence qualification cannot close while support is pending. |

These are remaining scopes, not claims that each entire package is absent.
Inspect canonical code/tests before each step to preserve completed substeps.
The older generic story-improvement document also has a pending heading, but
core-engine packages implement overlapping behavior; reconcile acceptance
criteria instead of starting a second prompt compiler or duplicate repair loop.
No package is started by this backlog note. The original one-package-at-a-time
rule remains; any local-fixture execution split must be documented before code.

| Package | Scope | Depends on | Exit evidence |
|---|---|---|---|
| `001-operation-input-mode-foundation.md` | Complete: baseline, schemas, capability, packet/prompt and compatibility | none | 69 focused server tests, 65 Web tests and production build passed |
| `002-produce-workspace-layout.md` | Complete: Produce information hierarchy, shared-component reuse and motion correction | 001 API projection stable | 391 Web regressions, responsive/theme evidence and unchanged canonical submission |
| `003-seedance-first-frame-vertical-slice.md` | Active gate: deterministic lifecycle complete; 003B unverified development POC active; live qualification pending | 001-002 | three internal live qualification records |
| `003e-seedream-seedance-synthetic-character-keyframes.md` | Active subpackage: trusted Seedream output provenance, Seedance 2.x preflight and prompt realism | 003A-003D evidence | one deterministic compatible path and creator-confirmed live attempt |
| `003f-modelark-aigc-asset-first-frame-transport.md` | Deterministic complete: exact approved keyframe registration and `asset://` first-frame dispatch; deployment/live gate pending | 003E live moderation evidence | one deterministic AIGC Asset path and creator-confirmed live attempt |
| `003h-storyboard-and-look-references.md` | Locally verified: dynamic 1+N image references; no mixed first-frame/reference payload; live gate pending | 012 requirement and creator acceptance of opening-frame tradeoff | Ordered references, authorization, quote parity, configured prompt, responsive UI and preserved single-image path |
| `004-generate-eligible-video-set.md` | server-prepared batch, Group, aggregate quote and partial retry | 003 single-Shot lifecycle | durable five-Shot Group evidence |
| `005-continuity-and-media-validation.md` | transition strategy, last frame, probe and approval gate | 003; may follow 004 | cut/continuing-action and invalid-media evidence |
| `006-final-assembly-and-export.md` | audio gate, FFmpeg Job, master Asset and completion | 004-005 | one playable multi-Shot master |
| `007-release-verification-and-rollout.md` | full regression, provider/commercial/security gates and cleanup | all | signed pass/internal-only/fail decision |

Only one package is `in_progress`. A package may be split further in its file
before coding when inspection reveals hidden complexity, but its public
contract and stop gate may not be bypassed.

## 3. Step 0 Baseline Freeze

Before Package 001 source edits:

1. run and record current focused server and Web tests;
2. capture existing Produce/Finish at 390px, 820px and 1440px;
3. save sanitized one-Shot request/response fixture evidence;
4. confirm Storyboard image generation/approval, Playground Video, Job Center,
   History and actor-switch behavior;
5. classify pre-existing failures without modifying fixtures to hide them.

Baseline artifacts belong in test fixtures or the eventual execution log, not
runtime configuration.

## 4. Shared Execution Rules

1. Re-read the active package, owning source contracts and relevant role/Skill
   instructions before edits.
2. Update the package status to `in_progress` and list any justified subtask.
3. Extend one canonical owner entry point; do not create a convenience path in
   React or routes.
4. Write/add tests with the behavior, then implement narrowly.
5. Run focused tests, protected regressions and `git diff --check`.
6. For UI packages, inspect all required viewports/themes/locales.
7. For provider/financial packages, complete Generation, Commercial and QA
   review before claiming closure.
8. Record data-lineage evidence from `../010-produce-data-lineage-checklist.md`.
9. Mark complete only after the package exit gate passes.
10. Stop and report before starting the next package when any stop condition is
    reached.

## 5. Checkpoint Report

```text
package and status
behavior completed
files changed and capability owner
contracts/configuration added or changed
data lineage verified
focused tests and result
protected regressions and result
responsive/live-provider/commercial evidence when applicable
remaining gap and risk
rollback readiness
next package recommendation
```

## 6. Global Stop Conditions

Stop the active package and do not widen scope when:

- provider docs/account behavior contradict the modeled capability;
- quote and submitted request cannot be proven identical;
- retry can duplicate provider tasks, Assets or Credit effects;
- a real-person reference lacks required authorization/trust;
- current Project data cannot be migrated additively;
- shared UI extraction regresses another Generation consumer;
- FFmpeg/runtime requirements cannot be guaranteed in deployment;
- final audio/assembly pricing policy is needed for paid exposure;
- an unrelated user-authored worktree change conflicts with the task.

## 7. Definition Of Plan Completion

The plan is complete only when Package 007 records either a release pass or a
deliberate internal-only decision with every remaining gate named. Generating a
single provider clip, rendering the new UI or creating a local MP4 alone is not
plan completion.
