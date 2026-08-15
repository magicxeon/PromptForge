---
name: design-cinematic-experience
description: Design professional ModelPromptForge Cinematic Studio stories, beats, shots, camera movement, lighting, performance, audio intent, and multi-shot continuity as structured generation plans. Use for video, film, shot-list, sequence, continuity, motion, or cinematic-scene requirements and reviews. Do not use for isolated still-image prompt wording, ordinary Scene Builder layout, or a single label change without sequence impact.
---

# Design Cinematic Experience

## Workflow

1. Establish audience, story objective, duration, format and emotional change.
2. Identify Character, face, body, wardrobe, prop and environment authorities.
3. Split the story into beats, then shots with duration and transition intent.
4. Specify camera, framing, movement, lighting, performance and audio per shot.
5. Build a continuity ledger across every shot.
6. Translate the sequence into provider-independent generation stages.
7. Add provider constraints, cost checkpoints, retry policy and qualification
   rubric without bypassing Generation or Credits.

## Required Output

```text
Story intent
Beat map
Shot list
Continuity ledger
Camera/light/performance/audio direction
Generation stages and cost checkpoints
Visual qualification rubric
Manual verification
```

## Guardrails

- Do not reduce a multi-shot sequence to one long prompt.
- Do not allow each shot to reinterpret identity or wardrobe independently.
- Do not promise continuity without repeated provider evidence.
- Do not copy protected expression from third-party reference media.
- Keep provider dispatch, Assets, References and Credits behind their owners.
