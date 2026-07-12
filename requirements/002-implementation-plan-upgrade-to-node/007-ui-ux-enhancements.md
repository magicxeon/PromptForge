# Upgrade Step 7: Advanced UI/UX Refinement & Dynamic Aspect Ratios
**ID**: 007-ui-ux-enhancements
**Target**: `ModelPromptForge`

This document outlines the detailed requirements for refining the Studio Creative Configurator, fixing visibility constraints, adding dual-linked aspect ratio dimensions, and enhancing theme contrasts.

---

## 1. Aesthetic Presets Dropdown
- **Current Issue**: The preset chips scroll list is too long and clutters the interface.
- **New Requirement**:
  - Replace the horizontal scrolling presets bar with a single dropdown selection menu (`<select id="preset-select">`).
  - Add a dedicated **"Load Preset"** action button next to it.
  - Selecting a preset and clicking the button will apply the preset selections to the form.

---

## 2. Dynamic Attribute Height & Scroll Fixing
- **Current Issue**: The dynamic attribute selectors (character, face, hair, clothing, etc.) have their option heights cut off, preventing some options from being visible.
- **New Requirement**:
  - Remove rigid `max-height` limitations on the accordions container (`.accordions-container`) and accordion contents (`.accordion-content`).
  - Set height styling to be completely **dynamic** based on the number of options in the active category.
  - Allow the page to scroll naturally, or implement internal custom scrolling inside the active accordion only, ensuring no dropdown select gets cut off at the container edges.

---

## 3. Redundant Selector Removal (Prompt Template)
- **Current Issue**: The "Prompt Template" dropdown is confusing and unnecessary since the secret prompt compiler on the backend handles standard rendering layouts automatically.
- **New Requirement**:
  - Completely **remove or hide** the "Prompt Template" selector from the Step 2 panel.
  - The backend compiler will continue to use the default portrait or template modes under the hood without exposing the selector to the user.

---

## 4. Linked Aspect Ratios & Dimension Constraints
- **New Requirement**:
  - When an Aspect Ratio chip is selected, update the default dimensions in two new linked input fields: **Width** (`#input-width`) and **Height** (`#input-height`).
  - Standard defaults:
    - `1:1` -> `1024 x 1024`
    - `16:9` -> `1920 x 1080`
    - `9:16` -> `1080 x 1920`
    - `6:8` (3:4) -> `768 x 1024`
    - `4:5` -> `1024 x 1280`
  - **Dynamic Linkage**: Modifying the **Width** input must automatically adjust the **Height** input (and vice versa) in real-time to preserve the selected aspect ratio.
  - **Constraints Validation**:
    - Minimum size constraint: `720px` (for both width and height).
    - Maximum size constraint: `4096px` (4K) (for both width and height).
    - Input values outside this boundary must display a warning and clamp to the limits.

---

## 5. Premium Generate Image Button & Credit Badge
- **New Requirement**:
  - Redesign the **Generate Image** button to be larger, highly prominent, and visually striking (e.g. enhanced pulse neon glows, distinct gradients, hover highlights).
  - Add a **credit cost badge** inside or directly next to the button text, indicating the cost of generation: e.g. `⚡ Generate Image (1 Credit)`.

---

## 6. History-Aware Viewport Auto-Collapse
- **New Requirement**:
  - On page load, if the local generation history is empty, the **Visual Viewport & Queue Panel** (`#visual-dashboard`) must load in a **collapsed state** by default.
  - This ensures the user's attention is immediately focused on the Creative Configurator.
  - When the user clicks "Generate", the viewport panel must automatically expand to display the rendering queue/image.

---

## 7. Contrast & Readability Improvements

### 7.1 Dropdown Background Colors
- **New Requirement**: The option dropdown selections (`<select>` background options) must not use bright or low-contrast backgrounds that make text hard to read. Use dark, sleek backgrounds that match the main panels (e.g. `#18181b` or `#09090b`) with contrasting white/cyan text.

### 7.2 Panel Styling Separation
- **New Requirement**: Distinguish the background color, borders, or highlights of **Step 2 Panel** (`.step-2-card`) from **Step 1 Panel** (`.step-1-card`) to visually segment the configuration steps (e.g., using a subtle dark blue-purple glass background for Step 2 vs dark gray-purple for Step 1).

### 7.3 Readability Enhancements
- **New Requirement**: Slightly increase the overall brightness of the card borders, labels, and text across the page. Ensure high contrast so text is readable against the dark HSL gradient theme without sacrificing the aesthetic.

---

## 8. Role-Based Prompt Preview Hiding
- **Current Issue**: Standard users see a placeholder card for Live Prompt Preview, which still takes up vertical space.
- **New Requirement**:
  - If the active user profile is `user` (Standard User), the **Live Prompt Preview card** must be completely hidden (`display: none;` or removed from layout).
  - Show the Live Prompt Preview card **only** if the user is `admin`.

---

## 9. Face Match Reference Image Upload Component
- **New Requirement**:
  - In the Step 2 Panel, next to or below the "Face Match" checkbox, add a dynamic file upload container (`<div id="face-match-upload-container" style="display: none;">`).
  - Checking the "Face Match" checkbox must slide down/reveal this file upload container.
  - The container must hold a file input (`<input type="file" id="face-match-file" accept="image/*">`) and a clear styling button to delete/reset the uploaded face template.
  - The client-side JS must read the uploaded image as a Base64 string and pass it to the backend enqueuing API as `faceReferenceImage`.
  - Unchecking "Face Match" will clear the selected file and hide the upload container.

