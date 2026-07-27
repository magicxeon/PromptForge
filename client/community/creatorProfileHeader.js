(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, model, onEdit, onManage, onFollowChanged } = {}) {
    if (!mount || !model?.profile) return;
    mount.replaceChildren();
    const { profile, viewer, counts } = model;
    const hero = document.createElement('section');
    hero.className = 'creator-profile-hero';
    if (profile.coverImageUrl) {
      hero.style.setProperty('--creator-cover', `url("${cssUrl(actorMediaUrl(profile.coverImageUrl))}")`);
      hero.classList.add('has-cover');
    }
    const avatar = document.createElement('div');
    avatar.className = 'creator-profile-hero-avatar';
    if (profile.avatarUrl) {
      const image = document.createElement('img');
      image.src = actorMediaUrl(profile.avatarUrl);
      image.alt = '';
      avatar.appendChild(image);
    } else {
      avatar.textContent = initials(profile.displayName);
    }
    const identity = document.createElement('div');
    identity.className = 'creator-profile-hero-identity';
    const titleRow = document.createElement('div');
    titleRow.className = 'creator-profile-title-row';
    const title = document.createElement('h1');
    title.textContent = profile.displayName;
    titleRow.appendChild(title);
    (profile.badgeCodes || []).forEach(code => {
      const badge = document.createElement('span');
      badge.className = 'creator-profile-badge';
      badge.textContent = code;
      titleRow.appendChild(badge);
    });
    const handle = document.createElement('p');
    handle.className = 'creator-profile-handle';
    handle.textContent = `@${profile.handle}`;
    const roles = document.createElement('div');
    roles.className = 'creator-profile-role-list';
    (profile.creatorRoles || []).forEach(role => {
      const item = document.createElement('span');
      item.textContent = role;
      roles.appendChild(item);
    });
    const headline = document.createElement('p');
    headline.className = 'creator-profile-headline';
    headline.textContent = profile.headline || profile.bio || t(
      'community.creator.noBio',
      'This creator has not added a bio yet.'
    );
    const metadata = document.createElement('div');
    metadata.className = 'creator-profile-metadata';
    appendMeta(metadata, profile.locationText);
    if (profile.websiteUrl) {
      const website = document.createElement('a');
      website.href = profile.websiteUrl;
      website.target = '_blank';
      website.rel = 'noopener noreferrer';
      website.textContent = profile.websiteUrl.replace(/^https?:\/\//, '');
      metadata.appendChild(website);
    }
    identity.append(titleRow, handle, roles, headline, metadata);

    const actions = document.createElement('div');
    actions.className = 'creator-profile-hero-actions';
    const followMount = document.createElement('div');
    const followProfile = {
      id: profile.id,
      followerCount: counts.followers,
      viewer
    };
    window.ModelPromptForgeFollowButton?.render?.({
      mount: followMount,
      profile: followProfile,
      onChanged: onFollowChanged
    });
    actions.appendChild(followMount);
    const share = button(t('community.creator.shareProfile', 'Share profile'), 'secondary');
    share.addEventListener('click', () => shareProfile());
    actions.appendChild(share);
    if (viewer.isOwner) {
      const edit = button(t('community.creator.edit', 'Edit profile'), 'secondary');
      edit.addEventListener('click', () => onEdit?.());
      const manage = button(t('community.creator.manage', 'Manage profile'), 'primary');
      manage.addEventListener('click', () => onManage?.());
      actions.append(edit, manage);
    }

    const stats = window.ModelPromptForgeCreatorProfileComponents.createStats([
      { label: t('community.creator.followers', 'Followers'), value: counts.followers },
      { label: t('community.creator.followingCount', 'Following'), value: counts.following },
      { label: t('community.creator.posts', 'Posts'), value: counts.publicPosts },
      { label: t('community.character.title', 'Characters'), value: counts.publicCharacters }
    ], 'creator-profile-hero-stats');
    hero.append(avatar, identity, actions, stats);
    mount.appendChild(hero);
  }

  function button(label, variant) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `creator-profile-button is-${variant}`;
    element.textContent = label;
    return element;
  }

  function appendMeta(root, value) {
    if (!value) return;
    const item = document.createElement('span');
    item.textContent = value;
    root.appendChild(item);
  }

  async function shareProfile() {
    try {
      await navigator.clipboard?.writeText?.(window.location.href);
    } catch {
      // Browsers without clipboard permission still expose the current URL.
    }
  }

  function initials(value) {
    return String(value || 'C').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]?.toLocaleUpperCase() || '')
      .join('') || 'C';
  }

  const cssUrl = value => String(value).replace(/["\\\n\r]/g, '');
  const actorMediaUrl = value =>
    window.ModelPromptForgeActorContext?.appendActorQuery?.(value) || value;

  window.ModelPromptForgeCreatorProfileHeader = { render };
})();
