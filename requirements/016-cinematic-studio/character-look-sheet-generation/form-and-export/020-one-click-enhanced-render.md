# One-Click Enhanced Render

Status: Playground implemented and isolated checks passed; Studio paid exposure pending. Parent: 017.

## Consent And Execution

1. Valid brief + engine: free image estimate. Toggle ON: free enhancement quote,
   never an AI call. Show image fee, enhancement fee and combined amount.
2. Generate is the explicit consent for those two bounded purchases. Disable it
   while quotes are missing/stale or the brief is invalid. Check available funds
   for both before starting; server reservations remain authoritative.
3. Execute the existing durable enhancement operation once. Show live busy status
   and spinner beside the toggle; freeze configuration during the command.
4. Only after successful text settlement, resolve the artifact and obtain the
   image estimate through the existing API. Do not submit if image price increased
   above the displayed authorization; require a new user command/price review.
5. Submit through canonical Generation and show the existing result/job states.

## Recovery

- Toggle OFF uses original prompt and has no text fee. Keep delivered artifacts.
- Valid completed artifact reused for image retry: zero additional text fee.
- Persist operation before execute; duplicate requests use the same operation ID.
  Unknown outcomes are status recovery, not automatic repeat provider calls.
- Enhancement failure stops image generation; existing refund policy applies.
- Image failure does not refund successfully delivered enhancement. Keep artifact
  and display this distinction before consent. Image settlement remains unchanged.
- Preserve image request ID on an uncertain submit response. Recovery/retry must
  not enqueue a second image. Do not auto-submit after page reload or actor switch.
- Form/reference/layout changes invalidate the old artifact for the new request.
- Two purchases are sequential, not an atomic combined reservation. Concurrent
  spending may leave insufficient image funds after text delivery; report it and
  retain the artifact, never bypass server balance checks.
- Studio paid Enhancement is PENDING explicit exposure approval. Auto-review
  rejected the attempted extension on 2026-09-09; no server gate was changed.
  Playground uses the new command. Studio receives only the authorized ratio,
  adult validation and layout changes. Other Studio workflows are untouched.
