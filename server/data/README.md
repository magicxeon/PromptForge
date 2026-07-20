# Server Data Directory

`server/data/` is the canonical local runtime data root for the JSON-backed MVP. No runtime JSON should be stored directly under `server/`.

## Runtime State Files

| File | Purpose | Future DB target |
| --- | --- | --- |
| `identity/mockUsers.json` | Local mock users and actor context fixtures | `users`, `creator_profiles` |
| `generation/history.json` | Generated image history and lineage metadata | `generation_results`, `assets`, `scene_template_snapshots` |
| `collections/collections.json` | User collections and default collection membership | `collections`, `collection_items` |
| `credits/database.json` | Mock credit balances and credit ledger entries | `user_credit_accounts`, `credit_ledger_entries` |
| `community/communityPosts.json` | Local shared Scene Template/community post mock data | `community_posts` |
| `community/remixEvents.json` | Local remix event audit records | `community_events`, `remix_events` |
| `comparisons/comparisons.json` | Comparison sets, runs, winners and result metadata | `comparison_sets`, `comparison_runs` |

## Safe To Seed

These files may be seeded in local development:

- `identity/mockUsers.json`
- empty arrays/objects for all runtime stores
- small local community/comparison fixtures used by tests

Do not seed real customer data, private images, API keys, payment records or production exports into this directory.

## Backup Priority

Back up these files before migrations or destructive local cleanup:

- `generation/history.json`
- `collections/collections.json`
- `credits/database.json`
- `community/communityPosts.json`
- `community/remixEvents.json`
- `comparisons/comparisons.json`

`migrations/backups/` and `migrations/checkpoints/` are retained migration artifacts. Do not delete them without explicit user approval.

## Local-Only Mock Data

The JSON stores are local development persistence, not production database storage. `identity/mockUsers.json`, `community/communityPosts.json`, and `community/remixEvents.json` are especially tied to MVP/mock flows and must be replaced by authenticated user, community and audit tables before production launch.

## Path Resolution

Use `server/config/paths.js` and `resolveDataFile(name)` to access data files. The resolver returns canonical `server/data/*` paths only. Old root-level JSON fallback paths have been removed.
