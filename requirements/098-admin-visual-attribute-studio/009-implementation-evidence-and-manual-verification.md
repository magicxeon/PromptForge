# 009 - Implementation Evidence And Manual Verification

**Status:** Backend evidence retained; replacement layout and Definition authoring checkpoint verified
**Recorded:** 2026-08-15

## Implemented Capability

- Canonical inventory for 25 Attribute files, five spec files, two visual
  indexes and 19 manifests.
- Deterministic shadow compiler and exact legacy-bundle parity test.
- Admin-only draft mutations with optimistic revisions; Support is read-only.
- Whole-catalog validation, immutable publication, atomic activation and
  previous-release rollback.
- The previous `/admin/attributes` authoring implementation was removed on
  2026-08-15. Its accepted mockup-first replacement now includes read-only
  inspection, draft-aware Definition editing and new Attribute creation inside
  an existing Category/Field. Visual production and Category-scoped release
  mutations remain gated.
- Three-candidate authoring through the existing Generation Group and Credit
  workflow. Approval accepts only an owned completed job.
- Existing-Category/Field option creation with server-generated stable IDs and
  English-to-enabled-locale generation on Save.
- Family-specific focused tests for facial, hair, body, outfit, material and
  scene-direction Attributes. Outfit tests render the direction naturally worn
  on one complete neutral model.
- Upload candidates stored through Assets with actor ownership checks and the
  same approved derivative contract as generated candidates.
- Assets-owned WebP preview/thumbnail derivatives with hashes, dimensions,
  job/style/reviewer provenance and bounded process caches.
- Public ETag and release/source headers. Catalog runtime authority is guarded
  by `ATTRIBUTE_CATALOG_RUNTIME_ENABLED=false` by default.

## Runtime Data And Media

Created lazily after use:

- `server/data/attribute-catalog/drafts.json`
- `server/data/attribute-catalog/releases.json`
- `server/data/attribute-catalog/state.json`
- `client/outputs/attribute-visuals/<actor-id>/`
- `client/outputs/attribute-visual-uploads/<actor-id>/`

## Measured Baseline

Run `npm run attributes:audit`.

- Legacy bundle: 456,353 bytes.
- Legacy compile: 10.68 ms in the recorded local run.
- Inventory plus shadow compile: 56.63 ms.
- Semantic parity: exact fingerprint match.
- Catalog size: 820 enabled options and 129 visual items.

These local timings are diagnostic baselines, not production SLOs.

## Known Migration Debt

Runtime cutover must remain off while these are unexplained:

- five duplicate IDs in `attributes/010-clothing.json`:
  `clothing.casual_05` through `clothing.casual_09`;
- one unindexed manifest at
  `headshot-v1/face-structure/shape/manifest.json`;
- legacy visual items whose canonical Attribute association is still supplied
  by the React registry rather than `attributeId` in the manifest;
- advanced compatibility rule-graph authoring;
- final removal of direct-file and React visual-map compatibility sources.

The Admin editor blocks direct editing of ambiguous duplicate IDs. New
duplicates block publication. Do not silently rename existing IDs because
saved work may reference them.

## Automated Evidence

The 2026-08-15 catalog-navigation hardening adds server coverage for category
and field facets plus deep-link resolution of `character.004`. The Admin client
now consumes the same bounded contract instead of loading or flattening all 820
options in the browser. Validation recorded for this change: 16 targeted server
tests passed, 9 targeted React tests passed, `npm run typecheck:web` passed and
`npm run i18n:validate` passed. The older broad run below remains the protected
baseline for final release closure.

Passed:

