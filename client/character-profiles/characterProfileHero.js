(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, model, actions = [] } = {}) {
    if (!mount || !model) return;
    mount.replaceChildren();
    const section = document.createElement('section');
    section.className = 'character-profile-hero';

    const media = document.createElement('div');
    media.className = `character-profile-media${model.imageUrl ? '' : ' is-empty'}`;
    if (model.imageUrl) {
      const mediaButton = document.createElement('button');
      mediaButton.type = 'button';
      mediaButton.className = 'character-profile-media-open';
      mediaButton.setAttribute('aria-label', t(
        'character-profiles.media.zoom',
        'Open Character image'
      ));
      const image = document.createElement('img');
      image.src = model.imageUrl;
      image.alt = t(
        'character-profiles.media.alt',
        `${model.displayName} Character reference`
      );
      image.addEventListener('error', () => renderUnavailable(media), { once: true });
      mediaButton.appendChild(image);
      mediaButton.addEventListener('click', () => {
        window.openLightbox?.({
          id: model.id,
          imageUrl: model.imageUrl,
          thumbnailUrl: model.imageUrl,
          prompt: '',
          provider: 'Character Profile',
          submodel: model.characterTypeLabel,
          isCommunityPublic: model.isCommunityPublic === true
        }, { triggerElement: mediaButton });
      });
      const label = document.createElement('span');
      label.className = 'character-profile-media-label';
      label.textContent = t('character-profiles.media.sheet', 'CHARACTER SHEET');
      media.append(mediaButton, label);
      if (model.canDownload) {
        const download = document.createElement('a');
        download.className = 'character-profile-media-download';
        download.href = model.imageUrl;
        download.download = '';
        download.setAttribute('aria-label', t(
          'character-profiles.media.download',
          'Download Character reference'
        ));
        download.textContent = '\u2193';
        media.appendChild(download);
      }
    } else {
      renderUnavailable(media, model.emptyMediaLabel);
    }

    const summary = document.createElement('div');
    summary.className = 'character-profile-summary';
    const kicker = document.createElement('span');
    kicker.className = 'character-profile-kicker';
    kicker.textContent = t('character-profiles.page.kicker', 'CHARACTER PROFILE');
    const heading = document.createElement('h1');
    heading.textContent = model.displayName;
    const owner = document.createElement('a');
    owner.className = 'character-profile-owner';
    owner.textContent = `${t('character-profiles.page.by', 'Created by')} ${model.ownerLabel}`;
    if (model.ownerRoute) {
      owner.href = model.ownerRoute;
      owner.dataset.route = model.ownerRoute;
      owner.dataset.resourceRoute = 'true';
      owner.dataset.sourceViewId = 'character-profile';
      owner.dataset.sourceLabel = model.displayName;
    } else {
      owner.href = '#';
      owner.setAttribute('aria-disabled', 'true');
    }
    const description = document.createElement('p');
    description.className = 'character-profile-description';
    description.textContent = model.description || '';
    const personality = document.createElement('p');
    personality.className = 'character-profile-personality';
    personality.textContent = model.personality;

    const badges = document.createElement('div');
    badges.className = 'character-profile-badges';
    model.badges.forEach(item => {
      const badge = document.createElement('span');
      badge.className = item.className || '';
      badge.textContent = item.label;
      badges.appendChild(badge);
    });

    const metadata = document.createElement('div');
    metadata.className = 'character-profile-metadata';
    const type = metadataRow(t('character-profiles.metadata.type', 'Type'), model.characterTypeLabel);
    const availability = metadataRow(
      t('character-profiles.metadata.availability', 'Availability'),
      model.availabilityLabel,
      `is-${model.availability}`
    );
    metadata.append(type, availability);

    const actionRegion = document.createElement('div');
    actionRegion.className = 'character-profile-actions';
    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.variant === 'primary'
        ? 'character-profile-primary-action'
        : action.variant === 'owner'
          ? 'character-profile-owner-action'
          : 'character-profile-secondary-action';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      actionRegion.appendChild(button);
    });

    summary.append(kicker, heading, owner, description, personality, badges, metadata, actionRegion);
    section.append(media, summary);
    mount.appendChild(section);
  }

  function metadataRow(label, value, className = '') {
    const row = document.createElement('div');
    row.className = `character-profile-metadata-row ${className}`.trim();
    const term = document.createElement('span');
    term.textContent = label;
    const detail = document.createElement('strong');
    detail.textContent = value;
    row.append(term, detail);
    return row;
  }

  function renderUnavailable(media, label = '') {
    media.classList.add('is-empty');
    media.replaceChildren();
    const icon = document.createElement('span');
    icon.className = 'character-profile-media-empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▧';
    const copy = document.createElement('span');
    copy.textContent = label || t(
      'character-profiles.states.mediaUnavailable',
      'Character image unavailable'
    );
    media.append(icon, copy);
  }

  window.ModelPromptForgeCharacterProfileHero = { render };
})();
