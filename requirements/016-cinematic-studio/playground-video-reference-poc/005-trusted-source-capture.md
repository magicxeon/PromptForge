# 005 Capture And Eligibility

- Capture original URL from ModelArk response in a separate server-only result
  field. Request URL output for currently cataloged Seedream 5.0 Lite/Pro T2I
  and I2I while still downloading the
  same original bytes for existing image consumers. Never rewrite image bytes.
- Persist one immutable owner/job record: provider/requested/resolved model,
  provider request ID, stable credential/account scope, actual dispatched image
  count and T2I/I2I mode, provider timestamp and received timestamp, original URL,
  original MIME/size/SHA256. Missing provider timestamp is unknown, not inferred.
- Capture failure does not fail or refund an otherwise completed paid image;
  that image remains unavailable as a trusted source. Never log URL/error secrets.
- Private storage: server/data/generation/trustedGeneratedSources.json via atomic
  JSON repository. Existing History is the listing/ownership/deletion authority.
- Config owns allowed source models/modes, start date, maximum age and URL hosts.
  API key is never stored. Credential hash is conservative fallback, not proof
  that distinct keys represent distinct accounts. Existing explicit account scope
  configuration remains supported; do not invent or auto-update account IDs.
- List 24 owned results per cursor page through canonical History repository;
  project only source ID, local preview, model/mode/time/expiry/eligibility/reason.
  No per-row external network calls or client-provided trust assertions.
- Unknown/expired/missing evidence and models outside the current Seedream 5.0
  compatibility catalog stay visible but disabled. Coherent I2I requires an
  actual positive reference count. No raw URL import, future timestamps, edited
  derivatives, hidden Template preparation or deleted History records qualify.
  Source selection does not publish any image.
