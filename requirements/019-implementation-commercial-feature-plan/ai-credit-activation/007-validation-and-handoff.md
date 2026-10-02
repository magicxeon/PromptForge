# 007 Validation And Handoff

Scope: integration review, focused evidence and final handoff. Dependencies: 002-006.
QA reviews independently where available; manual UAT remains separate.

1. Run the owning runner's small selected groups, not the entire repository suite.
2. Trace every action through API, quote, reservation, provider, result and terminal
   capture/refund/recovery. Fix uncovered paths before claiming completion.
3. Check sibling UI actions, localization and responsive behavior without paid calls.
4. Review historical fixed/POC snapshot preservation, actor isolation and duplicates.
5. Record exact configuration files, changed owners, test commands and unresolved
   runtime/provider qualifications. Post-processing remains pending.

Commands: `node scripts/test-ai-credit-activation.mjs <text|legacy|ledger|video|pricing|admin|finance|tariffs|ui>`.
Explicit aggregate only: `node scripts/test-ai-credit-activation.mjs all`.
All groups must remain isolated, fail on errors and not restart workers or mutate
live data. A code pass is not production billing certification.

2026-10-02 independent QA verified closure of text metadata, public legacy bypass,
delivered-result recovery, changed-fingerprint recovery, canonical root/revision
binding and reservation/context freshness issues. The final Video preflight-refund
and missing/empty reservation-status findings are also closed. Independent checks
passed Video40/40 and Finance6/6; repeated fault injection now rejects with409,
zero provider calls, no task and unchanged Credit history. No-reservation
authorizations, ambiguous holds and same-key concurrency remain correct.

Final verdict: pass for bounded offline development/test; no remaining findings
in reviewed scope. Independent review was read-only, without AI/live-data effects.
Visual/typecheck evidence is implementer-reported. Trusted production identity,
transactional publication/storage, provider/account billing qualification and
live paid UAT remain explicit open release gates, not completed tests.
