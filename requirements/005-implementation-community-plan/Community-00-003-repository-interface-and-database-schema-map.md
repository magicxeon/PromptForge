# Community-00-003 Repository Interface and Database Schema Map

**Status:** In Implementation - JSON Repository Foundation  
**Feature type:** JSON-to-database migration contract and repository boundary  
**Depends on:** Community-00-002 Mock User / Actor Context, existing JSON repositories  
**Feeds into:** Community-00-004 Ownership Policy, Community-00-005 Credit Ledger, Community-00-006 Admin Audit, Scene Builder template sharing  
**Created:** 2026-07-19  
**Last updated:** 2026-07-20

## 1. Business Requirement

The product is moving from a single-user local prototype into a community platform where people can:

- Generate images under a specific user account.
- Keep private history and collections separate per user.
- Publish selected images, prompts, workflows, and Scene Templates to Community.
- Let other users remix templates without leaking private face, character, or outfit references.
- Deduct credits for real AI generation.
- Support admin and support actions later.

The current implementation stores data in JSON files. That is still acceptable for this phase, but the domain model must stop being "whatever the JSON happens to look like". We need repository contracts and database-ready schemas now so the app can migrate to PostgreSQL/Supabase later without rewriting routes, UI modules, or community logic.

The outcome of this requirement is **not** a full database migration. The outcome is a stable storage boundary:

```text
Route -> Service -> Policy -> Repository Contract -> JSON implementation now / DB implementation later
```

## 2. Source Of Truth And Existing Data Origins

The repository layer must be designed from the data already used by the app. Do not invent incompatible schemas.

### 2.1 Current JSON Sources

| Current file | Current owner | Current purpose | Future table family |
| --- | --- | --- | --- |
| `server/data/identity/mockUsers.json` | `repositories/identity/MockUserRepository` | Development user identities and roles | `users`, `creator_profiles` |
| `server/data/credits/database.json` | `domain/credits/CreditManager` | Legacy credit balances and credit ledger | `user_credit_accounts`, `credit_ledger_entries` |
| `server/data/generation/history.json` | `repositories/generation/HistoryRepository`, `domain/generation/QueueManager` | Generated image history records | `generation_results`, `assets`, `scene_template_snapshots` |
| `server/data/collections/collections.json` | `domain/collections/CollectionManager` | User image collections | `collections`, `collection_items` |
| `server/data/comparisons/comparisons.json` | `repositories/comparisons/ComparisonRepository` | Model comparison sets and comparison result metadata | `comparison_sets`, `comparison_runs`, `generation_results` |
| `server/data/community/communityPosts.json` | `repositories/community/CommunityPostRepository` | Local shared template/community post mock data | `community_posts` |
| `server/data/community/remixEvents.json` | `repositories/community/RemixEventRepository` | Local remix event analytics | `remix_events`, `audit_events` |

### 2.2 Current Client Sources

| Current client source | Purpose | Repository impact |
| --- | --- | --- |
| `window.state.username` | Legacy compatibility username | Must not be an authorization source |
| `window.ModelPromptForgeActorContext` | Active mock user id and actor header | Must become the request identity boundary |
| `sceneTemplateSnapshot` from generation payload/history | Reusable Scene Builder template contract | Must map to `scene_template_snapshots` |
| `referenceSlotMapping` / `replaceableVariables` | Template replacement and remix controls | Must remain JSONB-compatible |
| LocalStorage mode state | User-scoped UI draft state | Not a backend repository; may migrate later to user preferences |

### 2.3 Canonical Identity Key

New repository records must use:

```text
ownerUserId: usr_*
```

Legacy records may still contain:

```text
username: user_demo | user_alice | user_bob | admin_demo
ownerUsername: user_demo | ...
```

Migration rule:

```text
If ownerUserId exists:
  use ownerUserId
Else if username or ownerUsername exists:
  resolve through MockUserRepository.findByUsername()
Else:
  treat as legacy Demo User -> ownerUserId = usr_demo, ownerUsername = user_demo
```

