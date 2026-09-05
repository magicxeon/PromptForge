# Produce Video Pipeline And Final Assembly Master Requirement

**Requirement ID:** `016-PVP-000`  
**Status:** Implementation in progress; Packages 001-002 complete, Package 003 deterministic gates complete with live qualification pending  
**Capability owner:** Cinematic Studio orchestration  
**Primary role:** Product and Requirement Architect  
**Reviewers:** Generative Cinematic Production Director, UX/UI Product Designer  
**Implementation gates:** Generation, Credits, Assets and QA owners  
**Triggered skills:** `direct-generative-cinematic-production`,
`review-product-ux`; implementation also triggers `implement-generation-workflow`,
`review-commercial-integrity`, `review-generative-media-pipeline` and
`verify-release-regressions`

## 1. Outcome

Complete the creator path from an approved Storyboard to individually reviewed
video Shots and one durable final film file without creating a second provider,
Queue, Credit, Asset or prompt pipeline inside Cinematic Studio.

The Produce screen must help a creator understand story order, select one Shot,
generate a motion attempt from the approved Storyboard keyframe, compare the
result with its direction and continuity contract, and approve or retry it.
After all required Shots are approved, Finish must assemble the active Timeline
into one playable and downloadable master Asset.

## 2. Product Promise

```text
Approved Storyboard sequence
  -> production readiness and cost
  -> generate one Shot or the eligible set
  -> Queue and durable provider tasks
  -> review motion, identity, wardrobe and continuity
  -> approve one current source per Shot
  -> arrange trims and transitions
  -> assemble and validate one final master
  -> preview, download and complete the Project
```

The shortest path remains understandable to an ordinary user. Provider-specific
depth is progressively disclosed and never replaces the Story, Scene or Shot as
the source of truth.

## 3. Current Baseline

The repository already has:

- a server-owned provider-independent video packet;
- one-Shot quote, Credit reservation, provider task, polling and settlement;
- durable generated video Asset copy and poster extraction;
- per-Shot attempt approval and stale Storyboard propagation;
- deterministic Timeline versions with trim and cut/dissolve/fade intent;
- an export manifest that intentionally returns `qualification_blocked`.

The baseline still does not yet provide:

- live provider qualification of the implemented same-account Seedream to
  Seedance 2.x Character first-frame route;
- a clean distinction between billable operation and provider input mode;
- provider-compatible Character/reference trust preflight;
- a durable multi-Shot video group;
- approved last-frame continuity evidence;
- technical media qualification before Shot approval;
- a final assembly Job or final master Asset;
- an audio-readiness rule for films that require dialogue or sound.

## 4. Requirement Package

| File | Responsibility |
|---|---|
| `001-current-state-and-compatibility-matrix.md` | Current runtime inventory, Seedance/provider compatibility and gap matrix |
| `002-produce-story-sequencing-and-ux-flow.md` | Produce information architecture, progressive disclosure and responsive states |
| `003-video-execution-contract-and-prompt-configuration.md` | Operation/input-mode separation, provider-neutral packet and configurable prompts |
| `004-seedance-activation-and-qualification.md` | Safe Seedance activation, trust policy, live evidence and rollout |
| `005-shot-batch-generation-and-review-lifecycle.md` | Single-Shot preservation, Generate Eligible Set, Queue, partial failure and approval |
| `006-continuity-last-frame-and-media-validation.md` | Cross-Shot continuity strategy, last-frame Assets and technical/creative review |
| `007-final-assembly-audio-and-export.md` | Durable FFmpeg assembly, audio policy, final Asset and Project completion |
| `008-shared-components-and-regression-preservation.md` | Reuse map, component boundaries, themes, accessibility and protected behavior |
| `009-test-rollout-and-release-gates.md` | Automated, manual, live-provider, commercial and release gates |
| `010-produce-data-lineage-checklist.md` | Data handoff and fingerprint invariants from Storyboard through final export |
| `011-seedream-seedance-synthetic-character-keyframe-flow.md` | Same-account Seedream provenance, synthetic Character first-frame trust and Seedance 2.x POC recovery |
| `012-storyboard-and-look-video-references.md` | Dynamic Storyboard + 1..N Look references implemented and locally verified; strict first-frame remains default; live qualification pending |
| `implementation-plan/` | Dependency-ordered implementation packages; only one package may be active |

## 5. Capability Ownership

| Concern | Canonical owner | Produce responsibility |
|---|---|---|
| Story, Scene, Shot, continuity, approval and Timeline | Cinematic | Orchestrate and expose current authority |
| Provider/model capability and dispatch | Generation | Validate and execute video operations |
| Provider request/response mapping | Provider adapters | Translate a prepared request without changing intent |
| Reference authorization and provider trust | Reference Processing / Assets | Resolve only approved, compatible media |
| Quote, reserve, capture, refund and reconciliation | Credits | Own every financial state transition |
| Clip, last-frame, poster and final master media | Assets | Persist immutable owner-scoped media |
| Job, Group, polling, cancellation and recovery | Generation | Own durable async state |
| Produce and Finish interaction composition | Cinematic React feature | Present server truth through shared components |

