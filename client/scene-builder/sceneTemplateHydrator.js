/**
 * ModelPromptForge - Scene Template Hydrator (Pure Functions)
 */
(function () {
  const state = window.state;

  /**
   * Hydrate a template snapshot back into a StudioStatePatch after validating options against the catalog library.
   * This is a pure function with no DOM or global state side-effects.
   */
  function hydrateSceneTemplate(snapshot, replacements = {}, library = []) {
    if (!snapshot || typeof snapshot !== "object") {
      return { success: false, patch: null, warnings: ["Invalid template snapshot object"] };
    }

    const warnings = [];
    const patch = {};

    // 1. Authoring mode patch
    const authoringMode = (snapshot.authoringMode === "guided" || snapshot.authoringMode === "manual")
      ? snapshot.authoringMode
      : "guided";

    patch.sceneBuilder = {
      authoringMode,
      manualPromptText: authoringMode === "manual" ? (snapshot.manualPromptSnapshot || "") : "",
      lastGuidedPromptSnapshot: snapshot.authoringMode === "guided" ? (snapshot.finalPromptSnapshot || "") : "",
      templateDraft: snapshot.templateDraft || null
    };

    // 2. Validate selections against active library catalog
    const validIds = new Set((library || []).filter(item => item.enabled !== false).map(item => item.id));
    const targetSelections = {};

    if (authoringMode === "guided") {
      const selections = snapshot.structuredSelectionsSnapshot || {};
      
      Object.keys(selections).forEach(fieldName => {
        const selection = selections[fieldName];
        if (!selection) return;

        if (selection.isCustom) {
          targetSelections[fieldName] = { ...selection };
        } else if (selection.id) {
          if (validIds.has(selection.id)) {
            targetSelections[fieldName] = { ...selection };
          } else {
            warnings.push(`Option '${selection.id}' for field '${fieldName}' is stale or unavailable.`);
          }
        } else {
          targetSelections[fieldName] = { ...selection };
        }
      });
    }

    // Apply replacements for selections if provided
    Object.keys(replacements.selections || {}).forEach(fieldName => {
      targetSelections[fieldName] = replacements.selections[fieldName];
    });

    patch.selections = targetSelections;

    // Extract customColors from template variables
    const targetCustomColors = {};
    (snapshot.replaceableVariables || []).forEach(variable => {
      if (variable.type === "color") {
        targetCustomColors[variable.sourceFieldName] = {
          enabled: true,
          color: variable.defaultValue || "#000000"
        };
      }
    });

    // Apply replacements for custom colors if provided
    Object.keys(replacements.customColors || {}).forEach(colorKey => {
      targetCustomColors[colorKey] = replacements.customColors[colorKey];
    });

    patch.customColors = targetCustomColors;

    // 3. Aspect Ratio and settings
    const settings = snapshot.generationSettingsSnapshot || {};
    patch.aspectRatio = settings.aspectRatio || "6:8";
    patch.width = settings.width || "768";
    patch.height = settings.height || "1024";
    patch.resolution = settings.resolution || null;

    // 4. Provider Model Settings
    const pm = snapshot.providerModelSnapshot || {};
    patch.providerId = pm.providerId || null;
    patch.modelId = pm.modelId || null;

    return {
      success: true,
      patch,
      warnings
    };
  }

  /**
   * Apply a state patch to the global state and DOM elements (UI Glue layer).
   */
  function applySceneTemplatePatch(patch) {
    if (!patch) return;
    
    // Apply state updates
    if (patch.sceneBuilder) {
      window.ModelPromptForgeSceneBuilderState.applyPatch(patch.sceneBuilder);
    }
    if (patch.selections) {
      state.selections = JSON.parse(JSON.stringify(patch.selections));
    }
    if (patch.customColors) {
      state.customColors = JSON.parse(JSON.stringify(patch.customColors));
    }
    if (patch.aspectRatio) {
      state.aspectRatio = patch.aspectRatio;
      document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
        chip.classList.toggle("active", chip.getAttribute("data-ratio") === patch.aspectRatio);
      });
    }

    const widthEl = document.getElementById("input-width");
    if (widthEl && patch.width) widthEl.value = patch.width;

    const heightEl = document.getElementById("input-height");
    if (heightEl && patch.height) heightEl.value = patch.height;

    const providerSelect = document.getElementById("api-provider-select");
    const submodelSelect = document.getElementById("api-submodel-select");

    if (providerSelect && patch.providerId) {
      const hasProvider = Array.from(providerSelect.options).some(o => o.value === patch.providerId);
      if (hasProvider) {
        providerSelect.value = patch.providerId;
        if (window.updateSubmodelList) window.updateSubmodelList();

        if (submodelSelect && patch.modelId) {
          const hasModel = Array.from(submodelSelect.options).some(o => o.value === patch.modelId);
          if (hasModel) {
            submodelSelect.value = patch.modelId;
          }
        }
      }
    }

    // Refresh UI components
    if (window.applyModelCapabilityControls) window.applyModelCapabilityControls();
    if (window.syncVisualPickers) window.syncVisualPickers();
    if (window.updateColorPickerUI) window.updateColorPickerUI();
    if (window.ModelPromptForgeSceneBuilderUi?.updateUi) {
      window.ModelPromptForgeSceneBuilderUi.updateUi();
    }
    if (window.saveCurrentModeState) window.saveCurrentModeState();
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneTemplateHydrator = {
    hydrateSceneTemplate,
    applySceneTemplatePatch
  };
})();
