# Upgrade Step 9: Multi-Slot Loopback Referencing & Provenance Tracking
**ID**: 009-loopback-referencing
**Target**: `ModelPromptForge`

This document details the requirements for visual multi-slot loopback referencing, allowing users to load up to 2 generated or history images as active inputs (Face or Style), trace parent generation lineage, and record execution duration in history metadata.

---

## 1. Multi-Slot Reference Concept
- **Goal**: Allow users to combine up to **2 face reference images** (for face structure interpolation) and **2 style reference images** (for style/outfit details combination).
- **Benefit**: Using multiple face references allows the Google Gemini interactions API to stabilize face consistency across multiple angles and lighting settings.
- **Reference Slots**:
  - **Face Match**:
    - Slot A: `state.faceReferenceImageA` (Base64 or local `/outputs/` URL path)
    - Slot B: `state.faceReferenceImageB` (Base64 or local `/outputs/` URL path)
  - **Style Match**:
    - Slot A: `state.styleReferenceImageA` (Base64 or local `/outputs/` URL path)
    - Slot B: `state.styleReferenceImageB` (Base64 or local `/outputs/` URL path)

---

## 2. UI Elements & Reference Managers

### 2.1 Action Controls in Viewport & Lightbox
- Below the viewport `#generated-image` card and inside the `#lightbox-modal` metadata column, provide two action buttons:
  - **"👤 Use as Face Reference"** (`#btn-use-face-ref` / `.btn-use-face-ref`)
  - **"🖼️ Use as Style Reference"** (`#btn-use-style-ref` / `.btn-use-style-ref`)
- **Slot Allocation Logic**:
  - When clicking either button:
    - If Slot A is empty: load the active image path/ID into Slot A.
    - Else if Slot B is empty: load it into Slot B.
    - If both slots are full: overwrite Slot B and show a brief indicator.

### 2.2 Visual Reference Dock
- **Face Match Dock**: Inside the `#face-match-upload-container` (which slides open when Face Match is checked):
  - Render two visual preview boxes: **Face Slot A** and **Face Slot B**.
  - If a slot is loaded, display its thumbnail with a clear button (`&times;`) to let the user clear the slot individually.
- **Style Match Dock**: Add a dynamic preview container next to or below the `#sheet-use-reference-img` checkbox:
  - Render two visual preview boxes: **Style Slot A** and **Style Slot B**, showing thumbnails with individual clear buttons (`&times;`).

---

## 3. Provenance (Lineage) Tracking

### 3.1 Lineage Metadata
- When enqueuing and saving a job, the system must record the parent lineage in the metadata:
  - Save the IDs of the active reference parent jobs in `referencedFaceJobIds` (array of up to 2 IDs) and `referencedStyleJobIds` (array of up to 2 IDs).
  - Also record the **Generation Duration** (execution time in seconds, e.g., `5.4s`) as `generationDuration` in the metadata.
- Save this metadata into the local `history.json` database.

### 3.2 Clickable Parent Links in Lightbox
- When viewing a history item inside `#lightbox-modal`:
  - Read `referencedFaceJobIds` and `referencedStyleJobIds` from the item metadata.
  - If parent lineages are found, render miniature clickable thumbnails of these parent images labeled:
    - `"Face Reference: Job #12345"`
    - `"Style Reference: Job #67890"`
  - **Action**: Clicking these miniature parent thumbnails will instantly switch the active Lightbox view to display that parent image's details, enabling the user to explore the character's generation lineage recursively!
- Display the recorded **Generation Duration** prominently in the metadata column: e.g. `Duration: 4.8s`.

---

## 4. Backend Strategy & Image Path Resolution
- The enqueuing payload to `/api/generate` will include:
  - `faceReferenceImageA`, `faceReferenceImageB`
  - `styleReferenceImageA`, `styleReferenceImageB`
  - `faceReferenceJobIds`, `styleReferenceJobIds`
  - `generationDuration` (computed in client upon job completion and saved via update/completed endpoint or saved directly by backend duration logging).
- **Backend File Loading**:
  - If any reference path starts with `/outputs/`, the backend Express router (`server/server.js` or `GeminiProvider.js`) must resolve the local static file on disk, read it, and encode it back to base64 before posting to the Google Gemini interactions endpoint.
  - In `GeminiProvider.js`, append all active face/style base64 objects into the Interactions `input` array as native image parts.
