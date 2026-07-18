/**
 * ModelPromptForge - Clothing Selection and Visibility Rules
 */
(function () {
  function applyClothingVisibilityRules() {
    const state = window.state;
    if (!state) return;

    // Check if Front or Back Outfit reference is uploaded
    const isReferenceUploaded = Boolean(state.outfitReferenceImageFront || state.outfitReferenceImageBack);

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

    if (isReferenceUploaded) {
      // 1. Hide all modular fields if upload exists
      setVisible(outfitBaseField, false);
      setVisible(primaryColorField, false);
      setVisible(secondaryColorField, false);
      setVisible(patternField, false);
      setVisible(materialField, false);
    } else {
      // 2. Otherwise Outfit Base is visible
      setVisible(outfitBaseField, true);

      // Check selected Outfit Base ID
      const selectedBaseId = state.selections["Outfit Base"]?.id;
      const isBaseSelected = selectedBaseId && selectedBaseId !== "outfit.base.modest_reference";

      // Colors, Pattern, and Material are only visible if a valid Outfit Base is chosen (not modest fallback)
      setVisible(primaryColorField, isBaseSelected);
      setVisible(secondaryColorField, isBaseSelected);
      setVisible(patternField, isBaseSelected);
      setVisible(materialField, isBaseSelected);
    }
  }

  function getFormFieldDOM(fieldName) {
    const select = document.querySelector(
      `#form-container select.custom-select[data-field="${fieldName}"]`
    );
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
    applyClothingVisibilityRules
  };
})();
