(() => {
  const stateStore = () => window.ModelPromptForgeCharacterProfileState;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function begin(characterProfileId, characterProfileVersionId) {
    const plan = await window.ModelPromptForgeCharacterProfileApi.createCastingPlan(
      characterProfileId,
      { characterProfileVersionId }
    );
    stateStore().write({ castingPlan: plan });
    window.ModelPromptForgeRouter.navigate('/studio');
    window.setTimeout(() => {
      if (window.state) {
        window.state.mode = 'character-sheet';
        window.state.characterType = 'reusable_model';
        localStorage.setItem('model_prompt_forge_active_mode', 'character-sheet');
      }
      window.rerenderDynamicForm?.({ preserveOpenAccordions: false });
      renderBanner();
      window.refreshGenerationCreditEstimate?.();
      document.getElementById('engine-target-output')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 0);
    return plan;
  }

  function enrichGenerationPayload(payload) {
    const plan = stateStore().read().castingPlan;
    if (!plan?.characterProfileId || !plan.referenceImageUrl) {
      return window.ModelPromptForgeCharacterHandoff?.enrichGenerationPayload?.(payload) || payload;
    }
    return {
      ...payload,
      mode: 'character-sheet',
      characterType: 'reusable_model',
      aspectRatio: plan.aspectRatio || '6:8',
      outputCount: 1,
      selections: plan.structuredCharacterSnapshot?.selections || payload.selections,
      imageReferences: {
        faceMatch: false,
        styleMatch: false,
        poseMatch: false,
        characterReference: true,
        characterOverrides: false,
        outfitReference: false,
        outfitReferenceFront: false,
        outfitReferenceBack: false
      },
      faceReferenceImageA: null,
      faceReferenceImageB: null,
      faceReferenceJobIds: [],
      styleReferenceImageA: null,
      styleReferenceImageB: null,
      styleReferenceJobIds: [],
      characterReferenceImageA: plan.referenceImageUrl,
      characterReferenceImageB: null,
      characterReferenceJobIds: [plan.referenceGenerationResultId].filter(Boolean),
      outfitReferenceImageFront: null,
      outfitReferenceImageBack: null,
      outfitReferenceJobIds: [],
      characterProfileContext: plan.generationMetadata
    };
  }

  function renderBanner() {
    document.querySelector('[data-character-casting-banner]')?.remove();
    const plan = stateStore().read().castingPlan;
    if (!plan) return;
    const host = document.getElementById('creative-configurator');
    if (!host) return;
    const banner = document.createElement('section');
    banner.className = 'character-casting-banner';
    banner.dataset.characterCastingBanner = 'true';
    banner.innerHTML = `
      <div>
        <strong>${t('character-profiles.casting.active', 'Character Casting Export')}</strong>
        <span>${t('character-profiles.casting.activeHelp', 'The next generation creates the standardized three-view casting sheet and uses normal generation credits.')}</span>
      </div>
      <button type="button" data-cancel-character-casting>${t('common.actions.cancel', 'Cancel')}</button>`;
    banner.querySelector('[data-cancel-character-casting]')?.addEventListener('click', () => {
      stateStore().clearCastingPlan();
      banner.remove();
      window.refreshGenerationCreditEstimate?.();
    });
    host.prepend(banner);
  }

  window.addEventListener('modelpromptforge:ready', renderBanner);
  window.addEventListener('modelpromptforge:actorchange', renderBanner);
  window.addEventListener('modelpromptforge:languagechange', renderBanner);
  window.addEventListener('modelpromptforge:generationcompleted', event => {
    const plan = stateStore().read().castingPlan;
    if (!plan || event.detail?.request?.characterProfileContext?.purpose !== 'character_casting_export') return;
    stateStore().clearCastingPlan();
    document.querySelector('[data-character-casting-banner]')?.remove();
    const actions = document.getElementById('viewport-loopback-actions');
    if (!actions || actions.querySelector('[data-review-character-casting]')) return;
    const review = document.createElement('button');
    review.type = 'button';
    review.dataset.reviewCharacterCasting = 'true';
    review.textContent = t('character-profiles.actions.reviewCasting', 'Review Character Casting');
    review.addEventListener('click', () =>
      window.ModelPromptForgeRouter.navigate(`/community/characters/${encodeURIComponent(plan.characterProfileId)}`)
    );
    actions.appendChild(review);
  });
  window.ModelPromptForgeCharacterCastingExport = { begin, enrichGenerationPayload, renderBanner };
})();
