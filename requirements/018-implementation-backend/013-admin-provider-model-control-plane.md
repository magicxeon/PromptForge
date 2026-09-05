# Admin Provider and Model Control Plane

**Status:** Implemented and focused verification passed  
**Owner:** Admin Configuration capability  
**Primary role:** Product And Requirement Architect  
**Implementation owner:** Backend Platform Architect  
**Reviewers:** UX/UI Product Designer, QA And Release Engineer  
**Skills:** `implement-generation-workflow`, `review-product-ux`,
`verify-release-regressions`

## 1. Outcome

Authorized Admin users shall disable or enable a Provider or Model once and
have that master decision apply to every Momelo workflow that can select or
call it. Admin may also narrow one Provider/Model to specific workflows without
creating feature-local availability logic.

The control plane covers Playground, Comparison, Face Creator, Character
Sheet, Scene Builder, Fashion Studio, Cinematic Storyboard, Cinematic Produce
and provider-backed AI helper operations. Existing accepted Jobs and unrelated
features retain their current behavior.

## 2. Scope

### 2.1 Included

- Unified Admin inventory for Image, Video and AI Text Provider/Models.
- Provider master enable/disable across all workflows.
- Model master enable/disable across all workflows.
- Provider/Model/Workflow enable/disable override.
- Server-side enforcement for public catalog, preview, quote and submit.
- Versioned runtime override state with optimistic concurrency.
- Required reason and append-only audit/history for every command.
- Admin mutation and Support read-only UI.
- Targeted tests and one optional aggregate verification script.

### 2.2 Excluded

- Editing API keys or secrets.
- Changing pricing, qualification evidence or static capabilities.
- Cancelling accepted Image Jobs or Video tasks.
- Automatically replacing a selected Provider/Model.
- Rewriting provider adapters.
- Scheduled activation, cohort rollout or customer-specific overrides.
- Running paid provider probes from Admin.

## 3. Capability Ownership

Admin Configuration owns runtime availability overrides and audit intent.
Generation consumes effective availability before provider execution. Credits
continues to own price and reservations. Static provider registries continue to
own capability validation. React screens consume sanitized catalogs and never
evaluate authoritative availability.

Canonical additions:

```text
server/domain/admin-configuration/ProviderAvailabilityPolicyService.js
server/domain/admin-configuration/ProviderControlApplicationService.js
server/repositories/admin-configuration/ProviderControlRepository.js
server/data/admin-configuration/provider-controls.json       runtime only
server/app/routes/adminRoutes.js                             HTTP facade
web/src/features/admin/routes/AdminProvidersRoute.tsx
web/src/features/admin/api/adminApi.ts
web/src/features/admin/schemas/adminSchemas.ts
```

The provider architecture reference is
`requirements/Knowledge/provider-management-architecture.md`.

## 4. Control Hierarchy and Invariants

### 4.1 Precedence

```text
Provider master OFF
  > Model master OFF
    > Workflow OFF
      > static capability/configuration/qualification/pricing
```

Rules:

1. Provider master OFF blocks every model for Image, Video and AI Text.
2. Model master OFF blocks the model in every workflow and page.
3. Workflow OFF blocks only the exact Provider/Model/Workflow tuple.
4. Missing override means `inherit`; current behavior remains unchanged.
5. ON never overrides missing credentials, unsupported references, static
   disablement, unavailable pricing or failed qualification.
6. Server enforcement is authoritative and returns
   `provider_runtime_disabled` with `providerId`, `modelId`, `workflow`,
   `disabledAt`, `reason` and `scope`.
7. A master-disabled model is omitted from applicable public catalogs.
8. Existing accepted work retains its pinned routing and settlement.
9. Queue dispatch does not re-route accepted work after an Admin command.
10. No command logs or returns credentials, prompts, Base64 or private media.

### 4.2 Stable workflow vocabulary

```text
playground.image
playground.video
comparison.image
studio.face
studio.character_sheet
studio.scene
fashion.image
cinematic.storyboard_image
cinematic.produce_video
internal.template_pose_proxy
ai.prompt_refinement
ai.story_enhancement
ai.story_plan
ai.scene_direction
ai.wardrobe_suggestion
ai.attribute_localization
```

New provider-backed workflows must register a stable key and targeted test.

## 5. Runtime Data Contract

Store overrides only:

