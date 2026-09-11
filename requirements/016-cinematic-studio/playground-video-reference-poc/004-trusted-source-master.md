# Seedance Trusted Generated Sources

Status: implemented; deterministic and mocked-browser checks passed. Live paid
provider qualification remains pending. Supersedes 001/002 upload acceptance ONLY for Playground
Seedance 2.0/2.5 models with catalog trusted_generated_only policy. Other models,
Image Playground and Cinematic remain unchanged. No paid calls during development.

Primary: Product Requirement Architect. Reviewers: Backend and QA sequentially
(not independent). Skills: Generation Workflow, Media Pipeline, Product UX,
Commercial Integrity and Release Regressions. Security review: private provider
URLs, actor ownership, allowlisted downloads and publication boundaries.

## Ordered Tasks

1. [x] 005: private original output capture, generated time/source mode/hash,
   shared configurable source policy, bounded owner-only listing.
2. [x] 006: mandatory server policy on quote/submit including legacy inputs;
   original URL only, per-image expiry/account/hash validation, no fallback.
3. [x] 007: catalog-driven generated-image picker for both slots, expiry/reasons,
   no Character picker/uploads/pasted URL for these models; preserve other models.
4. [x] 008: focused capture/domain/UI/regression/layout checks and UAT script.
5. [ ] User-run real-provider POC; no provider approval claimed by this delivery.
6. [x] 009: expand internal POC eligibility to all currently cataloged Seedream
   5.0 variants and both T2I/I2I output modes; deterministic verification passed.

Source: https://docs.byteplus.com/en/docs/ModelArk/2608626. The public reader
currently exposes the page identity/update date but not a readable model table.
Requirement 009 records the Product decision to test every currently cataloged
Seedream 5.0 variant and both T2I/I2I. Original ModelArk output, same account,
provider timestamp, 30-day age and unchanged bytes remain mandatory. URL lifetime
is separate. Technical-Documents remains advisory; TOS stays pending until POC.

No new login/account verification/Asset Library/TOS provisioning. No automatic
regeneration, provider switching or portrait changes. Qualification remains
conditional; provider rejection is surfaced, not automatically retried.
Legacy data: no fabricated timestamps, URLs, mode or trusted status. No backfill.
Rollback: revert policy + new controls together; retain private source evidence.

Correction [015](015-rejected-images-remain-selectable.md): previous provider
rejections never hide, disable or block an otherwise valid generated image.
Rejection evidence is retained; retries remain explicit and normally priced.

## Ownership

Generation captures provenance after successful image persistence through
TrustedGeneratedSourceService; private repository is under repositories/generation
with path from config/paths.js. VideoGenerationApplicationService remains the only
video facade and uses this service for source listing and trusted preparation.
The provider URL never enters public History, Community, browser draft or task DTO.
Existing original/local image, thumbnails, pricing and settlement remain intact.
