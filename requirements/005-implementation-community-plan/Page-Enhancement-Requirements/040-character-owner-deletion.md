# Confirmed Character Deletion

Parent: 038. Status: Implemented; isolated deletion/Look/UI tests in Plan 036.
Live deletion of a real Character was not performed.

- DEL-01: Owner Details provides Delete Character and accessible confirmation
  dialog naming the Character. Exact case-sensitive DELETE is required by both
  UI and server. Cancel/Escape does not mutate; disable repeat submission while
  pending, retain dialog/error for retry on failure.
- DEL-02: Owner-only soft delete through Profiles facade and atomic repository
  mutation. Store deleted status/time/actor with previous lifecycle fields.
  Hide deleted Characters from owner/public lists and all detail/media/picker
  entry points; reject new handoffs, edits, approvals and Look use. A stale
  system write must not resurrect the tombstone.
- DEL-03: Keep versions, outputs, Community posts, usage and financial history.
  Already accepted generation is not cancelled or refunded. No physical files
  or unrelated records are deleted. No restore UI in this round.
- DEL-04: Repeat delete by the same owner is idempotent. Foreign actor receives
  not-found, including on retry. Projection cleanup can be retried after a partial
  failure; tombstone is authoritative. Persist deletion attribution atomically;
  append a sanitized audit event for successful/retried requests.
- DEL-05: Success navigates to My Characters and invalidates actor-scoped profile,
  directory and Character-picker reads. Switching actor during a request must not
  navigate/toast for the new actor. Do not clear unrelated drafts or image history.

Tasks: repository tombstone and guards; service/route plus audit; UI/API schema;
isolated owner/foreign/retry/stale-write/reuse checks; dialog and route tests.
