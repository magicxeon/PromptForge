/* Shared estimate and generate action bar. The caller owns submission. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function createGenerationActionBar({ mount, getPricingInputs, onGenerate, onCompare, getComparisonActive, showCompare = true } = {}) {
    if (!mount) throw new Error('GenerationActionBar requires a mount element.');
    let running = false; let timer = null;
    mount.innerHTML = `<div class="generation-action-bar"><div><strong data-estimate-label>${translate('playground.estimate.pending', 'Estimate required')}</strong><small data-estimate-detail></small></div><div class="generation-action-buttons">${showCompare ? `<button type="button" class="btn-compare-models" data-compare aria-pressed="false"><span class="compare-icon" aria-hidden="true"><i></i><i></i></span><span data-compare-label>${translate('playground.action.compare', 'Compare')}</span></button>` : ''}<button type="button" class="btn-neon-yellow-glow" data-generate><span data-generate-label>${translate('playground.action.generate', 'Generate image')}</span></button></div></div>`;
    const estimateLabel = mount.querySelector('[data-estimate-label]'); const estimateDetail = mount.querySelector('[data-estimate-detail]'); const generate = mount.querySelector('[data-generate]'); const compare = mount.querySelector('[data-compare]');
    const inputs = () => getPricingInputs?.() || null;
    const renderComparisonMode = () => {
      const comparisonActive = getComparisonActive?.() === true;
      if (compare) {
        compare.classList.toggle('active', comparisonActive);
        compare.setAttribute('aria-pressed', String(comparisonActive));
        compare.querySelector('[data-compare-label]').textContent = comparisonActive
          ? translate('playground.action.closeComparison', 'Close Compare')
          : translate('playground.action.compare', 'Compare');
      }
      generate.querySelector('[data-generate-label]').textContent = comparisonActive
        ? translate('playground.action.generateComparison', 'Generate Comparison')
        : translate('playground.action.generate', 'Generate image');
      renderEstimate();
    };
    const renderEstimate = (snapshot = window.creditEstimateController?.getState?.() || {}) => {
      if (getComparisonActive?.() === true) {
        estimateLabel.textContent = translate('playground.estimate.comparison', 'Comparison credits');
        estimateDetail.textContent = translate('playground.estimate.comparisonDetail', 'See the selected model total above');
        return;
      }
      if (snapshot.isLoading) { estimateLabel.textContent = translate('playground.estimate.loading', 'Estimating credits...'); estimateDetail.textContent = ''; return; }
      if (snapshot.estimate) { estimateLabel.textContent = `${snapshot.estimate.estimatedCredits} credits`; estimateDetail.textContent = translate('playground.estimate.locked', 'Locked before generation'); return; }
      estimateLabel.textContent = snapshot.error ? translate('playground.estimate.unavailable', 'Pricing unavailable') : translate('playground.estimate.pending', 'Estimate required'); estimateDetail.textContent = snapshot.error?.message || '';
    };
    const unsubscribe = window.creditEstimateController?.subscribe?.(renderEstimate);
    function refresh({ debounce = false } = {}) { if (getComparisonActive?.() === true) return null; const request = () => window.creditEstimateController?.updateEstimate?.(inputs()); if (!debounce) return request(); clearTimeout(timer); timer = window.setTimeout(request, 150); return null; }
    generate.addEventListener('click', async () => { if (running) return; running = true; generate.disabled = true; try { await onGenerate?.(); } finally { running = false; generate.disabled = false; } });
    compare?.addEventListener('click', async () => { if (running) return; running = true; compare.disabled = true; try { await onCompare?.(); } finally { running = false; compare.disabled = false; renderComparisonMode(); } });
    renderEstimate();
    renderComparisonMode();
    return { refresh, refreshComparisonMode: renderComparisonMode, destroy: () => { clearTimeout(timer); unsubscribe?.(); } };
  }
  namespace.createGenerationActionBar = createGenerationActionBar;
  window.ModelPromptForgeGenerationControls = namespace;
})();
