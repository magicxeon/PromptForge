# Task app-006: Preset Save/Load & State Import/Export

## 1. Goal
Provide export/import utilities for JSON configuration files to allow users to save their attribute configurations and load them back later.

## 2. Logic Flow
1.  **Export Config JSON**:
    *   Construct a JSON object representing the current state (selected IDs, custom override texts, active template, etc.).
    *   Create a data URI blob and trigger a download: `model-prompt-config.json`.
2.  **Import Config JSON**:
    *   User uploads a JSON file using a standard file input, or pastes the JSON text.
    *   Parse the JSON and validate its structure.
    *   Set the global state values.
    *   Programmatically trigger the UI updates (update dropdown selections, show custom inputs if they were active, render values).
    *   Trigger `updatePromptPreview()`.
3.  **Reset Form**:
    *   Clear all selections, hide custom text inputs, revert template selector to default, and update preview.

---

## 3. Proposed Changes

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js) (Part 4 - Export, Import & Reset)
*   Implement `exportConfigJSON()`: downloads current selection state as JSON.
*   Implement `importConfigJSON(jsonString)`: parses, sets state, and runs a UI redraw to reflect loaded data.
*   Bind file upload event handler: reads file with `FileReader`, calls `importConfigJSON()`.
*   Implement `resetForm()`: clears inputs and resets preview.

---

## 4. Verification
- Fill in a complete configuration (e.g. Young adult Thai female, red hair, nightclub setting).
- Click "Export Config JSON" -> verify a download starts with valid JSON.
- Click "Clear Form" -> verify UI and preview reset to defaults.
- Upload the downloaded JSON -> verify the form automatically restores all selections and the prompt preview matches exactly.
