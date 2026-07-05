# Task enhancements-002: Dynamic Retro 8-Bit Preview Canvas

## 1. Goal
Implement a dynamic, client-side 8-bit/pixel-art preview panel using HTML5 Canvas. The canvas will render a retro-style preview of the character and environment that updates in real-time as the user selects different attributes (such as skin tone, hair color, clothing style, and environment background). This provides a fun, instant visual cue without requiring external image generation APIs.

---

## 2. Logic Flow & Rendering Specifications

### A. Dynamic Drawing Engine (HTML5 Canvas)
* **Canvas Details**: A `<canvas>` element with resolution `256x256` pixels, styled with CSS to upscale cleanly using `image-rendering: pixelated`.
* **State Syncing**: The canvas render loop is triggered on every selection change (synchronized with `updatePromptPreview()`).
* **Layer-by-Layer Render Order**:
  1. **Background (Environment/Lighting/Weather)**: Drawn as a solid pixel-art backdrop or a color gradient.
  2. **Body Outline & Skin**: A basic pixel-art humanoid body silhouette filled with the selected skin tone hex color.
  3. **Clothing (Tops/Bottoms/Dresses)**: Pixel blocks representing shirts, skirts, or dresses drawn in colors that match selection themes.
  4. **Hair (Style/Bangs/Color)**: A pixel layer for hair and bangs matching the selected style shape and color.
  5. **Face Features (Eyes/Lips)**: Small pixel groupings for eyes and lips, changing expressions or colors contextually.
  6. **Overlay**: Optional CRT scanline effect overlay for retro game console aesthetics.

### B. Mapping Selections to Pixel Art Attributes
* **Skin Tone Mapping**:
  * `"rosy fair skin"` -> `#ffdfd5`
  * `"milky white skin"` -> `#fff5eb`
  * `"translucent glass skin"` -> `#fff9f2` with a subtle white specular shine pixel.
* **Hair Color Mapping**:
  * `"reddish-orange hair color"` -> `#f97316` (neon orange)
  * `"black hair"` / `"dark hair"` -> `#18181b`
  * `"brown hair"` -> `#78350f`
* **Environment Mapping**:
  * `"tropical beach"` -> Sand yellow at the bottom (`#fef08a`), sea blue middle (`#06b6d4`), sky blue top (`#bae6fd`).
  * `"crowded nightclub / bar"` -> Deep purple background (`#1e1b4b`) with glowing neon pink (`#ec4899`) and cyan (`#06b6d4`) circle light blobs.
  * `"cozy library"` -> Brownish wooden background patterns (`#451a03` and `#78350f`).
  * `"cyberpunk neon streets"` -> Dark grid city skyline (`#09090b`) with bright neon vertical lines (`#ec4899`, `#06b6d4`).
  * `"sunset"` / `"golden hour"` -> Smooth orange-red-yellow pixel gradient background.

---

## 3. Proposed Changes

### [MODIFY] [index.html](file:///d:/development/ModelPromptForge/index.html)
* Insert the `<canvas>` element in the Right Panel (sticky sidebar), directly above the **Live Prompt Preview** section:
  ```html
  <!-- Dynamic 8-Bit Preview Canvas -->
  <div class="control-section preview-canvas-section">
    <h3>Live 8-Bit Preview</h3>
    <div class="canvas-wrapper">
      <canvas id="preview-canvas" width="256" height="256"></canvas>
      <div class="crt-scanlines"></div>
    </div>
  </div>
  ```

### [MODIFY] [style.css](file:///d:/development/ModelPromptForge/style.css)
* Add styling for the canvas container, upscale styling, and the optional retro CRT overlay:
  ```css
  .preview-canvas-section {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .canvas-wrapper {
    position: relative;
    width: 256px;
    height: 256px;
    background: #000;
    border: 3px solid var(--border-active);
    border-radius: 8px;
    box-shadow: var(--glow-purple);
    overflow: hidden;
  }
  
  #preview-canvas {
    width: 100%;
    height: 100%;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  
  /* CRT Scanlines Overlay */
  .crt-scanlines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size: 100% 4px, 6px 100%;
    pointer-events: none;
    z-index: 10;
  }
  ```

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
* Implement the core drawing function `drawPixelPreview()` and call it at the end of `updatePromptPreview()`:
  * **Default State**: Draw a basic avatar with grey hair/clothes on a default dark background.
  * **Skin Tone Selector**: Match selection to hex color, then draw the head/neck pixels.
  * **Hair Style & Color Selector**: Use pixel templates for hair silhouettes (e.g., long, short, waves) and fill with the selected color.
  * **Clothing Selector**: Render pixel top/skirt patterns.
  * **Environment Selector**: Clear canvas and draw matching backgrounds (beach, library, bar).

---

## 4. Verification

### A. Initial Load Verification
1. Load the page in the browser and verify that the canvas is initialized with scanlines, displaying a default pixel mannequin character.

### B. Selection Reactive Changes
1. Change **Skin Tone** to "Milky White Skin" -> verify the character's pixel skin turns to light cream.
2. Change **Hair Color** to "Reddish-orange" -> verify the character's hair changes to orange.
3. Change **Location** to "Scenic Tropical Beach" -> verify the background redrawn with sandy yellow beach and sky blue pixels.
4. Verify the canvas updates instantly and smoothly without lagging.
