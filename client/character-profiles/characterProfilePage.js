(() => {
  let currentProfile = null;
  let sharingNotice = '';
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function activate(characterId) {
    const page = document.getElementById('character-profile-page');
    if (!page || !characterId) return;
    page.setAttribute('aria-busy', 'true');
    page.innerHTML = `<p class="character-profile-state">${t('character-profiles.states.loading', 'Loading Character...')}</p>`;
    try {
      let profile;
      try {
        profile = await window.ModelPromptForgeCharacterProfileApi.getOwn(characterId);
      } catch {
        profile = await window.ModelPromptForgeCharacterProfileApi.getPublic(characterId);
      }
      currentProfile = profile;
      render(page, profile);
    } catch (error) {
      page.innerHTML = `<section class="character-profile-state"><h2>${t('character-profiles.states.unavailable', 'Character unavailable')}</h2><p>${escapeHtml(error.message)}</p></section>`;
    } finally {
      page.setAttribute('aria-busy', 'false');
    }
  }

  function render(page, profile) {
    const version = (profile.versions || []).find(item => item.id === profile.activeVersionId)
      || profile.versions?.[0]
      || null;
    const approved = profile.status === 'approved';
    const characterType = window.ModelPromptForgeCharacterTypeControl
      ?.normalizeType?.(profile.characterType) || 'reusable_model';
    const hasCanonical = approved || Boolean(
      characterType === 'styled_character'
        ? version?.canonicalCharacterSheetAssetId
        : version?.castingExportGenerationResultId
    );
    const image = hasCanonical
      ? actorMediaUrl(`/api/community/character-profiles/${encodeURIComponent(profile.id)}/image`)
      : '';
    const isOwner = profile.isOwner === true;
    const usage = profile.stats || { totalOutputs: 0, byUseCase: {} };
    page.innerHTML = `
      <section class="character-profile-hero">
        <div class="character-profile-media ${image ? '' : 'is-empty'}">
          ${image ? `<img src="${image}" alt="${escapeHtml(profile.displayName)}">` : `<span>${t('character-profiles.states.castingRequired', 'Casting export required')}</span>`}
        </div>
        <div class="character-profile-summary">
          <span class="character-profile-kicker">${t('character-profiles.page.kicker', 'CHARACTER PROFILE')}</span>
          <h1>${escapeHtml(profile.displayName)}</h1>
          <a href="${profile.ownerUsername ? `/creators/${encodeURIComponent(profile.ownerUsername)}` : '#'}" data-route="${profile.ownerUsername ? `/creators/${encodeURIComponent(profile.ownerUsername)}` : ''}" class="character-profile-owner">${t('character-profiles.page.by', 'Created by')} ${escapeHtml(profile.ownerUsernameSnapshot || profile.ownerUsername || 'Creator')}</a>
          <p>${escapeHtml(profile.shortDescription || '')}</p>
          <p class="character-profile-personality">${escapeHtml(profile.personalitySummary || t('character-profiles.page.noPersonality', 'No personality description yet.'))}</p>
          <div class="character-profile-badges">
            <span class="character-type-badge ${characterType === 'styled_character' ? 'is-styled' : 'is-reusable'}">${typeLabel(characterType)}</span>
            <span>${statusLabel(profile)}</span>
            ${(profile.intendedUses || []).map(use => `<span>${escapeHtml(useLabel(use))}</span>`).join('')}
          </div>
          <div class="character-profile-actions">${renderActions(profile, version, isOwner, approved)}</div>
        </div>
      </section>
      <section class="character-profile-stats">
        <article><strong>${Number(usage.totalOutputs || 0)}</strong><span>${t('character-profiles.stats.total', 'Generated images')}</span></article>
        <article><strong>${Number(usage.byUseCase?.fashion || 0)}</strong><span>${t('character-profiles.stats.fashion', 'Fashion')}</span></article>
        <article><strong>${Number(usage.byUseCase?.sceneStory || 0)}</strong><span>${t('character-profiles.stats.scene', 'Scene / Story')}</span></article>
        <article><strong>${Number(usage.byUseCase?.other || 0)}</strong><span>${t('character-profiles.stats.other', 'Other')}</span></article>
      </section>
      <section class="character-profile-works"><h2>${t('character-profiles.works.title', 'Public work with this Character')}</h2><div data-character-works></div></section>
      ${isOwner && approved ? renderSharing(profile) : ''}`;
    sharingNotice = '';
    page.querySelector('.character-profile-media img')?.addEventListener('error', event => {
      const media = event.currentTarget.closest('.character-profile-media');
      if (!media) return;
      media.classList.add('is-empty');
      media.innerHTML = `<span>${escapeHtml(t('character-profiles.states.mediaUnavailable', 'Character image unavailable'))}</span>`;
    }, { once: true });
    bindActions(page, profile, version);
    void renderWorks(page.querySelector('[data-character-works]'), profile.id);
  }

  async function renderWorks(container, profileId) {
    if (!container) return;
    try {
      const page = await window.ModelPromptForgeCharacterProfileApi.listWorks(profileId, { limit: 12 });
      if (!page.items?.length) {
        container.innerHTML = `<p>${t('character-profiles.works.empty', 'No public work has been shared yet.')}</p>`;
        return;
      }
      container.className = 'character-profile-work-grid';
      page.items.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'character-profile-work-card';
        button.innerHTML = `<img src="${item.thumbnailUrl || item.imageUrl}" alt="${escapeHtml(item.title)}"><span>${escapeHtml(item.title)}</span>`;
        button.addEventListener('click', () => window.openLightbox?.({
          id: item.id,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          prompt: item.promptPreview || '',
          isCommunityPublic: true,
          communityPost: item
        }, { triggerElement: button }));
        container.appendChild(button);
      });
    } catch {
      container.innerHTML = `<p>${t('character-profiles.works.empty', 'No public work has been shared yet.')}</p>`;
    }
  }

  function renderActions(profile, version, isOwner, approved) {
    const actions = [];
    const characterType = window.ModelPromptForgeCharacterTypeControl
      ?.normalizeType?.(profile.characterType) || 'reusable_model';
    const styled = characterType === 'styled_character';
    const destinations = new Set(profile.destinationCapabilities || (
      styled ? ['scene_builder'] : ['fashion_blueprint', 'scene_builder']
    ));
    if (isOwner) {
      actions.push(`<button type="button" class="btn-neon-outline" data-character-edit>${t('character-profiles.actions.edit', 'Edit Character')}</button>`);
      if (styled && profile.status === 'draft') {
        actions.push(`<button type="button" class="btn-neon-yellow-glow" data-character-approve>${t('character-profiles.actions.approveStyled', 'Approve Styled Character')}</button>`);
      } else if (!styled && ['draft', 'export_pending'].includes(profile.status)) {
        actions.push(`<button type="button" class="btn-neon-yellow-glow" data-character-casting>${t('character-profiles.actions.generateCasting', 'Generate Casting Export')}</button>`);
      }
      if (!styled && profile.status === 'review') {
        actions.push(`<button type="button" class="btn-neon-yellow-glow" data-character-approve>${t('character-profiles.actions.approve', 'Approve Casting Export')}</button>`);
        actions.push(`<button type="button" class="btn-neon-outline" data-character-casting>${t('character-profiles.actions.regenerateCasting', 'Regenerate Casting Export')}</button>`);
      }
      if (styled) {
        actions.push(`<button type="button" class="btn-neon-outline" data-character-convert>${t('character-profiles.actions.convertReusable', 'Create Reusable Model')}</button>`);
      }
    }
    if (approved && (profile.handoffAvailable || isOwner)) {
      if (destinations.has('scene_builder')) {
        actions.push(`<button type="button" class="btn-neon-yellow-glow" data-character-use-scene>${t('character-profiles.actions.useScene', 'Use in Scene Builder')}</button>`);
      }
      if (destinations.has('fashion_blueprint')) {
        actions.push(`<button type="button" class="btn-neon-outline" data-character-use-fashion>${t('character-profiles.actions.useFashion', 'Use in Fashion Blueprint')}</button>`);
      }
    }
    return actions.join('');
  }

  function renderSharing(profile) {
    return `<section class="character-profile-sharing">
      <header class="character-profile-sharing-header">
        <span class="character-profile-kicker">${t('character-profiles.sharing.kicker', 'SHARING')}</span>
        <h2>${t('character-profiles.sharing.title', 'Who can use this Character?')}</h2>
        <p>${t('character-profiles.sharing.description', 'Control discovery and whether other people may generate with this Character.')}</p>
      </header>
      <div class="character-profile-sharing-fields">
        <label class="character-sharing-field"><span>${t('character-profiles.sharing.visibility', 'Visibility')}</span>
          <select data-character-visibility>${options(['private', 'unlisted', 'public'], profile.visibility)}</select>
          <small>${t('character-profiles.sharing.visibilityHelp', 'Choose where this Character can be discovered.')}</small>
        </label>
        <label class="character-sharing-field"><span>${t('character-profiles.sharing.reuse', 'Reuse permission')}</span>
          <select data-character-reuse>${options(['owner_only', 'view_only', 'public_reusable'], profile.reusePolicy)}</select>
          <small>${t('character-profiles.sharing.reuseHelp', 'Choose whether viewers may create images with this Character.')}</small>
        </label>
      </div>
      <label class="character-rights-check" data-character-rights-field>
        <input type="checkbox" data-character-rights ${profile.rightsDeclarationVersion ? 'checked' : ''}>
        <span>${t('character-profiles.sharing.rights', 'I have the right to share this Character for reuse.')}</span>
      </label>
      <footer class="character-profile-sharing-footer">
        <div>
          <strong data-character-sharing-effective></strong>
          <p data-character-sharing-status role="status">${escapeHtml(sharingNotice)}</p>
        </div>
        <button type="button" class="btn-neon-yellow-glow" data-character-save-sharing>${t('character-profiles.sharing.save', 'Save sharing settings')}</button>
      </footer>
    </section>`;
  }

  function bindActions(page, profile, version) {
    page.querySelector('[data-character-edit]')?.addEventListener('click', () =>
      window.ModelPromptForgeCharacterProfileEditor.openEdit(profile, updated => {
        currentProfile = updated;
        render(page, updated);
      })
    );
    page.querySelector('[data-character-casting]')?.addEventListener('click', () =>
      window.ModelPromptForgeCharacterCastingExport.begin(profile.id, version?.id || profile.activeVersionId)
    );
    page.querySelector('[data-character-approve]')?.addEventListener('click', async () => {
      await window.ModelPromptForgeCharacterProfileApi.approve(profile.id, {
        characterProfileVersionId: version?.id || profile.activeVersionId,
        consentDeclarationVersion: 'character-rights-v1'
      });
      await activate(profile.id);
    });
    page.querySelector('[data-character-convert]')?.addEventListener('click', async () => {
      const converted = await window.ModelPromptForgeCharacterProfileApi.convertToReusable(profile.id);
      const activeVersion = (converted.versions || []).find(item => item.id === converted.activeVersionId);
      await window.ModelPromptForgeCharacterCastingExport.begin(
        converted.id,
        activeVersion?.id || converted.activeVersionId
      );
    });
    page.querySelector('[data-character-use-scene]')?.addEventListener('click', () =>
      window.ModelPromptForgeCharacterHandoff.useCharacter(profile.id, 'scene_builder')
    );
    page.querySelector('[data-character-use-fashion]')?.addEventListener('click', async () => {
      await window.ModelPromptForgeCharacterHandoff.useCharacter(profile.id, 'fashion_blueprint');
      await window.AppDialog?.alert?.(
        t('character-profiles.actions.fashionPrepared', 'Character selected. Fashion Blueprint will use it when that workspace opens.'),
        { title: t('character-profiles.actions.characterSelected', 'Character selected') }
      );
    });
    const visibility = page.querySelector('[data-character-visibility]');
    const reuse = page.querySelector('[data-character-reuse]');
    visibility?.addEventListener('change', () => syncSharingControls(page));
    reuse?.addEventListener('change', () => syncSharingControls(page));
    syncSharingControls(page);
    page.querySelector('[data-character-save-sharing]')?.addEventListener('click', async event => {
      const status = page.querySelector('[data-character-sharing-status]');
      const button = event.currentTarget;
      try {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        status.textContent = t('character-profiles.sharing.saving', 'Saving sharing settings...');
        await window.ModelPromptForgeCharacterProfileApi.updateSharing(profile.id, {
          visibility: visibility.value,
          reusePolicy: reuse.value,
          rightsDeclarationAccepted: page.querySelector('[data-character-rights]').checked
        });
        sharingNotice = t('character-profiles.sharing.saved', 'Sharing settings saved.');
        await activate(profile.id);
      } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  }

  function syncSharingControls(page) {
    const visibility = page.querySelector('[data-character-visibility]')?.value || 'private';
    const reuse = page.querySelector('[data-character-reuse]')?.value || 'owner_only';
    const rights = page.querySelector('[data-character-rights-field]');
    const effective = page.querySelector('[data-character-sharing-effective]');
    if (rights) rights.hidden = reuse !== 'public_reusable';
    if (effective) effective.textContent = effectiveSharingLabel(visibility, reuse);
  }

  function effectiveSharingLabel(visibility, reuse) {
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

  function statusLabel(profile) {
    if (profile.reuseStatus === 'available' || profile.reusePolicy === 'public_reusable') {
      return t('character-profiles.status.available', 'Available to use');
    }
    if (profile.reuseStatus === 'view_only' || profile.reusePolicy === 'view_only') {
      return t('character-profiles.status.viewOnly', 'View only');
    }
    if (profile.status !== 'approved') return t('character-profiles.status.draft', 'Owner draft');
    return t('character-profiles.status.ownerOnly', 'Owner only');
  }

  const useLabel = use => ({
    fashion: t('character-profiles.uses.fashion', 'Fashion'),
    scene_story: t('character-profiles.uses.scene', 'Scene / Story'),
    general: t('character-profiles.uses.general', 'General')
  })[use] || use;
  const typeLabel = value => value === 'styled_character'
    ? t('character-profiles.type.outfitBound', 'Outfit bound')
    : t('character-profiles.type.reusable', 'Reusable Model');
  const options = (values, selected) => values.map(value =>
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(sharingLabel(value))}</option>`
  ).join('');
  const sharingLabel = value => t(`character-profiles.sharing.options.${value}`, value.replaceAll('_', ' '));
  const actorMediaUrl = value =>
    window.ModelPromptForgeActorContext?.appendActorQuery?.(value) || value;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  window.addEventListener('modelpromptforge:route', event => {
    const match = event.detail.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.addEventListener('modelpromptforge:actorchange', () => {
    const match = location.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.addEventListener('modelpromptforge:languagechange', () => {
    const match = location.pathname.match(/^\/community\/characters\/([^/]+)$/);
    if (match) void activate(decodeURIComponent(match[1]));
  });
  window.ModelPromptForgeCharacterProfilePage = { activate };
})();
