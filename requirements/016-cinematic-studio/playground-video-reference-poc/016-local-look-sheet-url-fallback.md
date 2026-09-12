# Local Look Sheet URL Fallback

Status: implemented; isolated validation passed; live provider acceptance pending user UAT.
Owner: Generation / TrustedGeneratedSourceService.
Primary: Product Requirement Architect. Review: Backend/security and QA sequentially;
UX/media/Generation skill checklists included, not independent agent review.
Plan: [018](018-fallback-and-named-images-plan.md).

## Contract

1. Cinematic Cast sheets and Playground Character Look Sheets prefer the original
   ModelArk URL. When its signed download expires, use the identical local image
   as a base64 data URL in the SAME explicit submission. No second paid attempt,
   no automatic retry after provider rejection, no removal of selected images.
2. This supersedes the no-fallback clause of 014 and Produce 013 only for sheets.
   Validate server-owned History category (character-sheet/lookSheetSnapshot),
   ownership, active History, account, Seedream model, 30-day trust window and hash.
   A client purpose label alone cannot authorize fallback. Ordinary First Frame,
   Storyboard and general image references do not acquire sheet fallback rights.
3. Signed URL lifetime is distinct from the 30-day provenance window. Detect known
   expiry from provider URL signing fields or an explicit expired response. Network
   outages, redirects, missing metadata, non-expiry 403, hash changes and provider
   privacy rejection must fail without silently changing transport.
4. Re-read local bytes through VideoReferenceAssetContent (bounded size, MIME,
   dimensions, path containment and expected hash). Do not resize, watermark or
   re-encode. Encode only during dispatch preparation. Never persist/log base64,
   signed URLs or private payloads; diagnostics store mode=base64 and expiry code.
5. Preserve quote/submit model, count, order, names, IDs and hashes. Credits remain
   behind their existing facade. Preflight failure occurs before reservation/task
   acceptance. No new pricing or provider eligibility policy, no POC labels.
6. Provider acceptance of local images is NOT proven by this implementation.
   Alternative transport is user-authorized here, not a claim of provider trust.
   Leave selections intact after rejection; another Generate requires user action.

## Acceptance

Original URL success; expired first/second sheet; two sheets with mixed transport;
real Asset metadata hash shape; named mapping; bytes/hash parity; no fallback for
non-sheet History, first frame, network failure, altered local/remote image,
foreign owner, revoked History or 30-day expiry. Both Cinematic and Playground
must use the same resolver. Verify task diagnostics contain no URL/base64, one
reserve/task only, and no provider request on preflight failure.
