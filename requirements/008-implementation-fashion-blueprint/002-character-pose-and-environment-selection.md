# Character, Pose and Environment Selection

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Status:** Proposed

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
client/fashion-blueprint/fashionCharacterRecommendation.js
client/fashion-blueprint/fashionPoseControls.js
client/fashion-blueprint/fashionEnvironmentControls.js
server/domain/fashion-blueprint/FashionDirectionResolver.js
server/domain/fashion-blueprint/FashionCharacterRecommendationService.js
```

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
