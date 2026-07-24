/**
 * ModelPromptForge - Entry Point Bootstrap Script
 */

const state = window.state;

// Dependency mappings from window modules
const getLocalizedLabel = window.getLocalizedLabel;
const isStoryCharacterReferenceActive = () => window.isStoryCharacterReferenceActive();
const clearFaceReferenceState = (opts) => window.clearFaceReferenceState(opts);
const clearCharacterReferenceState = (opts) => window.clearCharacterReferenceState(opts);
const refreshReferenceAuthorityUI = () => window.refreshReferenceAuthorityUI();
const updateReferencePreviewsUI = () => window.updateReferencePreviewsUI();
const getPromptValueForSelection = (s, f) => window.getPromptValueForSelection(s, f);
const updateAccordionSummaryBadges = (g) => window.updateAccordionSummaryBadges(g);
const updateDropdownExclusions = () => window.updateDropdownExclusions();
const generatePromptText = (c) => window.generatePromptText(c);
const saveCurrentModeState = () => window.saveCurrentModeState();
const restoreCurrentModeState = () => window.restoreCurrentModeState();
const resetForm = () => window.resetForm();
const restoreSelectionsToUI = () => window.restoreSelectionsToUI();
const renderForm = () => window.renderForm();
const rerenderDynamicForm = (opts) => window.rerenderDynamicForm(opts);
const loadVisualAssetManifests = () => window.loadVisualAssetManifests();
const syncVisualPickers = () => window.syncVisualPickers();
const updateColorPickerUI = () => window.updateColorPickerUI();
const getActiveModelConfig = () => window.getActiveModelConfig();
const getSelectedImageResolution = () => window.getSelectedImageResolution();
const getGenerationRequestPayload = () => window.getGenerationRequestPayload();
const populateProviderList = (p) => window.populateProviderList(p);
const updateSubmodelList = (m) => window.updateSubmodelList(m);
const applyModelCapabilityControls = () => window.applyModelCapabilityControls();
const updateImageResolutionControl = (r) => window.updateImageResolutionControl(r);
const updateCredits = () => window.updateCredits();
const loadHistory = (opts) => window.loadHistory(opts);
const loadCollections = (opts) => window.loadCollections(opts);
const openLightbox = (item, opts) => window.openLightbox(item, opts);
const openMembershipModal = (jobId) => window.openMembershipModal(jobId);
const assignFaceReference = (img, jobId) => window.assignFaceReference(img, jobId);
const assignStyleReference = (img, jobId) => window.assignStyleReference(img, jobId);
const assignCharacterReference = (img, jobId) => window.assignCharacterReference(img, jobId);
const initializeCollectionsUI = () => window.initializeCollectionsUI();
const getCollectionsForJob = (jobId) => window.getCollectionsForJob(jobId);
const enforceModeReferencePolicy = (opts) => window.enforceModeReferencePolicy(opts);
const enforceFaceMatchInvariant = (opts) => window.enforceFaceMatchInvariant(opts);
const pruneSelectionsForMode = (s, m) => window.pruneSelectionsForMode(s, m);
const updateCharacterSheetSourceStatus = () => window.updateCharacterSheetSourceStatus();
const isGroupAllowedForMode = (g, m) => window.isGroupAllowedForMode(g, m);
const randomizePresetSelections = (p, n) => window.randomizePresetSelections(p, n);
const getCollectionById = (id) => window.getCollectionById(id);
const deleteActiveCollection = () => window.deleteActiveCollection();
const closeCollectionEditor = () => window.closeCollectionEditor();
const updateCollectionCharacterCounts = () => window.updateCollectionCharacterCounts();
const closeMembershipModal = () => window.closeMembershipModal();
const navigateLightbox = (d) => window.navigateLightbox(d);
const closeLightbox = (opts) => window.closeLightbox(opts);
const exportConfigJSON = () => window.exportConfigJSON();
const importConfigJSON = (json) => window.importConfigJSON(json);
const getApiErrorMessage = (p, f) => window.getApiErrorMessage(p, f);
const uniqueReferenceJobIds = (ids) => window.uniqueReferenceJobIds(ids);
const apiFetch = (url, options) => (window.ModelPromptForgeApiClient?.apiFetch || fetch)(url, options);
const appendActorQuery = (url) => window.ModelPromptForgeActorContext?.appendActorQuery
  ? window.ModelPromptForgeActorContext.appendActorQuery(url)
  : url;
const getActiveActorId = () => window.ModelPromptForgeActorContext?.getActiveMockUserId?.() || 'usr_demo';

