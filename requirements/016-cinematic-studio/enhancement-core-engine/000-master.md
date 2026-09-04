# Cinematic Core Engine And Progressive Authoring Master Requirement

**Status:** Core, Storyboard keyframe refinement and media-first Shot layout implemented; paid-provider qualification pending  
**Capability owner:** Cinematic  
**Primary role:** Product and Requirement Architect  
**Reviewers:** Cinematic Experience Director, UX/UI Product Designer, QA Release Engineer at implementation gates  
**Triggered skills:** `design-cinematic-experience`, `direct-generative-cinematic-production`, `review-product-ux`, `implement-generation-workflow`, `verify-release-regressions`  

## 1. Outcome

Create one canonical Cinematic authoring and compilation flow from Setup through
Cast, Story Plan, Storyboard, Produce and Finish. The flow must remain approachable for
ordinary users while retaining complete professional direction for AI and
advanced users.

Simple and Advanced are two projections of the same persisted Cinematic
contract. They must never become separate Project formats, separate save paths,
or separate prompt pipelines.

The completed capability must provide:

- a short, understandable Simple authoring path;
- AI-assisted completion of professional Scene and Shot direction;
- full Advanced editing without losing Simple edits;
- explicit field provenance, lock and stale state;
- traceable data handoff between every Cinematic stage;
- one server-owned Storyboard keyframe compiler for manual and batch work;
- provider-independent Story, Scene, Shot and continuity authority;
- reusable UI and workflow components with clear ownership;
- staged implementation with focused tests after every checkpoint;
- regression protection for every unchanged Cinematic function.

## 2. Problem Statement

Cinematic Studio already stores rich Project, Cast, Story Plan, Scene and Shot
attributes. The attributes are valuable downstream, but their current
presentation and ownership create four risks:

1. ordinary users are asked to understand professional directing fields before
   they can continue;
2. Simple completion, AI proposals and Advanced editing do not yet expose one
   explicit field-authority model;
3. final Storyboard prompt assembly remains partly client-owned and hard-coded;
4. data can exist at one stage without a systematic, testable linkage report
   proving that the next stage received the correct IDs and authority.

This enhancement corrects those risks without redesigning unrelated screens or
replacing the existing Cinematic, Generation, Reference Processing, Asset or
Credit workflows.

## 3. Canonical Flow

```text
Setup intent
  -> Story Role Slots
  -> Cast Assignments and approved Character Looks
  -> Story Plan and Beat structure
  -> Scene Director Simple intent
  -> AI-completed or manually authored Advanced direction
  -> canonical Scene and Shot contract
  -> Storyboard Keyframe Contract
  -> shared Generation estimate and submission
  -> approved Storyboard source
  -> provider-aware video execution packet
  -> approved current video source
  -> Finish timeline and export eligibility
```

Each downstream stage narrows its parent. It must not silently invent a new
Character, Look, story event, emotional state, prop, environment state or
screen direction.

## 4. Non-Negotiable Product Rules

1. Simple mode is the default shortest safe path.
2. Advanced mode exposes expert depth but does not change data ownership.
3. AI generates proposals and derived details; it does not silently replace
   locked user decisions.
4. Saving in either mode persists the same canonical Scene and Shot shape.
5. Switching modes never clears populated values.
6. Fields hidden in Simple mode remain persisted and available downstream.
7. A changed upstream field marks only dependent derived fields stale.
8. Manual Storyboard generation and Generate All use the same server compiler.
9. Provider dispatch remains owned by Generation and Credit state remains owned
   by Credits.
10. Existing Stage navigation, Cast/Look ownership, approval, Queue, Job Center,
    History, Collection and recovery behavior remain operational unless an
    acceptance criterion explicitly changes them.

## 5. Requirement Package

| File | Purpose |
|---|---|
| `001-current-state-scope-and-gap-analysis.md` | Current ownership, confirmed gaps, scope and preservation contract |
| `002-canonical-contract-and-field-manifest.md` | One persisted contract, field metadata, provenance, locking and stale rules |
| `003-data-lineage-and-stage-handoff-verification.md` | Required data linkage inside and between every Cinematic stage |
| `004-simple-advanced-and-ai-authoring-flow.md` | User-friendly interaction, AI proposal and recovery behavior |
| `005-core-orchestration-prompt-configuration-and-compilation.md` | Server ownership, recipe configuration and keyframe compiler |
| `006-reusable-component-consolidation.md` | Component reuse map and safe consolidation sequence |
| `007-step-by-step-implementation-plan.md` | Ordered implementation checkpoints and test gate after each step |
| `008-cinematic-specific-test-suite.md` | Domain, API, UI, integration, E2E and visual regression cases |
| `009-storyboard-keyframe-visual-intent-and-natural-realism.md` | One-frame visual semantics, concise keyframe prompt, hidden realism profile and theme-safe preview |
| `010-storyboard-shot-modal-media-first-layout.md` | Preview-first Shot modal hierarchy with the canonical prompt and optional additional direction grouped together |
| `011-unified-story-plan-direct-review-and-visual-repair.md` | One-button Story Plan generation, AI direction, bounded visual repair and final readiness evidence |

