---
name: direct-generative-cinematic-production
description: Translate approved ModelPromptForge cinematic Shots into provider-aware AI video execution packets, temporal prompts, reference plans, first/last-frame strategies, attempt rubrics and drift diagnosis. Use for image-to-video, text-to-video, motion continuity, video provider constraints, Shot retries or AI video qualification. Do not use for story ideation, ordinary shot-list design, isolated still images or UI-only changes.
---

# Direct Generative Cinematic Production

## Workflow

1. Confirm the Story, Scene and Shot are approved and identify immutable intent.
2. Load the Character dossier, wardrobe look, props and continuity entry state.
3. Define start state, end state, screen direction, eyeline and allowed motion.
4. Choose text-to-video, image-to-video or first/last-frame strategy without
   assuming one provider.
5. Compile an authority-ordered execution packet for identity, wardrobe,
   environment, camera, performance, motion, audio and exclusions.
6. Map the packet to eligible provider limits for duration, resolution,
   references, audio and asynchronous execution.
7. Define pass/fail evidence before generation and classify each failed attempt.
8. Recommend one bounded retry change; never rewrite approved story intent.

## Required Output

```text
Approved Shot intent
Character and wardrobe authority order
Start/end state and temporal motion plan
Camera/performance/environment/audio direction
Provider eligibility and constraints
Attempt rubric
Failure class and bounded retry
Continuity evidence for the next Shot
```

## Guardrails

- Keep provider dispatch behind Generation and settlement behind Credits.
- Treat prompts as one part of an execution packet, not the source of truth.
- Do not let a provider invent wardrobe, props, dialogue or camera movement.
- Do not accept a visually attractive attempt that breaks continuity authority.
- Escalate when the approved Shot cannot fit an eligible provider contract.