```json
{
  "schemaVersion": 1,
  "version": 3,
  "updatedAt": "ISO-8601",
  "providers": {
    "openai": {
      "enabled": false,
      "reason": "Operational containment",
      "updatedAt": "ISO-8601",
      "updatedByUserId": "usr_admin"
    }
  },
  "models": {
    "modelark/seedream-5-0-lite-260128": {
      "enabled": true,
      "reason": "Restored after verification",
      "updatedAt": "ISO-8601",
      "updatedByUserId": "usr_admin"
    }
  },
  "workflows": {
    "meta-muse/muse-image-1.0/cinematic.storyboard_image": {
      "enabled": false,
      "reason": "Reference input unsupported",
      "updatedAt": "ISO-8601",
      "updatedByUserId": "usr_admin"
    }
  },
  "history": []
}
```

History is append-only and bounded for the local adapter. Each event includes
command ID, previous/effective state, version, target, actor, reason and time.
Production migration replaces storage without changing the service contract.

## 6. Server Contracts

### 6.1 Read inventory

`GET /api/admin/provider-controls`

Returns:

```text
schemaVersion / version / updatedAt
mutationAvailable / mutationReason
workflow catalog
providers[]
  providerId / displayName / configured / effectiveEnabled
  mediaTypes / disabledScope / reason
  models[]
    modelId / displayName / mediaTypes
    static status / effectiveEnabled / master override
    supported workflows and workflow overrides
history (bounded recent events)
```

Support may read. Only Admin may mutate.

### 6.2 Apply one command

`POST /api/admin/provider-controls/commands`

```text
targetType = provider | model | workflow
providerId
modelId              required for model/workflow
workflow             required for workflow
enabled              boolean
expectedVersion       integer
reason                3..500 characters
commandId             stable idempotency key
```

The server validates the target against the unified inventory, applies one
atomic mutation, increments the version, appends history and Audit, refreshes
the in-process policy snapshot and returns the new Admin inventory.

Duplicate command IDs return the existing result. Stale expected versions fail
with `provider_control_version_conflict` and current version details.

### 6.3 Public catalog and request checks

- `/api/providers` supports optional workflow/surface context and excludes
  ineffective Image models.
- Video public capability catalogs exclude ineffective Video models.
- Image preview, reference planning, Credit estimate and submit resolve through
  the effective policy.
- Comparison validates every slot with `comparison.image`.
- Fashion quote/run validates `fashion.image`.
- Cinematic Storyboard validates `cinematic.storyboard_image`.
- Playground Video and Cinematic Produce validate their distinct workflows.
- AI Text helpers assert their exact workflow before a provider call; a
  disabled primary may use an already-authorized enabled fallback, but a
  disabled fallback must never be called.

## 7. Admin UX

Add `/admin/providers` to the existing Admin navigation and workspace.

### 7.1 Layout

- Compact header with active policy version and last update.
- Search and media filter: All, Image, Video, AI Text.
- Provider rows are the primary grouping; no decorative card grid.
- Provider header shows configured/static health, media types and master
  switch.
- Expandable model rows show model master switch and supported workflow chips.
- Advanced workflow controls are progressively disclosed per model.
- Support sees identical state without mutation controls.

### 7.2 Command interaction

1. Admin changes one switch.
2. Dialog identifies exact Provider/Model/Workflow impact.
3. Reason is required.
4. Confirm submits with current version and command ID.
5. Persistent success/error status remains visible after closing.
6. Version conflict reloads current state and asks the Admin to review again.

Disabling uses danger semantics; enabling uses normal primary semantics. State
uses icon, label and switch position rather than color alone. Controls remain
operable at 390px, 820px and 1440px without horizontal page overflow.

## 8. Failure and State Matrix

| Condition | Catalog | New request | Accepted work | Admin UI |
|---|---|---|---|---|
| No override | Current behavior | Current behavior | Continue | Inherited |
| Provider OFF | All models omitted | Blocked | Continue | Provider OFF; descendants affected |
| Model OFF | Model omitted | Blocked | Continue | Model OFF |
| Workflow OFF | Omitted for workflow | Blocked | Continue | Workflow OFF |
| Missing key | Omitted/unavailable | Existing config error | Continue | Not configured |
| Unqualified/unpriced | Existing unavailable state | Existing validation error | Continue | Static restriction |
| Stale Admin version | No change | No change | Continue | Conflict and refresh |
| Persistence failure | No snapshot change | Previous state applies | Continue | Error; retry safe |

