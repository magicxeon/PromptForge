/**
 * ModelPromptForge - Character Sheet Outfit Reference Controller
 */
(function () {
  const DEFAULT_OVERRIDES = Object.freeze({
    enabled: false,
    primaryColor: false,
    secondaryColor: false,
    pattern: false,
    material: false
  });
  const SLOT_INDEX = Object.freeze({ front: 0, back: 1 });
  let initialized = false;

  function normalizeOverrides(value) {
    const raw = value && typeof value === "object" ? value : {};
    return Object.fromEntries(
      Object.entries(DEFAULT_OVERRIDES).map(([key, fallback]) => [key, raw[key] === true || fallback])
    );
  }

  function ensureState() {
    const state = window.state;
    if (!state) return null;
    state.imageReferences = state.imageReferences || {};
    state.outfitReferenceJobIds = Array.isArray(state.outfitReferenceJobIds)
      ? state.outfitReferenceJobIds.slice(0, 2)
      : [];
    state.outfitReferenceOverrides = normalizeOverrides(state.outfitReferenceOverrides);
    state.imageReferences.outfitReference = state.mode === "character-sheet"
      && Boolean(state.outfitReferenceImageFront);
    return state;
  }

  function getOutfitReferenceState() {
    const state = ensureState();
    const hasFront = Boolean(state?.outfitReferenceImageFront);
    const hasBack = Boolean(state?.outfitReferenceImageBack);
    return {
      status: hasFront ? (hasBack ? "front_back_ready" : "front_ready") : (hasBack ? "back_only_invalid" : "empty"),
      hasFront,
      hasBack,
      active: Boolean(state?.mode === "character-sheet" && hasFront),
      overrides: normalizeOverrides(state?.outfitReferenceOverrides)
    };
  }

  function collectActiveReferenceSlots() {
    const state = window.state || {};
    const slots = [];
    const add = (name, value) => {
      if (typeof value === "string" && value.trim()) slots.push({ name, value: value.trim() });
    };
    if (state.imageReferences?.faceMatch) {
      add("Face A", state.faceReferenceImageA);
      add("Face B", state.faceReferenceImageB);
    }
    if (state.mode === "normal" && (state.imageReferences?.styleMatch || state.imageReferences?.poseMatch)) {
      add("Style A", state.styleReferenceImageA);
      add("Style B", state.styleReferenceImageB);
    }
    if (state.mode === "normal" && state.imageReferences?.characterReference) {
      add("Character A", state.characterReferenceImageA);
      add("Character B", state.characterReferenceImageB);
    }
    if (state.mode === "character-sheet") {
      add("Outfit Front", state.outfitReferenceImageFront);
      add("Outfit Back", state.outfitReferenceImageBack);
    }
    return slots;
  }

  function validateOutfitReferenceState(modelConfig = null, activeReferences = null) {
    const referenceState = getOutfitReferenceState();
    if (window.state?.mode !== "character-sheet" || referenceState.status === "empty") {
      return { valid: true, code: null, message: "", referenceState };
    }
    if (referenceState.status === "back_only_invalid") {
      return {
        valid: false,
        code: "outfit_front_required",
        message: "Add an Outfit Front image to use the Back reference, or remove the Back image.",
        referenceState
      };
    }
    if (modelConfig && modelConfig.capabilities?.imageReferences !== true) {
      return {
        valid: false,
        code: "outfit_reference_unsupported",
        message: "The selected model cannot use image references. Your outfit uploads are still saved.",
        referenceState
      };
    }
    const slots = Array.isArray(activeReferences) ? activeReferences : collectActiveReferenceSlots();
    const uniqueSlots = [...new Map(slots.map(slot => [slot.value || slot, slot])).values()];
    const maxReferences = Number(modelConfig?.capabilities?.maxReferenceImages || 0);
    if (modelConfig && uniqueSlots.length > maxReferences) {
      const names = uniqueSlots.map(slot => slot.name || "Reference").join(", ");
      return {
        valid: false,
        code: "outfit_reference_limit",
        message: `The selected model accepts ${maxReferences} reference image(s), but ${uniqueSlots.length} are active: ${names}.`,
        referenceState
      };
    }
    return { valid: true, code: null, message: "", referenceState };
  }

  function getPreviewSrc(value) {
    if (!value) return "";
    if (value.startsWith("data:") || value.startsWith("/outputs/") || /^https?:\/\//i.test(value)) return value;
    return `data:image/png;base64,${value}`;
  }

  function getStatusMessage(validation) {
    if (!validation.valid) return validation.message;
    if (validation.referenceState.status === "front_back_ready") return "Front and Back references will be attached to generation.";
    if (validation.referenceState.status === "front_ready") return "Front reference will be attached. Unseen back details will be inferred.";
    return "Front is the main outfit reference; Back is optional.";
  }

  function renderOutfitReferencePanel() {
    const state = ensureState();
    const panel = document.getElementById("outfit-reference-upload-container");
    if (!state || !panel) return;
    panel.style.display = state.mode === "character-sheet" ? "block" : "none";

    ["front", "back"].forEach(slot => {
      const value = slot === "front" ? state.outfitReferenceImageFront : state.outfitReferenceImageBack;
      const dropzone = panel.querySelector(`[data-outfit-dropzone="${slot}"]`);
      const image = document.getElementById(`outfit-${slot}-img`);
      const preview = document.getElementById(`outfit-${slot}-card`);
      if (dropzone) dropzone.classList.toggle("has-value", Boolean(value));
      if (image) image.src = getPreviewSrc(value);
      if (preview) preview.style.display = value ? "flex" : "none";
    });

    const model = window.getActiveModelConfig?.() || null;
    const validation = validateOutfitReferenceState(model);
    const status = document.getElementById("outfit-reference-status");
    if (status) {
      status.textContent = getStatusMessage(validation);
      status.dataset.state = validation.valid ? validation.referenceState.status : "invalid";
    }
    panel.classList.toggle("is-invalid", !validation.valid);
    window.ModelPromptForgeClothingOptionRules?.applyClothingVisibilityRules?.();
  }

  function notifyStateChanged() {
    ensureState();
    window.updateReferencePreviewsUI?.();
    window.updateCharacterSheetSourceStatus?.();
    renderOutfitReferencePanel();
    window.updatePromptPreview?.();
    document.dispatchEvent(new CustomEvent("mpf:outfit-reference-change", {
      detail: getOutfitReferenceState()
    }));
  }

  function normalizeReferenceValue(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  }

  function setOutfitReference(slot, value, metadata = {}) {
    const state = ensureState();
    if (!state || !Object.hasOwn(SLOT_INDEX, slot)) return false;
    const normalized = normalizeReferenceValue(value);
    if (!normalized) return false;
    if (slot === "front") state.outfitReferenceImageFront = normalized;
    else state.outfitReferenceImageBack = normalized;
    state.outfitReferenceJobIds[SLOT_INDEX[slot]] = metadata.jobId || null;
    notifyStateChanged();
    return true;
  }

  function clearOutfitReference(slot) {
    const state = ensureState();
    if (!state || !Object.hasOwn(SLOT_INDEX, slot)) return;
    if (slot === "front") state.outfitReferenceImageFront = null;
    else state.outfitReferenceImageBack = null;
    state.outfitReferenceJobIds[SLOT_INDEX[slot]] = null;
    notifyStateChanged();
  }

  function clearAllOutfitReferences() {
    const state = ensureState();
    if (!state) return;
    state.outfitReferenceImageFront = null;
    state.outfitReferenceImageBack = null;
    state.outfitReferenceJobIds = [];
    state.imageReferences.outfitReference = false;
    notifyStateChanged();
  }

  async function optimizeReferenceImage(file) {
    if (typeof createImageBitmap !== "function") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target?.result || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.88);
  }

  async function readFile(file, slot) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      window.AppDialog?.alert?.("Please choose a PNG, JPEG, or WebP image.", { title: "Invalid Outfit Image" });
      return;
    }
    const dropzone = document.querySelector(`[data-outfit-dropzone="${slot}"]`);
    dropzone?.classList.add("is-loading");
    try {
      const optimized = await optimizeReferenceImage(file);
      setOutfitReference(slot, optimized);
    } catch (error) {
      console.error("Outfit reference optimization failed:", error);
      window.AppDialog?.alert?.("The outfit image could not be prepared.", { title: "Upload Failed" });
    } finally {
      dropzone?.classList.remove("is-loading");
    }
  }

  function openFilePicker(slot) {
    document.getElementById(`outfit-${slot}-file`)?.click();
  }

  function handleClick(event) {
    const clearAll = event.target.closest("#btn-clear-outfit-reference");
    if (clearAll) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearAllOutfitReferences();
      return;
    }
    const clear = event.target.closest(".btn-clear-slot[data-slot^='outfit']");
    if (clear) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearOutfitReference(clear.dataset.slot === "outfitFront" ? "front" : "back");
      return;
    }
    const replace = event.target.closest("[data-outfit-replace]");
    if (replace) {
      event.preventDefault();
      event.stopPropagation();
      openFilePicker(replace.dataset.outfitReplace);
      return;
    }
    const dropzone = event.target.closest("[data-outfit-dropzone]");
    if (dropzone && !event.target.closest("button")) openFilePicker(dropzone.dataset.outfitDropzone);
  }

  function handleChange(event) {
    if (event.target?.id === "outfit-front-file" || event.target?.id === "outfit-back-file") {
      const slot = event.target.id.includes("front") ? "front" : "back";
      readFile(event.target.files?.[0], slot);
      event.target.value = "";
      event.stopImmediatePropagation();
      return;
    }
    if (event.target?.id === "outfit-reference-customize-toggle") {
      const state = ensureState();
      state.outfitReferenceOverrides.enabled = event.target.checked;
      notifyStateChanged();
      return;
    }
    const override = event.target?.dataset?.outfitOverride;
    if (override && Object.hasOwn(DEFAULT_OVERRIDES, override)) {
      const state = ensureState();
      state.outfitReferenceOverrides[override] = event.target.checked;
      const colorField = override === "primaryColor"
        ? "Primary Color"
        : override === "secondaryColor"
          ? "Secondary Color"
          : null;
      if (colorField && event.target.checked && state.customColors?.[colorField]) {
        state.customColors[colorField].enabled = true;
        window.updateColorPickerUI?.();
      }
      notifyStateChanged();
    }
  }

  function handleKeydown(event) {
    const dropzone = event.target.closest?.("[data-outfit-dropzone]");
    if (dropzone && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openFilePicker(dropzone.dataset.outfitDropzone);
    }
  }

  function handleDrag(event) {
    const dropzone = event.target.closest?.("[data-outfit-dropzone]");
    if (!dropzone) return;
    event.preventDefault();
    if (event.type === "dragover") dropzone.classList.add("is-dragging");
    if (event.type === "dragleave") dropzone.classList.remove("is-dragging");
    if (event.type === "drop") {
      dropzone.classList.remove("is-dragging");
      readFile(event.dataTransfer?.files?.[0], dropzone.dataset.outfitDropzone);
    }
  }

  function initOutfitReferenceController() {
    ensureState();
    if (!initialized) {
      document.addEventListener("click", handleClick);
      document.addEventListener("change", handleChange);
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("dragover", handleDrag);
      document.addEventListener("dragleave", handleDrag);
      document.addEventListener("drop", handleDrag);
      initialized = true;
    }
    renderOutfitReferencePanel();
  }

  window.ModelPromptForgeOutfitReferenceController = {
    initOutfitReferenceController,
    setOutfitReference,
    clearOutfitReference,
    clearAllOutfitReferences,
    getOutfitReferenceState,
    validateOutfitReferenceState,
    renderOutfitReferencePanel,
    normalizeOverrides
  };
})();
