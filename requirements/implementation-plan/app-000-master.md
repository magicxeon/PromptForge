# ModelPromptForge Master Web App Implementation Plan

This master plan details the development of the application's structure, layout, styles, dynamic schemas, and prompt generation logic. It is separated from the attribute database files to keep application development independent of dataset curation.

## Web App Subtasks & Execution Order

1. **[app-001-html-shell.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-001-html-shell.md) - Core Shell & HTML Structure**
   * *Goal*: Create the baseline HTML5 structure with a responsive two-column dashboard workspace layout (Left: forms, Right: preview and actions).
2. **[app-002-css-ux.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-002-css-ux.md) - Premium & User-Friendly UX/UI Design System**
   * *Goal*: Establish the CSS variables, dark/neon theme, glassmorphism cards, button chips, dynamic summary badges on accordions, and interactive hover sync states.
3. **[app-003-dynamic-loader.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-003-dynamic-loader.md) - Dynamic Schema Loading**
   * *Goal*: Dynamically fetch JSON schemas using native Fetch APIs and render all UI categories and option lists.
4. **[app-004-interactive-controls.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-004-interactive-controls.md) - Interactive Controls & Custom Inputs**
   * *Goal*: Listen to dropdown change events, toggle custom override text fields when "Custom" is selected, and handle Image Reference Attributes.
5. **[app-005-prompt-assembly.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-005-prompt-assembly.md) - Live Prompt Assembly & Preview Engine**
   * *Goal*: Compile active selections into a structured prompt using order rules and templates. Support color-coded token rendering and single-click copy utilities.
6. **[app-006-import-export.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/app-006-import-export.md) - Preset Save/Load & State Import/Export**
   * *Goal*: Export selection states as JSON configurations, support configuration importing/uploading, and implement form resets.

---

## Technical Stack
*   **HTML5 & CSS3**: Pure CSS grid and variables. No TailwindCSS.
*   **Vanilla JS (ES6+)**: Custom dynamic DOM creation and async state loading.
