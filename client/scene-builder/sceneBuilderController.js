/**
 * ModelPromptForge - Scene Builder Aggregator Controller
 */
(function () {
  const existing = window.ModelPromptForgeSceneBuilder || {};

  function init(dependencies = {}) {
    window.ModelPromptForgeSceneBuilderUi?.init?.(dependencies);
  }

  function updateUi() {
    window.ModelPromptForgeSceneBuilderUi?.updateUi?.();
  }

  function getState() {
    return window.ModelPromptForgeSceneBuilderState?.getState?.();
  }

  function applyPatch(patch) {
    return window.ModelPromptForgeSceneBuilderState?.applyPatch?.(patch);
  }

  function createSnapshot(context) {
    return window.ModelPromptForgeSceneTemplateSerializer?.createSceneTemplateSnapshot?.(context);
  }

  function hydrateTemplate(snapshot, replacements) {
    return window.ModelPromptForgeSceneTemplateHydrator?.hydrateSceneTemplate?.(
      snapshot,
      replacements || {},
      window.state?.library || []
    );
  }

  function startTemplateWorkflow(snapshot) {
    return window.ModelPromptForgeSceneReplacementChecklist?.startTemplateWorkflow?.(snapshot);
  }

  window.ModelPromptForgeSceneBuilder = Object.assign(existing, {
    init,
    updateUi,
    getState,
    applyPatch,
    createSnapshot,
    hydrateTemplate,
    startTemplateWorkflow
  });
})();
