# Server Repositories

`server/repositories/` isolates storage access from business behavior. Current adapters use local JSON files, but method contracts should be stable enough to migrate to a database.

## Folders

| Folder | Responsibility |
| --- | --- |
| `json/` | Shared JSON file store with directory creation, reads, mutation serialization and atomic writes |
| `generation/` | History repository and cursor pagination |
| `comparisons/` | Comparison set storage and comparison history joins |
| `identity/` | Mock user storage |

## JSON Adapter Rules

- Use `readJsonFile`, `writeJsonFileAtomic`, or `mutateJsonFile` from `json/jsonFileStore.js`.
- Do not add new ad hoc `safeWriteJson` helpers.
- Do not write runtime JSON directly from route modules.
- Store all local runtime JSON under `server/data/`.
- Keep repository return shapes compatible with existing route responses.

## Future Database Migration

Future database adapters should preserve existing repository method contracts first, then change internals behind the interface. Good migration candidates:

- `HistoryRepository` -> `generation_results`, `assets`, `scene_template_snapshots`
- `ComparisonRepository` -> `comparison_sets`, `comparison_runs`
- `MockUserRepository` -> `users`, `creator_profiles`
- community JSON repositories -> `community_posts`, `community_events`
- credit JSON data -> `user_credit_accounts`, `credit_ledger_entries`

Route modules should receive repositories/services from `server/app/createApp.js` so the storage adapter can be swapped without changing endpoint handlers.
