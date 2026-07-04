# Task app-004: Interactive Controls & Custom Inputs

## 1. Goal
Implement selection listeners to record user selections, handle custom overrides (the "Custom" options), and support identity references.

## 2. Logic Flow
1.  **Standard Selects**:
    *   Listening to change events on the generated dropdowns.
    *   Save selected prompts/values to the active session state.
2.  **Custom Value Override**:
    *   Append a `"Custom (Write-in)..."` option to every dynamically generated dropdown.
    *   If selected, dynamically append a text input field directly below the dropdown.
    *   Listen to input changes on this text field and save the custom string to the state.
    *   If any other option is selected, hide the text input field and remove the custom override from the state.
3.  **Image Reference Attributes (No Actual Upload)**:
    *   Provide a dedicated checkbox/toggle group for external reference styling in the UI.
    *   Allow users to toggle three independent options:
        *   `Face Match`: If active, appends: *"facial structure, mouth, nose, eyes, and eyebrows must match the original uploaded file 100% without any distortion"*
        *   `Style & Outfit Match`: If active, appends: *"matching the style, colors, and clothing outfit from the original uploaded image"*
        *   `Pose & Composition Match`: If active, appends: *"with the identical posing and image composition as the original uploaded file"*
    *   Store active references in the global state (`state.imageReferences = { faceMatch: false, styleMatch: false, poseMatch: false }`).

---

## 3. Proposed Changes

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js) (Part 2 - Event Handlers & State Management)
*   Add event delegation/listeners for form inputs.
*   Implement custom option toggle handlers:
    *   `handleSelectChange(event)`: checks if value is `'__custom__'`. Shows/hides custom text field.
    *   Update the state object (`state.selections[fieldName] = { value, isCustom }`).
*   Implement `handleImageReferenceToggle(event)`:
    *   Listens to checkboxes for face match, style match, and pose match.
    *   Updates the state values in `state.imageReferences`.
    *   Triggers prompt compilation.

---

## 4. Verification
- Select options and ensure selection values are stored in the state.
- Select "Custom (Write-in)..." in a dropdown (e.g., Hair Color) -> verify a text input appears.
- Type "cyan neon glow" in the custom input, then change the select back to "Red" -> verify the custom input hides.
- Toggle "Face Match" checkbox -> verify that the face match instruction is appended to the prompt preview.
- Toggle "Style Match" and "Pose Match" checkboxes -> verify that they append their respective strings in real time.
