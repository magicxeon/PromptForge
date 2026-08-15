# Character, Pose and Environment Selection

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Authorized picker and versioned direction packs implemented; recommendation UX remains release polish

The MVP uses authorized Character handoffs plus bounded pose/environment
selectors. Server run confirmation revalidates Character version, reuse policy,
destination capability, and canonical reference asset.

## 1. Business Requirement

The seller chooses a virtual model and can make small pose/environment changes
without losing the visual identity of the selected Template.

## 2. Character Selection

Customer-facing copy should use **Model**, **นางแบบ** or **นายแบบ** where
appropriate. `Character` remains the internal/domain term. The user should not
need to understand Character Profile terminology.

Sources:

- own approved Character Profiles
- public reusable Characters
- Character passed from a Character Profile page

Required card content:

- casting preview
- Character name
- owner attribution
- body/silhouette visibility
- Fashion usage count
- reuse status
- explicit status icon/text explaining whether the active user can select it

Selection binds:

```text
characterProfileId
characterProfileVersionId
characterReferenceAssetId
attribution
personalitySummarySnapshot
```

Fashion must not construct this binding from public card data. It requests the
existing authorized handoff:

```text
POST /api/community/characters/:id/handoffs
body: { destination: "fashion_blueprint" }
```

The returned `CharacterDestinationHandoff` is stored actor-scoped through the
Character Profile state contract and hydrated by Fashion Blueprint. A handoff
is not a durable authorization token and is not stored as ownership proof in a
plan. The server revalidates the Character/profile/version/reuse policy when
resolving a quote and again when confirming a run. Only `reusable_model` with
`outfitBehavior: replaceable` is accepted; Outfit Bound/Styled Characters are
Scene-only until converted to an approved reusable casting version.

Picker states:

- `Available to use`: selectable and shows a familiar approved Character icon
- `View only`: opens profile detail but selection is disabled
- `Owner only`: disabled for non-owner; owner may use an approved own Character
- destination incompatible: disabled with compatibility explanation

Use Lucide icons, tooltips and accessible text. Never rely on color/icon alone.

The casting white outfit is identity/silhouette evidence only. It must be
explicitly suppressed as final clothing when an outfit slot is supplied.

### 2.1 Beginner Character Step

The first screen shows no more than three paths:

```text
1. Use the model shown in this Template (recommended)
2. Choose another model
3. Use one of my models
```

If a valid Template model exists:

- show one large front full-body preview
- show the face crop, name and one-line personality
- show creator attribution and `Available to use`
- primary action is `Use this model`
- successful selection stores the handoff, shows a compact selected-model
  summary and moves focus/scroll to Outfit upload

The user is not required to open Character detail or inspect four views before
using a recommended model.

### 2.2 Character Picker

The expanded picker uses three tabs:

```text
Recommended for this Template
My Models
Community Models
```

Initial results remain intentionally small:

- Recommended: up to six compatible Characters
- My Models: recent approved Characters first
- Community: popular Fashion Characters with pagination/load more

Search and advanced filters stay secondary behind `Filters`. Optional filters
include presentation, body silhouette, age range, personality and Fashion intent
such as casual, office, luxury or streetwear.

Blocked, archived and view-only Characters are excluded from selectable
results. View-only Characters remain discoverable in Community rather than
appearing as disabled clutter in this production picker.

### 2.3 Card and Selected Summary

Every selectable card shows:

- front full-body thumbnail
- small face crop
- Character/model name
- one-line personality
- creator name
- `Available to use` icon/text
- successful Fashion output count
- `Select this model` action

Card selection must not immediately navigate away while the user is browsing.
After selection, show:

```text
Selected model: Mina
Elegant and calm; suited to office and luxury fashion
[Change model]
```

`Change model` returns to the same picker tab, filters and scroll position.

### 2.4 Deterministic Recommendations

MVP does not require AI recommendations. Rank compatible Characters using a
versioned deterministic policy:

```text
1. valid Character attached to Template
2. tag compatibility with Template and Fashion intent
3. user's recently used Characters
4. successful Fashion usage/popularity
5. recently published compatible Community Characters
```

```text
CharacterRecommendation
- characterProfileId
- characterProfileVersionId
- score
- reasonCode
- source: template | owned | recent | popular | community
```

The server filters authorization and compatibility before ranking. The client
must not promote a Character that the active actor cannot use.

## 3. Pose Variation Pack

```text
PoseVariationPack
- id
- version
- title
- poses[]
  - key
  - displayName
  - structuredPoseRecipe
  - compatibleShotKeys[]
  - previewAssetId?
- maxSelected
```

Initial popular e-commerce poses:

- neutral front stance
- subtle weight shift
- three-quarter stance
- gentle walking motion
- side profile garment view
- back garment view

Templates choose three or four compatible operations. Pose changes must remain
natural and must not override a shot that explicitly requires front/back detail.

The current prototype stores one normalized `poseDirection` and
`environmentDirection` for the whole run and produces one operation per Product
Item. Versioned packs, multi-shot expansion and per-item assignments are target
MVP work; the UI must not imply they are active until the resolved server plan
returns those operations.

### 3.1 Deferred Bulk Pose Variation Policy

Bulk Outfit runs will later support controlled pose variation between Product
Items so a seller can generate a visually related campaign without every image
being identical. This is a Fashion Blueprint orchestration concern, not a new
Reference Processing rule.