const MODE_CATEGORY_POLICY = window.MODE_CATEGORY_POLICY;
const FACE_MATCH_OWNED_FIELDS = new Set(["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile"]);

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  state.isRestoringState = true; // Block any auto-saving during initialization race conditions (Step 12)
  try {
    if (window.ModelPromptForgeI18n?.initialize) {
      await window.ModelPromptForgeI18n.initialize();
      state.language = window.ModelPromptForgeI18n.getLocale();
    } else {
      state.language = localStorage.getItem('model_prompt_forge_language') || state.language;
    }
    const [response, providerResponse] = await Promise.all([
      fetch("/api/attributes/bundle"),
      fetch("/api/providers")
    ]);
    if (!response.ok || !providerResponse.ok) {
      throw new Error(`Server returned HTTP ${!response.ok ? response.status : providerResponse.status}`);
    }
    const bundle = await response.json();
    state.providerCatalog = await providerResponse.json();
    if (!state.providerCatalog?.providers?.length) {
      throw new Error("No configured image providers are available.");
    }

    window.ModelPromptForgeStudioEngineTargetPanel?.destroy?.();
    window.ModelPromptForgeStudioEngineTargetPanel = window.ModelPromptForgeGenerationControls
      ?.createEngineTargetComparisonPanel?.({
        mount: document.getElementById('studio-engine-target-panel'),
        getCatalog: () => state.providerCatalog,
        options: {
          showStepBadge: true,
          stepLabel: 'Step 2',
          showComparison: true,
          showActiveRun: true,
          showResolution: true,
          showDimensions: true,
          showAspectRatio: true,
          legacyStudioIds: true
        },
        getComparisonEstimate: ({ slots }) => window.ModelPromptForgeComparison?.estimateForPayload?.({
          ...getGenerationRequestPayload(),
          slots
        }),
        onComparisonModeChange: () => { void window.refreshGenerationCreditEstimate?.(); },
        onComparisonSubmit: ({ slots }) => window.ModelPromptForgeComparison?.startFromExternal?.(slots)
      });
    if (!window.ModelPromptForgeStudioEngineTargetPanel) {
      throw new Error('Engine & Target Output component is unavailable.');
    }

    window.ModelPromptForgeStudioGenerationResultSurface?.destroy?.();
    window.ModelPromptForgeStudioGenerationResultSurface = window.ModelPromptForgeGenerationControls
      ?.createGenerationResultSurface?.({
        mount: document.getElementById('studio-generation-result'),
        surface: 'studio',
        legacyStudioIds: true,
        showRecentRenders: false
      });
    if (!window.ModelPromptForgeStudioGenerationResultSurface) {
      throw new Error('Generation result component is unavailable.');
    }

    state.schema = bundle.schema;
    state.templates = bundle.templates;
    state.order = bundle.order;
    populateProviderList();
    document.querySelectorAll('#language-pill-selector .pill-btn').forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-value') === state.language);
    });
    updateSubmodelList();

    renderForm();
    populateProviderList();
    document.querySelectorAll('#language-pill-selector .pill-btn').forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-value') === state.language);
    });
    updateSubmodelList();
    bindEvents();
    window.ModelPromptForgeOutfitReferenceController?.initOutfitReferenceController?.();
    initializeCollectionsUI();
    initializeScrollToViewport();
    initializeAutoExpandConfigurator();

    // Restore active mode from localStorage (Step 12)
    const savedMode = localStorage.getItem("model_prompt_forge_active_mode") || "normal";
    state.mode = Object.prototype.hasOwnProperty.call(MODE_CATEGORY_POLICY, savedMode) ? savedMode : "normal";

    // Sync mode chips in DOM
    document.querySelectorAll(".mode-chip[data-mode]").forEach(chip => {
      chip.classList.remove("active");
      if (chip.getAttribute("data-mode") === state.mode) {
        chip.classList.add("active");
      }
    });

    // Restore persisted state for initial mode (Step 12)
    restoreCurrentModeState();

    if (window.ModelPromptForgeSceneBuilder?.init) {
      window.ModelPromptForgeSceneBuilder.init();
    }

    enforceModeReferencePolicy({ updateUI: false });
    toggleUIForMode();
    updateReferencePreviewsUI();
    window.ModelPromptForgeOutfitReferenceController?.renderOutfitReferencePanel?.();
    await window.ModelPromptForgeMockUserSwitcher?.init?.();
    updateCredits();
    void window.refreshGenerationCreditEstimate?.();

    state.isRestoringState = false; // Safe to auto-save now

    updatePromptPreview();
    await loadCollections();
    loadHistory();
    window.ModelPromptForgeComparisonBridge = {
      getCatalog: () => state.providerCatalog,
      getLanguage: () => state.language,
      getUsername: () => state.username,
      getUserRole: () => state.userRole,
      getGenerationPayload: getGenerationRequestPayload,
      validateForm,
      openLightbox: (item, options) => openLightbox(item, options),
      openCollectionPicker: jobId => openMembershipModal(jobId),
      useAsFaceReference: (imageUrl, jobId) => assignFaceReference(imageUrl, jobId),
      useAsStyleReference: (imageUrl, jobId) => assignStyleReference(imageUrl, jobId),
      useAsCharacterReference: (imageUrl, jobId) => assignCharacterReference(imageUrl, jobId),
      refreshCredits: updateCredits,
      refreshHistory: loadHistory,
      refreshCollections: loadCollections,
      getCollections: () => state.collections,
      getHistory: () => state.history
    };
    if (window.ModelPromptForgeSharedTemplatesPanel?.init) {
      window.ModelPromptForgeSharedTemplatesPanel.init();
    }
    window.dispatchEvent(new CustomEvent('modelpromptforge:ready'));

  } catch (error) {
    console.error("Initialization failed:", error);
    const container = document.getElementById("form-container");
    container.innerHTML = `
      <div style="color: var(--neon-pink); padding: 2rem; text-align: center;">
        <h3>Failed to load application data</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-weight: bold;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// Validate mandatory required fields (Step 8)
function validateForm() {
  // Validate Engine Selectors (Step 12)
  const apiProviderSelect = document.getElementById("api-provider-select");
  const apiSubmodelSelect = document.getElementById("api-submodel-select");

  if (apiProviderSelect && (!apiProviderSelect.value || apiProviderSelect.value.trim() === "")) {
    apiProviderSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    const formField = apiProviderSelect.closest(".form-field");
    if (formField) {
      formField.classList.remove("required-flash");
      void formField.offsetWidth;
      formField.classList.add("required-flash");
      setTimeout(() => {
        formField.classList.remove("required-flash");
      }, 3000);
    }
    apiProviderSelect.focus();
    void AppDialog.alert("Please select both a Provider Engine and a Submodel Version before generating an image.", { title: "Model Required" });
    return false;
  }

  if (apiSubmodelSelect && (!apiSubmodelSelect.value || apiSubmodelSelect.value.trim() === "")) {
    apiSubmodelSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    const formField = apiSubmodelSelect.closest(".form-field");
    if (formField) {
      formField.classList.remove("required-flash");
      void formField.offsetWidth;
      formField.classList.add("required-flash");
      setTimeout(() => {
        formField.classList.remove("required-flash");
      }, 3000);
    }
    apiSubmodelSelect.focus();
    void AppDialog.alert("Please select both a Provider Engine and a Submodel Version before generating an image.", { title: "Model Required" });
    return false;
  }

  // If a template is active, bypass standard selections validations (Scene-004)
  if (state.mode === "normal" && window.ModelPromptForgeSceneReplacementChecklist?.isTemplateWorkflowActive()) {
    const resolved = window.ModelPromptForgeSceneReplacementChecklist.getResolvedPayload();
    if (!resolved || !resolved.success) {
      void AppDialog.alert("Please fill in all required template variables first.", { title: "Template Incomplete" });
      return false;
    }
    return true;
  }

  const activeModel = getActiveModelConfig();
  const outfitValidation = window.ModelPromptForgeOutfitReferenceController
    ?.validateOutfitReferenceState?.(activeModel);
  if (outfitValidation && !outfitValidation.valid) {
    const panel = document.getElementById("outfit-reference-upload-container");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    void AppDialog.alert(outfitValidation.message, { title: "Outfit Reference" });
    return false;
  }
  if (activeModel) {
    const capabilities = activeModel.capabilities || {};
    const activeReferences = [
      ...(state.imageReferences.faceMatch ? [state.faceReferenceImageA, state.faceReferenceImageB] : []),
      ...(state.mode === "character-sheet" && state.imageReferences.outfitReference
        ? [state.outfitReferenceImageFront, state.outfitReferenceImageBack]
        : []),
      ...((state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch))
        ? [state.styleReferenceImageA, state.styleReferenceImageB]
        : []),
      ...(isStoryCharacterReferenceActive() ? [state.characterReferenceImageA, state.characterReferenceImageB] : [])
    ].filter(Boolean);
    const uniqueReferenceCount = new Set(activeReferences).size;
    const maxReferences = Number(capabilities.maxReferenceImages || 0);
    if (uniqueReferenceCount > maxReferences) {
      apiSubmodelSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      void AppDialog.alert(`${getLocalizedLabel(activeModel.displayName)} supports up to ${maxReferences} unique reference images. Please remove ${uniqueReferenceCount - maxReferences} reference image(s).`, { title: "Reference Limit" });
      return false;
    }
    if (Array.isArray(capabilities.aspectRatios) && !capabilities.aspectRatios.includes(state.aspectRatio)) {
      void AppDialog.alert(`${getLocalizedLabel(activeModel.displayName)} does not support aspect ratio ${state.aspectRatio}. Please select another ratio or model.`, { title: "Unsupported Aspect Ratio" });
      return false;
    }
  }

  const required = [
    { field: "Ethnicity", group: "Character" },
    { field: "Gender", group: "Character" }
  ];
  if (state.mode === "normal" && state.sceneBuilder?.authoringMode === "manual") {
    return true;
  }
  const characterReferenceOwnsIdentity = isStoryCharacterReferenceActive()
    && !state.characterReferenceOverrides;

  for (const req of required) {
    const id = `select-${req.group.toLowerCase()}-${req.field.toLowerCase().replace(/\s+/g, "-")}`;
    const selectEl = document.getElementById(id);
    const isReferenceOwned = req.group === "Character" && characterReferenceOwnsIdentity;

    // A reference-owned or otherwise disabled field is not user-actionable and
    // must never block generation validation.
    if (isReferenceOwned || selectEl?.disabled) continue;

    const isSelected = state.selections[req.field] && state.selections[req.field].value && state.selections[req.field].value.trim() !== "";
    if (!isSelected) {
      if (selectEl) {
        // Expand the accordion parent
        const accordion = selectEl.closest(".accordion");
        if (accordion && !accordion.classList.contains("active")) {
          // Open it
          accordion.classList.add("active");
          const content = accordion.querySelector(".accordion-content");
          if (content) {
            content.style.maxHeight = content.scrollHeight + "px";
          }
        }

        // Smooth scroll to it
        selectEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight the select wrapper with flashing neon red
        const formField = selectEl.closest(".form-field");
        if (formField) {
          formField.classList.remove("required-flash");
          void formField.offsetWidth; // trigger reflow
          formField.classList.add("required-flash");
          setTimeout(() => {
            formField.classList.remove("required-flash");
          }, 3000);
        }

        // Focus the select input
        selectEl.focus();
      }
      return false; // Validation failed
    }
  }
  return true; // Validation passed
}

// Bind event listeners
function bindEvents() {
  bindDynamicFormEvents();

  // Template select
  document.getElementById("template-select").addEventListener("change", () => {
    updatePromptPreview();
  });

  // Dynamic Submodels loading based on API Engine switch
  const apiProviderSelect = document.getElementById("api-provider-select");
  const apiSubmodelSelect = document.getElementById("api-submodel-select");
  if (apiProviderSelect) {
    apiProviderSelect.addEventListener("change", () => {
      updateSubmodelList();
    });
  }
  if (apiSubmodelSelect) {
    apiSubmodelSelect.addEventListener("change", () => {
      applyModelCapabilityControls();
    });
  }
  const imageResolutionSelect = document.getElementById("image-resolution-select");
  if (imageResolutionSelect) {
    imageResolutionSelect.addEventListener("change", updatePromptPreview);
  }

  // Aspect Ratio Chips & Linked Dimensions
  const aspectChips = document.querySelectorAll("#aspect-ratio-group .option-chip");
  const inputWidth = document.getElementById("input-width");
  const inputHeight = document.getElementById("input-height");

  const updateDimensionsForRatio = (ratio) => {
    if (!inputWidth || !inputHeight) return;
    const defaults = {
      "1:1": [1024, 1024],
      "16:9": [1920, 1080],
      "9:16": [1080, 1920],
      "6:8": [768, 1024],
      "4:5": [1024, 1280]
    };
    const dims = defaults[ratio] || [768, 1024];
    inputWidth.value = dims[0];
    inputHeight.value = dims[1];
  };

  aspectChips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (chip.getAttribute("aria-disabled") === "true") {
        void AppDialog.alert(chip.title || "The selected model does not support this aspect ratio.", { title: "Unsupported Aspect Ratio" });
        return;
      }
      aspectChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.aspectRatio = chip.getAttribute("data-ratio");
      updateDimensionsForRatio(state.aspectRatio);
      updatePromptPreview();
    });
  });

  // Handle width/height linked input modifications
  const handleDimensionInput = (changedField) => {
    if (!inputWidth || !inputHeight) return;
    let width = parseInt(inputWidth.value, 10) || 768;
    let height = parseInt(inputHeight.value, 10) || 1024;

    const parts = state.aspectRatio.split(":").map(Number);
    const ratio = parts[0] / parts[1];

    if (changedField === "width") {
      height = Math.round(width / ratio);
      height = Math.round(height / 8) * 8;
      if (height < 720) height = 720;
      if (height > 4096) height = 4096;
      inputHeight.value = height;
    } else {
      width = Math.round(height * ratio);
      width = Math.round(width / 8) * 8;
      if (width < 720) width = 720;
      if (width > 4096) width = 4096;
      inputWidth.value = width;
    }
  };

  if (inputWidth) {
    inputWidth.addEventListener("input", () => handleDimensionInput("width"));
  }
  if (inputHeight) {
    inputHeight.addEventListener("input", () => handleDimensionInput("height"));
  }

  // Preset selector load button
  const btnLoadPreset = document.getElementById("btn-load-preset");
  if (btnLoadPreset) {
    btnLoadPreset.addEventListener("click", () => {
      const presetSelect = document.getElementById("preset-select");
      const presetName = presetSelect ? presetSelect.value : "";
      if (!presetName) return;
      const preset = state.presets ? state.presets[presetName] : null;
      if (preset) {
        const randomizedPreset = randomizePresetSelections(preset, presetName);
        importConfigJSON(JSON.stringify(randomizedPreset));
      }
    });
  }

  // Image Reference Checkboxes & File uploads (Step 9)
  const refFace = document.getElementById("ref-face-match");
  const refStyle = document.getElementById("ref-style-match");
  const refPose = document.getElementById("ref-pose-match");
  const faceUploadContainer = document.getElementById("face-match-upload-container");
  const faceFileInput = document.getElementById("face-match-file");
  const btnClearFace = document.getElementById("btn-clear-face-match");

  const updateRefState = () => {
    state.imageReferences.faceMatch = refFace.checked;
    state.imageReferences.styleMatch = refStyle.checked;
    state.imageReferences.poseMatch = refPose.checked;

    if (faceUploadContainer) {
      faceUploadContainer.style.display = refFace.checked ? "block" : "none";
    }
    if (!refFace.checked) {
      clearFaceReferenceState();
    }

    refreshReferenceAuthorityUI();
    updatePromptPreview();
  };

  refFace.addEventListener("change", updateRefState);
  refStyle.addEventListener("change", updateRefState);
  refPose.addEventListener("change", updateRefState);

  const storyCharacterReference = document.getElementById("story-use-character-reference");
  const characterReferenceFile = document.getElementById("character-reference-file");
  const btnClearCharacterReference = document.getElementById("btn-clear-character-reference");
  if (storyCharacterReference) {
    storyCharacterReference.addEventListener("change", () => {
      state.imageReferences.characterReference = storyCharacterReference.checked && state.mode === "normal";
      if (!state.imageReferences.characterReference) {
        clearCharacterReferenceState();
      }
      refreshReferenceAuthorityUI();
      updatePromptPreview();
    });
  }

  if (characterReferenceFile) {
    characterReferenceFile.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file || state.mode !== "normal") return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64 = loadEvent.target.result.split(',')[1];
        if (!state.characterReferenceImageA) {
          state.characterReferenceImageA = base64;
          state.characterReferenceJobIds[0] = null;
        } else {
          state.characterReferenceImageB = base64;
          state.characterReferenceJobIds[1] = null;
        }
        storyCharacterReference.checked = true;
        state.imageReferences.characterReference = true;
        characterReferenceFile.value = "";
        updateReferencePreviewsUI();
        refreshReferenceAuthorityUI();
        updatePromptPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnClearCharacterReference) {
    btnClearCharacterReference.addEventListener("click", () => {
      clearCharacterReferenceState();
      updatePromptPreview();
    });
  }

  // Handle slot close/clear button clicks (Step 9)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-clear-slot")) {
      const slot = e.target.getAttribute("data-slot");
      if (slot === "outfitFront" || slot === "outfitBack") return;
      if (slot === "faceA") {
        state.faceReferenceImageA = null;
        state.faceReferenceJobIds[0] = null;
      } else if (slot === "faceB") {
        state.faceReferenceImageB = null;
        state.faceReferenceJobIds[1] = null;
      } else if (slot === "styleA") {
        state.styleReferenceImageA = null;
        state.styleReferenceJobIds[0] = null;
      } else if (slot === "styleB") {
        state.styleReferenceImageB = null;
        state.styleReferenceJobIds[1] = null;
      } else if (slot === "characterA") {
        state.characterReferenceImageA = null;
        state.characterReferenceJobIds[0] = null;
      } else if (slot === "characterB") {
        state.characterReferenceImageB = null;
        state.characterReferenceJobIds[1] = null;
      }
      if (!state.characterReferenceImageA && !state.characterReferenceImageB) {
        clearCharacterReferenceState({ updateUI: false });
      }
      updateReferencePreviewsUI();
      refreshReferenceAuthorityUI();
      updatePromptPreview();
    }
  });

  if (faceFileInput) {
    faceFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        refFace.checked = true;
        state.imageReferences.faceMatch = true;
        state.faceReferenceImageA = evt.target.result.split(',')[1];
        state.faceReferenceJobIds[0] = null;
        if (faceUploadContainer) faceUploadContainer.style.display = "block";
        updateReferencePreviewsUI();
        refreshReferenceAuthorityUI();
        updatePromptPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnClearFace) {
    btnClearFace.addEventListener("click", () => {
      if (faceFileInput) faceFileInput.value = "";
      state.faceReferenceImageA = null;
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = [];
      updateReferencePreviewsUI();
    });
  }

  // NSFW Toggle
  const toggleNsfw = document.getElementById("toggle-nsfw");
  const nsfwAccordion = document.getElementById("accordion-nsfw");
  if (toggleNsfw) {
    toggleNsfw.checked = false;
    toggleNsfw.disabled = true;
  }
  if (nsfwAccordion) {
    nsfwAccordion.style.display = "none";
  }

  const updateNsfwState = () => {
    if (!toggleNsfw) return;
    const isNsfwEnabled = toggleNsfw.checked;
    if (nsfwAccordion) {
      nsfwAccordion.style.display = isNsfwEnabled ? "block" : "none";
    }

    if (!isNsfwEnabled) {
      const nsfwSelects = document.querySelectorAll("#accordion-nsfw .custom-select");
      nsfwSelects.forEach(select => {
        const fieldName = select.getAttribute("data-field");
        select.value = "";
        delete state.selections[fieldName];
        const customInput = select.closest(".form-field").querySelector(".custom-writein-input");
        if (customInput) {
          customInput.value = "";
          customInput.style.display = "none";
        }
      });
      updateAccordionSummaryBadges("NSFW");
    }
    updatePromptPreview();
  };

  if (toggleNsfw) toggleNsfw.addEventListener("change", updateNsfwState);

  // Language Change Subscriber
  window.addEventListener('modelpromptforge:languagechange', (event) => {
    const newLang = event.detail.locale;
    const openAccordionIds = [...document.querySelectorAll('#form-container .accordion.active')]
      .map(accordion => accordion.id)
      .filter(Boolean);
    state.language = newLang;
    const currentProvider = document.getElementById("api-provider-select")?.value;
    const currentModel = document.getElementById("api-submodel-select")?.value;
    populateProviderList(currentProvider);
    updateSubmodelList(currentModel);
    renderForm();
    bindDynamicFormEvents();
    restoreSelectionsToUI();
    openAccordionIds.forEach(id => document.getElementById(id)?.classList.add('active'));
    updateColorPickerUI();
    enforceModeReferencePolicy({ updateUI: false });
    toggleUIForMode();
    refreshReferenceAuthorityUI();
    updateReferencePreviewsUI();
    updateLightboxNavigationLabels();
    updatePromptPreview();
  });

  // Panel Collapsible Actions
  const btnToggleDashboard = document.getElementById("btn-toggle-dashboard");
  const visualDashboard = document.getElementById("visual-dashboard");
  if (btnToggleDashboard && visualDashboard) {
    btnToggleDashboard.addEventListener("click", () => {
      visualDashboard.classList.toggle("collapsed");
      const icon = btnToggleDashboard.querySelector(".toggle-icon");
      if (icon) {
        icon.textContent = visualDashboard.classList.contains("collapsed") ? "▲" : "▼";
      }
    });
  }

  const btnFloatingConfig = document.getElementById("btn-floating-config");
  const creativeConfigurator = document.getElementById("creative-configurator");
  if (btnFloatingConfig && creativeConfigurator) {
    btnFloatingConfig.addEventListener("click", () => {
      creativeConfigurator.classList.remove("collapsed");
      btnFloatingConfig.style.display = "none";
      setTimeout(() => {
        creativeConfigurator.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    });
  }

  const btnViewportUseFace = document.getElementById("btn-viewport-use-face");
  const btnViewportUseStyle = document.getElementById("btn-viewport-use-style");
  const btnViewportUseCharacter = document.getElementById("btn-viewport-use-character");

  if (btnViewportUseFace) {
    btnViewportUseFace.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none") {
        const meta = state.activeViewportJobMeta;
        if (meta && meta.mode === "headshot") {
          window.ModelPromptForgeCrossModeHandoff?.showHandoffConfirmation(meta, "build-character");
        } else {
          assignFaceReference(img.src, state.activeJobId);
          btnViewportUseFace.textContent = "👤 Face Locked!";
          setTimeout(() => { btnViewportUseFace.textContent = "👤 Use as Face Ref"; }, 1500);
        }
      }
    });
  }

  if (btnViewportUseStyle) {
    btnViewportUseStyle.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none") {
        assignStyleReference(img.src, state.activeJobId);
        btnViewportUseStyle.textContent = "🖼️ Style Locked!";
        setTimeout(() => { btnViewportUseStyle.textContent = "🖼️ Use as Style Ref"; }, 1500);
      }
    });
  }

  if (btnViewportUseCharacter) {
    btnViewportUseCharacter.addEventListener("click", () => {
      const img = document.getElementById("generated-image");
      if (img && img.src && img.style.display !== "none") {
        const meta = state.activeViewportJobMeta;
        if (meta && meta.mode === "character-sheet") {
          window.ModelPromptForgeCrossModeHandoff?.showHandoffConfirmation(meta, "use-as-scene-character");
        } else if (state.mode === "normal") {
          assignCharacterReference(img.src, state.activeJobId);
          btnViewportUseCharacter.textContent = "📋 Character Added!";
          setTimeout(() => { btnViewportUseCharacter.textContent = "📋 Use as Character Ref"; }, 1500);
        }
      }
    });
  }

  // Lightbox Loopback action listeners (Step 9)
  const btnLightboxUseFace = document.getElementById("btn-lightbox-use-face");
  const btnLightboxUseStyle = document.getElementById("btn-lightbox-use-style");
  const btnLightboxUseCharacter = document.getElementById("btn-lightbox-use-character");

  if (btnLightboxUseFace) {
    btnLightboxUseFace.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        if (activeItem && activeItem.mode === "headshot") {
          closeLightbox();
          window.ModelPromptForgeCrossModeHandoff?.showHandoffConfirmation(activeItem, "build-character");
        } else {
          assignFaceReference(img.src, activeItem ? activeItem.id : null);
          closeLightbox();
        }
      }
    });
  }

  if (btnLightboxUseStyle) {
    btnLightboxUseStyle.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        assignStyleReference(img.src, activeItem ? activeItem.id : null);
        closeLightbox();
      }
    });
  }

  if (btnLightboxUseCharacter) {
    btnLightboxUseCharacter.addEventListener("click", () => {
      const img = document.getElementById("lightbox-image");
      if (img && img.src && lightboxModal.style.display !== "none") {
        const activeItem = lightboxModal.activeItem;
        if (activeItem && activeItem.mode === "character-sheet") {
          closeLightbox();
          window.ModelPromptForgeCrossModeHandoff?.showHandoffConfirmation(activeItem, "use-as-scene-character");
        } else if (state.mode === "normal") {
          assignCharacterReference(img.src, activeItem ? activeItem.id : null);
          closeLightbox();
        }
      }
    });
  }

  // Generate Image Button (Background Queue & SSE Streaming Integration)
  const btnGenerateImage = document.getElementById("btn-generate-image");
  if (btnGenerateImage) {
    btnGenerateImage.addEventListener("click", async () => {
      if (window.ModelPromptForgeStudioEngineTargetPanel?.isComparisonActive?.()) {
        await window.ModelPromptForgeStudioEngineTargetPanel.submitComparison();
        return;
      }
      const provider = document.getElementById("api-provider-select").value;
      const submodel = document.getElementById("api-submodel-select").value;
      const loader = document.getElementById("image-loading-overlay");
      const img = document.getElementById("generated-image");
      const placeholder = document.getElementById("viewport-placeholder");
      const errBanner = document.getElementById("viewport-error");
      const telemetryBar = document.getElementById("telemetry-bar");
      const btnDownload = document.getElementById("btn-download-image");
      const queueList = document.getElementById("active-queue-list");
      const generationSurface = state.generationSurface === 'playground' ? 'playground' : 'studio';
      const publishGenerationStatus = (type, detail = {}) => {
        document.dispatchEvent(new CustomEvent('modelpromptforge:generation-status', {
          detail: { type, surface: generationSurface, ...detail }
        }));
      };

      if (!validateForm()) {
        return;
      }

      errBanner.style.display = "none";
      const errorDetails = document.getElementById("error-details");
      const errorTechnicalMessage = document.getElementById("error-technical-message");
      if (errorDetails && errorTechnicalMessage) {
        errorDetails.open = false;
        errorDetails.style.display = "none";
        errorTechnicalMessage.textContent = "";
      }
      placeholder.style.display = "none";
      img.style.display = "none";
      btnDownload.style.display = "none";
      telemetryBar.style.display = "none";
      loader.style.display = "flex";
      if (window.ModelPromptForgeCrossModeHandoff?.clearViewportHandoffActions) {
        window.ModelPromptForgeCrossModeHandoff.clearViewportHandoffActions();
      }

      if (creativeConfigurator) {
        creativeConfigurator.classList.add("collapsed");
      }
      if (visualDashboard) {
        visualDashboard.classList.remove("collapsed");
      }
      if (btnFloatingConfig) {
        btnFloatingConfig.style.display = "block";
      }
      if (generationSurface === 'playground') {
        document.getElementById('playground-generation-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        scrollToActiveRenderScreen();
      }

      const startTime = performance.now();
      const generationActorId = getActiveActorId();
      const isSameGenerationActor = () => getActiveActorId() === generationActorId;

      try {
        const generationPayload = getGenerationRequestPayload();
        publishGenerationStatus('submitted', { provider, submodel });
        const pricingInputs = window.getGenerationPricingInputs?.(generationPayload);
        const estimate = await window.creditEstimateController?.ensureEstimate(pricingInputs);
        if (!estimate) {
          const pricingError = window.creditEstimateController?.getState?.().error;
          throw new Error(pricingError?.message || 'Credit pricing is unavailable for this generation request.');
        }
        generationPayload.estimateId = estimate.estimateId;
        generationPayload.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        Object.assign(generationPayload, pricingInputs);
        const submittedReferenceJobIds = {
          face: generationPayload.faceReferenceJobIds,
          style: generationPayload.styleReferenceJobIds,
          character: generationPayload.characterReferenceJobIds,
          outfit: generationPayload.outfitReferenceJobIds
        };

        const response = await apiFetch('/api/generate', {
          method: 'POST',
          headers: {
            'X-User-Role': state.userRole
          },
          body: generationPayload
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Generation failed");
        }

        const jobId = data.jobId;
        void window.creditBalanceBadge?.refresh?.();
        publishGenerationStatus('queued', { jobId, provider, submodel });

        const jobCard = document.createElement("div");
        jobCard.className = "queue-item";
        jobCard.id = `queue-${jobId}`;
        jobCard.innerHTML = `
          <div class="queue-item-left">
            <div class="queue-spinner"></div>
            <span>Job #${jobId.substring(4, 9)}: Processing...</span>
          </div>
          <span class="queue-badge-status processing">Processing</span>
        `;
        queueList.appendChild(jobCard);

        let pollTimer = null;
        let sseSource;
        if (data.providerStreaming === true) {
          sseSource = new EventSource(appendActorQuery(`/api/jobs/${jobId}/stream`));
        } else {
          sseSource = new EventTarget();
          sseSource.close = () => {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
          };

          const pollJobStatus = async () => {
            try {
              if (!isSameGenerationActor()) {
                sseSource.close();
                jobCard.remove();
                return;
              }
              const statusResponse = await apiFetch(appendActorQuery(`/api/jobs/${jobId}`));
              if (!statusResponse.ok) {
                if (statusResponse.status === 404) {
                  sseSource.dispatchEvent(new MessageEvent('job.failed', {
                    data: JSON.stringify({
                      code: 'job_status_not_found',
                      message: 'Generation status is no longer available. The local server may have restarted before this job finished.'
                    })
                  }));
                  return;
                }
                throw new Error(`Unable to read generation status (${statusResponse.status}).`);
              }
              const statusPayload = await statusResponse.json();

              if (statusPayload.status === 'completed') {
                sseSource.dispatchEvent(new MessageEvent('image_generation.completed', {
                  data: JSON.stringify({
                    type: 'image_generation.completed',
                    ...(statusPayload.result || {})
                  })
                }));
              } else if (statusPayload.status === 'failed') {
                sseSource.dispatchEvent(new MessageEvent('job.failed', {
                  data: JSON.stringify(statusPayload.error || {})
                }));
              } else {
                sseSource.dispatchEvent(new MessageEvent('status', {
                  data: JSON.stringify({ status: statusPayload.status })
                }));
              }
            } catch { }
          };

          pollTimer = setInterval(pollJobStatus, 1000);
          pollJobStatus();
        }

        sseSource.addEventListener('status', (e) => {
          if (!isSameGenerationActor()) {
            sseSource.close();
            jobCard.remove();
            return;
          }
          const payload = JSON.parse(e.data);
          const label = jobCard.querySelector("span");
          if (label) {
            label.textContent = `Job #${jobId.substring(4, 9)}: ${payload.status}...`;
          }
        });

        const renderPartialImage = (e) => {
          if (!isSameGenerationActor()) {
            sseSource.close();
            jobCard.remove();
            return;
          }
          const payload = JSON.parse(e.data);
          if (payload.b64_json) {
            loader.style.display = "none";
            img.src = `data:image/png;base64,${payload.b64_json}`;
            img.style.display = "block";
            publishGenerationStatus('partial', {
              jobId,
              imageUrl: `data:image/png;base64,${payload.b64_json}`,
              provider,
              submodel
            });
          }
        };

        if (data.providerStreaming === true) {
          sseSource.addEventListener('image_generation.partial_image', renderPartialImage);
          sseSource.addEventListener('image_edit.partial_image', renderPartialImage);
        }

        sseSource.addEventListener('image_generation.completed', (e) => {
          const payload = JSON.parse(e.data);
          sseSource.close();
          jobCard.remove();
          if (!isSameGenerationActor()) {
            loader.style.display = "none";
            return;
          }

          const endTime = performance.now();
          const durationSec = ((endTime - startTime) / 1000).toFixed(1);

          state.activeJobId = jobId;
          const vpActions = document.getElementById("viewport-loopback-actions");
          if (vpActions) vpActions.style.display = "flex";

          const finalImgSrc = payload.imageUrl || (payload.b64_json ? `data:image/png;base64,${payload.b64_json}` : '');
          img.src = finalImgSrc;
          img.style.display = "block";
          btnDownload.style.display = "block";
          loader.style.display = "none";

          const jobMeta = {
            id: jobId,
            prompt: generationPayload.sceneBuilder?.manualPromptText || generationPayload.adminPromptOverride || getEditablePromptText(),
            imageUrl: finalImgSrc,
            timestamp: Date.now(),
            provider,
            submodel,
            mode: generationPayload.mode,
            generationSurface,
            selections: JSON.parse(JSON.stringify(generationPayload.selections || {})),
            referencedFaceJobIds: submittedReferenceJobIds.face,
            referencedStyleJobIds: submittedReferenceJobIds.style,
            referencedCharacterJobIds: submittedReferenceJobIds.character,
            referencedOutfitJobIds: submittedReferenceJobIds.outfit,
            generationDuration: durationSec
          };
          state.activeViewportJobMeta = jobMeta;
          publishGenerationStatus('completed', { jobId, job: jobMeta });

          img.onclick = () => openLightbox(jobMeta);

          if (window.ModelPromptForgeCrossModeHandoff?.renderViewportHandoffActions) {
            window.ModelPromptForgeCrossModeHandoff.renderViewportHandoffActions(jobMeta);
          }

          document.getElementById("tel-model").textContent = submodel;
          document.getElementById("tel-time").textContent = `${durationSec}s`;
          document.getElementById("tel-aspect").textContent = state.aspectRatio;
          telemetryBar.style.display = "flex";

          updateCredits();
          loadCollections();
          loadHistory();

          // Log remix event if template remix is active
          if (window.activeRemixContext) {
            const remixPayload = {
              templateId: window.activeRemixContext.templateId,
              sourcePostId: window.activeRemixContext.sourcePostId,
              username: state.username || 'user_demo',
              generatedJobId: jobId
            };
            apiFetch('/api/scene-templates/remix-events', {
              method: 'POST',
              body: remixPayload
            }).then(r => {
              if (r.ok) {
                console.log('[Remix Analytics] Successfully logged remix event for job:', jobId);
              }
            }).catch(err => {
              console.error('[Remix Analytics] Failed to log remix event:', err);
            });
            window.activeRemixContext = null;
          }
        });

        sseSource.addEventListener('job.failed', (e) => {
          if (!isSameGenerationActor()) {
            sseSource.close();
            jobCard.remove();
            loader.style.display = "none";
            return;
          }
          let errorMsg = "Generation failed";
          let technicalMessage = "";
          let creditRefunded = false;
          try {
            const payload = JSON.parse(e.data);
            const rawMessage = payload.message || payload.error || errorMsg;
            technicalMessage = [
              payload.code ? `Code: ${payload.code}` : '',
              payload.requestId ? `Request ID: ${payload.requestId}` : '',
              payload.safetyViolations?.length
                ? `Safety: ${payload.safetyViolations.join(', ')}`
                : '',
              rawMessage
            ].filter(Boolean).join(' | ');
            creditRefunded = payload.creditRefunded === true;
            errorMsg = payload.code === 'moderation_blocked'
              ? `This image did not pass the safety check. Please adjust the prompt or reference image.${creditRefunded ? ' Your credit was refunded.' : ''}`
              : rawMessage;
          } catch { }

          sseSource.close();
          jobCard.remove();
          loader.style.display = "none";
          img.removeAttribute("src");
          img.style.display = "none";
          btnDownload.style.display = "none";
          telemetryBar.style.display = "none";

          const vpActions = document.getElementById("viewport-loopback-actions");
          if (vpActions) vpActions.style.display = "none";

          errBanner.style.display = "flex";
          document.getElementById("error-message").textContent = errorMsg;
          const errorDetails = document.getElementById("error-details");
          const errorTechnicalMessage = document.getElementById("error-technical-message");
          if (errorDetails && errorTechnicalMessage) {
            errorDetails.open = false;
            errorDetails.style.display = technicalMessage ? "block" : "none";
            errorTechnicalMessage.textContent = technicalMessage;
          }
          placeholder.style.display = "flex";
          updateCredits();
          publishGenerationStatus('failed', {
            jobId,
            error: { message: errorMsg, technicalMessage }
          });
        });

        if (data.providerStreaming === true) {
          sseSource.addEventListener('error', () => {});
        }

      } catch (err) {
        loader.style.display = "none";
        errBanner.style.display = "flex";
        document.getElementById("error-message").textContent = err.message;
        placeholder.style.display = "flex";
        publishGenerationStatus('failed', { error: { message: err.message } });
      }
    });
  }

  // GPT-Safe Toggle
  const toggleGptSafe = document.getElementById("toggle-gpt-safe");
  if (toggleGptSafe) {
    toggleGptSafe.checked = false;
    toggleGptSafe.disabled = true;
    toggleGptSafe.addEventListener("change", () => {
      state.schema.forEach(groupObj => {
        updateAccordionSummaryBadges(groupObj.group);
      });
      updatePromptPreview();
    });
  }

  // Copy buttons
  document.getElementById("btn-copy").addEventListener("click", () => {
    copyPromptToClipboard();
  });

  document.getElementById("btn-copy-json").addEventListener("click", () => {
    copyPromptAsJSON();
  });

  // Random / Surprise Me Button
  document.getElementById("btn-random").addEventListener("click", () => {
    randomizeSelections();
  });

  // Reset Button
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetForm();
  });

  // Export JSON Button
  document.getElementById("btn-export").addEventListener("click", () => {
    exportConfigJSON();
  });

  // Import JSON Button
  document.getElementById("btn-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      importConfigJSON(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Mode Selection Chips
  document.querySelectorAll(".mode-chip[data-mode]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".mode-chip[data-mode]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      saveCurrentModeState();
      state.mode = chip.getAttribute("data-mode");

      state.isRestoringState = true;
      restoreCurrentModeState();
      state.isRestoringState = false;

      enforceModeReferencePolicy({ updateUI: false });
      rerenderDynamicForm({ preserveOpenAccordions: false });
      updatePromptPreview();
    });
  });
}

