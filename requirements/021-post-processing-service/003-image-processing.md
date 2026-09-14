# 021-IMG - Image Processing

Status: Planned, deferred P2. This document owns post-generation image enhancement from sections 10 and 45 of the [source proposal](../099-technical-dept/Technical-Documents/momelo-post-processing-service-implementation-plan.md). Faceless previs is owned by [002](002-faceless-previs.md) and ships first; it is not an upscale feature.

## Scope And Inputs

The service accepts a private, owner-authorized immutable image Asset through the shared [job and media contract](001-api-jobs-assets-and-security.md). Operations are separately selectable: upscale at supported 2x/4x tiers, face restoration, general enhancement/denoise, and format conversion. A model capability response defines valid combinations, resolution ceilings, formats and quality modes. No client hard-codes model limits. The source image and metadata remain unchanged; each result becomes a new Asset with parent linkage.

Face restoration is an explicit user choice, not an implicit step in every upscale. It must preserve authorized facial identity and avoid synthetic details presented as authentic. For Cinematic Look Sheets or approved keyframes, show before/after and require explicit adoption; existing reference and Storyboard approvals stay fixed until then. Never silently use a new derivative as identity authority.

## Processing Contract

Validate MIME from bytes, dimensions, alpha/color space, EXIF orientation and supported formats before reservation or dispatch. Normalize orientation and preserve or explicitly transform ICC/profile metadata. Bound decoded pixels, memory and output dimensions, not only compressed upload size. Return operation, model/version, scale, output dimensions, checksum, processing time and lineage. Multi-output variations are separate derivative IDs. Error or cancellation leaves original and any prior derivative intact.

The requested order is decode -> optional restoration/enhancement -> resize -> encode -> quality check -> Asset registration. The exact algorithm/order becomes a versioned preset after visual benchmarks; it must not be inferred from the source proposal's examples. Lossless/conversion controls should not imply recovered detail.

## Acceptance

- Dedicated tests cover orientation, alpha, large dimensions, malformed input, deterministic result metadata, cancellation and idempotent output registration.
- Golden before/after fixtures include portraits, text, low light, animation/illustration, and Storyboard stills; quality review checks identity drift, hallucination and artifacts.
- Capability flags hide unqualified models; opt-in UAT verifies provider-independent output and the old Generation flow still works.
- Future billing is gated by [008](008-usage-pricing-and-operations.md); documentation creates no charge or customer control.

See [image implementation plan](implementation-plan/003-image-processing.md).
