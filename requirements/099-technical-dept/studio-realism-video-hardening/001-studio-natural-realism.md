# 001 Studio Natural Realism

Owner: Generation canonical prompt compiler. Status: implemented; deterministic tests passed.
Reference: ../Technical-Documents/momelo-character-generation-prompt-guideline.md.

## Contract And Tasks

1. Add one versioned config recipe and a small pure compiler helper. Enable only
   generationSurface=studio and generationMode=headshot, character-sheet, scene.
   Playground, Fashion and Cinematic must remain byte-for-byte unaffected.
2. Apply automatically, with no additional AI call or price change. Use subtle
   skin/eye/hair texture for portraits and distance-appropriate material, light
   and contact-shadow detail for sheets/scenes. Do not copy the guideline's
   fixed ethnicity, gender, age, camera, backdrop, outfit or five-panel layout.
3. Identity, apparent age, skin tone, expression, makeup, pose, template baseline,
   destination clothing and existing casting layout remain authoritative.
   Nonphotographic styles must not be converted to photography.
4. Compile through compilePromptFromGenerationContext so preview and dispatch
   share the policy. Record server-selected profile version in job options.
   AI Prompt Refine remains independent and must preserve these constraints.
5. Test all three allowed modes and excluded surfaces; check one-person scene,
   three-view sheet, age and template authority remain intact.

Acceptance: deterministic tests pass without provider calls. Perceptual quality
requires later user A/B testing; no claim that realism passes video moderation.
An end-user strength slider/toggle is not part of this bounded implementation.
