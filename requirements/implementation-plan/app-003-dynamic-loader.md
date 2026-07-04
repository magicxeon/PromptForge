# Task app-003: Dynamic Schema Loading

## 1. Goal
Asynchronously fetch project JSON schemas and dynamically generate form UI groups and attribute options, making the app 100% data-driven.

## 2. Logic Flow
1.  **Fetch System Config**:
    *   Load `/requirements/spec/ui-schema.json` to get the list of groups, their fields, and control types.
    *   Load `/requirements/spec/attribute-library.json` to fetch the library of pre-defined options.
    *   Load `/requirements/spec/prompt-templates.json` to get the prompt structure templates.
    *   Load `/requirements/spec/prompt-order.json` to get the target sequence of attributes.
2.  **UI Generation**:
    *   Iterate through the groups from `ui-schema.json` (e.g., Character, Face, Skin).
    *   Create collapsible accordion panels for each group.
    *   Inside each accordion, create form fields.
    *   For each field, look up matching options from `attribute-library.json` (filtering by matching group/category).
    *   Inject option elements into the custom select elements.

---

## 3. Proposed Changes

### [NEW] [app.js](file:///d:/development/ModelPromptForge/app.js) (Part 1 - Data Loading & Rendering)
*   Define global state object to hold selected option IDs/custom values.
*   Implement `async function initApp()`:
    *   Fetch all required JSON files using `Promise.all` or sequential loads.
    *   Store them globally (`state.schema`, `state.library`, `state.templates`, `state.order`).
*   Implement `function renderForm()`:
    *   Build HTML nodes dynamically based on `ui-schema.json` mapping.
    *   Populate select controls with labels and prompts.
    *   Append generated form elements to `#form-container`.
    *   Add accordion open/close event listeners.

---

## 4. Verification
- Open `index.html` via a local dev server (to bypass CORS block on fetch calls).
- Verify that all categories (Character, Face, Hair, etc.) render as accordions.
- Expand accordions and verify that options are correctly loaded into their respective dropdown selectors.
