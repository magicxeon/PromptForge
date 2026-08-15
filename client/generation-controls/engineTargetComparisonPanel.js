/* Canonical Engine & Target Output plus comparison configuration UI. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const ratios = ['6:8', '1:1', '9:16', '16:9', '4:5'];
  const dimensions = { '6:8': [768, 1024], '1:1': [1024, 1024], '9:16': [1080, 1920], '16:9': [1920, 1080], '4:5': [1024, 1280] };
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  const localized = value => window.getLocalizedLabel?.(value) || value?.en || String(value || '');
  const panels = new Set();

  function createId() {
    return `comparison_slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function createEngineTargetComparisonPanel({
    mount,
    idPrefix = 'engine-target',
    value = {},
    options = {},
    getCatalog = () => window.state?.providerCatalog || { providers: [] },
    onEngineChange,
    onComparisonSubmit,
    getComparisonEstimate,
    onComparisonModeChange
  } = {}) {
    if (!mount) throw new Error('EngineTargetComparisonPanel requires a mount element.');
    const config = {
      showStepBadge: true,
      stepLabel: 'Step 2',
      showComparison: true,
      showActiveRun: true,
      showResolution: true,
      showDimensions: true,
      showAspectRatio: true,
      legacyStudioIds: false,
      ...options
    };
    const ids = config.legacyStudioIds
      ? { provider: 'api-provider-select', model: 'api-submodel-select', resolution: 'image-resolution-select', resolutionField: 'image-resolution-field', width: 'input-width', height: 'input-height', ratios: 'aspect-ratio-group', summary: 'model-capability-summary' }
      : { provider: `${idPrefix}-provider`, model: `${idPrefix}-model`, resolution: `${idPrefix}-resolution`, resolutionField: `${idPrefix}-resolution-field`, width: `${idPrefix}-width`, height: `${idPrefix}-height`, ratios: `${idPrefix}-ratios`, summary: `${idPrefix}-summary` };
    const current = {
      providerId: value.providerId || '', modelId: value.modelId || '', resolution: value.resolution || null,
      width: Number(value.width || 768), height: Number(value.height || 1024), aspectRatio: value.aspectRatio || '6:8'
    };
    let slots = Array.isArray(value.comparisonSlots) ? value.comparisonSlots.slice(0, 4).map(slot => ({ ...slot, id: slot.id || createId() })) : [];
    let comparisonOpen = false;
    let activeRun = null;
    let comparisonEstimate = null;
    let estimateError = '';
    let estimateLoading = false;
    let estimateTimer = null;
    let estimateRevision = 0;

    const catalog = () => getCatalog() || { providers: [] };
    const provider = id => catalog().providers?.find(item => item.id === (id || current.providerId)) || null;
    const model = () => provider()?.models?.find(item => item.id === current.modelId) || null;
    const getEngineValue = () => {
      if (!config.legacyStudioIds) return { ...current };
      return {
        providerId: document.getElementById(ids.provider)?.value || current.providerId,
        modelId: document.getElementById(ids.model)?.value || current.modelId,
        resolution: document.getElementById(ids.resolution)?.value || current.resolution,
        width: Number(document.getElementById(ids.width)?.value || current.width),
        height: Number(document.getElementById(ids.height)?.value || current.height),
        aspectRatio: document.querySelector(`#${ids.ratios} .option-chip.active`)?.dataset.ratio || current.aspectRatio
      };
    };
    const emitEngine = () => onEngineChange?.(getEngineValue());
    const emitSlots = () => onEngineChange?.({ ...getEngineValue(), comparisonSlots: slots.map(slot => ({ ...slot })) });

    function normalizeEngine() {
      const list = catalog().providers || [];
      if (!list.some(item => item.id === current.providerId)) current.providerId = catalog().defaultProvider || list[0]?.id || '';
      const selectedProvider = provider();
      if (!selectedProvider?.models?.some(item => item.id === current.modelId)) current.modelId = selectedProvider?.defaultModel || selectedProvider?.models?.[0]?.id || '';
      const resolutions = model()?.capabilities?.resolutions || [];
      current.resolution = resolutions.length ? (resolutions.includes(current.resolution) ? current.resolution : model()?.defaults?.resolution || resolutions[0]) : null;
    }

    function defaultSlots() {
      const settings = getEngineValue();
      const selectedProvider = provider(settings.providerId) || catalog().providers?.[0];
      const first = settings.modelId || selectedProvider?.defaultModel || selectedProvider?.models?.[0]?.id || '';
      const second = selectedProvider?.models?.find(item => item.id !== first)?.id || first;
      return selectedProvider ? [{ id: createId(), provider: selectedProvider.id, model: first }, { id: createId(), provider: selectedProvider.id, model: second }] : [];
    }

    function render() {
      normalizeEngine();
      mount.innerHTML = `<div class="step-header engine-step-header"><div class="step-title-group">${config.showStepBadge ? `<span class="step-badge">${config.stepLabel}</span>` : ''}<h3>Engine &amp; Target Output</h3></div><div class="comparison-model-actions" aria-label="Model comparison actions">${config.showActiveRun ? `<button class="comparison-active-run-chip" type="button" data-active-run hidden><span class="comparison-active-dot" aria-hidden="true"></span><span data-active-run-label>Comparison 0/2</span></button>` : ''}${config.showComparison ? `<button class="btn-compare-models" type="button" data-toggle-comparison aria-pressed="false" title="Compare AI Models"><span class="compare-icon" aria-hidden="true"><i></i><i></i></span><span class="compare-label">Compare</span><span class="comparison-slot-badge" data-slot-badge hidden>2</span></button>` : ''}</div></div><div class="engine-settings-grid"><div class="form-field" data-single-model-field><label for="${ids.provider}">Provider Engine</label><select id="${ids.provider}" class="custom-select" data-provider></select></div><div class="form-field" data-single-model-field><label for="${ids.model}">Submodel Version</label><select id="${ids.model}" class="custom-select" data-model></select><small id="${ids.summary}" class="field-option-help" aria-live="polite"></small></div>${config.showResolution ? `<div id="${ids.resolutionField}" class="form-field" data-resolution-field><label for="${ids.resolution}">Output Resolution</label><select id="${ids.resolution}" class="custom-select" data-resolution></select></div>` : ''}${config.showDimensions ? `<div id="${config.legacyStudioIds ? 'pixel-dimensions-field' : `${idPrefix}-dimensions`}" class="form-field"><label for="${ids.width}">Width (px)</label><input type="number" id="${ids.width}" class="custom-select" value="${current.width}" min="720" max="4096" step="8"></div><div class="form-field"><label for="${ids.height}">Height (px)</label><input type="number" id="${ids.height}" class="custom-select" value="${current.height}" min="720" max="4096" step="8"></div>` : ''}${config.showAspectRatio ? `<div class="form-field full-width"><label>Aspect Ratio</label><div class="chip-group" id="${ids.ratios}" data-ratios></div></div>` : ''}</div>${config.showComparison ? `<section class="comparison-model-tray" data-comparison-tray hidden><div class="comparison-tray-header"><div><span class="comparison-kicker">FAIR COMPARISON</span><h4>AI Model Comparison</h4></div><span class="comparison-slot-count" data-slot-count>2 of 4</span></div><div class="comparison-slot-list" data-slot-list></div><div class="comparison-tray-footer"><button class="btn-neon-outline" type="button" data-add-slot>+ Add Model</button><div class="comparison-estimate-total"><span>Estimated total</span><strong data-total-credits>2 credits</strong></div></div><p class="comparison-inline-error" data-comparison-error role="alert"></p></section>` : ''}`;
      renderEngineOptions();
      renderComparison();
      bindEvents();
      setActiveRun(activeRun);
    }

    function renderEngineOptions() {
      const providerSelect = mount.querySelector('[data-provider]');
      const modelSelect = mount.querySelector('[data-model]');
      if (providerSelect) {
        providerSelect.innerHTML = '';
        (catalog().providers || []).forEach(item => providerSelect.add(new Option(localized(item.displayName), item.id)));
        providerSelect.value = current.providerId;
      }
      if (modelSelect) {
        modelSelect.innerHTML = '';
        (provider()?.models || []).forEach(item => modelSelect.add(new Option(localized(item.displayName), item.id)));
        modelSelect.value = current.modelId;
      }
      const selectedModel = model();
      const resolutions = selectedModel?.capabilities?.resolutions || [];
      const resolutionField = mount.querySelector('[data-resolution-field]');
      const resolutionSelect = mount.querySelector('[data-resolution]');
      const supportsResolutionSelection = resolutions.length > 0;
      if (resolutionSelect) {
        resolutionSelect.innerHTML = '';
        resolutions.forEach(item => resolutionSelect.add(new Option(String(item).toUpperCase(), item)));
        resolutionSelect.value = current.resolution || '';
        resolutionSelect.disabled = !supportsResolutionSelection;
      }
      if (resolutionField) {
        resolutionField.hidden = !supportsResolutionSelection;
        resolutionField.style.display = supportsResolutionSelection ? '' : 'none';
        resolutionField.setAttribute('aria-hidden', String(!supportsResolutionSelection));
      }
      const ratioList = mount.querySelector('[data-ratios]');
      if (ratioList) ratios.forEach(ratio => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = `option-chip${ratio === current.aspectRatio ? ' active' : ''}`; button.dataset.ratio = ratio;
        button.textContent = ratio === '6:8' ? '6:8 Portrait' : ratio === '1:1' ? '1:1 Square' : ratio === '9:16' ? '9:16 Mobile' : ratio === '16:9' ? '16:9 Wide' : '4:5 Insta';
        ratioList.appendChild(button);
      });
    }

    function renderComparison() {
      const tray = mount.querySelector('[data-comparison-tray]');
      if (!tray) return;
      tray.hidden = !comparisonOpen;
      const engineSettings = mount.querySelector('.engine-settings-grid');
      engineSettings?.classList.toggle('comparison-mode-active', comparisonOpen);
      mount.querySelectorAll('[data-single-model-field]').forEach(field => {
        field.hidden = comparisonOpen;
        field.style.display = comparisonOpen ? 'none' : '';
        field.setAttribute('aria-hidden', String(comparisonOpen));
      });
      const toggle = mount.querySelector('[data-toggle-comparison]');
      const badge = mount.querySelector('[data-slot-badge]');
      toggle.classList.toggle('active', comparisonOpen); toggle.setAttribute('aria-pressed', String(comparisonOpen));
      badge.hidden = !comparisonOpen; badge.textContent = slots.length || 2;
      if (!comparisonOpen) return;
      if (slots.length < 2) slots = defaultSlots();
      const list = mount.querySelector('[data-slot-list]'); list.innerHTML = '';
      slots.forEach((slot, index) => list.appendChild(renderSlot(slot, index)));
      mount.querySelector('[data-slot-count]').textContent = `${slots.length} of 4`;
      mount.querySelector('[data-add-slot]').disabled = slots.length >= 4;
      renderComparisonEstimate();
    }

    function renderComparisonEstimate() {
      const total = mount.querySelector('[data-total-credits]');
      const error = mount.querySelector('[data-comparison-error]');
      if (!total) return;
      if (estimateLoading) total.textContent = 'Estimating credits...';
      else if (comparisonEstimate?.estimatedTotalCredit !== undefined) total.textContent = `${comparisonEstimate.estimatedTotalCredit} credits`;
      else total.textContent = 'Estimate unavailable';
      if (error && estimateError) error.textContent = estimateError;
    }

    function scheduleComparisonEstimate() {
      clearTimeout(estimateTimer);
      if (!comparisonOpen || typeof getComparisonEstimate !== 'function' || slots.length < 2) return;
      const revision = ++estimateRevision;
      estimateTimer = window.setTimeout(async () => {
        estimateLoading = true; estimateError = ''; renderComparisonEstimate();
        try {
          const estimate = await getComparisonEstimate({ slots: slots.map(slot => ({ ...slot })), value: getEngineValue() });
          if (revision !== estimateRevision || !comparisonOpen) return;
          comparisonEstimate = estimate;
        } catch (error) {
          if (revision !== estimateRevision || !comparisonOpen) return;
          comparisonEstimate = null;
          estimateError = error.message || 'Unable to estimate comparison credits.';
        } finally {
          if (revision === estimateRevision && comparisonOpen) { estimateLoading = false; renderComparisonEstimate(); }
        }
      }, 140);
    }

    function renderSlot(slot, index) {
      const card = document.createElement('article');
      card.className = 'comparison-slot-card';
      card.innerHTML = `<div class="comparison-slot-card-header"><strong>Slot ${index + 1}</strong><div class="comparison-slot-order"><button type="button" data-move="-1" aria-label="Move slot left" ${index === 0 ? 'disabled' : ''}>&lsaquo;</button><button type="button" data-move="1" aria-label="Move slot right" ${index === slots.length - 1 ? 'disabled' : ''}>&rsaquo;</button><button type="button" data-remove aria-label="Remove slot" ${slots.length <= 2 ? 'disabled' : ''}>&times;</button></div></div><label>Provider<select class="custom-select" data-provider></select></label><label>Model<select class="custom-select" data-model></select></label><div class="comparison-slot-meta"><span data-credits></span><span data-references></span></div><p class="comparison-capability-warning" data-warning hidden></p>`;
      const providerSelect = card.querySelector('[data-provider]');
      (catalog().providers || []).forEach(item => providerSelect.add(new Option(localized(item.displayName), item.id)));
      providerSelect.value = provider(slot.provider)?.id || catalog().defaultProvider || catalog().providers?.[0]?.id || '';
      const modelSelect = card.querySelector('[data-model]');
      const renderModels = () => {
        const activeProvider = provider(providerSelect.value); modelSelect.innerHTML = '';
        (activeProvider?.models || []).forEach(item => modelSelect.add(new Option(localized(item.displayName), item.id)));
        if (!activeProvider?.models?.some(item => item.id === slot.model)) slot.model = activeProvider?.defaultModel || activeProvider?.models?.[0]?.id || '';
        modelSelect.value = slot.model;
        const selected = activeProvider?.models?.find(item => item.id === slot.model);
        const pricedSlot = comparisonEstimate?.slots?.find(item => item.id === slot.id);
        const creditLabel = estimateLoading
          ? 'Estimating credits...'
          : Number.isFinite(Number(pricedSlot?.estimatedCredit))
            ? `${Number(pricedSlot.estimatedCredit)} credits`
            : 'Estimate pending';
        card.querySelector('[data-credits]').textContent = creditLabel;
        card.querySelector('[data-references]').textContent = selected?.capabilities?.imageReferences ? `${selected.capabilities.maxReferenceImages || 0} refs` : 'text only';
        const requestedRatio = getEngineValue().aspectRatio;
        const warning = Array.isArray(selected?.capabilities?.aspectRatios) && !selected.capabilities.aspectRatios.includes(requestedRatio) ? `Does not support ${requestedRatio}; a supported ratio will be used.` : '';
        const warningNode = card.querySelector('[data-warning]'); warningNode.hidden = !warning; warningNode.textContent = warning;
      };
      renderModels();
      providerSelect.addEventListener('change', () => { slot.provider = providerSelect.value; slot.model = ''; comparisonEstimate = null; renderComparison(); emitSlots(); scheduleComparisonEstimate(); });
      modelSelect.addEventListener('change', () => { slot.model = modelSelect.value; comparisonEstimate = null; renderComparison(); emitSlots(); scheduleComparisonEstimate(); });
      card.querySelector('[data-remove]').addEventListener('click', () => { if (slots.length > 2) { slots = slots.filter(item => item.id !== slot.id); comparisonEstimate = null; renderComparison(); emitSlots(); scheduleComparisonEstimate(); } });
      card.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => { const next = index + Number(button.dataset.move); if (next >= 0 && next < slots.length) { [slots[index], slots[next]] = [slots[next], slots[index]]; comparisonEstimate = null; renderComparison(); emitSlots(); scheduleComparisonEstimate(); } }));
      return card;
    }

    function bindEvents() {
      mount.querySelector('[data-toggle-comparison]')?.addEventListener('click', toggleComparison);
      mount.querySelector('[data-add-slot]')?.addEventListener('click', () => { if (slots.length < 4) { const previous = slots.at(-1); const item = provider(previous?.provider) || catalog().providers?.[0]; slots.push({ id: createId(), provider: item?.id || '', model: item?.defaultModel || item?.models?.[0]?.id || '' }); comparisonEstimate = null; renderComparison(); emitSlots(); scheduleComparisonEstimate(); } });
      if (config.legacyStudioIds) {
        [ids.provider, ids.model, ids.resolution, ids.width, ids.height].forEach(id => {
          document.getElementById(id)?.addEventListener('change', () => { if (comparisonOpen) scheduleComparisonEstimate(); });
        });
        mount.querySelectorAll('[data-ratios] .option-chip').forEach(button => button.addEventListener('click', () => { if (comparisonOpen) scheduleComparisonEstimate(); }));
        return;
      }
      mount.querySelector('[data-provider]')?.addEventListener('change', event => { current.providerId = event.target.value; current.modelId = ''; normalizeEngine(); render(); emitEngine(); if (comparisonOpen) scheduleComparisonEstimate(); });
      mount.querySelector('[data-model]')?.addEventListener('change', event => { current.modelId = event.target.value; normalizeEngine(); render(); emitEngine(); if (comparisonOpen) scheduleComparisonEstimate(); });
      mount.querySelector('[data-resolution]')?.addEventListener('change', event => { current.resolution = event.target.value || null; emitEngine(); if (comparisonOpen) scheduleComparisonEstimate(); });
      mount.querySelectorAll('[data-ratios] .option-chip').forEach(button => button.addEventListener('click', () => { current.aspectRatio = button.dataset.ratio; [current.width, current.height] = dimensions[current.aspectRatio] || dimensions['6:8']; render(); emitEngine(); if (comparisonOpen) scheduleComparisonEstimate(); }));
    }

    function toggleComparison() {
      comparisonOpen = !comparisonOpen;
      if (comparisonOpen && slots.length < 2) slots = defaultSlots();
      comparisonEstimate = null; estimateError = ''; estimateLoading = false; ++estimateRevision;
      renderComparison();
      onComparisonModeChange?.(comparisonOpen);
      if (comparisonOpen) {
        scheduleComparisonEstimate();
        window.requestAnimationFrame(() => {
          mount.querySelector('[data-comparison-tray]')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        });
      }
      return comparisonOpen;
    }

    async function submitComparison() {
      const error = mount.querySelector('[data-comparison-error]');
      if (!comparisonOpen || slots.length < 2) return false;
      error.textContent = '';
      try {
        await onComparisonSubmit?.({ slots: slots.map(slot => ({ ...slot })), value: getEngineValue() });
        return true;
      } catch (exception) {
        error.textContent = exception.message || 'Unable to start comparison.';
        return false;
      }
    }

    function setActiveRun(run) {
      activeRun = run || null;
      const chip = mount.querySelector('[data-active-run]');
      if (!chip) return;
      if (!activeRun) { chip.hidden = true; return; }
      const completed = activeRun.slots?.filter(slot => slot.status === 'completed').length || 0;
      const terminal = ['completed', 'partially_completed', 'failed', 'cancelled'].includes(activeRun.status);
      chip.hidden = false; chip.classList.toggle('terminal', terminal);
      chip.querySelector('[data-active-run-label]').textContent = terminal ? `Comparison ${completed}/${activeRun.slots?.length || 0}` : `${String(activeRun.status || 'queued').replaceAll('_', ' ')} ${completed}/${activeRun.slots?.length || 0}`;
      chip.onclick = () => window.ModelPromptForgeComparison?.openActiveWorkspace?.();
    }

    render();
    setActiveRun(window.ModelPromptForgeComparison?.getActiveRun?.() || null);
    panels.add({ setActiveRun });
    return {
      getValue: () => ({ ...getEngineValue(), comparisonSlots: slots.map(slot => ({ ...slot })) }),
      setValue: next => { Object.assign(current, next || {}); if (Array.isArray(next?.comparisonSlots)) slots = next.comparisonSlots.map(slot => ({ ...slot, id: slot.id || createId() })); render(); },
      refresh: render, isComparisonActive: () => comparisonOpen, toggleComparison, submitComparison, setActiveRun,
      destroy: () => panels.forEach(panel => { if (panel.setActiveRun === setActiveRun) panels.delete(panel); })
    };
  }

  namespace.createEngineTargetComparisonPanel = createEngineTargetComparisonPanel;
  window.ModelPromptForgeGenerationControls = namespace;
  window.ModelPromptForgeEngineTargetComparisonPanels = { updateActiveRun: run => panels.forEach(panel => panel.setActiveRun(run)) };
})();
