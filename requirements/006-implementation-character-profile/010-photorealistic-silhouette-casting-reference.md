# Photorealistic Silhouette Casting Reference

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented; automated validation passed, provider visual QA pending  
**Owner:** Character Profiles with Generation prompt compilation

## 1. Purpose

Make every newly generated Reusable Model Character Reference a clear,
professional photographic casting reference. It should reveal the selected face,
hair, skin, height relationship, body shape and proportions without measurement
graphics, styling noise, or a synthetic CGI appearance.

The supplied visual reference establishes the stance and silhouette-reading
intent only. Momelo must not reproduce its text, height/weight panel, ruler,
isolated foot inset, identity, jewelry, or branded styling.

## 2. Scope

This policy applies to new `reusable_model` Character Sheet generations and new
Casting Export attempts. It does not alter:

- existing approved Character assets or historical policy metadata;
- `styled_character` outfit-bound sheets;
- Character usage in Scene Builder or Fashion Blueprint;
- deterministic card and face derivatives.

## 3. Three-view Layout

One square canvas contains exactly three equal-scale full-body photographs in
one horizontal row:

1. front, facing the camera;
2. exact side profile, facing viewer right;
3. back, facing directly away.

Every view uses the same identity, body proportions, scale, camera height and
lighting. The exact side view keeps face, nose, torso, hips, knees and toes in
one direction. The output must include complete feet with safe margin, but must
not contain a separate foot close-up or measurement diagram.

Stance:

- neutral upright anatomical reference stance;
- feet grounded around hip width;
- knees straight but not locked;
- pelvis and shoulders level;
- spine naturally aligned;
- arms relaxed beside the torso;
- hands open and readable;
- no crossed legs, hand-on-hip gesture, fashion pose, prop, or dramatic action.

## 4. Casting Outfit

The outfit exists only to reveal the silhouette. It has no downstream garment
authority.

Female presentation:

- opaque matte medium-gray fitted short-sleeve athletic top;
- deep rounded scoop neckline ending securely above the cleavage line;
- top ends cleanly at the natural waist;
- matching fitted high-rise short upper-thigh athletic shorts with a short
  inseam and complete seat and groin coverage;
- thin evenly spaced white contour-grid lines printed on the fabric;
- a narrow natural midriff gap is acceptable when caused by the waist-length
  top;
- never lingerie, underwear, swimwear, transparent material, exposed cleavage,
  high-cut leg openings, thong-like cuts, or sexualized styling.

Male presentation:

- opaque matte medium-gray fitted short-sleeve high crew-neck athletic T-shirt;
- top ends at the natural waist and the torso remains covered;
- matching fitted mid-thigh athletic shorts;
- thin evenly spaced white contour-grid lines printed on the fabric;
- never underwear, swimwear, transparent material, exposed torso, exaggerated
  muscle enhancement, or sexualized styling.

Unknown or neutral presentation uses the covered high crew-neck variant. All
uniforms are unbranded. The fabric grid follows the body surface but contains no
labels, numbers, symbols, measurement marks, decorative seams, or accessories.
The fit follows anatomy without compression, padding, lifting, reshaping,
concealment, flattening, or artificial enhancement.

## 5. Photographic Standard

- real adult human photographed in a real neutral studio;
- seamless matte light warm-gray background;
- square `1:1` canvas so three full figures are not compressed into portrait space;
- realistic adult head-to-body relationship around 1:7.5 to 1:8;
- full-length torso and naturally long legs without head enlargement;
- level eye-height camera at an 85-105mm full-frame-equivalent perspective;
- even neutral studio illumination with soft grounded contact shadows;
- realistic skin texture, individual hair strands, fabric tension and subtle
  photographic grain;
- no beauty-filter normalization of selected body proportions;
- never AI-art styling, CGI, 3D render, illustration, mannequin, plastic skin,
  or composited duplicate appearance.

The image remains unlabeled: no text, view title, arrow, number, ruler,
height/weight data, measurement line, border, divider, logo, watermark, inset,
or isolated body-part crop.

## 6. Version and Compatibility

Current policy markers:

```text
layoutId: character-casting-three-view-v5
uniformPolicyId: casting-uniform-gray-grid-v7
aspectRatio: 1:1
outputCount: 1
```

