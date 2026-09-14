# 021-MODEL - Model Registry, Qualification And License Gate

Status: Planned. Minimal face-model qualification is required for P0; full image/video/audio registry precedes each later release. Owns source-proposal sections 20-24, 41, 44, 52-54 and 57.

## Registry Contract

Record each adapter's operation, artifact/version/hash, runtime, device profile, language/format support, input/output limits, measured cold/warm latency, quality tier, cost evidence, model-source link, code license, weight/checkpoint license, data/training restrictions where documented, permitted commercial use and review date. A recommendation in the original proposal is a candidate only, not permission to ship. Preserve model and policy versions on every Job/Asset.

Capability API exposes only models/operations that passed deploy-environment and licensing qualification. Failed, expired or unreviewed capability stays off. Rollback pins the previous qualified version and does not reinterpret old outputs.

## P0 Face Detection Gate

MediaPipe Face Landmarker is a local ML detector, not generative image synthesis. Pin Python package, runtime and model bundle with checksum; verify licenses for code and model separately. Confirm CPU performance, confidence thresholds, multi-face handling, profile/occlusion and orientation on representative private/consented fixtures. Default to safe failure when uncertain. Deterministic mask rendering has its own version and golden tests. Do not promise complete face detection from a single average accuracy metric.

The [official Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python) documents image-mode inference, face landmarks, confidence options and a default maximum of one face. P0 must configure the maximum explicitly and qualify the selected model bundle; the guide's code-sample license is not proof of that bundle's commercial rights.

## Benchmark And Release Evidence

Maintain private, access-controlled image/video/audio benchmark sets as relevant to each phase. Record input class, ground truth where available, model/hardware/options, duration, GPU/CPU usage, output hash, quality score, reviewer and failure reason. Image measures include identity retention and artifacts; video includes temporal/flicker and AV sync; audio includes WER/DER, Thai prosody and listening assessment. Representative edge cases and human review are mandatory for identity-sensitive operations.

## Acceptance

- Every enabled capability has documented rights, a pinned artifact and reproducible benchmark.
- Changing a model, mask policy or FFmpeg preset changes a version and triggers regression checks.
- Capability unavailability is visible and non-destructive; no silent alternate model choice.
- Production DoD includes privacy, cost, capacity, rollback, monitoring and owner signoff, not only a successful demo.

See [P0](implementation-plan/001-faceless-previs-first.md) and each phase plan.
