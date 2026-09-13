# Facial Treatment And Video Lead-In

Status: implemented; contract/UI checks passed, visual UAT pending. Owner: Cinematic prompt/configuration and existing video workflow.

1. Add Shot.storyboardFacialTreatment = blank | white_previs, default blank.
   The Faceless boolean remains the switch; changing either setting affects new
   still requests only, with Project/Shot concurrency and no Shot-version bump.
2. White output style is white_previs_v1, derived by Generation from normalized
   settings and persisted in existing History/Groups/Assets. Normal and legacy
   styles stay readable. Every named Look is restricted to hair/body/wardrobe in
   this still; facial likeness/skin/features must not leak into the white surfaces.
3. Video uses the Scene image for layout, never pale faces or guide lines. Each
   own Look Sheet overrides facial identity, with complete visible faces at frame
   zero, respecting head direction and occlusion. Never force frontal faces.
4. A video using a white_previs_v1 approved source gets a default 500 ms lead-in
   from server JSON. Looks-only/text-only and other styles remain at zero.
   Example: 4 s usable + 0.5 s lead-in requires at least 4.5 s of source. Reuse
   provider duration reconciliation to select 5 s when supported; do not invent
   fractional provider support or silently exceed the model's maximum.
5. Manual event times remain authored relative to usable clip 0:00; compiled
   provider events and authored audio offsets shift by the lead-in. Hold the
   opening state during the buffer, then execute the full action interval. No
   event shortening/reordering or loss of the original 4 s of action.
6. Quote and submit use the same derived lead-in, actual render duration, prompt
   and references. Show usable/buffer/provider durations and bill the actual
   provider duration through existing Credits, with no flat extra fee.
7. Persist usable range and lead-in on each new Attempt. Default new Finish trim
   bounds to that range; respect explicit saved trim edits. Preserve original
   media and raw clip downloads/ZIP unchanged. Automatic re-encoding/cropping of
   downloaded clips is outside this change; raw files include buffer and padding.
8. Insufficient model duration fails before billing; old Attempts default to zero
   lead-in. No automatic additional video or face reconstruction generation.

Checks: policy branches/metadata; actor/version settings; exact 0.5 s offsets;
4 -> 5 duration quote/submit parity and maximum rejection; old Takes/trim unchanged.
Visual UAT: inspect usable start near 0.5 s, each face, identity and event order.
