# Reusable Component Consolidation

**Status:** Frontend architecture requirement; implementation pending

## 1. Goal

Reduce duplicated Cinematic interaction and presentation without creating an
oversized shared component or moving business rules into React presentation.

Reuse is based on the same responsibility and interaction contract, not visual
similarity alone.

## 2. Existing Components To Preserve And Extend

| Component/owner | Reuse decision |
|---|---|
| `CinematicControlLevel` | Canonical Simple/Advanced segmented control |
| shared `Button`, dialog and confirmation components | Keep canonical command behavior |
| `GenerationExperience` | Keep shared generation workflow boundary |
| `EngineTargetPanel` / frame | Keep provider/model/output presentation variants |
| shared media viewer/result components | Keep preview, expand and output actions |
| `CinematicStageContent` | Remains route composition owner; extract cohesive children incrementally |
| `CinematicDialogs` | Split only independently testable dialogs/field groups; retain exports during migration |

## 3. Candidate Cinematic Reusable Contracts

### 3.1 Authoring Mode Header

Wraps `CinematicControlLevel` with localized context, current mode help and
optional readiness summary. It receives state and callbacks and performs no
persistence.

### 3.2 Manifest Field Group

Renders one typed Scene or Shot group from a safe client manifest projection.
It receives values, field states, errors and `onChange`/`onLock` callbacks.
It does not infer defaults, call AI or save a Project.

### 3.3 Scene Cast And Look Selector

Owns repeated presentation for active Cast Assignment selection and one approved
Look per selected Character. It receives already authorized options. Selection
rules remain in Cinematic workflow/domain code.

### 3.4 Shot Sequence Editor

Owns stable Shot rows, reorder controls, add/remove presentation and duration
summary. It emits commands and never generates IDs or mutates server state by
itself.

### 3.5 Readiness Summary

Presents structured lineage/readiness findings grouped by owning stage and
provides focus/navigation targets. It does not reproduce validation policy.

### 3.6 AI Proposal Review Shell

Shares loading, error, version-conflict, field-diff, apply and discard states
across Story Plan and Scene Direction where contracts truly match. Feature
renderers provide domain-specific summaries. It never calls providers directly.

## 4. Reuse Boundaries

Keep feature-local under `web/src/features/cinematic/components/` when the
component understands Beat, Scene, Shot, Cast Assignment or Look semantics.

Move to `web/src/components/` only when at least two capabilities use the same
typed visual contract and no Cinematic business policy is embedded.

Generation provider/model, estimate, result and media inspection components
remain under their existing shared owners. Do not create Cinematic copies.

## 5. Workflow Reuse

Reusable presentation must be paired with one feature workflow/controller:

```text
Cinematic route
  -> Cinematic authoring controller/hook
  -> cinematicApi
  -> apiClient
```

The controller owns draft orchestration, Project-version rebasing, proposal
state and focus return. Shared components receive controlled props.

No shared component may:

- call an AI provider or Generation endpoint;
- write `localStorage` directly;
- mutate TanStack Query cache without its owner hook;
- derive commercial estimates;
- invent Character/Look authority;
- compile final prompts.

## 6. Safe Extraction Order

1. Characterize current behavior with tests.
2. Extract pure selectors and presentation first.
3. Keep compatibility exports from existing files while consumers migrate.
4. Move one consumer at a time and run focused tests.
5. Remove old markup/helper only after all imports and tests use the new owner.
6. Review the diff for unrelated styling or interaction changes.

## 7. Visual Preservation

- Existing section order and actions remain unless this requirement names a
  changed flow.
- New field groups use design tokens and established form density.
- No nested decorative cards.
- Fixed action areas do not cover fields or media.
- Long Thai/English text wraps without horizontal overflow.
- Mobile preserves logical field order and touch targets.
- Loading, empty, error, stale, disabled and approved states keep stable layout.

## 8. Acceptance Criteria

- Similar Scene/Shot field groups use one typed presentation contract.
- Simple and Advanced variants do not duplicate save or AI logic.
- Story Plan and Scene proposal review share only genuinely common state UI.
- Cinematic provider/model controls remain shared Generation components.
- Existing imports migrate without duplicate runtime workflows.
- Component tests prove keyboard, focus, responsive and preservation behavior.

