# Sketch Storyboard Production

Owner: Cinematic storyboard compiler, video reference plan and Generation facade.
New storyboard images use monochrome graphite/charcoal sketch: readable silhouettes,
hand/prop contacts, perspective and motivated light, no panels, labels or lettering.
The opening pose is before action, not aftermath. Character references preserve
identity/wardrobe only. Existing photoreal stills and approvals remain unchanged.

Video must interpret an approved sketch as composition reference Image 1, then
ordered Look Sheets; never immutable first_frame or sketch-to-real transition.
Add an explicit composition-reference contract, preserving .env's disabled real
first-frame transport. Count every reference in quote and submit, validate owner,
hash and source again before dispatch. Existing Look rules/fallback remain owned
by Generation; sketch is not granted trusted Seedream identity authority.
Source style must be server-derived from generated provenance, not client claims.
Do not automatically reinterpret old realistic frames as approved sketches.
No silent retries, paid generation or changed selected Take. No-person Shots keep
their existing supported path. Provider visual quality is manual UAT.
Status: implemented; offline compiler, source and quote/dispatch checks passed.
Provider acceptance and visible video quality remain manual UAT, not guaranteed.

## Photographic Fidelity Prompt Follow-up

Scope: prompt wording only, base-implementation-owner. User's live-action rainy
street reference is the visual target, not colored concept art. Storyboard remains
a graphite sketch but uses life-study anatomy, real-world scale, lens perspective,
continuous tonal depth and restrained marks instead of stylized illustration.
Video reconstructs real actors, practical materials and physical lighting from
frame one; the sketch supplies staging only, never texture, outlines or shading.
Authored time/weather, identity, wardrobe, action order and camera remain unchanged.
No transition from sketch to realism, 2.5D cutout motion or painted environments.

Tasks: (1) update still policy; (2) strengthen sketch and ordered-reference video
wording; (3) remove source-texture preservation from ModelArk's shared suffix.
Keep budgets, reference modes, approval, Credits and existing Takes unchanged.
No automated tests or paid generation in this follow-up, explicitly requested by
the user. Manual next-generation visual comparison remains required; prompt wording
cannot guarantee provider output quality. Existing rendered images are not altered.

## Ordered Implementation

1. Done: storyboard provider prompt policy version 3 draws graphite concept art;
   existing Shot identity, performance, spatial and lighting direction is retained.
   Video packet policy version 6 supplies the separate photoreal execution wording.
2. Done: Generation derives `storyboardRenderStyle=concept_sketch_v1` for Cinematic
   Scene stills, saves it with History, then approval adopts it into immutable Assets.
   The approved-source DTO exposes this field. Client-supplied style is not authority.
3. Done: reuse `storyboard_and_looks`; add `sketch_composition` reference purpose
   and `composition_reference` packet strategy. Sketch is Image 1; Looks follow in
   Cast order. No-person Shots may submit the sketch alone on a supporting model.
4. Done: Generation validates owner, Asset type, immutable source fingerprint, bytes,
   dimensions, count and model capabilities before pricing/reservation. Sketch bytes
   use the existing verified Asset loader and Base64 transport; Look trust/expiry/
   fallback remains unchanged. A real first_frame remains blocked by the .env switch.
5. Done: Produce exposes Use storyboard sketch. Approval defaults new sketch Shots
   to composition plus Looks unless the creator explicitly saved Looks-only mode.
   Existing realistic approvals are never reclassified; generate and approve a new
   storyboard to opt into this path. Rejections do not remove images or trigger retries.
6. Passed: `sketch`, `sketch-quote`, `still-policy`, `produce` and video packet tests.
   Quote/submit test uses stub Credits/provider, verifies one reference_image Base64
   and rejects a forged style before another estimate. No paid request was submitted.

Compatibility: this explicitly extends produce-video-pipeline/017 for composition
sketches; it does not enable first-frame transport, relax Look identity checks,
or claim that a provider accepts every sketch.
