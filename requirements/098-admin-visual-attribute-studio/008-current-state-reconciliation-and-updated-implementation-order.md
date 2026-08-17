# 008 - Current-State Reconciliation And Updated Implementation Order

**Status:** Reconciled and implemented through guarded cutover; manual gate pending
**Audited:** 2026-08-15
**Primary role:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect, UX/UI Product Designer

## 1. Decision

The Attribute Studio concept remains valid, but it must be implemented as a
catalog migration around the current runtime rather than as a new isolated
Admin editor. Current customer behavior is mature enough that replacing files,
manifests and React mappings in one release would have a high regression risk.

Start with inventory and shadow compilation. Deliver the first writable
vertical slice only after read parity is deterministic.

## 2. Current Sources And Owners

| Concern | Current source | Migration treatment |
|---|---|---|
| Attribute semantics | 25 `attributes/*.json` files | Import with stable IDs; keep authoritative through shadow phase |
| Field layout | `attributes/spec/ui-schema.json` | Import ordering/control metadata |
| Prompt order/templates | `attributes/spec/prompt-order.json`, `prompt-templates.json` | Generation-owned compilation input |
| Presets | `attributes/spec/presets.json` | Import with explicit preset lifecycle |
| Scene recipes | `server/config/scene-pose-recipes.json` | Keep Scene-owned; bundle as external supplement |
| Custom input limits | `server/config/generationInputPolicy.js` | Keep Generation-owned; bundle as external supplement |
| Public bundle | `server/app/routes/attributesRoutes.js` | Replace read authority only after parity |
| Final prompt compilation | `server/domain/generation/promptCompiler.js` | Keep Generation-owned |
| Visual authoring | `visual-assets/character-builder/` | Import provenance and approved source metadata |
| Runtime visuals | two indexes and 19 manifests under `client/assets/visual-character-builder/` | Import asset-set records; preserve URLs during migration |
| Visual mapping/swatches | `visualOptionRegistry.ts` | Remove only after catalog metadata parity |
| Customer rendering | `web/src/components/visual-options/` | Reuse unchanged for Admin preview and customers |
| Admin access | `/admin`, `AdminPolicyService`, Admin backoffice APIs | Extend; do not create a parallel role gate |
| Audit | existing Audit repository/backoffice lookup | Reuse for material catalog actions |

## 3. Protected Current Behavior

Implementation must preserve:

- semantic Attribute IDs and restored saved selections;
- Age options in semantic age order;
- ordinary dropdown and visual options in alphabetical label order;
- adult/presentation applicability and gender-filtered visual variants;
- Facial Hair visibility for adult male presentation only;
- gender-specific Outfit Base and Body visuals;
- custom Attribute limits of 1,000 characters per field and 2,000 total unless
  the Generation policy changes through its owner;
- Simple Scene recipe selection and stale-field clearing;
- Reference-owned field suppression and server reference authority;
- item-level manifest `attributeId`, focal point and recolor behavior;
- theme-aware mask visuals and image/text fallback; and
- Face Creator, Character Sheet and Scene Builder using the same shared picker
  family.

## 4. Confirmed Gaps

1. Attribute Catalog domain, repositories and versioned runtime-data paths now
   exist; files are created lazily on first Admin mutation.
2. `/api/attributes/bundle` now has ETag/source/release metadata and a guarded
   active-release reader with legacy fallback.
3. The Attribute filename list exists in the HTTP loader while prompt
   compilation retains separate direct-file fallback behavior.
4. Visual semantic mappings and swatches remain hard-coded in React.
5. `/admin/attributes` and shared Admin internal navigation now exist.
6. Draft revision, validation, publication, activation and rollback workflows
   now use one application boundary and optimistic revisions.
7. Candidate generation reuses Generation Groups and Credits; approval verifies
   the owned completed job and persists Assets-owned derivatives. MVP charges
   the acting Admin through the existing Credit contract; no bypass budget was
   introduced.
8. Requirement-local Skill remains the owning implementation guide. The
   professional orchestration registry routes Attribute Catalog work to the
   Backend, Product UX and QA roles without duplicating this Skill.
9. The current `/admin/attributes` route is catalog-maintenance oriented and
   does not provide a clear option-level create, generate/upload, approve,
   test, save-version and publish-version workflow. Requirement 010 is the
   mandatory UX reset before manual qualification or runtime cutover.
10. The global legacy duplicate warning is visually over-prominent. Duplicate
    protection must be scoped to affected IDs while unrelated unique options
    remain operational.

## 5. Updated Delivery Slices

### Slice 0 - Baseline And Tests

- Generate the complete source/consumer inventory.
- Snapshot normalized bundle output and prompt fixtures.
- Add protected tests from section 3.
- Measure bundle bytes and compile duration with cache on/off.

### Slice 1 - Read-Only Catalog Core

- Add canonical contracts, importer and read repository.
- Compile a shadow release from current sources.
- Compare old/new output without changing `/api/attributes/bundle` authority.

### Slice 2 - Draft And Revision Workflow

- Add Admin/Support read APIs and Admin-only draft mutations.
- Reuse current actor policy, Audit repository and correlation context.
- Add optimistic revision conflict detection.

### Slice 3 - One Visual Family Pilot

- Use one low-risk Headshot visual family.
- Generate three candidates through Generation Group.
- Store approved asset provenance and render preview through shared customer
  visual components.

### Slice 4 - Validation And Release

- Add dependency/reference/prompt validators.
- Publish one immutable release and activate it atomically.
- Add ETag/release-keyed cache and rollback drill.

### Slice 5 - Admin Experience Expansion

- Add `/admin/attributes` and shared Admin internal navigation.
- Replace the catalog-maintenance MVP with the option-focused Visual Production
  workspace defined in 010.
- Expand authoring to remaining visual and text-only families.
- Keep Support read-only at both UI and server boundaries.

### Slice 6 - Runtime Cutover And Cleanup

- Activate the catalog-backed public bundle after shadow parity.
- Observe Face, Character Sheet and Scene behavior.
- Remove hard-coded mapping/file duplication only after rollback and regression
  evidence pass.

## 6. Implementation Entry Gate

Before writing runtime code:

- [x] Attribute Catalog is documented as the canonical owner.
- [x] Slice 0 inventories all 25 Attribute files and 19 manifests.
- [x] Current bundle, ordering, input-policy and visual-regression fixtures exist.
- [x] Admin mutation and Support read-only policy is server-tested.
- [x] MVP visual generation uses the acting Admin's audited Credit account.
- [x] `facial_feature` is the first manual visual qualification family.
- [x] Performance baseline and immediate flag/release rollback are recorded.

## 7. Current Recommendation

Requirement 098 now has an operational Admin MVP behind a default-off runtime
flag. Keep the legacy reader and React visual mappings until the known duplicate
IDs, unindexed manifest and manual Studio/browser qualification in 009 are
resolved. Database migration remains outside this requirement.