```text
node --test test/attributeCatalogBaseline.test.js \
  test/attributeCatalogWorkflow.test.js \
  test/approvedVisualAssetService.test.js \
  test/imagePresentationService.test.js

npm run typecheck:web

npm run build --workspace web

npm run test --workspace web -- \
  src/app/routeRegistry/routes.test.ts \
  src/features/studio/attributes/attributeModel.test.ts \
  src/features/studio/visual-options/visualOptionRegistry.test.ts \
  src/features/studio/studioModePolicy.test.ts \
  src/features/studio/referenceAuthorityPolicy.test.ts \
  src/features/studio/components/GuidedAttributeForm.test.tsx \
  src/components/visual-options/VisualOptionPicker.test.tsx
```

The 2026-08-15 Phase 1 reset validation added 17 targeted server tests covering
baseline parity, stable ID generation, taxonomy rejection, locale generation
and fallback, family-specific outfit tests, generated candidate approval,
uploaded Asset ownership and derivative approval. `npm run typecheck:web` and
the production web build also passed. The protected React suite passed 70
tests across eight files, including six family-routing assertions for the new
Admin authoring policy.

Protected results: 15 server tests and 64 React tests passed in the recorded
run. The existing i18next warning in `GuidedAttributeForm.test.tsx` remains
non-failing.

## Manual Verification

Perform the checks below against the option-focused Visual Production
workspace implemented by Requirement 010.

Keep `ATTRIBUTE_CATALOG_RUNTIME_ENABLED=false` for steps 1-6.

1. Sign in as Support and open `/admin/attributes`; verify catalog/release data
   is readable and mutation controls are absent. Confirm mutation API calls are
   rejected server-side.
2. Sign in as Admin, create a draft, edit a non-duplicate option, save, refresh,
   and verify the revision and content persist.
   - Confirm there is no New Category or New Field command in Phase 1.
   - Choose an existing Category and Field, click New Attribute, enter only an
     English label and prompt, then Save. Confirm the returned stable ID is
     read-only, URL-safe and unchanged after refresh.
   - Confirm Thai is generated from English when the localization provider is
     available. If it is unavailable, confirm Save remains safe, the fallback
     warning is visible and localization metadata records the failure.
   - Open `/admin/attributes?option=character.004` directly. Confirm Character
     and the owning Field are selected, category counts are visible, and only
     options from that Field appear in the option list.
   - Confirm the compatibility notice renders the numeric duplicate count and
     does not imply that `character.004` or other unique IDs are blocked.
3. Validate the draft. Confirm errors block Publish and a reason is mandatory.
4. Generate three `facial_feature` candidates. Verify estimate/charge/progress/
   terminal failures use the shared Generation UI. Approve one successful job
   and verify preview and thumbnail URLs load after restart.
   - Upload one PNG/JPEG/WebP candidate, approve it and confirm it produces the
     same bounded preview and thumbnail contract without exposing another
     actor's Asset.
   - Open an Outfit option and run Focused Test. Confirm the server returns
     `worn_outfit_fidelity`, `scene`, `6:8`, one complete model naturally
     wearing the outfit and an outfit construction/coverage checklist.
5. Publish and activate a release. Confirm history remains immutable and the
   rollback control targets the previous release.
6. Check `/admin/attributes` at desktop and mobile widths in every Momelo theme:
   no overlap, clipped labels, inaccessible controls or nested dialog issues.
7. In a controlled local session set `ATTRIBUTE_CATALOG_RUNTIME_ENABLED=true`,
   restart, and inspect `/api/attributes/bundle`: source header is
   `attribute_catalog`, release header matches the active release and repeated
   requests with `If-None-Match` return 304.
8. Verify Face Creator, Character Sheet and Scene Builder: Age ordering, normal
   alphabetical ordering, gender visuals, Facial Hair policy, Outfit Base,
   Body visuals, custom input limits, Simple recipe reconciliation and all
   Reference override behavior remain unchanged.
9. Generate one Face, one Character Sheet and one Scene. Record job IDs and the
   active release. If any regression occurs, set the flag false immediately;
   if catalog data alone is faulty, also activate the previous release.

Do not remove the compatibility sources or mark Requirement 098 complete until
steps 1-9 pass and the known migration debt has an approved resolution.
