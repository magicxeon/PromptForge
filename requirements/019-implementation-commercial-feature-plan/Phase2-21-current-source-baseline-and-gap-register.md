# Phase 2-21 Current-Source Baseline And Gap Register

**Reviewed:** 2026-09-07

**Scope:** Documentation reconciliation of commercial plan 019

**Primary:** Product And Requirement Architect

**Review perspectives:** Backend/security and QA, sequential rather than independent

**Owning capability:** Commercial requirement coordination; no new runtime owner

## 1. Evidence Boundary

This review compares the current source, repository contracts, architecture map,
existing test files and explicit user acceptance against Phase2-00 through 20.
It does not certify all behavior, run provider generation, inspect cloud account
deployment, inventory every runtime record or execute a database migration.
Existing tests listed below were located, not rerun or counted as passing here.

Status vocabulary:

- **Reuse:** local capability exists; preserve its public entry point.
- **Adapt/migrate:** local behavior exists, production durability/security is pending.
- **Build:** no corresponding production capability found in this bounded review.
- **Deferred:** intentionally outside the immediate foundation milestone.
- **User accepted:** only the explicit workflow/scope accepted, not production QA.

Current files and `requirements/099-technical-dept/000-master.md` own runtime
placement. Domain requirements own behavior. The historical Concept file in
this folder is context, not an implementation checklist or current inventory.

## 2. Canonical Crosswalk

Paths in this table exist at review time; missing future services must not be
invented merely because older documents used a conceptual service name.

| Capability | Current evidence | Classification and remaining delta |
|---|---|---|
| Identity | `server/middleware/actorContextMiddleware.js`, `server/repositories/identity/MockUserRepository.js`, `server/app/routes/identityRoutes.js` | Build trusted authentication/session persistence; preserve stable user IDs and `/api/me` |
| Client actor state | `web/src/lib/auth/ActorProvider.tsx`, `web/src/lib/persistence/` | Adapt identity source, preserve actor-keyed queries/drafts and clearing behavior |
| Credits | `server/domain/credits/CreditApplicationService.js`, `server/repositories/credits/CreditAccountRepository.js`, `server/repositories/credits/CreditLedgerRepository.js` | Migrate local estimates/reservations/ledger to transactional adapters; no second ledger |
| JSON infrastructure | `server/repositories/json/jsonFileStore.js` | Atomic local writes and process mutex do not provide cross-process SQL transactions |
| Image Generation | `server/domain/generation/GenerationApplicationService.js`, `server/domain/generation/QueueManager.js` | Preserve facade; replace process image queue with durable orchestration |
| Video tasks | `server/domain/generation/VideoProviderTaskService.js`, `server/repositories/generation/VideoProviderTaskRepository.js` | Existing local task records, not proof of transactional Worker leases/outbox |
| Job Center | `server/domain/generation/GenerationJobCenterService.js` | Reuse read/navigation projection; do not create another execution owner |
| Assets | `server/domain/assets/ReferenceAssetService.js`, `server/repositories/assets/` | Reuse upload/reference metadata and image presentation; general durable storage pending |
| Provider GCS | `server/repositories/assets/GoogleCloudProviderAssetStorage.js` | Reuse signed provider handoff and uploaded-object reuse; not global Asset cutover |
| Reference authority | `server/domain/reference-processing/` | Preserve role ordering, processing and provider-limit contracts; classify cache/source data |
| Character identity and Looks | `server/domain/character-profiles/CharacterLookService.js`, `server/repositories/character-profiles/` | Migrate pinned Profile/Version/Look/usage relationships; separate display imagery from generation reference |
| Templates | `server/domain/templates/TemplateCoreService.js`, `server/domain/template-pose-proxy/` | Reuse versions, constrained inputs, use sessions, pricing and preparation lineage |
| Community Template detail/publication | `server/domain/community/CommunityTemplateDetailService.js`, `server/domain/community/CommunityShareService.js` | Preserve public family previews, sanitized snapshots, derived-prompt privacy and duplicate guards |
| Comparisons and Collections | `server/repositories/comparisons/`, `server/repositories/collections/` | Migrate authoritative sets/membership as well as derived views |
| Fashion | `server/domain/fashion-blueprint/`, `web/src/features/fashion-blueprint/` | Reuse plan/quote/run; commercial Product/workspace and durable batches are additional work |
| Cinematic | `server/domain/cinematic/`, `server/repositories/cinematic/` | Existing Project/Cast/Story Plan/Shot/Storyboard/Produce/Finish; do not rename into generic Project |
| Support | `server/domain/support/SupportCaseService.js`, `server/repositories/support/SupportCaseRepository.js` | Reuse Case/notes/links/status/version checks; production commands/approvals/Audit atomicity pending |
| Audit | `server/domain/audit/AuditService.js`, `server/repositories/audit/` | Migrate local events with retention, tamper resistance and transactional boundaries |
| Provider master controls | `server/domain/admin-configuration/ProviderControlApplicationService.js`, `server/domain/admin-configuration/ProviderAvailabilityPolicyService.js` | Preserve global and per-workflow gates; durable state and worker invalidation need review |
| Feature exposure | `server/domain/admin/AdminFeaturePolicyService.js`, `web/src/app/routeRegistry/`, `web/src/lib/permissions/` | Reuse existing policy/UI consumers; authenticated paid entitlements are different future records |

No PostgreSQL adapter/migration framework, real session/credential lifecycle or
payment/purchase adapter was found in the inspected runtime. This is a source
finding, not a claim that no database software or cloud resource exists outside
the repository. GCP remains the deployment target, not a deployment completion.

## 3. Gaps That Change The Old Plan

