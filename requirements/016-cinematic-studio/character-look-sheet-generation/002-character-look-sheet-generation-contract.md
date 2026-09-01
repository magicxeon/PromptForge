# Character Look Sheet Generation Contract

**Requirement ID:** `016-CLSG-002`  
**Priority:** P0  
**Status:** Implemented; provider qualification pending

## 1. Operation

Add one provider-neutral Generation operation:

```text
character_look_sheet
```

This is the Character Profiles workflow operation and lineage name. Provider
execution deliberately maps to the existing canonical `character-sheet` image
Generation mode, so estimate, reference processing, Queue and provider routing
are reused rather than duplicated.

## 7.1 Implementation Record

- Recipe: `server/config/prompt-recipes/character-looks/look-sheet.v1.json`.
- Authorized plan: `CharacterLookService.getGenerationPlan`.
- Stable HTTP projection: the Look Version `generation-plan` endpoint.
- Generated result adoption: `CharacterLookService.attachGeneratedReview`.
- The server rechecks actor ownership, active source-ready Look Version,
  Character/Profile lineage and owned output before review adoption.

It produces one compact continuity authority for one pinned Character Profile
Version and one source-ready Character Look Version. It does not generate a
Scene, expression library, fashion editorial image or video.

## 2. Required Authority

The server resolves stable IDs and authorized Assets. React submits no private
raw URL or Base64 payload:

- Character Profile ID and pinned Character Profile Version ID;
- Character Look ID and active source-ready Version ID;
- canonical face/identity authority from Character Profiles;
- Full Look or supported Separate Pieces authority, or an accepted AI wardrobe
  suggestion snapshot;
- rights and reuse authorization;
- optional Cinematic Project/Assignment IDs only as bounded story context;
- global prompt recipe ID/version resolved by the server.

Missing identity, garment authority, ownership or an active source-ready
version blocks quoting before Credit reservation.

## 3. Canonical Output

One high-resolution image contains:

- complete neutral front view;
- exact side view;
- complete back view;
- canonical neutral face crop;
- no more than two garment details when needed;
- consistent identity, apparent age, proportions, hairstyle and outfit;
- neutral illumination, stable scale and neutral A-pose;
- no text, labels, measurements, logos, props, scene background, expression
  matrix, duplicated people or T-pose.

The durable result is one generated Asset. Review stores a versioned normalized
crop manifest for `front`, `side`, `back`, `face` and optional details.
Derived crops are replaceable reference-processing outputs, not additional
Look authorities.

## 4. Prompt And Reference Plan

- Canonical recipes live under `server/config/prompt-recipes/character-looks/`
  with schema validation, semantic version and fingerprint.
- Project/user text is bounded runtime input and never becomes a global recipe.
- Reference Processing decides ordering, preprocessing, crop selection and the
  effective reference count for the selected model.
- The quote and submitted Job must contain the same recipe fingerprint,
  provider/model, dimensions, output count and reference-plan fingerprint.
- Provider capability data remains in the server provider catalog, never in
  React.

## 5. Provider Qualification

A model is eligible only when repeated evidence shows that it can:

- accept the effective identity and wardrobe reference plan;
- output the required sheet dimensions and one-person layout;
- preserve identity and outfit across all required views;
- avoid copied text/logo artifacts and unintended scene composition;
- return a durable output compatible with Asset adoption and crop review.

Unsupported models are hidden. A provider/model with unknown price or
reference parity cannot be customer-paid.

## 6. State And Errors

| Condition | Stable outcome |
|---|---|
| identity incomplete | `character_look_identity_not_ready`; no quote |
| source Look not active/source-ready | `character_look_source_not_ready`; no quote |
| unauthorized reference | authorization error; no Job/Credit |
| reference plan unsupported | `character_look_reference_plan_unsupported` |
| no qualified model | qualification message; upload path remains available |
| output lacks required layout | attempt remains review-failed; no approval |
| source changes after quote | quote becomes stale and submission is rejected |

## 7. Implementation Steps

1. Add typed domain/HTTP/Zod contracts and stable error codes.
2. Extend Character Profiles with a read-only generation-context method that
   authorizes and snapshots the exact source Look Version.
3. Add the global recipe and strict provider-neutral prompt input/output schema.
4. Extend Reference Processing with the named Character Look Sheet plan.
5. Add capability filtering and qualification fixtures without enabling paid
   routing.
6. Add domain tests for ownership, stale versions, reference count, recipe
   provenance and output-layout validation.

## 8. Acceptance

- The same normalized source context is used for quote and submission.
- One result can be traced to Character, Look Version, references, recipe,
  provider/model, Job and Asset IDs.
- No source image is copied into Cinematic state or exposed across actors.
- The output contract is reusable from Character Profile and Cinematic entry
  points without duplicating generation logic.
