# 006 - Migration, Publishing and Runtime Integration

**Status:** Planned  
**Depends on:** 001-005

## Objective

Migrate current Attribute data and visual mappings to the canonical catalog
without breaking existing Studio configuration, generation or saved history.

## Migration Phases

### Phase A - Import and Compare

- Import current Attribute/spec files and visual manifests into a draft release.
- Generate an inventory of unmapped visuals, duplicate semantics and placeholders.
- Compile old and new public bundles and compare normalized output.
- Keep the existing loader authoritative.

### Phase B - Shadow Read

- Build the new bundle alongside the old one.
- Record sanitized parity differences and performance timing.
- Block activation while unexplained semantic differences remain.

### Phase C - Activate Release

- Switch `/api/attributes/bundle` to the active catalog release.
- Invalidate the bounded server cache by release ID.
- Keep an immediate rollback switch to the previous loader/release.

### Phase D - Remove Duplication

- Replace hard-coded `visualOptionRegistry` mappings with catalog metadata.
- Remove obsolete manual write paths only after parity observation.
- Keep built-in source assets where required, but let runtime manifests resolve
  built-in and repository-managed assets through one contract.

## Saved Configuration Compatibility

- Existing semantic IDs continue to resolve.
- Retired values display their historical label and migration action.
- No automatic migration changes user intent without explicit approved mapping.
- Imported/exported configurations include catalog release provenance.
- Generation records retain the release ID used for compilation.

## Performance Budget

- Public bundle is immutable and cacheable by release ID/ETag.
- Admin list endpoints are paginated and do not return full asset metadata.
- Asset derivatives are bounded and lazy-loaded.
- Publication compiles once; customer requests do not rebuild the catalog.
- Measure bundle size, compile time and first Studio load before activation.

## Acceptance Criteria

- Normalized old/new bundle parity passes approved fixtures.
- All three Studio modes generate with the new active release.
- Rollback restores the previous bundle without data repair.
- Runtime no longer requires option-level React hard-coding.
- Performance does not regress beyond the documented release budget.