function randomizeSelections() {
  Object.keys(state.selections).forEach(field => {
    if (!state.lockedFields.has(field)) {
      delete state.selections[field];
    }
  });

  document.querySelectorAll("#form-container select.custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    if (!state.lockedFields.has(fieldName)) {
      select.value = "";
      const customInput = select.closest(".form-field").querySelector(".custom-writein-input");
      if (customInput) {
        customInput.value = "";
        customInput.style.display = "none";
      }
    }
  });

  document.querySelectorAll(".accordion-badge").forEach(badge => {
    badge.textContent = "";
    badge.style.display = "none";
  });

  const isFaceLocked = state.imageReferences.faceMatch;
  const faceFields = ["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile", "Expression"];

  document.querySelectorAll("#form-container select.custom-select").forEach(select => {
    const fieldName = select.getAttribute("data-field");
    const groupName = select.getAttribute("data-group");

    if (select.disabled || (isFaceLocked && faceFields.includes(fieldName))) return;
    if (state.lockedFields.has(fieldName)) return;
    if (Math.random() > 0.65) return;

    let options = Array.from(select.options).filter(opt => opt.value !== "" && opt.value !== "__custom__");

    if (fieldName === "Ethnicity") {
      const asianIds = ["character.007", "character.008", "character.009", "character.010", "character.011"];
      options = options.filter(opt => asianIds.includes(opt.value));
    }

    if (options.length === 0) return;

    const randomOpt = options[Math.floor(Math.random() * options.length)];
    select.value = randomOpt.value;

    const promptVal = randomOpt.getAttribute("data-prompt");
    state.selections[fieldName] = { id: randomOpt.value, value: promptVal, isCustom: false, group: groupName };
    updateAccordionSummaryBadges(groupName);
  });

  updatePromptPreview();
}