Cinematic routes and React components must not call Seedance, FFmpeg, a Queue,
a repository or a Credit ledger directly.

## 6. Non-Negotiable Rules

1. The approved Storyboard Asset Version is the default immutable first frame.
2. A video attempt cannot be approved when its Storyboard, Shot, packet or
   reference fingerprint is stale.
3. `cinematic_draft_clip` and `cinematic_final_clip` describe product and
   billing intent; `image_to_video`, `first_last_frame` and
   `multimodal_reference` describe provider input mode. They are not one field.
4. Prompt text is compiled from structured authority and versioned
   configuration. No final prompt literal is assembled in React or routes.
5. Generate Eligible Set uses one immutable aggregate quote and durable child
   operations. It does not loop over the single-Shot endpoint from the browser.
6. One failed Shot does not invalidate successful unrelated Shots.
7. No Shot, batch or assembly is automatically approved.
8. Final assembly reads only the active Timeline and current approved video
   Assets. It never reads the latest provider URL or unapproved attempt.
9. A film with required audio cannot be marked complete while required audio
   authority is missing. A deliberately silent film must say so explicitly.
10. Existing Storyboard, Playground Video, image Generation, Job Center,
    History, Collections, Community, Credits and Cast behavior remains intact.
11. Draft and final clip are explicit operation/qualification tiers. The system
    must not force two generations by default or relabel a draft Asset as final.

## 7. Delivery Order

Implementation must follow `implementation-plan/000-master.md` in order:

1. freeze baseline and correct operation/input-mode contracts;
2. restructure Produce presentation without changing submission behavior;
3. qualify one Seedance first-frame vertical slice;
4. add durable Generate Eligible Set;
5. add last-frame continuity and media validation;
6. add final assembly, audio gate and final Asset;
7. run full regression, live-provider and rollout gates.

No package may begin until the preceding package records passing evidence or a
written blocking decision. Later packages may not duplicate an earlier
temporary path.

## 8. Launch Decisions And Safe Defaults

- The active Character POC target is Seedance 2.0 Mini, first-frame I2V, 9:16,
  720p and silent output using an exact approved Seedream 5.0 Lite source.
- Seedance 1.0 Pro Fast remains a non-Character lifecycle baseline and fallback;
  it does not replace the generated-source trust test required for Seedance 2.x.
- Every target must pass a separate final-clip quality gate before customer
  final-export eligibility.
- Seedance 1.5 remains blocked until its input-mode evidence is qualified.
- Seedance 2.x Character first-frame testing follows the synthetic generated-
  output trust gate in `011`; it remains internal and non-paid until live
  qualification confirms the configured same-account Seedream path.
- Every video model remains non-paid until live provider, visual, latency,
  failure and settlement evidence passes.
- Final assembly begins as a qualification operation with no invented Credit
  charge. Commercial ownership must approve whether production assembly is
  free, included or separately quoted before paid rollout.
- Exact generated dialogue is not assumed from a video model. Projects that
  require exact speech need an approved audio source or a later qualified
  `cinematic_audio` operation.

## 9. Relationship To Existing Requirements

This package closes an implementation gap; it does not replace the existing
Cinematic architecture:

- `../enhancement-core-engine/000-master.md` continues to own upstream authoring,
  field lineage, keyframe compilation and the provider-independent video packet
  and Timeline foundations already implemented;
- `../003-cinematic-generation-credit-and-media-contract.md` remains the broad
  Generation, Credit and media lifecycle contract;
- `../004-cinematic-mvp-delivery-and-validation-plan.md` remains the MVP checkpoint
  history and high-level delivery dependency;
- `../012-durable-video-poster-and-media-reconciliation.md` remains the canonical
  poster/reconciliation foundation and is extended, not forked;
- `../020-generation-providers/video/` continues to own provider catalog,
  provider contract and pricing research.

This package specifically owns the remaining Produce/Finish closure: normalized
video execution selection, Seedance qualification, multi-Shot orchestration,
continuity evidence, final assembly and the user-facing review flow. When an
older document describes the current qualification-only Produce/Finish limit,
that statement remains true until the corresponding implementation package here
passes its exit gate.

## 10. Scope

In scope:

- Produce and Finish flow from approved Storyboard through final master;
- Seedance provider compatibility and internal activation;
- one-Shot and multi-Shot video generation;
- reference, timing, audio and continuity planning;
- technical and creative review evidence;
- final server-side assembly and owner-scoped download;
- reusable component consolidation required by this flow;
- additive schema/API changes and legacy Project compatibility.

Out of scope:

- changing Setup, Cast, Story Plan or Storyboard authoring semantics;
- automatic Story or Shot rewriting during Produce;
- advanced nonlinear editing, overlays, keyframed effects or compositing;
- voice cloning, public publishing or social distribution;
- enabling unqualified provider/model combinations;
- deleting historical Jobs, Assets, attempts or Credit evidence.

## 11. Requirement Closure

This requirement set is ready for implementation when all child files remain
mutually consistent and every open commercial/provider decision has a stop
gate. It is not implementation-complete until the final package produces one
durable, playable master from a multi-Shot fixture and all protected workflows
pass regression tests.
