# Optional Faceless Stills And Complete Video Faces

Owner: Cinematic still/video prompt policies. Parent 038.
Status: implemented; offline prompt/flag/source-preservation checks passed.
Actual new-image/video appearance remains provider visual UAT, not certified.

## Still Toggle

- Per Shot, in both Advanced Storyboard and Simple first-frame generation.
- OFF by default: photorealistic_storyboard_v1, complete visible faces from each
  assigned Look Sheet. ON: faceless_previs_v1, smooth blank facial areas with only
  faint orientation guides; references still supply body/hair/wardrobe.
- Persist the preference separately from approved source metadata. Switching the
  preference affects NEW image requests only, does not relabel old outputs or
  invalidate the existing approved image/Take, and starts no generation.
- The canonical Generation compiler selects a complete coherent policy branch.
  No faceless phrases may leak into the OFF branch. Derive output style server
  side from the normalized request, never trust a caller's free-form style label.
- Single image, batch, quote/submission and History metadata must agree.
- Preference saves validate both current Project and Shot versions, but increment
  only Project.version. Shot direction/source versions and the approved video
  packet remain unchanged; concurrent generation is still bound to Project version
  and the exact flag at submission.

## Video Identity From Time Zero

Observed user video still has blank faces at 0:00. Reconstruct each visible
person's anatomically complete photographic face from their OWN Look Sheet BEFORE
the first output frame. Continue the same facial identity across motion, turns,
distance and occlusion throughout the take. Never reveal the blank previs as
frame zero or fade/morph facial features in later.

Scene reference controls camera/blocking/props/light, NOT facial appearance or
blank regions. Named Look references have overriding facial authority. Keep
eyes/nose/mouth consistent with actual head angle; do not force camera-facing
heads, paint features on the back of a head, invent an occluded face, or change
blocking to make faces visible. Preserve image-reference transport, reference
order and all assigned people. Missing/unsupported reference errors stay visible;
never drop a rejected image or silently resubmit.

Configurable policies supply concise positive identity instructions and negatives.
Manual timeline instructions must not conflict with generic 'one action' wording.
No extra image pass, face-edit service, retries, cost or provider capability claim.
Offline prompt assertions prove instruction delivery only. User checks first frame
and later visible faces in a newly generated video; failure remains recorded as
visual UAT evidence rather than declaring a model guaranteed compatible.