| ID | Gap/correction | Owning requirement and gate |
|---|---|---|
| ALIGN-01 | Supplied mock header/query IDs still resolve in production mode; hiding the switcher is insufficient | Phase2-04; mandatory server fail-closed and private-read/write tests |
| ALIGN-02 | Source review is not Wave 0 inventory: record counts/hashes/orphans and all writers remain unmeasured | Phase2-03 Wave 0 before affected data cutover |
| ALIGN-03 | Support Cases already exist; do not build another Case repository/console | Phase2-18 plus Backend 018; adapt staff identity, persistence and recovery commands |
| ALIGN-04 | GCS exists for provider handoff, but not all durable assets | Phase2-06; preserve originals/checksums, private delivery and current handoff |
| ALIGN-05 | Cinematic Project is not the new commercial workspace | Phase2-05; explicit mapping before schema/foreign-key freeze |
| ALIGN-06 | Looks, Cinematic, Reference Processing, Video Tasks and provider overrides were missing from the migration map | Phase2-03; classify source/cache/configuration, assign dependency waves |
| ALIGN-07 | Comparison sets, Collections and public posts are not merely rebuildable projections | Phase2-03 Wave 6; preserve source records before rebuilding counters/history |
| ALIGN-08 | Existing feature flags/provider controls are not purchased entitlements | Phase2-02/09; extend consumers, no parallel catalog or entitlement bypass |
| ALIGN-09 | Local pricing/generation success does not prove payment or SQL financial safety | Phase2-07/08/10; exact reconciliation and durable idempotency gates |
| ALIGN-10 | Old ordering could block login on gateway, full Support UI or later-domain schema decisions | Phase2-20; local DB/Auth/Audit record first, staged decisions and tests |

These corrections are reflected in the owning phase documents. Remaining gaps
are implementation/decision work, not falsely closed by editing this register.

## 4. MVP Priority And Protected Decisions

1. Inventory and choose local migration/auth foundations.
2. Prove a real session, trusted actor and one owner-scoped PostgreSQL record
   with durable Audit. No payment or generation is needed for this checkpoint.
3. Adapt Support and generic ownership, then transactional Credits.
4. Prove general private Assets and durable Generation with provider controls.
5. Continue approved domain cutovers, payments and scoped paid-launch gates.

Retain the existing Fashion first-paid direction without forcing a new merchant
wizard into the DB/Auth checkpoint. No product pricing, payment vendor, region,
ORM, subscription policy or cloud budget is newly selected in this review.

Current user decisions stay in `requirements/098-pending-features/000-master.md`:
Character preview and Template-to-Scene Builder accepted; off-center character
imagery, Favorites/personal storage, Character social and editorial content
deferred. Featured Template hiding is intentional, not missing functionality.
Security/privacy and media-rights launch gates remain mandatory.

Seedance/BytePlus support remains external-wait. Do not change providers,
replace approved images, trigger video retries or block account/database work
while awaiting that answer. Muse's accepted no-reference image workflows stay
available under current catalog and master controls; do not infer Fashion or
Character Sheet reference support from that success.

## 5. Decisions At The Relevant Gate

| Before | Decision still required |
|---|---|
| Foundation coding | Migration/query tooling proof, auth/session implementation, verified-email delivery approach, mock-account claim/bootstrap policy |
| Identity DDL freeze | User uniqueness/status mapping, staff-role mapping, token expiry, Audit transaction/retention contract |
| Workspace migration | Legacy owner/Collection mapping and optional Cinematic-workspace relationship |
| Financial cutover | Source ledger taxonomy, locking/idempotency boundaries, zero-difference reconciliation and forward-repair policy |
| Cloud deployment | Region, resource budget, secrets, RPO/RTO, retention, backup/restore and maintenance tolerance |
| Payment implementation | Gateway, currency/tax, one-time pack terms and refund/chargeback policy |
| Each enabled production capability | Approved schema/adapter, source reconciliation, authorization and no live transactional JSON dependency |

Do not ask all later-stage decisions as a prerequisite to the first local slice.
Preserve stable IDs, no silent mock-to-real ownership grants, no permanent dual
write and no rollback to stale JSON after authoritative financial writes.

## 6. Verification Evidence And Limits

Existing focused regression anchors to reuse when those owners change:

- Identity: `test/mockActorContext.test.js` (mock baseline, not real-auth proof).
- Credits: `test/creditApplicationService.test.js`,
  `test/creditComparisonBilling.test.js`, `test/creditEstimateGenerationParity.test.js`.
- Assets/tasks: `test/googleCloudProviderAssetStorage.test.js`,
  `test/referenceAssetService.test.js`, `test/videoProviderTaskService.test.js`.
- Admin/policy: `test/adminBackoffice.test.js`,
  `test/providerControlRepository.test.js`, `test/providerAvailabilityPolicy.test.js`.
- Character/Template: `test/characterLookService.test.js`,
  `test/templateInputPolicy.test.js`, `test/templateDerivedSharing.test.js`,
  `test/communityTemplateDetail.test.js`.

Database/Auth/worker tests still need new isolated fixtures and PostgreSQL
adapter coverage. Phase2-20 owns small task exits and the planned aggregate
script contract. Do not run the full app test suite or a paid provider merely
to validate this documentation update.

Documentation verification: check changed-file whitespace, existing-path/link
resolution, statuses, phase dependencies, canonical names, mock-auth warning,
source-vs-projection classification and deferred/release-gate consistency.
Runtime, load, backup/restore and actual data inventory remain unverified here.

Recorded document checks: six relative Markdown links and 55 distinct source/
requirement/test paths in this crosswalk resolved during review. Historical
backend references in active phases now point to 018; 017 owns the separate
Unified Generation Job Center, not Admin/Support.
