# Safe Admin MVP Implementation Checkpoint

**Status:** Implemented and regression-validated on 2026-08-26
**Primary role:** Backend Platform Architect
**Reviewers:** UX/UI Product Designer, QA And Release Engineer, Commercial Financial Integrity
**Capabilities:** Admin read models, Support Cases, Admin Configuration drafts

## Active behavior

1. Authorized Admin and Support actors can inspect the capability exposure
   matrix at `/api/admin/capabilities` and `/admin/control-plane`.
2. Staff can search bounded, sanitized Asset/Post/Template/Character metadata.
3. Staff can trace an exact stable ID without receiving raw prompts, Base64,
   credentials or private media bytes.
4. Provider health reports configuration availability only and never performs a
   paid generation probe.
5. Support Cases support create, list, detail and optimistic lifecycle updates.
   Notes and links are bounded and material changes append Audit events.
6. Runtime configuration revisions can be validated and saved as drafts.
   Secret-like keys are rejected and drafts never change active consumers.
7. Staff can inspect bounded Credit reservation counts from the readiness
   workspace. The read model exposes `mutationAvailable: false`; adjustments,
   refunds and settlement commands remain production-gated.

## Production-gated scaffolding

| Capability | Default | Required before activation |
|---|---|---|
| Generation commands | off | owner command facade, staff auth, PostgreSQL |
| Content commands | off | owner moderation/quarantine facades, staff auth |
| Restricted media reveal | off | step-up auth, Case/reason, reveal audit |
| Financial commands | off | staff auth, transactional SQL ledger, approval policy |
| Configuration publication | off | PostgreSQL, atomic active pointer and consumer cutover |
| Scheduled publication | off | durable scheduler and idempotent publisher |
| Asset reconciliation | off | Assets owner command and durable Audit |

The UI must show these as unavailable with prerequisites. It must not render an
enabled command merely because a route or draft record exists.

## Runtime data

Local development introduces:

```text
server/data/support/cases.json
server/data/admin-configuration/revisions.json
```

Files are created lazily through the shared atomic JSON store. They are local
adapters, not the production persistence decision.

## Validation evidence

- `node --test test/adminSafeMvp.test.js test/adminBackoffice.test.js`: 10 passed.
- `npm run test --workspace web -- src/features/admin`: 14 passed.
- `npm run typecheck:web`: passed.

The repository-wide server baseline is not clean yet: `node --test
test/*.test.js` currently reports 512 passed and 25 failed. The failures are
outside this Admin capability and include stale professional-agent artifact
paths, legacy prompt/catalog fixtures, Credit JSON fixture isolation, the JSON
store test harness and existing i18n interpolation validation. They remain a
release gate for the next phase and are not waived by this checkpoint.

## Next production phase

1. implement real staff principals, MFA/re-auth and granular permission grants;
2. migrate Support, Audit, idempotency and configuration revisions to
   PostgreSQL;
3. implement owner Generation/Assets/Payments command facades with dry-run and
   approval contracts;
4. add independent approver enforcement and transactional financial evidence;
5. run migration parity, security and destructive-command release gates before
   enabling any production-gated flag.
