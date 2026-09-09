# 005 Download Export And Branding

2026-09-09: [023 Editorial Pattern](023-editorial-pattern-contract.md) makes
Download version-aware: v1 gets the heading below; v2 already contains visible
document text and gets only the footer/logo, with its complete image retained.

ID: CLSFE-005. Status: baseline implemented; remaining acceptance checks tracked in PLAN. Owner: Assets / media export.
Depends on 001 and immutable Generation metadata from 003.

## Non-Negotiable Boundary

The user explicitly changed branding to **Download time only**. Generation
completion, preview, History, Character reference and Video dispatch do not call
the renderer or rewrite media. Seedance rules and original bytes/URLs stay intact.
Exports have no trusted-generated eligibility and do not replace original IDs.

| Action | Initial behavior |
|---|---|
| Download new Look Sheet document | Compose document header + original sheet + footer/logo; download new PNG |
| Download merged Comparison | Compose selected run's authorized images + captions + footer/logo (006) |
| Ordinary single Image / old Character Sheet download | Existing behavior, unchanged |
| Video download / Video reference | Existing behavior, no watermark/transcode change |
| Community publish / profile cover / collection | Existing source and privacy policy, no exported derivative substitution |

No global watermark rollout is implied. Additional downloads may adopt the
public export contract in later explicit slices.

## Composition Contract

- One shared Assets facade, proposed `MediaExportService`, accepts an export kind
  and stable source IDs. It authorizes through each source owner's public read
  contract, then calls focused internal composition/branding helpers.
- Extend existing Sharp-based image infrastructure where suitable; do not
  repurpose ReferenceAssetService's wardrobe-composition policy as export policy.
- Initial export kinds: `look_sheet_document`, `comparison_merged`.
- Header prints the accepted name, age/range and role. Optional personality and
  outfit notes use only bounded snapshot fields; no raw prompt/reference payload.
- Keep text outside the unchanged image region. Use contain, no content-aware
  crop, face restoration, sharpening, enlargement presented as added detail,
  or extraction of presumed AI-generated panel coordinates.
- Reserve footer space for the logo; preserve complete heads/feet and artwork.
  Use packaged Thai/Latin fonts, explicit line wrapping and a pinned typography
  version. Long names/notes cannot overlap media/logo; never silently drop text.
  If bounded text cannot fit the permitted canvas at the profile's minimum font
  size, return `media_export_layout_overflow` rather than shrinking it to illegible
  text or cropping the image. Test maximum valid field lengths, not only examples.
- One-image baseline has a deterministic document frame, NOT deterministic
  internal identity panels. Full fixed-slot composition is deferred under 008.
- Do not embed prompts, private IDs/URLs, source EXIF secrets or API credentials
  in PNG metadata. Render only the document fields the owner expects to export.

## Logo Configuration

Proposed server configuration under `server/config/` contains:
`enabled`, `pngPath`, `version`, `placement: bottom-right`, `widthRatio`,
`insetRatio`, `opacity` and validated min/max pixel limits.

Default asset belongs under `client/assets/brand/`; derive PNG from the existing
approved Momelo mark, unless the owner supplies a replacement PNG. Do not create
a new AI logo. Keep aspect ratio and transparency. Logo replacement is an
operator file/config change, not a browser-provided arbitrary filesystem path.

Resolve configured paths under an allowlisted brand directory; reject traversal,
remote URLs, wrong MIME, excessive dimensions/bytes and unreadable assets.
Document exact replacement steps in an operator note during implementation.
Config reload occurs on process startup for the initial slice; no hot reload or
worker restart is performed automatically. A logo hash/version is part of the
export fingerprint. Replacing the file changes future downloads only.

Missing/invalid enabled logo fails the export with a clear retryable configuration
error; never return an unbranded original while claiming branded success.
An explicitly disabled configuration is honored, not a swallowed failure.

## Transport, Privacy And Bounds

Proposed thin endpoint: `POST /api/media/exports`, delegated to Assets facade.
Request contains kind/source ID, permitted run ID and export profile version;
never accept raw local paths, external image URLs or client-asserted ownership.
Comparison requests additionally carry the validated layout mode/policy contract
from 006. Resolve and pin arrangement server-side from the authorized run; screen
viewport, pagination and zoom are not export inputs.
Respond with attachment PNG and a sanitized filename. Extend apiClient with an
actor-aware binary response helper if needed; do not add feature-local fetch.