function copyPromptAsJSON() {
  const textVal = getEditablePromptText();
  if (textVal === "") return;

  const currentTemplateName = document.getElementById("template-select").value || "portrait";
  const structuredAttrs = {};

  Object.keys(state.selections).forEach(fieldName => {
    const selection = state.selections[fieldName];
    const group = selection.group;

    if (!structuredAttrs[group]) {
      structuredAttrs[group] = {};
    }
    structuredAttrs[group][fieldName] = {
      id: selection.id,
      prompt_value: getPromptValueForSelection(selection, fieldName)
    };
  });

  const refAttrs = {};
  if (state.imageReferences.faceMatch) refAttrs["Face Match"] = "100% Identity Lock Active";
  if (state.imageReferences.styleMatch) refAttrs["Style Match"] = "Style & Outfit Match Active";
  if (state.imageReferences.poseMatch) refAttrs["Pose Match"] = "Pose & Composition Match Active";
  if (isStoryCharacterReferenceActive()) refAttrs["Character Reference"] = "Character Sheet Design Reference Active";
  if (Object.keys(refAttrs).length > 0) {
    structuredAttrs["Image Reference Options"] = refAttrs;
  }

  const jsonPayload = JSON.stringify({
    template: currentTemplateName,
    aspect_ratio: state.aspectRatio,
    attributes: structuredAttrs
  }, null, 2);

  navigator.clipboard.writeText(jsonPayload).then(() => {
    const copyJsonBtn = document.getElementById("btn-copy-json");
    const originalText = copyJsonBtn.textContent;
    copyJsonBtn.textContent = "Copied JSON!";
    copyJsonBtn.classList.add("neon-glow-pink");

    setTimeout(() => {
      copyJsonBtn.textContent = originalText;
      copyJsonBtn.classList.remove("neon-glow-pink");
    }, 1500);
  }).catch(err => {
    console.error("JSON clipboard copy failed:", err);
  });
}

