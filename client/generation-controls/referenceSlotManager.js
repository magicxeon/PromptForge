/* Shared role-aware reference picker used by manual generation surfaces. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  const roleDefinitions = [
    { key: 'face', label: 'Face reference', scope: 'Facial identity only', token: 'FACE' },
    { key: 'character', label: 'Character reference', scope: 'Identity, hair and body', token: 'CHAR' },
    { key: 'style', label: 'Style reference', scope: 'Lighting and visual treatment', token: 'STYLE' },
    { key: 'pose', label: 'Pose reference', scope: 'Body arrangement and framing', token: 'POSE' },
    { key: 'outfitFront', label: 'Outfit front', scope: 'Front garment details', token: 'FRONT' },
    { key: 'outfitBack', label: 'Outfit back', scope: 'Back garment details', token: 'BACK' }
  ];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const normalizeCapabilities = value => ({
    imageReferences: value?.imageReferences !== false,
    maxReferenceImages: Math.max(0, Number(value?.maxReferenceImages ?? 6) || 0)
  });

  function createReferenceSlotManager({ mount, value = {}, capabilities = {}, onChange, onValidationChange } = {}) {
    if (!mount) throw new Error('ReferenceSlotManager requires a mount element.');
    const current = { ...value };
    let activeCapabilities = normalizeCapabilities(capabilities);
    let validation = null;
    const readFile = file => window.optimizeReferenceUpload
      ? window.optimizeReferenceUpload(file)
      : new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('Unable to read reference image.'));
          reader.readAsDataURL(file);
        });
    const uniqueCount = () => new Set(Object.values(current).filter(Boolean)).size;

    function validate() {
      const errors = [];
      const count = uniqueCount();
      if (!activeCapabilities.imageReferences && count > 0) {
        errors.push({ code: 'references_unsupported', message: translate('playground.reference.unsupported', 'The selected model cannot use image references.') });
      }
      if (count > activeCapabilities.maxReferenceImages) {
        errors.push({ code: 'reference_limit_exceeded', message: translate('playground.reference.limitExceeded', 'Remove references or select a model with a higher reference limit.') });
      }
      if (current.face && current.character) {
        errors.push({ code: 'reference_role_conflict', field: 'face', message: translate('playground.reference.faceCharacterConflict', 'Use either Face or Character reference, not both.') });
      }
      if (current.outfitBack && !current.outfitFront) {
        errors.push({ code: 'outfit_front_required', field: 'outfitBack', message: translate('playground.reference.outfitFrontRequired', 'Add Outfit Front before Outfit Back.') });
      }
      return { valid: errors.length === 0, errors, count, maximum: activeCapabilities.maxReferenceImages, supported: activeCapabilities.imageReferences };
    }

    function disabledReason(key) {
      if (!activeCapabilities.imageReferences) return translate('playground.reference.unsupportedShort', 'Not supported by this model');
      if (key === 'face' && current.character) return translate('playground.reference.removeCharacterFirst', 'Remove Character reference first');
      if (key === 'character' && current.face) return translate('playground.reference.removeFaceFirst', 'Remove Face reference first');
      if (key === 'outfitBack' && !current.outfitFront) return translate('playground.reference.addFrontFirst', 'Add Outfit Front first');
      if (!current[key] && uniqueCount() >= activeCapabilities.maxReferenceImages) return translate('playground.reference.maximumReached', 'Reference limit reached');
      return '';
    }

    function publish() {
      validation = validate();
      onChange?.({ ...current });
      onValidationChange?.({ ...validation, errors: [...validation.errors] });
    }

    function render() {
      validation = validate();
      const countLabel = activeCapabilities.imageReferences
        ? `${validation.count} / ${validation.maximum}`
        : translate('playground.reference.notSupported', 'Not supported');
      const primaryError = validation.errors[0]?.message || '';
      mount.innerHTML = `
        <div class="reference-slot-manager-summary">
          <div><strong>${translate('playground.reference.summaryTitle', 'Reference Images')}</strong><small>${translate('playground.reference.summaryDescription', 'Each image has one clear role in the final result.')}</small></div>
          <span class="reference-slot-count ${validation.valid ? '' : 'is-invalid'}">${escapeHtml(countLabel)}</span>
        </div>
        <p class="reference-slot-manager-message ${validation.valid ? '' : 'is-invalid'}" ${primaryError ? '' : 'hidden'}>${escapeHtml(primaryError)}</p>
        <div class="reference-slot-manager-grid" data-reference-grid></div>`;
      const grid = mount.querySelector('[data-reference-grid]');

      roleDefinitions.forEach(definition => {
        const attached = Boolean(current[definition.key]);
        const reason = disabledReason(definition.key);
        const disabled = Boolean(reason);
        const label = translate(`playground.reference.${definition.key}`, definition.label);
        const scope = translate(`playground.reference.${definition.key}Scope`, definition.scope);
        const card = document.createElement('article');
        card.className = `reference-slot-manager-card ${attached ? 'is-attached' : ''} ${disabled ? 'is-disabled' : ''}`;
        card.dataset.referenceRole = definition.key;
        card.innerHTML = `
          <div class="reference-slot-preview" data-preview><span>${definition.token}</span></div>
          <div class="reference-slot-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(reason || scope)}</small></div>
          <label class="reference-slot-upload ${disabled ? 'is-disabled' : ''}"><input type="file" accept="image/png,image/jpeg,image/webp" ${disabled ? 'disabled' : ''}><span>${attached ? translate('playground.reference.replace', 'Replace') : translate('playground.reference.browse', 'Browse')}</span></label>
          ${attached ? `<button type="button" class="reference-slot-remove" aria-label="${escapeHtml(translate('playground.reference.remove', 'Remove reference'))}">x</button>` : ''}`;
        if (attached) {
          const image = document.createElement('img');
          image.src = current[definition.key];
          image.alt = label;
          card.querySelector('[data-preview]').replaceChildren(image);
        }
        if (disabled) {
          card.setAttribute('aria-disabled', 'true');
          card.title = reason;
        }
        const input = card.querySelector('input');
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            current[definition.key] = await readFile(file);
            render();
            publish();
          } catch (error) {
            window.AppDialog?.alert?.(error.message, { title: translate('playground.reference.dialogTitle', 'Reference image') });
          }
        });
        card.querySelector('.reference-slot-remove')?.addEventListener('click', () => {
          delete current[definition.key];
          render();
          publish();
        });
        grid.appendChild(card);
      });
    }

    render();
    onValidationChange?.({ ...validation, errors: [...validation.errors] });
    return {
      getValue: () => ({ ...current }),
      getValidation: () => ({ ...validation, errors: [...validation.errors] }),
      setValue: patch => { Object.assign(current, patch || {}); render(); publish(); },
      setCapabilities: nextCapabilities => {
        activeCapabilities = normalizeCapabilities(nextCapabilities);
        render();
        onValidationChange?.({ ...validation, errors: [...validation.errors] });
      },
      focusFirstInvalid: () => {
        const field = validation.errors[0]?.field;
        const target = field ? mount.querySelector(`[data-reference-role="${field}"]`) : mount.querySelector('.reference-slot-manager-message');
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        target?.querySelector?.('input:not(:disabled)')?.focus?.();
      }
    };
  }
  namespace.createReferenceSlotManager = createReferenceSlotManager;
  window.ModelPromptForgeGenerationControls = namespace;
})();
