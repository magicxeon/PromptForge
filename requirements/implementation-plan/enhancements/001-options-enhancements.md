# Task enhancements-001: ModelPromptForge UI & Database Enhancements

## 1. Goal
Add a set of premium, high-demand features and attribute options to the ModelPromptForge generator to expand styling flexibility while maintaining control over prompt structures. This includes a content-safety toggle for adult/sensual options (NSFW), a richer selection of natural lighting environments, comfortable casual wear options, and trending photography settings.

---

## 2. Logic Flow & Attribute Specifications

### A. NSFW Toggle & Dropdown Option
* **UI Control**: Add a checkbox / toggle switch in the right-hand panel titled **"Enable NSFW Options"**.
* **Accordion Group**: Add a new accordion group named **"NSFW"** in the dynamic attribute generator (left panel) containing:
  * **Nudity Level**: Levels of dress/nudity.
  * **Sensual Pose**: Specifying alluring/suggestive poses.
* **Visibility Handling**:
  * The "NSFW" accordion group is hidden by default (`display: none` in CSS).
  * Checking "Enable NSFW Options" transitions the NSFW accordion group to visible.
  * Unchecking "Enable NSFW Options" hides the accordion group, resets any selected values inside the NSFW dropdowns, clears them from the global state, and triggers prompt compilation.
* **Token Styling**: Render selected NSFW options in the prompt preview using a custom `.token-nsfw` color class (soft rose tint, `#fb7185`).

### B. Natural Lighting (Target: `013-lighting.json`)
Add various realistic natural lighting choices to simulate authentic photography environments:
* **Dappled Leaf Shadows**: Light filtering through trees (`"dappled sunlight filtering through tree leaves, creating intricate soft shadows and highlights on the subject"`).
* **Overcast Diffused Day**: Soft flat daylight (`"soft diffused overcast natural daylight, eliminating harsh shadows for a clean skin complexion"`).
* **Sunrise Warm Glow**: Gentle early morning sun (`"warm morning sunrise light casting long gentle shadows and a soft pinkish-golden glow"`).
* **Sunset Golden Rays**: Deep golden hour rays (`"dramatic low-angle sunset rays piercing through the background with brilliant golden highlights"`).
* **Blue Hour Twilight**: Cool atmospheric evening twilight (`"cool moody blue hour twilight atmosphere with deep cobalt sky tones"`).
* **Silver Moonlight**: Romantic night moonlight (`"soft silver moonlight casting cool pale highlights and mystical shadows"`).
* **Harsh Midday Sun**: High contrast sunlight (`"direct harsh afternoon sun casting sharp contrast highlights and dark defined shadows"`).

### C. Casual & Comfortable Clothing (Target: `010-clothing.json`)
Add everyday relaxed attire options under corresponding clothing subcategories:
* **Oversized Cotton Hoodie** (Subcategory: `Top`): `"cozy oversized soft cotton hoodie, loose-fitting style with soft folds"`.
* **Loose Linen Shirt** (Subcategory: `Top`): `"relaxed loose-fit breathable linen shirt with rolled-up sleeves"`.
* **Comfortable Crewneck T-Shirt** (Subcategory: `Top`): `"plain casual organic cotton crewneck t-shirt in soft neutral tones"`.
* **Casual Denim Shorts** (Subcategory: `Bottom`): `"comfy high-waisted frayed denim shorts"`.
* **Wide-Leg Lounge Pants** (Subcategory: `Bottom`): `"flowy wide-leg lounge pants made of soft modal fabric"`.
* **High-Waist Joggers** (Subcategory: `Bottom`): `"casual comfy fleece jogger pants with elastic cuffs"`.
* **Loose Sundress** (Subcategory: `Dress`): `"flowy casual cotton sundress with a simple line silhouette"`.
* **Loose Knit Sweater Dress** (Subcategory: `Dress`): `"cozy oversized cable-knit sweater dress in cream white"`.
* **Running Sneakers** (Subcategory: `Shoes`): `"comfortable athletic running sneakers with thick soft soles"`.
* **Canvas Slip-Ons** (Subcategory: `Shoes`): `"casual classic canvas slip-on shoes"`.