Do not authorize by display name, role label from the client, or request body `username`.

## 3. Repository Design Principles

### 3.1 Boundary Rules

- Routes must not read/write JSON files directly.
- Services should not know whether storage is JSON or database.
- Policy modules decide visibility, ownership, moderation, and reusable-reference rules.
- Repository modules validate storage shape, timestamps, schema version, and lookup/filter performance.
- Repositories accept `ActorContext` or normalized query objects, not Express `req`.
- All repository methods must be testable with temporary JSON files and later replaceable by DB implementations.

### 3.2 Repository Layers

Use this layering:

```text
server/server.js
  -> service/orchestrator module
    -> policy module
      -> repository contract
  -> JSON repository adapter under server/repositories/<capability>/
        -> future PostgreSQL repository adapter
```

Example:

```text
POST /api/scene-templates/share-drafts
  -> SceneTemplateShareService.createDraft(actorContext, sourceGenerationId)
    -> ReferenceSlotPolicy.sanitizeForPublic(...)
  -> GenerationResultRepository.findByIdForOwner(...)
      -> SceneTemplateSnapshotRepository.createDraft(...)
```

## 4. Common Record Contract

Every persistent domain record should include the following fields unless explicitly documented otherwise:

```text
id: string
schemaVersion: number
ownerUserId: string | null
ownerUsername: string | null              // compatibility only during JSON phase
visibility: private | unlisted | public | members_only | admin_only
status: active | hidden | archived | deleted | failed | disabled
createdAt: ISO string or epoch ms         // choose per existing source, normalize in repository output
updatedAt: ISO string or epoch ms
deletedAt: ISO string or epoch ms | null
metadata: object
```

Rules:

- New Community records should use ISO strings for `createdAt/updatedAt`.
- Existing generation history may keep epoch ms in `timestamp`; repository output should also expose normalized `createdAt`.
- Soft delete should set `status = deleted` and `deletedAt`; physical delete is allowed only for local history image cleanup or explicit maintenance tasks.
- Large blobs or base64 images must not be stored in template/community JSON. Store file reference fields instead.

## 5. Repository Interface Standard

### 5.1 Base Methods

Each repository should implement only the methods that fit its aggregate, but method names and return shapes must stay consistent:

```text
create(recordInput, actorContext) -> Promise<Record>
findById(id, options) -> Promise<Record | null>
findByIdForOwner(id, ownerUserId, options) -> Promise<Record | null>
findByOwner(ownerUserId, query) -> Promise<Page<Record>>
listPublic(query, viewerContext) -> Promise<Page<Record>>
updateById(id, patch, actorContext) -> Promise<Record>
softDelete(id, actorContext) -> Promise<{ success: true }>
appendEvent(eventInput, actorContext) -> Promise<EventRecord>
```

### 5.2 Page Shape

All list methods should return:

```text
Page<T>
- items: T[]
- nextCursor: string | null
- hasMore: boolean
- totalApprox?: number
```

The cursor may be HMAC encoded in JSON phase and database cursor/token in DB phase. Routes must treat cursors as opaque.

### 5.3 Query Shape

Use explicit query objects:

```text
ListQuery
- limit: number
- cursor: string | null
- sort: newest | oldest | trending | updated
- filters: object
```

Do not pass Express query objects directly into repositories.

## 6. Database Schema Map

This schema map is the DB target. JSON repositories may store a simplified shape but must be able to hydrate this shape.

### 6.1 `users`

Source now:

```text
server/data/identity/mockUsers.json
```

Columns:

```text
id: text primary key                         // usr_demo
username: text unique not null               // user_demo
display_name: text not null
role: text not null                          // user | creator | admin | support
status: text not null                        // active | disabled
auth_provider: text not null                 // mock | supabase
auth_subject: text null                      // future Supabase user id
active_creator_profile_id: text null
feature_flags: jsonb not null default []
created_at: timestamptz not null
updated_at: timestamptz not null
```

Migration notes:

- `creditBalanceSeed` from mock users is seed data only, not production balance.
- Production auth must map external auth user id to `users.id`.

### 6.2 `creator_profiles`

Source now:

```text
server/data/identity/mockUsers.json.activeCreatorProfileId
future Community creator profile settings
```

Columns:

```text
id: text primary key                         // creator_alice
user_id: text references users(id)
handle: text unique not null
display_name: text not null
bio: text null
avatar_asset_id: text null
badge_codes: jsonb not null default []
follower_count: integer not null default 0
public_post_count: integer not null default 0
membership_enabled: boolean not null default false
status: text not null                        // active | hidden | disabled
created_at: timestamptz not null
updated_at: timestamptz not null
```

### 6.3 `assets`

Source now:

```text
client/outputs/*
thumbnail paths from history records
uploaded reference image fields
```

Columns:

```text
id: text primary key                         // ast_*
owner_user_id: text references users(id)
asset_type: text not null                    // generated_image | reference_image | thumbnail | source_upload
storage_provider: text not null              // local | r2 | s3
storage_key: text not null                   // outputs/job_123.png or object key
public_url: text null
thumbnail_url: text null
mime_type: text null
size_bytes: bigint null
width: integer null
height: integer null
source_job_id: text null
visibility: text not null                    // private | public | unlisted
status: text not null                        // active | deleted | blocked
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

Rules:

- Base64 data is never stored here.
- `/outputs/...` from local history maps to `storage_provider = local`, `storage_key = outputs/...`.
- Public community display should use sanitized thumbnail/display URLs, not private reference URLs.

### 6.4 `generation_results`

Source now:

```text
server/data/generation/history.json
QueueManager.saveToHistory(entry)
client/core/generationService.js job metadata
```

Columns:

```text
id: text primary key                         // current job id, job_*
schema_version: integer not null default 1
owner_user_id: text references users(id)
owner_username: text null                    // JSON compatibility
job_id: text unique not null
mode: text not null                          // headshot | character-sheet | normal/scene
prompt_snapshot: text not null
image_asset_id: text null references assets(id)
thumbnail_asset_id: text null references assets(id)
image_url: text null                         // compatibility during JSON phase
thumbnail_url: text null
provider_id: text not null
model_id: text not null
generation_settings: jsonb not null default {}
selections_snapshot: jsonb not null default {}
scene_template_snapshot_id: text null
scene_template_snapshot: jsonb null          // JSON phase compatibility
reference_job_ids: jsonb not null default {}
credit_cost_snapshot: numeric null
usage_snapshot: jsonb null
status: text not null                        // completed | failed | deleted
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

Mapping from `server/data/generation/history.json`:

```text
history.id -> generation_results.id and job_id
history.username -> resolve owner_user_id through mock users
history.prompt -> prompt_snapshot
history.mode -> mode
history.imageUrl -> image_url and future assets.storage_key
history.thumbnailUrl -> thumbnail_url
history.provider -> provider_id
history.submodel -> model_id
history.selections -> selections_snapshot
history.sceneTemplateSnapshot -> scene_template_snapshot / scene_template_snapshot_id
history.referencedFaceJobIds -> reference_job_ids.face
history.referencedStyleJobIds -> reference_job_ids.style
history.referencedCharacterJobIds -> reference_job_ids.character
history.referencedOutfitJobIds -> reference_job_ids.outfit
history.timestamp -> created_at
```

### 6.5 `scene_template_snapshots`

Source now:

```text
history.sceneTemplateSnapshot
client/scene-builder/sceneTemplateSerializer.js
client/scene-builder/sceneTemplateHydrator.js
server/domain/scene-templates/*
```

Columns:

```text
id: text primary key                         // stpl_*
schema_version: integer not null
owner_user_id: text references users(id)
source_generation_result_id: text null references generation_results(id)
authoring_mode: text not null                // guided | manual
final_prompt_snapshot: text not null
structured_selections_snapshot: jsonb not null default {}
manual_prompt_text: text null
reference_slot_mapping: jsonb not null default {}
replaceable_variables: jsonb not null default []
provider_model_snapshot: jsonb not null default {}
generation_settings_snapshot: jsonb not null default {}
share_policy_snapshot: jsonb not null default {}
visibility: text not null                    // private | public | unlisted
status: text not null                        // active | hidden | deleted
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

Required JSONB compatibility:

```text
reference_slot_mapping must preserve slot ids:
  face_reference
  character_reference
  outfit_reference_front
  outfit_reference_back
  style_reference

replaceable_variables must preserve:
  id
  label
  type
  defaultValue
  allowedValues/options
  isRequired
  lockedByCreator
```

### 6.6 `community_posts`

Source now:

```text
server/data/community/communityPosts.json
server/domain/community/CommunityShareService.js publishSceneTemplateShare()
client/scene-builder/sceneSharePreview.js
```

Columns:

```text
id: text primary key                         // post_*
schema_version: integer not null default 1
owner_user_id: text references users(id)
owner_username: text null
creator_profile_id: text null references creator_profiles(id)
source_generation_result_id: text references generation_results(id)
title: text not null
description: text null
image_asset_id: text null references assets(id)
thumbnail_asset_id: text null references assets(id)
image_url: text null                         // JSON/local compatibility
thumbnail_url: text null
official_tags: jsonb not null default []
custom_tags: jsonb not null default []
category_codes: jsonb not null default []
prompt_visibility: text not null             // full | remix_only | hidden
shared_prompt_snapshot: text null
scene_template_snapshot_id: text null references scene_template_snapshots(id)
scene_template_snapshot: jsonb null          // JSON phase compatibility
workflow_snapshot: jsonb not null default {}
visibility: text not null                    // public | unlisted | members_only | private
reuse_policy: text not null                  // view_only | use_template | remix_allowed | paid_template
status: text not null                        // draft | published | hidden | removed
counts: jsonb not null default {}
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

Mapping from `server/data/community/communityPosts.json`:

```text
post.id -> id
post.ownerUsername -> owner_username -> owner_user_id via mock user lookup
post.sourceGenerationId -> source_generation_result_id
post.title -> title
post.description -> description
post.imageUrl -> image_url / future image_asset_id
post.thumbnailUrl -> thumbnail_url / future thumbnail_asset_id
post.promptVisibility -> prompt_visibility
post.sceneTemplateSnapshot -> scene_template_snapshot / future scene_template_snapshot_id
post.createdAt -> created_at
```

### 6.7 `community_gallery_items`

Source now:

```text
future explicit "show in gallery" action from History/Lightbox
requirements/005-implementation-community-plan gallery requirement
```

Columns:

```text
id: text primary key                         // gal_*
owner_user_id: text references users(id)
creator_profile_id: text null references creator_profiles(id)
source_generation_result_id: text references generation_results(id)
image_asset_id: text null references assets(id)
title: text null
description: text null
visibility: text not null                    // public | unlisted | private | members_only
reuse_policy: text not null                  // view_only | template_allowed | reference_allowed
scene_builder_handoff_snapshot: jsonb null
status: text not null                        // active | hidden | deleted
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

### 6.8 `community_character_assets`

Source now:

```text
Headshot Grid -> Build Character handoff
Character Sheet Builder output
future Community Character profile/publish action
```

Columns:

```text
id: text primary key                         // char_*
owner_user_id: text references users(id)
creator_profile_id: text null references creator_profiles(id)
display_name: text not null
description: text null
character_type: text not null                // headshot_only | full_character_sheet | outfit_only
preview_image_asset_id: text null references assets(id)
face_reference_policy: text not null         // private | replace_required | reusable
outfit_reference_policy: text not null       // none | private | replace_required | reusable
scene_builder_handoff_snapshot: jsonb not null default {}
source_generation_result_ids: jsonb not null default []
visibility: text not null                    // private | public | members_only
reuse_policy: text not null                  // view_only | use_as_character | remix_allowed
status: text not null                        // active | hidden | deleted
created_at: timestamptz not null
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

