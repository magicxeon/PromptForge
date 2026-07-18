/**
 * ModelPromptForge - Generation & Model Catalog Service
 */
(() => {
  const state = window.state;
  const getLocalizedLabel = window.getLocalizedLabel;

  function getActiveProviderConfig() {
    const providerId = document.getElementById("api-provider-select")?.value;
    return state.providerCatalog?.providers?.find(provider => provider.id === providerId) || null;
  }

  function getActiveModelConfig() {
    const modelId = document.getElementById("api-submodel-select")?.value;
    return getActiveProviderConfig()?.models?.find(model => model.id === modelId) || null;
  }

  function getSelectedImageResolution() {
    const model = getActiveModelConfig();
    if (!model?.capabilities?.resolutions?.length) return null;
    return document.getElementById("image-resolution-select")?.value || model.defaults?.resolution || null;
  }

  function getEditablePromptText() {
    if (state.userRole === "admin") {
      const previewBox = document.getElementById("prompt-preview");
      if (previewBox && typeof previewBox.value === "string") {
        return previewBox.value.trim();
      }
    }
    return window.generatePromptText ? window.generatePromptText(true) : "";
  }

  function getGenerationRequestPayload() {
    const sourceOwnership = state.mode === "character-sheet"
      ? (window.getCharacterSheetSourceOwnership ? window.getCharacterSheetSourceOwnership() : null)
      : null;
    const submittedReferenceJobIds = {
      face: state.imageReferences.faceMatch ? (window.uniqueReferenceJobIds ? window.uniqueReferenceJobIds(state.faceReferenceJobIds) : state.faceReferenceJobIds) : [],
      outfit: state.mode === "character-sheet" && state.imageReferences.outfitReference
        ? (window.uniqueReferenceJobIds ? window.uniqueReferenceJobIds(state.outfitReferenceJobIds) : state.outfitReferenceJobIds)
        : [],
      style: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
        ? (window.uniqueReferenceJobIds ? window.uniqueReferenceJobIds(state.styleReferenceJobIds) : state.styleReferenceJobIds)
        : [],
      character: (window.isStoryCharacterReferenceActive && window.isStoryCharacterReferenceActive())
        ? (window.uniqueReferenceJobIds ? window.uniqueReferenceJobIds(state.characterReferenceJobIds) : state.characterReferenceJobIds)
        : []
    };
    return {
      provider: document.getElementById("api-provider-select")?.value || null,
      submodel: document.getElementById("api-submodel-select")?.value || null,
      imageResolution: getSelectedImageResolution(),
      selections: state.selections,
      aspectRatio: state.aspectRatio,
      imageReferences: { ...state.imageReferences, characterOverrides: state.characterReferenceOverrides },
      sourceOwnership,
      mode: state.mode,
      template: document.getElementById("template-select")?.value || "portrait",
      isGptSafe: false,
      username: state.username,
      faceReferenceImageA: state.imageReferences.faceMatch ? state.faceReferenceImageA : null,
      faceReferenceImageB: state.imageReferences.faceMatch ? state.faceReferenceImageB : null,
      faceReferenceJobIds: submittedReferenceJobIds.face,
      outfitReferenceImageFront: state.mode === "character-sheet" && state.imageReferences.outfitReference ? state.outfitReferenceImageFront : null,
      outfitReferenceImageBack: state.mode === "character-sheet" && state.imageReferences.outfitReference ? state.outfitReferenceImageBack : null,
      outfitReferenceJobIds: submittedReferenceJobIds.outfit,
      styleReferenceImageA: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
        ? state.styleReferenceImageA : null,
      styleReferenceImageB: state.mode === "normal" && (state.imageReferences.styleMatch || state.imageReferences.poseMatch)
        ? state.styleReferenceImageB : null,
      styleReferenceJobIds: submittedReferenceJobIds.style,
      characterReferenceImageA: (window.isStoryCharacterReferenceActive && window.isStoryCharacterReferenceActive()) ? state.characterReferenceImageA : null,
      characterReferenceImageB: (window.isStoryCharacterReferenceActive && window.isStoryCharacterReferenceActive()) ? state.characterReferenceImageB : null,
      characterReferenceJobIds: submittedReferenceJobIds.character,
      customColors: state.customColors,
      adminPromptOverride: state.userRole === "admin" ? getEditablePromptText() : null
    };
  }

  function populateProviderList(preferredProvider = null) {
    const providerSelect = document.getElementById("api-provider-select");
    if (!providerSelect) return;
    const previous = preferredProvider || providerSelect.value;
    providerSelect.innerHTML = "";
    (state.providerCatalog?.providers || []).forEach(provider => {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = getLocalizedLabel(provider.displayName);
      providerSelect.appendChild(option);
    });
    const fallback = state.providerCatalog?.defaultProvider || providerSelect.options[0]?.value || "";
    const hasPrevious = (state.providerCatalog?.providers || []).some(provider => provider.id === previous);
    providerSelect.value = hasPrevious ? previous : fallback;
    if (preferredProvider && !hasPrevious) {
      void AppDialog.alert(state.language === "th"
        ? `Provider ${preferredProvider} ไม่พร้อมใช้งาน ระบบเปลี่ยนเป็น Provider เริ่มต้นแล้ว`
        : `Provider ${preferredProvider} is unavailable. The default provider was selected.`, { title: state.language === "th" ? "Provider ไม่พร้อมใช้งาน" : "Provider Unavailable" });
    }
  }

  function updateSubmodelList(preferredModel = null) {
    const providerSelect = document.getElementById("api-provider-select");
    const submodelSelect = document.getElementById("api-submodel-select");
    if (!submodelSelect || !providerSelect) return;

    const previous = preferredModel || submodelSelect.value;
    submodelSelect.innerHTML = "";
    const provider = getActiveProviderConfig();
    (provider?.models || []).forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = getLocalizedLabel(model.displayName);
      submodelSelect.appendChild(opt);
    });

    const hasPrevious = (provider?.models || []).some(model => model.id === previous);
    submodelSelect.value = hasPrevious ? previous : (provider?.defaultModel || submodelSelect.options[0]?.value || "");
    if (preferredModel && !hasPrevious) {
      void AppDialog.alert(state.language === "th"
        ? `Model ${preferredModel} ไม่พร้อมใช้งาน ระบบเปลี่ยนเป็น Model เริ่มต้นแล้ว`
        : `Model ${preferredModel} is unavailable. The default model was selected.`, { title: state.language === "th" ? "Model ไม่พร้อมใช้งาน" : "Model Unavailable" });
    }

    applyModelCapabilityControls();
  }

  function usesProviderResolutionPreset(model = getActiveModelConfig()) {
    return Array.isArray(model?.capabilities?.resolutions) && model.capabilities.resolutions.length > 0;
  }

  function applyModelCapabilityControls() {
    const providerSelect = document.getElementById("api-provider-select");
    const submodelSelect = document.getElementById("api-submodel-select");
    if (!providerSelect || !submodelSelect) return;

    const model = getActiveModelConfig();
    const referencesDisabled = model ? model.capabilities?.imageReferences !== true : true;
    const capabilitySummary = document.getElementById("model-capability-summary");
    if (capabilitySummary) {
      if (!model) {
        capabilitySummary.textContent = "";
      } else {
        const credits = Number(model.estimatedCredits || 1);
        const creditText = state.language === "th"
          ? `${credits} เครดิต`
          : `${credits} credit${credits === 1 ? "" : "s"}`;
        const referenceText = model.capabilities?.imageReferences
          ? (state.language === "th"
            ? `ภาพอ้างอิงสูงสุด ${model.capabilities.maxReferenceImages || 0} ภาพ`
            : `up to ${model.capabilities.maxReferenceImages || 0} references`)
          : (state.language === "th" ? "สร้างจากข้อความเท่านั้น" : "text-to-image only");
        capabilitySummary.textContent = `${creditText} • ${referenceText}`;
      }
    }
    updateAspectRatioCapabilityUI();
    updateImageResolutionControl();

    const refFace = document.getElementById("ref-face-match");
    const refStyle = document.getElementById("ref-style-match");
    const storyCharacterReference = document.getElementById("story-use-character-reference");

    if (referencesDisabled) {
      if (refFace) {
        refFace.checked = false;
        refFace.disabled = true;
        const lbl = refFace.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "0.35";
          lbl.style.pointerEvents = "none";
        }
      }
      if (refStyle) {
        refStyle.checked = false;
        refStyle.disabled = true;
        const lbl = refStyle.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "0.35";
          lbl.style.pointerEvents = "none";
        }
      }
      if (storyCharacterReference) {
        storyCharacterReference.checked = false;
        storyCharacterReference.disabled = true;
        const lbl = storyCharacterReference.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "0.35";
          lbl.style.pointerEvents = "none";
        }
      }

      state.imageReferences.faceMatch = false;
      state.imageReferences.styleMatch = false;
      state.imageReferences.characterReference = false;
      state.characterReferenceOverrides = false;
      state.faceReferenceImageA = null;
      state.faceReferenceImageB = null;
      state.faceReferenceJobIds = [];
      state.styleReferenceImageA = null;
      state.styleReferenceImageB = null;
      state.styleReferenceJobIds = [];
      state.characterReferenceImageA = null;
      state.characterReferenceImageB = null;
      state.characterReferenceJobIds = [];

      const faceMatchUploadContainer = document.getElementById("face-match-upload-container");
      if (faceMatchUploadContainer) faceMatchUploadContainer.style.display = "none";
      const styleUploadContainer = document.getElementById("image-upload-container");
      if (styleUploadContainer) styleUploadContainer.style.display = "none";

      const vpActions = document.getElementById("viewport-loopback-actions");
      if (vpActions) vpActions.style.display = "none";
      const lbActions = document.querySelector(".lightbox-action-row");
      if (lbActions) lbActions.style.display = "none";

      if (window.updateReferencePreviewsUI) window.updateReferencePreviewsUI();
      if (window.refreshReferenceAuthorityUI) window.refreshReferenceAuthorityUI();
    } else {
      if (refFace) {
        refFace.disabled = false;
        const lbl = refFace.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "";
          lbl.style.pointerEvents = "";
        }
      }
      if (refStyle) {
        refStyle.disabled = false;
        const lbl = refStyle.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "";
          lbl.style.pointerEvents = "";
        }
      }
      if (storyCharacterReference) {
        storyCharacterReference.disabled = false;
        const lbl = storyCharacterReference.closest(".checkbox-container");
        if (lbl) {
          lbl.style.opacity = "";
          lbl.style.pointerEvents = "";
        }
      }

      const vpActions = document.getElementById("viewport-loopback-actions");
      if (vpActions && state.activeJobId) vpActions.style.display = "flex";
      const lbActions = document.querySelector(".lightbox-action-row");
      if (lbActions) lbActions.style.display = "flex";
    }
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  function updateImageResolutionControl(preferredResolution = null) {
    const field = document.getElementById("image-resolution-field");
    const select = document.getElementById("image-resolution-select");
    if (!field || !select) return;
    const model = getActiveModelConfig();
    const resolutions = model?.capabilities?.resolutions || [];
    updateDimensionControlsVisibility(model);
    if (resolutions.length === 0) {
      field.style.display = "none";
      select.innerHTML = "";
      return;
    }

    const previous = preferredResolution || select.value;
    select.innerHTML = "";
    resolutions.forEach(resolution => {
      const option = document.createElement("option");
      option.value = resolution;
      option.textContent = resolution.toUpperCase();
      select.appendChild(option);
    });
    select.value = resolutions.includes(previous)
      ? previous
      : (model.defaults?.resolution || resolutions[0]);
    field.style.display = "block";
  }

  function updateDimensionControlsVisibility(model = getActiveModelConfig()) {
    const hidePixelDimensions = usesProviderResolutionPreset(model);
    const dimensionsField = document.getElementById("pixel-dimensions-field");
    if (dimensionsField) {
      dimensionsField.style.display = hidePixelDimensions ? "none" : "";
      dimensionsField.setAttribute("aria-hidden", String(hidePixelDimensions));
    }
    ["input-width", "input-height"].forEach(id => {
      const field = document.getElementById(id)?.closest(".form-field");
      if (!field) return;
      field.style.display = "";
      field.setAttribute("aria-hidden", String(hidePixelDimensions));
    });
  }

  function updateAspectRatioCapabilityUI() {
    const supportedRatios = getActiveModelConfig()?.capabilities?.aspectRatios || [];
    document.querySelectorAll("#aspect-ratio-group .option-chip").forEach(chip => {
      const ratio = chip.getAttribute("data-ratio");
      const supported = supportedRatios.length === 0 || supportedRatios.includes(ratio);
      chip.classList.toggle("model-unsupported", !supported);
      chip.setAttribute("aria-disabled", String(!supported));
      chip.title = supported
        ? ""
        : (state.language === "th"
          ? `โมเดลที่เลือกไม่รองรับอัตราส่วน ${ratio}`
          : `The selected model does not support ${ratio}.`);
    });
  }

  async function updateCredits() {
    try {
      const res = await fetch(`/api/credits?user=${state.username}`);
      const data = await res.json();
      const creditsVal = document.getElementById("credits-value");
      if (creditsVal) creditsVal.textContent = data.credits;
      state.userRole = data.role;

      // Auto switch selector UI value if credentials fetched externally
      const activePill = document.querySelector(`#profile-pill-selector .pill-btn[data-value="${state.username}"]`);
      if (activePill) {
        document.querySelectorAll("#profile-pill-selector .pill-btn").forEach(b => b.classList.remove("active"));
        activePill.classList.add("active");
      }

      if (window.updatePromptPreview) window.updatePromptPreview();
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  }

  function randomizePresetSelections(preset, presetName = "") {
    const selections = JSON.parse(JSON.stringify(preset.selections));

    const expressions = state.library.filter(opt => opt.category === "expression" && opt.enabled !== false);
    if (expressions.length > 0) {
      const randExpr = expressions[Math.floor(Math.random() * expressions.length)];
      selections["Expression"] = { id: randExpr.id, value: randExpr.prompt ? (randExpr.prompt.default) : randExpr.label, isCustom: false, group: "Face" };
    }

    const handPositions = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Hand Position" && opt.enabled !== false);
    if (handPositions.length > 0) {
      const randHand = handPositions[Math.floor(Math.random() * handPositions.length)];
      selections["Hand Position"] = { id: randHand.id, value: randHand.prompt ? (randHand.prompt.default) : randHand.label, isCustom: false, group: "Pose" };
    }

    const isSittingPreset = !!selections["Sitting"];
    if (isSittingPreset) {
      delete selections["Standing"];
      delete selections["Walking"];
      const sittingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Sitting" && opt.enabled !== false);
      if (sittingPoses.length > 0) {
        const randSit = sittingPoses[Math.floor(Math.random() * sittingPoses.length)];
        selections["Sitting"] = { id: randSit.id, value: randSit.prompt ? (randSit.prompt.default) : randSit.label, isCustom: false, group: "Pose" };
      }
    } else {
      delete selections["Sitting"];
      const pickStanding = Math.random() > 0.5;
      if (pickStanding) {
        delete selections["Walking"];
        const standingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Standing" && opt.enabled !== false);
        if (standingPoses.length > 0) {
          const randStand = standingPoses[Math.floor(Math.random() * standingPoses.length)];
          selections["Standing"] = { id: randStand.id, value: randStand.prompt ? (randStand.prompt.default) : randStand.label, isCustom: false, group: "Pose" };
        }
      } else {
        delete selections["Standing"];
        const walkingPoses = state.library.filter(opt => opt.category === "pose" && opt.subcategory === "Walking" && opt.enabled !== false);
        if (walkingPoses.length > 0) {
          const randWalk = walkingPoses[Math.floor(Math.random() * walkingPoses.length)];
          selections["Walking"] = { id: randWalk.id, value: randWalk.prompt ? (randWalk.prompt.default) : randWalk.label, isCustom: false, group: "Pose" };
        }
      }
    }

    const framings = state.library.filter(opt => opt.category === "camera_framing" && opt.enabled !== false);
    if (framings.length > 0) {
      const randFraming = framings[Math.floor(Math.random() * framings.length)];
      selections["Framing"] = { id: randFraming.id, value: randFraming.prompt ? (randFraming.prompt.default) : randFraming.label, isCustom: false, group: "Camera" };
    }

    const diningKeywords = ["restaurant", "bar", "cafe", "dining", "mall", "eating", "drink"];
    const isDining = presetName && diningKeywords.some(keyword => presetName.toLowerCase().includes(keyword));
    let allowedForegroundIds = [];
    if (isDining) {
      allowedForegroundIds = ["foreground.001", "foreground.003", "foreground.004"];
    } else {
      allowedForegroundIds = ["foreground.002", "foreground.004"];
    }

    const foregrounds = state.library.filter(opt => opt.category === "foreground_layer" && allowedForegroundIds.includes(opt.id) && opt.enabled !== false);
    if (foregrounds.length > 0) {
      const randFore = foregrounds[Math.floor(Math.random() * foregrounds.length)];
      selections["Foreground Layer"] = { id: randFore.id, value: randFore.prompt ? (randFore.prompt.default) : randFore.label, isCustom: false, group: "Environment" };
    }

    return {
      ...preset,
      selections
    };
  }

  // Expose to window
  window.getActiveProviderConfig = getActiveProviderConfig;
  window.getActiveModelConfig = getActiveModelConfig;
  window.getSelectedImageResolution = getSelectedImageResolution;
  window.getEditablePromptText = getEditablePromptText;
  window.getGenerationRequestPayload = getGenerationRequestPayload;
  window.populateProviderList = populateProviderList;
  window.updateSubmodelList = updateSubmodelList;
  window.usesProviderResolutionPreset = usesProviderResolutionPreset;
  window.applyModelCapabilityControls = applyModelCapabilityControls;
  window.updateImageResolutionControl = updateImageResolutionControl;
  window.updateDimensionControlsVisibility = updateDimensionControlsVisibility;
  window.updateAspectRatioCapabilityUI = updateAspectRatioCapabilityUI;
  window.updateCredits = updateCredits;
  window.randomizePresetSelections = randomizePresetSelections;
})();
