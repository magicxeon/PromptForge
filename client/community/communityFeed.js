/* Community-05 Explore feed. Ranking and counters remain server-owned. */
(() => {
  const state = {
    sort: 'latest',
    period: 'week',
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
        limit: 24
      });
      state.items = Array.isArray(result?.items) ? result.items : [];
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

    const controls = document.createElement('div');
    controls.className = 'community-feed-controls';
    controls.append(
      buildControl('latest', 'week', translate('community.feed.latest', 'Latest')),
      buildControl('trending', 'week', translate('community.feed.week', 'Trending week')),
      buildControl('trending', 'month', translate('community.feed.month', 'Trending month')),
      buildControl('top', 'year', translate('community.feed.year', 'Top year'))
    );
    toolbar.append(heading, controls);
    return toolbar;
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

    const media = document.createElement('div');
    media.className = 'community-post-media';
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
    } else {
      media.classList.add('is-unavailable');
      media.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
    }

    const body = document.createElement('div');
    body.className = 'community-post-body';
    const title = document.createElement('h4');
    title.textContent = post.title || translate('community.creator.untitled', 'Untitled');
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
    body.append(title, creator, meta);
    article.append(media, body);
    return article;
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

  function initialize() {
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

  window.ModelPromptForgeCommunityFeed = { initialize, refresh };
})();
