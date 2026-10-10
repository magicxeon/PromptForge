# TUT-003 Private Video Upload And Streaming

**Status:** Proposed local POC architecture; limits/retention need approval.

## Ownership And Lifecycle

Tutorials authorizes course edits/access. Assets owns upload, media metadata,
private storage and processing through its public facade; it never grants course
entitlement. Reuse existing probing/poster/process helpers after inspection.
Do not dispatch a paid AI Generation job or duplicate its provider polling.
Post-processing-service integration is optional future work, not a POC dependency.

Upload lifecycle: created -> receiving -> uploaded -> validating -> processing
-> ready, with failed/cancelled terminal attempts and explicit retry/new attempt IDs.
Processing state is durable across restart and bounded by concurrency/time/resource
limits. Retry must not attach duplicate assets or repeat an already-complete conversion.

- Stream upload to disk with backpressure; no whole-file Base64/browser persistence.
- Validate declared and observed size/type, checksum, decodability, duration and
  ownership. POC accepts MP4 input; codec support is determined by probe, not suffix.
- Use server-generated storage keys; reject traversal, malformed playlists and
  arbitrary input URLs. Spawn FFmpeg with argument arrays, never interpolated shell commands.
- Keep originals, derivatives and partial upload states separate. Failed/partial
  output is not published. Cleanup uses an approved retention policy and checks
  active jobs/references; never delete financial records with media.
- Visible upload progress uses measured bytes; processing has honest status,
  cancellation and retry, not invented percentages.

## Local Streaming

Proposed baseline: one H.264/AAC HLS rendition at up to720p, preserve aspect ratio
and do not upscale. Player handles native HLS or a proven HLS adapter when needed.
Caption tracks are optional, not fabricated from video. Asset ready means probe,
playlist, segments, poster and browser playback checks pass.

Store private media under a configurable Assets-owned root, not `client/outputs`
or another public static mount. Resolve metadata paths through `server/config/paths.js`.
Tutorial metadata is proposed under `server/data/tutorials/` via repositories;
no runtime path is introduced by these documents.

Each playback session checks actor, feature gate, Course publication and Lesson
entitlement. Every manifest, segment, caption and protected derivative is gated
through authenticated delivery or short-lived scope-bound authorization.
An unguessable URL alone is not authorization. Scope tokens to asset/version and
session, bound lifetime, omit them from logs/referrers, and define revocation on
refund/role change. Define how the browser player authenticates: do not assume
the native video element attaches `apiRequest` custom actor headers.

Do not share private cached responses across users. Expired session renewal
rechecks entitlement and preserves position. Disable download UI by default, but
do not advertise this or HLS as DRM/capture prevention.

## Configuration And Future Providers

Configuration candidates: enabled/adminOnly, privateRoot, ffmpeg/ffprobe path,
maxUploadBytes, maxDurationSeconds, upload concurrency, conversion concurrency,
processing timeout, rendition, segment duration, playback session TTL, partial
upload retention and storage quota. Validate safe bounds; expose no secret paths
or credentials in public feature configuration. Defaults finalized from sample files.

Keep storage, conversion and delivery adapters independent. Cloud options:

- [AWS S3 + MediaConvert + CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/on-demand-streaming-video.html).
- [Google Cloud Storage + Transcoder API](https://docs.cloud.google.com/transcoder/docs/concepts/overview)
  with CDN delivery; recorded tutorials are VOD, not a live-stream service.

Cloud choice requires measured catalog hours, viewing minutes, region and egress;
no cloud account/deployment or speculative cost promise in this POC.

## Acceptance

- Interrupted upload/processing recovers or reports failure without exposing partial video.
- Seeking and playback work locally in target desktop/mobile browsers.
- Unauthorized direct manifest/segment/asset requests fail even with copied URLs;
  malformed paths and cross-course tokens fail; revoked access stops renewal.
- Upload/transcode memory, disk and concurrency are bounded; original is retained.
- Video tests use tiny synthetic clips, no paid provider calls or private customer media.
