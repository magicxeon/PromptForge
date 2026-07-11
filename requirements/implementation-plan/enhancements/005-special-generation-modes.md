# Requirement: Special Generation Modes (Headshot Grid & Character Sheet)
**ID**: 005-special-generation-modes
**Target App**: `ModelPromptForge` (Main Application)

## 1. Goal
Introduce two specialized, high-fidelity character generation modes in the prompt generator:
1. **Face/Headshot Portrait Mode (โหมดสร้างใบหน้า)**: Focuses strictly from head to shoulders and generates a single image containing a grid of either 3 or 6 variations.
2. **Full-Body Character Sheet Mode (โหมดสร้างทั้งตัว)**: Generates a full-body model sheet featuring Front, Side, and Back views of the character, with support for referencing/uploading an image.

Both modes require a **solid white background**, **photorealistic styling**, and **camera imperfections** by default, while dynamically disabling all irrelevant UI elements to streamline the workflow.

---

## 2. User Experience & UI Flow

### 2.1 Mode Selector
- A new button group or dropdown selector **"Generation Mode"** will be added at the top of the controls panel:
  - `Normal` (Default full-featured layout)
  - `Headshot Grid (3/6 Panels)`
  - `Character Sheet (Front/Side/Back)`

### 2.2 Dynamic UI Filtering (Accordion Locking)
When switching modes, the UI will dynamically hide accordions and fields that are irrelevant to that specific mode. This will be controlled by applying a `.hidden` class in CSS.

#### Mode A: Headshot Grid UI Filtering
*Goal: Focus on the head, face, skin, hair, and camera settings.*
- **Visible Accordion Groups**:
  - `Character` (Gender, Age, Ethnicity, Beauty)
  - `Face` (Face Shape, Eyes, Eyebrows, Nose, Lips, Smile, Expression)
  - `Hair` (Length, Style, Texture, Color, Bangs)
  - `Skin` (Tone, Texture, Makeup, Freckles)
  - `Camera` (Only Brand, Lens, Camera Imperfections, ISO, White Balance - *hide perspective/framing/motion blur*)
  - `Quality` (Resolution, Sharpness, Photorealism, Film Look)
- **Hidden Accordion Groups**:
  - `Scene Story`, `Photographic Context`, `Body`, `Clothing`, `Pose`, `Environment` (since background is forced to white), `NSFW`.
- **Mode-Specific Fields**:
  - A dropdown or button group for **Grid Layout**: `3 Variations` (default) vs `6 Variations`.

#### Mode B: Character Sheet UI Filtering
*Goal: Focus on full-body anatomy, clothing, and character identity.*
- **Visible Accordion Groups**:
  - `Character` (Gender, Age, Ethnicity, Beauty, and a dedicated image reference upload button)
  - `Body` (Height, Body Shape, Build, Hands, Legs)
  - `Clothing` (Top, Bottom, Dress, Shoes, Accessories)
  - `Hair` (Length, Style, Texture, Color, Bangs)
  - `Face` (Face Shape, Eyes, Nose, Lips, Smile, Expression)
  - `Camera` (Only Brand, Lens, Camera Imperfections, ISO, White Balance)
  - `Quality` (Resolution, Sharpness, Photorealism, Film Look)
- **Hidden Accordion Groups**:
  - `Scene Story`, `Photographic Context`, `Pose` (forced to standard front/side/back standing), `Environment` (forced to white background), `NSFW`.

---

## 3. Prompt Engineering & Compilation Rules

Both modes force specific parameters at compile time:
1. **Background**: `on a solid pure white background`
2. **Style**: `photorealistic photography, realistic human proportions`
3. **Imperfections**: `subtle digital sensor noise, slight chromatic aberration, realistic camera imperfections`

### 3.1 Headshot Grid Compilation
The prompt will compile with a grid modifier that explicitly commands the AI to generate distinct facial structures, features, and hairstyles across the panels, providing a selection comparison:
- **3 Variations**:
  - `3 distinct character headshot concepts, 3 different facial structures and hairstyles, 3-panel portrait grid showing comparison of unique options, each panel features a distinct face, showing head to shoulders, on a solid pure white background, photorealistic photography, realistic camera imperfections...`
- **6 Variations**:
  - `6 distinct character headshot concepts, 6 different facial structures and hairstyles, 6-panel portrait grid showing comparison of unique options, each panel features a distinct face, showing head to shoulders, on a solid pure white background, photorealistic photography, realistic camera imperfections...`

### 3.2 Character Sheet Compilation
The prompt will compile with model-sheet modifiers and pose overrides:
- `character model sheet, character design sheet, showing front view, side view, and back view of the same character, full-body view, standing straight in a neutral pose, on a solid pure white background, photorealistic photography, realistic camera imperfections...`

---

## 4. Proposed Technical Changes

### 4.1 UI Layout
#### [MODIFY] `index.html`
- Insert the **Generation Mode Selector** before the main accordion container.
- Insert the **Grid Layout selector** (3 vs 6 variations), visible only when "Headshot Grid" mode is active.
- Ensure the reference image element supports an upload input or is explicitly integrated.

#### [MODIFY] `style.css`
- Style the mode selector buttons/dropdown.
- Define a `.hidden { display: none !important; }` class to hide filtered accordions.
- Style the transition effects when accordions are hidden or shown.

### 4.2 Application State & Logic
#### [MODIFY] `app.js`
- Extend the global `state` object:
  ```javascript
  state.mode = 'normal'; // 'normal', 'headshot', 'character-sheet'
  state.headshotPanels = 3; // 3 or 6
  ```
- Write a `toggleUIForMode()` function:
  - Invoked when the mode changes.
  - Toggles the `.hidden` class on specific accordion nodes.
  - Updates the active status badges.
- Write compiler overrides inside `updatePromptPreview()` / `compilePrompt()`:
  - If `state.mode === 'headshot'`, force white background, headshot framing, 3/6 variations, and override the templates.
  - If `state.mode === 'character-sheet'`, force white background, front/side/back composition, and override the templates.

---

## 5. Verification & Testing Plan

### 5.1 Manual Verification
1. **Mode Switching**: Toggle between Normal, Headshot, and Character Sheet modes. Verify that the correct accordions disappear/appear instantly.
2. **Headshot Grid Selection**: Select "Headshot Grid" mode, select "6 Variations", and verify the compiled prompt outputs a 6-panel grid on a white background with camera imperfections.
3. **Character Sheet Output**: Select "Character Sheet" mode and verify the compiled prompt outputs a full-body front/side/back view on a white background.
4. **Reference Image Upload**: Confirm the reference image field is visible in Character Sheet mode and integrated into the prompt correctly.
