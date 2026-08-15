(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function render({ mount, profileId, isOwner = false, onCreate } = {}) {
    if (!mount || !profileId) return;
    mount.replaceChildren(buildHeader());
    const content = document.createElement('div');
    content.className = 'character-profile-works-content';
    content.setAttribute('aria-busy', 'true');
    mount.appendChild(content);
    try {
      const page = await window.ModelPromptForgeCharacterProfileApi.listWorks(
        profileId,
        { limit: 12 }
      );
      content.setAttribute('aria-busy', 'false');
      if (!page.items?.length) {
        content.replaceChildren(emptyState(isOwner, onCreate));
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'character-profile-work-grid';
      page.items.forEach(item => grid.appendChild(card(item)));
      content.replaceChildren(grid);
    } catch {
      content.setAttribute('aria-busy', 'false');
      content.replaceChildren(emptyState(false));
    }
  }

  function buildHeader() {
    const header = document.createElement('header');
    const heading = document.createElement('h2');
    heading.textContent = t(
      'character-profiles.works.title',
      'Public work with this Character'
    );
    header.appendChild(heading);
    return header;
  }

  function emptyState(isOwner, onCreate) {
    const state = document.createElement('div');
    state.className = 'character-profile-works-empty';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▧';
    const copy = document.createElement('p');
    copy.textContent = t(
      'character-profiles.works.empty',
      'No public work has been shared yet.'
    );
    state.append(icon, copy);
    if (isOwner && onCreate) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'character-profile-secondary-action';
      button.textContent = t(
        'character-profiles.works.create',
        'Create an image with this Character'
      );
      button.addEventListener('click', onCreate);
      state.appendChild(button);
    }
    return state;
  }

  function card(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-profile-work-card';
    const image = document.createElement('img');
    image.src = item.thumbnailUrl || item.imageUrl;
    image.alt = item.title || t('character-profiles.works.image', 'Character work');
    image.loading = 'lazy';
    const title = document.createElement('span');
    title.textContent = item.title || t('community.creator.untitled', 'Untitled');
    button.append(image, title);
    button.addEventListener('click', () => window.openLightbox?.({
      id: item.id,
      imageUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      prompt: item.promptPreview || '',
      isCommunityPublic: true,
      communityPost: item
    }, { triggerElement: button }));
    return button;
  }

  window.ModelPromptForgeCharacterProfileWorks = { render };
})();