The future plan contract is:

```text
BatchPoseVariationPolicy
- mode:
    locked
    | subtle
    | preset_rotation
    | per_item
    | auto_adapt
- poseVariationPackVersionId
- maximumVariationLevel: low | medium
- preserveTemplateFraming: true
- preserveCharacterIdentity: true
- preserveEnvironment: true
- allowHandAdaptation: boolean
- itemAssignments[]
  - productItemClientKey
  - shotKey
  - poseKey
  - assignmentSource: template | rotation | user | compatibility_adaptation
```

Mode behavior:

- `locked`: every compatible Product Item uses the Template pose.
- `subtle`: vary only weight distribution, shoulder angle, gaze and restrained
  hand placement.
- `preset_rotation`: deterministically rotate through compatible poses in the
  Template's versioned Pose Variation Pack.
- `per_item`: the user selects an allowed pose for each Product Item.
- `auto_adapt`: preserve the intended pose and adapt only interactions that are
  physically incompatible with the replacement garment.

Authority and safety rules:

- Character Reference continues to own identity and body proportions.
- Outfit Reference continues to own garment construction, pattern, material
  and declared color behavior.
- Template continues to own scene, lighting, framing and campaign treatment.
- Pose variation owns only body action, gaze and compatible hand placement.
- Variation must not introduce a new person, garment, environment, prop or
  rendering style.
- Front/back/detail operations override variation when a fixed viewing
  direction is required.
- Strict garment integrity may reduce or disable pose variation.
- The Reference Processing authority plan and processed Outfit derivative are
  reused; each Product Item must not create a private competing authority
  matrix.

Quote and reproducibility rules:

- Pose assignments are resolved before quote creation.
- The quote fingerprint includes policy mode, pack version and item
  assignments.
- Reordering/removing Product Items or changing a pose invalidates the quote.
- Every result records its Product Item, shot, pose assignment and Reference
  Processing policy version.
- Random variation is forbidden unless a seed and resolved pose assignment are
  stored in the immutable generation plan.

This capability remains deferred until the shared Reference Processing Pipeline
and the initial locked/explicit pose Bulk flow pass Fashion QA.

## 4. Environment

Simple Mode:

- defaults to Template environment
- exposes `Change environment` only on demand
- lists compatible curated environments with richer structured details
- no raw environment prompt

Advanced Mode:

- may expose supported structured environment controls/custom text through the
  existing prompt/configuration contract
- still validates conflicts and Template-locked properties

## 5. Ownership Precedence

```text
Character -> identity, face, body, stable hair
Outfit reference -> garment shape, construction, color and details
Template -> composition, lighting and base environment
Pose operation -> body action and camera-facing direction
User environment override -> environment only
```

No layer may silently override a higher-priority owned field.

This table is explanatory only. Runtime precedence is produced by
`server/domain/reference-processing/ReferenceAuthorityPlanner.js` and
`server/config/reference-processing-policy.json`. Fashion code must not create
another hard-coded authority matrix.

## 6. Component Reuse

- Character public cards/profile APIs from `006` and Community.
- `web/src/components/profiles/CharacterCard.tsx`.
- `web/src/features/profiles/api/profileApi.ts` for authorized handoffs.
- `web/src/lib/persistence/handoffStorage.ts` for actor-scoped route handoff.
- Shared visual/select controls where their contracts match.
- `web/src/components/generation/ReferenceSlotGrid.tsx` for reference
  preview/clear/upload behavior.
- React Router navigation context for preselected Character.
- Shared Reference Processing preview, scope and warning components for runtime
  authority feedback.
- Shared router navigation context so returning to Character Profile or
  Community restores the source page.

New orchestration:

```text
web/src/features/fashion-blueprint/components/FashionCharacterPicker.tsx
web/src/features/fashion-blueprint/components/FashionDirectionControls.tsx
server/domain/fashion-blueprint/FashionDirectionResolver.js
server/domain/fashion-blueprint/FashionCharacterRecommendationService.js
```

Do not create these component files until the current route has enough
complexity to justify extraction. The first extraction should move cohesive
sections out of `FashionBlueprintRoute.tsx`, not duplicate its state.

## 7. Acceptance Tests

- Public reusable Character can be selected by another actor.
- View-only/archived Character cannot generate.
- Outfit replaces casting uniform without changing Character identity.
- Pose variation does not replace garment or environment.
- Environment override is limited to compatible values in Simple Mode.
- Returning to Template default clears only the environment override.
- Beginner can accept the Template model with one action.
- Picker tabs, selected summary and `Change model` preserve context.
- Recommendations are deterministic and expose a reason code for testing.
- View-only Characters do not appear as selectable picker results.
- Character cards use readable front/face derivatives, not a tiny four-view
  sheet.
- Deferred Bulk Pose Variation produces deterministic per-item assignments,
  preserves role authority and invalidates stale quotes when assignments change.
- Quote and run recompute the same Reference Processing plan and reject a
  changed processing fingerprint.

## 8. Implementation Plan

1. Extract the current Character section only when implementing the
   Recommended/My/Community picker states.
2. Add server-filtered deterministic recommendations and reason codes.
3. Define versioned pose/environment pack contracts and make Template versions
   reference them.
4. Resolve a complete direction assignment before Quote and include it in the
   plan hash.
5. Add per-item pose modes only after the locked/explicit Bulk E2E passes.
