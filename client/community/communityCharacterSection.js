(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function render(container, filters = {}) {
    if (!container) return;
    container.innerHTML = `<p class="community-character-state">${t('character-profiles.states.loading', 'Loading Characters...')}</p>`;
    try {
      const { scope, ...query } = filters;
      const page = scope === 'own'
        ? await window.ModelPromptForgeCharacterProfileApi.listOwn({ limit: 24 })
        : await window.ModelPromptForgeCharacterProfileApi.listPublic({
          limit: 24,
          ...query
        });
      if (!page.items?.length) {
        container.innerHTML = `<p class="community-character-state">${t('character-profiles.community.empty', 'No public Characters yet.')}</p>`;
        return;
      }
      container.innerHTML = `<div class="community-character-grid">${page.items.map(card).join('')}</div>`;
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
    } catch (error) {
      container.innerHTML = `<p class="community-character-state">${escapeHtml(error.message)}</p>`;
    }
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
    return `<article class="community-character-card" data-character-id="${escapeHtml(item.id)}" tabindex="0">
      <div class="community-character-card-media">${item.thumbnailUrl
        ? `<img src="${escapeHtml(actorMediaUrl(item.thumbnailUrl))}" alt="${escapeHtml(item.displayName)}" loading="lazy">`
        : `<span>${t('character-profiles.states.castingRequired', 'Casting export required')}</span>`}</div>
      <div class="community-character-card-copy">
        <span class="character-type-badge ${characterType === 'styled_character' ? 'is-styled' : 'is-reusable'}">${characterType === 'styled_character'
          ? t('character-profiles.type.outfitBound', 'Outfit bound')
          : t('character-profiles.type.reusable', 'Reusable Model')}</span>
        <span class="character-availability ${available ? 'is-available' : ''}" data-status="${escapeHtml(item.reuseStatus || 'owner_only')}" title="${escapeHtml(statusText)}" aria-label="${escapeHtml(statusText)}">${statusText}</span>
        <h3>${escapeHtml(item.displayName)}</h3>
        <a href="/creators/${encodeURIComponent(item.ownerUsername || '')}" data-route="/creators/${encodeURIComponent(item.ownerUsername || '')}">${escapeHtml(item.ownerUsername || 'Creator')}</a>
        <p>${escapeHtml(item.personalitySummary || '')}</p>
        <div><span>${Number(item.stats?.totalOutputs || 0)} ${t('character-profiles.stats.uses', 'uses')}</span>
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

  window.ModelPromptForgeCommunityCharacterSection = { render };
})();