### 6.9 `collections` and `collection_items`

Source now:

```text
server/data/collections/collections.json
server/domain/collections/CollectionManager.js
```

Columns:

```text
collections
- id: text primary key                       // col_*
- owner_user_id: text references users(id)
- owner_username: text null
- name: text not null
- description: text null
- story: text null
- cover_generation_result_id: text null
- is_default: boolean not null default false
- status: text not null                      // active | deleted
- created_at: timestamptz not null
- updated_at: timestamptz not null
- metadata: jsonb not null default {}

collection_items
- id: text primary key                       // coli_*
- collection_id: text references collections(id)
- generation_result_id: text references generation_results(id)
- sort_order: integer not null default 0
- added_at: timestamptz not null
```

Mapping from `server/data/collections/collections.json`:

```text
collection.ownerUsername -> owner_username -> owner_user_id
collection.jobIds[] -> collection_items.generation_result_id
collection.coverJobId -> cover_generation_result_id
defaultCollectionId -> collection.is_default
```

### 6.10 `comparison_sets` and `comparison_runs`

Source now:

```text
server/data/comparisons/comparisons.json
server/repositories/comparisons/ComparisonRepository.js
server/domain/comparisons/ComparisonOrchestrator.js
```

Columns:

```text
comparison_sets
- id: text primary key
- owner_user_id: text references users(id)
- owner_username: text null
- source_prompt: text not null
- mode: text null
- selections_snapshot: jsonb not null default {}
- winner_generation_result_id: text null
- status: text not null
- created_at: timestamptz not null
- updated_at: timestamptz not null
- metadata: jsonb not null default {}

comparison_runs
- id: text primary key
- comparison_set_id: text references comparison_sets(id)
- provider_id: text not null
- model_id: text not null
- generation_result_id: text null references generation_results(id)
- submitted_prompt: text null
- credit_cost_snapshot: numeric null
- status: text not null
- error_snapshot: jsonb null
- created_at: timestamptz not null
- completed_at: timestamptz null
```

### 6.11 `credit_ledger_entries`

Source now:

```text
server/data/credits/database.json.users
server/data/credits/database.json.creditLedger
server/domain/credits/CreditManager.js
```

Columns:

```text
id: text primary key                         // led_*
user_id: text references users(id)
username: text null                          // JSON compatibility
operation_type: text not null                // generation_charge | generation_refund | lost_job_refund | recharge | adjustment
amount_credits: numeric not null             // negative for deduction, positive for credit
balance_after: numeric not null
related_job_id: text null
related_template_id: text null
related_post_id: text null
provider_id: text null
model_id: text null
pricing_policy_version: text null
reason: text null
request_id: text null
created_at: timestamptz not null
metadata: jsonb not null default {}
```

Rules:

- Ledger is append-only.
- Balance is derived from ledger or kept in a separate account table with transactional updates.
- Details of deduction rules belong in Community-00-005.

### 6.12 `user_credit_accounts`

Source now:

```text
server/data/credits/database.json.users[username].credits
```

Columns:

```text
user_id: text primary key references users(id)
username: text null
available_credits: numeric not null default 0
reserved_credits: numeric not null default 0
lifetime_purchased_credits: numeric not null default 0
lifetime_spent_credits: numeric not null default 0
updated_at: timestamptz not null
metadata: jsonb not null default {}
```

### 6.13 `audit_events`

Source now:

```text
future admin/support actions
remixEvents may emit related analytics but should not replace audit
```

Columns:

```text
id: text primary key                         // audit_*
actor_user_id: text references users(id)
actor_role: text not null
action: text not null                        // hide_post | restore_post | credit_adjustment | user_suspend | etc.
target_type: text not null                   // post | user | asset | template | credit_account
target_id: text not null
reason: text null
before_snapshot: jsonb null
after_snapshot: jsonb null
request_id: text null
ip_hash: text null
created_at: timestamptz not null
metadata: jsonb not null default {}
```

