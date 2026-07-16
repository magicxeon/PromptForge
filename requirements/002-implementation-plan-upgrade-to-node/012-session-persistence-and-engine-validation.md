# Step 12: Session Persistence & Engine Selection Validation

## 1. Goal Description
The objective of this step is to improve operational safety and user experience by validating API engine and submodel choices prior to generation, and introducing per-mode auto-saving persistence (`localStorage`) so character configurations are not lost when refreshing the page or switching generation modes.

---

## 2. Requirement Specifications

### Part 2.1: Provider Engine & Submodel Validation
1. **Generate Trigger Validation**:
   - Update `validateForm()` in [**client/app.js**](file:///d:/development/ModelPromptForge/client/app.js) to assert that:
     - Provider Engine (`#api-provider-select`) has a non-empty selection.
     - Submodel Version (`#api-submodel-select`) has a non-empty selection.
2. **Error Feedback**:
   - If either field is empty, append the flashing red validation CSS class (`required-flash`) to the container and focus/scroll the viewport to the first missing control element.
   - Display a human-readable alert message: `"Please select both a Provider Engine and a Submodel Version before generating an image."`

### Part 2.2: Per-Mode Configuration Persistence (`localStorage`)
1. **Auto-Saving on Change**:
   - Bind global state saving hooks to all configuration changes:
     - Select value changes (including custom text write-ins).
     - Color picker checkboxes and hex inputs.
     - Image reference checkboxes.
     - Aspect ratio chip selections and dimensions.
2. **Partition Keys by Mode**:
   - Store configurations in browser `localStorage` separated by active mode (`state.mode`):
     - Headshot Mode (`"headshot"`): Key `"model_prompt_forge_state_headshot"`
     - Character Sheet Mode (`"character-sheet"`): Key `"model_prompt_forge_state_character_sheet"`
     - Story Mode (`"normal"`): Key `"model_prompt_forge_state_normal"`
3. **State Payload Structure**:
   - The saved state payload must serialize:
     ```json
     {
       "selections": {...},
       "customColors": {...},
       "imageReferences": {...},
       "aspectRatio": "...",
       "width": 1024,
       "height": 1024,
       "template": "..."
     }
     ```
4. **State Restoration Trigger**:
   - **On App Load (`initApp`)**: Load and apply the saved state matching the default initial mode.
   - **On Mode Chip Switch**: Save current mode settings first, switch `state.mode`, then load and restore settings matching the newly active mode.
   - **UI Sync**: Ensure the restoration logic properly updates the select values in DOM, text inputs, checks/unchecks boxes, unlocks/locks fields, shows/hides color pickers, updates the aspect ratio chip classes, and triggers the live prompt preview update.
