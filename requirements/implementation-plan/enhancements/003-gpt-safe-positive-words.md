# Task enhancements-003: GPT-Safe Mode & Positive Words Optimization

## 1. Goal
Implement a robust image safety mitigation system ("GPT-Safe Mode") to dramatically reduce the likelihood of generated prompts triggering safety filters (e.g. DALL-E 3 / GPT Image Policy Violations). The system leverages "Positive Words" (e.g., editorial fashion photography, high-fashion editorial, tasteful, elegant) to offset risk ratings of other descriptive tokens, and ensures a clean prompt vocabulary by avoiding risk-trigger words.

---

## 2. Logic Flow & Schema Specifications

### A. Dual Vocabulary Strategy
To prevent prompt rejections, the generator will operate under a dual-word logic when **"GPT-Safe Mode"** is active:
1. **Risk Mitigation (Avoidance)**: Replace descriptive tokens containing risk-trigger keywords (such as `curves`, `body-con`, `cleavage`, `bust`, `hips`) with euphemisms and tasteful descriptions defined in the dataset's `"gpt-image-safe"` fields.
2. **Positive Framing (Mitigation)**: Collect, deduplicate, and append positive framing attributes (defined under `"gpt-image-positive"` in the dataset schema) to the tail end of the prompt. These words serve as positive flags to balance prompt risk assessment.

### B. New Attribute Field Specification
Extend the attribute schema (targets: JSON files under `/attributes/` such as `009-body.json`, `010-clothing.json`, and `011-pose.json`) to support the `"gpt-image-positive"` field:
```json
"prompt": {
  "default": "...",
  "gpt-image": "...",
  "gpt-image-safe": "...",
  "gpt-image-positive": "editorial fashion photography, tasteful styling, elegant tailoring, premium textile craftsmanship, professional portrait photography, refined composition, balanced proportions, cinematic natural lighting, lifestyle portrait, fashion magazine quality"
}
```

### C. Prompt Compilation Flow
When a prompt is assembled:
1. If **GPT-Safe Mode** is **disabled**:
   - Collect and compile selection prompt values using `gpt-image` or `default`.
2. If **GPT-Safe Mode** is **enabled**:
   - For each active selection:
     - Retrieve its primary prompt text from `"gpt-image-safe"`. If not defined, fallback to `"gpt-image"` or `"default"`.
     - Collect any comma-separated positive keywords from the selection's `"gpt-image-positive"` field.
   - **Consolidate Positive Keywords**:
     - Split all collected `"gpt-image-positive"` strings by comma.
     - Trim whitespace, clean empty items, and deduplicate keywords.
     - Join remaining words with a comma.
   - **Append to Prompt**:
     - Append the consolidated positive keywords at the end of the prompt (or inject via template substitution).
     - Style these positive tokens in the live preview using a custom `.token-positive` class (e.g. glowing emerald green or gold).

---

## 3. Proposed Changes

### [MODIFY] [style.css](file:///d:/development/ModelPromptForge/style.css)
* Add style rules for `.token-positive` highlights in the prompt preview box:
  ```css
  .token-positive {
    color: var(--neon-cyan); /* neon cyan/green */
    font-weight: 500;
    text-shadow: 0 0 5px rgba(6, 182, 212, 0.2);
  }
  ```

### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
* **Helper Function (`getPromptValueForSelection`)**: Update to handle retrieving both primary values and compiling positive words.
* **Positive Words Assembly**: Add logic in `generatePromptText` to compile active positive words:
  ```js
  let positiveWordsList = [];
  Object.values(state.selections).forEach(selection => {
    if (selection.isCustom) return;
    const item = state.library.find(libItem => libItem.id === selection.id);
    if (item && item.prompt && item.prompt["gpt-image-positive"]) {
      positiveWordsList.push(...item.prompt["gpt-image-positive"].split(",").map(w => w.trim()));
    }
  });
  // Deduplicate and filter out empty values
  positiveWordsList = [...new Set(positiveWordsList)].filter(w => w !== "");
  ```
* Append the compiled positive string (wrapped in `<span class="token-positive">...</span>` or clean text) right before the aspect ratio postfix in `generatePromptText`.

### [MODIFY] [009-body.json](file:///d:/development/ModelPromptForge/attributes/009-body.json) & Others
* Populate `"gpt-image-safe"` and `"gpt-image-positive"` key-values for body shapes, curves, and clothing fits.
* Map trigger words (e.g., curves, bust) to safe terms (e.g., well-balanced proportions, tailored silhouette).

---

## 4. Verification

### A. Toggle Action
1. Toggle "GPT-Safe Mode" checkbox to **checked**.
2. Verify that selected body, pose, and clothing options instantly swap their prompt texts to safe descriptions (wording changes in the Live Preview and Accordion summary badges).
3. Verify that positive framing keywords (e.g. `editorial fashion photography`, `tasteful styling`) are appended to the end of the prompt and highlighted in neon cyan.

### B. Custom Selection Check
1. Choose "Curvy figure" under Body -> verify the compiled prompt ends with the custom positive styling string.
2. Toggle "GPT-Safe Mode" back to **unchecked** -> verify the positive words disappear, and standard descriptions return.
