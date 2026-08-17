# 006 - Migration, Publishing and Runtime Integration

**Status:** Guarded cutover and rollback implemented; activation observation remains
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
- Snapshot the exact current bundle, including Scene Pose recipes and public
  input policy, and record compile time/payload size before shadow work.

### Phase B - Shadow Read

- Build the new bundle alongside the old one.
- Record sanitized parity differences and performance timing.
- Block activation while unexplained semantic differences remain.

### Phase C - Activate Release

- Treat the Category as the Admin publication unit. One Category publication
  includes all accepted changes in that Category atomically; no individual
  Attribute publication endpoint or UI action is exposed.
- Until persistence supports independently addressable Category releases, a
  compatibility adapter may compile the containing catalog release, but must
  validate the selected Category as one unit and expose Category publication
  semantics and audit metadata to the Admin client.
- Switch `/api/attributes/bundle` to the active catalog release.
- Add release ID, ETag and cache headers without removing existing response
  fields; invalidate the bounded server cache by release ID.
- Keep an immediate rollback switch to the previous loader/release.

The implementation defaults `ATTRIBUTE_CATALOG_RUNTIME_ENABLED=false`. Setting
it to `true` uses the active immutable release when one exists and otherwise
falls back to the legacy bundle. Turning it off restores legacy authority
without deleting drafts, releases or activation history.

### Phase D - Remove Duplication

- Replace hard-coded `visualOptionRegistry` option mappings and swatches with
  catalog metadata while retaining the shared visual-option components.
- Remove obsolete manual write paths only after parity observation.
- Keep built-in source assets where required, but let runtime manifests resolve
  built-in and repository-managed assets through one contract.

## Saved Configuration Compatibility

- Existing semantic IDs continue to resolve.
- Retired values display their historical label and migration action.
- No automatic migration changes user intent without explicit approved mapping.
- Imported/exported configurations include catalog release provenance.
- Generation records retain the release ID used for compilation.

Do not remove direct-file fallback reads in `promptCompiler.js` or the current
loader file list until Face, Character Sheet and Scene fixtures prove the active
release and rollback paths. Their removal is the final cleanup checkpoint, not
part of initial catalog creation.

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
- Category publication is atomic and no mixed option revisions become active.
- Runtime no longer requires option-level React hard-coding.
- Performance does not regress beyond the documented release budget.
