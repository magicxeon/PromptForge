# TUT-005 Learning Analytics And Admin Reports

**Status:** Required; metric definitions and privacy retention await implementation review.

## Counting Rules

| Metric | Exact identity/basis |
|---|---|
| Enrolled learners | Distinct userId + courseId enrollment, once regardless of sessions |
| Entitled learners | Distinct users with currently active free/paid access; label as-of snapshot |
| Paying learners | Distinct users with a successful paid order; show fully-refunded users separately |
| Started learners | Distinct enrolled users with first accepted positive playback interval |
| Active learners in period | Distinct userIds with accepted positive playback in the selected period |
| New learners in period | Enrollment created in period; not returning visitors |
| Completed learners | Distinct users satisfying the versioned completion rule for that curriculum |
| Lesson playback sessions | Distinct authorized playbackSessionId, not HTTP segment requests |
| Watched time | Deduplicated accepted playback intervals; paused, seeking and buffering excluded |

Annual active/unique learners are the UNION of monthly users, not the sum.
For site-wide totals a person taking two Courses is one person and two enrollments.
Show the scope next to every count. Purchases, enrollments, page visits and plays
are separate facts. Changing display name does not change identity; deleting media
or refunding cannot erase historic financial events or enrolled/started counts.

Proposed completion: >=90% distinct Lesson timeline coverage; Course requires all
required Lessons in the enrollment's curriculum version. Make threshold/version
configurable, expose manual completion separately if later allowed, and do not
claim attendance/certification from untrusted browser telemetry.

## Event And Progress Contract

Server creates playback session after authorization. Events include eventId,
sessionId, actor/course/chapter/lesson/asset version, sequence, client observed time,
server received time, position, duration and event type.
Deduplicate retries; bound out-of-order/clock skew and validate elapsed intervals
against session time, playback rate and asset duration. Reject unauthorized events.
Persist progress with optimistic versions; returning to an earlier point is not a
new completion. Separate deliberate seek position from watched timeline coverage.

Checkpoint on play/pause/ended/seek and a proposed15-second active heartbeat,
bounded batch size and retry queue; stop on pause/unmount/logout. No private video
buffers or unlimited offline queue in browser persistence. Heartbeats are activity
observations, never charging triggers. Reconcile overlapping sessions for user-level
watch time; retain raw session count separately. Document observation gaps honestly.

## Back Office

Course detail has Overview, Learners and Activity; Finance link opens the existing
Admin Finance with courseId and same period. One report authority, not two money totals.

- Overview: enrolled/started/active/completed, free vs paid, Credit sales and evidence status.
- Learners: stable ID/display name, enrollment source/date, entitlement state,
  progress, last activity, purchase/refund state; bounded server-side pagination/search.
- Activity: monthly12-row/yearly summary, selected-month detail, watch time and sessions.
- Finance: captured/refunded/net Credits, cash-backed value, test/promo split,
  unresolved attribution and order/ledger drilldown per TUT-004.
- Filters: Course, instructor when authorized, year/month, access/source, payer
  classification and environment. Display timezone, report basis and as-of timestamp.
- Exports reuse Finance's authorized export conventions with the same filters and
  watermark; pagination never truncates the exported total without explicit labeling.
- Empty data is zero only when sources are complete. Missing sources are unavailable,
  late projections show lag. Archive retains report identity and historical title snapshot.

No public learner roster. Admin-only POC requires server authorization on aggregates,
details and exports. Future instructors see their courses only, not another author's
roster, wallet or payment details. Minimize PII; email is not a default table column.
Audit roster exports and sensitive access; neutralize spreadsheet formulas.

Raw activity retention, aggregated retention, account deletion/pseudonymization,
financial retention and backups need separate approved durations before production.
Learning activity must not retain IP/device identifiers without a justified policy.

## Performance And Verification

Queries are bounded and filterable from the first repository contract. Financial
and learning projections must be replayable from authoritative durable events;
do not depend on process-only callbacks. Do not introduce a cache before profiling.
Any later cache key includes actor/scope/filter/as-of; document TTL, invalidation
and maximum size. No per-session polling loop for every learner in admin UI.

Acceptance: same user watches three times/two devices -> one enrolled learner;
same user active January and February -> each month1, year1; two Courses -> two
Course enrollments, global person1. Duplicate heartbeat does not increase duration.
Seek-to-end is not completion. Free preview, actual purchase and admin preview
remain distinct. Monthly/yearly Credit totals reconcile independently of usage.
