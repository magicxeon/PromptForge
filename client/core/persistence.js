/**
 * ModelPromptForge - Form & Selections Persistence Manager
 */
(() => {
  const state = window.state;

  function saveCurrentModeState() {
    if (!state.mode) return;
    if (window.enforceFaceMatchInvariant) window.enforceFaceMatchInvariant({ updateUI: false });
    if (window.enforceModeReferencePolicy) window.enforceModeReferencePolicy({ updateUI: false });
    if (window.pruneSelectionsForMode) window.pruneSelectionsForMode(state.selections, state.mode);
    const modeKey = `model_prompt_forge_state_${state.mode.replace("-", "_")}`;

    const payload = {
      selections: window.getModeCompatibleSelections ? window.getModeCompatibleSelections(state.selections, state.mode) : state.selections,
      customColors: state.customColors,
      imageReferences: state.imageReferences,
      aspectRatio: state.aspectRatio,
      width: document.getElementById("input-width") ? document.getElementById("input-width").value : "768",
      height: document.getElementById("input-height") ? document.getElementById("input-height").value : "1024",
      template: document.getElementById("template-select") ? document.getElementById("template-select").value : "portrait",
      nsfwEnabled: false,
      gptSafeEnabled: false,
      provider: document.getElementById("api-provider-select")?.value || null,
      submodel: document.getElementById("api-submodel-select")?.value || null,
      imageResolution: window.getSelectedImageResolution ? window.getSelectedImageResolution() : null,
      faceReferenceImageA: state.faceReferenceImageA,
      faceReferenceImageB: state.faceReferenceImageB,
      faceReferenceJobIds: state.faceReferenceJobIds,
      styleReferenceImageA: state.styleReferenceImageA,
      styleReferenceImageB: state.styleReferenceImageB,
      styleReferenceJobIds: state.styleReferenceJobIds,
      characterReferenceImageA: state.characterReferenceImageA,
      characterReferenceImageB: state.characterReferenceImageB,
      characterReferenceJobIds: state.characterReferenceJobIds,
      outfitReferenceImageFront: state.outfitReferenceImageFront,
      outfitReferenceImageBack: state.outfitReferenceImageBack,
      outfitReferenceJobIds: state.outfitReferenceJobIds,
      characterReferenceOverrides: state.characterReferenceOverrides
    };

    localStorage.setItem(modeKey, JSON.stringify(payload));
    localStorage.setItem("model_prompt_forge_active_mode", state.mode);
  }

  function restoreCurrentModeState() {
    if (!state.mode) return;
    const modeKey = `model_prompt_forge_state_${state.mode.replace("-", "_")}`;
    const saved = localStorage.getItem(modeKey);
    if (!saved) {
      state.isRestoringState = true;
      resetForm();
      state.isRestoringState = false;
      return;
    }

    try {
      const payload = JSON.parse(saved);
      if (!payload || typeof payload !== "object") return;

      // 1. Restore core state objects
      state.selections = window.pruneSelectionsForMode && window.migrateLegacySelections
        ? window.pruneSelectionsForMode(window.migrateLegacySelections(payload.selections), state.mode)
        : (payload.selections || {});
      state.customColors = {
        "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
        "Top": { enabled: false, color: "#ffffff" },
        "Bottom": { enabled: false, color: "#ffffff" },
        "Dress": { enabled: false, color: "#ffffff" },
        "Shoes": { enabled: false, color: "#ffffff" },
        "Product Type": { enabled: false, color: "#ffffff" },
        "Primary Color": { enabled: false, color: "#111827" },
        "Secondary Color": { enabled: false, color: "#e5e7eb" },
        ...(payload.customColors || {})
      };
      state.imageReferences = {
        faceMatch: false,
        styleMatch: false,
        poseMatch: false,
        characterReference: false,
        outfitReference: false,
        ...(payload.imageReferences || {})
      };
      state.aspectRatio = payload.aspectRatio || "6:8";
      state.faceReferenceImageA = payload.faceReferenceImageA || null;
      state.faceReferenceImageB = payload.faceReferenceImageB || null;
      state.faceReferenceJobIds = payload.faceReferenceJobIds || [];
      state.styleReferenceImageA = payload.styleReferenceImageA || null;
      state.styleReferenceImageB = payload.styleReferenceImageB || null;
      state.styleReferenceJobIds = payload.styleReferenceJobIds || [];
      state.characterReferenceImageA = payload.characterReferenceImageA || null;
      state.characterReferenceImageB = payload.characterReferenceImageB || null;
      state.characterReferenceJobIds = payload.characterReferenceJobIds || [];
      state.outfitReferenceImageFront = payload.outfitReferenceImageFront || null;
      state.outfitReferenceImageBack = payload.outfitReferenceImageBack || null;
      state.outfitReferenceJobIds = payload.outfitReferenceJobIds || [];
      state.characterReferenceOverrides = payload.characterReferenceOverrides === true;

      if (payload.provider) {
        if (window.populateProviderList) window.populateProviderList(payload.provider);
        if (window.updateSubmodelList) window.updateSubmodelList(payload.submodel || null);
        if (window.updateImageResolutionControl) window.updateImageResolutionControl(payload.imageResolution || null);
      }
      if (state.mode !== "normal") {
        if (window.clearCharacterReferenceState) window.clearCharacterReferenceState({ updateUI: false });
      }

      // 2. Restore DOM element values
      const inputWidth = document.getElementById("input-width");
      const inputHeight = document.getElementById("input-height");
      if (inputWidth && payload.width) inputWidth.value = payload.width;
      if (inputHeight && payload.height) inputHeight.value = payload.height;

      // Aspect ratio chips
      document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
        chip.classList.remove("active");
        if (chip.getAttribute("data-ratio") === state.aspectRatio) {
          chip.classList.add("active");
        }
      });

      // Image reference checks
      const refFaceMatch = document.getElementById("ref-face-match");
      const refStyleMatch = document.getElementById("ref-style-match");
      const refPoseMatch = document.getElementById("ref-pose-match");
      if (refFaceMatch) refFaceMatch.checked = state.imageReferences.faceMatch;
      if (refStyleMatch) refStyleMatch.checked = state.imageReferences.styleMatch;
      if (refPoseMatch) refPoseMatch.checked = state.imageReferences.poseMatch;
      const storyCharacterReference = document.getElementById("story-use-character-reference");
      if (storyCharacterReference) {
        storyCharacterReference.checked = window.isStoryCharacterReferenceActive ? window.isStoryCharacterReferenceActive() : false;
      }
      if (window.enforceFaceMatchInvariant) window.enforceFaceMatchInvariant({ updateUI: false });

      // Toggle container display
      const faceMatchUploadContainer = document.getElementById("face-match-upload-container");
      if (faceMatchUploadContainer) {
        faceMatchUploadContainer.style.display = state.imageReferences.faceMatch ? "block" : "none";
      }

      // Toggle NSFW & GPT-Safe
      const toggleNsfw = document.getElementById("toggle-nsfw");
      if (toggleNsfw) {
        toggleNsfw.checked = false;
        toggleNsfw.disabled = true;
        const nsfwAccordion = document.getElementById("accordion-nsfw");
        if (nsfwAccordion) {
          nsfwAccordion.style.display = "none";
        }
      }
      const toggleGptSafe = document.getElementById("toggle-gpt-safe");
      if (toggleGptSafe) {
        toggleGptSafe.checked = false;
        toggleGptSafe.disabled = true;
      }

      // Template select
      const templateSelect = document.getElementById("template-select");
      if (templateSelect && payload.template) templateSelect.value = payload.template;

      // 3. Re-render attributes form fields (sync DOM selects with state.selections)
      document.querySelectorAll("#form-container select.custom-select").forEach(select => {
        const fieldName = select.getAttribute("data-field");
        const customInput = select.closest(".form-field").querySelector(".custom-writein-input");

        if (state.selections[fieldName]) {
          const selection = state.selections[fieldName];
          if (selection.isCustom) {
            select.value = "__custom__";
            if (customInput) {
              customInput.value = selection.value;
              customInput.style.display = "block";
            }
          } else {
            select.value = selection.id;
            if (customInput) {
              customInput.value = "";
              customInput.style.display = "none";
            }
          }
        } else {
          select.value = "";
          if (customInput) {
            customInput.value = "";
            customInput.style.display = "none";
          }
        }
        if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges(select.getAttribute("data-group"));
      });
      if (window.syncVisualPickers) window.syncVisualPickers();

      // 4. Sync Color Pickers UI
      if (window.updateColorPickerUI) window.updateColorPickerUI();

      // 5. Lockout and previews
      if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
      if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();

      // 6. Recalculate preview
      if (window.updatePromptPreview) window.updatePromptPreview();

    } catch (err) {
      console.error("Failed to restore mode state:", err);
    }
  }

  function resetForm() {
    document.querySelectorAll("#form-container select.custom-select").forEach(select => {
      select.value = "";
      const formField = select.closest(".form-field");
      if (formField) {
        const customInput = formField.querySelector(".custom-writein-input");
        if (customInput) {
          customInput.value = "";
          customInput.style.display = "none";
        }
      }
    });

    document.getElementById("ref-face-match").checked = false;
    document.getElementById("ref-style-match").checked = false;
    document.getElementById("ref-pose-match").checked = false;

    const toggleNsfw = document.getElementById("toggle-nsfw");
    if (toggleNsfw) toggleNsfw.checked = false;
    const nsfwAccordion = document.getElementById("accordion-nsfw");
    if (nsfwAccordion) nsfwAccordion.style.display = "none";

    const toggleGptSafe = document.getElementById("toggle-gpt-safe");
    if (toggleGptSafe) toggleGptSafe.checked = false;

    state.selections = {};
    state.imageReferences = { faceMatch: false, styleMatch: false, poseMatch: false, characterReference: false, outfitReference: false };
    if (window.clearFaceReferenceState) window.clearFaceReferenceState({ updateUI: false });
    if (window.clearCharacterReferenceState) window.clearCharacterReferenceState({ updateUI: false });
    if (window.clearOutfitReferenceState) window.clearOutfitReferenceState({ updateUI: false });
    state.aspectRatio = "6:8";
    state.customColors = {
      "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
      "Top": { enabled: false, color: "#ffffff" },
      "Bottom": { enabled: false, color: "#ffffff" },
      "Dress": { enabled: false, color: "#ffffff" },
      "Shoes": { enabled: false, color: "#ffffff" },
      "Product Type": { enabled: false, color: "#ffffff" },
      "Primary Color": { enabled: false, color: "#111827" },
      "Secondary Color": { enabled: false, color: "#e5e7eb" }
    };
    if (window.updateColorPickerUI) window.updateColorPickerUI();
    if (window.syncVisualPickers) window.syncVisualPickers();

    // Hide Face Match container
    const faceUploadContainer = document.getElementById("face-match-upload-container");
    if (faceUploadContainer) faceUploadContainer.style.display = "none";
    const faceFileInput = document.getElementById("face-match-file");
    if (faceFileInput) faceFileInput.value = "";

    // Reset linked dimensions inputs
    const inputWidth = document.getElementById("input-width");
    const inputHeight = document.getElementById("input-height");
    if (inputWidth) inputWidth.value = "768";
    if (inputHeight) inputHeight.value = "1024";

    // Clear presets select
    const presetSelect = document.getElementById("preset-select");
    if (presetSelect) presetSelect.value = "";

    document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
      chip.classList.remove("active");
      if (chip.getAttribute("data-ratio") === "6:8") {
        chip.classList.add("active");
      }
    });

    document.querySelectorAll(".accordion-badge").forEach(badge => {
      badge.textContent = "";
      badge.style.display = "none";
    });

    const templateSelect = document.getElementById("template-select");
    if (templateSelect && templateSelect.options.length > 0) templateSelect.selectedIndex = 0;

    if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
    if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  function restoreSelectionsToUI() {
    Object.keys(state.selections).forEach(fieldName => {
      const selection = state.selections[fieldName];
      const selectEl = document.querySelector(`.custom-select[data-field="${fieldName}"]`);
      if (selectEl) {
        if (selection.isCustom) {
          selectEl.value = "__custom__";
          const formField = selectEl.closest(".form-field");
          const customInput = formField ? formField.querySelector(".custom-writein-input") : null;
          if (customInput) {
            customInput.value = selection.value;
            customInput.style.display = "block";
          }
        } else {
          const hasMatchingOption = Array.from(selectEl.options).some(option => option.value === selection.id);
          if (!hasMatchingOption) {
            delete state.selections[fieldName];
            const fieldHelp = selectEl.closest(".form-field")?.querySelector(".field-option-help");
            if (fieldHelp) fieldHelp.textContent = "";
            return;
          }
          selectEl.value = selection.id;
        }
        const selectedItem = state.library.find(item => item.id === selection.id);
        const fieldHelp = selectEl.closest(".form-field")?.querySelector(".field-option-help");
        if (fieldHelp) fieldHelp.textContent = window.getLocalizedLabel(selectedItem?.description);
        if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges(selection.group);
      }
    });
    if (window.syncVisualPickers) window.syncVisualPickers();
  }

  function setAspectInUI(ratio) {
    state.aspectRatio = ratio;
    document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
      if (chip.getAttribute("data-ratio") === ratio) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
  }

  function buildPortableConfigPayload() {
    if (window.enforceFaceMatchInvariant) window.enforceFaceMatchInvariant({ updateUI: false });
    if (window.enforceModeReferencePolicy) window.enforceModeReferencePolicy({ updateUI: false });

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      mode: state.mode,
      selections: window.getModeCompatibleSelections
        ? window.getModeCompatibleSelections(state.selections, state.mode)
        : JSON.parse(JSON.stringify(state.selections || {})),
      customColors: state.customColors,
      imageReferences: state.imageReferences,
      aspectRatio: state.aspectRatio,
      width: document.getElementById("input-width") ? document.getElementById("input-width").value : "768",
      height: document.getElementById("input-height") ? document.getElementById("input-height").value : "1024",
      template: document.getElementById("template-select") ? document.getElementById("template-select").value : "portrait",
      nsfwEnabled: false,
      gptSafeEnabled: false,
      provider: document.getElementById("api-provider-select")?.value || null,
      submodel: document.getElementById("api-submodel-select")?.value || null,
      imageResolution: window.getSelectedImageResolution ? window.getSelectedImageResolution() : null,
      faceReferenceImageA: state.faceReferenceImageA,
      faceReferenceImageB: state.faceReferenceImageB,
      faceReferenceJobIds: state.faceReferenceJobIds,
      styleReferenceImageA: state.styleReferenceImageA,
      styleReferenceImageB: state.styleReferenceImageB,
      styleReferenceJobIds: state.styleReferenceJobIds,
      characterReferenceImageA: state.characterReferenceImageA,
      characterReferenceImageB: state.characterReferenceImageB,
      characterReferenceJobIds: state.characterReferenceJobIds,
      outfitReferenceImageFront: state.outfitReferenceImageFront,
      outfitReferenceImageBack: state.outfitReferenceImageBack,
      outfitReferenceJobIds: state.outfitReferenceJobIds,
      characterReferenceOverrides: state.characterReferenceOverrides,
      sourceOwnership: window.getCharacterSheetSourceOwnership ? window.getCharacterSheetSourceOwnership() : null
    };
  }

  function restorePortableConfigPayload(payload) {
    const nextMode = payload.mode && window.MODE_CATEGORY_POLICY && window.MODE_CATEGORY_POLICY[payload.mode]
      ? payload.mode
      : state.mode;

    if (nextMode && nextMode !== state.mode) {
      state.mode = nextMode;
      localStorage.setItem("model_prompt_forge_active_mode", state.mode);
      document.querySelectorAll(".mode-chip").forEach(chip => {
        chip.classList.toggle("active", chip.getAttribute("data-mode") === state.mode);
      });
    }

    const migratedSelections = window.migrateLegacySelections
      ? window.migrateLegacySelections(payload.selections || {})
      : (payload.selections || {});
    state.selections = window.pruneSelectionsForMode
      ? window.pruneSelectionsForMode(migratedSelections, state.mode)
      : migratedSelections;

    state.customColors = {
      "Color": { enabled: false, base: "#4a3728", highlightEnabled: false, highlight: "#ff00a0" },
      "Top": { enabled: false, color: "#ffffff" },
      "Bottom": { enabled: false, color: "#ffffff" },
      "Dress": { enabled: false, color: "#ffffff" },
      "Shoes": { enabled: false, color: "#ffffff" },
      "Product Type": { enabled: false, color: "#ffffff" },
      "Primary Color": { enabled: false, color: "#111827" },
      "Secondary Color": { enabled: false, color: "#e5e7eb" },
      ...(payload.customColors || {})
    };
    state.imageReferences = {
      faceMatch: false,
      styleMatch: false,
      poseMatch: false,
      characterReference: false,
      outfitReference: false,
      ...(payload.imageReferences || {})
    };
    state.aspectRatio = payload.aspectRatio || state.aspectRatio || "6:8";
    state.faceReferenceImageA = payload.faceReferenceImageA || null;
    state.faceReferenceImageB = payload.faceReferenceImageB || null;
    state.faceReferenceJobIds = payload.faceReferenceJobIds || [];
    state.styleReferenceImageA = payload.styleReferenceImageA || null;
    state.styleReferenceImageB = payload.styleReferenceImageB || null;
    state.styleReferenceJobIds = payload.styleReferenceJobIds || [];
    state.characterReferenceImageA = payload.characterReferenceImageA || null;
    state.characterReferenceImageB = payload.characterReferenceImageB || null;
    state.characterReferenceJobIds = payload.characterReferenceJobIds || [];
    state.outfitReferenceImageFront = payload.outfitReferenceImageFront || null;
    state.outfitReferenceImageBack = payload.outfitReferenceImageBack || null;
    state.outfitReferenceJobIds = payload.outfitReferenceJobIds || [];
    state.characterReferenceOverrides = payload.characterReferenceOverrides === true;

    const inputWidth = document.getElementById("input-width");
    const inputHeight = document.getElementById("input-height");
    if (inputWidth && payload.width) inputWidth.value = payload.width;
    if (inputHeight && payload.height) inputHeight.value = payload.height;

    const templateSelect = document.getElementById("template-select");
    if (templateSelect && payload.template) templateSelect.value = payload.template;

    const toggleNsfw = document.getElementById("toggle-nsfw");
    if (toggleNsfw) {
      toggleNsfw.checked = false;
      toggleNsfw.disabled = true;
    }
    const nsfwAccordion = document.getElementById("accordion-nsfw");
    if (nsfwAccordion) nsfwAccordion.style.display = "none";

    const toggleGptSafe = document.getElementById("toggle-gpt-safe");
    if (toggleGptSafe) {
      toggleGptSafe.checked = false;
      toggleGptSafe.disabled = true;
    }

    if (payload.provider && window.populateProviderList) window.populateProviderList(payload.provider);
    if (window.updateSubmodelList) window.updateSubmodelList(payload.submodel || null);
    if (window.updateImageResolutionControl) window.updateImageResolutionControl(payload.imageResolution || null);

    const refFaceMatch = document.getElementById("ref-face-match");
    const refStyleMatch = document.getElementById("ref-style-match");
    const refPoseMatch = document.getElementById("ref-pose-match");
    if (refFaceMatch) refFaceMatch.checked = state.imageReferences.faceMatch;
    if (refStyleMatch) refStyleMatch.checked = state.imageReferences.styleMatch;
    if (refPoseMatch) refPoseMatch.checked = state.imageReferences.poseMatch;

    const faceMatchUploadContainer = document.getElementById("face-match-upload-container");
    if (faceMatchUploadContainer) {
      faceMatchUploadContainer.style.display = state.imageReferences.faceMatch ? "block" : "none";
    }

    document.querySelectorAll("#form-container select.custom-select").forEach(select => {
      const formField = select.closest(".form-field");
      const customInput = formField ? formField.querySelector(".custom-writein-input") : null;
      select.value = "";
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
    });

    restoreSelectionsToUI();
    setAspectInUI(state.aspectRatio);
    if (window.updateColorPickerUI) window.updateColorPickerUI();
    if (window.syncVisualPickers) window.syncVisualPickers();
    if (window.enforceFaceMatchInvariant) window.enforceFaceMatchInvariant({ updateUI: true });
    if (window.enforceModeReferencePolicy) window.enforceModeReferencePolicy({ updateUI: true });
    if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
    if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();
    if (window.toggleUIForMode) window.toggleUIForMode();
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  function exportConfigJSON() {
    saveCurrentModeState();
    const jsonStr = JSON.stringify(buildPortableConfigPayload(), null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "model-prompt-config.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function importConfigJSON(jsonString) {
    try {
      const payload = JSON.parse(jsonString);
      if (!payload || typeof payload !== "object") throw new Error("Invalid config file.");

      state.isRestoringState = true;
      restorePortableConfigPayload(payload);
      state.isRestoringState = false;
      saveCurrentModeState();
    } catch (error) {
      state.isRestoringState = false;
      if (window.AppDialog?.alert) {
        window.AppDialog.alert(`Failed to load preset configuration: ${error.message}`);
      } else {
        alert(`Failed to load preset configuration: ${error.message}`);
      }
    }
  }

  // Expose to window
  window.saveCurrentModeState = saveCurrentModeState;
  window.restoreCurrentModeState = restoreCurrentModeState;
  window.resetForm = resetForm;
  window.restoreSelectionsToUI = restoreSelectionsToUI;
  window.setAspectInUI = setAspectInUI;
  window.exportConfigJSON = exportConfigJSON;
  window.importConfigJSON = importConfigJSON;
})();