### 6.14 `remix_events`

Source now:

```text
server/data/community/remixEvents.json
```

Columns:

```text
id: text primary key                         // remix_*
actor_user_id: text references users(id)
actor_username: text null
source_post_id: text references community_posts(id)
template_id: text null
generated_job_id: text null references generation_results(id)
replacement_summary: jsonb not null default {}
created_at: timestamptz not null
metadata: jsonb not null default {}
```

## 7. JSON Repository Implementation Standard

### 7.1 File Layout

New repository modules should live under:

```text
server/repositories/json/
server/repositories/generation/
server/repositories/community/
server/repositories/identity/
server/repositories/collections/
server/repositories/credits/
server/repositories/audit/
```

Existing modules may be wrapped gradually:

```text
server/repositories/generation/HistoryRepository.js -> GenerationResultRepository read facade
server/domain/collections/CollectionManager.js -> future CollectionRepository adapter
server/domain/community/CommunityShareService.js -> service using community repositories
server/domain/credits/CreditManager.js -> future CreditAccountRepository + CreditLedgerRepository
```

### 7.2 Atomic JSON Writes

Use one helper for JSON writes:

```text
write temp file -> rename temp file -> retry EPERM/EBUSY on Windows
```

Reason:

- The app already hit Windows `EPERM rename` when writing JSON.
- Each repository should not duplicate its own slightly different file writer.

Canonical shared file:

```text
server/repositories/json/jsonFileStore.js
```

Required functions:

```text
readJsonFile(filePath, fallback)
writeJsonFileAtomic(filePath, data)
mutateJsonFile(filePath, fallback, operation)
```

### 7.3 ID Prefixes

Use stable, readable prefixes:

```text
usr_    user
creator_ creator profile
ast_    asset
job_    generation result / current queue job id
stpl_   scene template snapshot
post_   community post
gal_    gallery item
char_   character asset
col_    collection
coli_   collection item
cmp_    comparison set
cmpr_   comparison run
led_    credit ledger entry
audit_  audit event
remix_  remix event
```

## 8. Migration And Compatibility Rules

### 8.1 JSON Phase

During this phase:

- Existing JSON files remain active.
- New repository wrappers should hydrate legacy fields into the database-ready output shape.
- UI should continue using existing response shapes unless a requirement explicitly changes API contracts.
- New Community features should store records in the new shape even if backed by JSON.

### 8.2 Database Phase

When moving to PostgreSQL/Supabase:

- Keep repository method names stable.
- Replace repository implementation, not route/service callers.
- Create migration scripts from JSON files to DB tables using this schema map.
- Preserve ids where possible to avoid breaking local references and template snapshots.

### 8.3 Legacy Field Handling

Allowed during JSON phase:

```text
username
ownerUsername
imageUrl
thumbnailUrl
sceneTemplateSnapshot as embedded JSON
timestamp as epoch ms
```

Required in normalized repository output:

```text
ownerUserId
ownerUsername
createdAt
updatedAt
status
schemaVersion
```

### 8.4 Privacy And Payload Rules

- Repository records must not store large base64 references.
- Private reference slots must be sanitized before saving public posts.
- Community posts may keep preview URLs only when policy allows display.
- The generation payload can temporarily resolve file references to base64 server-side, but stored snapshots should keep references as ids/URLs, not raw base64.

## 9. Software Development Specification

### 9.1 Proposed Files

```text
server/repositories/json/jsonFileStore.js
server/repositories/repositoryContracts.js
server/repositories/schemaVersioning.js
server/repositories/recordNormalizer.js
server/repositories/RepositoryCursor.js

server/repositories/generation/GenerationResultRepository.js
server/repositories/assets/AssetRepository.js
server/repositories/scene-templates/SceneTemplateSnapshotRepository.js
server/repositories/collections/CollectionRepository.js
server/repositories/comparisons/ComparisonRepositoryAdapter.js

server/repositories/community/CommunityPostRepository.js
server/repositories/community/CommunityGalleryRepository.js
server/repositories/community/CommunityCharacterRepository.js
server/repositories/community/RemixEventRepository.js

server/repositories/credits/CreditAccountRepository.js
server/repositories/credits/CreditLedgerRepository.js
server/repositories/audit/AuditLogRepository.js

test/repositoryContracts.test.js
test/repositorySchemaNormalization.test.js
test/jsonFileStore.test.js
```

