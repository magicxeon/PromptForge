# P3 - Video Processing

Status: Planned. Depends on P1 platform, model/capacity benchmark and commercial decision if billable. Owner: [004](../004-video-processing.md).

## Tasks In Order

1. Define selected source Take/Asset and rendition lineage contract with Cinematic and Assets; record how a processed rendition affects download, continuity and last-frame extraction only after explicit user selection.
2. Build fixture matrix for FPS/VFR, codecs, portrait/landscape, audio/no-audio, dark/rainy motion, two faces and malformed/oversize clips; establish output tolerances and runtime budgets.
3. Qualify upscale, denoise, interpolation and encode adapters separately, checking license, temporal quality and hardware costs. Keep unqualified options hidden.
4. Add validated probe -> bounded worker -> operation pipeline -> AV sync check -> checksum -> immutable derivative registration. Test interrupt/resume, cancellation, idempotency, temp cleanup and source preservation.
5. Add explicit operation preview, status and selectable rendition without auto-changing the approved Take. Preserve existing Produce selection and downloads at mobile/tablet/desktop.
6. Run focused video/API/security/Cinematic regression checks and explicit aggregate; manually review complete clips and sync. Paid release additionally requires Credits quote/settlement/refund proof.

Record runnable commands and isolated prerequisites at implementation time. Benchmark any warm model cache with TTL/size/budget before using GPU workers. Advanced video repair is a separately qualified extension of this plan, not an automatic P3 promise.
