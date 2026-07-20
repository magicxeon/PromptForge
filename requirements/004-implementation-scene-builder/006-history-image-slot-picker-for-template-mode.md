# Scene-006 History Image Slot Picker for Template Mode

**Status:** Proposed - Awaiting Review  
**Feature type:** Template reference slot filling and history reuse  
**Depends on:** Scene-003 Scene Template Data Contract, Scene-004 Replaceable Variables and Slot Mapping, Scene-005 Reference Payload Optimization, history/lightbox service  
**Created:** 2026-07-19

## 1. Business Requirement

Users should be able to reuse images they already generated as reference inputs while using a Scene Template.

The current template replacement flow supports upload-based reference slots, but users often already have suitable images in History, such as a character sheet, headshot, outfit image, or style reference. Requiring a fresh upload slows down the workflow and increases request payload size because local uploads are sent as base64.

For MVP, when the user is in Template Mode and opens an image from History, the UI should provide an `Add to Template` action. This action assigns the selected history image to one compatible template reference slot.

Primary goals:

- Reduce repeated upload friction.
- Encourage continuous workflow from generated image -> template reuse -> new generation.
- Support one-image history assignment first.
- Prepare the same interaction model for future community `Use Template`.
- Prefer history URL/job reference over base64 when possible to reduce payload size.

## 2. User Flow

```text
Use Template
-> Template Variable Replacements panel is active
-> User chooses a required or optional reference slot
-> User opens History / Lightbox
-> User clicks Add to Template
-> Selected history image fills the active template slot
-> User returns to Template Variable Replacements
-> Generate from Template
```

MVP shortcut:

- If the active template has exactly one missing required `reference_image` variable, `Add to Template` fills that slot directly.
- If there are multiple compatible slots, show a lightweight slot picker before assignment.
- If no template workflow is active, hide `Add to Template`.

## 3. Reference Slot Compatibility

Supported MVP slots:

```text
character_reference
face_reference
outfit_front_reference
outfit_back_reference
style_reference
```

Compatibility rules:

- Any history image can be used for any supported slot in MVP.
- If history metadata indicates `mode: character-sheet`, prefer `character_reference`.
- If history metadata indicates `mode: headshot`, prefer `face_reference`.
- If the selected slot is `outfit_front_reference` or `outfit_back_reference`, preserve the source image as an outfit reference only; do not treat it as character identity.
- Future product slots are out of scope.

## 4. Software Development Specification

### 4.1 Client Modules

Add or extend these functional areas:

```text
client/scene-builder/sceneReplacementChecklist.js
client/scene-builder/sceneTemplateValidation.js
client/scene-builder/sceneHistorySlotPicker.js
client/core/lightboxService.js
client/core/historyService.js หรือ module ที่โหลด history ปัจจุบัน
client/index.html
client/style.css
```

### 4.2 Required State

Template mode should expose enough state for the lightbox/history UI:

```text
TemplateSlotAssignmentState
- isTemplateWorkflowActive
- activeTemplateSnapshot
- userInputValues
- missingRequiredReferenceVariables
- lastSelectedTemplateSlotId
```

### 4.3 Required Functions

```text
getTemplateReferenceVariables(snapshot) -> SceneTemplateVariable[]
getMissingRequiredReferenceVariables(snapshot, userInput) -> SceneTemplateVariable[]
getDefaultHistoryTargetSlot(snapshot, userInput, historyItem) -> string | null
assignHistoryImageToTemplateSlot(slotId, historyItem) -> AssignmentResult
openTemplateSlotPicker(historyItem) -> void
isHistoryImageUsableForTemplate(historyItem) -> boolean
```

### 4.4 History Image Value Contract

When assigning a history image to a template slot, prefer stable lightweight references:

```text
TemplateReferenceValue
- source: history
- jobId
- imageUrl
- thumbnailUrl
- provider
- submodel
- sourceMode
```

The template resolver may still output a string for compatibility, but the preferred internal value should be an object so future logic can avoid large base64 payloads.

MVP compatibility:

- If the resolver only accepts strings, use `imageUrl` or `/outputs/...` as the value.
- Do not convert history images to base64 on the client.
- If no usable URL exists, show a clear error and ask the user to upload manually.

### 4.5 UI Behavior

In Template Mode:

- Lightbox shows `Add to Template`.
- Replacement panel reference cards show upload/select status.
- Assigned history images show thumbnail preview and source label.
- If a slot is already filled, assigning a new history image replaces it after confirmation or simple overwrite.
- After assignment, the Generate button state updates immediately.

Outside Template Mode:

- `Add to Template` is hidden.
- Existing `Use as Character Ref`, `Build Character`, and `Use Template` actions keep their current behavior.

## 5. Impact

### 5.1 UX Impact

- Users can build workflows without leaving the application.
- Template reuse becomes faster because users do not need to download and re-upload generated images.
- Required reference slots become easier to complete.

### 5.2 Technical Impact

- Reduces JSON payload size when history URLs/job IDs are used instead of base64.
- Introduces a new bridge between History/Lightbox and Template Replacement state.
- Requires careful separation from cross-mode handoff actions.
- Requires reference value normalization because current template resolver primarily handles raw string values.

### 5.3 Data Impact

- Scene Template snapshot should not embed full history images.
- Generated history entries may store the assigned reference job IDs/URLs through existing reference fields.
- Future community templates can reuse the same slot assignment contract.

## 6. Implementation Concerns

- Do not confuse `Add to Template` with `Use as Character Ref`.
- Do not assign a history image silently when multiple slots are available unless one missing required slot is obvious.
- Avoid storing base64 image data inside `sceneTemplateSnapshot`.
- If the source history image is deleted later, generated jobs should still keep enough audit metadata to explain what was used.
- The slot picker must remain usable on narrow/mobile screens.

## 7. Testing

### 7.1 Manual UI Test Cases

```text
TC-006-001
Given Template Mode is active and one required character_reference is missing
When user opens a History image and clicks Add to Template
Then character_reference is filled and Generate from Template becomes enabled
```

```text
TC-006-002
Given Template Mode is active and multiple reference slots are available
When user clicks Add to Template from History
Then a slot picker appears and user can choose the target slot
```

```text
TC-006-003
Given user assigns a History image to outfit_front_reference
When user generates from template
Then payload contains outfitReferenceImageFront as a lightweight URL/reference, not base64
```

```text
TC-006-004
Given Template Mode is not active
When user opens a History image
Then Add to Template is hidden
```

```text
TC-006-005
Given a slot already has an uploaded image
When user assigns a History image to the same slot
Then the slot preview updates and replacement validation refreshes
```

### 7.2 Node Test Coverage

Recommended tests:

```text
test/sceneHistorySlotPicker.test.js
test/sceneVariableResolver.test.js
```

Test targets:

- `getDefaultHistoryTargetSlot`
- `assignHistoryImageToTemplateSlot`
- missing required slot resolution after assignment
- lightweight history image value normalization

### 7.3 Regression Tests

- Existing upload-based template reference flow still works.
- Existing `Use as Character Ref` lightbox action still works.
- Existing `Use Template` action from lightbox/history still works.
- Payload does not exceed body limit for history-based assignment.