function copyPromptToClipboard() {
  const textVal = getEditablePromptText();
  if (textVal === "") return;

  navigator.clipboard.writeText(textVal).then(() => {
    const copyBtn = document.getElementById("btn-copy");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("neon-glow-pink");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("neon-glow-pink");
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

function toggleUIForMode() {
  const mode = state.mode;
  if (mode !== "normal" && window.ModelPromptForgeSceneReplacementChecklist?.isTemplateWorkflowActive()) {
    window.ModelPromptForgeSceneReplacementChecklist.exitTemplateWorkflow();
  }
  const imageUpload = document.getElementById("image-upload-container");
  const outfitUpload = document.getElementById("outfit-reference-upload-container");
  pruneSelectionsForMode(state.selections, mode);
  updateCharacterSheetSourceStatus();

  if (imageUpload) {
    imageUpload.style.display = mode === "normal" ? "block" : "none";
  }
  if (outfitUpload) {
    outfitUpload.style.display = mode === "character-sheet" ? "block" : "none";
  }
  document.querySelectorAll(".btn-use-character-ref").forEach(button => {
    button.style.display = mode === "normal" ? "inline-flex" : "none";
  });
  ["ref-style-match", "ref-pose-match"].forEach(id => {
    const checkbox = document.getElementById(id);
    const label = checkbox?.closest(".checkbox-container");
    if (label) label.style.display = mode === "normal" ? "inline-flex" : "none";
  });

  const presetsSection = document.querySelector(".presets-section");
  if (presetsSection) {
    presetsSection.style.display = mode === "normal" ? "block" : "none";
  }

  document.querySelectorAll(".accordion").forEach(accordion => {
    const groupName = accordion.dataset.groupName || accordion.id.replace("accordion-", "").replace(/-/g, " ");
    const isNsfwGroup = accordion.getAttribute("data-nsfw-controlled") === "true";
    const toggleNsfw = document.getElementById("toggle-nsfw");
    const isNsfwEnabled = toggleNsfw ? toggleNsfw.checked : false;
    const isVisibleForMode = isGroupAllowedForMode(groupName, mode);

    if (!isVisibleForMode) {
      accordion.style.display = "none";
      accordion.classList.add("hidden-accordion");
    } else if (isNsfwGroup) {
      accordion.style.display = isNsfwEnabled ? "block" : "none";
      accordion.classList.toggle("hidden-accordion", !isNsfwEnabled);
    } else {
      accordion.style.display = "block";
      accordion.classList.remove("hidden-accordion");
    }
  });

  const activeAccordion = document.querySelector(".accordion.active");
  if (activeAccordion && (activeAccordion.classList.contains("hidden-accordion") || activeAccordion.style.display === "none")) {
    activeAccordion.classList.remove("active");
    const firstVisible = Array.from(document.querySelectorAll(".accordion")).find(acc => !acc.classList.contains("hidden-accordion") && acc.style.display !== "none");
    if (firstVisible) {
      firstVisible.classList.add("active");
    }
  }

  if (window.ModelPromptForgeSceneBuilder?.updateUi) {
    window.ModelPromptForgeSceneBuilder.updateUi();
  }
  window.ModelPromptForgeOutfitReferenceController?.renderOutfitReferencePanel?.();
}

function updatePromptPreview() {
  if (state.mode && !state.isRestoringState) {
    saveCurrentModeState();
  }
  updateCharacterSheetSourceStatus();

  const previewBox = document.getElementById("prompt-preview");
  const previewOuter = document.getElementById("preview-outer-container");
  const isUserAdmin = (state.userRole === 'admin');

  const copyBtn = document.getElementById("btn-copy");
  const copyJsonBtn = document.getElementById("btn-copy-json");
  if (copyBtn) copyBtn.disabled = !isUserAdmin;
  if (copyJsonBtn) copyJsonBtn.disabled = !isUserAdmin;

  if (!isUserAdmin) {
    if (previewOuter) previewOuter.style.display = "none";
    return;
  } else {
    if (previewOuter) previewOuter.style.display = "block";
  }

  let compiledPrompt = generatePromptText(true);
  const checklistObj = window.ModelPromptForgeSceneReplacementChecklist;
  if (checklistObj?.isTemplateWorkflowActive?.()) {
    const snapshot = checklistObj.getActiveTemplateSnapshot();
    if (snapshot && (snapshot.promptVisibility === 'remix_only' || !snapshot.finalPromptSnapshot && snapshot.promptVisibility === 'remix_only')) {
      compiledPrompt = "(Prompt text hidden by creator - Remix Only)";
      if (copyBtn) copyBtn.disabled = true;
      if (copyJsonBtn) copyJsonBtn.disabled = true;
    }
  }

  if (previewBox) previewBox.value = compiledPrompt;

  const cleanPrompt = getEditablePromptText().toLowerCase();
  const BANNED_KEYWORDS = [
    { word: "masterpiece", type: "AI Buzzword", suggestion: "Describe specific photographic details instead." },
    { word: "best quality", type: "AI Buzzword", suggestion: "Specify camera brand, lens type, and lighting source." },
    { word: "ultra quality", type: "AI Buzzword", suggestion: "Let the resolution and lens parameters imply quality." },
    { word: "insane detail", type: "AI Buzzword", suggestion: "Explain what is detailed (e.g. skin pores, fabric weave)." },
    { word: "hyper realistic", type: "AI Buzzword", suggestion: "Rely on realistic lighting physics and camera properties." },
    { word: "16k", type: "AI Buzzword", suggestion: "Use standard focal lengths or camera brand names instead." },
    { word: "32k", type: "AI Buzzword", suggestion: "Use standard focal lengths or camera brand names instead." },
    { word: "flawless", type: "Unreal Beauty", suggestion: "Prefer natural textures like 'visible pores' or 'subtle blemishes'." },
    { word: "perfect face", type: "Unreal Beauty", suggestion: "Describe unique features or natural expression." },
    { word: "perfect skin", type: "Unreal Beauty", suggestion: "Use 'natural skin texture' or 'fine baby hairs'." },
    { word: "perfect anatomy", type: "Unreal Beauty", suggestion: "Focus on relaxed postures and candid movement." },
    { word: "perfect symmetry", type: "Unreal Beauty", suggestion: "Embrace 'natural asymmetry' for a photorealistic look." },
    { word: "identical", type: "Geometry Lock", suggestion: "Allow natural variations from perspective, lighting, and expressions." },
    { word: "must match", type: "Geometry Lock", suggestion: "Let the AI blend styling naturally with the environment." },
    { word: "pixel perfect", type: "Geometry Lock", suggestion: "Describe optics like 'creamy bokeh' or 'film grain' for realism." },
    { word: "without distortion", type: "Geometry Lock", suggestion: "Some lens distortion is natural; rely on camera/lens setup." }
  ];

  const detected = [];
  BANNED_KEYWORDS.forEach(rule => {
    const regex = new RegExp(`\\b${rule.word}\\b`, 'i');
    if (regex.test(cleanPrompt)) {
      detected.push(rule);
    }
  });

  const warningContainer = document.getElementById("buzzword-warnings");
  if (warningContainer) {
    if (detected.length > 0 && cleanPrompt !== "") {
      let warningHtml = `<div class="warning-title">⚠️ Photorealistic Warnings:</div>`;
      detected.forEach(rule => {
        warningHtml += `<div class="warning-item">Avoid <strong>"${rule.word}"</strong> (${rule.type}) — ${rule.suggestion}</div>`;
      });
      warningContainer.innerHTML = warningHtml;
      warningContainer.style.display = "flex";
    } else {
      warningContainer.style.display = "none";
    }
  }

  updateDropdownExclusions();
}

function initializeScrollToViewport() {
  const button = document.getElementById('btn-scroll-viewport');
  const visualDashboard = document.getElementById('visual-dashboard');
  if (!button || !visualDashboard) return;

  button.addEventListener('click', () => {
    if (visualDashboard.classList.contains('collapsed')) {
      visualDashboard.classList.remove('collapsed');
      const icon = document.querySelector('#btn-toggle-dashboard .toggle-icon');
      if (icon) icon.textContent = '▼';
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    visualDashboard.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    const heading = visualDashboard.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      setTimeout(() => heading.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
    }
  });
}

function scrollToActiveRenderScreen({ focusHeading = false } = {}) {
  const visualDashboard = document.getElementById('visual-dashboard');
  if (!visualDashboard) return;

  if (visualDashboard.classList.contains('collapsed')) {
    visualDashboard.classList.remove('collapsed');
    const icon = document.querySelector('#btn-toggle-dashboard .toggle-icon');
    if (icon) icon.textContent = '▼';
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => {
    const nav = document.querySelector('.application-nav-shell');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const targetTop = Math.max(
      0,
      visualDashboard.getBoundingClientRect().top + window.scrollY - navHeight - 16
    );
    window.scrollTo({
      top: targetTop,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });

    if (focusHeading) {
      const heading = visualDashboard.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        setTimeout(() => heading.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
      }
    }
  });
}

window.scrollToActiveRenderScreen = scrollToActiveRenderScreen;

function initializeAutoExpandConfigurator() {
  const creativeConfigurator = document.getElementById('creative-configurator');
  const btnFloatingConfig = document.getElementById('btn-floating-config');
  if (!creativeConfigurator || !btnFloatingConfig) return;

  let lastScrollY = window.scrollY;
  let scheduled = false;
  let expanding = false;

  const expandAtPageEnd = () => {
    scheduled = false;
    const currentScrollY = window.scrollY;
    const movingDown = currentScrollY > lastScrollY + 1;
    lastScrollY = currentScrollY;

    if (!movingDown || expanding || !creativeConfigurator.classList.contains('collapsed')) return;

    const documentHeight = document.documentElement.scrollHeight;
    const viewportBottom = currentScrollY + window.innerHeight;
    const threshold = Math.max(96, window.innerHeight * 0.08);
    const nearPageEnd = documentHeight - viewportBottom <= threshold;
    const modalOpen = document.querySelector(
      '.collection-modal[style*="display: flex"], #lightbox-modal[style*="display: flex"]'
    );

    if (!nearPageEnd || modalOpen) return;

    expanding = true;
    creativeConfigurator.classList.remove('collapsed');
    btnFloatingConfig.style.display = 'none';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      creativeConfigurator.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
      window.setTimeout(() => {
        expanding = false;
        lastScrollY = window.scrollY;
      }, reducedMotion ? 0 : 450);
    });
  };

  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(expandAtPageEnd);
  }, { passive: true });
}

// Export functions to window that are called from other modules
window.validateForm = validateForm;
window.toggleUIForMode = toggleUIForMode;
window.updatePromptPreview = updatePromptPreview;
window.initializeScrollToViewport = initializeScrollToViewport;
window.initializeAutoExpandConfigurator = initializeAutoExpandConfigurator;
