# Upgrade Step 8: Advanced Validations, Reference Loopback & Attribute Localization
**ID**: 008-advanced-validations-and-localization
**Target**: `ModelPromptForge`

This document details the requirements for validation enforcement, workspace scrolling helpers, recursive face referencing, and multilingual attribute schema support.

---

## 1. Required Fields Validation & Autofocus
- **Goal**: Ensure the user has selected critical attributes before starting a generation.
- **Required Fields**:
  - We will designate **"Ethnicity"** and **"Gender"** (from the `character` schema) as mandatory required fields.
- **Rules**:
  - Before enqueuing a generation request, check if the required fields are selected in `state.selections`.
  - If a required field is missing:
    - Block generation.
    - Programmatically expand the accordion group containing the missing required field (e.g. expand the "Character" accordion).
    - Smoothly scroll the window to the missing field element.
    - Highlight the missing select dropdown with a flashing neon red border to draw the user's attention.

---

## 2. Configurator Scroll Focus
- **Goal**: Improve transition flow when expanding the Studio Configurator panel.
- **Rule**:
  - When the user clicks the floating button **"⚙️ Open Studio Configurator"** (`#btn-floating-config`), the page must expand the configurator panel and then **smoothly scroll the window viewport** to align the top of `#creative-configurator` with the viewport.

---

## 3. Multilingual Schema (Localization)
- **Goal**: Support translating attribute descriptions dynamically.
- **Proposed JSON Format (Example for [001-character.json](file:///d:/development/ModelPromptForge/attributes/001-character.json))**:
  - Update the `"label"` property of attributes to support localized languages:
    ```json
    {
      "id": "character.beauty_doll",
      "category": "character",
      "subcategory": "Beauty",
      "label": {
        "en": "Cute doll-like Asian",
        "th": "หมวยน่ารักสไตล์ตุ๊กตา"
      },
      ...
    }
    ```
- **Localization Functions (Frontend)**:
  - Add a state variable `state.language = 'th'` (default to 'th' or 'en').
  - **Pill Toggles (Step 8 Design Upgrade)**: Instead of standard dropdowns, implement sleek glassmorphic pill selectors for both Language (`#language-pill-selector`) and Profile (`#profile-pill-selector`).
  - **Backward Compatibility (CRITICAL)**: If the schema item's `"label"` is a plain string rather than an object, the system must render the string directly without throwing errors.
  - Modify the form rendering logic in `app.js` to render the correct label text depending on the active language:
    ```javascript
    const getLocalizedLabel = (labelObj) => {
      if (typeof labelObj === 'object' && labelObj !== null) {
        return labelObj[state.language] || labelObj['en'] || '';
      }
      return labelObj || ''; // Render plain string for backward compatibility
    };
    ```
  - Swapping the language toggle will immediately trigger `renderForm()`, restore selections via DOM state matching, and reload all categories in the selected language without resetting active user selections.