### 9.2 `repositoryContracts.js`

Exports shared documentation/constants for repository method names and record status enums.

Suggested exports:

```text
RECORD_STATUS
VISIBILITY
REUSE_POLICY
PROMPT_VISIBILITY
assertActorContext(actorContext)
assertOwnerScope(record, ownerUserId)
```

### 9.3 `recordNormalizer.js`

Pure helper for legacy hydration.

Required functions:

```text
resolveOwnerFromLegacy(record, mockUserRepo) -> { ownerUserId, ownerUsername }
normalizeEpochOrIsoDate(value) -> ISO string
normalizeGenerationHistoryRecord(historyItem, mockUserRepo) -> GenerationResultRecord
normalizeCommunityPostRecord(post, mockUserRepo) -> CommunityPostRecord
normalizeCollectionRecord(collection, mockUserRepo) -> CollectionRecord
```

### 9.4 Repository Acceptance Rules

Every repository implementation must:

- Accept file path overrides for tests.
- Return cloned/serialized-safe objects, not mutable internal references.
- Set `schemaVersion` on create.
- Set `createdAt` and `updatedAt` on create.
- Update `updatedAt` on patch.
- Hide `status = deleted` records from normal list methods.
- Support owner-scoped list methods.
- Avoid importing Express or browser modules.

## 10. Implementation Plan

### 10.1 User Review Required

- This requirement does **not** switch production storage to PostgreSQL yet.
- This requirement does **not** implement payment, subscriptions, or real auth.
- This requirement allows gradually wrapping existing JSON files instead of rewriting every existing manager in one pass.
- Any new Community repository must follow this contract from day one.

### 10.2 Step-by-Step Implementation

1. Reuse the existing `server/repositories/json/jsonFileStore.js`; do not create another writer.
2. Create `repositoryContracts.js`, `schemaVersioning.js`, `recordNormalizer.js`, and `RepositoryCursor.js` as storage-neutral helpers.
3. Add repository tests using temporary JSON files and a temporary mock-user fixture.
4. Replace the CommunityShareService embedded JSON classes with `repositories/community/CommunityPostRepository` and `RemixEventRepository`.
5. Add a read-only `repositories/generation/GenerationResultRepository` facade without changing `HistoryRepository` or QueueManager write APIs.
6. Update CommunityShareService and Scene Template routes to pass `ActorContext` into repository/service calls while preserving existing endpoint response fields.
7. Defer Collection, Asset, Scene Template Snapshot, Credit, Audit, and Comparison adapters until their owning requirement changes behavior.
8. Update Community-00-004, `00-005`, and `00-006` implementations to use these contracts when they are implemented.

### 10.3 First-Pass Scope

The first implementation pass should prioritize records that Community needs immediately:

```text
CommunityPostRepository
RemixEventRepository
GenerationResultRepository read-only wrapper
recordNormalizer owner/date helpers
existing jsonFileStore shared writer
```

Leave these as planned wrappers unless a feature touches them:

```text
AssetRepository
CreditLedgerRepository
AuditLogRepository
ComparisonRepositoryAdapter
```

### 10.4 Implementation Acceptance Checklist

Before marking this requirement complete:

```text
No new route reads/writes community JSON directly.
Community post reads go through a repository.
Remix event writes go through a repository.
Legacy owner fields normalize to ownerUserId.
Legacy no-owner records normalize to usr_demo/user_demo.
JSON write helper uses atomic temp-file + rename retry.
Repository tests run with temporary files.
Repository output includes schemaVersion/status/createdAt/updatedAt where applicable.
No repository imports Express req/res.
No repository stores base64 images in public/template records.
```

