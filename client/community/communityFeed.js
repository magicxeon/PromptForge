/* Community-05 Explore feed. Ranking and counters remain server-owned. */
(() => {
  const state = {
    sort: 'latest',
    period: 'week',
    postType: 'all',
    officialTag: '',
    search: '',
    catalog: null,
    facets: null,
    items: [],
    loading: false,
    error: null
  };

  const translate = (key, fallback, variables = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;

  async function refresh() {
    let root = document.querySelector('[data-community-feed]');
    if (!root) return;
    if (state.loading) {
      render(root);
      return;
    }
    await window.ModelPromptForgeCommunityFeatures?.initialize?.();
    root = document.querySelector('[data-community-feed]');
    if (!root) return;
    if (window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
      'community.exploreEnabled'
    ) !== true) {
      renderUnavailable(root);
      return;
    }

    state.loading = true;
    state.error = null;
    render(root);
    try {
      const result = await window.ModelPromptForgeCommunityEngagementApi.listPosts({
        sort: state.sort,
        period: state.period,
        postType: state.postType,
        officialTag: state.officialTag,
        search: state.search,
        limit: 24
      });
      state.items = Array.isArray(result?.items) ? result.items : [];
      state.facets = result?.facets || null;
    } catch (error) {
      state.error = error;
      state.items = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  function render(root = document.querySelector('[data-community-feed]')) {
    if (!root) return;
    root.replaceChildren(buildToolbar());

    const status = document.createElement('div');
    status.className = 'community-feed-status';
    status.setAttribute('aria-live', 'polite');
    root.appendChild(status);

    if (state.loading) {
      status.textContent = translate('community.feed.loading', 'Loading community images...');
      return;
    }
    if (state.error) {
      status.classList.add('is-error');
      const message = document.createElement('p');
      message.textContent = translate(
        'community.feed.error',
        'Community images could not be loaded.'
      );
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn-neon-outline';
      retry.textContent = translate('community.feed.retry', 'Retry');
      retry.addEventListener('click', refresh);
      status.append(message, retry);
      return;
    }
    if (state.items.length === 0) {
      status.textContent = translate(
        'community.feed.empty',
        'No public images yet. Share a generated image to start the feed.'
      );
      return;
    }

    status.remove();
    const grid = document.createElement('div');
    grid.className = 'community-feed-grid';
    state.items.forEach(post => grid.appendChild(buildPostCard(post)));
    root.appendChild(grid);
  }

  function buildToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'community-feed-toolbar';

    const heading = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'community-home-kicker';
    kicker.textContent = translate('community.explore.kicker', 'EXPLORE');
    const title = document.createElement('h3');
    title.textContent = translate('community.feed.title', 'Community images');
    heading.append(kicker, title);

    const sortControls = document.createElement('div');
    sortControls.className = 'community-feed-controls';
    sortControls.append(
      buildControl('latest', 'week', translate('community.feed.latest', 'Latest')),
      buildControl('trending', 'week', translate('community.feed.week', 'Trending week')),
      buildControl('trending', 'month', translate('community.feed.month', 'Trending month')),
      buildControl('top', 'year', translate('community.feed.year', 'Top year'))
    );
    toolbar.append(heading, sortControls);

    const layers = document.createElement('div');
    layers.className = 'community-feed-layers';
    layers.append(buildTypeControls(), buildCategoryControls(), buildSearchControl());
    const fragment = document.createDocumentFragment();
    fragment.append(toolbar, layers);
    return fragment;
  }

  function buildTypeControls() {
    const group = document.createElement('div');
    group.className = 'community-feed-type-controls';
    group.setAttribute('aria-label', translate('community.feed.typeLabel', 'Post type'));
    [
      ['all', translate('community.feed.type.all', 'All')],
      ['image', translate('community.feed.type.image', 'Community images')],
      ['template', translate('community.feed.type.template', 'Templates')],
      ['comparison', translate('community.feed.type.comparison', 'Comparisons')],
      ['collection', translate('community.feed.type.collection', 'Collections')]
    ].forEach(([value, label]) => {
      const button = document.createElement('button');
      const active = state.postType === value;
      const count = state.facets?.postTypes?.[value];
      button.type = 'button';
      button.className = 'community-feed-type';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.textContent = Number.isFinite(Number(count)) ? `${label} ${count}` : label;
      button.addEventListener('click', () => {
        if (state.postType === value) return;
        state.postType = value;
        refresh();
      });
      group.appendChild(button);
    });
    return group;
  }

  function buildCategoryControls() {
    const region = document.createElement('div');
    region.className = 'community-feed-categories';
    const all = categoryButton('', translate('community.feed.categoryAll', 'All categories'));
    region.appendChild(all);
    const tags = (state.catalog?.dimensions || []).flatMap(dimension =>
      (dimension.tags || []).map(tag => ({
        ...tag,
        dimensionId: dimension.id
      }))
    );
    tags.forEach(tag => region.appendChild(categoryButton(
      tag.id,
      localizedLabel(tag.labels, tag.id),
      state.facets?.officialTags?.find(item => item.id === tag.id)?.count || 0
    )));
    return region;
  }

  function categoryButton(value, label, count = null) {
    const button = document.createElement('button');
    const active = state.officialTag === value;
    button.type = 'button';
    button.className = 'community-category-chip';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = count === null ? label : `${label} ${count}`;
    button.addEventListener('click', () => {
      if (state.officialTag === value) return;
      state.officialTag = value;
      refresh();
    });
    return button;
  }

  function buildSearchControl() {
    const form = document.createElement('form');
    form.className = 'community-feed-search';
    form.setAttribute('role', 'search');
    const input = document.createElement('input');
    input.type = 'search';
    input.maxLength = 100;
    input.value = state.search;
    input.placeholder = translate('community.feed.searchPlaceholder', 'Search title, creator or tag...');
    input.setAttribute('aria-label', translate('community.feed.searchLabel', 'Search Community'));
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = translate('community.feed.searchAction', 'Search');
    form.append(input, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      state.search = input.value.trim();
      refresh();
    });
    return form;
  }

  function buildControl(sort, period, label) {
    const button = document.createElement('button');
    const active = state.sort === sort && state.period === period;
    button.type = 'button';
    button.className = 'community-feed-filter';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = label;
    button.addEventListener('click', () => {
      if (active) return;
      state.sort = sort;
      state.period = period;
      refresh();
    });
    return button;
  }

  function buildPostCard(post) {
    const article = document.createElement('article');
    article.className = 'community-post-card';
    article.dataset.postType = post.postType || 'image';

    const media = document.createElement('button');
    media.type = 'button';
    media.className = 'community-post-media';
    media.setAttribute('aria-label', translate('community.feed.openImage', 'Open full-size image'));
    if (post.thumbnailUrl || post.imageUrl) {
      const image = document.createElement('img');
      image.src = post.thumbnailUrl || post.imageUrl;
      image.alt = post.title || translate('community.creator.postPreview', 'Community post');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        media.classList.add('is-unavailable');
        image.remove();
        media.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
      }, { once: true });
      media.appendChild(image);
      media.addEventListener('click', () => openImage(post, media));
    } else {
      media.classList.add('is-unavailable');
      media.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
    }

    const body = document.createElement('div');
    body.className = 'community-post-body';
    const title = document.createElement('h4');
    const detail = document.createElement('button');
    detail.type = 'button';
    detail.className = 'community-post-detail-link';
    detail.textContent = post.title || translate('community.creator.untitled', 'Untitled');
    detail.addEventListener('click', () =>
      window.ModelPromptForgeRouter?.navigate(`/community/${encodeURIComponent(post.id)}`)
    );
    title.appendChild(detail);
    const badge = document.createElement('span');
    badge.className = `community-post-type-badge is-${post.postType || 'image'}`;
    badge.textContent = typeLabel(post.postType);
    const creator = document.createElement('p');
    creator.className = 'community-post-creator';
    creator.textContent = post.creator?.displayName || post.creator?.username || 'Creator';
    const meta = document.createElement('div');
    meta.className = 'community-post-meta';
    meta.append(
      metric('heart', post.engagementSummary?.likeCount),
      metric('save', post.engagementSummary?.saveCount),
      metric('comment', post.engagementSummary?.commentCount)
    );
    body.append(badge, title, creator, meta);
    article.append(media, body);
    return article;
  }

  function typeLabel(postType) {
    const key = ['template', 'comparison', 'collection'].includes(postType) ? postType : 'image';
    return translate(`community.feed.type.${key}`, key === 'image' ? 'Community image' : key);
  }

  function localizedLabel(labels, fallback) {
    const locale = window.ModelPromptForgeI18n?.getLocale?.()
      || window.state?.language
      || 'en';
    return labels?.[locale] || labels?.en || fallback;
  }

  function openImage(post, triggerElement) {
    const items = state.items
      .filter(item => item.imageUrl)
      .map(toLightboxItem);
    const activeIndex = items.findIndex(item => item.id === post.id);
    const item = items[activeIndex];
    if (!item) return;
    window.openLightbox?.(item, {
      triggerElement,
      browseContext: {
        source: 'community',
        collectionId: null,
        itemIds: items.map(entry => entry.id),
        items,
        activeIndex
      }
    });
  }

  function toLightboxItem(post) {
    return {
      id: post.id,
      imageUrl: post.imageUrl,
      thumbnailUrl: post.thumbnailUrl,
      prompt: post.promptPreview || '',
      provider: post.providerModelDisplay || 'Community',
      submodel: post.postType || 'image',
      createdAt: post.createdAt,
      isCommunityPublic: true,
      communityPost: post
    };
  }

  function metric(kind, value) {
    const item = document.createElement('span');
    item.className = `community-post-metric metric-${kind}`;
    item.textContent = String(Number(value) || 0);
    return item;
  }

  function renderUnavailable(root) {
    root.replaceChildren();
    const status = document.createElement('div');
    status.className = 'community-feed-status';
    status.textContent = translate(
      'community.feed.unavailable',
      'Community Explore is not available.'
    );
    root.appendChild(status);
  }

  async function initialize() {
    if (!state.catalog) {
      try {
        state.catalog = await window.ModelPromptForgeCommunityEngagementApi.getTaxonomy();
      } catch {
        state.catalog = { dimensions: [] };
      }
    }
    refresh();
  }

  window.addEventListener('modelpromptforge:route', event => {
    if (event.detail?.pathname === '/community') refresh();
  });
  window.addEventListener('modelpromptforge:actorchange', refresh);
  window.addEventListener('modelpromptforge:languagechange', () => render());
  window.addEventListener('modelpromptforge:communityfeatureschange', () => {
    if (document.body.dataset.appPage === 'community') refresh();
  });

  window.ModelPromptForgeCommunityFeed = {
    initialize,
    refresh,
    getItems: () => structuredClone(state.items)
  };
})();
