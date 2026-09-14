# 021-VID - Video Processing

Status: Planned, deferred P3. Owns source-proposal sections 11, 45, 50 and video portions of 41. It does not replace Cinematic's Take selection, last-frame extraction or Generation's provider submissions.

## Operations

Offer independent video upscale, denoise/sharpen, frame interpolation to a supported target FPS, stabilization when qualified, and safe re-encode/export. A named preset may compose operations in a documented order, but each user request must state the selected operations, output resolution/FPS/codec and expected duration. No surprise frame interpolation or face alteration. The source Take stays selectable while processing and after completion.

The source may be an owner-scoped Cinematic Take or another permitted Asset. The service consumes private media through [001](001-api-jobs-assets-and-security.md), writes an immutable derivative Asset and returns parent Take/Asset lineage. Cinematic may show a processed version as a selectable rendition, but it never changes the chosen Take or continuity source without an explicit action. Last-frame provenance must refer to the actual selected version.

## Technical And Quality Contracts

Probe duration, frame rate, variable-frame-rate behavior, codec, rotation, audio streams, subtitles, resolution and size before acceptance. Bound clip duration, decoded frames, output size, runtime and GPU allocation by capability. Preserve audio and audiovisual sync by default; a video-only operation must not silently strip or synthesize sound. Handle VFR, dropped frames and failed encodes with a terminal status and original intact. Emit machine-readable output metadata plus hashes, model/FFmpeg versions, job timing and measured usage.

Frame interpolation must preserve event order and avoid duplicating dialogue beats or changing the physical meaning of a Shot. Quality rubric covers flicker, ghosting, identity/face drift, temporal warping, edge artifacts, FPS consistency and audio sync. Compare frame samples and full-clip playback; machine metrics are supporting evidence, not sole approval.

## Acceptance

- Fixtures cover portrait 9:16, landscape, silent and audio-bearing clips, VFR, dark/rainy shots, two people, fast motion, damaged input and cancellation.
- Output has stable duration and declared FPS/resolution within a versioned tolerance; audio is preserved or explicitly absent as requested.
- Duplicate/restarted Jobs do not produce duplicate Assets or duplicate charges; existing Take playback, download and selection regressions pass.
- Production worker and paid operation remain disabled until model/license, benchmark, capacity and [Credits](008-usage-pricing-and-operations.md) gates pass.

See [video implementation plan](implementation-plan/004-video-processing.md).
