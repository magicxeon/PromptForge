(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, profile, onSave } = {}) {
    if (!mount || !profile) return;
    mount.replaceChildren();
    const section = document.createElement('section');
    section.className = 'character-profile-sharing';
    section.innerHTML = `
      <header class="character-profile-sharing-header">
        <span class="character-profile-kicker">${escapeHtml(t('character-profiles.sharing.kicker', 'OWNER SETTINGS'))}</span>
        <h2>${escapeHtml(t('character-profiles.sharing.title', 'Who can use this Character?'))}</h2>
        <p>${escapeHtml(t('character-profiles.sharing.description', 'Control discovery and whether other people may generate with this Character.'))}</p>
      </header>
      <div class="character-profile-sharing-fields">
        <label class="character-sharing-field">
          <span>${escapeHtml(t('character-profiles.sharing.visibility', 'Visibility'))}</span>
          <select data-character-visibility>${options(
            ['private', 'unlisted', 'public'],
            profile.visibility
          )}</select>
          <small>${escapeHtml(t('character-profiles.sharing.visibilityHelp', 'Choose where this Character can be discovered.'))}</small>
        </label>
        <label class="character-sharing-field">
          <span>${escapeHtml(t('character-profiles.sharing.reuse', 'Reuse permission'))}</span>
          <select data-character-reuse>${options(
            ['owner_only', 'view_only', 'public_reusable'],
            profile.reusePolicy
          )}</select>
          <small>${escapeHtml(t('character-profiles.sharing.reuseHelp', 'Choose whether viewers may create images with this Character.'))}</small>
        </label>
      </div>
      <label class="character-rights-check" data-character-rights-field>
        <input type="checkbox" data-character-rights ${profile.rightsDeclarationVersion ? 'checked' : ''}>
        <span>${escapeHtml(t('character-profiles.sharing.rights', 'I have the right to share this Character for reuse.'))}</span>
      </label>
      <div class="character-profile-sharing-effective" data-character-sharing-effective></div>
      <footer class="character-profile-sharing-footer">
        <p data-character-sharing-status role="status" aria-live="polite"></p>
        <button type="button" class="character-profile-primary-action" data-character-save-sharing>
          ${escapeHtml(t('character-profiles.sharing.save', 'Save sharing settings'))}
        </button>
      </footer>`;
    mount.appendChild(section);

    const visibility = section.querySelector('[data-character-visibility]');
    const reuse = section.querySelector('[data-character-reuse]');
    const rights = section.querySelector('[data-character-rights]');
    const rightsField = section.querySelector('[data-character-rights-field]');
    const effective = section.querySelector('[data-character-sharing-effective]');
    const status = section.querySelector('[data-character-sharing-status]');
    const save = section.querySelector('[data-character-save-sharing]');
    const sync = () => {
      rightsField.hidden = reuse.value !== 'public_reusable';
      effective.textContent = effectiveLabel(visibility.value, reuse.value);
    };
    visibility.addEventListener('change', sync);
    reuse.addEventListener('change', sync);
    sync();
    save.addEventListener('click', async () => {
      try {
        save.disabled = true;
        save.setAttribute('aria-busy', 'true');
        status.textContent = t('character-profiles.sharing.saving', 'Saving sharing settings...');
        await onSave?.({
          visibility: visibility.value,
          reusePolicy: reuse.value,
          rightsDeclarationAccepted: rights.checked
        });
        status.textContent = t('character-profiles.sharing.saved', 'Sharing settings saved.');
      } catch (error) {
        visibility.value = profile.visibility;
        reuse.value = profile.reusePolicy;
        rights.checked = Boolean(profile.rightsDeclarationVersion);
        sync();
        status.textContent = error.message;
      } finally {
        save.disabled = false;
        save.removeAttribute('aria-busy');
      }
    });
  }

  function effectiveLabel(visibility, reuse) {
    if (visibility === 'private') {
      return t('character-profiles.sharing.effective.private', 'Current result: Private');
    }
    if (visibility === 'unlisted') {
      return t('character-profiles.sharing.effective.unlisted', 'Current result: Available by direct link');
    }
    if (reuse === 'public_reusable') {
      return t('character-profiles.sharing.effective.reusable', 'Current result: Public and available for reuse');
    }
    if (reuse === 'view_only') {
      return t('character-profiles.sharing.effective.viewOnly', 'Current result: Public and view only');
    }
    return t('character-profiles.sharing.effective.ownerOnly', 'Current result: Public, only the owner can generate');
  }

  const options = (values, selected) => values.map(value =>
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(
      t(`character-profiles.sharing.options.${value}`, value.replaceAll('_', ' '))
    )}</option>`
  ).join('');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  window.ModelPromptForgeCharacterSharingPanel = { render };
})();