### 10.5 First-Pass Implementation Record

The first pass implements the Community-critical storage boundary only:

```text
Implemented:
  server/repositories/repositoryContracts.js
  server/repositories/schemaVersioning.js
  server/repositories/recordNormalizer.js
  server/repositories/RepositoryCursor.js
  server/repositories/community/CommunityPostRepository.js
  server/repositories/community/RemixEventRepository.js
  server/repositories/generation/GenerationResultRepository.js
  server/domain/community/CommunityShareService.js updated to use repositories
  server/app/routes/sceneTemplateRoutes.js updated to pass ActorContext

Deferred intentionally:
  AssetRepository
  CollectionRepository
  SceneTemplateSnapshotRepository
  CreditAccountRepository and CreditLedgerRepository
  AuditLogRepository
  ComparisonRepositoryAdapter
```

The deferred adapters belong to their capability requirements. They must reuse the contracts and normalizers from this first pass rather than inventing new storage conventions.

## 11. Testing

### 11.1 Automated Tests

```text
TC-00-003-001 normalize history item with username=user_demo -> ownerUserId=usr_demo
TC-00-003-002 normalize legacy no-owner history item -> ownerUserId=usr_demo
TC-00-003-003 create community post sets schemaVersion/status/timestamps
TC-00-003-004 list owner records returns only actor-owned private records
TC-00-003-005 list public records hides deleted/hidden posts
TC-00-003-006 jsonFileStore write survives repeated writes and preserves valid JSON
TC-00-003-007 repository methods work with temp file path overrides
TC-00-003-008 base64 reference values are rejected or stripped from public template snapshots
TC-00-003-009 generation facade returns only records owned by the requested ownerUserId
```

### 11.2 Manual Verification

```text
1. Start as Demo User and create/generate a scene result.
2. Verify repository-normalized history owner maps to usr_demo.
3. Share a Scene Template.
4. Verify the saved community post contains ownerUserId/ownerUsername and no base64 references.
5. Switch to another mock user.
6. Verify private history/collections are not returned by owner-scoped list methods.
7. Use a public template and verify remix event stores actor user id separately from owner user id.
```

## 12. Impact And Risks

### Positive Impact

- Future DB migration becomes a repository swap instead of an app rewrite.
- Community, credit, and admin modules share the same identity and ownership model.
- Mock local JSON remains useful for fast development.
- Multiple AI agents can implement submodules against the same contract.

### Risks

- Over-wrapping all old managers at once can slow feature progress.
- Keeping both `username` and `ownerUserId` temporarily can cause mistakes if not normalized consistently.
- Large history JSON files can remain slow until DB migration.
- Public template privacy can be broken if services bypass policy and repositories.

### Mitigations

- Prioritize wrappers only for Community-critical data first.
- Add tests for owner normalization and public snapshot sanitization.
- Treat `username` as compatibility only.
- Keep repository output explicit and database-shaped.

## 13. Developer Notes For Implementing Agents

When implementing this requirement, do not start by creating SQL migrations. Start by making the current JSON layer behave like the future database boundary.

Use these files as canonical inputs:

```text
Identity:
  server/data/identity/mockUsers.json

Generation history:
  server/data/generation/history.json
  server/repositories/generation/HistoryRepository.js
  server/domain/generation/QueueManager.js

Collections:
  server/data/collections/collections.json
  server/domain/collections/CollectionManager.js

Credits:
  server/data/credits/database.json
  server/domain/credits/CreditManager.js

Community sharing:
  server/data/community/communityPosts.json
  server/data/community/remixEvents.json
  server/domain/community/CommunityShareService.js

Scene template snapshots:
  client/scene-builder/sceneTemplateSerializer.js
  client/scene-builder/sceneTemplateHydrator.js
  server/domain/scene-templates/*
```

The guiding rule:

```text
JSON is the current storage engine.
Repository contracts are the product architecture.
Database tables are the future implementation target.
```
