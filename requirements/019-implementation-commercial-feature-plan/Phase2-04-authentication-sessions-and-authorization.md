# Phase 2-04 Authentication, Sessions and Authorization

**ID:** AUTH-019
**Updated:** 2026-10-12
**Status:** Customer Login source milestone accepted: registration/email verification, password/OTP Login, reset, Google/Facebook completion, published legal links and canonical runtime/private-route cutover. Explicit isolated server `--login` aggregate passes all16 groups; React Login56 checks and representative390/768/1440 UX fixtures pass. Live deployment requires actual configured inputs. T19B remains conditional; linking/account-security/staff MFA retain their separate roadmap. Full Authentication is incomplete; see AUTH-012 for exact evidence.
**Capability:** Identity and Account
**Primary:** product-requirement-architect; main thread coordinates Technical Lead responsibilities
**Review gates:** Security and QA; UX for screens, Backend for persistence/contracts
**Triggered Skills:** review-product-ux; verify-release-regressions for requirement review

## 1. Outcome And Authorization Boundary

One durable Momelo account can sign in with email/password, email OTP, Google,
or Facebook. Users can verify email, recover access, reset a password and manage
linked methods without duplicating Credits, Projects or private work.

The user has now authorized implementation according to this packet. Begin with
T01 decisions and the bounded Phase2-03 database prerequisite, qualify dependencies
before advancing, and keep live provider/email/production operations separately
gated. Historical documentation-only delivery below describes the earlier turn.

The earlier requirement-authoring request authorized documentation and asked to
wait. The subsequent implementation instruction supersedes that pause for local
source, dependencies and isolated verification. Live email/provider setup,
production migration and paid workflows remain outside this implementation run.
Task status and actual evidence are recorded in the JSON plan and AUTH-012;
documentation completion alone does not establish working authentication.

## 2. Requirement Index And Reading Order

| ID | Owning document | Responsibility |
|---|---|---|
| AUTH-001 | [Account lifecycle and boundaries](authentication/001-account-lifecycle-and-boundaries.md) | Scope, owners, durable identity, registration, status and decisions |
| AUTH-002 | [Password, OTP and social authentication](authentication/002-password-otp-and-social-authentication.md) | Login, verification, challenge policy and provider callbacks |
| AUTH-003 | [Account linking and recovery](authentication/003-account-linking-and-recovery.md) | Link/unlink, password reset, email changes and Support recovery |
| AUTH-004 | [Sessions, API and persistence](authentication/004-sessions-api-and-persistence.md) | Session/authorization contracts, data, transport and mock cutover |
| AUTH-005 | [Screens and user journeys](authentication/005-screens-and-user-journeys.md) | UI states, navigation, draft isolation, accessibility and localization |
| AUTH-006 | [Delivery and verification](authentication/006-delivery-and-verification.md) | Ordered task packets, decisions, acceptance matrix and release gates |
| AUTH-007 | [Expert UX review and dispositions](authentication/007-expert-ux-review.md) | Independent flow findings, requirement corrections and remaining visual evidence |
| AUTH-008 | [Executable task packets](authentication/008-executable-task-packets.md) | BSA child tasks, milestone mapping, checks and handoffs |
| AUTH-009 | [Local development Login override](authentication/009-local-development-login-override.md) | Server .env toggle, isolated fixture identity, mode transitions and fail-closed limits |
| AUTH-010 | [Implementation decisions and evidence](authentication/010-implementation-decisions.md) | T01 technical choices, prerequisite checks and unresolved live gates |
| AUTH-011 | [Identity contract v1](authentication/011-versioned-implementation-contract.md) | T02 concrete transport, context, persistence and interaction contracts |
| AUTH-012 | [Incremental implementation evidence](authentication/012-implementation-evidence.md) | Actual focused test results and independent implementation reviews |
| AUTH-013 | [Private-surface cutover inventory](authentication/013-private-surface-cutover-inventory.md) | Registered API/media/stream/actor/transport surfaces, exact future scopes and verification cases |
| AUTH-014 | [Login runtime setup](authentication/014-login-runtime-setup.md) | Exact environment names, persistent runtime inputs, migration and isolated validation commands |
| Task state | [Machine-readable plan](authentication/task-plan.json) | Dependencies, write scopes, reviewers, status and evidence |

