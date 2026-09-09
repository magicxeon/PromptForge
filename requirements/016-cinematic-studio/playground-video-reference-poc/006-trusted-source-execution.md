# 006 Mandatory Trusted Reference Execution

- Catalog declares playgroundReferencePolicy=trusted_generated_only for existing
  ModelArk Seedance2 compatibility models (2.0/mini/2.5), regardless of POC flags.
  This restricts sources; it does not enable disabled/unqualified models.
- Text-only remains text-only. Any source/Character/Look/URL on restricted models
  must use version playground-trusted-v1 and owned generation IDs, never uploads,
  caller URLs or Character profile previews. Enforce before legacy resolution.
- First-frame mode: one source, opening_frame purpose, first_frame role.
  Character/reference mode: optional scene then required Looks, distinct generated
  sources bounded by the effective model/adapter limit (amendment 014), all using
  reference_image roles. No mixed first_frame/reference_image.
- Each reference independently passes current source policy, owner/history,
  account, age and source bytes; bind ID/hash/roles and expiry in fingerprints.
  Check original URL readability/hash before quote and submit, bounded timeout,
  size and HTTPS host allowlist, no redirects. Never call arbitrary URLs.
- Trusted transport passes original provider URL only. No GCS/TOS/Base64 fallback.
  Signed URL expiry never extends the 30-day window. UI says initially eligible,
  not guaranteed accepted. Existing uploads/transports survive for other models.
- Revalidate on submit; fail before reservation. Keep exact quote/count/parity,
  idempotency, terminal status/error/request ID and canonical settlement behavior.
- Provider privacy rejection blocks another identical trusted-source attempt;
  record task/model/request evidence conservatively for all selected sources when
  no reliable offending index exists. Do not claim every source is proven bad.
- TOS, trusted-source recovery/backfill, automatic regeneration and live paid
  provider qualification are pending, not part of this implementation.
