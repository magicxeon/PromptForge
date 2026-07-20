/**
 * ModelPromptForge - Scene Builder Local State Management
 */
(function () {
  const state = window.state;

  /**
   * Get the current Scene Builder state namespace
   */
  function getState() {
    if (!state.sceneBuilder) {
      state.sceneBuilder = {
        authoringMode: "guided",
        manualPromptText: "",
        lastGuidedPromptSnapshot: "",
        templateDraft: null
      };
    }
    return state.sceneBuilder;
  }

  /**
   * Apply a patch object to the Scene Builder state namespace
   */
  function applyPatch(patch) {
    const current = getState();
    Object.assign(current, patch || {});
    return current;
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneBuilderState = {
    getState,
    applyPatch
  };
})();
