/**
 * ModelPromptForge - Scene Builder Authoring Mode Switcher
 */
(function () {
  const state = window.state;

  /**
   * Get the active authoring mode
   */
  function getSceneAuthoringMode() {
    return window.ModelPromptForgeSceneBuilderState.getState().authoringMode;
  }

  /**
   * Set the active authoring mode
   */
  async function setSceneAuthoringMode(mode, options = {}) {
    if (mode !== "guided" && mode !== "manual") {
      console.warn(`[SceneBuilder] Ignoring invalid authoring mode: ${mode}`);
      return;
    }

    const currentMode = getSceneAuthoringMode();
    if (currentMode === mode) return;

    if (mode === "manual" && currentMode === "guided") {
      const guidedPrompt = window.generatePromptText ? window.generatePromptText(true) : "";
      
      let shouldCopy = false;
      if (options.forceCopy === true) {
        shouldCopy = true;
      } else if (guidedPrompt && guidedPrompt.trim() !== "") {
        shouldCopy = await window.AppDialog.confirm(
          window.state.language === "th"
            ? "คุณต้องการคัดลอกคำสั่ง (Prompt) ปัจจุบันจาก Guided Mode ไปยังช่องเขียนของ Manual Mode หรือไม่?"
            : "Do you want to copy the current Guided prompt text into the Manual prompt editor?",
          { title: window.state.language === "th" ? "คัดลอกคำสั่ง" : "Copy Prompt" }
        );
      }

      if (shouldCopy) {
        window.ModelPromptForgeSceneBuilderState.applyPatch({
          manualPromptText: guidedPrompt,
          lastGuidedPromptSnapshot: guidedPrompt
        });
        const manualInput = document.getElementById("manual-prompt-input");
        if (manualInput) manualInput.value = guidedPrompt;
      }
    }

    // Apply the patched mode
    window.ModelPromptForgeSceneBuilderState.applyPatch({ authoringMode: mode });

    // Update persistence, UI, and prompt preview
    if (window.saveCurrentModeState) window.saveCurrentModeState();
    if (window.ModelPromptForgeSceneBuilderUi?.updateUi) {
      window.ModelPromptForgeSceneBuilderUi.updateUi();
    }
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  /**
   * Copy the current guided prompt directly and return it
   */
  function copyGuidedPromptToManual() {
    const guidedPrompt = window.generatePromptText ? window.generatePromptText(true) : "";
    window.ModelPromptForgeSceneBuilderState.applyPatch({ manualPromptText: guidedPrompt });
    return guidedPrompt;
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneBuilderModeSwitcher = {
    getSceneAuthoringMode,
    setSceneAuthoringMode,
    copyGuidedPromptToManual
  };
})();
