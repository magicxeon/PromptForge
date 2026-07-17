(function () {
  const VISUAL_CONTROL_FIELDS = [
    {
      key: "Face::Face Shape",
      group: "Face",
      field: "Face Shape",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/face-structure/face-shape/manifest.json",
      optionMap: {
        "face.shape.oval": "face.002",
        "face.shape.square": "face.005",
        "face.shape.round": "face.003",
        "face.shape.diamond": "face.006",
        "face.shape.rectangular": "face.018",
        "face.shape.heart": "face.004",
        "face.shape.inverted_triangular": "face.019",
        "face.shape.long": "face.020"
      }
    },
    {
      key: "Face::Eyes",
      group: "Face",
      field: "Eyes",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/eyes/manifest.json",
      optionMap: {
        "eyes.shape.almond": "eyes.001",
        "eyes.shape.monolid": "eyes.002",
        "eyes.shape.double_eyelids": "eyes.003",
        "eyes.shape.round": "eyes.004",
        "eyes.shape.phoenix": "eyes.005",
        "eyes.shape.doe": "eyes.006",
        "eyes.shape.puppy": "eyes.007",
        "eyes.shape.hooded": "eyes.008"
      }
    },
    {
      key: "Face::Eyebrows",
      group: "Face",
      field: "Eyebrows",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/eyebrows/manifest.json",
      optionMap: {
        "eyebrows.shape.straight": "eyebrows.001",
        "eyebrows.shape.soft_arched": "eyebrows.002",
        "eyebrows.shape.natural_thick": "eyebrows.003",
        "eyebrows.shape.thin": "eyebrows.004",
        "eyebrows.shape.defined": "eyebrows.005",
        "eyebrows.shape.well_groomed": "eyebrows.006",
        "eyebrows.shape.natural": "eyebrows.007"
      }
    },
    {
      key: "Face::Nose",
      group: "Face",
      field: "Nose",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/nose/manifest.json",
      optionMap: {
        "nose.shape.small_button": "nose.001",
        "nose.shape.high_bridge": "nose.002",
        "nose.shape.delicate_narrow": "nose.003",
        "nose.shape.soft_rounded_tip": "nose.004",
        "nose.shape.straight": "nose.005",
        "nose.shape.natural": "nose.006"
      }
    },
    {
      key: "Face::Lips",
      group: "Face",
      field: "Lips",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/facial-features/lips/manifest.json",
      optionMap: {
        "lips.shape.natural": "lips.001",
        "lips.shape.cherry": "lips.002",
        "lips.shape.cupids_bow": "lips.003",
        "lips.shape.plump": "lips.004",
        "lips.shape.thin": "lips.005",
        "lips.shape.heart_shaped": "lips.010",
        "lips.shape.heavy_upper": "lips.011",
        "lips.shape.wide": "lips.012"
      }
    },
    {
      key: "Hair::Length",
      group: "Hair",
      field: "Length",
      controlType: "visual-card-picker",
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/length/manifest.json",
      optionMap: {
        "hair.length.buzz_cut": "hair_001",
        "hair.length.short": "hair_002",
        "hair.length.long": "hair_003",
        "hair.length.extra_long": "hair_004"
      }
    },
    {
      key: "Hair::Cut / Style",
      group: "Hair",
      field: "Cut / Style",
      controlType: "visual-card-picker",
      hideMissingAttributes: true,
      manifestUrl: "/assets/visual-character-builder/headshot-v1/hair/cut-style/manifest.json",
      optionMap: {
        "hair.cut_style.ponytail": "hair_008",
        "hair.cut_style.messy_bun": "hair_009",
        "hair.cut_style.french_braid": "hair_010",
        "hair.cut_style.layered_hush_cut": "hair_022",
        "hair.cut_style.long_loose_waves": "hair_023",
        "hair.cut_style.side_swept": "hair_024",
        "hair.cut_style.wet_look": "hair_025",
        "hair.cut_style.wolf_cut": "hair_026",
        "hair.cut_style.crew_cut": "hair_029",
        "hair.cut_style.side_part": "hair_030",
        "hair.cut_style.undercut": "hair_031",
        "hair.cut_style.pompadour": "hair_032",
        "hair.cut_style.quiff": "hair_033",
        "hair.cut_style.textured_crop": "hair_034",
        "hair.cut_style.caesar_cut": "hair_035",
        "hair.cut_style.short_curly_crop": "hair_036"
      }
    }
  ];

  async function loadManifests({ fetchImpl = window.fetch } = {}) {
    const fieldsByKey = Object.fromEntries(VISUAL_CONTROL_FIELDS.map(config => [config.key, config]));
    const manifestEntries = await Promise.all(VISUAL_CONTROL_FIELDS.map(async config => {
      try {
        const response = await fetchImpl(config.manifestUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return [config.key, await response.json()];
      } catch (error) {
        console.warn(`Visual option manifest unavailable for ${config.key}:`, error.message);
        return [config.key, null];
      }
    }));
    return {
      fieldsByKey,
      manifestsByKey: Object.fromEntries(manifestEntries.filter(([, manifest]) => manifest))
    };
  }

  function createVisualOptionPicker({
    groupName,
    fieldName,
    select,
    filteredOptions,
    manifestsByKey,
    fieldsByKey,
    language,
    getLocalizedLabel
  }) {
    const key = getVisualManifestKey(groupName, fieldName);
    const config = fieldsByKey[key];
    const manifest = manifestsByKey[key];
    if (!manifest?.items?.length) return null;

    const optionById = new Map(filteredOptions.map(option => [option.id, option]));
    const picker = document.createElement("div");
    picker.className = "visual-option-picker";
    picker.dataset.controlType = config?.controlType || "visual-card-picker";
    picker.setAttribute("role", "radiogroup");
    picker.setAttribute("aria-label", fieldName);
    picker.dataset.field = fieldName;
    picker.dataset.group = groupName;

    manifest.items.forEach(item => {
      const attributeId = config?.optionMap?.[item.optionId];
      const attribute = optionById.get(attributeId);
      if (!attribute && config?.hideMissingAttributes) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-option-card";
      if (!attribute) button.classList.add("missing-attribute");
      button.dataset.value = attributeId || "";
      button.dataset.optionId = item.optionId;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");
      button.title = item.alt?.[language] || item.alt?.en || getLocalizedLabel(attribute?.label) || item.slug;

      const icon = document.createElement("span");
      icon.className = "visual-option-icon";
      const iconUrl = item.assets?.thumb || item.assets?.preview;
      if (iconUrl) {
        icon.style.setProperty("--visual-option-url", `url("${iconUrl}")`);
      } else {
        button.classList.add("missing-asset");
      }
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "visual-option-label";
      label.textContent = getLocalizedLabel(attribute?.label) || item.slug || item.optionId;

      button.appendChild(icon);
      button.appendChild(label);
      button.addEventListener("click", () => {
        selectVisualOption(select, attributeId);
      });
      picker.appendChild(button);
    });

    picker.addEventListener("keydown", event => handleVisualPickerKeydown(event, picker, select));
    return picker.children.length > 0 ? picker : null;
  }

  function syncVisualPickers(root = document) {
    root.querySelectorAll(".visual-option-picker").forEach(picker => {
      const select = getSelectForVisualPicker(picker, root);
      const activeValue = select?.value || "";
      const disabled = Boolean(select?.disabled);
      const selectableButtons = Array.from(picker.querySelectorAll(".visual-option-card")).filter(button => button.dataset.value);
      const selectedIndex = selectableButtons.findIndex(button => button.dataset.value === activeValue);
      picker.querySelectorAll(".visual-option-card").forEach(button => {
        const isActive = button.dataset.value === activeValue;
        const fallbackFocus = selectedIndex === -1 && button === selectableButtons[0];
        button.classList.toggle("active", isActive);
        button.disabled = disabled || !button.dataset.value;
        button.tabIndex = isActive || fallbackFocus ? 0 : -1;
        button.setAttribute("aria-checked", String(isActive));
        button.setAttribute("aria-disabled", String(button.disabled));
      });
    });
  }

  function selectVisualOption(select, value) {
    if (!select || select.disabled || !value) return;
    const option = Array.from(select.options).find(item => item.value === value);
    if (!option || option.disabled) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus({ preventScroll: true });
  }

  function handleVisualPickerKeydown(event, picker, select) {
    const navigationKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Enter", " "];
    if (!navigationKeys.includes(event.key)) return;
    const buttons = Array.from(picker.querySelectorAll(".visual-option-card:not(:disabled)"))
      .filter(button => button.dataset.value);
    if (buttons.length === 0) return;
    const activeIndex = Math.max(0, buttons.findIndex(button => button.classList.contains("active") || button === document.activeElement));
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = Math.min(buttons.length - 1, activeIndex + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = Math.max(0, activeIndex - 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    if (event.key === "Enter" || event.key === " ") {
      selectVisualOption(select, document.activeElement?.dataset?.value || buttons[activeIndex]?.dataset.value);
      event.preventDefault();
      return;
    }

    buttons[nextIndex]?.focus({ preventScroll: true });
    event.preventDefault();
  }

  function getSelectForVisualPicker(picker, root = document) {
    return Array.from(root.querySelectorAll("#form-container .custom-select")).find(select =>
      select.getAttribute("data-field") === picker.dataset.field &&
      select.getAttribute("data-group") === picker.dataset.group
    );
  }

  function getVisualManifestKey(groupName, fieldName) {
    return `${groupName}::${fieldName}`;
  }

  window.ModelPromptForgeVisualOptionControls = {
    loadManifests,
    createVisualOptionPicker,
    syncVisualPickers
  };
})();