This master supersedes the former Phase2-04 deferral of social login and its
password-only assumptions. Google and Facebook are in scope; passwords remain
optional for OTP/social accounts. AUTH-004 replaces the old unimplemented API
sketch; existing `/api/me` and preference routes remain the compatibility anchor.
Organization invitations and other social providers remain deferred.

The additional developer option `AUTH_DEV_BYPASS_ENABLED` is specified in
AUTH-009. It skips credential entry only for a qualified local fixture; production
authentication and resource authorization remain mandatory. No `.env` is changed
by this requirement update.

## 3. Current Source Baseline

Inspected 2026-10-10; source review, not runtime acceptance:

- `server/middleware/actorContextMiddleware.js` still trusts a supplied mock ID
  through `x-mpf-user-id`, `mpfUserId` or `mpf_user_id`, including production.
  Disabled-user enforcement is currently write-oriented. Both are launch gaps.
- `server/app/routes/identityRoutes.js` owns `/api/me`, `/api/me/preferences`
  and `/api/mock-users`; it does not implement this packet's login endpoints.
- `server/domain/identity/AdminIdentityService.js` owns guarded account-status
  commands against the mock repository; preserve its facade and permission gates.
- `server/domain/identity/UserPreferenceService.js` and the Identity repository
  own preferences. Creator Profile is a separate capability.
- `web/src/lib/auth/ActorProvider.tsx` and `web/src/lib/api/apiClient.ts` resolve
  mock actors and attach a mock header. They are extension points, not real auth.
- `AccountMenu.tsx` owns account navigation; `actorScopedStorage.ts` provides
  owner-keyed local drafts, not encrypted storage or authentication.
- `test/mockActorContext.test.js`, actor persistence tests and AccountMenu tests
  are regression inputs. Production expectations must change deliberately;
  fixture/mock coverage remains explicitly non-production.

## 4. Dependencies And Protected Owners

Use [Phase2-03](Phase2-03-database-architecture-and-json-migration.md) for the
PostgreSQL foundation and [Phase2-20](Phase2-20-current-state-reconciliation-and-execution-plan.md)
for commercial sequencing. Do not migrate every capability before local auth,
and do not use mock JSON for production credentials. Auth/email vendors are
unselected; GCP hosting and old Supabase references do not select them.

Identity supplies authenticated actor/status/session evidence. Credits keeps
wallets and settlement; Generation keeps queue/provider/job ownership; Assets
keeps private-media policy; Community keeps publication; Support keeps Cases;
Audit keeps audit persistence. No auth route writes their repositories.

Production staff roles and approval rules remain owned by
[Backend 007](../018-implementation-backend/007-permission-command-and-approval-matrix.md).
Role names never replace resource ownership checks or confer access through an
email domain. Account verification is not Creator verification or KYC.

## 5. Delivery Contract

Follow AUTH-006 and `task-plan.json` one task at a time, recording actual checks
and reviewer evidence before dependent work starts. Proposed file/API names are
not existing implementations. Shared-contract changes require an updated map.
There is no automatic scheduler or permission to start from the JSON plan.

The implementation instruction has been received. T01/T02 contracts and the
shared database foundation are complete; continue the dependency-ordered tasks.
Retention, provider spend, public visibility and production migration choices
still need the decision owner identified in AUTH-001; no approval is invented.

## 6. Documentation Evidence

Documentation checks and independent review results are recorded in
[AUTH-006](authentication/006-delivery-and-verification.md#documentation-evidence).
The architecture map includes explicitly planned Identity/UI boundaries;
no application runtime paths, live records or credentials were created.

The subsequent user-requested independent UX review and BSA decomposition are
recorded in AUTH-007/008. Eighteen broad milestones now organize smaller executable
children; AUTH-009 adds milestone T19 and two children. The bounded transactional
Audit prerequisite AUTH-T03D brings the current total to 47 children.
Only the JSON child records carry implementation status. Native BSA
profile discovery and the disclosed Product-profile fallback are separate from
successful UX review or static task-plan validation.
