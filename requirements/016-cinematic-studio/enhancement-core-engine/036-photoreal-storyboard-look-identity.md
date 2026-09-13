# Photoreal Storyboard And Look Sheet Facial Authority

CORRECTION: [037](037-faceless-previs-and-shot-workspace.md) supersedes the new-still
facial reconstruction below. The user requires BLANK FACES in Storyboard; Look
facial reconstruction belongs to VIDEO. The previous offline results prove code
behavior only, not fulfillment of that clarified visual requirement. Existing
full-face images remain intact and honestly classified as their original style.
This document records the historical implementation, not the current still target.

Status: implemented; focused offline validation passed. Live visual UAT remains
creator-controlled. Owner: Cinematic prompt/reference contracts.
Primary: Product Requirement Architect. Reviews: Generative Media and QA,
applied sequentially in this session, not independent agent reviews.

## Outcome And Scope

The creator has validated a photoreal scene-reference plus Look Sheet workflow in
Playground. New Cinematic Storyboard stills must use live-action rendering and
explicitly reconstruct each face from that person's assigned Look Sheet.
This supersedes 031's graphite default for NEW generations only. Existing images,
approvals, Take history, selected video and authored Shot direction are preserved.

1. Render one full-color photographic opening moment, using project aspect,
   country style, authored location, time, light, action and pre-action contact.
   Do not hard-code Lalin, Kin, Korean style, ethnicity, age or 9:16.
2. Scene/composition references control framing, depth, head angle, pose and
   geometry, never facial identity, blank faces, guide lines or drawing texture.
   Explicit Shot hand/prop contact outranks incidental reference contact.
3. Each named Cast reference is the facial identity authority ONLY for its bound
   character: face shape, apparent age, eye/nose/lip proportions, skin tone, hair
   and body proportions. Use the portrait/front-face evidence within the sheet;
   no blended faces, swapped identities, beautification or copied sheet panels.
   Current Shot controls expression/gaze; approved outfit overrides remain valid.
4. Number references from Reference Processing's actual ordered manifest, never
   assume Image 1 is scenery or that Image 2/3 always exist. Preserve every mapping
   and the identity rule during budget optimization. No extra AI rewrite call.
5. New stills have server-derived `photorealistic_storyboard_v1` provenance in
   queue options, History, Group results and immutable Storyboard Assets. Keep
   `concept_sketch_v1` readable. Never relabel old or unclassified images.
6. Both known styles can use approved Storyboard plus Looks as `reference_image`
   composition, including environment-only shots on supporting models. Real
   `first_frame` transport remains governed by the existing disabled .env flag.
   Preserve owned asset/hash checks, model limits, quote/submit parity and errors;
   no automatic retry, removal of references or paid generation.
7. Video instructions remain photoreal and give each Look Sheet facial authority
   over incidental faces in the composition image. Legacy sketch execution works.
8. Reuse existing reference inputs. This change does not generate a second previs
   image automatically, invent a missing scene-reference attachment, or repurpose
   the previous Shot's style reference as this Shot's blocking/identity source.
   An optional separate scene-reference upload workflow is outside this prompt
   change; references actually present are the only numbered inputs.

## Ordered Implementation Tasks

1. Passed (16 focused tests): update owning still JSON policy, compiler authority wording and
   budget preservation. Validate named multi-Cast, single identity, no-person,
   scene-reference role boundaries and long direction/manifest input.
2. Passed (11 source/compiler checks, 2 quote/submit checks): propagate honest render-style metadata and extend existing composition
   reference handling across Asset, Cinematic, Generation and client schemas.
   Keep all legacy style, first-frame and Look-only behavior.
3. Passed (38 UI checks and six responsive locale/viewport checks): align video facial authority and neutral Storyboard toggle label.
   No layout redesign, provider table, storage path, endpoint or pricing change.
4. Passed: focused isolated checks, scoped diff, JSON configuration loading and
   TypeScript. Five compatibility tests retain idempotent approval, old media,
   Look-only input and prompt-budget/lineage protections.

## Acceptance And Verification

- New still prompt contains photoreal rendering plus each actual numbered facial
  authority; no affirmative graphite rendering, assumed country or missing image.
- Six named Cast bindings survive optional-direction compaction within budget;
  if mandatory authority alone cannot fit, fail explicitly before dispatch.
- New metadata survives approval; old/null metadata is not rewritten.
- Photoreal and legacy sketch composition quote/submit use reference_image with
  first frames disabled; forged authority is rejected before provider dispatch.
- Existing Look-only path, no-person composition and disabled real first frames
  remain intact. No live JSON migration or paid provider calls in validation.
- Extend `scripts/test-cinematic-simple-production.mjs` with focused selectable
  photoreal groups and an explicit offline aggregate. Document exact commands and
  results below. Human likeness, motion and provider acceptance remain manual UAT.

## Rollout And Rollback

Restart application/workers only after active generation ends; do not restart
them automatically. Generate and approve a NEW Storyboard to use the new style.
Old media remains accessible. Revert the new-output policy to the legacy style
for rollback while retaining both metadata readers and existing approved assets.

## Evidence And Handoff

Commands run in short groups, no paid requests or live-data mutations:

- `node scripts/test-cinematic-simple-production.mjs photoreal-prompts`: 16 pass.
- `node scripts/test-cinematic-simple-production.mjs photoreal-references`: 11 pass.
- `node scripts/test-cinematic-simple-production.mjs photoreal-quote`: 2 pass.
- `node scripts/test-cinematic-simple-production.mjs photoreal-ui`: 38 pass.
- `node scripts/test-cinematic-simple-production.mjs photoreal-compatibility`: 5 pass.
- `node scripts/test-cinematic-simple-production.mjs types`: passed.
- `node scripts/verify-cinematic-composition-reference.mjs`: EN/TH at 390, 820,
  1440px; neutral composition label and on/off/on control pass with first frames
  disabled, no horizontal overflow or unexpected requests. Screenshots in temporary
  directory `mpf-composition-reference-LhlJsI`; Thai mobile visually inspected.
- `git diff --check`: passed. JSON policies parsed through owning validators.

Explicit offline aggregate: `node scripts/test-cinematic-simple-production.mjs
photoreal-all`. Browser check needs an existing Vite server at 6501 (override
`CINEMATIC_WEB_ORIGIN`). Neither entry starts paid generation or restarts workers.
No file moves. New files: this requirement, the pure Cinematic render-style
contract and the owning isolated browser checker. No new runtime storage.

Review was sequential in the same session. The six responsive checks cover the
affected reference control, not a new full-application visual certification.
Default theme checked; other themes inherit existing unchanged controls/tokens.
Human likeness and provider acceptance for the newly integrated prompt require
the creator's next generation. Existing historical missing-History recovery gap
remains owned by 034, not silently expanded into this change.

Manual next step: once workers are idle, reload application processes, generate a
new Storyboard with selected Looks, review faces and approve it. In Produce retain
"Use storyboard composition" for the new image plus ordered Look references.
No previously approved image, selected Take or prior-plan video is deleted.
