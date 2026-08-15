(() => {
  let instanceCounter = 0;

  const TYPES = Object.freeze({
    REUSABLE_MODEL: 'reusable_model',
    STYLED_CHARACTER: 'styled_character'
  });

  const REUSABLE_CASTING = Object.freeze({
    layoutId: 'character-casting-three-view-v2',
    uniformPolicyId: 'casting-uniform-white-v1',
    aspectRatio: '6:8',
    outputCount: 1,
    promptDirective: 'professional full-body reusable character casting sheet showing exactly three views of the same character side by side in one horizontal row, front view, exact side profile and back view, complete head-to-feet figure in every view at the same scale, generous clear margins above the hair and below the feet, never crop the head, hair, arms, hands, legs or feet, neutral upright standing pose'
  });

  const TYPE_CAPABILITIES = Object.freeze({
    [TYPES.REUSABLE_MODEL]: Object.freeze({
      destinations: Object.freeze(['fashion_blueprint', 'scene_builder']),
      outfitBehavior: 'replaceable',
      requiresCastingExport: false,
      initialGenerationIsCastingCandidate: true
    }),
    [TYPES.STYLED_CHARACTER]: Object.freeze({
      destinations: Object.freeze(['scene_builder']),
      outfitBehavior: 'preserve',
      requiresCastingExport: false
    })
  });

  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function normalizeType(value) {
    return value === TYPES.STYLED_CHARACTER ? TYPES.STYLED_CHARACTER : TYPES.REUSABLE_MODEL;
  }

  function getCapabilities(value) {
    return TYPE_CAPABILITIES[normalizeType(value)];
  }

  function create({
    value = TYPES.REUSABLE_MODEL,
    disabled = false,
    onChange = null,
    compact = false
  } = {}) {
    const root = document.createElement('section');
    const titleId = `character-type-control-title-${++instanceCounter}`;
    root.className = `character-type-control${compact ? ' is-compact' : ''}`;
    root.setAttribute('aria-labelledby', titleId);
    render(root, normalizeType(value), disabled, titleId);
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-character-type]');
      if (!button || button.disabled) return;
      const nextType = normalizeType(button.dataset.characterType);
      if (nextType === normalizeType(root.dataset.value)) return;
      root.dataset.value = nextType;
      syncSelection(root, nextType);
      onChange?.(nextType, getCapabilities(nextType));
    });
    return root;
  }

  function render(root, value, disabled, titleId) {
    root.dataset.value = value;
    root.innerHTML = `
      <div class="character-type-control-heading">
        <div>
          <span class="character-profile-kicker">${escapeHtml(t('character-profiles.type.kicker', 'CHARACTER TYPE'))}</span>
          <h3 id="${titleId}">${escapeHtml(t('character-profiles.type.title', 'Choose how this Character will be used'))}</h3>
        </div>
        <span class="character-type-current" data-character-type-current></span>
      </div>
      <div class="character-type-segments" role="radiogroup" aria-labelledby="${titleId}">
        ${typeButton(
          TYPES.REUSABLE_MODEL,
          t('character-profiles.type.reusable', 'Reusable Model'),
          t('character-profiles.type.reusableDetail', 'Fashion and Scene'),
          disabled
        )}
        ${typeButton(
          TYPES.STYLED_CHARACTER,
          t('character-profiles.type.styled', 'Styled Character'),
          t('character-profiles.type.styledDetail', 'Scene with original outfit'),
          disabled
        )}
      </div>`;
    syncSelection(root, value);
  }

  function typeButton(type, label, detail, disabled) {
    return `<button type="button" class="character-type-option" data-character-type="${type}"
      role="radio" aria-checked="false" ${disabled ? 'disabled' : ''}>
      <span class="character-type-option-mark" aria-hidden="true"></span>
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>
    </button>`;
  }

  function syncSelection(root, value) {
    root.querySelectorAll('[data-character-type]').forEach(button => {
      const selected = button.dataset.characterType === value;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
    const current = root.querySelector('[data-character-type-current]');
    if (current) {
      current.textContent = value === TYPES.STYLED_CHARACTER
        ? t('character-profiles.type.outfitBound', 'Outfit bound')
        : t('character-profiles.type.readyForCasting', 'Casting ready');
    }
  }

  function applyCharacterSheetPolicy({
    root = document,
    state = window.state,
    clearIncompatible = false
  } = {}) {
    if (!state || state.mode !== 'character-sheet') return;
    const type = normalizeType(state.characterType);
    state.characterType = type;
    applyOutputPolicy({ root, state });
    const clothing = root.querySelector('#accordion-clothing');
    const inner = clothing?.querySelector('.accordion-inner');
    const body = root.querySelector('#accordion-body');
    const bodyInner = body?.querySelector('.accordion-inner');
    if (!inner || !bodyInner) return;

    let uniform = inner.querySelector('[data-character-casting-uniform]');
    if (!uniform) {
      uniform = document.createElement('section');
      uniform.className = 'character-casting-uniform-panel';
      uniform.dataset.characterCastingUniform = 'true';
      uniform.innerHTML = `
        <span class="character-casting-uniform-swatch" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(t('character-profiles.type.castingUniform', 'Casting Uniform'))}</strong>
          <span>${escapeHtml(t('character-profiles.type.castingUniformDetail', 'Opaque fitted white top and mid-thigh shorts'))}</span>
        </div>
        <span class="character-casting-uniform-lock">${escapeHtml(t('character-profiles.type.locked', 'Locked'))}</span>`;
      inner.prepend(uniform);
    }

    const reusable = type === TYPES.REUSABLE_MODEL;
    uniform.hidden = !reusable;
    inner.querySelectorAll('.form-field, #outfit-reference-upload-container').forEach(element => {
      element.hidden = reusable;
      element.classList.toggle('character-type-hidden', reusable);
    });
    clothing.classList.toggle('is-casting-uniform', reusable);

    let layout = bodyInner.querySelector('[data-character-casting-layout]');
    if (!layout) {
      layout = document.createElement('section');
      layout.className = 'character-casting-uniform-panel character-casting-layout-panel';
      layout.dataset.characterCastingLayout = 'true';
      layout.innerHTML = `
        <span class="character-casting-layout-icon" aria-hidden="true">3</span>
        <div>
          <strong>${escapeHtml(t('character-profiles.type.castingLayout', 'Three-view Casting Sheet'))}</strong>
          <span>${escapeHtml(t('character-profiles.type.castingLayoutDetail', 'Front, side and back views'))}</span>
        </div>
        <span class="character-casting-uniform-lock">${escapeHtml(t('character-profiles.type.locked', 'Locked'))}</span>`;
      bodyInner.prepend(layout);
    }
    layout.hidden = !reusable;
    const layoutField = bodyInner.querySelector('select[data-field="Sheet Layout"]')?.closest('.form-field');
    if (layoutField) {
      layoutField.hidden = reusable;
      layoutField.classList.toggle('character-type-hidden', reusable);
    }
    body.classList.toggle('is-casting-layout', reusable);
    if (reusable && clearIncompatible) {
      Object.entries(state.selections || {}).forEach(([fieldName, selection]) => {
        if (selection?.group === 'Clothing') delete state.selections[fieldName];
      });
      ['Primary Color', 'Secondary Color', 'Top', 'Bottom', 'Dress', 'Shoes', 'Product Type']
        .forEach(fieldName => {
          if (state.customColors?.[fieldName]) state.customColors[fieldName].enabled = false;
        });
      window.clearOutfitReferenceState?.({ updateUI: false });
      if (state.imageReferences) state.imageReferences.outfitReference = false;
      inner.querySelectorAll('select').forEach(select => {
        select.value = '';
      });
      inner.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = false;
      });
      delete state.selections?.['Sheet Layout'];
    }
  }

  function applyOutputPolicy({
    root = document,
    state = window.state
  } = {}) {
    if (!state) return;
    const reusable = state.mode === 'character-sheet'
      && normalizeType(state.characterType) === TYPES.REUSABLE_MODEL;
    const chips = root.querySelectorAll?.('#aspect-ratio-group .option-chip') || [];

    if (reusable) {
      const ratioChanged = state.aspectRatio !== REUSABLE_CASTING.aspectRatio;
      state.aspectRatio = REUSABLE_CASTING.aspectRatio;
      if (ratioChanged) window.creditEstimateController?.invalidate?.();
      const width = root.querySelector?.('#input-width');
      const height = root.querySelector?.('#input-height');
      if (width) width.value = '768';
      if (height) height.value = '1024';
    }

    chips.forEach(chip => {
      const ratio = chip.getAttribute('data-ratio');
      if (reusable) {
        const selected = ratio === REUSABLE_CASTING.aspectRatio;
        chip.classList.toggle('active', selected);
        chip.classList.toggle('character-casting-ratio-locked', !selected);
        chip.dataset.characterCastingRatioLock = 'true';
        chip.setAttribute('aria-disabled', String(!selected));
        chip.title = selected
          ? t('character-profiles.type.castingRatioSelected', 'Required for the three-view casting sheet.')
          : t('character-profiles.type.castingRatioLocked', 'Reusable Model casting is locked to 6:8.');
      } else if (chip.dataset.characterCastingRatioLock === 'true') {
        delete chip.dataset.characterCastingRatioLock;
        chip.classList.remove('character-casting-ratio-locked');
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  window.ModelPromptForgeCharacterTypeControl = {
    TYPES,
    REUSABLE_CASTING,
    normalizeType,
    getCapabilities,
    create,
    applyCharacterSheetPolicy,
    applyOutputPolicy
  };
})();
