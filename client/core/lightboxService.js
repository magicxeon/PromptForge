/**
 * ModelPromptForge - Lightbox Fullscreen Viewer Service
 */
(() => {
  const state = window.state;
  let lightboxImageLoadToken = 0;

  function createLightboxBrowseContext(item) {
    const visibleItems = window.getVisibleHistoryItems ? window.getVisibleHistoryItems() : [];
    const activeIndex = visibleItems.findIndex(entry => entry.id === item.id);
    if (activeIndex === -1) {
      return { source: "standalone", collectionId: null, itemIds: [item.id], activeIndex: 0 };
    }
    const activeCollection = window.getCollectionById ? window.getCollectionById(state.selectedCollectionId) : null;
    return {
      source: activeCollection ? "collection" : "history",
      collectionId: activeCollection?.id || "all",
      itemIds: visibleItems.map(entry => entry.id),
      activeIndex
    };
  }

  function updateLightboxNavigationLabels() {
    const previous = document.getElementById("lightbox-previous");
    const next = document.getElementById("lightbox-next");
    const close = document.getElementById("lightbox-close");
    const status = document.getElementById("lightbox-position-status");
    const context = state.lightboxBrowseContext;
    const previousLabel = state.language === "th" ? "ภาพก่อนหน้า" : "Previous image";
    const nextLabel = state.language === "th" ? "ภาพถัดไป" : "Next image";
    const closeLabel = state.language === "th" ? "ปิดหน้าดูภาพ" : "Close image viewer";
    if (previous) {
      previous.setAttribute("aria-label", previousLabel);
      previous.title = previousLabel;
    }
    if (next) {
      next.setAttribute("aria-label", nextLabel);
      next.title = nextLabel;
    }
    if (close) close.setAttribute("aria-label", closeLabel);
    if (!status || !context || context.itemIds.length <= 1) {
      if (status) status.textContent = "";
      return;
    }
    status.textContent = state.language === "th"
      ? `ภาพ ${context.activeIndex + 1} จาก ${context.itemIds.length}`
      : `Image ${context.activeIndex + 1} of ${context.itemIds.length}`;
  }

  function renderLightboxNavigation() {
    const context = state.lightboxBrowseContext;
    const previous = document.getElementById("lightbox-previous");
    const next = document.getElementById("lightbox-next");
    const hasPrevious = Boolean(context && context.itemIds.length > 1 && context.activeIndex > 0);
    const hasNext = Boolean(context && context.itemIds.length > 1 && context.activeIndex < context.itemIds.length - 1);
    if (previous) previous.hidden = !hasPrevious;
    if (next) next.hidden = !hasNext;
    if (previous?.hidden && document.activeElement === previous) {
      (next?.hidden ? document.getElementById("lightbox-close") : next)?.focus({ preventScroll: true });
    }
    if (next?.hidden && document.activeElement === next) {
      (previous?.hidden ? document.getElementById("lightbox-close") : previous)?.focus({ preventScroll: true });
    }
    updateLightboxNavigationLabels();
  }

  function preloadLightboxNeighbors() {
    const context = state.lightboxBrowseContext;
    if (!context) return;
    [context.activeIndex - 1, context.activeIndex + 1].forEach(index => {
      const id = context.itemIds[index];
      const item = id ? state.history.find(entry => entry.id === id) : null;
      if (item?.imageUrl) {
        const preload = new Image();
        preload.src = item.imageUrl;
      }
    });
  }

  function setLightboxImage(item) {
    const img = document.getElementById("lightbox-image");
    const status = document.getElementById("lightbox-position-status");
    if (!img) return;
    const loadToken = ++lightboxImageLoadToken;
    img.classList.add("is-loading");
    img.alt = item.prompt
      ? `${state.language === "th" ? "ภาพที่สร้าง" : "Generated image"}: ${item.prompt.substring(0, 120)}`
      : (state.language === "th" ? "ภาพที่สร้างแบบเต็มขนาด" : "Full resolution generated image");
    img.onload = () => {
      if (loadToken !== lightboxImageLoadToken) return;
      img.classList.remove("is-loading");
      updateLightboxNavigationLabels();
    };
    img.onerror = () => {
      if (loadToken !== lightboxImageLoadToken) return;
      img.classList.remove("is-loading");
      if (status) status.textContent = state.language === "th" ? "โหลดภาพไม่สำเร็จ" : "Image failed to load";
    };
    img.src = item.imageUrl;
  }

  function openLightbox(item, { triggerElement = null, browseContext = null } = {}) {
    const modal = document.getElementById("lightbox-modal");
    if (!modal || !item) return;
    state.lightboxBrowseContext = browseContext || createLightboxBrowseContext(item);
    if (triggerElement) state.lightboxReturnFocus = triggerElement;
    modal.style.display = "flex";
    renderLightboxItem(item);
    requestAnimationFrame(() => document.getElementById("lightbox-close")?.focus({ preventScroll: true }));
  }

  function closeLightbox({ restoreFocus = true } = {}) {
    const modal = document.getElementById("lightbox-modal");
    if (!modal || modal.style.display === "none") return;
    modal.style.display = "none";
    modal.activeItem = null;
    state.lightboxBrowseContext = null;
    lightboxImageLoadToken += 1;
    const img = document.getElementById("lightbox-image");
    if (img) {
      img.onload = null;
      img.onerror = null;
      img.classList.remove("is-loading");
      img.removeAttribute("src");
    }
    renderLightboxNavigation();
    const returnFocus = state.lightboxReturnFocus;
    state.lightboxReturnFocus = null;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function navigateLightbox(direction) {
    const context = state.lightboxBrowseContext;
    if (!context || ![-1, 1].includes(direction)) return false;
    const nextIndex = context.activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= context.itemIds.length) return false;
    const nextItem = state.history.find(entry => entry.id === context.itemIds[nextIndex]);
    if (!nextItem) {
      syncOpenLightboxContext();
      return false;
    }
    context.activeIndex = nextIndex;
    renderLightboxItem(nextItem);
    return true;
  }

  function openLineageLightboxItem(item) {
    const context = state.lightboxBrowseContext;
    const contextIndex = context?.itemIds.indexOf(item.id) ?? -1;
    if (contextIndex >= 0) {
      context.activeIndex = contextIndex;
      renderLightboxItem(item);
      return;
    }
    state.lightboxBrowseContext = {
      source: "standalone",
      collectionId: null,
      itemIds: [item.id],
      activeIndex: 0
    };
    renderLightboxItem(item);
  }

  function syncOpenLightboxContext() {
    const modal = document.getElementById("lightbox-modal");
    const context = state.lightboxBrowseContext;
    if (!modal || modal.style.display === "none" || !context) return;
    const activeId = modal.activeItem?.id;
    if (context.source === "standalone") {
      const activeItem = state.history.find(entry => entry.id === activeId);
      if (activeItem) renderLightboxItem(activeItem);
      else closeLightbox();
      return;
    }
    if (context.source === "collection" && window.getCollectionById && !window.getCollectionById(context.collectionId)) {
      closeLightbox({ restoreFocus: false });
      return;
    }
    const visibleItems = window.getVisibleHistoryItems ? window.getVisibleHistoryItems() : [];
    if (visibleItems.length === 0) {
      closeLightbox();
      return;
    }
    const previousIndex = context.activeIndex;
    context.itemIds = visibleItems.map(item => item.id);
    const retainedIndex = context.itemIds.indexOf(activeId);
    context.activeIndex = retainedIndex >= 0
      ? retainedIndex
      : Math.min(previousIndex, context.itemIds.length - 1);
    renderLightboxItem(visibleItems[context.activeIndex]);
  }

  function renderLightboxItem(item) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-image");
    const title = document.getElementById("lightbox-meta-title");
    const promptTxt = document.getElementById("lightbox-meta-prompt");
    const engine = document.getElementById("lightbox-meta-engine");
    const model = document.getElementById("lightbox-meta-model");
    const time = document.getElementById("lightbox-meta-time");
    const duration = document.getElementById("lightbox-meta-duration");
    const dlLink = document.getElementById("lightbox-download-link");
    const lineageContainer = document.getElementById("lightbox-lineage-container");
    const lineageList = document.getElementById("lightbox-lineage-list");

    if (!modal || !img) return;

    modal.activeItem = item;

    setLightboxImage(item);
    title.textContent = `Generation Reference #${item.id.substring(4, 9)}`;
    promptTxt.textContent = item.prompt;
    engine.textContent = item.provider ? item.provider.toUpperCase() : "N/A";
    model.textContent = item.submodel || "N/A";
    const timestamp = Number(item.timestamp || item.createdAt || item.completedAt);
    time.textContent = Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp).toLocaleString()
      : "N/A";
    if (duration) duration.textContent = item.generationDuration ? `${item.generationDuration}s` : "N/A";
    dlLink.href = item.imageUrl;
    const outputExtension = item.imageUrl?.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || "png";
    dlLink.download = `modelpromptforge-generation-${item.id}.${outputExtension}`;
    if (window.renderLightboxCollections) window.renderLightboxCollections(item.id);

    if (lineageContainer && lineageList) {
      lineageList.innerHTML = "";
      const faceParents = item.referencedFaceJobIds || [];
      const styleParents = item.referencedStyleJobIds || [];
      const characterParents = item.referencedCharacterJobIds || [];
      const outfitParents = item.referencedOutfitJobIds || [];
      const lineageEntries = [
        ...faceParents.map(id => ({ id, type: "Face" })),
        ...styleParents.map(id => ({ id, type: "Style" })),
        ...characterParents.map(id => ({ id, type: "Character" })),
        ...outfitParents.map(id => ({ id, type: "Outfit" }))
      ].filter(p => p.id);
      const lineageById = new Map();
      lineageEntries.forEach(parent => {
        if (!lineageById.has(parent.id)) {
          lineageById.set(parent.id, { id: parent.id, types: [] });
        }
        const groupedParent = lineageById.get(parent.id);
        if (!groupedParent.types.includes(parent.type)) groupedParent.types.push(parent.type);
      });
      const allParents = [...lineageById.values()];

      if (allParents.length > 0) {
        allParents.forEach(p => {
          let parentItem = (state.history || []).find(h => h.id === p.id);
          const parentThumb = document.createElement("div");
          parentThumb.style.position = "relative";
          parentThumb.style.width = "42px";
          parentThumb.style.height = "42px";
          parentThumb.style.border = "1px solid rgba(255, 255, 255, 0.15)";
          parentThumb.style.borderRadius = "4px";
          parentThumb.style.cursor = "pointer";
          parentThumb.title = `${p.types.join(" + ")} Ref parent: #${p.id.substring(4, 9)}`;

          const thumbImg = document.createElement("img");
          thumbImg.src = parentItem ? (parentItem.thumbnailUrl || parentItem.imageUrl) : "";
          thumbImg.style.width = "100%";
          thumbImg.style.height = "100%";
          thumbImg.style.objectFit = "cover";
          thumbImg.style.borderRadius = "3px";

          const typeBadge = document.createElement("span");
          const typeCodes = { Face: "F", Style: "S", Character: "C", Outfit: "O" };
          typeBadge.textContent = p.types.map(type => typeCodes[type]).join("+");
          typeBadge.style.position = "absolute";
          typeBadge.style.bottom = "-2px";
          typeBadge.style.right = "-2px";
          typeBadge.style.background = p.types.length > 1
            ? "var(--neon-purple)"
            : (p.types[0] === "Face" ? "var(--neon-cyan)" : (p.types[0] === "Style" ? "var(--neon-pink)" : (p.types[0] === "Outfit" ? "var(--neon-purple)" : "var(--neon-gold)")));
          typeBadge.style.color = "#000";
          typeBadge.style.fontSize = "0.55rem";
          typeBadge.style.fontWeight = "900";
          typeBadge.style.padding = "0 3px";
          typeBadge.style.borderRadius = "2px";

          parentThumb.appendChild(thumbImg);
          parentThumb.appendChild(typeBadge);

          if (!parentItem) {
            fetch(`/api/history/${encodeURIComponent(p.id)}`)
              .then(response => response.ok ? response.json() : null)
              .then(loadedParent => {
                if (!loadedParent) return;
                parentItem = loadedParent;
                thumbImg.src = loadedParent.thumbnailUrl || loadedParent.imageUrl;
              })
              .catch(() => {});
          }

          parentThumb.addEventListener("click", async () => {
            if (parentItem) {
              openLineageLightboxItem(parentItem);
            } else {
              await AppDialog.alert(`Parent job #${p.id.substring(4, 9)} is no longer available.`, { title: "Parent Image Unavailable" });
            }
          });

          lineageList.appendChild(parentThumb);
        });
        lineageContainer.style.display = "block";
      } else {
        lineageContainer.style.display = "none";
      }
    }

    const btnUseTemplate = document.getElementById("btn-lightbox-use-template");
    if (btnUseTemplate) {
      if (item.sceneTemplateSnapshot && typeof item.sceneTemplateSnapshot === "object") {
        btnUseTemplate.style.display = "block";
        btnUseTemplate.onclick = () => {
          closeLightbox();
          if (state.mode !== "normal") {
            if (window.ModelPromptForgeCrossModeHandoff?.applyCharacterSheetToStoryMode) {
              window.ModelPromptForgeCrossModeHandoff.applyCharacterSheetToStoryMode({ sourceImageUrl: "" }, { useAsCharacterRef: false });
            }
          }
          window.ModelPromptForgeSceneReplacementChecklist.startTemplateWorkflow(item.sceneTemplateSnapshot);
        };
      } else {
        btnUseTemplate.style.display = "none";
        btnUseTemplate.onclick = null;
      }
    }

    const btnAddToTemplate = document.getElementById("btn-lightbox-add-to-template");
    if (btnAddToTemplate) {
      const isTemplateActive = window.ModelPromptForgeSceneReplacementChecklist?.isTemplateWorkflowActive?.();
      if (isTemplateActive) {
        btnAddToTemplate.style.display = "block";
        btnAddToTemplate.onclick = () => {
          if (window.ModelPromptForgeSceneHistorySlotPicker?.openTemplateSlotPicker) {
            window.ModelPromptForgeSceneHistorySlotPicker.openTemplateSlotPicker(item);
          }
        };
      } else {
        btnAddToTemplate.style.display = "none";
        btnAddToTemplate.onclick = null;
      }
    }

    if (window.ModelPromptForgeCrossModeHandoff?.renderLightboxHandoffActions) {
      window.ModelPromptForgeCrossModeHandoff.renderLightboxHandoffActions(item);
    }

    renderLightboxNavigation();
    preloadLightboxNeighbors();
  }

  // Expose to window
  window.createLightboxBrowseContext = createLightboxBrowseContext;
  window.updateLightboxNavigationLabels = updateLightboxNavigationLabels;
  window.renderLightboxNavigation = renderLightboxNavigation;
  window.preloadLightboxNeighbors = preloadLightboxNeighbors;
  window.setLightboxImage = setLightboxImage;
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
  window.navigateLightbox = navigateLightbox;
  window.openLineageLightboxItem = openLineageLightboxItem;
  window.syncOpenLightboxContext = syncOpenLightboxContext;
  window.renderLightboxItem = renderLightboxItem;
})();
