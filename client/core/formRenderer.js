/**
 * ModelPromptForge - Form & UI Renderer Module
 */
(() => {
  const state = window.state;
  const getLocalizedLabel = window.getLocalizedLabel;

  function shouldRenderGroup(groupName) {
    return groupName.toLowerCase() !== "nsfw";
  }

  function shouldRenderField(groupName, fieldName) {
    if (state.mode === "character-sheet" && groupName === "Clothing") {
      return !window.CHARACTER_SHEET_HIDDEN_FIELDS?.has(fieldName);
    }
    return true;
  }

  function renderForm() {
    const container = document.getElementById("form-container");
    container.innerHTML = "";

    state.schema.forEach((groupObj, groupIdx) => {
      const groupName = groupObj.group;
      if (!shouldRenderGroup(groupName)) return;

      const accordion = document.createElement("div");
      accordion.className = "accordion";
      accordion.id = `accordion-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
      accordion.dataset.groupName = groupName;
      if (groupIdx === 0) accordion.classList.add("active");

      const header = document.createElement("div");
      header.className = "accordion-header";

      const titleArea = document.createElement("div");
      titleArea.className = "accordion-title";
      titleArea.innerHTML = `<span>${groupName}</span>`;

      const badge = document.createElement("span");
      badge.className = "accordion-badge";
      badge.style.display = "none";
      badge.id = `badge-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
      titleArea.appendChild(badge);

      const arrow = document.createElement("span");
      arrow.className = "accordion-arrow";
      arrow.textContent = "▼";

      header.appendChild(titleArea);
      header.appendChild(arrow);
      accordion.appendChild(header);

      const content = document.createElement("div");
      content.className = "accordion-content";

      const inner = document.createElement("div");
      inner.className = "accordion-inner";

      if (groupName === "Clothing") {
        inner.appendChild(createOutfitReferenceUploadControl());
      }

      groupObj.fields
        .filter(field => shouldRenderField(groupName, field.name))
        .forEach(field => {
        const fieldDiv = document.createElement("div");
        fieldDiv.className = "form-field";

        const label = document.createElement("label");
        label.textContent = field.name;
        fieldDiv.appendChild(label);

        const inputRow = document.createElement("div");
        inputRow.className = "field-input-row";

        const selectWrapper = document.createElement("div");
        selectWrapper.className = "select-wrapper";

        const select = document.createElement("select");
        select.className = "custom-select";
        select.id = `select-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
        select.setAttribute("data-field", field.name);
        select.setAttribute("data-group", groupName);

        const category = getCategoryForField(groupName, field.name);
        const filteredOptions = getOptionsForField(field.name, category, state.library, groupName);

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = `-- Select ${field.name} --`;
        select.appendChild(defaultOpt);

        filteredOptions.forEach(opt => {
          if (opt.enabled === false) return;
          const optionNode = document.createElement("option");
          optionNode.value = opt.id;

          const resolvedLabel = getLocalizedLabel(opt.label);
          optionNode.setAttribute("data-prompt", opt.prompt ? (opt.prompt["gpt-image"] || opt.prompt.default) : resolvedLabel);
          optionNode.textContent = resolvedLabel;

          optionNode.setAttribute("data-original-text", optionNode.textContent);
          optionNode.setAttribute("data-description", getLocalizedLabel(opt.description));
          select.appendChild(optionNode);
        });

        const customOpt = document.createElement("option");
        customOpt.value = "__custom__";
        customOpt.textContent = "Custom (Write-in)...";
        select.appendChild(customOpt);

        selectWrapper.appendChild(select);

        const lockLabel = document.createElement("label");
        lockLabel.className = "lock-checkbox-btn";
        lockLabel.title = "Lock attribute on Randomize";

        const lockInput = document.createElement("input");
        lockInput.type = "checkbox";
        lockInput.className = "lock-input";
        lockInput.setAttribute("data-field", field.name);
        lockInput.addEventListener("change", (e) => {
          if (e.target.checked) {
            state.lockedFields.add(field.name);
            fieldDiv.classList.add("is-locked");
          } else {
            state.lockedFields.delete(field.name);
            fieldDiv.classList.remove("is-locked");
          }
        });

        const lockIcon = document.createElement("span");
        lockIcon.className = "lock-icon";
        lockIcon.textContent = "🔓";

        lockLabel.appendChild(lockInput);
        lockLabel.appendChild(lockIcon);

        inputRow.appendChild(selectWrapper);
        inputRow.appendChild(lockLabel);
        fieldDiv.appendChild(inputRow);

        const customInput = document.createElement("input");
        customInput.type = "text";
        customInput.className = "custom-writein-input";
        customInput.placeholder = `Type custom ${field.name.toLowerCase()} here...`;
        customInput.style.display = "none";
        customInput.id = `custom-input-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;
        fieldDiv.appendChild(customInput);

        const modularClothingColorFields = ["Primary Color", "Secondary Color"];
        const isModularClothingColorField = groupName === "Clothing" && modularClothingColorFields.includes(field.name);
        if (isModularClothingColorField) {
          const fallbackColor = field.name === "Primary Color" ? "#111827" : "#e5e7eb";
          state.customColors[field.name] = {
            enabled: false,
            color: fallbackColor,
            ...(state.customColors[field.name] || {})
          };
          if (state.selections[field.name]?.id?.startsWith("outfit.color.")) {
            delete state.selections[field.name];
          }
          fieldDiv.classList.add("has-custom-color-picker-only");
          selectWrapper.style.display = "none";
          lockLabel.style.display = "none";
        }

        const fieldHelp = document.createElement("small");
        fieldHelp.className = "field-option-help";
        fieldHelp.setAttribute("aria-live", "polite");
        fieldDiv.appendChild(fieldHelp);

        const visualPicker = createVisualOptionPicker(groupName, field.name, select, filteredOptions);
        if (visualPicker) {
          fieldDiv.classList.add("has-visual-options");
          selectWrapper.classList.add("visual-option-select-fallback");
          fieldDiv.appendChild(visualPicker);
        }

        // Render color pickers for specified fields (Step 11)
        const colorPickerFields = ["Color", "Top", "Bottom", "Dress", "Shoes", "Product Type", "Primary Color", "Secondary Color"];
        if (colorPickerFields.includes(field.name) && (field.name !== "Color" || groupName === "Hair")) {
          const pickerRow = document.createElement("div");
          pickerRow.className = "custom-color-picker-row";
          pickerRow.id = `color-picker-row-${groupName.toLowerCase()}-${field.name.toLowerCase().replace(/\s+/g, "-")}`;

          if (field.name === "Color" && groupName === "Hair") {
            // Base Hair Color Picker Container
            const baseContainer = document.createElement("div");
            baseContainer.className = "custom-color-picker-container";

            const baseToggle = document.createElement("input");
            baseToggle.type = "checkbox";
            baseToggle.id = `hair-base-toggle`;
            baseToggle.checked = state.customColors["Color"].enabled;

            const baseLabel = document.createElement("label");
            baseLabel.htmlFor = `hair-base-toggle`;
            baseLabel.textContent = "🎨 Custom Base:";

            const baseInput = document.createElement("input");
            baseInput.type = "color";
            baseInput.id = `hair-base-input`;
            baseInput.value = state.customColors["Color"].base;
            baseInput.disabled = !baseToggle.checked;

            baseToggle.addEventListener("change", (e) => {
              state.customColors["Color"].enabled = e.target.checked;
              baseInput.disabled = !e.target.checked;
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            baseInput.addEventListener("input", (e) => {
              state.customColors["Color"].base = e.target.value;
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            baseContainer.appendChild(baseToggle);
            baseContainer.appendChild(baseLabel);
            baseContainer.appendChild(baseInput);
            pickerRow.appendChild(baseContainer);

            // Highlight Hair Color Picker Container
            const highlightContainer = document.createElement("div");
            highlightContainer.className = "custom-color-picker-container";
            highlightContainer.style.marginLeft = "1rem";

            const highlightToggle = document.createElement("input");
            highlightToggle.type = "checkbox";
            highlightToggle.id = `hair-highlight-toggle`;
            highlightToggle.checked = state.customColors["Color"].highlightEnabled;

            const highlightLabel = document.createElement("label");
            highlightLabel.htmlFor = `hair-highlight-toggle`;
            highlightLabel.textContent = "✨ Highlight Accent:";

            const highlightInput = document.createElement("input");
            highlightInput.type = "color";
            highlightInput.id = `hair-highlight-input`;
            highlightInput.value = state.customColors["Color"].highlight;
            highlightInput.disabled = !highlightToggle.checked;

            highlightToggle.addEventListener("change", (e) => {
              state.customColors["Color"].highlightEnabled = e.target.checked;
              highlightInput.disabled = !e.target.checked;
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            highlightInput.addEventListener("input", (e) => {
              state.customColors["Color"].highlight = e.target.value;
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            highlightContainer.appendChild(highlightToggle);
            highlightContainer.appendChild(highlightLabel);
            highlightContainer.appendChild(highlightInput);
            pickerRow.appendChild(highlightContainer);
          } else {
            // Clothing Color Picker
            const clothingContainer = document.createElement("div");
            clothingContainer.className = "custom-color-picker-container";

            const clothingToggle = document.createElement("input");
            clothingToggle.type = "checkbox";
            const clothingFieldSlug = field.name.toLowerCase().replace(/\s+/g, "-");
            clothingToggle.id = `clothing-toggle-${clothingFieldSlug}`;
            clothingToggle.checked = state.customColors[field.name].enabled;

            const clothingLabel = document.createElement("label");
            clothingLabel.htmlFor = `clothing-toggle-${clothingFieldSlug}`;
            clothingLabel.textContent = `🎨 Custom ${field.name} Color:`;

            const clothingInput = document.createElement("input");
            clothingInput.type = "color";
            clothingInput.id = `clothing-input-${clothingFieldSlug}`;
            clothingInput.value = state.customColors[field.name].color;
            clothingInput.disabled = isModularClothingColorField ? false : !clothingToggle.checked;

            clothingToggle.addEventListener("change", (e) => {
              state.customColors[field.name].enabled = e.target.checked;
              clothingInput.disabled = isModularClothingColorField ? false : !e.target.checked;
              if (isModularClothingColorField && state.selections[field.name]) delete state.selections[field.name];
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            clothingInput.addEventListener("input", (e) => {
              if (isModularClothingColorField) {
                state.customColors[field.name].enabled = true;
                clothingToggle.checked = true;
                if (state.selections[field.name]) delete state.selections[field.name];
              }
              state.customColors[field.name].color = e.target.value;
              if (window.updatePromptPreview) window.updatePromptPreview();
            });

            clothingContainer.appendChild(clothingToggle);
            clothingContainer.appendChild(clothingLabel);
            clothingContainer.appendChild(clothingInput);
            pickerRow.appendChild(clothingContainer);
          }

          fieldDiv.appendChild(pickerRow);
        }

        inner.appendChild(fieldDiv);
      });

      if (groupName === "Character") {
        const authorityPanel = document.createElement("div");
        authorityPanel.id = "character-reference-authority";
        authorityPanel.className = "reference-authority-panel";
        authorityPanel.innerHTML = `
          <strong id="character-reference-authority-title">Character Reference Authority</strong>
          <span id="character-reference-authority-summary">Character attributes are active because no Story Character Reference is selected.</span>
          <label class="reference-override-control">
            <input type="checkbox" id="character-reference-override">
            <span id="character-reference-override-label">Enable advanced character overrides</span>
          </label>
        `;
        inner.appendChild(authorityPanel);
      }

      content.appendChild(inner);
      accordion.appendChild(content);
      container.appendChild(accordion);
    });
  }

  function createOutfitReferenceUploadControl() {
    const panel = document.createElement("div");
    panel.id = "outfit-reference-upload-container";
    panel.className = "mode-sub-control outfit-reference-control";
    panel.style.display = state.mode === "character-sheet" ? "block" : "none";
    panel.innerHTML = `
      <div class="outfit-reference-heading">
        <div>
          <span class="control-label">Outfit Reference</span>
          <p class="sub-label">Front is the main garment reference. Back is optional.</p>
        </div>
        <button id="btn-clear-outfit-reference" class="outfit-reference-clear-all" type="button">Clear all</button>
      </div>
      <div class="outfit-reference-dropzones" id="outfit-ref-slots-dock">
        ${createOutfitReferenceSlotMarkup("front", "Front - Main", "Required when using an outfit reference")}
        ${createOutfitReferenceSlotMarkup("back", "Back - Optional", "Adds construction and rear garment details")}
      </div>
      <p id="outfit-reference-status" class="outfit-reference-status" aria-live="polite"></p>
      <fieldset id="outfit-reference-overrides" class="outfit-reference-overrides" hidden>
        <label class="outfit-reference-customize-toggle">
          <input type="checkbox" id="outfit-reference-customize-toggle">
          <span>Customize uploaded outfit</span>
        </label>
        <div class="outfit-reference-override-grid">
          <label><input type="checkbox" data-outfit-override="primaryColor"> Primary color</label>
          <label><input type="checkbox" data-outfit-override="secondaryColor"> Secondary color</label>
          <label><input type="checkbox" data-outfit-override="pattern"> Pattern</label>
          <label title="Changing material may alter drape and silhouette"><input type="checkbox" data-outfit-override="material"> Material (advanced)</label>
        </div>
      </fieldset>
    `;
    return panel;
  }

  function createOutfitReferenceSlotMarkup(slot, title, description) {
    const capitalized = slot === "front" ? "Front" : "Back";
    return `
      <div class="outfit-reference-dropzone" data-outfit-dropzone="${slot}" tabindex="0" role="button" aria-label="Upload ${slot} outfit reference">
        <input type="file" id="outfit-${slot}-file" accept="image/png,image/jpeg,image/webp" hidden>
        <div class="outfit-reference-empty">
          <span class="outfit-upload-icon" aria-hidden="true">&#8593;</span>
          <strong>${title}</strong>
          <span>${description}</span>
          <span class="outfit-browse-label">Browse image</span>
        </div>
        <div class="ref-slot-card outfit-reference-preview" id="outfit-${slot}-card">
          <img id="outfit-${slot}-img" src="" alt="${capitalized} outfit reference">
          <div class="outfit-reference-slot-actions">
            <button type="button" data-outfit-replace="${slot}" title="Replace ${slot} reference" aria-label="Replace ${slot} outfit reference">Replace</button>
            <button type="button" class="btn-clear-slot" data-slot="outfit${capitalized}" title="Remove ${slot} reference" aria-label="Remove ${slot} outfit reference">&times;</button>
          </div>
        </div>
      </div>`;
  }

  function getSelectedHairPresentation() {
    const selectedGenderId = state.selections?.Gender?.id;
    return window.GENDER_TO_HAIR_PRESENTATION[selectedGenderId] || "neutral";
  }

  function filterHairCutStyleByPresentation(options) {
    const presentation = getSelectedHairPresentation();
    if (presentation === "neutral") return options;

    const allowedIds = window.HAIR_CUT_STYLE_PRESENTATION_OPTIONS[presentation];
    if (!allowedIds) return options;

    return options.filter(opt => allowedIds.has(opt.id));
  }

  function getSelectedBodySilhouettePresentation() {
    const selection = state.selections?.Gender;
    const value = `${selection?.id || ""} ${selection?.value || ""}`.toLowerCase();
    if (value.includes("female") || value.includes("woman")) return "female";
    if (value.includes("male") || value.includes("man")) return "male";
    return "neutral";
  }

  function filterBodySilhouetteByPresentation(options) {
    const presentation = getSelectedBodySilhouettePresentation();
    if (presentation === "female") {
      return options.filter(opt => (opt.tags || []).includes("female-body-silhouette"));
    }
    if (presentation === "male") {
      return options.filter(opt => (opt.tags || []).includes("male-body-silhouette"));
    }
    const genericIds = new Set(["body.001", "body.002", "body.005", "body.006", "body.011", "body.012"]);
    return options.filter(opt => genericIds.has(opt.id));
  }

  function clearInvalidBodySilhouetteSelection() {
    const options = getOptionsForField("Body Silhouette", "body", state.library, "Body");
    const allowedIds = new Set(options.map(option => option.id));
    const currentSelection = state.selections["Body Silhouette"];
    if (currentSelection && !currentSelection.isCustom && !allowedIds.has(currentSelection.id)) {
      delete state.selections["Body Silhouette"];
      const select = document.querySelector(`.custom-select[data-field="Body Silhouette"]`);
      if (select) select.value = "";
    }
  }

  function getSelectedOutfitBasePresentation() {
    const selection = state.selections?.Gender;
    const value = `${selection?.id || ""} ${selection?.value || ""}`.toLowerCase();
    if (value.includes("female") || value.includes("woman")) return "female";
    if (value.includes("male") || value.includes("man")) return "male";
    return "unisex";
  }

  function filterOutfitBaseByPresentation(options) {
    const presentation = getSelectedOutfitBasePresentation();
    const tag = presentation === "female"
      ? "outfit-base-female"
      : presentation === "male"
        ? "outfit-base-male"
        : "outfit-base-unisex";
    return options.filter(opt => (opt.tags || []).includes(tag));
  }

  function clearInvalidOutfitBaseSelection() {
    const options = getOptionsForField("Outfit Base", "clothing", state.library, "Clothing");
    const allowedIds = new Set(options.map(option => option.id));
    const currentSelection = state.selections["Outfit Base"];
    if (currentSelection && !currentSelection.isCustom && !allowedIds.has(currentSelection.id)) {
      delete state.selections["Outfit Base"];
      const select = document.querySelector(`.custom-select[data-field="Outfit Base"]`);
      if (select) select.value = "";
    }
  }

  function clearInvalidHairCutStyleSelection() {
    const selectedGenderId = state.selections?.Gender?.id;
    const presentation = window.GENDER_TO_HAIR_PRESENTATION[selectedGenderId];
    if (!presentation) return;

    const allowedIds = window.HAIR_CUT_STYLE_PRESENTATION_OPTIONS[presentation];
    if (!allowedIds) return;

    const currentSelection = state.selections["Cut / Style"];
    if (currentSelection && !currentSelection.isCustom && !allowedIds.has(currentSelection.id)) {
      delete state.selections["Cut / Style"];
      const select = document.querySelector(`.custom-select[data-field="Cut / Style"]`);
      if (select) select.value = "";
    }
  }

  function getCategoryForField(groupName, fieldName) {
    if (groupName === "Hair" && fieldName === "Texture") return "hair";
    return window.FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase();
  }

  function getOptionsForField(fieldName, category, allItems, groupName = "") {
    const items = allItems.filter(item => {
      if (item.category === "nsfw" && category !== "nsfw") return false;
      return item.category === category;
    });
    const lowerField = fieldName.toLowerCase();
    const subcategoryAliases = {
      "Hair::Texture": ["Hair Texture", "Texture"],
      "Hair::Parting / Fringe": ["Bangs", "Parting / Fringe"],
      "Body::Height Impression": ["Height", "Height Impression"],
      "Body::Model Build": ["Build", "Model Build"],
      "Body::Body Silhouette": ["Body Shape", "Body Silhouette"],
      "Clothing::Primary Color": ["Clothing Color", "Primary Color"],
      "Clothing::Secondary Color": ["Clothing Color", "Secondary Color"],
      "Clothing::Material": ["Material", "Material / Surface"]
    };
    const aliasKey = `${groupName}::${fieldName}`;
    const aliases = subcategoryAliases[aliasKey]?.map(item => item.toLowerCase()) || [lowerField];

    const itemsWithSubcat = items.filter(item => item.subcategory);
    const hasSubcategory = itemsWithSubcat.length > 0 && (itemsWithSubcat.length / items.length) > 0.5;
    let matched = items;
    if (hasSubcategory) {
      matched = items.filter(item => item.subcategory && aliases.includes(item.subcategory.toLowerCase()));
    }

    if (fieldName === "Cut / Style") {
      return filterHairCutStyleByPresentation(matched);
    }
    if (aliasKey === "Body::Body Silhouette") {
      return filterBodySilhouetteByPresentation(matched);
    }
    if (aliasKey === "Clothing::Outfit Base") {
      return filterOutfitBaseByPresentation(matched);
    }
    if (
      state.mode === "character-sheet" &&
      (fieldName === "Primary Color" || fieldName === "Secondary Color")
    ) {
      return [];
    }
    return matched;
  }

  async function loadVisualAssetManifests() {
    const controls = window.ModelPromptForgeVisualOptionControls;
    if (!controls) {
      console.warn("Visual option controls module is not loaded.");
      state.visualControlFields = {};
      state.visualAssetManifests = {};
      return;
    }
    const result = await controls.loadManifests();
    state.visualControlFields = result.fieldsByKey;
    state.visualAssetManifests = result.manifestsByKey;
  }

  function createVisualOptionPicker(groupName, fieldName, select, filteredOptions) {
    return window.ModelPromptForgeVisualOptionControls?.createVisualOptionPicker({
      groupName,
      fieldName,
      select,
      filteredOptions,
      manifestsByKey: state.visualAssetManifests,
      fieldsByKey: state.visualControlFields,
      language: state.language,
      getLocalizedLabel
    }) || null;
  }

  function syncVisualPickers() {
    window.ModelPromptForgeVisualOptionControls?.syncVisualPickers(document);
  }

  function rerenderDynamicForm({ preserveOpenAccordions = true } = {}) {
    const openAccordionIds = preserveOpenAccordions
      ? [...document.querySelectorAll("#form-container .accordion.active")]
        .map(accordion => accordion.id)
        .filter(Boolean)
      : [];

    renderForm();
    bindDynamicFormEvents();
    if (window.restoreSelectionsToUI) window.restoreSelectionsToUI();
    openAccordionIds.forEach(id => document.getElementById(id)?.classList.add("active"));
    updateColorPickerUI();
    if (window.enforceModeReferencePolicy) window.enforceModeReferencePolicy({ updateUI: false });
    if (window.toggleUIForMode) window.toggleUIForMode();
    if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
    if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();
    window.ModelPromptForgeOutfitReferenceController?.renderOutfitReferencePanel?.();
    if (window.ModelPromptForgeClothingOptionRules?.applyClothingVisibilityRules) {
      window.ModelPromptForgeClothingOptionRules.applyClothingVisibilityRules();
    }
  }

  function bindDynamicFormEvents() {
    // Accordion Toggle Headers
    document.querySelectorAll(".accordion-header").forEach(header => {
      header.addEventListener("click", () => {
        const accordion = header.parentElement;
        const isActive = accordion.classList.contains("active");
        document.querySelectorAll(".accordion").forEach(acc => acc.classList.remove("active"));
        if (!isActive) {
          accordion.classList.add("active");
          requestAnimationFrame(() => {
            accordion.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
          });
        }
      });
    });

    // Dropdown Select Inputs
    document.querySelectorAll("#form-container select.custom-select").forEach(select => {
      const fieldName = select.getAttribute("data-field");
      const groupName = select.getAttribute("data-group");
      const customInput = select.closest(".form-field").querySelector(".custom-writein-input");

      select.addEventListener("change", (e) => {
        const val = e.target.value;

        if (val === "__custom__") {
          customInput.style.display = "block";
          customInput.focus();
          state.selections[fieldName] = {
            id: "__custom__",
            value: customInput.value,
            isCustom: true,
            group: groupName,
            category: window.FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase(),
            tags: []
          };
        } else {
          customInput.style.display = "none";
          if (val === "") {
            delete state.selections[fieldName];
            const fieldHelp = select.closest(".form-field")?.querySelector(".field-option-help");
            if (fieldHelp) fieldHelp.textContent = "";
          } else {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const promptVal = selectedOption.getAttribute("data-prompt");
            const libItem = state.library.find(item => item.id === val);

            state.selections[fieldName] = {
              id: val,
              value: promptVal,
              isCustom: false,
              group: groupName,
              category: libItem ? libItem.category : (window.FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase()),
              tags: libItem ? (libItem.tags || []) : [],
              gptPositiveWords: libItem && libItem.prompt && libItem.prompt["gpt-image-positive"] ? libItem.prompt["gpt-image-positive"].split(",").map(w => w.trim()) : []
            };
            const fieldHelp = select.closest(".form-field")?.querySelector(".field-option-help");
            if (fieldHelp) fieldHelp.textContent = getLocalizedLabel(libItem?.description);
            if (fieldName === "Fashion Direction" && window.applyFashionDirectionDefaults) {
              window.applyFashionDirectionDefaults(libItem);
            }
            if (window.enforceExclusionRules) window.enforceExclusionRules(val);
          }
        }

        if (fieldName === "Gender") {
          clearInvalidHairCutStyleSelection();
          clearInvalidBodySilhouetteSelection();
          clearInvalidOutfitBaseSelection();
        }
        if (groupName === "Clothing" && window.ModelPromptForgeClothingOptionRules?.applyClothingVisibilityRules) {
          window.ModelPromptForgeClothingOptionRules.applyClothingVisibilityRules();
        }
        if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges(groupName);
        if (window.updatePromptPreview) window.updatePromptPreview();
        if (fieldName === "Gender") {
          rerenderDynamicForm();
          if (window.updatePromptPreview) window.updatePromptPreview();
          return;
        }
        syncVisualPickers();
      });

      customInput.addEventListener("input", (e) => {
        if (select.value === "__custom__") {
          state.selections[fieldName] = {
            id: "__custom__",
            value: e.target.value,
            isCustom: true,
            group: groupName,
            category: window.FIELD_TO_CATEGORY_MAP[fieldName] || groupName.toLowerCase(),
            tags: []
          };
          if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges(groupName);
          if (window.updatePromptPreview) window.updatePromptPreview();
        }
      });
    });

    const characterOverride = document.getElementById("character-reference-override");
    if (characterOverride) {
      characterOverride.addEventListener("change", event => {
        state.characterReferenceOverrides = event.target.checked;
        if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
        if (window.updatePromptPreview) window.updatePromptPreview();
      });
    }
  }

  function updateColorPickerUI() {
    const hairBaseToggle = document.getElementById("hair-base-toggle");
    const hairBaseInput = document.getElementById("hair-base-input");
    if (hairBaseToggle && hairBaseInput) {
      hairBaseToggle.checked = !!(state.customColors && state.customColors["Color"] && state.customColors["Color"].enabled);
      hairBaseInput.value = (state.customColors && state.customColors["Color"] && state.customColors["Color"].base) || "#4a3728";
      hairBaseInput.disabled = !hairBaseToggle.checked;
    }
    const hairHighlightToggle = document.getElementById("hair-highlight-toggle");
    const hairHighlightInput = document.getElementById("hair-highlight-input");
    if (hairHighlightToggle && hairHighlightInput) {
      hairHighlightToggle.checked = !!(state.customColors && state.customColors["Color"] && state.customColors["Color"].highlightEnabled);
      hairHighlightInput.value = (state.customColors && state.customColors["Color"] && state.customColors["Color"].highlight) || "#ff00a0";
      hairHighlightInput.disabled = !hairHighlightToggle.checked;
    }

    ["Top", "Bottom", "Dress", "Shoes", "Product Type", "Primary Color", "Secondary Color"].forEach(field => {
      const fieldSlug = field.toLowerCase().replace(/\s+/g, "-");
      const toggle = document.getElementById(`clothing-toggle-${fieldSlug}`);
      const input = document.getElementById(`clothing-input-${fieldSlug}`);
      if (toggle && input) {
        const isModularClothingColorField = field === "Primary Color" || field === "Secondary Color";
        const fallbackColor = field === "Primary Color" ? "#111827" : field === "Secondary Color" ? "#e5e7eb" : "#ffffff";
        toggle.checked = !!(state.customColors && state.customColors[field] && state.customColors[field].enabled);
        input.value = (state.customColors && state.customColors[field] && state.customColors[field].color) || fallbackColor;
        input.disabled = isModularClothingColorField ? false : !toggle.checked;
      }
    });
  }

  // Expose to window
  window.renderForm = renderForm;
  window.getSelectedHairPresentation = getSelectedHairPresentation;
  window.filterHairCutStyleByPresentation = filterHairCutStyleByPresentation;
  window.clearInvalidHairCutStyleSelection = clearInvalidHairCutStyleSelection;
  window.clearInvalidBodySilhouetteSelection = clearInvalidBodySilhouetteSelection;
  window.clearInvalidOutfitBaseSelection = clearInvalidOutfitBaseSelection;
  window.getOptionsForField = getOptionsForField;
  window.loadVisualAssetManifests = loadVisualAssetManifests;
  window.createVisualOptionPicker = createVisualOptionPicker;
  window.syncVisualPickers = syncVisualPickers;
  window.rerenderDynamicForm = rerenderDynamicForm;
  window.bindDynamicFormEvents = bindDynamicFormEvents;
  window.updateColorPickerUI = updateColorPickerUI;
})();
