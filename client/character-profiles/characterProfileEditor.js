(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function ensureDialog() {
    let dialog = document.getElementById('character-profile-editor-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'character-profile-editor-dialog';
    dialog.className = 'character-profile-dialog';
    dialog.innerHTML = `
      <form method="dialog" data-character-profile-form>
        <header>
          <div><span class="character-profile-kicker">${t('character-profiles.editor.kicker', 'REUSABLE CHARACTER')}</span>
          <h2 data-character-editor-title>${t('character-profiles.editor.createTitle', 'Create Character Profile')}</h2></div>
          <button type="button" class="icon-button" data-character-editor-close aria-label="${t('common.actions.close', 'Close')}">&times;</button>
        </header>
        <label><span>${t('character-profiles.fields.name', 'Character name')}</span><input name="displayName" maxlength="80" required></label>
        <label><span>${t('character-profiles.fields.description', 'Short description')}</span><textarea name="shortDescription" maxlength="280" rows="3"></textarea></label>
        <label><span>${t('character-profiles.fields.personality', 'Personality')}</span><textarea name="personalitySummary" maxlength="500" rows="4"></textarea>
        <small>${t('character-profiles.fields.personalityHelp', 'Changes apply to future generations and do not rewrite previous work.')}</small></label>
        <div class="character-profile-editor-type" data-character-editor-type></div>
        <fieldset><legend>${t('character-profiles.fields.intendedUses', 'Intended uses')}</legend>
          <label><input type="checkbox" name="intendedUses" value="fashion" checked> ${t('character-profiles.uses.fashion', 'Fashion')}</label>
          <label><input type="checkbox" name="intendedUses" value="scene_story" checked> ${t('character-profiles.uses.scene', 'Scene / Story')}</label>
          <label><input type="checkbox" name="intendedUses" value="general"> ${t('character-profiles.uses.general', 'General')}</label>
        </fieldset>
        <p class="character-profile-form-error" data-character-editor-error role="alert"></p>
        <footer><button type="button" class="btn-neon-outline" data-character-editor-cancel>${t('common.actions.cancel', 'Cancel')}</button>
        <button type="submit" class="btn-neon-yellow-glow">${t('common.actions.save', 'Save')}</button></footer>
      </form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-character-editor-close], [data-character-editor-cancel]')
      .forEach(button => button.addEventListener('click', () => dialog.close()));
    return dialog;
  }

  const collect = form => ({
    displayName: form.elements.displayName.value,
    shortDescription: form.elements.shortDescription.value,
    personalitySummary: form.elements.personalitySummary.value,
    intendedUses: [...form.querySelectorAll('[name="intendedUses"]:checked')].map(item => item.value)
  });

  function openCreate(result) {
    const dialog = ensureDialog();
    const form = dialog.querySelector('[data-character-profile-form]');
    form.reset();
    const characterType = window.ModelPromptForgeCharacterTypeControl
      ?.normalizeType?.(result.characterSheetConfig?.characterType || result.characterType)
      || 'reusable_model';
    renderTypeSummary(form, characterType);
    dialog.querySelector('[data-character-editor-title]').textContent =
      t('character-profiles.editor.createTitle', 'Create Character Profile');
    form.onsubmit = async event => {
      event.preventDefault();
      const error = dialog.querySelector('[data-character-editor-error]');
      error.textContent = '';
      try {
        const resultId = result.id || result.jobId;
        const profile = await window.ModelPromptForgeCharacterProfileApi.create({
          ...collect(form),
          sourceGenerationResultId: resultId,
          idempotencyKey: `character-profile:${resultId}`
        });
        dialog.close();
        window.ModelPromptForgeRouter.navigate(`/community/characters/${encodeURIComponent(profile.id)}`);
      } catch (requestError) {
        error.textContent = requestError.message;
      }
    };
    dialog.showModal();
    form.elements.displayName.focus();
  }

  function openEdit(profile, onSaved) {
    const dialog = ensureDialog();
    const form = dialog.querySelector('[data-character-profile-form]');
    dialog.querySelector('[data-character-editor-title]').textContent =
      t('character-profiles.editor.editTitle', 'Edit Character Profile');
    form.elements.displayName.value = profile.displayName || '';
    form.elements.shortDescription.value = profile.shortDescription || '';
    form.elements.personalitySummary.value = profile.personalitySummary || '';
    form.querySelectorAll('[name="intendedUses"]').forEach(input => {
      input.checked = (profile.intendedUses || []).includes(input.value);
    });
    renderTypeSummary(form, profile.characterType);
    form.onsubmit = async event => {
      event.preventDefault();
      const error = dialog.querySelector('[data-character-editor-error]');
      error.textContent = '';
      try {
        const updated = await window.ModelPromptForgeCharacterProfileApi.update(profile.id, {
          ...collect(form),
          version: profile.recordVersion
        });
        dialog.close();
        onSaved?.(updated);
      } catch (requestError) {
        error.textContent = requestError.message;
      }
    };
    dialog.showModal();
  }

  window.addEventListener('modelpromptforge:languagechange', () => {
    const dialog = document.getElementById('character-profile-editor-dialog');
    if (dialog?.open) dialog.close();
    dialog?.remove();
  });
  window.ModelPromptForgeCharacterProfileEditor = { openCreate, openEdit };

  function renderTypeSummary(form, value) {
    const type = window.ModelPromptForgeCharacterTypeControl?.normalizeType?.(value)
      || 'reusable_model';
    const summary = form.querySelector('[data-character-editor-type]');
    if (!summary) return;
    summary.replaceChildren(window.ModelPromptForgeCharacterTypeControl.create({
      value: type,
      disabled: true,
      compact: true
    }));
    const fashion = form.querySelector('[name="intendedUses"][value="fashion"]');
    if (fashion) {
      fashion.disabled = type === 'styled_character';
      if (fashion.disabled) fashion.checked = false;
    }
  }
})();