### D. Popular & Trending Environments (Target: `012-environment.json`)
Add popular background environments matching popular portrait photography themes:
* **Tropical Beach** (Subcategory: `Location`): `"on a scenic tropical beach with fine white sand and crystal clear turquoise ocean water"`
* **Minimalist Fitness Gym** (Subcategory: `Location`): `"inside a modern minimalist fitness gym with clean metallic equipment and bright LED panel lighting"`
* **Cozy Library** (Subcategory: `Location`): `"in a quiet cozy library surrounded by towering dark wood bookshelves packed with vintage books"`
* **Ornate Traditional Temple** (Subcategory: `Location`): `"within the peaceful grounds of an ornate traditional temple, featuring detailed gold and red architecture"`
* **Luxury Fashion Boutique** (Subcategory: `Location`): `"inside a high-end luxury fashion boutique with warm spotlighting and minimalist designer clothing displays"`
* **Bustling Japanese Arcade** (Subcategory: `Location`): `"in a vibrant bustling Japanese game center and arcade, filled with glowing screens and colorful neon signs"`
* **Botanical Greenhouse** (Subcategory: `Location`): `"inside a lush botanical garden greenhouse with sunbeams passing through glass panels and tropical green plants"`
* **Rooftop Infinity Pool** (Subcategory: `Location`): `"at a luxury rooftop infinity pool side overlooking a glowing modern city skyline in the background"`

### E. Conflict Prevention & Mutual Exclusions
To ensure prompt coherence, prevent illogical background/theme conflicts (e.g., selecting both "Bustling Japanese Arcade" and "Traditional Thai architecture" simultaneously):
* **Data-driven Exclusions**: Introduce an optional `"exclusions"` array of string IDs on option items in JSON files (e.g. `012-environment.json`).
* **Example Rule**:
  * Option `"environment.pop_06"` (Bustling Japanese Arcade) has `"exclusions": ["environment.008"]`.
  * Option `"environment.008"` (Traditional Thai architecture) has `"exclusions": ["environment.pop_06"]`.
* **Execution Logic**:
  * In the dropdown change listener in `app.js`, after a user selects an option:
    1. Check if the newly selected option contains an `"exclusions"` array.
    2. Loop through all excluded IDs and check if they are currently active in `state.selections`.
    3. If an excluded ID is active, dynamically clear its selection from `state.selections`, reset its dropdown `<select>` element to the default empty value, hide its custom input field, and refresh its group's summary badge.
    4. Recompile the live prompt preview.

---

## 3. Proposed Changes

### [MODIFY] [index.html](file:///d:/development/ModelPromptForge/index.html)
* Add the **"NSFW Options"** toggle switch checkbox in the **Right Panel** (sticky sidebar) inside a new `control-section` card:
  ```html
  <!-- Content Settings -->
  <div class="control-section">
    <h3>Content Settings</h3>
    <div class="checkbox-group">
      <label class="checkbox-container">
        <input type="checkbox" id="toggle-nsfw">
        <span class="checkmark"></span>
        <span class="label-text">Enable NSFW Options</span>
      </label>
    </div>
  </div>
  ```

### [MODIFY] [style.css](file:///d:/development/ModelPromptForge/style.css)
* Add a style rule for `.token-nsfw` to render in a soft rose color in the prompt preview:
  ```css
  .token-nsfw {
    color: #fb7185; /* soft rose */
    font-weight: 500;
  }
  ```
* Ensure smooth accordion transition for the new NSFW accordion. Add `accordion-nsfw` display rules:
  ```css
  #accordion-nsfw {
    display: none; /* hidden by default */
  }
  ```

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
* **Import list**: Add `'016-nsfw.json'` to the `ATTRIBUTE_FILES` array.
* **Fields mapping**: Add NSFW fields to the `FIELD_TO_CATEGORY_MAP`:
  ```js
  "Nudity Level": "nsfw",
  "Sensual Pose": "nsfw",
  ```
