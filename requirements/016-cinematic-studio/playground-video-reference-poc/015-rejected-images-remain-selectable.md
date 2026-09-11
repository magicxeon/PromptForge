# Rejected Images Remain Selectable

Date: 2026-09-12. Status: implemented; isolated checks passed.
Owner: Generation trusted-source eligibility. Primary: Backend; QA sequential.
Corrects the previously added rejection gate in 006/008, explicitly rejected by
the user. Provider rejection is attempt evidence, not image deletion or a ban.

## Requirements

1. A prior provider rejection must not hide an image, disable selection, or block
   a new user-initiated attempt. Apply through the canonical eligibility function
   so Playground and Cinematic consumers agree.
2. Keep stored rejection evidence and terminal task/error/refund history intact.
   Existing rejected records become selectable without erasing data or backfill.
   Do not automatically clear a selected reference or remove its local file.
3. Preserve model/mode, owner, credential scope, timestamp, 30-day age, URL and
   byte-integrity validation. Expired or otherwise invalid sources remain invalid,
   even if they also have a rejection record. Preserve Look Sheet category rules.
4. Retry is explicit and uses the normal quote, consent, reservation and task
   lifecycle. No automatic retry, provider switch, refund or paid generation.

## Ordered Tasks

1. Update owning policy documents and this plan before code changes.
2. Remove rejection from eligibility, bump policy version to invalidate stale
   quote fingerprints/cursors, preserve original evidence and immutable media.
3. Test historical rejection visibility in eligible-only and Look Sheet lists,
   explicit quote/submit after rejection, exact original URL, evidence retention,
   and remaining invalid-source rules. Extend the existing scripts runner.
4. Read-only check the reported source with current eligibility. Run isolated
   Generation and picker regressions; no live provider call or server restart.

No new module, endpoint, runtime data path, UI layout or file move is required.
Old task outcomes stay failed/refunded. Reload the picker after the backend loads
the new policy. Successful provider acceptance is not promised.

## Evidence

Tasks 1-3 complete. `node scripts/test-cinematic-directed-openings.mjs source-retry`
passed 36 tests; `node scripts/test-cinematic-directed-openings.mjs picker-ui`
passed 11 tests. Both groups are in the aggregate `all` entry. Diff checks passed.
No layout or localization changes were necessary.

Task 4: read-only evaluation of job_1789143035101_rybay045m now returns
eligible=true, reason=null, with rejection evidence retained. The live backend
at port 6500 was not running during final verification (ECONNREFUSED); end-to-end
picker verification awaits normal server startup and page refresh. No worker or
server was started/restarted and no live data was mutated. QA was sequential,
not independently executed.
