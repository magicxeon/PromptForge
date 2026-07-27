(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, model } = {}) {
    if (!mount || !model?.overview) return;
    mount.replaceChildren();
    const layout = document.createElement('div');
    layout.className = 'creator-profile-overview-layout';
    const main = document.createElement('div');
    main.className = 'creator-profile-overview-main';
    const aside = document.createElement('aside');
    aside.className = 'creator-profile-overview-aside';
    const sections = sectionBuilders(model);
    model.overview.sectionOrder.forEach(key => sections[key]?.(main));
    renderStatistics(aside, model);
    renderLatestCollection(aside, model);
    renderAbout(aside, model);
    layout.append(main, aside);
    mount.appendChild(layout);
  }

  function sectionBuilders(model) {
    const base = `/creators/${encodeURIComponent(model.profile.handle)}`;
    return {
      featured: root => appendPostSection(root, {
        title: t('community.creator.featuredWorks', 'Featured works'),
        items: model.overview.featured.items,
        route: `${base}/gallery`,
        className: 'is-featured'
      }),
      characters: root => {
        const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
          title: t('community.creator.popularCharacters', 'Popular Characters'),
          count: model.counts.publicCharacters,
          viewAllRoute: `${base}/characters`,
          emptyText: t('community.character.empty', 'No public Characters yet.')
        });
        window.ModelPromptForgeCommunityCharacterSection?.renderItems?.(
          section.body,
          model.overview.characters.items,
          { variant: 'rail' }
        );
        root.appendChild(section.element);
      },
      templates: root => appendPostSection(root, {
        title: t('community.creator.popularTemplates', 'Popular Templates'),
        items: model.overview.templates.items,
        route: `${base}/templates`,
        className: 'is-compact'
      }),
      comparisons: root => appendPostSection(root, {
        title: t('community.creator.recentComparisons', 'Recent Comparisons'),
        items: model.overview.comparisons.items,
        route: `${base}/comparisons`,
        className: 'is-compact'
      })
    };
  }

  function appendPostSection(root, { title, items, route, className }) {
    const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
      title,
      count: items.length,
      viewAllRoute: route,
      emptyText: t('community.creator.sectionEmpty', 'Nothing public here yet.')
    });
    if (!items.length) section.setEmpty();
    else section.body.appendChild(
      window.ModelPromptForgeCreatorProfileComponents.createPostGrid(items, {
        className,
        compact: className === 'is-compact',
        onOpen: window.ModelPromptForgeCreatorProfileComponents.openCommunityItem
      })
    );
    root.appendChild(section.element);
  }

  function renderStatistics(root, model) {
    const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
      title: t('community.creator.creatorStats', 'Creator statistics')
    });
    section.body.appendChild(window.ModelPromptForgeCreatorProfileComponents.createStats([
      { label: t('community.creator.likes', 'Likes'), value: model.statistics.likes },
      { label: t('community.creator.uses', 'Uses'), value: model.statistics.uses },
      { label: t('community.creator.remixes', 'Remixes'), value: model.statistics.remixes }
    ], 'is-summary'));
    root.appendChild(section.element);
  }

  function renderLatestCollection(root, model) {
    const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
      title: t('community.creator.latestCollection', 'Latest collection'),
      viewAllRoute: `/creators/${encodeURIComponent(model.profile.handle)}/collections`
    });
    if (!model.overview.latestCollection) section.setEmpty();
    else section.body.appendChild(
      window.ModelPromptForgeCreatorProfileComponents.createMediaCard(
        model.overview.latestCollection,
        {
          kind: 'collection',
          compact: true,
          onOpen: window.ModelPromptForgeCreatorProfileComponents.openCommunityItem
        }
      )
    );
    root.appendChild(section.element);
  }

  function renderAbout(root, model) {
    const section = window.ModelPromptForgeCreatorProfileComponents.createSection({
      title: t('community.creator.about', 'About creator')
    });
    const about = document.createElement('dl');
    about.className = 'creator-profile-about';
    appendAbout(about, t('community.creator.joined', 'Joined'), formatDate(model.profile.createdAt));
    appendAbout(about, t('community.creator.languages', 'Languages'), model.profile.languageCodes.join(', '));
    appendAbout(about, t('community.creator.categories', 'Content'), model.profile.contentCategoryCodes.join(', '));
    section.body.appendChild(about);
    root.appendChild(section.element);
  }

  function appendAbout(root, label, value) {
    if (!value) return;
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    root.append(term, detail);
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(value));
  }

  window.ModelPromptForgeCreatorProfileOverview = { render };
})();