## 9. Migration and Compatibility

1. Bootstrap with version `0` and no overrides; behavior is byte-for-byte
   equivalent at the policy decision level.
2. Keep static catalogs unchanged.
3. Add policy checks to canonical entry points; do not add feature-local
   provider tables.
4. Existing actor-scoped Provider preferences remain stored, but a disabled
   selection cannot submit and is reconciled from the catalog on reload.
5. No accepted quote, reservation, Job, task or output record is rewritten.
6. Production mutation is disabled unless the runtime-control feature gate is
   explicitly enabled; development/test enables it for Admin verification.

## 10. Implementation Steps and Focused Verification

### Step 1 - Requirement and data-flow inventory

- Publish architecture Knowledge document and this requirement.
- Map Image, Video, Comparison, Studio, Fashion, Cinematic and AI Text callers.
- Verify master precedence and accepted-work rules cover every path.

Focused verification: requirement trace table and repository search only.

### Step 2 - Repository and policy foundation

- Add atomic versioned Provider control repository.
- Add workflow resolver and synchronous effective-policy snapshot.
- Add unit tests for precedence, inheritance, conflict and persistence failure.

Focused verification:

```text
node --test test/providerControlRepository.test.js test/providerAvailabilityPolicy.test.js
```

### Step 3 - Image consumers

- Integrate Image catalog and selection validation.
- Mark Comparison, Fashion, Cinematic and internal Pose workflows explicitly.
- Preserve Queue execution of already accepted Jobs.

Focused verification:

```text
node --test test/providerRegistry.test.js test/comparisonValidator.test.js test/fashionBlueprintPolicy.test.js
```

### Step 4 - Video and AI Text consumers

- Integrate Video catalogs, quote and submit validation.
- Integrate provider-backed AI helper calls and fallback checks.

Focused verification:

```text
node --test test/videoCapabilityRegistry.test.js test/videoGenerationApplicationService.test.js test/generationPromptRefinementEntryPoint.test.js
```

### Step 5 - Admin API and UI

- Add unified inventory and command routes.
- Add typed API schemas and compact responsive Admin workspace.
- Add EN/TH translation parity.

Focused verification:

```text
node --test test/adminProviderControls.test.js
npm run test --workspace web -- src/features/admin/routes/AdminProvidersRoute.test.tsx
```

### Step 6 - Cross-workflow regression gate

- Verify one Provider master OFF disappears and blocks across all registered
  workflows.
- Verify one Model master OFF affects all surfaces but not sibling models.
- Verify workflow OFF is narrow.
- Verify accepted Queue/Video work is not cancelled or re-routed.
- Provide optional aggregate script under `scripts/` without running the full
  repository suite by default.

Focused verification:

```text
node scripts/test-provider-control-plane.js
npm run typecheck:web
npm run i18n:validate
```

## 11. Acceptance Criteria

- `PCM-01`: Provider master OFF blocks the Provider in every Image, Video and
  AI Text workflow.
- `PCM-02`: Model master OFF blocks only that model across every workflow.
- `PCM-03`: Workflow OFF affects only the selected Provider/Model/Workflow.
- `PCM-04`: ON cannot bypass static capability, credentials, qualification or
  pricing.
- `PCM-05`: stale requests receive stable server errors with real disabled
  scope and reason.
- `PCM-06`: Comparison, Studio, Fashion and Cinematic cannot bypass canonical
  availability validation.
- `PCM-07`: accepted Jobs/tasks continue without automatic provider/model
  replacement.
- `PCM-08`: Support is read-only and Admin commands require reason, version and
  idempotency.
- `PCM-09`: every mutation persists history and Audit without secrets or raw
  generation content.
- `PCM-10`: absent overrides preserve existing behavior.
- `PCM-11`: Admin UI is compact, theme-compatible, keyboard-operable and
  responsive without overlap.
- `PCM-12`: focused test commands validate each step; the aggregate script is
  optional and no full-suite run is required for implementation feedback.

## 12. Requirement Trace and Gap Closure

