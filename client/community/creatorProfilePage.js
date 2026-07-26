(() => {
  let activeHandle = null;
  let requestVersion = 0;

  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    window.addEventListener('modelpromptforge:route', event => activate(event.detail));
    window.addEventListener('modelpromptforge:actorchange', () => {
      if (activeHandle) load(activeHandle);
    });
    window.addEventListener('modelpromptforge:languagechange', () => {
      if (activeHandle) load(activeHandle);
    });
    activate(window.ModelPromptForgeRouter?.current?.());
  }

  function activate(route) {
    const match = String(route?.pathname || '').match(/^\/creators\/([^/]+)$/);
    if (!match) {
      activeHandle = null;
      return;
    }
    activeHandle = decodeURIComponent(match[1]);
    load(activeHandle);
  }

  async function openOwnProfile() {
    const profile = await window.ModelPromptForgeCommunityCreatorApi.getOwnProfile();
    window.ModelPromptForgeRouter.navigate(`/creators/${encodeURIComponent(profile.handle)}`);
  }

  async function load(handle) {
    const mount = document.getElementById('creator-profile-page');
    if (!mount) return;
    const version = ++requestVersion;
    renderStatus(mount, translate('community.creator.loading', 'Loading creator profile...'));
    try {
      const [profile, portfolio] = await Promise.all([
        window.ModelPromptForgeCommunityCreatorApi.getProfile(handle),
        window.ModelPromptForgeCommunityCreatorApi.getPortfolio(handle, { limit: 24, sort: 'newest' })
      ]);
      if (version !== requestVersion) return;
      renderProfile(mount, profile, portfolio);
    } catch (error) {
      if (version !== requestVersion) return;
      renderStatus(
        mount,
        error.message || translate('community.creator.unavailable', 'Creator profile is unavailable.'),
        true
      );
    }
  }

  function renderProfile(mount, profile, portfolio) {
    mount.replaceChildren();
    const header = document.createElement('section');
    header.className = 'creator-profile-header';

    const avatar = document.createElement('div');
    avatar.className = 'creator-profile-avatar';
    avatar.textContent = initials(profile.displayName);
    avatar.setAttribute('aria-hidden', 'true');

    const identity = document.createElement('div');
    identity.className = 'creator-profile-identity';
    const title = document.createElement('h2');
    title.textContent = profile.displayName;
    const handle = document.createElement('p');
    handle.className = 'creator-profile-handle';
    handle.textContent = `@${profile.handle}`;
    const bio = document.createElement('p');
    bio.className = 'creator-profile-bio';
    bio.textContent = profile.bio || translate('community.creator.noBio', 'This creator has not added a bio yet.');
    identity.append(title, handle, bio);

    const actions = document.createElement('div');
    actions.className = 'creator-profile-actions';
    const stats = document.createElement('div');
    stats.className = 'creator-profile-stats';
    stats.append(
      stat(profile.followerCount, translate('community.creator.followers', 'Followers')),
      stat(profile.publicPostCount, translate('community.creator.posts', 'Posts'))
    );
    const followMount = document.createElement('div');
    actions.append(stats, followMount);
    header.append(avatar, identity, actions);
    mount.appendChild(header);

    window.ModelPromptForgeFollowButton.render({
      mount: followMount,
      profile,
      onChanged: updated => renderProfile(mount, updated, portfolio)
    });

    if (profile.viewer?.isOwner) mount.appendChild(createEditForm(profile));

    const portfolioSection = document.createElement('section');
    portfolioSection.className = 'creator-portfolio-section';
    const heading = document.createElement('h3');
    heading.textContent = translate('community.creator.portfolio', 'Public portfolio');
    const grid = document.createElement('div');
    grid.className = 'creator-portfolio-grid';
    portfolioSection.append(heading, grid);
    mount.appendChild(portfolioSection);
    window.ModelPromptForgeCreatorPortfolioGrid.render({
      mount: grid,
      page: portfolio,
      allowReport: !profile.viewer?.isOwner
    });
  }

  function createEditForm(profile) {
    const section = document.createElement('section');
    section.className = 'creator-profile-editor';
    const heading = document.createElement('h3');
    heading.textContent = translate('community.creator.edit', 'Edit creator profile');
    const form = document.createElement('form');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 80;
    nameInput.value = profile.displayName;
    nameInput.setAttribute('aria-label', translate('community.creator.displayName', 'Display name'));

    const bioInput = document.createElement('textarea');
    bioInput.maxLength = 500;
    bioInput.rows = 3;
    bioInput.value = profile.bio || '';
    bioInput.setAttribute('aria-label', translate('community.creator.bio', 'Bio'));

    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = translate('community.creator.save', 'Save profile');
    const error = document.createElement('p');
    error.className = 'creator-profile-action-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    form.append(nameInput, bioInput, save, error);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      save.disabled = true;
      error.hidden = true;
      try {
        const updated = await window.ModelPromptForgeCommunityCreatorApi.updateOwnProfile({
          displayName: nameInput.value,
          bio: bioInput.value
        });
        const portfolio = await window.ModelPromptForgeCommunityCreatorApi.getPortfolio(
          updated.handle,
          { limit: 24, sort: 'newest' }
        );
        renderProfile(document.getElementById('creator-profile-page'), updated, portfolio);
      } catch (requestError) {
        error.textContent = requestError?.message || translate(
          'community.creator.actionFailed',
          'The creator profile could not be updated.'
        );
        error.hidden = false;
      } finally {
        save.disabled = false;
      }
    });
    section.append(heading, form);
    return section;
  }

  function stat(value, label) {
    const item = document.createElement('span');
    const number = document.createElement('strong');
    number.textContent = String(Number(value) || 0);
    const copy = document.createElement('small');
    copy.textContent = label;
    item.append(number, copy);
    return item;
  }

  function renderStatus(mount, message, isError = false) {
    mount.replaceChildren();
    const status = document.createElement('section');
    status.className = `creator-profile-status${isError ? ' is-error' : ''}`;
    status.textContent = message;
    mount.appendChild(status);
  }

  function initials(value) {
    return String(value || 'C').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]?.toLocaleUpperCase() || '')
      .join('') || 'C';
  }

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCreatorProfilePage = {
    initialize,
    openOwnProfile
  };
})();
