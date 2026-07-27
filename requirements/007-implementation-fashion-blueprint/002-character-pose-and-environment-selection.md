# Character, Pose and Environment Selection

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

The seller chooses a virtual model and can make small pose/environment changes
without losing the visual identity of the selected Template.

## 2. Character Selection

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
canonicalCharacterReferenceAssetId
attribution
personalitySummarySnapshot
```

Picker states:

- `Available to use`: selectable and shows a familiar approved Character icon
- `View only`: opens profile detail but selection is disabled
- `Owner only`: disabled for non-owner; owner may use an approved own Character
- destination incompatible: disabled with compatibility explanation

Use Lucide icons, tooltips and accessible text. Never rely on color/icon alone.

The casting white outfit is identity/silhouette evidence only. It must be
explicitly suppressed as final clothing when an outfit slot is supplied.

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

## 6. Component Reuse

- Character public cards/profile APIs from `006` and Community.
- Visual option controls for pose/environment.
- Scene variable resolver and validation where contracts match.
- Existing `referenceSlotManager.js` for preview/clear behavior.
- Router/cross-mode handoff for preselected Character.

New orchestration:

```text
client/fashion-blueprint/fashionCharacterPicker.js
client/fashion-blueprint/fashionPoseControls.js
client/fashion-blueprint/fashionEnvironmentControls.js
server/domain/fashion-blueprint/FashionDirectionResolver.js
```

## 7. Acceptance Tests

- Public reusable Character can be selected by another actor.
- View-only/archived Character cannot generate.
- Outfit replaces casting uniform without changing Character identity.
- Pose variation does not replace garment or environment.
- Environment override is limited to compatible values in Simple Mode.
- Returning to Template default clears only the environment override.
