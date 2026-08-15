/**
 * ModelPromptForge - Clothing Selection and Visibility Rules
 */
(function () {
  const OVERRIDE_FIELDS = {
    primaryColor: "Primary Color",
    secondaryColor: "Secondary Color",
    pattern: "Pattern",
    material: "Material"
  };

  function normalizeOutfitReferenceOverrides(value) {
    const raw = value && typeof value === "object" ? value : {};
    return {
      enabled: raw.enabled === true,
      primaryColor: raw.primaryColor === true,
      secondaryColor: raw.secondaryColor === true,
      pattern: raw.pattern === true,
      material: raw.material === true
    };
  }

  function resolveClothingControlState(appState = {}) {
    const hasFront = Boolean(appState.outfitReferenceImageFront);
    const hasBack = Boolean(appState.outfitReferenceImageBack);
    const overrides = normalizeOutfitReferenceOverrides(appState.outfitReferenceOverrides);
    const selectedBaseId = appState.selections?.["Outfit Base"]?.id;
    const hasModularBase = Boolean(selectedBaseId && selectedBaseId !== "outfit.base.modest_reference");
    const modularActive = !hasFront && !hasBack;
    const referenceState = hasFront
      ? (hasBack ? "front_back_ready" : "front_ready")
      : (hasBack ? "back_only_invalid" : "empty");

    return {
      referenceState,
      hasFront,
      hasBack,
      referenceActive: hasFront,
      overrides,
      showOutfitBase: modularActive,
      showOverrideControls: hasFront,
      fieldVisibility: {
        "Primary Color": hasFront ? overrides.enabled && overrides.primaryColor : modularActive && hasModularBase,
        "Secondary Color": hasFront ? overrides.enabled && overrides.secondaryColor : modularActive && hasModularBase,
        Pattern: hasFront ? overrides.enabled && overrides.pattern : modularActive && hasModularBase,
        Material: hasFront ? overrides.enabled && overrides.material : modularActive && hasModularBase
      }
    };
  }

  function applyClothingVisibilityRules() {
    const state = window.state;
    if (!state) return;
    const controlState = resolveClothingControlState(state);

    // Get DOM elements for fields
    const outfitBaseField = getFormFieldDOM("Outfit Base");
    const primaryColorField = getFormFieldDOM("Primary Color");
    const secondaryColorField = getFormFieldDOM("Secondary Color");
    const patternField = getFormFieldDOM("Pattern");
    const materialField = getFormFieldDOM("Material");

    // Helper to toggle visibility
    const setVisible = (element, visible) => {
      if (element) {
        element.style.display = visible ? "" : "none";
      }
    };

    setVisible(outfitBaseField, controlState.showOutfitBase);
    setVisible(primaryColorField, controlState.fieldVisibility["Primary Color"]);
    setVisible(secondaryColorField, controlState.fieldVisibility["Secondary Color"]);
    setVisible(patternField, controlState.fieldVisibility.Pattern);
    setVisible(materialField, controlState.fieldVisibility.Material);

    const overridePanel = document.getElementById("outfit-reference-overrides");
    if (overridePanel) overridePanel.hidden = !controlState.showOverrideControls;
    const masterToggle = document.getElementById("outfit-reference-customize-toggle");
    if (masterToggle) masterToggle.checked = controlState.overrides.enabled;
    Object.entries(OVERRIDE_FIELDS).forEach(([key]) => {
      const checkbox = document.querySelector(`[data-outfit-override="${key}"]`);
      if (checkbox) {
        checkbox.checked = controlState.overrides[key];
        checkbox.disabled = !controlState.overrides.enabled;
      }
    });
  }

  function getFormFieldDOM(fieldName) {
    const select = document.querySelector(`#form-container [data-field="${fieldName}"]`);
    return select ? select.closest(".form-field") : null;
  }

  function clearFieldSelection(fieldName) {
    const state = window.state;
    if (state?.selections?.[fieldName]) {
      delete state.selections[fieldName];

      // Update DOM Select element
      const select = document.querySelector(
        `#form-container select.custom-select[data-field="${fieldName}"]`
      );
      if (select) {
        select.value = "";
        
        // Hide custom write-in if any
        const formField = select.closest(".form-field");
        if (formField) {
          const customInput = formField.querySelector(".custom-writein-input");
          if (customInput) {
            customInput.value = "";
            customInput.style.display = "none";
          }
        }
      }

      // Sync visual picker active state
      if (window.ModelPromptForgeVisualOptionControls?.syncVisualPickers) {
        window.ModelPromptForgeVisualOptionControls.syncVisualPickers();
      }

      // Update accordion summary badges
      if (window.updateAccordionSummaryBadges) {
        window.updateAccordionSummaryBadges("Clothing");
      }
    }
  }

  window.ModelPromptForgeClothingOptionRules = {
    applyClothingVisibilityRules,
    resolveClothingControlState,
    normalizeOutfitReferenceOverrides
  };
})();
