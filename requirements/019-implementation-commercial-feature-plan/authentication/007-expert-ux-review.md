# AUTH-007 Expert UX Review And Dispositions

**Date:** 2026-10-10
**Status:** UX, Security and Backend document reviews passed; final task QA passed
**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Reviewer:** Custom `ux-ui-product-designer`, `/root/auth_expert_ux_review`

## Scope And Evidence Boundary

The user asked for Expert UX/UI review before revising requirements and BSA task
decomposition. The reviewer read AUTH-001..006, the UX charter/Skill, visual-language
guide, enabled locale manifest, AccountMenu/ActorProvider/ConfirmDialog and nearby
tests. It made no file edits. Initial verdict: revise before UX contract freeze.
This is independent requirement/source review, not screenshots, rendered designs,
browser testing or runtime acceptance. No Authentication UI is implemented.

## Findings And Requirement Dispositions

| ID / priority | Finding | Required correction and owner |
|---|---|---|
| UX01 / P1 | Registration-existing and login-new handoffs contradict purpose scope | AUTH-001 handoff matrix, AUTH-002 purpose table and AUTH-004 restricted enrollment exchange; no automatic login/signup |
| UX02 / P1 | Social signup email requirement ambiguous | AUTH-001 requires verified application email before activation; trusted provider proof avoids redundant OTP; existing linked users do not repeat signup |
| UX03 / P1 | Passwordless users can get trapped in reset | AUTH-003/005 always show neutral email-code-login/back exits, preserve input and start a distinct login context |
| UX04 / P1 | Same-tab OAuth destroys memory-only unsaved work | AUTH-005 prefers in-page/popup reauth, explicit warning/alternative/cancel before redirect; same-actor-only restoration |
| UX05 / P1 | Security sections and session consequences underspecified | AUTH-005 separates email/password/providers/MFA/sessions, shows remaining methods and action/session-effect matrix |
| UX06 / P1 | MFA requirements lack actual screen inventory | AUTH-005 adds challenge/bootstrap/enrollment/confirmation/recovery-code/rotation/removal/error screens; no workspace until required proof |
| UX07 / P2 | Controls listed without hierarchy/form rules | AUTH-005 primary submit, code-login alternative, optional-password disclosure, safe value retention, password-manager semantics and code paste/focus rules |
| UX08 / P2 | Expired contexts and unknown mutation outcomes omitted | AUTH-004 scoped operation reconciliation/receipt; AUTH-005 restart/network/401/403 states and honest unavailable-recovery guidance |
| UX09 / P2 | Existing component behavior assumed | AUTH-005 preserves AccountPreferencesDialog Settings and Credit preference; separate Security entry; explicit ActorProvider/async-confirmation contracts |

Security/Backend must review purpose exchange, social-email activation and
restricted operation receipts. UX re-review confirms the interaction corrections;
QA checks that the task packets cover them. These verdicts do not replace future
implementation review, independent responsive evidence or user acceptance.

UX re-review by `/root/auth_expert_ux_review`: **pass for interaction documents**.
All nine findings resolved in AUTH-001..005; no remaining blocking interaction
finding. Child-task JSON/AUTH-008 were still being authored and were excluded from
that verdict. No screenshots/browser/runtime acceptance was performed.

Security re-review by `/root/auth_requirement_security_review`: **pass for revised
documents**. Purpose-safe enrollment, new-social email assurance, neutral reset
exits, same-actor reauthentication and bounded read-only operation receipts retain
their security boundaries. Future tests must cover context substitution/replay,
concurrent account creation, stale proofs, foreign receipt access/expiry and use
of receipts as an attempted auth/mutation credential. AUTH-008 and the moving
JSON were excluded; receipt mechanism/provider feasibility remain T01/T02 gates.

Backend review by `/root/auth_backend_contract_review`: **pass for revised
contracts**. T02 must issue/bind receipt and operation handle before a revoking
mutation; T03 persists outcome atomically or through documented reconciliation,
reuses upstream database infrastructure and existing Audit boundary. AUTH-004
records those gates. Transport acceptance includes JSON, progress stream and Blob
paths; no new infrastructure owner or provider selection is inferred.

Final QA by `/root/auth_requirement_qa_review`: **pass for documents and
configuration**, no blocking findings. Independently verified 44 child packets,
18 rollups, exact dependency and GWT parity, AC01-AC20/UX01-UX09 coverage, early
inventory and MFA prerequisites, both plan validators, inventory, contracts
24/24 and legacy 10/10. All children remain proposed with empty evidence/reviews
and no parallel batches. This does not certify application or live behavior.

## Product Choices And Defaults

Password submit and email-code alternative are distinct; social buttons form a
separate group. Onboarding deliberately discloses optional password creation.
Display name remains editable with a provider suggestion. Session management may
use the proposed section/route without removing any action. Exact remember-device
duration, providers, staff bootstrap and retention remain D01-D08 decisions.
No product permission, financial behavior or publication policy is changed here.

## BSA Handoff

Use [AUTH-008](008-executable-task-packets.md) and the single authoritative
[task plan](task-plan.json). Former 18 tasks become milestone rollups with child
task IDs, not duplicate executable statuses. Require explicit GWT checks for all
nine findings, plus baseline AC01-AC20 and preserved neighboring behavior.

Profile execution disclosure: `.codex/agents/business-system-analyst.toml` was
created, but direct invocation returned `unknown agent_type` in this session.
The existing Custom Product agent `/root/auth_bsa_analysis_via_product_profile`
applied the BSA charter for analysis/decomposition. This is independent analysis
through a disclosed fallback, not evidence of native BSA profile activation.
