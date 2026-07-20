# Scene-007 Reference Slot Ownership and Privacy

**Status:** Proposed - Awaiting Review  
**Feature type:** Reference image permissions and public reuse policy  
**Depends on:** Asset storage, auth, Community-04 in requirements/005-implementation-community-plan, reference manager  
**Created:** 2026-07-18

## 1. Objective

Define how reference images behave when a Scene Template is shared or reused.

## 2. Reference Slot Policies

Each reference slot must have a policy:

```text
not_shared
shared_preview_only
shared_as_reusable_reference
required_user_replacement
optional_user_replacement
```

Default for MVP:

- Face reference: `required_user_replacement` unless creator explicitly shares.
- Character reference: `required_user_replacement` unless creator explicitly shares.
- Outfit reference: `optional_user_replacement` or `shared_preview_only`.
- Style reference: `shared_as_reusable_reference` when public-safe.

## 3. Privacy Rules

- Private user uploads must never become public template assets by accident.
- Template must distinguish image preview from reusable reference source.
- If image cannot be shared, store a slot placeholder and replacement requirement.
- Metadata from uploaded files must be stripped before public use.

## 4. Ownership Rules

Reusable reference images require owner permission.

Community post visibility does not automatically grant reuse rights.

## 5. UI Requirements

Share preview must show each slot:

```text
Face Reference: Replace required
Outfit Front: Included as preview only
Style Reference: Reusable
```

## 6. Acceptance Criteria

- User can share a template without leaking private reference images.
- Template reuse flow clearly asks for required replacement images.
- Public API returns only allowed reference assets.
- Hidden/removed source assets invalidate or hide dependent public reuse where needed.

## 7. Software Development Specification

### 7.1 Slot Policy Validator

Add a validator:

```text
validateReferenceSlotPolicies(slots, actorContext) -> { publicSlots, privateSlots, requiredReplacements, warnings }
```

### 7.2 Slot Data

Each slot should store:

```text
slotId
slotType
sourceAssetId
sourceJobId
sharePolicy
requiredForGeneration
previewAllowed
reuseAllowed
```

### 7.3 Runtime Behavior

Input: template slot policy plus current user replacement values.

Process: decide which references can be sent to generation and which must be replaced.

Output: sanitized reference payload and validation warnings.

## 8. Implementation Concerns

- Never embed private base64 reference images in public templates.
- Sharing a generated final image is not the same as sharing its source references.
- Deleted or hidden reference assets must not continue to be reusable from public templates.
- Uploaded face/character references are sensitive and default to replacement-required.

## 9. Functional Technical Specification

### 9.1 Client Files

```text
client/core/referenceManager.js
client/scene-builder/sceneReferenceSlots.js
client/scene-builder/sceneReferencePolicyControls.js
client/scene-builder/sceneReplacementChecklist.js
```

### 9.2 Server Files

```text
server/sceneTemplates/sceneReferenceSlotPolicy.js
server/sceneTemplates/sceneTemplateSanitizer.js
server/assets/assetAccessPolicy.js
```

### 9.3 Required Functions

```text
createSceneReferenceSlot(slotType, source) -> SceneReferenceSlot
validateReferenceSlotPolicies(slots, actorContext) -> ReferencePolicyResult
sanitizeReferenceSlotsForPublic(slots, visibilityPolicy) -> PublicReferenceSlot[]
resolveReferenceSlotsForGeneration(slots, replacements) -> GenerationReferencePayload
isReferenceReusableByViewer(slot, viewerContext) -> boolean
```

### 9.4 Slot Types

```text
character_reference
face_reference
outfit_front_reference
outfit_back_reference
style_reference
pose_reference_later
```

### 9.5 Concerns For Implementing Agents

- Treat face and character references as sensitive by default.
- Keep preview permission separate from generation reuse permission.
- Public template payloads must be checked by API tests, not only UI checks.
