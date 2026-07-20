(() => {
  const STORAGE_KEY = 'model_prompt_forge_comparison_draft_v1';
  const state = {
    active: false,
    slots: [],
    activeSet: null,
    pollTimer: null,
    sharedView: { zoom: 1, x: 0, y: 0 },
    slotViews: new Map(),
    drag: null,
    generating: false
  };

  const text = (en, th) => window.ModelPromptForgeComparisonBridge?.getLanguage() === 'th' ? th : en;
  const bridge = () => window.ModelPromptForgeComparisonBridge;
  const getCatalog = () => bridge()?.getCatalog() || { providers: [] };
  const getProvider = providerId => getCatalog().providers.find(provider => provider.id === providerId);
  const getModel = (providerId, modelId) => getProvider(providerId)?.models.find(model => model.id === modelId);
  const label = value => value?.[bridge()?.getLanguage()] || value?.en || '';

  function initialize() {
    if (!bridge() || document.getElementById('btn-toggle-comparison')?.dataset.bound) return;
    document.getElementById('btn-toggle-comparison').dataset.bound = 'true';
    restoreDraft();
    bindEvents();
    renderMode();
    const recovery = readRecoveryState();
    if (isValidSetId(recovery.setId)) {
      openSet(recovery.setId, {
        showWorkspace: recovery.workspaceOpen === true,
        updateRoute: recovery.workspaceOpen === true
      });
    } else {
      saveRecoveryState(null, false);
    }
  }

  function bindEvents() {
    document.getElementById('btn-toggle-comparison')?.addEventListener('click', toggleMode);
    document.getElementById('comparison-active-run-chip')?.addEventListener('click', () => {
      if (!state.activeSet) return;
      saveRecoveryState(state.activeSet.id, true);
      openWorkspace();
      renderWorkspace();
      startPolling();
    });
    document.getElementById('btn-add-comparison-slot')?.addEventListener('click', addSlot);
    document.getElementById('btn-close-comparison-workspace')?.addEventListener('click', closeWorkspace);
    document.getElementById('btn-comparison-history')?.addEventListener('click', toggleSetDrawer);
    document.getElementById('btn-close-comparison-drawer')?.addEventListener('click', toggleSetDrawer);
    document.getElementById('btn-comparison-add-all')?.addEventListener('click', addAllToCollection);
    document.getElementById('comparison-sync-view')?.addEventListener('change', applyViewportTransforms);
    document.querySelectorAll('[data-comparison-view]').forEach(button => {
      button.addEventListener('click', () => handleViewCommand(button.dataset.comparisonView));
    });
    document.getElementById('api-provider-select')?.addEventListener('change', syncSlotOneFromSingle);
    document.getElementById('api-submodel-select')?.addEventListener('change', syncSlotOneFromSingle);
    document.getElementById('comparison-workspace-title')?.addEventListener('click', renameActiveSet);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('comparison-workspace')?.hidden) closeWorkspace();
    });
  }

  function toggleMode() {
    state.active = !state.active;
    if (state.active && state.slots.length < 2) createInitialSlots();
    if (!state.active && state.slots[0]) {
      const providerSelect = document.getElementById('api-provider-select');
      const modelSelect = document.getElementById('api-submodel-select');
      providerSelect.value = state.slots[0].provider;
      providerSelect.dispatchEvent(new Event('change'));
      requestAnimationFrame(() => {
        modelSelect.value = state.slots[0].model;
        modelSelect.dispatchEvent(new Event('change'));
      });
    }
    saveDraft();
    renderMode();
  }

  function createInitialSlots() {
    const provider = document.getElementById('api-provider-select')?.value || getCatalog().defaultProvider;
    const model = document.getElementById('api-submodel-select')?.value || getProvider(provider)?.defaultModel;
    const alternatives = getProvider(provider)?.models.filter(item => item.id !== model) || [];
    state.slots = [
      { id: createSlotId(), provider, model },
      { id: createSlotId(), provider, model: alternatives[0]?.id || model }
    ];
  }

  function syncSlotOneFromSingle() {
    if (!state.active || !state.slots[0]) return;
    state.slots[0].provider = document.getElementById('api-provider-select')?.value;
    state.slots[0].model = document.getElementById('api-submodel-select')?.value;
    saveDraft();
    renderTray();
  }

  function addSlot() {
    if (state.slots.length >= 4) return;
    const previous = state.slots[state.slots.length - 1];
    const provider = previous?.provider || getCatalog().defaultProvider;
    state.slots.push({ id: createSlotId(), provider, model: getProvider(provider)?.defaultModel || '' });
    saveDraft();
    renderTray();
  }

  function removeSlot(slotId) {
    if (state.slots.length <= 2) return;
    state.slots = state.slots.filter(slot => slot.id !== slotId);
    saveDraft();
    renderTray();
  }

  function moveSlot(slotId, direction) {
    const index = state.slots.findIndex(slot => slot.id === slotId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.slots.length) return;
    [state.slots[index], state.slots[target]] = [state.slots[target], state.slots[index]];
    saveDraft();
    renderTray();
  }

  function renderMode() {
    const tray = document.getElementById('comparison-model-tray');
    const button = document.getElementById('btn-toggle-comparison');
    const badge = document.getElementById('comparison-slot-badge');
    const generate = document.getElementById('btn-generate-image');
    tray.hidden = !state.active;
    button.classList.toggle('active', state.active);
    button.setAttribute('aria-pressed', String(state.active));
    badge.hidden = !state.active;
    badge.textContent = state.slots.length || 2;
    if (generate) {
      generate.innerHTML = state.active
        ? `${text('Generate Comparison', 'Generate Comaprison')} <span class="btn-credit-cost-dark">(${getEstimatedTotal()} Credits)</span>`
        : `⚡ Generate Image <span class="btn-credit-cost-dark">(${getSingleCredit()} Credit)</span>`;
    }
    if (state.active) renderTray();
  }

  function renderTray() {
    const list = document.getElementById('comparison-slot-list');
    if (!list) return;
    list.innerHTML = '';
    state.slots.forEach((slot, index) => list.appendChild(createSlotCard(slot, index)));
    document.getElementById('comparison-slot-count').textContent = `${state.slots.length} of 4`;
    document.getElementById('comparison-slot-badge').textContent = state.slots.length;
    document.getElementById('btn-add-comparison-slot').disabled = state.slots.length >= 4;
    document.getElementById('comparison-total-credits').textContent = `${getEstimatedTotal()} credits`;
    renderModeButtonCost();
  }

  function createSlotCard(slot, index) {
    const card = document.createElement('article');
    card.className = 'comparison-slot-card';
    const provider = getProvider(slot.provider);
    const model = getModel(slot.provider, slot.model);
    const warning = getCapabilityWarning(model);
    card.innerHTML = `
      <div class="comparison-slot-card-header">
        <strong>Slot ${index + 1}</strong>
        <div class="comparison-slot-order">
          <button type="button" data-move="-1" aria-label="Move slot left" ${index === 0 ? 'disabled' : ''}>‹</button>
          <button type="button" data-move="1" aria-label="Move slot right" ${index === state.slots.length - 1 ? 'disabled' : ''}>›</button>
          <button type="button" data-remove aria-label="Remove slot" ${state.slots.length <= 2 ? 'disabled' : ''}>×</button>
        </div>
      </div>
      <label>${text('Provider', 'ผู้ให้บริการ')}<select class="custom-select" data-provider></select></label>
      <label>${text('Model', 'โมเดล')}<select class="custom-select" data-model></select></label>
      <div class="comparison-slot-meta">
        <span>${Number(model?.estimatedCredits || 1)} credits</span>
        <span>${model?.capabilities?.imageReferences ? `${model.capabilities.maxReferenceImages || 0} refs` : 'text only'}</span>
      </div>
      ${warning ? `<p class="comparison-capability-warning">${escapeHtml(warning)}</p>` : ''}`;
    const providerSelect = card.querySelector('[data-provider]');
    getCatalog().providers.forEach(item => providerSelect.add(new Option(label(item.displayName), item.id)));
    providerSelect.value = provider?.id || getCatalog().defaultProvider;
    const modelSelect = card.querySelector('[data-model]');
    populateModelSelect(modelSelect, providerSelect.value, slot.model);
    providerSelect.addEventListener('change', () => {
      slot.provider = providerSelect.value;
      slot.model = getProvider(slot.provider)?.defaultModel || getProvider(slot.provider)?.models[0]?.id || '';
      saveDraft();
      renderTray();
    });
    modelSelect.addEventListener('change', () => {
      slot.model = modelSelect.value;
      saveDraft();
      renderTray();
    });
    card.querySelector('[data-remove]').addEventListener('click', () => removeSlot(slot.id));
    card.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => moveSlot(slot.id, Number(button.dataset.move))));
    return card;
  }

  function populateModelSelect(select, providerId, selectedModel) {
    select.innerHTML = '';
    const provider = getProvider(providerId);
    (provider?.models || []).forEach(model => select.add(new Option(label(model.displayName), model.id)));
    select.value = getModel(providerId, selectedModel)?.id || provider?.defaultModel || select.options[0]?.value || '';
  }

  async function generate() {
    if (state.generating) return;
    clearTrayError();
    if (!bridge()?.validateForm()) return;
    state.generating = true;
    const generateButton = document.getElementById('btn-generate-image');
    if (generateButton) generateButton.disabled = true;
    const payload = { ...bridge().getGenerationPayload(), slots: state.slots.map(slot => ({ ...slot })) };
    try {
      const estimate = await api('/api/comparisons/estimate', { method: 'POST', body: payload });
      const summary = estimate.slots.map((slot, index) =>
        `${index + 1}. ${label(slot.providerDisplayName)} / ${label(slot.modelDisplayName)}: ${slot.estimatedCredit} credits${slot.imageResolution ? `, ${slot.imageResolution}` : ''}${slot.resolutionFallback ? ` (${text('auto fallback', 'ปรับอัตโนมัติ')})` : ''}`
      ).join('\n');
      const confirmed = await AppDialog.confirm(
        `${text('Generate these comparison images?', 'ยืนยันการGenerate Comaprison?')}\n\n${summary}\n\n${text('Estimated total', 'เครดิตโดยประมาณรวม')}: ${estimate.estimatedTotalCredit} credits`,
        {
          title: text('Confirm AI Comparison', 'ยืนยันการเปรียบเทียบ AI'),
          confirmLabel: text('Generate Comparison', 'Generate Comaprison')
        }
      );
      if (!confirmed) return;
      window.scrollToActiveRenderScreen?.();
      const result = await api('/api/comparisons', {
        method: 'POST',
        body: {
          ...payload,
          name: text('AI Model Comparison', 'เปรียบเทียบโมเดล AI'),
          estimateToken: estimate.estimateToken,
          estimateExpiresAt: estimate.expiresAt,
          idempotencyKey: createIdempotencyKey()
        }
      });
      await openSet(result.setId);
      bridge().refreshCredits();
      bridge().refreshHistory();
    } catch (error) {
      showTrayError(error.message);
    } finally {
      state.generating = false;
      if (generateButton) generateButton.disabled = false;
    }
  }

  async function openSet(setId, { showWorkspace = true, updateRoute = true, silentError = false } = {}) {
    if (!isValidSetId(setId)) {
      stopPolling();
      saveRecoveryState(null, false);
      return null;
    }

    const normalizedSetId = String(setId).trim();
    const targetRoute = `/comparisons/${encodeURIComponent(normalizedSetId)}`;
    if (showWorkspace && updateRoute && window.ModelPromptForgeRouter?.current().pathname !== targetRoute) {
      window.ModelPromptForgeRouter.navigate(targetRoute);
      return;
    }
    try {
      state.activeSet = await api(`/api/comparisons/${encodeURIComponent(normalizedSetId)}?username=${encodeURIComponent(bridge().getUsername())}`);
      saveRecoveryState(normalizedSetId, showWorkspace);
      updateActiveRunChip();
      if (showWorkspace) {
        if (window.ModelPromptForgeRouter && window.ModelPromptForgeRouter.current().pathname !== targetRoute) return;
        openWorkspace();
        renderWorkspace();
      }
      startPolling();
      window.dispatchEvent(new CustomEvent('modelpromptforge:comparison-opened', { detail: { setId: normalizedSetId } }));
      return state.activeSet;
    } catch (error) {
      stopPolling();
      state.activeSet = null;
      saveRecoveryState(null, false);
      updateActiveRunChip();
      window.dispatchEvent(new CustomEvent('modelpromptforge:comparison-error', {
        detail: { setId: normalizedSetId, status: error.status || null, message: error.message }
      }));
      if (!silentError) {
        await AppDialog.alert(error.message, { title: text('Comparison Error', 'เกิดข้อผิดพลาดในการเปรียบเทียบ') });
      }
    }
  }

  function openWorkspace() {
    const workspace = document.getElementById('comparison-workspace');
    workspace.hidden = false;
    document.body.classList.add('comparison-workspace-open');
    workspace.focus?.();
  }

  function closeWorkspace({ updateRoute = true, destination = '/comparisons' } = {}) {
    document.getElementById('comparison-workspace').hidden = true;
    document.body.classList.remove('comparison-workspace-open');
    saveRecoveryState(state.activeSet?.id || null, false);
    updateActiveRunChip();
    if (updateRoute && window.ModelPromptForgeRouter?.current().pathname.startsWith('/comparisons/')) {
      window.ModelPromptForgeRouter.navigate(destination);
    }
  }

  function closeForRoute() {
    if (!document.getElementById('comparison-workspace')?.hidden) closeWorkspace({ updateRoute: false });
  }

  function handleSetDeleted(setId) {
    const recovery = readRecoveryState();
    if (recovery.setId === setId) saveRecoveryState(null, false);
    if (state.activeSet?.id !== setId) return;
    stopPolling();
    state.activeSet = null;
    saveRecoveryState(null, false);
    closeForRoute();
    updateActiveRunChip();
  }

  function renderWorkspace() {
    const set = state.activeSet;
    const run = set?.runs?.[0];
    if (!set || !run) return;
    document.getElementById('comparison-workspace-title').textContent = set.name;
    const completedCount = run.slots.filter(slot => slot.status === 'completed').length;
    document.getElementById('comparison-workspace-status').textContent = `${formatStatus(run.status)} · ${completedCount}/${run.slots.length}`;
    const grid = document.getElementById('comparison-result-grid');
    grid.dataset.slots = run.slots.length;
    grid.innerHTML = '';
    run.slots.forEach(slot => grid.appendChild(createResultCard(slot, set.winnerJobId === slot.jobId)));
    document.getElementById('btn-comparison-add-all').disabled = !run.slots.some(slot => slot.status === 'completed');
    updateActiveRunChip();
    applyViewportTransforms();
  }

  function updateActiveRunChip() {
    const chip = document.getElementById('comparison-active-run-chip');
    const run = state.activeSet?.runs?.[0];
    if (!chip || !run) {
      if (chip) chip.hidden = true;
      return;
    }
    const completed = run.slots.filter(slot => slot.status === 'completed').length;
    const terminal = ['completed', 'partially_completed', 'failed', 'cancelled'].includes(run.status);
    chip.hidden = false;
    chip.classList.toggle('terminal', terminal);
    document.getElementById('comparison-active-run-label').textContent = terminal
      ? `${text('Comparison', 'เปรียบเทียบ')} ${completed}/${run.slots.length}`
      : `${formatStatus(run.status)} ${completed}/${run.slots.length}`;
    chip.title = text('Open the latest Comparison Set', 'เปิดชุดเปรียบเทียบล่าสุด');
    chip.setAttribute('aria-label', chip.title);
    updateComparisonQueueCard(run, completed, terminal);
  }

  function updateComparisonQueueCard(run, completed, terminal) {
    const queueList = document.getElementById('active-queue-list');
    if (!queueList || !state.activeSet) return;
    const cardId = `queue-comparison-${state.activeSet.id}`;
    let card = document.getElementById(cardId);
    if (terminal) {
      card?.remove();
      return;
    }
    if (!card) {
      card = document.createElement('button');
      card.type = 'button';
      card.id = cardId;
      card.className = 'queue-item comparison-queue-item';
      card.addEventListener('click', () => {
        saveRecoveryState(state.activeSet.id, true);
        openWorkspace();
        renderWorkspace();
        startPolling();
      });
      queueList.appendChild(card);
    }
    card.innerHTML = `
      <span class="queue-item-left">
        <span class="queue-spinner"></span>
        <span>${text('AI Comparison', 'เปรียบเทียบ AI')} · ${completed}/${run.slots.length}</span>
      </span>
      <span class="queue-badge-status processing">${formatStatus(run.status)}</span>`;
  }

  function createResultCard(slot, winner) {
    const card = document.createElement('article');
    card.className = `comparison-result-card${winner ? ' winner' : ''}`;
    card.dataset.slotId = slot.id;
    const imageUrl = getSlotImageUrl(slot);
    card.innerHTML = `
      <header class="comparison-result-header">
        <div><span>${label(slot.providerDisplayName)}</span><strong>${label(slot.modelDisplayName)}</strong></div>
        <span class="comparison-status-pill status-${slot.status}">${formatStatus(slot.status)}</span>
      </header>
      <div class="comparison-image-viewport" tabindex="0" aria-label="${label(slot.modelDisplayName)} comparison image">
        ${imageUrl ? `<img src="${escapeAttribute(imageUrl)}" alt="Generated by ${escapeAttribute(label(slot.modelDisplayName))}" draggable="false">` : renderSlotPlaceholder(slot)}
      </div>
      <footer class="comparison-result-footer">
        <span>${slot.actualCredit || slot.estimatedCredit} credits${slot.result?.generationDuration ? ` · ${slot.result.generationDuration}s` : ''}</span>
        <div class="comparison-result-actions">
          ${imageUrl ? '<button type="button" data-open>Detail</button><button type="button" data-winner>Winner</button><button type="button" data-face>Face Ref</button><button type="button" data-style>Style Ref</button><button type="button" data-character>Character Ref</button><button type="button" data-collection>Collection</button><a data-download download>Download</a>' : ''}
        </div>
        ${slot.error ? `<details><summary>Technical details</summary><p>${escapeHtml(slot.error.message || 'Generation failed')}</p></details>` : ''}
      </footer>`;
    if (imageUrl) {
      const image = card.querySelector('img');
      image.addEventListener('load', applyViewportTransforms);
      card.querySelector('[data-open]').addEventListener('click', () => bridge().openLightbox({
        id: slot.jobId,
        imageUrl,
        prompt: slot.submittedPrompt,
        provider: slot.provider,
        submodel: slot.model
      }));
      card.querySelector('[data-winner]').addEventListener('click', () => setWinner(winner ? null : slot.jobId));
      card.querySelector('[data-face]').addEventListener('click', () => { bridge().useAsFaceReference(imageUrl, slot.jobId); closeWorkspace({ destination: '/studio' }); });
      card.querySelector('[data-style]').addEventListener('click', () => { bridge().useAsStyleReference(imageUrl, slot.jobId); closeWorkspace({ destination: '/studio' }); });
      card.querySelector('[data-character]').addEventListener('click', () => { bridge().useAsCharacterReference(imageUrl, slot.jobId); closeWorkspace({ destination: '/studio' }); });
      card.querySelector('[data-collection]').addEventListener('click', () => bridge().openCollectionPicker(slot.jobId));
      const download = card.querySelector('[data-download]');
      download.href = imageUrl;
      download.setAttribute('download', `${slot.jobId}.png`);
      bindViewport(card.querySelector('.comparison-image-viewport'), slot.id);
    }
    return card;
  }

  function getSlotImageUrl(slot) {
    return slot?.result?.imageUrl || slot?.imageUrl || slot?.thumbnailUrl || '';
  }

  function renderSlotPlaceholder(slot) {
    if (slot.status === 'failed') return `<div class="comparison-slot-placeholder failed"><strong>${text('Generation failed', 'สร้างภาพไม่สำเร็จ')}</strong><span>${escapeHtml(slot.error?.message || '')}</span></div>`;
    return `<div class="comparison-slot-placeholder"><span class="queue-spinner"></span><strong>${formatStatus(slot.status)}</strong></div>`;
  }

  async function setWinner(jobId) {
    await api(`/api/comparisons/${state.activeSet.id}/winner`, { method: 'PATCH', body: { jobId } });
    state.activeSet.winnerJobId = jobId;
    renderWorkspace();
  }

  async function renameActiveSet() {
    if (!state.activeSet) return;
    const name = await AppDialog.prompt(
      text('Enter a name for this Comparison Set.', 'กรอกชื่อชุดเปรียบเทียบนี้'),
      {
        title: text('Rename Comparison', 'เปลี่ยนชื่อชุดเปรียบเทียบ'),
        inputLabel: text('Comparison name', 'ชื่อชุดเปรียบเทียบ'),
        value: state.activeSet.name,
        required: true,
        confirmLabel: text('Save', 'บันทึก')
      }
    );
    if (!name || name.trim() === state.activeSet.name) return;
    state.activeSet = await api(`/api/comparisons/${state.activeSet.id}`, { method: 'PATCH', body: { name, username: bridge().getUsername() } });
    renderWorkspace();
  }

  async function addAllToCollection() {
    const completedIds = state.activeSet?.runs?.[0]?.slots.filter(slot => slot.status === 'completed').map(slot => slot.jobId) || [];
    if (!completedIds.length) return;
    await bridge().refreshCollections();
    const collections = bridge().getCollections();
    if (!collections.length) {
      await AppDialog.alert(
        text('Create a Collection before adding this set.', 'กรุณาสร้าง Collection ก่อนเพิ่มชุดภาพ'),
        { title: text('Collection Required', 'ต้องมี Collection ก่อน') }
      );
      return;
    }
    const preferred = collections.find(collection => collection.isDefault) || collections[0];
    const collectionId = await AppDialog.select(
      text('Choose where to keep all completed images in this Comparison Set.', 'เลือก Collection สำหรับเก็บภาพที่สร้างสำเร็จทั้งหมดในชุดเปรียบเทียบนี้'),
      {
        title: text('Add All to Collection', 'เพิ่มภาพทั้งหมดเข้า Collection'),
        inputLabel: 'Collection',
        value: preferred.id,
        options: collections.map(collection => ({
          value: collection.id,
          label: `${collection.isDefault ? '★ ' : ''}${collection.name} (${collection.imageCount})`
        })),
        confirmLabel: text('Add Images', 'เพิ่มรูปภาพ')
      }
    );
    if (collectionId === null) return;
    const target = collections.find(collection => collection.id === collectionId);
    if (!target) {
      await AppDialog.alert(text('The selected Collection is no longer available.', 'ไม่พบ Collection ที่เลือกแล้ว'), {
        title: text('Collection Unavailable', 'ไม่พบ Collection')
      });
      return;
    }
    await api(`/api/collections/${target.id}/images`, { method: 'POST', body: { jobIds: completedIds } });
    await bridge().refreshCollections();
  }

  async function toggleSetDrawer() {
    const drawer = document.getElementById('comparison-set-drawer');
    drawer.hidden = !drawer.hidden;
    if (!drawer.hidden) await renderSetList();
  }

  async function renderSetList() {
    const response = await api(`/api/comparisons?username=${encodeURIComponent(bridge().getUsername())}`);
    const list = document.getElementById('comparison-set-list');
    list.innerHTML = '';
    const sets = response.items || response.sets || [];
    if (!sets.length) list.innerHTML = `<p>${text('No saved comparisons.', 'ยังไม่มีชุดเปรียบเทียบ')}</p>`;
    sets.forEach(set => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'comparison-set-list-item';
      button.innerHTML = `<strong>${escapeHtml(set.name)}</strong><span>${formatStatus(set.latestRun?.status)} · ${new Date(set.updatedAt).toLocaleString()}</span>`;
      button.addEventListener('click', () => openSet(set.id));
      list.appendChild(button);
    });
  }

  function startPolling() {
    stopPolling();
    if (!isValidSetId(state.activeSet?.id)) return;
    const tick = async () => {
      const setId = state.activeSet?.id;
      if (!isValidSetId(setId)) {
        stopPolling();
        return;
      }
      try {
        state.activeSet = await api(`/api/comparisons/${encodeURIComponent(setId)}?username=${encodeURIComponent(bridge().getUsername())}`);
        updateActiveRunChip();
        if (!document.getElementById('comparison-workspace').hidden) renderWorkspace();
        const status = state.activeSet.runs?.[0]?.status;
        if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(status)) {
          stopPolling();
          bridge().refreshCredits();
          bridge().refreshHistory();
          return;
        }
      } catch (error) {
        console.warn('Comparison polling failed:', error.message);
      }
      if (isValidSetId(state.activeSet?.id)) {
        state.pollTimer = window.setTimeout(tick, 1600);
      }
    };
    state.pollTimer = window.setTimeout(tick, 700);
  }

  function stopPolling() {
    if (state.pollTimer) window.clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }

  function bindViewport(viewport, slotId) {
    viewport.addEventListener('wheel', event => {
      event.preventDefault();
      updateView(slotId, view => ({ ...view, zoom: clamp(view.zoom * (event.deltaY < 0 ? 1.12 : 0.89), 1, 6) }));
    }, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      if (!viewport.querySelector('img')) return;
      viewport.setPointerCapture(event.pointerId);
      state.drag = { slotId, x: event.clientX, y: event.clientY };
      viewport.classList.add('dragging');
    });
    viewport.addEventListener('pointermove', event => {
      if (!state.drag || state.drag.slotId !== slotId) return;
      const rect = viewport.getBoundingClientRect();
      const dx = (event.clientX - state.drag.x) / rect.width;
      const dy = (event.clientY - state.drag.y) / rect.height;
      state.drag.x = event.clientX;
      state.drag.y = event.clientY;
      updateView(slotId, view => ({ ...view, x: clamp(view.x + dx, -1, 1), y: clamp(view.y + dy, -1, 1) }));
    });
    const stopDrag = () => { state.drag = null; viewport.classList.remove('dragging'); };
    viewport.addEventListener('pointerup', stopDrag);
    viewport.addEventListener('pointercancel', stopDrag);
  }

  function updateView(slotId, updater) {
    if (document.getElementById('comparison-sync-view').checked) state.sharedView = updater(state.sharedView);
    else state.slotViews.set(slotId, updater(state.slotViews.get(slotId) || { ...state.sharedView }));
    requestAnimationFrame(applyViewportTransforms);
  }

  function applyViewportTransforms() {
    const synced = document.getElementById('comparison-sync-view')?.checked !== false;
    document.querySelectorAll('.comparison-result-card').forEach(card => {
      const image = card.querySelector('.comparison-image-viewport img');
      if (!image) return;
      const view = synced ? state.sharedView : (state.slotViews.get(card.dataset.slotId) || state.sharedView);
      image.style.transform = `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.zoom})`;
    });
    const labelElement = document.getElementById('comparison-zoom-label');
    if (labelElement) labelElement.textContent = state.sharedView.zoom === 1 ? 'Fit' : `${Math.round(state.sharedView.zoom * 100)}%`;
  }

  function handleViewCommand(command) {
    if (command === 'fullscreen') {
      const workspace = document.getElementById('comparison-workspace');
      if (!document.fullscreenElement) workspace.requestFullscreen?.();
      else document.exitFullscreen?.();
      return;
    }
    if (command === 'zoom-in') state.sharedView.zoom = clamp(state.sharedView.zoom * 1.2, 1, 6);
    if (command === 'zoom-out') state.sharedView.zoom = clamp(state.sharedView.zoom / 1.2, 1, 6);
    if (command === 'actual') state.sharedView = { zoom: 2, x: 0, y: 0 };
    if (command === 'fit' || command === 'reset') {
      state.sharedView = { zoom: 1, x: 0, y: 0 };
      if (command === 'reset') state.slotViews.clear();
    }
    requestAnimationFrame(applyViewportTransforms);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: options.body
        ? { 'Content-Type': 'application/json', 'X-User-Role': bridge()?.getUserRole?.() || 'user' }
        : undefined,
      body: options.body ? JSON.stringify({ ...options.body, username: options.body.username || bridge()?.getUsername() }) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || payload.error || `Request failed with HTTP ${response.status}`);
      error.status = response.status;
      error.code = payload.error?.code || null;
      throw error;
    }
    return payload;
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: state.active, slots: state.slots }));
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.active = draft?.active === true;
      state.slots = Array.isArray(draft?.slots) ? draft.slots.slice(0, 4) : [];
      state.slots = state.slots.filter(slot => getModel(slot.provider, slot.model));
      if (state.active && state.slots.length < 2) createInitialSlots();
    } catch {
      state.active = false;
      state.slots = [];
    }
  }

  function saveRecoveryState(setId, workspaceOpen) {
    const normalizedSetId = isValidSetId(setId) ? String(setId).trim() : null;
    localStorage.setItem('model_prompt_forge_comparison_recovery_v1', JSON.stringify({
      setId: normalizedSetId,
      workspaceOpen: normalizedSetId ? workspaceOpen === true : false
    }));
  }

  function readRecoveryState() {
    try {
      const recovery = JSON.parse(localStorage.getItem('model_prompt_forge_comparison_recovery_v1')) || {};
      return isValidSetId(recovery.setId)
        ? { setId: String(recovery.setId).trim(), workspaceOpen: recovery.workspaceOpen === true }
        : {};
    } catch {
      return {};
    }
  }

  function isValidSetId(setId) {
    const normalized = typeof setId === 'string' ? setId.trim() : '';
    return Boolean(normalized) && normalized !== 'undefined' && normalized !== 'null';
  }

  function getEstimatedTotal() {
    return state.slots.reduce((total, slot) => total + Number(getModel(slot.provider, slot.model)?.estimatedCredits || 1), 0);
  }

  function getSingleCredit() {
    return Number(getModel(
      document.getElementById('api-provider-select')?.value,
      document.getElementById('api-submodel-select')?.value
    )?.estimatedCredits || 1);
  }

  function getCapabilityWarning(model) {
    if (!model || !bridge()) return text('Select an available model.', 'กรุณาเลือกโมเดลที่พร้อมใช้งาน');
    const payload = bridge().getGenerationPayload();
    const referenceValues = [
      payload.faceReferenceImageA, payload.faceReferenceImageB,
      payload.styleReferenceImageA, payload.styleReferenceImageB,
      payload.characterReferenceImageA, payload.characterReferenceImageB
    ].filter(Boolean);
    const referenceCount = new Set(referenceValues).size;
    if (referenceCount > Number(model.capabilities?.maxReferenceImages || 0)) {
      return text(
        `Current setup uses ${referenceCount} references; this model supports ${model.capabilities?.maxReferenceImages || 0}.`,
        `การตั้งค่าปัจจุบันใช้ภาพอ้างอิง ${referenceCount} ภาพ แต่โมเดลนี้รองรับ ${model.capabilities?.maxReferenceImages || 0} ภาพ`
      );
    }
    if (Array.isArray(model.capabilities?.aspectRatios) && !model.capabilities.aspectRatios.includes(payload.aspectRatio)) {
      return text(
        `This model does not support ${payload.aspectRatio}.`,
        `โมเดลนี้ไม่รองรับอัตราส่วน ${payload.aspectRatio}`
      );
    }
    return getResolutionNotice(model, payload.imageResolution);
  }

  function getResolutionNotice(model, requestedResolution) {
    const supported = model?.capabilities?.resolutions;
    if (!Array.isArray(supported) || supported.length === 0 || !requestedResolution || supported.includes(requestedResolution)) return '';
    const fallback = supported.includes(model.defaults?.resolution) ? model.defaults.resolution : supported[0];
    if (!fallback) return '';
    return text(
      `${label(model.displayName)} does not support ${requestedResolution}; comparison will use ${fallback} for this slot.`,
      `${label(model.displayName)} ไม่รองรับ ${requestedResolution}; ระบบจะใช้ ${fallback} สำหรับ slot นี้`
    );
  }

  function renderModeButtonCost() {
    const cost = document.querySelector('#btn-generate-image .btn-credit-cost-dark');
    if (cost && state.active) cost.textContent = `(${getEstimatedTotal()} Credits)`;
  }

  function showTrayError(message) {
    const error = document.getElementById('comparison-tray-error');
    error.textContent = message;
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearTrayError() { document.getElementById('comparison-tray-error').textContent = ''; }
  function formatStatus(status = 'queued') { return status.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()); }
  function createSlotId() { return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
  function createIdempotencyKey() { return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function escapeHtml(value) { const element = document.createElement('span'); element.textContent = value || ''; return element.innerHTML; }
  function escapeAttribute(value) { return escapeHtml(value).replaceAll('"', '&quot;'); }

  window.ModelPromptForgeComparison = {
    isActive: () => state.active,
    generate,
    openSet,
    closeForRoute,
    handleSetDeleted
  };
  window.addEventListener('modelpromptforge:ready', initialize);
  document.addEventListener('DOMContentLoaded', () => { if (bridge()) initialize(); });
})();
