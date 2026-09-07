# 009 Seedream 5 Family Trusted-Source Expansion

Status: implemented; deterministic checks passed. Real-provider POC pending.
Parent: [004-trusted-source-master.md](004-trusted-source-master.md).

## Decision

The Playground trusted-source POC must accept every enabled Seedream 5.0 model
currently declared compatible with `modelark-seedance-2` in the canonical
provider/video catalogs. At implementation time these are:

- `seedream-5-0-lite-260128` (including provider-resolved alias
  `seedream-5-0-260128` when the requested model is Lite); and
- `dola-seedream-5-0-pro-260628`.

Both text-to-image output and image-reference generation output are admitted to
the POC when all other trusted-source checks pass. This is an internal
qualification expansion, not a claim that either route is provider-approved or
will pass moderation. Future Seedream versions are not silently enabled: they
must first be present and enabled in the canonical provider catalog with the
matching downstream compatibility declaration.

The public BytePlus page currently exposes the portrait-video title and update
date to the documentation reader, but not a readable body/table that proves a
Lite-only restriction. The repository's existing canonical provider and video
catalogs already declare Lite and Pro compatible. This Product decision removes
the narrower duplicate policy while preserving all runtime evidence gates.

## Ordered Tasks

1. [x] Replace the Lite-only duplicate allowlist with the current cataloged
   Seedream 5.0 family and provider alias handling.
2. [x] Request URL output for eligible Lite and Pro generations in T2I and I2I,
   while retaining unchanged downloaded bytes for existing image consumers.
3. [x] Admit coherent T2I (`referenceCount = 0`) and I2I
   (`referenceCount > 0`) metadata. Keep unknown modes/counts disabled.
4. [x] Preserve owner, same-account, provider timestamp, 30-day age, original
   URL, local-byte hash, URL-byte hash and provider rejection checks.
5. [x] Verify Pro T2I, Lite T2I, I2I, provider alias, unsupported Seedream 4,
   private URL non-disclosure and quote/reference-count parity with focused tests.
6. [x] Reconcile master/evidence wording and record that pre-change Base64-only
   outputs cannot be backfilled or treated as original provider URLs.

## Acceptance

- A newly generated Pro T2I output with complete original URL evidence is
  selectable instead of reporting `unsupported_model`.
- A newly generated Lite/Pro I2I output with complete evidence is selectable
  instead of reporting `unsupported_mode`.
- Existing output `job_1788773586096_6mz5yhmvd` remains unavailable because its
  captured record has no original provider URL. The system must not substitute
  its local output, GCS or Base64 and call that trusted.
- Seedream 4.x and unknown/future model IDs remain unavailable.
- Quote and submit still revalidate and send only the exact original URL; Credit,
  idempotency, Queue, task polling, settlement and Cinematic behavior are
  unchanged.
- Real provider acceptance remains a user-run POC result, captured separately
  for Pro T2I and Pro/Lite I2I.

## Rollback

Restore the prior policy version and model/mode lists. Retain captured private
evidence; do not delete image outputs or mutate Credit records.

## Verification Evidence

- `trusted`: 21 passed, including catalog-policy parity, Lite and Pro T2I,
  Seedream 5 I2I, Lite resolved alias, invalid model/mode/count, exact original
  URL dispatch, ownership/privacy, expiry/hash/account and rejection evidence.
- `contract`: 17 passed for unchanged unrestricted upload/GCS/Base64 and
  Character/Look reference behavior.
- `regression`: 59 passed for Video application, capability, route, durable task,
  polling, settlement and Character Look behavior.
- `ui`: 25 passed; no UI contract changed by this amendment.
- TypeScript and i18n validation passed. JavaScript syntax and diff checks passed.
- No provider call or Credit mutation was made by automated verification.

Current output `job_1788773586096_6mz5yhmvd` now evaluates as
`url_unavailable`, not `unsupported_model`: it was generated before Pro requested
URL output and its private record has no original provider URL. Generate a new
Pro image after backend restart for the first live POC.
