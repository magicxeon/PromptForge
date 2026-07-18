/**
 * ModelPromptForge - Reference Manager
 */
(() => {
  const state = window.state;
  const getLocalizedLabel = window.getLocalizedLabel;

  const REFERENCE_OWNED_GROUPS = new Set(["Character", "Face", "Hair", "Skin", "Body", "Clothing"]);
  const FACE_MATCH_OWNED_FIELDS = new Set(["Face Shape", "Eyes", "Eyebrows", "Nose", "Lips", "Smile"]);

  function clearFaceReferenceState({ updateUI = true } = {}) {
    state.faceReferenceImageA = null;
    state.faceReferenceImageB = null;
    state.faceReferenceJobIds = [];
    const faceFileInput = document.getElementById("face-match-file");
    if (faceFileInput) faceFileInput.value = "";
    if (updateUI) updateReferencePreviewsUI();
  }

  function clearCharacterReferenceState({ updateUI = true } = {}) {
    state.characterReferenceImageA = null;
    state.characterReferenceImageB = null;
    state.characterReferenceJobIds = [];
    state.imageReferences.characterReference = false;
    state.characterReferenceOverrides = false;
    const checkbox = document.getElementById("story-use-character-reference");
    const fileInput = document.getElementById("character-reference-file");
    if (checkbox) checkbox.checked = false;
    if (fileInput) fileInput.value = "";
    if (updateUI) {
      updateReferencePreviewsUI();
      refreshReferenceAuthorityUI();
    }
  }

  function clearOutfitReferenceState({ updateUI = true } = {}) {
    state.outfitReferenceImageFront = null;
    state.outfitReferenceImageBack = null;
    state.outfitReferenceJobIds = [];
    state.imageReferences.outfitReference = false;
    const frontFileInput = document.getElementById("outfit-front-file");
    const backFileInput = document.getElementById("outfit-back-file");
    if (frontFileInput) frontFileInput.value = "";
    if (backFileInput) backFileInput.value = "";
    if (updateUI) {
      updateReferencePreviewsUI();
      updateCharacterSheetSourceStatus();
    }
  }

  function isStoryCharacterReferenceActive() {
    return state.mode === "normal"
      && state.imageReferences.characterReference === true
      && Boolean(state.characterReferenceImageA || state.characterReferenceImageB);
  }

  function getCharacterSheetSourceOwnership() {
    // Need to resolve selections dynamically
    const selections = getModeCompatibleSelections(state.selections, "character-sheet");
    const hasBodySelection = Object.entries(selections).some(([fieldName, selection]) => {
      return fieldName !== "Sheet Layout" && selection?.group === "Body";
    });
    const hasClothingSelection = Object.values(selections).some(selection => selection?.group === "Clothing");
    const hasOutfitReference = state.mode === "character-sheet"
      && state.imageReferences.outfitReference === true
      && Boolean(state.outfitReferenceImageFront || state.outfitReferenceImageBack);
    const layoutSelection = selections["Sheet Layout"];
    const layoutItem = layoutSelection && !layoutSelection.isCustom
      ? state.library.find(item => item.id === layoutSelection.id)
      : null;
    const layoutLabel = layoutSelection?.isCustom
      ? layoutSelection.value
      : getLocalizedLabel(layoutItem?.label) || "Front / Side / Back";
    return {
      mode: "character-sheet",
      identity: {
        source: "visual-character-selections",
        label: "Current visual character selections",
        owns: ["gender", "age", "visual heritage", "face", "hair", "skin"]
      },
      body: {
        source: hasBodySelection ? "body-visual-attributes" : "not-selected",
        label: hasBodySelection ? "Body visual attributes" : "Not selected yet",
        owns: ["body silhouette", "proportion"]
      },
      outfit: {
        source: hasOutfitReference
          ? (state.outfitReferenceImageBack ? "outfit-front-back-reference" : "outfit-front-reference")
          : (hasClothingSelection ? "outfit-preset-selections" : "character-sheet-baseline"),
        label: hasOutfitReference
          ? (state.outfitReferenceImageBack ? "Front/Back Upload" : "Front Upload")
          : (hasClothingSelection ? "Outfit preset selections" : "Character Sheet Baseline"),
        owns: ["outfit", "garment silhouette", "colors", "visible details"]
      },
      layout: {
        source: layoutSelection ? "selected-sheet-layout" : "default-front-side-back",
        label: layoutLabel,
        owns: ["sheet layout"]
      }
    };
  }

  function updateCharacterSheetSourceStatus() {
    const panel = document.getElementById("character-sheet-source-status");
    const summary = document.getElementById("character-sheet-source-summary");
    if (!panel || !summary) return;
    const isActive = state.mode === "character-sheet";
    panel.style.display = isActive ? "block" : "none";
    if (!isActive) return;

    const ownership = getCharacterSheetSourceOwnership();
    summary.textContent = [
      `Identity source: ${ownership.identity.label}`,
      `Body source: ${ownership.body.label}`,
      `Outfit source: ${ownership.outfit.label}`,
      `Sheet layout: ${ownership.layout.label}`
    ].join(" • ");
  }

  function applyReferenceAuthorityToSelections(activeSelections) {
    delete activeSelections["Reference Image"];
    if (!isStoryCharacterReferenceActive() || state.characterReferenceOverrides) return;

    Object.keys(activeSelections).forEach(fieldName => {
      if (REFERENCE_OWNED_GROUPS.has(activeSelections[fieldName]?.group)) {
        delete activeSelections[fieldName];
      }
    });
  }

  function applyCharacterReferenceAuthority() {
    const isReferenceOwned = isStoryCharacterReferenceActive() && !state.characterReferenceOverrides;
    document.querySelectorAll("#form-container select.custom-select").forEach(select => {
      const groupName = select.getAttribute("data-group");
      if (!REFERENCE_OWNED_GROUPS.has(groupName)) return;
      const fieldName = select.getAttribute("data-field");
      const formField = select.closest(".form-field");
      select.disabled = isReferenceOwned
        || (state.imageReferences.faceMatch && FACE_MATCH_OWNED_FIELDS.has(fieldName));
      if (formField) formField.classList.toggle("reference-owned", isReferenceOwned);
    });

    const panel = document.getElementById("character-reference-authority");
    const title = document.getElementById("character-reference-authority-title");
    const summary = document.getElementById("character-reference-authority-summary");
    const override = document.getElementById("character-reference-override");
    const overrideLabel = document.getElementById("character-reference-override-label");
    if (panel) panel.classList.toggle("active", isStoryCharacterReferenceActive());
    if (title) title.textContent = state.language === "th" ? "สิทธิ์ควบคุมจากภาพอ้างอิงตัวละคร" : "Character Reference Authority";
    if (summary) {
      summary.textContent = state.language === "th"
        ? (isStoryCharacterReferenceActive()
          ? (state.characterReferenceOverrides
            ? "เปิดการปรับแต่งขั้นสูงอยู่ ความต่อเนื่องของตัวละครอาจลดลง"
            : "กำลังใช้เอกลักษณ์ ทรงผม รูปร่าง และเสื้อผ้าจากภาพอ้างอิงตัวละคร")
          : "ตัวเลือก Character ทำงานตามปกติเนื่องจากยังไม่ได้เลือกภาพอ้างอิงตัวละครใน Scene Builder")
        : (isStoryCharacterReferenceActive()
          ? (state.characterReferenceOverrides
            ? "Advanced overrides are active. Identity consistency may be reduced."
            : "Using identity, hair, body, and clothing from Character Reference.")
          : "Character attributes are active because no Character Reference is selected.");
    }
    if (overrideLabel) overrideLabel.textContent = state.language === "th" ? "เปิดการปรับ Character ขั้นสูง" : "Enable advanced character overrides";
    if (override) override.checked = state.characterReferenceOverrides;
  }

  function refreshReferenceAuthorityUI() {
    applyFaceMatchLockout();
    applyCharacterReferenceAuthority();
    if (window.syncVisualPickers) window.syncVisualPickers();
  }

  function applyFashionDirectionDefaults(directionItem) {
    if (!directionItem?.defaults) return;
    Object.entries(directionItem.defaults).forEach(([fieldName, optionId]) => {
      if (state.selections[fieldName]) return;
      const item = state.library.find(entry => entry.id === optionId && entry.enabled !== false);
      const select = document.querySelector(`.custom-select[data-field="${fieldName}"]`);
      if (!item || !select) return;
      select.value = optionId;
      state.selections[fieldName] = {
        id: item.id,
        value: item.prompt?.["gpt-image"] || item.prompt?.default || getLocalizedLabel(item.label),
        isCustom: false,
        group: select.getAttribute("data-group"),
        category: item.category,
        tags: item.tags || []
      };
      if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges(select.getAttribute("data-group"));
    });
  }

  const LEGACY_FASHION_SELECTION_REPLACEMENTS = {
    "scene_story.001": "scene_story.fashion.outfit-reveal",
    "scene_story.002": "scene_story.fashion.lookbook-pause",
    "scene_story.003": "scene_story.fashion.outfit-reveal",
    "scene_story.004": "scene_story.fashion.lookbook-pause",
    "scene_story.005": "scene_story.fashion.lookbook-pause",
    "scene_story.006": "scene_story.fashion.detail-demo",
    "scene_story.007": "scene_story.fashion.outfit-reveal",
    "scene_story.008": "scene_story.fashion.collection-walk",
    "scene_story.009": "scene_story.fashion.lookbook-pause",
    "scene_story.0010": "scene_story.fashion.lookbook-pause",
    "photo_context.001": "photo_context.fashion.creator",
    "photo_context.002": "photo_context.fashion.street-style",
    "photo_context.003": "photo_context.fashion.creator",
    "photo_context.004": "photo_context.fashion.creator",
    "photo_context.005": "photo_context.fashion.creator",
    "photo_context.006": "photo_context.fashion.creator",
    "photo_context.007": "photo_context.fashion.street-style"
  };

  function migrateFashionSelection(selection, group) {
    if (!selection || selection.isCustom) return selection ? { ...selection, group } : selection;
    const replacementId = LEGACY_FASHION_SELECTION_REPLACEMENTS[selection.id];
    if (!replacementId) return { ...selection, group };
    const replacement = state.library.find(item => item.id === replacementId);
    if (!replacement) return { ...selection, group };
    return {
      ...selection,
      id: replacement.id,
      value: replacement.prompt?.["gpt-image"] || replacement.prompt?.default || getLocalizedLabel(replacement.label),
      group,
      category: replacement.category,
      tags: replacement.tags || []
    };
  }

  function migrateLegacySelections(selections) {
    const migrated = { ...(selections || {}) };
    delete migrated["Reference Image"];
    if (migrated["Story Event"] && !migrated["Fashion Story"]) {
      migrated["Fashion Story"] = migrateFashionSelection(migrated["Story Event"], "Scene Story");
    }
    if (migrated["Context Type"] && !migrated["Fashion Photography Context"]) {
      migrated["Fashion Photography Context"] = migrateFashionSelection(
        migrated["Context Type"],
        "Photographic Context"
      );
    }
    if (migrated["Fashion Story"]) {
      migrated["Fashion Story"] = migrateFashionSelection(migrated["Fashion Story"], "Scene Story");
    }
    if (migrated["Fashion Photography Context"]) {
      migrated["Fashion Photography Context"] = migrateFashionSelection(
        migrated["Fashion Photography Context"],
        "Photographic Context"
      );
    }
    delete migrated["Story Event"];
    delete migrated["Context Type"];
    return migrated;
  }

  function enforceModeReferencePolicy({ updateUI = true } = {}) {
    if (state.mode !== "normal") {
      clearCharacterReferenceState({ updateUI });
      state.imageReferences.styleMatch = false;
      state.imageReferences.poseMatch = false;
      const styleCheckbox = document.getElementById("ref-style-match");
      const poseCheckbox = document.getElementById("ref-pose-match");
      if (styleCheckbox) styleCheckbox.checked = false;
      if (poseCheckbox) poseCheckbox.checked = false;
    }
    if (state.mode !== "character-sheet") {
      clearOutfitReferenceState({ updateUI });
    }
  }

  function enforceFaceMatchInvariant({ updateUI = true } = {}) {
    const refFace = document.getElementById("ref-face-match");
    const enabled = state.imageReferences.faceMatch === true && refFace?.checked === true;
    if (!enabled) clearFaceReferenceState({ updateUI });
  }

  function updateReferencePreviewsUI() {
    const faceSlotACard = document.getElementById("face-slot-a-card");
    const faceSlotAImg = document.getElementById("face-slot-a-img");
    const faceSlotBCard = document.getElementById("face-slot-b-card");
    const faceSlotBImg = document.getElementById("face-slot-b-img");

    if (faceSlotACard && faceSlotAImg) {
      if (state.faceReferenceImageA) {
        faceSlotAImg.src = state.faceReferenceImageA.startsWith("data:") ? state.faceReferenceImageA : (state.faceReferenceImageA.startsWith("/outputs/") ? state.faceReferenceImageA : `data:image/png;base64,${state.faceReferenceImageA}`);
        faceSlotACard.style.display = "flex";
      } else {
        faceSlotACard.style.display = "none";
        faceSlotAImg.src = "";
      }
    }

    if (faceSlotBCard && faceSlotBImg) {
      if (state.faceReferenceImageB) {
        faceSlotBImg.src = state.faceReferenceImageB.startsWith("data:") ? state.faceReferenceImageB : (state.faceReferenceImageB.startsWith("/outputs/") ? state.faceReferenceImageB : `data:image/png;base64,${state.faceReferenceImageB}`);
        faceSlotBCard.style.display = "flex";
      } else {
        faceSlotBCard.style.display = "none";
        faceSlotBImg.src = "";
      }
    }

    const characterSlotACard = document.getElementById("character-slot-a-card");
    const characterSlotAImg = document.getElementById("character-slot-a-img");
    const characterSlotBCard = document.getElementById("character-slot-b-card");
    const characterSlotBImg = document.getElementById("character-slot-b-img");

    if (characterSlotACard && characterSlotAImg) {
      if (state.characterReferenceImageA) {
        characterSlotAImg.src = state.characterReferenceImageA.startsWith("data:") ? state.characterReferenceImageA : (state.characterReferenceImageA.startsWith("/outputs/") ? state.characterReferenceImageA : `data:image/png;base64,${state.characterReferenceImageA}`);
        characterSlotACard.style.display = "flex";
      } else {
        characterSlotACard.style.display = "none";
        characterSlotAImg.src = "";
      }
    }

    if (characterSlotBCard && characterSlotBImg) {
      if (state.characterReferenceImageB) {
        characterSlotBImg.src = state.characterReferenceImageB.startsWith("data:") ? state.characterReferenceImageB : (state.characterReferenceImageB.startsWith("/outputs/") ? state.characterReferenceImageB : `data:image/png;base64,${state.characterReferenceImageB}`);
        characterSlotBCard.style.display = "flex";
      } else {
        characterSlotBCard.style.display = "none";
        characterSlotBImg.src = "";
      }
    }

    const styleSlotACard = document.getElementById("style-slot-a-card");
    const styleSlotAImg = document.getElementById("style-slot-a-img");
    const styleSlotBCard = document.getElementById("style-slot-b-card");
    const styleSlotBImg = document.getElementById("style-slot-b-img");

    if (styleSlotACard && styleSlotAImg) {
      if (state.styleReferenceImageA) {
        styleSlotAImg.src = state.styleReferenceImageA.startsWith("data:") ? state.styleReferenceImageA : (state.styleReferenceImageA.startsWith("/outputs/") ? state.styleReferenceImageA : `data:image/png;base64,${state.styleReferenceImageA}`);
        styleSlotACard.style.display = "flex";
      } else {
        styleSlotACard.style.display = "none";
        styleSlotAImg.src = "";
      }
    }

    if (styleSlotBCard && styleSlotBImg) {
      if (state.styleReferenceImageB) {
        styleSlotBImg.src = state.styleReferenceImageB.startsWith("data:") ? state.styleReferenceImageB : (state.styleReferenceImageB.startsWith("/outputs/") ? state.styleReferenceImageB : `data:image/png;base64,${state.styleReferenceImageB}`);
        styleSlotBCard.style.display = "flex";
      } else {
        styleSlotBCard.style.display = "none";
        styleSlotBImg.src = "";
      }
    }

    const outfitFrontCard = document.getElementById("outfit-front-card");
    const outfitFrontImg = document.getElementById("outfit-front-img");
    const outfitBackCard = document.getElementById("outfit-back-card");
    const outfitBackImg = document.getElementById("outfit-back-img");

    if (outfitFrontCard && outfitFrontImg) {
      if (state.outfitReferenceImageFront) {
        outfitFrontImg.src = state.outfitReferenceImageFront.startsWith("data:")
          ? state.outfitReferenceImageFront
          : (state.outfitReferenceImageFront.startsWith("/outputs/")
            ? state.outfitReferenceImageFront
            : `data:image/png;base64,${state.outfitReferenceImageFront}`);
        outfitFrontCard.style.display = "flex";
      } else {
        outfitFrontCard.style.display = "none";
        outfitFrontImg.src = "";
      }
    }

    if (outfitBackCard && outfitBackImg) {
      if (state.outfitReferenceImageBack) {
        outfitBackImg.src = state.outfitReferenceImageBack.startsWith("data:")
          ? state.outfitReferenceImageBack
          : (state.outfitReferenceImageBack.startsWith("/outputs/")
            ? state.outfitReferenceImageBack
            : `data:image/png;base64,${state.outfitReferenceImageBack}`);
        outfitBackCard.style.display = "flex";
      } else {
        outfitBackCard.style.display = "none";
        outfitBackImg.src = "";
      }
    }
  }

  function cleanReferenceImageSrc(src) {
    if (!src) return "";
    const idx = src.indexOf("/outputs/");
    if (idx !== -1) {
      return src.substring(idx);
    }
    return src;
  }

  function uniqueReferenceJobIds(ids) {
    return [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))].slice(0, 2);
  }

  function assignFaceReference(imageSrc, jobId = null) {
    const cleanedSrc = cleanReferenceImageSrc(imageSrc);
    if (!state.faceReferenceImageA) {
      state.faceReferenceImageA = cleanedSrc;
      if (jobId) state.faceReferenceJobIds[0] = jobId;
    } else if (!state.faceReferenceImageB) {
      state.faceReferenceImageB = cleanedSrc;
      if (jobId) state.faceReferenceJobIds[1] = jobId;
    } else {
      state.faceReferenceImageB = cleanedSrc;
      if (jobId) state.faceReferenceJobIds[1] = jobId;
    }

    const refFaceCheckbox = document.getElementById("ref-face-match");
    if (refFaceCheckbox) {
      refFaceCheckbox.checked = true;
      refFaceCheckbox.dispatchEvent(new Event("change"));
    }
    updateReferencePreviewsUI();
  }

  function assignStyleReference(imageSrc, jobId = null) {
    const cleanedSrc = cleanReferenceImageSrc(imageSrc);
    if (!state.styleReferenceImageA) {
      state.styleReferenceImageA = cleanedSrc;
      if (jobId) state.styleReferenceJobIds[0] = jobId;
    } else if (!state.styleReferenceImageB) {
      state.styleReferenceImageB = cleanedSrc;
      if (jobId) state.styleReferenceJobIds[1] = jobId;
    } else {
      state.styleReferenceImageB = cleanedSrc;
      if (jobId) state.styleReferenceJobIds[1] = jobId;
    }

    const styleCheckbox = document.getElementById("ref-style-match");
    if (styleCheckbox) {
      styleCheckbox.checked = true;
      styleCheckbox.dispatchEvent(new Event("change"));
    }
    updateReferencePreviewsUI();
  }

  function assignCharacterReference(imageSrc, jobId = null) {
    if (state.mode !== "normal") return;
    const cleanedSrc = cleanReferenceImageSrc(imageSrc);
    if (!state.characterReferenceImageA) {
      state.characterReferenceImageA = cleanedSrc;
      if (jobId) state.characterReferenceJobIds[0] = jobId;
    } else if (!state.characterReferenceImageB) {
      state.characterReferenceImageB = cleanedSrc;
      if (jobId) state.characterReferenceJobIds[1] = jobId;
    } else {
      state.characterReferenceImageB = cleanedSrc;
      if (jobId) state.characterReferenceJobIds[1] = jobId;
    }
    state.imageReferences.characterReference = true;
    const checkbox = document.getElementById("story-use-character-reference");
    if (checkbox) checkbox.checked = true;
    updateReferencePreviewsUI();
    refreshReferenceAuthorityUI();
    if (window.updatePromptPreview) window.updatePromptPreview();
  }

  function applyFaceMatchLockout() {
    const isLocked = state.imageReferences.faceMatch
      || (isStoryCharacterReferenceActive() && !state.characterReferenceOverrides);

    FACE_MATCH_OWNED_FIELDS.forEach(field => {
      const select = document.querySelector(`.custom-select[data-field="${field}"]`);
      if (!select) return;

      const formField = select.closest(".form-field");
      if (isLocked) {
        select.disabled = true;
        if (formField) formField.classList.add("disabled");
      } else {
        select.disabled = false;
        if (formField) formField.classList.remove("disabled");
      }
    });
    if (window.updateAccordionSummaryBadges) window.updateAccordionSummaryBadges("Face");
  }

  // Expose to window
  window.clearFaceReferenceState = clearFaceReferenceState;
  window.clearCharacterReferenceState = clearCharacterReferenceState;
  window.clearOutfitReferenceState = clearOutfitReferenceState;
  window.isStoryCharacterReferenceActive = isStoryCharacterReferenceActive;
  window.getCharacterSheetSourceOwnership = getCharacterSheetSourceOwnership;
  window.updateCharacterSheetSourceStatus = updateCharacterSheetSourceStatus;
  window.applyReferenceAuthorityToSelections = applyReferenceAuthorityToSelections;
  window.applyCharacterReferenceAuthority = applyCharacterReferenceAuthority;
  window.refreshReferenceAuthorityUI = refreshReferenceAuthorityUI;
  window.applyFashionDirectionDefaults = applyFashionDirectionDefaults;
  window.migrateFashionSelection = migrateFashionSelection;
  window.migrateLegacySelections = migrateLegacySelections;
  window.enforceModeReferencePolicy = enforceModeReferencePolicy;
  window.enforceFaceMatchInvariant = enforceFaceMatchInvariant;
  window.updateReferencePreviewsUI = updateReferencePreviewsUI;
  window.cleanReferenceImageSrc = cleanReferenceImageSrc;
  window.uniqueReferenceJobIds = uniqueReferenceJobIds;
  window.assignFaceReference = assignFaceReference;
  window.assignStyleReference = assignStyleReference;
  window.assignCharacterReference = assignCharacterReference;
  window.applyFaceMatchLockout = applyFaceMatchLockout;

  // Set internal reference dependency helpers locally or via window
  const getModeCompatibleSelections = (s, m) => window.getModeCompatibleSelections ? window.getModeCompatibleSelections(s, m) : s;
})();
