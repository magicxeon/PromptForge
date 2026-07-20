/**
 * ModelPromptForge - Scene Builder Mode Naming & Navigation Contract
 */
(function () {
  const state = window.state;

  /**
   * Resolve display labels and attributes for legacy/internal mode values
   */
  function resolveSceneDisplayMode(mode) {
    const norm = mode === "normal" || mode === "story" ? "normal" : mode;
    if (norm === "normal") {
      return {
        id: "scene-builder",
        label: state.language === "th" ? "Scene Builder" : "Scene Builder",
        legacyMode: "normal"
      };
    }
    if (norm === "headshot") {
      return {
        id: "headshot",
        label: state.language === "th" ? "Headshot Grid" : "Headshot Grid",
        legacyMode: "headshot"
      };
    }
    if (norm === "character-sheet") {
      return {
        id: "character-sheet",
        label: state.language === "th" ? "Character Sheet Builder" : "Character Sheet Builder",
        legacyMode: "character-sheet"
      };
    }
    return {
      id: norm,
      label: norm,
      legacyMode: norm
    };
  }

  /**
   * Check if a mode is internally mapped to Scene Builder
   */
  function isSceneBuilderMode(mode) {
    return mode === "normal" || mode === "story" || mode === "scene-builder";
  }

  /**
   * Parse route path and current global state to construct the target Scene Builder navigation state
   */
  function getSceneBuilderRouteState(route, currentState) {
    const path = String(route || "/studio");
    let activeTemplateId = null;

    if (path.includes("/studio/scene/template/")) {
      activeTemplateId = path.split("/studio/scene/template/")[1] || null;
    }

    return {
      path,
      mode: isSceneBuilderMode(currentState?.mode) ? "normal" : (currentState?.mode || "normal"),
      activeTemplateId,
      timestamp: Date.now()
    };
  }

  /**
   * Apply navigation states to the shell/history router context
   */
  function applySceneBuilderNavigationState(routeState) {
    if (!routeState) return;
    
    // Switch state mode internally if needed
    if (routeState.mode && state.mode !== routeState.mode) {
      state.mode = routeState.mode;
      if (window.toggleUIForMode) window.toggleUIForMode();
    }

    // Set template details on state
    if (routeState.activeTemplateId) {
      state.activeSceneTemplateId = routeState.activeTemplateId;
    } else {
      delete state.activeSceneTemplateId;
    }
  }

  /**
   * Sanitize and normalize old configurations or history payloads
   */
  function normalizeLegacySceneMode(payload) {
    if (!payload || typeof payload !== "object") return payload;
    const copied = { ...payload };

    if (copied.mode === "story" || copied.mode === "scene-builder") {
      copied.mode = "normal";
    }

    // Support nested sceneBuilder namespace normalization
    if (!copied.sceneBuilder) {
      copied.sceneBuilder = {
        authoringMode: "guided",
        manualPromptText: "",
        lastGuidedPromptSnapshot: "",
        templateDraft: null
      };
    }

    return copied;
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneBuilder = {
    resolveSceneDisplayMode,
    isSceneBuilderMode,
    getSceneBuilderRouteState,
    applySceneBuilderNavigationState,
    normalizeLegacySceneMode
  };
})();
