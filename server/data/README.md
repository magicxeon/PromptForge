# Server Runtime Data

`server/data/` is the canonical local runtime-data root for the JSON-backed MVP.
It contains mutable application state only. Source modules, provider
configuration, prompt catalogs, visual assets, and generated image binaries do
not belong here.

This directory is a temporary persistence adapter boundary, not the production
database design. Repository method contracts and the schema map in
`requirements/005-implementation-community-plan/Community-00-003-repository-interface-and-database-schema-map.md`
are the migration source of truth.

## 1. Ownership Rules

Runtime access must follow:

```text
HTTP route
  -> domain service or policy
    -> repository under server/repositories/<capability>/
      -> server/repositories/json/jsonFileStore.js
        -> server/data/<capability>/<store>.json
```

Rules:

- Route modules must never read or write these files directly.
- Domain modules must not hard-code paths under `server/data/`.
- Resolve logical file keys through `server/config/paths.js` and
  `resolveDataFile(name)`.
- Mutations must use `mutateJsonFile()` through the owning repository or domain
  service.
- Do not add capability-specific atomic-write helpers.
- Do not treat a JSON record supplied by the browser as authorized. Ownership
  must come from the server `ActorContext`.
- New owned records should use durable `ownerUserId` values. `username` and
  `ownerUsername` are compatibility fields, not authorization keys.
- Embedded `data:image/*` and other large Base64 values must not be persisted in
  community, asset, or template snapshots.

## 2. Logical Data Stores

`Present` means the file currently exists in the workspace. `Lazy` means the
path is registered and the repository creates its parent directory/file on the
first mutation. A missing lazy file is equivalent to an empty store.

| Logical key | Runtime path | Root shape | Owner | Lifecycle | Future DB target |
| --- | --- | --- | --- | --- | --- |
| `mockUsers` | `identity/mockUsers.json` | array | `repositories/identity/MockUserRepository.js` | Present, development seed | `users`, `creator_profiles` |
| `history` | `generation/history.json` | array | `repositories/generation/HistoryRepository.js` | Present | `generation_results` |
| `collections` | `collections/collections.json` | object with `collections` | `repositories/collections/CollectionRepository.js`, legacy `domain/collections/CollectionManager.js` | Present | `collections`, `collection_items` |
| `database` | `credits/database.json` | credit database object | `repositories/credits/CreditAccountRepository.js`, `CreditLedgerRepository.js` | Present; legacy shape migrates through repository | `user_credit_accounts`, `credit_estimates`, `credit_reservations`, `credit_ledger_entries` |
| `communityPosts` | `community/communityPosts.json` | array | `repositories/community/CommunityPostRepository.js` | Present | `community_posts`, `scene_template_publications` |
| `remixEvents` | `community/remixEvents.json` | array | `repositories/community/RemixEventRepository.js` | Present | `community_events`, `remix_events` |
| `communityCharacters` | `community/communityCharacters.json` | array | `repositories/community/CommunityCharacterRepository.js` | Lazy | `community_characters`, `character_revisions` |
| `communityGallery` | `community/communityGallery.json` | array | `repositories/community/CommunityGalleryRepository.js` | Lazy | `community_gallery_items`, `community_posts` |
| `comparisons` | `comparisons/comparisons.json` | object with `sets` | `repositories/comparisons/ComparisonRepository.js` and adapter | Present | `comparison_sets`, `comparison_runs`, `comparison_results` |
| `assets` | `assets/assets.json` | array | `repositories/assets/AssetRepository.js` | Lazy | `assets`, `asset_variants` |
| `auditLogs` | `audit/auditLogs.json` | array | `repositories/audit/AuditLogRepository.js` | Present | `audit_events` |
| `sceneTemplateSnapshots` | `scene-templates/sceneTemplateSnapshots.json` | array | `repositories/scene-templates/SceneTemplateSnapshotRepository.js` | Lazy | `scene_template_snapshots`, `scene_template_versions` |

The complete logical-key mapping is maintained in
`server/config/paths.js`. Add the directory constant and `DATA_FILES` entry
there before introducing a new runtime store.

## 3. Store-Specific Notes

### Identity

`identity/mockUsers.json` exists only to simulate actors during local
development. It must never contain passwords, access tokens, payment data, or
real customer profiles. Future authentication must map an external auth subject
to the durable internal user id.

