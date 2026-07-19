/**
 * ModelPromptForge - Scene Template Replacement Checklist Coordinator
 */
(function () {
  let activeSnapshot = null;
  let workspaceBackup = null;
  const userInputValues = {};

  /**
   * Start the Template Use interactive workflow.
   */
  function startTemplateWorkflow(snapshot) {
    if (!snapshot) return;
    activeSnapshot = snapshot;

    // 1. Back up active state before applying template baseline
    workspaceBackup = {
      selections: JSON.parse(JSON.stringify(window.state.selections || {})),
      customColors: JSON.parse(JSON.stringify(window.state.customColors || {})),
      aspectRatio: window.state.aspectRatio,
      width: document.getElementById("input-width")?.value || "768",
      height: document.getElementById("input-height")?.value || "1024",
      resolution: document.getElementById("image-resolution-select")?.value || null,
      providerId: document.getElementById("api-provider-select")?.value || null,
      modelId: document.getElementById("api-submodel-select")?.value || null,
      sceneBuilder: JSON.parse(JSON.stringify(window.state.sceneBuilder || {}))
    };

    // Reset user input values
    Object.keys(userInputValues).forEach(k => delete userInputValues[k]);

    // Populate defaults from variables
    (snapshot.replaceableVariables || []).forEach(variable => {
      if (variable.defaultValue !== undefined && variable.defaultValue !== null) {
        userInputValues[variable.id] = variable.defaultValue;
      }
    });

    // 2. Hydrate and apply base template baseline
    const hydrationResult = window.ModelPromptForgeSceneTemplateHydrator.hydrateSceneTemplate(snapshot, {}, window.state.library);
    if (hydrationResult.warnings && hydrationResult.warnings.length > 0) {
      const warningText = hydrationResult.warnings.join("\n");
      if (window.AppDialog) {
        window.AppDialog.alert(
          `This template has some configuration warnings and some options may be reset:\n\n${warningText}`,
          { title: "Template Configuration Warning" }
        );
      } else {
        alert(`Template Warning:\n${warningText}`);
      }
    }
    if (hydrationResult.success && hydrationResult.patch) {
      window.ModelPromptForgeSceneTemplateHydrator.applySceneTemplatePatch(hydrationResult.patch);
    }

    // Hide normal config forms and show the replacement panel
    const formContainer = document.getElementById("form-container");
    const manualPromptContainer = document.getElementById("manual-prompt-container");
    const replacementPanel = document.getElementById("template-replacement-panel");
    const modeTabs = document.querySelector(".form-mode-presets-row");

    if (formContainer) formContainer.style.display = "none";
    if (manualPromptContainer) manualPromptContainer.style.display = "none";
    if (replacementPanel) replacementPanel.style.display = "block";
    if (modeTabs) modeTabs.style.opacity = "0.4"; // indicate read-only state

    // Render variables list
    renderChecklist();
    updateGenerateButtonState();
  }

  /**
   * Exit Template Use workflow and restore normal configuration forms.
   */
  function exitTemplateWorkflow() {
    activeSnapshot = null;
    Object.keys(userInputValues).forEach(k => delete userInputValues[k]);

    // Restore workspace backup state
    if (workspaceBackup) {
      window.ModelPromptForgeSceneTemplateHydrator.applySceneTemplatePatch(workspaceBackup);
      workspaceBackup = null;
    }

    const formContainer = document.getElementById("form-container");
    const replacementPanel = document.getElementById("template-replacement-panel");
    const modeTabs = document.querySelector(".form-mode-presets-row");

    if (replacementPanel) replacementPanel.style.display = "none";
    if (modeTabs) modeTabs.style.opacity = "1";

    // Show appropriate form based on authoring mode
    if (window.state.sceneBuilder?.authoringMode === "manual") {
      const manualPromptContainer = document.getElementById("manual-prompt-container");
      if (manualPromptContainer) manualPromptContainer.style.display = "block";
    } else {
      if (formContainer) formContainer.style.display = "block";
    }

    // Restore standard generate button label and enabled status
    const generateBtn = document.getElementById("btn-generate-image");
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerText = window.state.language === "th" ? "สร้างรูปภาพ" : "Generate Image";
    }
  }

  /**
   * Render the replacement variables inputs in the DOM.
   */
  function renderChecklist() {
    const listContainer = document.getElementById("template-variables-list");
    if (!listContainer || !activeSnapshot) return;
    listContainer.innerHTML = "";

    const variables = activeSnapshot.replaceableVariables || [];

    if (variables.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "sub-label";
      emptyMsg.innerText = "This template has no customizable variables. Press Generate to run directly.";
      listContainer.appendChild(emptyMsg);
      return;
    }

    variables.forEach(variable => {
      window.ModelPromptForgeSceneVariableControls.renderSceneVariableControl(
        listContainer,
        variable,
        userInputValues[variable.id],
        (newValue) => {
          userInputValues[variable.id] = newValue;
          updateGenerateButtonState();
        }
      );
    });
  }

  /**
   * Update the Generate button disabled state and description label.
   */
  function updateGenerateButtonState() {
    const generateBtn = document.getElementById("btn-generate-image");
    if (!generateBtn || !activeSnapshot) return;

    const missing = window.ModelPromptForgeSceneTemplateValidation.getMissingRequiredVariables(activeSnapshot, userInputValues);

    if (missing.length > 0) {
      generateBtn.disabled = true;
      const missingLabels = missing.map(v => v.label || v.sourceFieldName).join(", ");
      generateBtn.innerText = window.state.language === "th"
        ? `ระบุตัวแปรไม่ครบ (${missingLabels})`
        : `Missing variables (${missingLabels})`;
    } else {
      generateBtn.disabled = false;
      generateBtn.innerText = window.state.language === "th"
        ? "สร้างรูปภาพจากเทมเพลต"
        : "Generate from Template";
    }
  }

  /**
   * Expose status checking.
   */
  function isTemplateWorkflowActive() {
    return activeSnapshot !== null;
  }

  /**
   * Get currently active template snapshot.
   */
  function getActiveTemplateSnapshot() {
    return activeSnapshot;
  }

  /**
   * Retrieve compiled payload with applied replacements.
   */
  function getResolvedPayload() {
    if (!activeSnapshot) return null;

    const resolverResult = window.ModelPromptForgeSceneVariableResolver.resolveTemplateVariables(
      activeSnapshot,
      userInputValues,
      window.state.library
    );

    return resolverResult;
  }

  // Expose to window
  window.ModelPromptForgeSceneReplacementChecklist = {
    startTemplateWorkflow,
    exitTemplateWorkflow,
    isTemplateWorkflowActive,
    getActiveTemplateSnapshot,
    getResolvedPayload
  };

  // Wire cancel button
  document.addEventListener("DOMContentLoaded", () => {
    const cancelBtn = document.getElementById("btn-cancel-template-mode");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => exitTemplateWorkflow());
    }
  });
})();
