(() => {
  const t = (key, fallback, values = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, values, { defaultValue: fallback }) || fallback;

  function createSection({
    title,
    count = null,
    viewAllRoute = null,
    className = '',
    emptyText = ''
  } = {}) {
    const section = document.createElement('section');
    section.className = `creator-profile-section ${className}`.trim();
    const header = document.createElement('header');
    const heading = document.createElement('h2');
    heading.textContent = title || '';
    header.appendChild(heading);
    if (Number.isFinite(Number(count))) {
      const total = document.createElement('span');
      total.className = 'creator-profile-section-count';
      total.textContent = String(Number(count));
      header.appendChild(total);
    }
    if (viewAllRoute) {
      const link = document.createElement('a');
      link.href = viewAllRoute;
      link.dataset.route = viewAllRoute;
      link.textContent = t('community.creator.viewAll', 'View all');
      link.addEventListener('click', event => {
        event.preventDefault();
        window.ModelPromptForgeRouter?.navigate?.(viewAllRoute);
      });
      header.appendChild(link);
    }
    const body = document.createElement('div');
    body.className = 'creator-profile-section-body';
    section.append(header, body);
    return {
      element: section,
      body,
      setEmpty() {
        body.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'creator-profile-empty';
        empty.textContent = emptyText || t('community.creator.sectionEmpty', 'Nothing public here yet.');
        body.appendChild(empty);
      }
    };
  }

  function createStats(items = [], className = '') {
    const list = document.createElement('dl');
    list.className = `creator-profile-stat-list ${className}`.trim();
    items.forEach(item => {
      const group = document.createElement('div');
      const value = document.createElement('dd');
      value.textContent = compactNumber(item.value);
      const label = document.createElement('dt');
      label.textContent = item.label;
      group.append(value, label);
      list.appendChild(group);
    });
    return list;
  }

  function createMediaCard(item, {
    kind = 'image',
    onOpen = null,
    compact = false
  } = {}) {
    const card = document.createElement('article');
    card.className = `creator-profile-media-card${compact ? ' is-compact' : ''}`;
    const media = document.createElement('button');
    media.type = 'button';
    media.className = 'creator-profile-media';
    const imageUrl = item.thumbnailUrl || item.imageUrl || item.displayImageUrl || '';
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = actorMediaUrl(imageUrl);
      image.alt = item.title || item.displayName || t('community.creator.postPreview', 'Community post');
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        media.classList.add('is-unavailable');
        media.replaceChildren(document.createTextNode(
          t('community.feed.imageUnavailable', 'Image unavailable')
        ));
      }, { once: true });
      media.appendChild(image);
    } else {
      media.classList.add('is-unavailable');
      media.textContent = t('community.feed.imageUnavailable', 'Image unavailable');
    }
    const copy = document.createElement('div');
    copy.className = 'creator-profile-media-copy';
    const type = document.createElement('small');
    type.textContent = kind;
    const title = document.createElement('strong');
    title.textContent = item.title || item.displayName || t('community.creator.untitled', 'Untitled');
    title.setAttribute('role', 'button');
    copy.append(type, title);
    const summary = engagementSummary(item);
    if (summary) {
      const meta = document.createElement('span');
      meta.textContent = summary;
      copy.appendChild(meta);
    }
    const open = () => onOpen?.(item, media);
    media.addEventListener('click', open);
    title.tabIndex = 0;
    title.addEventListener('click', open);
    title.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      open();
    });
    card.append(media, copy);
    return card;
  }

  function createPostGrid(items = [], options = {}) {
    const grid = document.createElement('div');
    grid.className = `creator-profile-media-grid ${options.className || ''}`.trim();
    items.forEach(item => grid.appendChild(
      item.postType === 'comparison' && item.comparisonSnapshot?.slots?.length
        ? createComparisonCard(item, options)
        : createMediaCard(item, options)
    ));
    return grid;
  }

  function createComparisonCard(item, options = {}) {
    const card = document.createElement('article');
    card.className = `creator-profile-media-card${options.compact ? ' is-compact' : ''}`;
    const media = document.createElement('div');
    media.className = 'creator-profile-media creator-profile-comparison-media';
    const open = () => options.onOpen?.(item, media);
    window.ModelPromptForgeComparisons?.createMosaic?.({
      mount: media,
      items: item.comparisonSnapshot.slots,
      maxVisible: 3,
      label: item.title || t('community.comparison.open', 'Open comparison'),
      context: 'community',
      onActivate: open
    });
    const copy = document.createElement('div');
    copy.className = 'creator-profile-media-copy';
    const type = document.createElement('small');
    type.textContent = 'comparison';
    const title = document.createElement('strong');
    title.textContent = item.title || t('community.creator.untitled', 'Untitled');
    title.setAttribute('role', 'button');
    title.tabIndex = 0;
    title.addEventListener('click', open);
    title.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      open();
    });
    copy.append(type, title);
    const summary = engagementSummary(item);
    if (summary) {
      const meta = document.createElement('span');
      meta.textContent = summary;
      copy.appendChild(meta);
    }
    card.append(media, copy);
    return card;
  }

  function openCommunityItem(item, triggerElement) {
    if (item.postType && item.id) {
      window.ModelPromptForgeRouter?.navigate?.(`/community/${encodeURIComponent(item.id)}`);
      return;
    }
    const lightboxItem = {
      id: item.id,
      imageUrl: item.imageUrl || item.displayImageUrl,
      thumbnailUrl: item.thumbnailUrl,
      prompt: '',
      provider: 'Community',
      submodel: item.kind || 'image',
      createdAt: item.createdAt,
      isCommunityPublic: true,
      communityPost: item
    };
    window.openLightbox?.(lightboxItem, {
      triggerElement,
      browseContext: {
        source: 'creator-profile',
        itemIds: [item.id],
        items: [lightboxItem],
        activeIndex: 0
      }
    });
  }

  function engagementSummary(item) {
    const summary = item.engagementSummary || item.stats || {};
    const likes = Number(summary.likeCount ?? summary.likes) || 0;
    const uses = Number(summary.remixSuccessCount ?? summary.totalOutputs) || 0;
    if (!likes && !uses) return '';
    return `${compactNumber(likes)} ${t('community.detail.like', 'Likes')} / ${compactNumber(uses)} ${t('community.creator.uses', 'Uses')}`;
  }

  function compactNumber(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat(undefined, {
      notation: number >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    }).format(number);
  }

  const actorMediaUrl = value =>
    window.ModelPromptForgeActorContext?.appendActorQuery?.(value) || value;

  window.ModelPromptForgeCreatorProfileComponents = {
    createSection,
    createStats,
    createMediaCard,
    createPostGrid,
    openCommunityItem,
    compactNumber
  };
})();
