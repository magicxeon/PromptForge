# Server Repositories

`server/repositories/` isolates storage access from business behavior. Current adapters use local JSON files, but method contracts should be stable enough to migrate to a database.

## Folders

| Folder | Responsibility |
| --- | --- |
| `json/` | Shared JSON file store with directory creation, reads, mutation serialization and atomic writes |
| `generation/` | History storage plus normalized generation-result read facade |
| `comparisons/` | Comparison set storage and comparison history joins |
| `identity/` | Mock user storage |
| `community/` | Community post and remix-event storage |
| root contract files | Shared record status/visibility rules, schema stamping, legacy normalization and scoped cursors |

## JSON Adapter Rules

- Use `readJsonFile`, `writeJsonFileAtomic`, or `mutateJsonFile` from `json/jsonFileStore.js`.
- Do not add new ad hoc `safeWriteJson` helpers.
- Do not write runtime JSON directly from route modules.
- Store all local runtime JSON under `server/data/`.
- Keep repository return shapes compatible with existing route responses.
- Use `repositoryContracts.js`, `schemaVersioning.js`, and `recordNormalizer.js` for new persisted record types. Do not create a capability-specific duplicate.
- Repositories may accept `ActorContext` or normalized ids/query objects, but never Express `req`/`res` objects.
- JSON stores must retain references as ids or paths; strip embedded `data:image/*` values before public/template persistence.

## Future Database Migration

Future database adapters should preserve existing repository method contracts first, then change internals behind the interface. Good migration candidates:

- `HistoryRepository` -> `generation_results`, `assets`, `scene_template_snapshots`
- `GenerationResultRepository` is the normalized, owner-scoped read facade for that future table family.
- `ComparisonRepository` -> `comparison_sets`, `comparison_runs`
- `MockUserRepository` -> `users`, `creator_profiles`
- community JSON repositories -> `community_posts`, `community_events`
- credit JSON data -> `user_credit_accounts`, `credit_ledger_entries`

Route modules should receive repositories/services from `server/app/createApp.js` so the storage adapter can be swapped without changing endpoint handlers.
