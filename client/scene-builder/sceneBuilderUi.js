/**
 * ModelPromptForge - Scene Builder UI Interactions manager
 */
(function () {
  const state = window.state;

  /**
   * Bind event listeners to the authoring interface controls
   */
  function init() {
    const btnGuided = document.getElementById("btn-authoring-guided");
    const btnManual = document.getElementById("btn-authoring-manual");
    const manualInput = document.getElementById("manual-prompt-input");

    if (btnGuided) {
      btnGuided.addEventListener("click", () => {
        window.ModelPromptForgeSceneBuilderModeSwitcher.setSceneAuthoringMode("guided");
      });
    }

    if (btnManual) {
      btnManual.addEventListener("click", () => {
        window.ModelPromptForgeSceneBuilderModeSwitcher.setSceneAuthoringMode("manual");
      });
    }

    if (manualInput) {
      manualInput.addEventListener("input", (e) => {
        window.ModelPromptForgeSceneBuilderState.applyPatch({
          manualPromptText: e.target.value
        });
        if (window.saveCurrentModeState) window.saveCurrentModeState();
        if (window.updatePromptPreview) window.updatePromptPreview();
      });
    }

    // Run initial UI state update
    updateUi();
  }

  /**
   * Synchronize DOM display properties with the active mode selections
   */
  function updateUi() {
    const modeContainer = document.getElementById("scene-authoring-mode-container");
    const manualContainer = document.getElementById("manual-prompt-container");
    const formContainer = document.getElementById("form-container");
    
    const btnGuided = document.getElementById("btn-authoring-guided");
    const btnManual = document.getElementById("btn-authoring-manual");
    const manualInput = document.getElementById("manual-prompt-input");

    if (!modeContainer || !manualContainer || !formContainer) return;

    const isSceneBuilder = window.ModelPromptForgeSceneBuilder?.isSceneBuilderMode(state.mode);

    if (isSceneBuilder) {
      modeContainer.style.display = "block";
      const authoringMode = window.ModelPromptForgeSceneBuilderModeSwitcher?.getSceneAuthoringMode() || "guided";

      if (authoringMode === "manual") {
        formContainer.style.display = "none";
        manualContainer.style.display = "block";
        
        if (btnManual) btnManual.classList.add("active");
        if (btnGuided) btnGuided.classList.remove("active");

        const manualText = window.ModelPromptForgeSceneBuilderState.getState().manualPromptText || "";
        if (manualInput && manualInput.value !== manualText) {
          manualInput.value = manualText;
        }
      } else {
        // Fallback to guided
        formContainer.style.display = "block";
        manualContainer.style.display = "none";
        
        if (btnGuided) btnGuided.classList.add("active");
        if (btnManual) btnManual.classList.remove("active");
      }
    } else {
      modeContainer.style.display = "none";
      manualContainer.style.display = "none";
      formContainer.style.display = "block";
    }
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneBuilderUi = {
    init,
    updateUi
  };
})();
