/* Composes Playground UI and hydrates canonical Studio generation state on submit. */
(() => {
  let initialized = false;
  let controls = null;
  const state = () => window.ModelPromptForgePlaygroundState?.getState?.() || null;
  const persist = patch => window.ModelPromptForgePlaygroundState?.patch?.(patch);

  function buildManualPrompt(data) {
    const prompt = String(data.prompt || '').trim();
    const negative = String(data.negativePrompt || '').trim();
    return negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;
  }

  function pricingInputs() {
    const data = state();
    const refs = Object.values(data?.references || {}).filter(Boolean);
    return { routingMode: 'advanced', qualityTier: 'standard', generationMode: 'playground', requestedProviderId: data?.settings?.providerId || null, requestedModelId: data?.settings?.modelId || null, resolution: data?.settings?.resolution || '1K', quality: null, referenceCount: new Set(refs).size, outputCount: 1 };
  }

  function syncStudioSelections(data) {
    const studioState = window.state;
    const prior = {
      mode: studioState.mode,
      generationSurface: studioState.generationSurface,
      sceneBuilder: studioState.sceneBuilder,
      imageReferences: studioState.imageReferences,
      aspectRatio: studioState.aspectRatio,
      faceReferenceJobIds: studioState.faceReferenceJobIds,
      styleReferenceJobIds: studioState.styleReferenceJobIds,
      characterReferenceJobIds: studioState.characterReferenceJobIds,
      outfitReferenceJobIds: studioState.outfitReferenceJobIds,
      outfitReferenceOverrides: studioState.outfitReferenceOverrides,
      faceReferenceImageA: studioState.faceReferenceImageA,
      faceReferenceImageB: studioState.faceReferenceImageB,
      styleReferenceImageA: studioState.styleReferenceImageA,
      styleReferenceImageB: studioState.styleReferenceImageB,
      characterReferenceImageA: studioState.characterReferenceImageA,
      characterReferenceImageB: studioState.characterReferenceImageB,
      outfitReferenceImageFront: studioState.outfitReferenceImageFront,
      outfitReferenceImageBack: studioState.outfitReferenceImageBack,
      providerId: document.getElementById('api-provider-select')?.value || '',
      modelId: document.getElementById('api-submodel-select')?.value || '',
      resolution: document.getElementById('image-resolution-select')?.value || ''
    };
    const refs = data.references || {};
    studioState.mode = 'normal';
    studioState.generationSurface = 'playground';
    studioState.sceneBuilder = { ...(studioState.sceneBuilder || {}), authoringMode: 'manual', manualPromptText: buildManualPrompt(data), lastGuidedPromptSnapshot: '' };
    studioState.imageReferences = { ...(studioState.imageReferences || {}), faceMatch: Boolean(refs.face), styleMatch: Boolean(refs.style), poseMatch: Boolean(refs.pose), characterReference: Boolean(refs.character), outfitReference: Boolean(refs.outfitFront), characterOverrides: false };
    studioState.faceReferenceImageA = refs.face || null; studioState.faceReferenceImageB = null;
    studioState.styleReferenceImageA = refs.style || refs.pose || null;
    studioState.styleReferenceImageB = refs.style && refs.pose ? refs.pose : null;
    studioState.characterReferenceImageA = refs.character || null; studioState.characterReferenceImageB = null;
    studioState.outfitReferenceImageFront = refs.outfitFront || null; studioState.outfitReferenceImageBack = refs.outfitBack || null;
    studioState.faceReferenceJobIds = [];
    studioState.styleReferenceJobIds = [];
    studioState.characterReferenceJobIds = [];
    studioState.outfitReferenceJobIds = [];
    studioState.outfitReferenceOverrides = { enabled: false, primaryColor: false, secondaryColor: false, pattern: false, material: false };
    studioState.aspectRatio = data.settings.aspectRatio || '6:8';
    const provider = document.getElementById('api-provider-select');
    const model = document.getElementById('api-submodel-select');
    if (provider && data.settings.providerId) { provider.value = data.settings.providerId; provider.dispatchEvent(new Event('change')); }
    if (model && data.settings.modelId) { model.value = data.settings.modelId; model.dispatchEvent(new Event('change')); }
    const resolution = document.getElementById('image-resolution-select');
    if (resolution && data.settings.resolution) resolution.value = data.settings.resolution;
    document.querySelectorAll('#aspect-ratio-group .option-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.ratio === studioState.aspectRatio));
    const manualInput = document.getElementById('manual-prompt-input');
    if (manualInput) manualInput.value = studioState.sceneBuilder.manualPromptText;
    return () => {
      Object.assign(studioState, prior);
      const restoreProvider = document.getElementById('api-provider-select');
      const restoreModel = document.getElementById('api-submodel-select');
      const restoreResolution = document.getElementById('image-resolution-select');
      if (restoreProvider && prior.providerId) {
        restoreProvider.value = prior.providerId;
        window.updateSubmodelList?.(prior.modelId);
      }
      if (restoreModel && prior.modelId) restoreModel.value = prior.modelId;
      if (restoreResolution && prior.resolution) restoreResolution.value = prior.resolution;
      document.querySelectorAll('#aspect-ratio-group .option-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.ratio === prior.aspectRatio));
    };
  }

  async function generate() {
    const data = state();
    if (!String(data?.prompt || '').trim()) { await window.AppDialog?.alert?.(window.ModelPromptForgeI18n?.t?.('playground.validation.promptRequired', {}, { defaultValue: 'Write a prompt before generating.' }) || 'Write a prompt before generating.', { title: window.ModelPromptForgeI18n?.t?.('playground.validation.promptRequiredTitle', {}, { defaultValue: 'Prompt required' }) || 'Prompt required' }); return; }
    if (controls.engine?.isComparisonActive?.()) return controls.engine.submitComparison();
    const restore = syncStudioSelections(data);
    window.ModelPromptForgeRouter?.navigate('/studio');
    document.getElementById('btn-generate-image')?.click();
    restore();
  }

  async function submitComparison(data = state(), slots = []) {
    const restore = syncStudioSelections(data);
    try {
      if (!window.ModelPromptForgeComparison?.startFromExternal) {
        throw new Error('Comparison service is not ready. Please reload and try again.');
      }
      await window.ModelPromptForgeComparison.startFromExternal(slots);
    } catch (error) {
      await window.AppDialog?.alert?.(error.message, { title: 'Comparison unavailable' });
    } finally {
      restore();
    }
  }

  function render() {
    window.ModelPromptForgePlaygroundPage?.render?.();
    controls?.actions?.destroy?.();
    controls?.engine?.destroy?.();
    const data = window.ModelPromptForgePlaygroundState.load();
    const shared = window.ModelPromptForgeGenerationControls;
    controls = {};
    controls.prompt = shared.createPromptEditor({ mount: document.getElementById('playground-prompt-editor'), value: data, onChange: patch => { persist(patch); controls.actions.refresh({ debounce: true }); } });
    controls.references = shared.createReferenceSlotManager({ mount: document.getElementById('playground-reference-slots'), value: data.references, onChange: references => { persist({ references }); controls.actions.refresh({ debounce: true }); } });
    controls.engine = shared.createEngineTargetComparisonPanel({
      mount: document.getElementById('playground-engine-target-panel'),
      idPrefix: 'playground-engine-target',
      value: { ...data.settings, comparisonSlots: data.comparisonSlots },
      getCatalog: () => window.state?.providerCatalog || { providers: [] },
      options: { showStepBadge: false, showComparison: true, showActiveRun: true, showResolution: true, showDimensions: true, showAspectRatio: true },
      onEngineChange: next => {
        persist({
          settings: { providerId: next.providerId, modelId: next.modelId, resolution: next.resolution, aspectRatio: next.aspectRatio, width: next.width, height: next.height },
          comparisonSlots: Array.isArray(next.comparisonSlots) ? next.comparisonSlots : state()?.comparisonSlots || []
        });
        controls.actions?.refresh({ debounce: true });
      },
      getComparisonEstimate: async ({ slots }) => {
        const playgroundData = state();
        const restore = syncStudioSelections(playgroundData);
        try {
          return await window.ModelPromptForgeComparison?.estimateForPayload?.({
            ...window.getGenerationRequestPayload?.(),
            slots
          });
        } finally {
          restore();
        }
      },
      onComparisonModeChange: () => controls.actions?.refreshComparisonMode?.(),
      onComparisonSubmit: ({ slots }) => submitComparison(state(), slots)
    });
    controls.actions = shared.createGenerationActionBar({ mount: document.getElementById('playground-generation-actions'), getPricingInputs: pricingInputs, onGenerate: generate, getComparisonActive: () => controls.engine?.isComparisonActive?.(), showCompare: false });
    controls.actions.refresh();
  }

  function initialize() {
    if (initialized || !window.ModelPromptForgePlaygroundState || !window.ModelPromptForgeGenerationControls) return;
    initialized = true;
    render();
    window.ModelPromptForgeActorContext?.subscribeActorChange?.(() => render());
    window.addEventListener('modelpromptforge:languagechange', render);
  }
  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgePlayground = { initialize, generate, pricingInputs };
})();
