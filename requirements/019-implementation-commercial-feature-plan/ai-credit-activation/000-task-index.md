# AI Credit Activation Tasks

Owner: [Phase2-23](../Phase2-23-ai-credit-activation.md).

| Task | Dependency | Status |
| --- | --- | --- |
| [001 Policy and connections](001-policy-and-connections.md) | None | Verified; ten paid operations and explicit free/pending exceptions |
| [002 Durable text billing](002-text-ledger.md) | 001 | Verified; text15/ledger4 and independent QA pass |
| [003 Cinematic API](003-cinematic-api.md) | 002 | Verified; legacy22, source/routing gates,48 neighboring checks and independent QA pass |
| [004 Video usage](004-video-usage.md) | 001 | Verified; settlement82/focused40/recovery13/Finance6 and independent QA pass; development/test only |
| [005 Admin profit](005-admin-profit.md) | 001 | Verified; Admin22/tariffs31/UI17, independent QA andTH/EN responsive checks pass |
| [006 Consent UX](006-consent-ux.md) | 003, 005 | Implemented; UI141/typecheck and final green-refinement responsive checks pass |
| [007 Validation](007-validation-and-handoff.md) | 002-006 | Offline verified; independent QA passes bounded development/test; live paid UAT/production gates open |

Each task owns one coherent change; work may proceed independently only with
disjoint file ownership. No live billing-data migration or paid smoke test.

## Connection Map

Text: Cinematic API client -> server quote -> Cinematic source/context validation
-> Generation durable text receipt -> Credits reserve -> existing Cinematic AI
use case -> saved proposal/result -> Credits capture/refund -> replay/recovery.

Video: existing Generation quote -> Credits reserve -> atomic provider dispatch
claim -> provider poll + usage/media checks -> usage-cost calculation from pinned
quote -> atomic partial capture/release -> terminal job and ledger.

Admin: existing pricing revision -> validated category markup configuration ->
audited publication -> policy loader invalidation -> NEW quote only.

## Validation Plan

- 002: isolated quote expiry/source/actor, reserve-before-dispatch, idempotency,
  error refund, durable delivery, settlement failure and restart recovery tests.
- 003: endpoint mapping and unchanged free Full Story/provider contracts.
- 004: existing BytePlus focused runner plus actual capture/release/cap/usage,
  concurrent claim and historical quote tests.
- 005: Admin authorization, percentage limits/version conflicts/cache refresh.
- 006: stubbed API UI tests for cancellation, credit totals, free labels and
  pending/failed states; desktop/tablet/mobile checks without AI calls.
- 007: selectable offline runner and explicit aggregate; report live UAT gaps.

See [implementation and UAT](008-implementation-and-uat.md) for exact configuration,
owners, isolated commands and manual paid-runtime checks. No live paid AI was used.

2026-10-02 incremental evidence: text15, legacy22, ledger4, video settlement82, video
pricing17, Admin22, Finance6, tariff31, video integration14, image20; combined scoped frontend141;
neighboring Series/Full Story/Environment/outline48; scoped Brief1 and Story Plan
routing3 passed. Typecheck passes after the shared Wardrobe billing DTO was updated.
TH/EN consent checks cover390/820/1440 across three themes; Admin covers the same
viewports. QA findings were fixed before closure: metadata preservation, legacy
route bypasses, delivered recovery, changed-request preview, canonical Full Story
root/sibling revision binding and source changes during reservation/context reads.
Final preflight/refund/duplicate/overload fixes passed40 focused Video tests and13
recovery checks; Finance6 covers released Credits. Final independent QA separately
passed Video40/40 and Finance6/6, reproduced the earlier status fault injection
and verified zero dispatch/unchanged ledger. No findings remain in reviewed scope.
This closes offline implementation checks, not live paid UAT or production gates.
