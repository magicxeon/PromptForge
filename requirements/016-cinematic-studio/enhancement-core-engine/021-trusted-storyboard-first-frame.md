# Trusted Storyboard First Frame

Status: implemented; isolated validation passed; provider UAT pending. Owner: Cinematic approved source; Generation trust/dispatch.

- Approved Storyboard is required only for frame-based Video. Implemented extension
  [PVP-013](../produce-video-pipeline/013-optional-first-frame-and-looks-only.md)
  makes this conditional: looks_only may use selected Cast sheets without a frame
  or with an existing frame disabled, preserving its image and approval. This
  exception is implemented with evidence in plan 003i. Keep storyboard_only
  as actual first_frame and storyboard_and_looks as reference_image. Clearly
  distinguish framing control; never send a Look Sheet as the Scene first frame.
- A Seedream 5.0 Storyboard with a server-owned trusted source binds its generation
  ID at approval/use. Resolve the original provider URL privately at dispatch,
  using the same Generation trust owner as direct Cast sheets. No browser URL.
- Verify original bytes/hash, actor ownership, same account, policy eligibility,
  and expiry at quote and before submit. Prior provider rejection is evidence,
  not a selection or retry gate (playground-video-reference-poc/015).
  No GCS/Base64 fallback for a
  required trusted binding; no fabricated trust from the provider name alone.
- Preserve other-provider/non-trusted existing handoff paths only where current
  capability policy permits; explicitly block unavailable trusted Seedance source
  with recovery, without replacing or regenerating the approved image.
- Historical approved sources may derive a binding from a verified source Job;
  never write a destructive backfill or accept a browser-supplied provenance claim.
- Tests: valid original handoff, missing/expired/foreign/changed image, binding
  spoof, reference-mode/count parity, no preflight charge, duplicate settlement.
  Live moderation acceptance is not implied by deterministic qualification.
