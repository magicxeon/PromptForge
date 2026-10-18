# Local Admin Development Bypass

User authorized2026-10-12: add admin role selection to local Login bypass.
Primary Backend Platform Architect; independent Security/QA reviewers, UX for
the existing actor/menu/navigation contract. Skills: review-product-ux and
verify-release-regressions. Identity owns eligibility/actor admission; Admin
continues to own permissions and commands. No production staff/MFA changes.

## Contract And Scope

- Canonical option `AUTH_DEV_BYPASS_ROLE=user|admin`, default user. Accept the
  user-requested spelling `UTH_DEV_BYPASS_ROLE` as an alias. Conflicting values
  or unknown roles deny startup. The option never enables bypass by itself.
- Require explicit bypass=true, development environment, existing qualified
  `.local-auth-fixture/` and exact localhost/127.0.0.1 ports. Listener/peer remain
  IPv4 loopback; forwarded headers, remote origins, LAN and unsafe environments
  never grant authority. Both real Login and bypass cannot be active together.
- Keep the existing fixed user fixture and manifest compatible. An explicit
  `setup-development.mjs --admin` adds only the fixed designated admin fixture
  to an already qualified target, using atomic JSON mutation and preserving
  current preferences/data. Never convert an arbitrary or real user. The
  setup function may create a new baseline target when absent, never reset it.
- Admin fixture uses distinct stable ID `usr_auth_local_admin`, role admin and
  an explicit admin fixture designation. Startup/runtime validate the entire
  allowed fixture roster, selected role and active selected account. User mode
  cannot gain admin through cookie/header/query. No real session/MFA proof.
- Existing Admin routes read only fixture runtime stores. Permit nonbillable
  local commands for provider controls, Support cases, configuration drafts,
  operation dismissal/restoration, fixture-user status and Attribute drafting,
  validation/plans/fixture releases. Exact method/path allowlist, owning Admin
  permission and same-origin CSRF remain mandatory for every write.
- By default keep provider dispatch, Generation, credits/financial adjustment, financial
  publication, real credentials/security actions and private production media
  unavailable. Suppress unavailable Admin capability exposure in bypass mode.
  No new financial workflow or policy mutation beyond existing local drafts.
  [AUTH-017](017-local-admin-live-comparison.md) adds a separate explicit local
  Admin image Generation/Compare opt-in with canonical Credits and guarded outputs;
  the other financial, security and production-media restrictions remain.
- ActorProvider accepts server-resolved user/admin bypass actors. Distinct IDs
  make current actor-scoped query/draft cleanup handle admin→user downgrade;
  unresolved/off/late responses never retain old authority. Reuse current menu,
  bypass warning and Admin navigation without screen redesign or new strings.
- Add safe public `/api/community/features` read so canonical feature policy
  can resolve in the existing local workspace. No parallel actor/permission store.

## Ordered Delivery And Acceptance

1. Freeze these contracts and obtain scoped UX feasibility before editing UI.
2. Extend configuration, explicit setup, development middleware and capability
   exposure; add focused owning tests. Prepare only the requested local fixture.
3. Extend ActorProvider acceptance/transition tests and actual createApp/Vite
   qualifier, verify current Admin menu/workspace at390/768/1440.
4. Independent Security/QA review, integrate corrections, record source/evidence
   and update the architecture/config map before task closure.

Success: both role names select the fixed local admin; real mounted Admin
overview/users/capabilities and a valid-CSRF fixture command work. Default user
and existing localhost/IP entry remain intact; UI exposes Admin with bypass label.
Negative: unsafe env, missing/corrupt/privileged roster, unknown/conflicting roles,
remote/forged claims, user-mode admin access, missing CSRF and paid/financial or
security commands deny before side effects. Capability metadata agrees.
Recovery: role downgrade/off/restart discards prior actor queries/drafts/late
responses; old cookies/CSRF cannot restore admin. Setup replay does not reset data.

Validation: `node scripts/verify-authentication.mjs --group development-bypass`,
`MPF_TEST_AUTH_DEV_FIXTURE=true node --test scripts/authentication/qualify-development-entry.mjs`,
focused React ActorProvider/menu/navigation checks and TypeScript. All automated
checks use owned temporary fixtures/ephemeral HTTP; no paid/live calls or workers.
This addition does not close the broader conditional T19B transport/browser work.

## Evidence

Implemented2026-10-12. No files move, credentials created or production data
paths change. Existing `.local-auth-fixture/data/identity/mockUsers.json` gains
the explicitly provisioned synthetic admin row only; no real account migration.
The user-requested non-secret `UTH_DEV_BYPASS_ROLE=admin` assignment was added
to the existing local `.env`, preserving all other fields. Read-only effective
configuration qualifies admin/`usr_auth_local_admin` on127.0.0.1:6500. This is
Root activation evidence, not proof the current user process has restarted.

Root and native author-separated Security/QA independently passed the focused
development-bypass13/13 and actual owned createApp/Vite1/1 qualifiers. Mounted
Admin overview/users/capabilities and valid-CSRF Support case creation201 pass;
user downgrade, missing CSRF, forged/remote origins, finance/publication and
paid Generation deny. Native review additionally passed six fresh pure probes.
Review found and Root fixed broad Admin GET prefix admission and selected-only
runtime fixture validation: reads now use an explicit anchored allowlist, and
the canonical full-roster helper runs at startup and every request. Unknown
reads, extra accounts and nonselected privilege mutations fail before handlers.

React ActorProvider/menu/navigation18/18 and TypeScript pass. Native UX reviewed
the contract before UI edits, then inspected actual React TH/Neon at390/768/1440
with intercepted APIs. Admin menu, readable bypass banner, existing navigation
and menu actions pass with no viewport overflow. Admin→user focus revalidation
removes Admin menu/content and shows access-required; normal navigation remains.
Overview fixture API intentionally503, so that visual check does not certify
overview data/commands; separate actual-app qualification above owns those.

Native `/root/login_bypass_release_review` applied Security and QA sequentially
as one author-separated reviewer; `/root/login_completion_ux` owns UX evidence.
No live provider calls, actual user services or billable workers were started or
restarted. T19B broader transport/browser qualification remains separate; other
themes/locales and screen-reader behavior remain unverified by this UI check.
Architecture/config ownership rows and runtime guide updated in the same change.
Static frontend build passed: `node ../node_modules/vite/bin/vite.js build
--configLoader runner --emptyOutDir=false` from `web/`, after verifying the exact
owned output path. Ordinary npm build could not write incremental node_modules
cache (EPERM); the nonincremental TypeScript check passed separately. The first
direct build could not delete the existing output index; scoped build write
permission and `--emptyOutDir=false` produced the current static frontend without
clearing old files. Existing bundle-size warnings remain. Static `/admin` now has
the updated actor contract; restart the user's launcher to load the frozen role.
