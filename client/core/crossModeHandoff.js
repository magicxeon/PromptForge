/**
 * ModelPromptForge - Cross-Mode Character Workflow Handoff
 */
(function () {
  const state = window.state;

  // Track the active handoff context in memory while waiting for confirmation
  let activeHandoffContext = null;

  /**
   * Determine the appropriate next-step handoff action based on the generated result metadata
   */
  function getHandoffActionForResult(result) {
    if (!result || !result.imageUrl) {
      return { id: "none", label: "", targetMode: null, enabled: false, reason: "No image available" };
    }

    const mode = result.mode || "normal";
    
    const supportsRefs = supportsImageReferences(result);

    if (mode === "headshot") {
      return {
        id: "build-character",
        label: "👤 Build Character",
        targetMode: "character-sheet",
        enabled: true,
        supportsRefs
      };
    } else if (mode === "character-sheet") {
      return {
        id: "use-as-story-character",
        label: "📋 Use as Story Character",
        targetMode: "normal",
        enabled: true,
        supportsRefs
      };
    } else {
      // Normal/Story mode result
      return {
        id: "use-style-ref",
        label: "🖼️ Use as Style Reference",
        targetMode: "normal",
        enabled: true,
        supportsRefs
      };
    }
  }

  function supportsImageReferences(result = {}) {
    const providerId = result.provider || document.getElementById("api-provider-select")?.value;
    const modelId = result.submodel || document.getElementById("api-submodel-select")?.value;
    const provider = state.providerCatalog?.providers?.find(item => item.id === providerId);
    const model = provider?.models?.find(item => item.id === modelId);
    return model?.capabilities?.imageReferences === true;
  }

  function cleanReferenceImageSrc(src) {
    if (!src) return "";
    const outputIndex = src.indexOf("/outputs/");
    return outputIndex !== -1 ? src.substring(outputIndex) : src;
  }

  function syncReferenceControlState() {
    const refFace = document.getElementById("ref-face-match");
    const faceUploadContainer = document.getElementById("face-match-upload-container");
    if (refFace) refFace.checked = state.imageReferences.faceMatch === true;
    if (faceUploadContainer) {
      faceUploadContainer.style.display = state.imageReferences.faceMatch ? "block" : "none";
    }

    const characterReference = document.getElementById("story-use-character-reference");
    if (characterReference) {
      characterReference.checked = state.imageReferences.characterReference === true;
    }
  }

  function cloneSelections(selections = {}) {
    return JSON.parse(JSON.stringify(selections || {}));
  }

  function hasSelectionPayload(selections) {
    return selections && typeof selections === "object" && Object.keys(selections).length > 0;
  }

  function resolveSourceSelections(result = {}) {
    if (hasSelectionPayload(result.selections)) return cloneSelections(result.selections);
    if (result.mode && result.mode === state.mode && hasSelectionPayload(state.selections)) {
      return window.getModeCompatibleSelections
        ? window.getModeCompatibleSelections(state.selections, result.mode)
        : cloneSelections(state.selections);
    }
    return {};
  }

  function setActiveMode(mode) {
    state.mode = mode;
    localStorage.setItem("model_prompt_forge_active_mode", mode);
    document.querySelectorAll(".mode-chip").forEach(chip => {
      chip.classList.toggle("active", chip.getAttribute("data-mode") === mode);
    });
  }

  function refreshAfterHandoff() {
    if (window.enforceModeReferencePolicy) window.enforceModeReferencePolicy({ updateUI: false });
    if (window.rerenderDynamicForm) {
      window.rerenderDynamicForm({ preserveOpenAccordions: false });
    } else {
      if (window.toggleUIForMode) window.toggleUIForMode();
      if (window.restoreSelectionsToUI) window.restoreSelectionsToUI();
    }
    if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();
    syncReferenceControlState();
    if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
    if (window.updatePromptPreview) window.updatePromptPreview();
    if (window.saveCurrentModeState) window.saveCurrentModeState();
  }

  function scrollToTargetSection(sectionId, fallbackId = "creative-configurator") {
    requestAnimationFrame(() => {
      const section = document.getElementById(sectionId) || document.getElementById(fallbackId);
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /**
   * Carry only selections belonging to allowed groups (Character, Face, Hair, Skin)
   */
  function carrySelectionsForHandoff(sourceSelections, keepBodyClothing) {
    const carried = {};
    const dropped = [];

    const ALLOWED_GROUPS = new Set(["Character", "Face", "Hair", "Skin"]);
    if (keepBodyClothing) {
      ALLOWED_GROUPS.add("Body");
      ALLOWED_GROUPS.add("Clothing");
    }

    Object.keys(sourceSelections || {}).forEach(fieldName => {
      const selection = sourceSelections[fieldName];
      if (selection && ALLOWED_GROUPS.has(selection.group)) {
        carried[fieldName] = { ...selection };
      } else {
        dropped.push(fieldName);
      }
    });

    return { carriedSelections: carried, droppedFields: dropped };
  }

  /**
   * Switch to Character Sheet Builder and apply headshot data
   */
  function applyHeadshotToCharacterSheet(context, options) {
    // 1. Save current mode state before transitioning
    if (window.saveCurrentModeState) window.saveCurrentModeState();

    // 2. Transition state mode
    setActiveMode("character-sheet");

    // 4. Handle Selections Carry
    if (options.carryAttrs) {
      const { carriedSelections } = carrySelectionsForHandoff(context.sourceSelections, !options.freshBodyClothing);
      state.selections = carriedSelections;
    } else {
      state.selections = {};
    }

    // 5. Assign Reference Slot
    if (options.useAsFaceMatch) {
      state.imageReferences.faceMatch = true;
      state.faceReferenceImageA = cleanReferenceImageSrc(context.sourceImageUrl);
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = context.sourceJobId ? [context.sourceJobId] : [];
    } else {
      state.imageReferences.faceMatch = false;
      state.faceReferenceImageA = null;
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = [];
    }

    // 6. Persist & Refresh UI
    refreshAfterHandoff();

    // 7. Scroll to Character Configurator section
    scrollToTargetSection("accordion-character");
  }

  /**
   * Switch to Story Mode and assign generated Character Sheet as Reference
   */
  function applyCharacterSheetToStoryMode(context, options) {
    // 1. Save current mode state before transitioning
    if (window.saveCurrentModeState) window.saveCurrentModeState();

    // 2. Transition state mode to Story (normal)
    setActiveMode("normal");
    if (window.restoreCurrentModeState) window.restoreCurrentModeState();

    // 4. Assign Character Reference Slot
    if (options.useAsCharacterRef) {
      state.imageReferences.characterReference = true;
      state.characterReferenceImageA = cleanReferenceImageSrc(context.sourceImageUrl);
      state.characterReferenceImageB = null;
      state.characterReferenceJobIds = context.sourceJobId ? [context.sourceJobId] : [];
      state.characterReferenceOverrides = false;
    }

    // 5. Persist & Refresh UI
    refreshAfterHandoff();

    // 6. Scroll to Photographic / Scene controls
    scrollToTargetSection("accordion-fashion-direction");
  }

  /**
   * Render contextual viewport buttons based on active generation result mode
   */
  function renderViewportHandoffActions(result) {
    if (!result) return;
    const action = getHandoffActionForResult(result);

    const btnUseFace = document.getElementById("btn-viewport-use-face");
    const btnUseStyle = document.getElementById("btn-viewport-use-style");
    const btnUseCharacter = document.getElementById("btn-viewport-use-character");

    if (!btnUseFace || !btnUseStyle || !btnUseCharacter) return;

    // Reset default display/states
    btnUseFace.style.display = "none";
    btnUseStyle.style.display = "none";
    btnUseCharacter.style.display = "none";

    btnUseFace.textContent = "👤 Use as Face Ref";
    btnUseStyle.textContent = "🖼️ Use as Style Ref";
    btnUseCharacter.textContent = "📋 Use as Character Ref";

    if (result.mode === "headshot") {
      btnUseFace.style.display = "block";
      btnUseFace.textContent = "Build Character";
      
      // Update warning context if provider lacks references
      if (!action.supportsRefs) {
        btnUseFace.title = "The generated image can be attached as a workspace reference. If the selected model cannot use image references, generation may ignore it until you select a compatible model.";
      } else {
        btnUseFace.removeAttribute("title");
      }
    } else if (result.mode === "character-sheet") {
      btnUseCharacter.style.display = "block";
      btnUseCharacter.textContent = "Use as Story Character";
    } else {
      // normal mode result
      btnUseFace.style.display = "block";
      btnUseFace.textContent = "Use as Face Match";
      btnUseStyle.style.display = "block";
      btnUseStyle.textContent = "Use as Style Reference";
    }
  }

  function clearViewportHandoffActions() {
    const btnUseFace = document.getElementById("btn-viewport-use-face");
    const btnUseStyle = document.getElementById("btn-viewport-use-style");
    const btnUseCharacter = document.getElementById("btn-viewport-use-character");
    [btnUseFace, btnUseStyle, btnUseCharacter].forEach(button => {
      if (!button) return;
      button.style.display = "none";
      button.removeAttribute("title");
    });
    state.activeViewportJobMeta = null;
  }

  /**
   * Render contextual lightbox buttons based on active item mode
   */
  function renderLightboxHandoffActions(result) {
    if (!result) return;
    const action = getHandoffActionForResult(result);

    const btnUseFace = document.getElementById("btn-lightbox-use-face");
    const btnUseStyle = document.getElementById("btn-lightbox-use-style");
    const btnUseCharacter = document.getElementById("btn-lightbox-use-character");

    if (!btnUseFace || !btnUseStyle || !btnUseCharacter) return;

    btnUseFace.style.display = "none";
    btnUseStyle.style.display = "none";
    btnUseCharacter.style.display = "none";

    btnUseFace.textContent = "👤 Use as Face Ref";
    btnUseStyle.textContent = "🖼️ Use as Style Ref";
    btnUseCharacter.textContent = "📋 Use as Character Ref";

    if (result.mode === "headshot") {
      btnUseFace.style.display = "block";
      btnUseFace.textContent = "Build Character";
    } else if (result.mode === "character-sheet") {
      btnUseCharacter.style.display = "block";
      btnUseCharacter.textContent = "Use as Story Character";
    } else {
      // normal mode result
      btnUseFace.style.display = "block";
      btnUseFace.textContent = "Use as Face Match";
      btnUseStyle.style.display = "block";
      btnUseStyle.textContent = "Use as Style Reference";
    }
  }

  /**
   * Show Handoff Confirmation Dialog overlay
   */
  function showHandoffConfirmation(result, actionId) {
    const action = getHandoffActionForResult(result);
    activeHandoffContext = {
      sourceMode: result.mode,
      sourceJobId: result.id || result.jobId,
      sourceImageUrl: result.imageUrl,
      sourceSelections: resolveSourceSelections(result),
      canAttachImageReference: action.supportsRefs
    };

    const modal = document.getElementById("handoff-confirm-modal");
    const titleEl = document.getElementById("handoff-modal-title");
    const msgEl = document.getElementById("handoff-modal-message");
    const optionsList = document.querySelector(".handoff-options-list");

    if (!modal || !titleEl || !msgEl || !optionsList) return;

    if (actionId === "build-character") {
      titleEl.textContent = "Build Character Sheet";
      msgEl.textContent = "Configure how your headshot identity is carried over to the Character Sheet Builder:";
      optionsList.style.display = "flex";
      
      const useImage = document.getElementById("chk-handoff-use-image");
      if (useImage) {
        useImage.checked = true;
        useImage.disabled = false;
        const label = useImage.closest("label");
        if (label) {
          label.style.opacity = "";
          label.title = action.supportsRefs
            ? ""
            : "This will attach the generated image to Face Match. If the selected model cannot use image references, generation may ignore it until you select a compatible model.";
        }
      }
      document.getElementById("chk-handoff-carry-attrs").checked = true;
      document.getElementById("chk-handoff-fresh-body-clothing").checked = true;
    } else if (actionId === "use-as-story-character") {
      titleEl.textContent = "Use as Story Character";
      msgEl.textContent = action.supportsRefs
        ? "Would you like to switch to Story Mode and attach this Character Sheet as your active Character Reference?"
        : "Story Mode will open and attach this Character Sheet as your active Character Reference. If the selected model cannot use image references, generation may ignore it until you select a compatible model.";
      optionsList.style.display = "none";
    }

    modal.style.display = "flex";
    document.body.classList.add("app-dialog-open");
  }

  /**
   * Handle handoff submission confirm action
   */
  function confirmHandoff() {
    if (!activeHandoffContext) return;

    const modal = document.getElementById("handoff-confirm-modal");
    const action = getHandoffActionForResult({ mode: activeHandoffContext.sourceMode, imageUrl: activeHandoffContext.sourceImageUrl });

    if (action.id === "build-character") {
      const options = {
        useAsFaceMatch: document.getElementById("chk-handoff-use-image").checked,
        carryAttrs: document.getElementById("chk-handoff-carry-attrs").checked,
        freshBodyClothing: document.getElementById("chk-handoff-fresh-body-clothing").checked
      };
      applyHeadshotToCharacterSheet(activeHandoffContext, options);
    } else if (action.id === "use-as-story-character") {
      applyCharacterSheetToStoryMode(activeHandoffContext, { useAsCharacterRef: true });
    }

    closeHandoffDialog();
  }

  /**
   * Close Handoff Dialog
   */
  function closeHandoffDialog() {
    const modal = document.getElementById("handoff-confirm-modal");
    if (modal) modal.style.display = "none";
    document.body.classList.remove("app-dialog-open");
    activeHandoffContext = null;
  }

  // Setup click listeners on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-handoff-confirm")?.addEventListener("click", confirmHandoff);
    document.getElementById("btn-handoff-cancel")?.addEventListener("click", closeHandoffDialog);
    document.getElementById("handoff-confirm-modal")?.addEventListener("mousedown", event => {
      if (event.target.id === "handoff-confirm-modal") closeHandoffDialog();
    });
  });

  // Expose to window namespace
  window.ModelPromptForgeCrossModeHandoff = {
    getHandoffActionForResult,
    supportsImageReferences,
    carrySelectionsForHandoff,
    applyHeadshotToCharacterSheet,
    applyCharacterSheetToStoryMode,
    renderViewportHandoffActions,
    clearViewportHandoffActions,
    renderLightboxHandoffActions,
    showHandoffConfirmation
  };
})();
