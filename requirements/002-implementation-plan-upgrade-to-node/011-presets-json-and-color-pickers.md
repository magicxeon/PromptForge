# Step 11: Presets Externalization, Hair Textures & Interactive Color Pickers

## 1. Goal Description
The objective of this step is to clean up code maintainability by externalizing static data (presets) from the application script into JSON files, correcting attribute categorization (hair vs skin texture), and enhancing the configurator with interactive color pickers for hair color (highlights) and clothing components (tops, bottoms, dresses, shoes).

---

## 2. Requirement Specifications

### Part 2.1: Preset & Config Data Externalization
1. **Move Presets to Server-side JSON**:
   - Extract the `PRESETS` constant object (lines 129-385 in [**client/app.js**](file:///d:/development/ModelPromptForge/client/app.js)) into a new file: [**attributes/spec/presets.json**](file:///d:/development/ModelPromptForge/attributes/spec/presets.json).
2. **Include in Server Bundle**:
   - Update the backend cache warming and endpoint `/api/attributes/bundle` in [**server/server.js**](file:///d:/development/ModelPromptForge/server/server.js) to read `presets.json` and append it to the aggregated bundle:
     ```json
     {
       "schema": [...],
       "templates": {...},
       "order": [...],
       "library": [...],
       "presets": {...}
     }
     ```
3. **Frontend Integration**:
   - Bind `state.presets = bundle.presets;` on page initialization.
   - Update the preset selection dropdown mapping and `randomizePresetSelections` to read from `state.presets` instead of hardcoded code variables.

### Part 2.2: Hair Texture Correction
1. **Fix Classification mapping**:
   - Ensure hair texture options represent actual hair qualities (e.g., "silky smooth", "coarse", "frizzy", "dry", "glossy", "velvety") instead of inheriting skin texture descriptions.
   - Relabel and update the specifications in [**attributes/008-hair.json**](file:///d:/development/ModelPromptForge/attributes/008-hair.json) and [**client/app.js**](file:///d:/development/ModelPromptForge/client/app.js) to map "Texture" under the Hair category correctly.

### Part 2.3: Custom Hair Color & Highlight Color Picker
1. **Trigger Condition**:
   - When the user selects a hairstyle color or highlights, display a native HTML color picker input (`<input type="color" class="custom-color-picker">`) dynamically next to the select input.
2. **Highlight Support**:
   - If the hair style includes highlights, allow picking both the base color and the highlight accent color.
3. **Prompt Compilation**:
   - If custom color codes are selected (e.g. `#ff00a0`), compile them into the final prompt with a readable representation: e.g. `"with custom highlighted hair (magenta `#ff00a0`)"`.

### Part 2.4: Optional Clothing Color Pickers
1. **Optional Picker Row**:
   - Add an optional color picker toggle/input adjacent to clothing selects:
     - Top (เสื้อ)
     - Bottom (กางเกง/กระโปรง)
     - Dress (ชุดเดรส)
     - Shoes (รองเท้า)
2. **Behavior**:
   - By default, color selection is disabled (uses the library preset style description).
   - Toggling the picker allows the user to pin a specific hex color to that clothing item.
3. **Prompt Compilation**:
   - If a color is active, append it to the clothing segment in prompt generation: e.g. `"wearing a velvet top colored in deep blue (#0044ff)"`.
