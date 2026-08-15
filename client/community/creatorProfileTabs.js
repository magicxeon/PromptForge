(() => {
  const TABS = ['overview', 'gallery', 'characters', 'templates', 'comparisons', 'collections'];
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, model } = {}) {
    if (!mount || !model?.profile) return;
    mount.replaceChildren();
    const nav = document.createElement('nav');
    nav.className = 'creator-profile-tabs';
    nav.setAttribute('aria-label', t('community.creator.profileSections', 'Creator profile sections'));
    TABS.filter(tab => model.capabilities.availableTabs.includes(tab)).forEach(tab => {
      const route = routeFor(model.profile.handle, tab);
      const link = document.createElement('a');
      link.href = route;
      link.dataset.route = route;
      link.className = tab === model.selectedTab ? 'is-active' : '';
      if (tab === model.selectedTab) link.setAttribute('aria-current', 'page');
      const label = document.createElement('span');
      label.textContent = t(`community.creator.tab.${tab}`, labelFor(tab));
      const count = document.createElement('small');
      count.textContent = String(countFor(model.counts, tab));
      link.append(label, count);
      link.addEventListener('click', event => {
        event.preventDefault();
        window.ModelPromptForgeRouter?.navigate?.(route);
      });
      nav.appendChild(link);
    });
    mount.appendChild(nav);
  }

  function routeFor(handle, tab) {
    const base = `/creators/${encodeURIComponent(handle)}`;
    return tab === 'overview' ? base : `${base}/${tab}`;
  }

  function tabFromPath(pathname) {
    const match = String(pathname || '').match(/^\/creators\/[^/]+(?:\/([^/]+))?$/);
    return TABS.includes(match?.[1]) ? match[1] : 'overview';
  }

  function labelFor(tab) {
    return ({
      overview: 'Overview',
      gallery: 'Gallery',
      characters: 'Characters',
      templates: 'Templates',
      comparisons: 'Comparisons',
      collections: 'Collections'
    })[tab];
  }

  function countFor(counts, tab) {
    return ({
      overview: counts.publicPosts,
      gallery: counts.gallery,
      characters: counts.publicCharacters,
      templates: counts.templates,
      comparisons: counts.comparisons,
      collections: counts.collections
    })[tab] || 0;
  }

  window.ModelPromptForgeCreatorProfileTabs = {
    render,
    routeFor,
    tabFromPath
  };
})();
