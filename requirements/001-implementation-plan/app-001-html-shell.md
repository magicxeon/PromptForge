# Task app-001: Core Shell & HTML Structure

## 1. Goal
Establish the main entry point (`index.html`) containing the semantic HTML structure, styling links, and script hooks.

## 2. Layout Structure
A dual-panel layout:
*   **Header**: Brand title ("ModelPromptForge") and descriptive subtitle.
*   **Main Dashboard Container**:
    *   **Left Column (Attribute Form Panel)**: A placeholder container (`#form-container`) where JS will dynamically load categories and render form groups.
    *   **Right Column (Control & Preview Panel)**:
        *   **Template Selector**: Dropdown to choose the current output layout (e.g., Portrait, Nightclub).
        *   **Identity Reference Card**: Input to specify reference image options.
        *   **Prompt Output Box**: A textarea/div displaying the compiled prompt.
        *   **Action Row**: Copy Prompt, Clear Form, Export Config JSON, and Import Config JSON file upload.

---

## 3. Proposed Changes

### [NEW] [index.html](file:///d:/development/ModelPromptForge/index.html)
*   Include standard HTML5 boilerplate.
*   Link `style.css` in head.
*   Add Google Fonts linking (Inter, Outfit).
*   Add placeholder containers with unique IDs (`#form-container`, `#prompt-preview`, `#template-select`, `#btn-copy`, `#btn-reset`, `#btn-export`, `#btn-import`).
*   Include the reference to `app.js` at the bottom of the body.

---

## 4. Verification
- Open `index.html` in browser.
- Verify that both the left form column and the right control column layout structure are visible and positioned correctly.
