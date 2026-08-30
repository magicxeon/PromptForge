# 004 - Meta Muse Playground And Studio Exposure

Status: Proposed  
Depends on: Requirements 001-003 and general image qualification

## 1. Purpose

Expose Meta Muse in Playground and Studio through existing shared provider and
Generation components, with no Meta-specific screen or duplicate workflow.

## 2. Shared UI Contract

The provider/model appears through `/api/providers` and the existing:

- `GenerationExperience`;
- `EngineTargetPanel`;
- comparison configurator;
- estimate, Generate, progress, result, modal, History, and Job Center flows.

Do not add hard-coded Meta Muse options to Playground or Studio. Once the
catalog exposure policy returns the model, both surfaces receive it.

## 3. Capability-Driven Controls

- Hide image-reference controls when `imageReferences` is false.
- Hide resolution when no verified resolutions exist.
- Show only verified aspect ratios or a clearly defined fixed/provider-managed
  output mode supported by the shared component contract.
- Disable streaming when unsupported.
- Output count 1-4 continues to use the existing multi-output group fan-out;
  each child job sends `n: 1` unless Meta batch output is later verified.
- Comparison mode may include Meta Muse only when it is priced and eligible for
  the same operation. Comparison totals include enabled slots only.

## 4. Request Flow

1. User selects Meta Muse/model from the catalog.
2. Client requests a canonical Credit estimate for the exact settings.
3. Generate remains disabled until a valid locked estimate exists.
4. Submission uses the existing Generation application service.
5. Queue status appears in the unified Generation Job Center.
6. Success persists to existing outputs and History.
7. Failure stops loading, displays a stable safe error, and settles Credits
   through the current lifecycle.

Changing model or any quoted setting invalidates the previous estimate.

## 5. Studio-Specific Behavior

Studio final prompt compilation remains unchanged. Meta Muse receives the same
compiled prompt contract as other text-only providers. If a Studio selection
contains a reference or operation Meta Muse does not support, the model must be
filtered out or the request blocked before estimate; never drop the selection.

## 6. Localization And Accessibility

Only generic provider/model labels come from the server catalog. Any new status
or capability explanation uses existing i18n namespaces with en/th parity.
Keyboard navigation, visible focus, loading announcements, error recovery, and
responsive layout must match existing shared components.

## 7. Regression Tests

- catalog-driven provider appears without feature-local option code;
- Playground and Studio resolve the same Meta Muse capability record;
- unsupported reference/resolution controls are absent;
- changing to/from Meta Muse refreshes the estimate;
- output count creates the expected group without provider batch fields;
- comparison estimate includes Meta Muse only when enabled and priced;
- success, fail, and retry-safe UI states terminate correctly;
- existing providers retain their controls and defaults;
- mobile, tablet, and desktop layouts do not overflow or hide actions.

## 8. Acceptance Criteria

- Meta Muse can be enabled once and appears consistently in both surfaces.
- No new provider-specific React component or API route is introduced.
- Unsupported settings cannot reach provider dispatch.
- Existing Playground and Studio behavior remains unchanged for other models.