### Generation and Assets

`generation/history.json` stores generation metadata and output lineage. Actual
images and thumbnails live under `client/outputs/`; they are not JSON data-store
files.

The future `assets/assets.json` store contains normalized asset metadata and
storage keys. It must reference files by ids or relative paths rather than
embedding image bytes.

Queue state is currently operational/in-memory state. A generation history
record is not a durable queue replacement.

### Credits

`credits/database.json` may still contain the legacy `users` map. Credit
repositories own migration to the current schema:

```text
schemaVersion
accounts
estimates
reservations
ledgerEntries
```

Do not manually edit balances during normal development. Grants, reservations,
capture, refund, and admin adjustments must use credit domain/repository
operations so ledger and idempotency invariants remain valid.

### Community and Scene Templates

Public community data must contain sanitized snapshots only. Private face,
character, outfit, or style references must follow the reference-slot ownership
policy before publication.

Community characters, gallery records, and Scene Template snapshots are
repository-ready but may not have runtime files until their first write. Do not
create placeholder files merely to make the folders visible.

### Audit

`audit/auditLogs.json` is admin/support data. Records should use
`visibility: admin_only`, avoid raw sensitive payloads, and preserve stable
action, target, actor, request, and reason fields.

### Comparisons and Collections

Comparison and collection stores retain legacy top-level object shapes. Use
their repositories to normalize owner scope and result records. Do not flatten
or convert these files ad hoc because existing routes and migration fixtures
depend on their current adapters.

## 4. JSON File Semantics

`server/repositories/json/jsonFileStore.js` provides:

- `readJsonFile(filePath, fallbackValue)` for reads. A missing file returns a
  cloned fallback without creating the file.
- `ensureJsonFile(filePath, fallbackValue)` for explicit initialization.
- `writeJsonFileAtomic(filePath, data)` for temp-file plus rename writes with
  Windows `EPERM`/`EBUSY` retry handling.
- `mutateJsonFile(filePath, fallbackValue, operation)` for serialized mutation
  per file path.

All values passed to these helpers must be JSON-serializable. Concurrent
mutation safety applies only inside the current server process; this is one
reason JSON storage is not suitable for multi-instance production deployment.

## 5. Safe Local Seeds

Allowed:

- Mock identities in `identity/mockUsers.json`.
- Empty arrays or documented empty root objects.
- Small synthetic fixtures needed for local demos or automated tests.
- Explicit mock credit grants performed through the credit API/domain.

Not allowed:

- Real customer or payment information.
- API keys, tokens, cookies, or auth credentials.
- Private production prompts or reference images.
- Production database exports.
- Base64 image payloads.
- Manual ledger entries that bypass repository invariants.

Automated tests should prefer temporary data files injected into repository
constructors. Tests must not depend on or mutate the developer's active
`server/data/` files.

## 6. Backup and Migration

Back up mutable stores before migrations or destructive cleanup, especially:

```text
generation/history.json
collections/collections.json
credits/database.json
community/communityPosts.json
community/remixEvents.json
comparisons/comparisons.json
audit/auditLogs.json
```

Also include lazy stores if they exist:

```text
assets/assets.json
community/communityCharacters.json
community/communityGallery.json
scene-templates/sceneTemplateSnapshots.json
```

`migrations/backups/` and `migrations/checkpoints/` contain migration artifacts.
Do not delete or rewrite them without explicit user approval.

Migration procedure:

1. Stop mutating traffic or run in maintenance mode.
2. Create a dated backup and checkpoint.
3. Read through repositories or an approved migration script.
4. Normalize legacy owner ids and schema versions.
5. Validate record counts, ownership, references, and credit totals.
6. Switch repository adapters only after compatibility tests pass.

## 7. Adding a New Runtime Store

Before adding a store:

1. Confirm an existing aggregate cannot own the data.
2. Document its record contract and future database target in the relevant
   requirement.
3. Add its canonical path to `server/config/paths.js`.
4. Add or extend the owning repository under
   `server/repositories/<capability>/`.
5. Use shared repository contracts, schema versioning, normalization, and cursor
   helpers where applicable.
6. Add tests using a temporary file path.
7. Update this README and `requirements/007-technical-dept/000-master.md` if the
   new capability changes architecture ownership.

Never introduce a root-level JSON file under `server/`.