| Consumer | Catalog/read gate | Server execution gate | Workflow key | Focused evidence |
|---|---|---|---|---|
| Playground Image | Image catalog | Generation preview/submit | `playground.image` | Provider Registry + route tests |
| Comparison | Image catalog | slot estimate/create | `comparison.image` | Comparison Validator tests |
| Face Creator | Image catalog | Generation preview/submit | `studio.face` | Generation tests |
| Character Sheet | Image catalog | Generation preview/submit | `studio.character_sheet` | Generation tests |
| Scene Builder | Image catalog | Generation preview/submit | `studio.scene` | Generation tests |
| Fashion | Fashion catalog | quote/run | `fashion.image` | Fashion tests |
| Cinematic Storyboard | Image catalog | Shot generation submit | `cinematic.storyboard_image` | Cinematic/Generation tests |
| Playground Video | Video catalog | quote/submit | `playground.video` | Video tests |
| Cinematic Produce | Cinematic video catalog | quote/submit | `cinematic.produce_video` | Cinematic Video tests |
| Template Pose Proxy | Internal policy | enqueue preparation | `internal.template_pose_proxy` | Pose Proxy tests |
| Prompt refinement | Public feature state | provider call | `ai.prompt_refinement` | refinement tests |
| Cinematic AI helpers | stage feature state | provider/fallback call | `ai.story_*`, `ai.scene_direction`, `ai.wardrobe_suggestion` | Cinematic text tests |
| Attribute localization | Admin Attribute UI | provider call/fallback | `ai.attribute_localization` | Attribute tests |

Gap closure rules:

- A repository search for direct provider construction outside listed owners is
  required before completion.
- Every discovered provider-backed caller must appear in this trace or be
  explicitly documented as transport-only accepted-work execution.
- The Admin inventory must include a Provider/Model even when it is statically
  disabled or missing credentials; customer catalogs must not.
- Image and Video catalogs remain separate internally but share the same master
  runtime decision.

## 13. Implementation Evidence

Implemented on 2026-09-05 through the canonical Admin Configuration,
Generation and Provider boundaries.

### 13.1 Connected runtime paths

- The Image registry, Video capability registry and AI Text services consume
  one shared `ProviderAvailabilityPolicyService` snapshot.
- Public catalogs remove disabled targets for their requested workflow.
- Image and Video quote/preview/submit paths re-check the effective policy on
  the server before Credit reservation or provider dispatch.
- Comparison, Studio, Fashion, Cinematic and internal Template Pose operations
  resolve the stable workflow keys in section 4.2.
- Accepted Image Jobs and submitted Video tasks retain their pinned provider
  execution path and are not re-routed or cancelled by a later Admin command.
- Stale browser selections receive `provider_runtime_disabled` plus the real
  scope and reason instead of a generic unavailable error.

### 13.2 Admin and persistence

- `/admin/providers` provides one Provider master switch, Model switches and
  progressively disclosed workflow switches.
- Admin mutations require expected version, reason and idempotent command ID.
- Support receives the same inventory as a read-only view.
- Local runtime overrides use the Admin Configuration repository and canonical
  JSON store. Production mutation remains behind
  `ADMIN_PROVIDER_RUNTIME_CONTROL_ENABLED=true`.

### 13.3 Gap verification

- Direct provider construction was reviewed. Provider adapters remain
  transport owners; provider-backed helper services now assert the runtime
  policy immediately before each new external call.
- `VideoProviderTaskService` and Queue processors are intentional
  accepted-work exceptions, preserving section 4 rule 8.
- Static provider health, credentials, capabilities, qualification and pricing
  remain authoritative after an Admin target is enabled.
- No feature-local Provider/Model availability table was added to React.
- No API key, prompt, Base64 reference or private media is returned by the
  Admin inventory or written to control history.

### 13.4 Focused validation

- Repository, hierarchy, conflict and persistence tests passed.
- One cross-media test verifies that a single Provider master override blocks
  Image, Video and AI Text consumers from the same policy snapshot.
- Image, Video, Comparison, Fashion and AI Text consumer tests passed.
- Admin API permission and mutation tests passed.
- Admin React interaction and route-registry tests passed.
- TypeScript typecheck and EN/TH localization validation passed.
- Responsive inspection passed at 390px, 820px and 1440px without page
  overflow or overlapping controls.
- The shared switch uses fixed standard track/thumb geometry, and the existing
  left navigation keeps a thin unobtrusive scrollbar that becomes visible on
  hover or keyboard focus.

The optional aggregate entry point is
`node scripts/test-provider-control-plane.js`; it intentionally avoids the
full repository test suite.

### 13.5 Remaining production gate

The current repository is the existing single-process JSON adapter. A
multi-instance production deployment must move the same optimistic command
contract to shared transactional storage before enabling runtime mutation on
more than one server process.
