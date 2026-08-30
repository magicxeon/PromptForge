# Future Local Pose Proxy Processing

**Parent MVP contract:** `../020-generation-providers/qualification/001-fashion-model-qualification-and-routing.md`
**Related:** `../011-reference-processing-pipeline`  
**Status:** Deferred technical option; not required for MVP

## 1. Purpose

Requirement `009` owns the production `TemplatePoseProxy` contract, Gemini
Nano Banana Lite MVP processor, Dummy cache, Template workflow, credits and QA.
This document contains only the future option for preparing the same artifact
without paying an external generative-image provider for every new Template
pose.

The local implementation must be interchangeable behind the processor
interface defined by `009`. It must not introduce a second Template contract,
repository, queue, ledger or public API.

## 2. Candidate Local Architecture

```text
Node API
  -> PoseProxyJob
  -> Python CV Worker
       MMPose WholeBody
       SAM 2
       OpenCV
       deterministic mannequin renderer
  -> existing Template Pose Proxy Repository
```

Stable Diffusion/ControlNet or another locally hosted Docker worker may be
evaluated as an optional renderer or fallback behind the same interface. Local
model/runtime details remain infrastructure configuration and never enter the
Template domain contract.

## 3. Proposed Processing Stages

1. Detect exactly one primary person and reject ambiguous multi-person input.
2. Extract body, face, hand and foot landmarks with confidence values.
3. Segment the full person including hair, garments and accessories.
4. Normalize landmarks into a versioned pose contract.
5. Remove or cover the original person without changing the surrounding scene.
6. Render an identity-neutral mannequin aligned to the extracted pose.
7. Validate pose, hands, crop, scene and person-removal confidence.
8. Store private mask and diagnostics only when permitted by retention policy.
9. Return the same `TemplatePoseProxy` result shape and QA reason codes as the
   Gemini MVP processor.

Optional private pose diagnostics may include:

```text
canvas and subject bounds
body, hand, face and foot landmarks
joint angles and contact points
occlusion hints
camera and framing hints
per-region confidence
extraction warnings
```

These diagnostics are never exposed by public Template APIs.

## 4. Evaluation Gate

The local route must use the same private fixtures, scoring and exact-pose
acceptance thresholds as the Gemini MVP route. Compare:

- identity removal;
- pose and hand-contact fidelity;
- camera, crop, scene and lighting preservation;
- latency and cold-start behavior;
- CPU/GPU infrastructure cost;
- failure and manual-review rates;
- licensing and model-distribution constraints;
- deterministic reproducibility and operational support burden.

It may replace the Gemini processor only when total infrastructure cost and QA
failure cost are lower without reducing accepted fidelity. Provider removal by
itself is not enough justification.

## 5. Deferred Implementation Plan

1. Define the worker RPC/job payload from the processor interface in `009`.
2. Containerize the Python worker separately from the Node API.
3. Prototype MMPose WholeBody, SAM 2 and OpenCV processing.
4. Add deterministic mannequin rendering.
5. Benchmark Stable Diffusion/ControlNet only if deterministic rendering cannot
   meet scene and pose QA.
6. Review model licenses before bundling weights or enabling commercial use.
7. Run the complete Pose Proxy qualification fixture against both local and
   Gemini processors.
8. Add local worker health, timeout, retry, tracing and capacity controls.
9. Promote through versioned server configuration; do not alter existing
   Template versions or historical lineage.

## 6. Acceptance Criteria

- The local processor returns the same domain result as the MVP processor.
- Existing Template, quote, cache, ledger and Fashion execution code requires
  no provider-specific branch.
- Public APIs expose no raw landmarks, masks, private asset paths or local
  runtime details.
- Local failures can fall back only when the locked quote and policy permit it.
- Cache identity includes the local processor and strategy version.
- Quality and total operating cost pass the same release gate as Gemini.