Historical v2/v3/v4 layouts and gray-grid-v4/v6/black-silhouette-v5 uniform records
remain readable and usable. They are not
rewritten and do not become invalid merely because the current generation policy
changed.

## 7. Canonical Implementation

```text
server/config/character-casting-policy.json
server/domain/character-profiles/characterCastingPolicy.js
server/domain/generation/generationRequestService.js
server/app/routes/creditRoutes.js
server/repositories/character-profiles/CharacterProfileVersionRepository.js
web/src/features/studio/attributes/attributeModel.ts
```

Character Profiles owns policy versioning. Generation owns final prompt
compilation and provider submission. React only presents a parity preview and
must not create another generation workflow.

## 8. Acceptance Criteria

- Female and male selections compile their intended covered casting outfit.
- Unknown presentation falls back to the neutral covered outfit.
- Clothing selections and Outfit references remain pruned for Reusable Model.
- Body attributes remain in the final prompt and are consistent across views.
- All three full figures and feet are visible with safe margin.
- No text, measurement annotation, foot inset, logo, or watermark is requested;
  only the unlabeled white contour grid printed on the outfit is allowed.
- Prompt explicitly requires real photographic output and rejects CGI/AI-art
  treatment.
- New Character snapshots record v5/v7 policy IDs and a `1:1` aspect ratio.
- Credit estimation uses the same normalized `aspectRatio`, `outputCount`,
  `generationMode`, reference count, and processing-plan fingerprint that the
  Generation request will enqueue. A stale client ratio such as `6:8` must not
  produce a quote that conflicts with the policy-owned `1:1` casting request.
- Existing Character records created under earlier policy versions remain
  unchanged.
- Focused server and React prompt-parity tests pass.

## 9. Manual Visual Verification

Generate at least one adult female and one adult male Reusable Model using the
same provider/model. Confirm identity, body attributes, exact side orientation,
complete feet, hand readability, uniform coverage, background separation and
photographic realism. Repeat any candidate three times before treating the
provider as reliable for this layout.

## 10. Validation Record

Automated validation for policy v4/v7 completed on 2026-08-07:

- Character casting, lifecycle, generation-mode parity, and Scene reference
  regression coverage: 33 passed.
- React attribute preview policy: 13 passed.
- React TypeScript project check: passed.
- React lint: passed with two pre-existing non-blocking warnings.
- Casting policy JSON parse and Git whitespace validation: passed.
- Credit estimate and Generation-context parity regression: 2 passed.

Provider visual QA remains manual because it consumes generation credits and
must assess photographic realism, anatomy, exact side orientation, and outfit
coverage from actual generated pixels.

## 11. Attribute Prompt Composability

Character options must remain orthogonal when compiled together:

- `Height Impression` owns perceived height and leg-to-torso relationship.
- `Model Build` owns frame width and overall mass, not bust/waist/hip geometry.
- `Body Silhouette` owns bust/waist/hip relationships and view consistency.
- `Tone` owns skin color only; `Skin Texture` owns pores and surface detail.
- `Beauty` must describe natural facial character without requesting a doll,
  synthetic face, or beauty-filter finish.
- Adult age options must use unambiguous adult wording when body anatomy is also
  selected.

Catalog prompt changes apply to newly reconciled selections. Historical job
prompts and generated assets remain immutable.

## 12. Three-view Anatomical Direction Regression

Repeated male casting generations exposed occasional mixed body direction in
which the torso, legs or feet did not belong to the same view. The current
layout policy must treat every figure as one continuous anatomical chain:

- front view: face, sternum, pelvis, kneecaps and toes all face the camera;
- exact right-facing side view: head, torso, pelvis, knees, ankles and toes all
  face viewer right; and
- back view: head, shoulder blades, pelvis, backs of knees, heels and backs of
  the feet all face directly away from the camera.

The provider must not mirror only the lower body, rotate feet independently,
splice a front-facing leg set onto the back figure, or mix front/side/back
anatomy within one silhouette. The versioned layout advances to v5 while v4
remains an accepted historical casting candidate for owner approval.

Normal Character Sheet authoring may request 1-4 independent candidates under
Requirement REACT-GEN-018. `characterSheetConfig.outputCount` continues to
describe one canonical candidate image, while Generation Group lineage records
the logical requested count.