* **Event Handlers**: Bind events for `#toggle-nsfw`. When changed, toggle the display of `#accordion-nsfw` and, if disabled, clear the selections for "Nudity Level" and "Sensual Pose" from `state.selections`.
* **Prompt Assembly**: Update `generatePromptText` to handle the `NSFW` segment, wrapping in `.token-nsfw` and appending/substituting appropriately into the template.
* **Presets**: Add a new preset utilizing the casual clothes, natural lighting, and beach environment:
  ```js
  beachCasual: {
    template: "portrait",
    aspectRatio: "16:9",
    imageReferences: { faceMatch: false, styleMatch: false, poseMatch: false },
    selections: {
      "Gender": { id: "character.001", value: "female", isCustom: false },
      "Age": { id: "character.004", value: "young adult", isCustom: false },
      "Ethnicity": { id: "character.007", value: "thai", isCustom: false },
      "Top": { id: "clothing.casual_01", value: "relaxed loose-fit breathable linen shirt with rolled-up sleeves", isCustom: false },
      "Bottom": { id: "clothing.casual_04", value: "comfy high-waisted frayed denim shorts", isCustom: false },
      "Location": { id: "environment.pop_01", value: "on a scenic tropical beach with fine white sand and crystal clear turquoise ocean water", isCustom: false },
      "Key Light": { id: "lighting.nat_04", value: "dramatic low-angle sunset rays piercing through the background with brilliant golden highlights", isCustom: false }
    }
  }
  ```
* Render the new preset chip in `#presets-group` in `index.html`.

### [MODIFY] [ui-schema.json](file:///d:/development/ModelPromptForge/attributes/spec/ui-schema.json)
* Add a new accordion group block for NSFW:
  ```json
  {
    "group": "NSFW",
    "layout": "accordion",
    "fields": [
      {
        "name": "Nudity Level",
        "control": "select"
      },
      {
        "name": "Sensual Pose",
        "control": "select"
      }
    ]
  }
  ```

### [MODIFY] [prompt-templates.json](file:///d:/development/ModelPromptForge/attributes/spec/prompt-templates.json)
* Incorporate the `{nsfw}` tag into all active templates (e.g. `"{subject}, {appearance}, {clothing}, {nsfw}, {pose}, {environment}, {lighting}, {camera}, {quality}"`).

### [MODIFY] [prompt-order.json](file:///d:/development/ModelPromptForge/attributes/spec/prompt-order.json)
* Insert `"nsfw"` into the prompt assembly order array (e.g. right after `"clothing_fit"` or `"bottoms"`):
  ```json
  "order": [
    ...
    "bottoms",
    "nsfw",
    "pose_body",
    ...
  ]
  ```

### [NEW] [016-nsfw.json](file:///d:/development/ModelPromptForge/attributes/016-nsfw.json)
* Create this attribute file containing options for "Nudity Level" and "Sensual Pose", such as:
  * Implied nudity, semi-nude, bikini, lingerie, topless, and full nudity (under category `"nsfw"`, subcategories `"Nudity Level"` and `"Sensual Pose"`).

### [MODIFY] [013-lighting.json](file:///d:/development/ModelPromptForge/attributes/013-lighting.json)
* Append the new natural lighting options described in Section 2-B.

### [MODIFY] [010-clothing.json](file:///d:/development/ModelPromptForge/attributes/010-clothing.json)
* Append the casual and comfortable tops, bottoms, dresses, and shoes described in Section 2-C.

### [MODIFY] [012-environment.json](file:///d:/development/ModelPromptForge/attributes/012-environment.json)
* Append the popular environment locations described in Section 2-D.

---

## 4. Verification

### A. NSFW Toggle & Visibility
1. Open the page and verify that the "NSFW" accordion group **is not visible** in the left panel.
2. Toggle "Enable NSFW Options" to **checked** -> verify that the "NSFW" accordion appears at the bottom of the left column.
3. Select an option under "Nudity Level" (e.g. "Sensual Lingerie") -> verify that it compiles into the live preview highlighted in **rose pink** color.
4. Toggle "Enable NSFW Options" back to **unchecked** -> verify that the "NSFW" accordion disappears, and the rose pink NSFW token is instantly removed from the prompt preview.

### B. Natural Lighting
1. Open the "Lighting" accordion.
2. Click the Key Light / Fill Light / Back Light / Ambient dropdowns.
3. Verify that the new natural light options (e.g. "Dappled Leaf Shadows", "Blue Hour Twilight") are visible, selectable, and compile correctly.

### C. Casual Clothing
1. Open the "Clothing" accordion.
2. Click the Top / Bottom / Dress / Shoes dropdowns.
3. Verify that casual options (e.g., "Oversized Cotton Hoodie", "Casual Denim Shorts") are listed, selectable, and compile correctly.

### D. Popular Environments
1. Open the "Environment" accordion.
2. Click the Location dropdown.
3. Verify that trending locations (e.g., "Tropical Beach", "Bustling Japanese Arcade", "Rooftop Infinity Pool") are listed, selectable, and compile correctly.
