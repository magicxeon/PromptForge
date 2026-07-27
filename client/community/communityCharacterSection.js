(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function render(container, options = {}) {
    if (!container) return;
    const {
      variant = 'directory',
      scope = 'public',
      filters = {},
      limit = variant === 'rail' ? 8 : 24,
      ...legacyFilters
    } = options;
    const query = { ...legacyFilters, ...filters, limit };
    container.dataset.characterVariant = variant;
    container.innerHTML = `<p class="community-character-state">${t('character-profiles.states.loading', 'Loading Characters...')}</p>`;
    try {
      const page = scope === 'own'
        ? await window.ModelPromptForgeCharacterProfileApi.listOwn({ limit })
        : await window.ModelPromptForgeCharacterProfileApi.listPublic(query);
      renderItems(container, page.items, { variant });
    } catch (error) {
      container.innerHTML = `<p class="community-character-state is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  function renderItems(container, items = [], options = {}) {
    if (!container) return;
    const variant = options.variant || 'directory';
    container.dataset.characterVariant = variant;
    if (!items.length) {
      container.innerHTML = `<p class="community-character-state">${t('character-profiles.community.empty', 'No public Characters yet.')}</p>`;
      return;
    }
    container.innerHTML = `<div class="community-character-grid${variant === 'rail' ? ' is-rail' : ''}">${items.map(card).join('')}</div>`;
    bindCards(container);
  }

  function bindCards(container) {
    container.querySelectorAll('[data-character-id]').forEach(item => {
        item.addEventListener('click', event => {
          if (event.target.closest('button, a')) return;
          openProfile(item.dataset.characterId);
        });
        item.addEventListener('keydown', event => {
          if (!['Enter', ' '].includes(event.key) || event.target.closest('button, a')) return;
          event.preventDefault();
          openProfile(item.dataset.characterId);
        });
    });
    container.querySelectorAll('[data-use-character]').forEach(button => {
        button.addEventListener('click', () =>
          window.ModelPromptForgeCharacterHandoff.useCharacter(button.dataset.useCharacter, 'scene_builder')
        );
    });
    container.querySelectorAll('[data-character-title]').forEach(link => {
        link.addEventListener('click', event => {
          event.preventDefault();
          openProfile(link.dataset.characterTitle);
        });
    });
    container.querySelectorAll('[data-character-media]').forEach(image => {
        image.addEventListener('error', () => {
          const media = image.closest('.community-character-card-media');
          if (!media) return;
          media.classList.add('is-unavailable');
          media.innerHTML = `<span>${escapeHtml(t('character-profiles.states.mediaUnavailable', 'Character image unavailable'))}</span>`;
        }, { once: true });
    });
  }

  function openProfile(characterId) {
    window.ModelPromptForgeRouter.navigate(
      `/community/characters/${encodeURIComponent(characterId)}`
    );
  }

  function card(item) {
    const available = item.reuseStatus === 'available';
    const statusText = status(item);
    const characterType = window.ModelPromptForgeCharacterTypeControl
      ?.normalizeType?.(item.characterType) || 'reusable_model';
    const imageUrl = item.displayImageUrl || item.thumbnailUrl || item.imageUrl || '';
    return `<article class="community-character-card" data-character-id="${escapeHtml(item.id)}" tabindex="0">
      <div class="community-character-card-media">${imageUrl
        ? `<img data-character-media src="${escapeHtml(actorMediaUrl(imageUrl))}" alt="${escapeHtml(item.displayName)}" loading="lazy">`
        : `<span>${t('character-profiles.states.mediaUnavailable', 'Character image unavailable')}</span>`}</div>
      <div class="community-character-card-copy">
        <div class="community-character-card-meta"><span class="character-type-badge ${characterType === 'styled_character' ? 'is-styled' : 'is-reusable'}">${characterType === 'styled_character'
          ? t('character-profiles.type.outfitBound', 'Outfit bound')
          : t('character-profiles.type.reusable', 'Reusable Model')}</span>
        <span class="character-availability ${available ? 'is-available' : ''}" data-status="${escapeHtml(item.reuseStatus || 'owner_only')}" title="${escapeHtml(statusText)}" aria-label="${escapeHtml(statusText)}">${statusText}</span></div>
        <h3><a href="/community/characters/${encodeURIComponent(item.id)}" data-character-title="${escapeHtml(item.id)}">${escapeHtml(item.displayName)}</a></h3>
        <a class="community-character-creator" href="/creators/${encodeURIComponent(item.ownerUsername || '')}" data-route="/creators/${encodeURIComponent(item.ownerUsername || '')}">${t('character-profiles.page.by', 'Created by')} <strong>${escapeHtml(item.ownerUsername || 'Creator')}</strong></a>
        <p>${escapeHtml(item.personalitySummary || '')}</p>
        <div class="community-character-card-footer"><span>${Number(item.stats?.totalOutputs || 0)} ${t('character-profiles.stats.uses', 'uses')}</span>
        ${available ? `<button type="button" data-use-character="${escapeHtml(item.id)}">${t('character-profiles.actions.select', 'Select Character')}</button>` : ''}</div>
      </div>
    </article>`;
  }

  function status(item) {
    if (item.reuseStatus === 'available') return t('character-profiles.status.available', 'Available to use');
    if (item.reuseStatus === 'view_only') return t('character-profiles.status.viewOnly', 'View only');
    if (item.reuseStatus === 'unavailable') return t('character-profiles.status.draft', 'Owner draft');
    return t('character-profiles.status.ownerOnly', 'Owner only');
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const actorMediaUrl = value =>
    window.ModelPromptForgeActorContext?.appendActorQuery?.(value) || value;

  window.ModelPromptForgeCommunityCharacterSection = { render, renderItems };
})();