## 6. Capability Ownership

| Responsibility | Canonical owner |
|---|---|
| Project, Stage, Story Plan, Scene, Shot and continuity state | `server/domain/cinematic/` |
| Character Profile and reusable Character Look lifecycle | Character Profiles capability |
| Final image/video generation lifecycle | Generation capability |
| Reference authority and provider reference limits | Reference Processing capability |
| Quote, reservation, settlement and refund | Credits capability |
| Prompt recipe files and provider/model catalogs | `server/config/` with schema validation |
| Cinematic route composition and authoring UI | `web/src/features/cinematic/` |
| Reusable generation presentation | `web/src/components/generation/` |

The implementation extends `CinematicApplicationService` as the public
Cinematic entry point. New focused services remain internal to Cinematic. No
route or React component may assemble a parallel persistence or generation
workflow.

## 7. Scope

In scope:

- field inventory and downstream-consumer mapping;
- additive canonical authoring metadata;
- Simple/Advanced field projection;
- AI proposal, apply, lock and stale-field behavior;
- Story Plan, Scene and Shot readiness findings;
- data-lineage report and handoff validation;
- server-owned Storyboard Keyframe Contract compilation;
- provider-independent Produce video packet compilation;
- deterministic Finish timeline and export-source reconciliation;
- consolidation of genuinely repeated Cinematic UI/workflow components;
- Cinematic-specific automated and manual test coverage;
- legacy Project compatibility and staged migration.

Out of scope:

- new image or video providers;
- provider pricing or Credit policy changes;
- replacing the Queue, Job Center, Asset or Reference Processing lifecycle;
- redesigning global navigation, AppShell, Setup content, Cast Look preparation,
  Storyboard media actions or Produce controls unrelated to this flow;
- live database migration;
- automatic approval of Story Plans, Looks, Storyboard sources or video output.

## 8. Delivery Gates

Implementation is complete only when all gates pass in order:

1. baseline and preservation tests recorded;
2. canonical field manifest accepted and schema-tested;
3. additive Project compatibility proven for old and new Projects;
4. stage linkage report validates Setup through Finish/export handoff;
5. Simple mode passes usability, keyboard and responsive checks;
6. AI fill preserves locked fields and reports stale dependencies;
7. manual and batch Storyboard requests compile identically;
8. approved references and downstream video packets remain valid;
9. full Cinematic and shared Generation regression suites pass;
10. no out-of-scope UI or behavior change remains in the scoped diff.

## 9. First Safe Implementation Gate

Begin with field inventory, manifest schema and read-only data-lineage reporting.
Do not move prompt compilation, change persistence shape, or redesign the Scene
Director until the report proves current source and consumer paths.

## 10. Implementation Result

Steps 0-11 were implemented in dependency order. The canonical runtime now has
one additive authoring contract, read-only data-lineage projection, server-owned
Storyboard keyframe contract, server-owned Produce video packet and deterministic
Finish timeline compiler. Manual and batch Storyboard generation enter the same
Cinematic batch command and retain Generation/Credits ownership.

Automated Cinematic, Storyboard, Video, shared Generation, React, TypeScript,
i18n and production-build gates passed. Live paid-provider visual quality and
interactive 390px/820px/1440px viewport evidence remain manual release
qualification; they do not change deterministic ownership or persisted data.
See `implemetation-plan/006-execution-log.md` for exact evidence and known
repository-wide baseline failures outside Cinematic.

Package 007 then added one-frame visual semantics, a concise v2 keyframe prompt,
an optional hidden natural-camera execution profile and scoped theme-safe prompt
presentation. Deterministic server, full Web and local browser gates passed.
Paid-provider visual scoring remains a release qualification rather than an
automated implementation step; see
`implemetation-plan/007-storyboard-keyframe-visual-intent-and-natural-realism.md`.
