---
name: review-generative-media-pipeline
description: Review ModelPromptForge image or video provider routing, reference authority, structured prompts, identity and wardrobe continuity, qualification rubrics, provider constraints, and cost-quality evidence. Use for provider/model qualification, reference ordering, prompt structures, multi-stage media pipelines, or cross-shot consistency. Do not use for isolated UI, ordinary prompt copy, or deterministic workflow changes with no media-quality decision.
---

# Review Generative Media Pipeline

## Workflow

1. Define the visual operation and provider-independent success rubric.
2. Assign exclusive authority for identity, body, wardrobe, pose, scene, camera,
   lighting, motion and audio.
3. Inspect reference order, count, preprocessing and provider capability limits.
4. Separate deterministic contract checks from human visual scoring.
5. Use fixed inputs and repeated rounds for provider qualification.
6. Record Job IDs, model/version, resolution, references, duration, Credits,
   errors and manual scores.
7. Promote a route only when repeated evidence meets the owning requirement.

## Required Output

```text
Operation and authority map
Provider request contract
Qualification matrix
Cost/latency/error evidence
Visual scoring rubric and results
Promotion, conditional-use, or rejection decision
```

## Guardrails

- Do not infer quality from one successful image.
- Do not mix identity authority with pose/template identity.
- Do not expose private references or raw Base64 in logs.
- Do not hard-code pricing or dispatch outside canonical owners.
- Do not substitute automated tests for human visual qualification.