Initial access is owner-only for these private authoring/export surfaces.
Community/public export access is deferred, not inferred from visible thumbnail.
Reauthorize every request; reject deleted/inaccessible sources and mixed-owner
Comparison members without revealing their metadata.

Plan for bounded CPU exports in the current deployment. No new SQL, public export
store, GPU worker or independent billing/job system is required. Prefer streamed
response/bounded temporary output cleaned on completion, error or cancellation.
Never put private exports in public `client/outputs/` solely to download them.

Initial budgets to validate before release: at most six source images (also obey
the existing Comparison limit), 64 MiB aggregate encoded input, 16 megapixels
final canvas, 15-second render timeout, at most two active renders per process
and one per actor. Decode each source under existing input-pixel guards and
prepare sequentially/bounded, not all full-resolution buffers simultaneously.
These are proposed safety limits, not measured performance claims; benchmark
fixtures and record adjustments in PLAN before enabling downloads.

No new persistent cache initially. In-flight coalescing, if needed, is scoped by
actor + source hashes + run + resolved layout/layout policy version +
renderer/profile/font/logo versions, evicted on
completion/error/timeout; no private data shared across actors. Busy requests
fail clearly with 429 rather than an unbounded queue.

## Failure And Cost

Download is explicit and carries no new Credit charge in this slice. This is
CPU composition, not provider inference. No Generation reservation, capture or
refund is triggered. Disable repeated UI clicks while preparing; cancellation
and late response after actor switch must not deliver another actor's file.
Failure keeps the original result available and permits export-only retry.

## Error / State Matrix

| Condition | Proposed stable outcome | Recovery |
|---|---|---|
| Invalid kind/source/count | `media_export_invalid_request` (400) | Correct input; no render |
| Foreign/deleted/unavailable source | `media_export_source_unavailable` (404) | No metadata disclosure; refresh authorized source |
| Run/source snapshot changed | `media_export_source_changed` (409) | Reload the pinned result/run before retry |
| Input/output resource limit | `media_export_limit_exceeded` (413) | Explain permitted size/count; never silently drop images |
| Document text cannot fit | `media_export_layout_overflow` (422) | Clear error; original stays available |
| Renderer at capacity | `media_export_busy` (429) | Bounded retry hint, no hidden queue |
| Enabled logo/font config invalid | `media_export_configuration_invalid` (503) | Operator repair; no filesystem path exposed |
| Render timeout/failure | `media_export_failed` (503) | Retry export only, clean temporary buffers/files |
| User cancel/actor switch | Abort and discard late binary response | Original Generation remains complete |

The shared binary client must parse sanitized JSON errors as well as successful
PNG responses; an error response must never be downloaded as a `.png` file.

## Tasks

- [x] EXP-01 Define source-owner read projections, binary API and stable errors.
- [x] EXP-02 Add validated PNG/logo configuration and operator replacement note.
- [x] EXP-03 Implement bounded document layout/typography and branding primitives.
- [x] EXP-04 Add authorized export facade/route and cleanup/concurrency controls.
- [x] EXP-05 Wire Look Sheet Download across its inline result and image viewer;
  add a controlled callback where needed, preserving all unrelated downloads.
- [ ] EXP-06 Validate text, images, logo, source hashes, retry and access boundaries.
- [x] EXP-07 Measure render latency/memory and record budget/remaining capacity risk.

## Acceptance

EXP-A1: only a Download action generates a branded derivative.
EXP-A2: source hashes, trusted metadata and original URLs do not change.
EXP-A3: name/age are from the result snapshot, not the current form.
EXP-A4: authorized download works; foreign/deleted/arbitrary-path sources fail.
EXP-A5: logo and Thai/English text are legible; nothing is cropped or overlapped.
EXP-A6: failure/cancel/repeated click never regenerates or charges for an image.
EXP-A7: no private exported file becomes public or a Video reference automatically.
Groups: `export`, `privacy`, `layout-export`, `performance` in [009](009-verification-and-release.md).
