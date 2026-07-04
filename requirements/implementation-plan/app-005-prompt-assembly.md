# Task app-005: Live Prompt Assembly & Preview Engine

## 1. Goal
Assemble the prompt in real time, apply formatting and ordering rules, display it with color-coded syntax highlights, and enable copying.

## 2. Logic Flow
1.  **Selection Change Trigger**:
    *   Any form change calls `updatePromptPreview()`.
2.  **Assembly Order**:
    *   Read the selected template from the template dropdown (e.g. Portrait, Nightclub) fetched from `prompt-templates.json`.
    *   For the Portrait template: `{subject}, {appearance}, {clothing}, {pose}, {environment}, {lighting}, {camera}, {quality}`
    *   Look up ordering in `prompt-order.json` to arrange attributes within those sections, inserting Image Reference tokens dynamically:
        *   `Subject`: Character gender, age, ethnicity, beauty level.
        *   `Appearance`: Face shape, eyes, eyebrows, nose, lips, smile, expression. *(If Face Match is enabled, append: "facial structure, mouth, nose, eyes, and eyebrows must match the original uploaded file 100% without any distortion" at the end of Appearance)*
        *   `Clothing`: Tops, bottoms, fit, fabric, accessories. *(If Style & Outfit Match is enabled, append: "matching the style, colors, and clothing outfit from the original uploaded image" at the end of Clothing)*
        *   `Pose`: Pose body, head position, eye contact. *(If Pose & Composition Match is enabled, append: "with the identical posing and image composition as the original uploaded file" at the end of Pose)*
        *   `Environment`: Location, props, weather, time of day.
        *   `Lighting`: Key light, neon, ambient, highlights.
        *   `Camera`: Lens, aperture, perspective, composition.
        *   `Quality`: Photorealism, details, atmosphere.
3.  **Aspect Ratio Integration**:
    *   Add the selected aspect ratio at the very end of the generated prompt (e.g., `(aspect ratio 6:8)` or `--ar 6:8` depending on target engine preference) as a postfix modifier.
4.  **Color-Coded Highlights**:
    *   Output the text to an HTML preview box wrapping parts in styled `<span>` tags (e.g. green for Subject, red for Lighting, blue for Camera, gold for Image Reference) to make the structured prompt easy to analyze.
5.  **Copy Action**:
    *   Implement copy button that copies the clean text prompt (without HTML tags).

---

## 3. Proposed Changes

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js) (Part 3 - Prompt Assembly)
*   Implement `generatePromptText(cleanTextOnly)`:
    *   Iterates through the ordering array, gathers active values from state, formats commas, strips duplicate descriptors, and builds the string.
    *   If `cleanTextOnly` is true, returns clean string. Else, wraps tokens in styled HTML `<span>` classes.
*   Implement `updatePromptPreview()`: updates the innerHTML of `#prompt-preview`.
*   Implement `copyPromptToClipboard()`: copies the clean text using `navigator.clipboard.writeText` and displays a "Copied!" tooltip/animation.

---

## 4. Verification
- Make selections across different categories.
- Verify prompt in preview updates in real time.
- Verify the ordering matches the sequence: Subject -> Appearance -> Clothing -> Pose -> Environment -> Lighting -> Camera -> Quality.
- Click "Copy Prompt", paste it into notepad, and verify the text is clean and formatted correctly.
