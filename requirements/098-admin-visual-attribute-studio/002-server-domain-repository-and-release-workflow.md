# 002 - Server Domain, Repository and Release Workflow

**Status:** Planned  
**Depends on:** 001

## Objective

Implement one canonical Attribute Catalog application boundary with immutable
published releases and replaceable persistence.

## Canonical Placement

```text
server/domain/attribute-catalog/
  AttributeCatalogApplicationService.js
  AttributeCatalogValidationService.js
  AttributeCatalogReleaseService.js
  attributeCatalogContracts.js

server/repositories/attribute-catalog/
  AttributeCatalogRepository.js
  AttributeCatalogReleaseRepository.js

server/data/attribute-catalog/
  drafts/
  releases/
  indexes/

server/app/routes/adminAttributeCatalogRoutes.js
```

Paths must resolve through `server/config/paths.js`; JSON writes use the shared
atomic JSON store. Repository contracts must remain database-migration ready.

## Application Use Cases

- list/search catalog definitions with pagination
- read one definition and revision history
- create/update a draft
- clone a published revision
- validate a draft
- submit/approve a draft
- publish an atomic release
- enable/disable exposure through a new release
- retire an option with replacement policy
- compare releases and rollback active release
- compile the public runtime bundle

## Authorization

- Admin: author, validate, approve, publish, disable, retire and rollback.
- Support: read catalog, validation and release history by default.
- System actor: execute approved asset-generation jobs only.
- Customer roles: read the public compiled bundle only.

Every server action uses `req.actorContext`; body-supplied actor identity is not
trusted. Material changes emit Audit events and correlation IDs.

## Release Guarantees

- Publication validates the entire candidate catalog, not only the edited item.
- The active release pointer changes atomically.
- Published revisions are immutable.
- Runtime bundle cache is keyed by release ID and invalidated on activation.
- Rollback activates a prior release without deleting newer history.
- Concurrent edits use revision/ETag conflict detection.

## APIs

Use `/api/admin/attribute-catalog/...` for Admin contracts and preserve
`/api/attributes/bundle` as the public read contract during migration.

Responses require Zod-owned client schemas, stable error codes, pagination and
safe support references. Do not return private generation prompts or raw assets
to unauthorized users.

## Acceptance Criteria

- Routes contain only HTTP translation and delegation.
- All writes pass through the application service and repository.
- Two concurrent updates cannot silently overwrite one another.
- Failed publication leaves the active release unchanged.
- Rollback and cache invalidation are covered by integration tests.
- Public bundle output is deterministic for the same release.

