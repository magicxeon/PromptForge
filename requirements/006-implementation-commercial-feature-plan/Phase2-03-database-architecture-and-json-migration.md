# Phase 2-03 Database Architecture and JSON Migration

**Status:** Proposed - Awaiting Review  
**Goal:** Replace mutable runtime JSON persistence with transactional database storage.

## 1. Business Requirement

Commercial operation requires durable multi-user data, ownership, financial integrity, reliable jobs and migration from current JSON files without losing users, credits, history, Collections or lineage.

## 2. Database Direction

- Production recommendation: PostgreSQL.
- Local development may use PostgreSQL in a container or a documented compatible adapter.
- Use explicit migrations committed to source control.
- Keep generated binary images in object/file storage; store metadata and ownership in the database.
- JSON attribute definitions may remain version-controlled content because they are application configuration, not user transactions.

## 3. Initial Domains

```text
users, credentials, sessions
projects, project_members
collections, collection_items
assets, asset_links
products, product_variants
model_profiles, consistency_profiles
generation_batches, generation_jobs, generation_results
credit_accounts, credit_ledger_entries, credit_reservations
packages, price_versions, purchases, payments
subscriptions, entitlement_grants
audit_events, idempotency_records
```

All timestamps use UTC. Public IDs are opaque. Financial rows use database transactions and row-level locking where required.

## 4. Repository Boundary

- Business services depend on repository contracts, not JSON or SQL directly.
- Transitional JSON repositories may exist only during migration.
- New commercial records must not be dual-written indefinitely.
- Select a cutover point and make the database authoritative.

## 5. Migration Sources

- `server/database.json`
- `server/history.json`
- `server/collections.json`
- queue/runtime records if durable records exist by migration time
- generated output files and reference lineage

## 6. Migration Process

```text
inventory -> backup -> dry run -> validate -> maintenance window
-> migrate -> reconcile -> switch reads -> switch writes -> observe
-> archive JSON backup
```

Requirements:

- Migration is repeatable and idempotent.
- Source IDs map to destination IDs through a migration map.
- Missing image files are reported, not silently ignored.
- Duplicate usernames and invalid balances require an exception report.
- JSON files become read-only backups after cutover.
- Rollback restores the previous application version and source backup; it must not discard accepted post-cutover financial writes.

## 7. Reconciliation

Generate a signed or checksummed report containing:

- Source and destination record counts by entity
- Credit total by user before and after migration
- History result/file count
- Collection membership and cover count
- Orphan and rejected records
- Migration version and execution timestamp

## 8. Backup and Recovery

- Automated database backups with tested restore procedure
- Object/file storage backup or lifecycle policy
- Recovery point and recovery time objectives documented before launch
- Restore test required before private beta
- Secrets are not included in application-level exports

## 9. Acceptance Criteria

- All valid users, balances, history, Collections and lineage migrate successfully.
- Credit reconciliation difference is zero or explicitly resolved before cutover.
- Re-running migration does not duplicate data.
- Application no longer writes transactional user data to JSON after cutover.
- Backup restore is demonstrated in a non-production environment.
- Database constraints prevent invalid ownership and duplicate idempotency records.

