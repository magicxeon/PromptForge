/* Shared presentation for a single generation result on Studio-like surfaces. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  const recentLimit = 6;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const escapeAttribute = escapeHtml;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeState(value = {}) {
    const recent = Array.isArray(value.recent) ? value.recent.filter(item => item?.imageUrl).slice(0, recentLimit) : [];
    return {
      status: ['idle', 'preparing', 'queued', 'partial', 'completed', 'failed'].includes(value.status) ? value.status : 'idle',
      latest: value.latest?.imageUrl ? value.latest : null,
      preview: null,
      recent,
      error: value.error?.message ? value.error : null
    };
  }

  function createGenerationResultSurface({
    mount,
    surface = 'studio',
    value = {},
    showRecentRenders = true,
    showHandoffActions = false,
    legacyStudioIds = false,
    onGoToPrompt = () => {},
    onResultStateChange = () => {}
  } = {}) {
    if (!mount) throw new Error('GenerationResultSurface requires a mount element.');

    if (legacyStudioIds) {
      mount.classList.add('generation-result-surface-mount');
      mount.innerHTML = `
        <div class="viewport-column" data-generation-surface="studio">
          <div class="viewport-card-header">
            <h3>Active Render Screen</h3>
            <button id="btn-download-image" class="btn-download" title="Download Generated Image" style="display: none;" type="button"><span>Download Image</span></button>
          </div>
          <div class="viewport-screen" id="viewport-screen">
            <div class="image-loading-overlay" id="image-loading-overlay"><div class="loading-pulse-ring"></div><p class="loading-text">Generating character details...</p></div>
            <div class="viewport-placeholder-content" id="viewport-placeholder"><span class="viewport-placeholder-icon">+</span><p class="placeholder-main-text">Ready to render character</p><p class="sub-placeholder">Configure attributes below and click Generate Image</p></div>
            <div class="viewport-error-banner" id="viewport-error" style="display: none;"><span class="error-icon">!</span><div class="error-content"><p class="error-msg" id="error-message">Generation failed</p><details class="error-details" id="error-details" style="display: none;"><summary>Technical details</summary><span id="error-technical-message"></span></details></div></div>
            <img id="generated-image" src="" alt="Generated Character Output">
          </div>
          <div class="viewport-actions-row" id="viewport-loopback-actions" style="display: none; gap: 0.5rem; margin-top: 0.5rem; width: 100%;">
            <button id="btn-viewport-use-face" class="btn-compact-neon btn-use-face-ref" style="flex: 1; font-size: 0.72rem; padding: 0.45rem;" type="button">Use as Face Ref</button>
            <button id="btn-viewport-use-style" class="btn-compact-neon btn-use-style-ref" style="flex: 1; font-size: 0.72rem; padding: 0.45rem;" type="button">Use as Style Ref</button>
            <button id="btn-viewport-use-character" class="btn-compact-neon btn-use-character-ref" style="display: none; flex: 1; font-size: 0.72rem; padding: 0.45rem;" type="button">Use as Character Ref</button>
          </div>
          <div class="telemetry-bar" id="telemetry-bar" style="display: none;"><div class="telemetry-item"><span class="tel-label">Model:</span> <span id="tel-model">-</span></div><div class="telemetry-item"><span class="tel-label">Time:</span> <span id="tel-time">-</span></div><div class="telemetry-item"><span class="tel-label">Aspect:</span> <span id="tel-aspect">-</span></div></div>
        </div>`;
      return { applyGenerationStatus: () => {}, setComparisonMode: () => {}, destroy: () => { mount.innerHTML = ''; } };
    }

    let model = normalizeState(value);
    let comparisonActive = false;

    mount.classList.add('generation-result-surface-mount');

    const emit = () => onResultStateChange(clone(model));
    const labelForStatus = status => ({
      preparing: translate('playground.result.preparing', 'Preparing generation'),
      queued: translate('playground.result.queued', 'Queued'),
      partial: translate('playground.result.generating', 'Generating preview'),
      completed: translate('playground.result.completed', 'Completed'),
      failed: translate('playground.result.failed', 'Generation failed')
    }[status] || translate('playground.result.ready', 'Ready to generate'));

    function openItem(item, triggerElement) {
      if (!item?.imageUrl) return;
      window.openLightbox?.(item, { triggerElement });
    }

    async function copyPrompt(prompt, button) {
      if (!prompt) return;
      try {
        await navigator.clipboard?.writeText(prompt);
        button.textContent = translate('playground.result.copied', 'Copied');
        window.setTimeout(() => { button.textContent = translate('playground.result.copyPrompt', 'Copy prompt'); }, 1200);
      } catch {
        window.AppDialog?.alert?.(prompt, { title: translate('playground.result.promptTitle', 'Generation prompt') });
      }
    }

    function render() {
      const latest = model.latest;
      const isFailed = model.status === 'failed';
      const isLoading = ['preparing', 'queued', 'partial'].includes(model.status);
      const displayItem = isFailed || ['preparing', 'queued'].includes(model.status)
        ? null
        : (model.preview || latest);
      const hasResult = Boolean(displayItem?.imageUrl);
      const canActOnResult = Boolean(latest?.imageUrl) && model.status === 'completed';
      const isCollapsed = !comparisonActive && model.status === 'idle' && !hasResult;
      const stageMarkup = comparisonActive
        ? `<div class="generation-result-comparison-state">${translate('playground.result.comparisonDescription', 'Comparison mode owns the results. Generate to view every model in the comparison workspace.')}</div>`
        : isLoading
          ? `<div class="generation-result-loading"><span class="queue-spinner"></span><span>${labelForStatus(model.status)}</span></div>`
          : isFailed
            ? `<div class="generation-result-error"><strong>${escapeHtml(model.error?.message || translate('playground.result.failed', 'Generation failed'))}</strong>${model.error?.technicalMessage ? `<details><summary>${translate('playground.result.technicalDetails', 'Technical details')}</summary><p>${escapeHtml(model.error.technicalMessage)}</p></details>` : ''}<button type="button" data-go-prompt>${translate('playground.result.goToPrompt', 'Go to prompt')}</button></div>`
            : hasResult
              ? `<button type="button" class="generation-result-image-button" data-open-result aria-label="${translate('playground.result.openImage', 'Open generated image')}"><img src="${escapeAttribute(displayItem.imageUrl)}" alt="${translate('playground.result.imageAlt', 'Generated image result')}"></button>`
              : '';
      mount.innerHTML = `
        <section class="generation-result-surface ${isCollapsed ? 'is-collapsed' : ''}" data-generation-surface="${surface}">
          <header class="generation-result-surface-header">
            <div><span class="generation-result-kicker">${translate('playground.result.kicker', 'LATEST RENDER')}</span><h3>${translate('playground.result.title', 'Render result')}</h3></div>
            ${isCollapsed ? `<button type="button" class="generation-result-go-prompt" data-go-prompt>${translate('playground.result.goToPrompt', 'Go to prompt')}</button>` : `<span class="generation-result-status ${isFailed ? 'is-error' : isLoading ? 'is-running' : ''}">${comparisonActive ? translate('playground.result.comparisonActive', 'Comparison results open below') : labelForStatus(model.status)}</span>`}
          </header>
          ${isCollapsed ? '' : `<div class="generation-result-stage ${hasResult ? 'has-result' : ''}" data-result-stage>${stageMarkup}</div>`}
          <div class="generation-result-meta" ${hasResult && !comparisonActive ? '' : 'hidden'}>
            <span>${escapeHtml(displayItem?.provider || '-')}</span><span>${escapeHtml(displayItem?.submodel || '-')}</span><span>${displayItem?.generationDuration ? `${escapeHtml(String(displayItem.generationDuration))}s` : ''}</span>
          </div>
          <div class="generation-result-actions" ${canActOnResult && !comparisonActive ? '' : 'hidden'}>
            <button type="button" data-open-result>${translate('playground.result.openDetail', 'Open detail')}</button>
            <a data-download-result download>${translate('playground.result.download', 'Download')}</a>
            <button type="button" data-copy-prompt>${translate('playground.result.copyPrompt', 'Copy prompt')}</button>
          </div>
          ${showRecentRenders ? `<section class="generation-result-recent" ${model.recent.length ? '' : 'hidden'}><div><h4>${translate('playground.result.recentTitle', 'Recent Playground renders')}</h4><span>${model.recent.length}</span></div><div class="generation-result-recent-grid" data-recent-grid></div></section>` : ''}
        </section>`;

      const open = mount.querySelectorAll('[data-open-result]');
      open.forEach(button => button.addEventListener('click', () => openItem(displayItem, button)));
      mount.querySelectorAll('[data-go-prompt]').forEach(button => button.addEventListener('click', () => onGoToPrompt()));
      const download = mount.querySelector('[data-download-result]');
      if (download && latest?.imageUrl) {
        download.href = latest.imageUrl;
        download.download = `${latest.id || 'playground-render'}.png`;
      }
      mount.querySelector('[data-copy-prompt]')?.addEventListener('click', event => copyPrompt(latest?.prompt, event.currentTarget));

      const recentGrid = mount.querySelector('[data-recent-grid]');
      model.recent.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'generation-result-recent-item';
        button.title = item.prompt || translate('playground.result.openImage', 'Open generated image');
        button.innerHTML = `<img src="${escapeAttribute(item.thumbnailUrl || item.imageUrl)}" alt="${translate('playground.result.imageAlt', 'Generated image result')}">`;
        button.addEventListener('click', () => openItem(item, button));
        recentGrid?.appendChild(button);
      });
    }

    function setComparisonMode(active) {
      comparisonActive = active === true;
      render();
    }

    function applyGenerationStatus(detail = {}) {
      if (detail.surface !== surface) return;
      if (detail.type === 'submitted') {
        model = { ...model, status: 'preparing', preview: null, error: null };
      } else if (detail.type === 'queued') {
        model = { ...model, status: 'queued', preview: null, error: null };
      } else if (detail.type === 'partial') {
        model = { ...model, status: 'partial', preview: detail.imageUrl ? { imageUrl: detail.imageUrl, provider: detail.provider, submodel: detail.submodel } : null, error: null };
      } else if (detail.type === 'completed' && detail.job?.imageUrl) {
        const latest = detail.job;
        const recent = [latest, ...model.recent.filter(item => item.id !== latest.id)].slice(0, recentLimit);
        model = { ...model, status: 'completed', latest, preview: null, recent, error: null };
        emit();
      } else if (detail.type === 'failed') {
        model = { ...model, status: 'failed', preview: null, error: detail.error || { message: translate('playground.result.failed', 'Generation failed') } };
      }
      render();
    }

    render();
    return {
      applyGenerationStatus,
      setComparisonMode,
      focus: () => mount.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      destroy: () => { mount.innerHTML = ''; }
    };
  }

  namespace.createGenerationResultSurface = createGenerationResultSurface;
  window.ModelPromptForgeGenerationControls = namespace;
})();
