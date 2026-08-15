(() => {
  const t = (key, fallback, variables = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;

  function render({
    mount,
    post,
    engagement,
    onLike,
    onSave,
    onShare,
    onReport,
    onUseTemplate
  }) {
    if (!mount) throw new TypeError('Community Photo Viewer requires a mount element.');
    mount.replaceChildren();

    const root = document.createElement('section');
    root.className = 'community-photo-viewer';
    const mainColumn = document.createElement('div');
    mainColumn.className = 'community-photo-viewer-main';
    const aside = document.createElement('aside');
    aside.className = 'community-photo-viewer-aside';

    const metadata = {
      aspectRatio: post.generationMetadata?.aspectRatio || null,
      width: positiveInteger(post.generationMetadata?.width),
      height: positiveInteger(post.generationMetadata?.height),
      resolution: post.generationMetadata?.resolution || null
    };
    const metadataValueNodes = {};
    const media = buildMediaStage(post, metadata, metadataValueNodes);
    mainColumn.appendChild(media.stage);

    aside.append(
      buildCreator(post),
      buildPostSummary(post),
      buildEngagementActions(post, engagement, { onLike, onSave, onShare, onReport }),
      buildPromptCard(post),
      buildMetadata(post, metadata, metadataValueNodes),
      buildWorkflowActions(post, { onUseTemplate })
    );

    root.append(mainColumn, aside);
    mount.appendChild(root);

    return {
      mediaElement: media.image,
      mainColumn,
      updateEngagement() {
        // Engagement mutations reload the authoritative public post view.
      },
      destroy() {
        mount.replaceChildren();
      }
    };
  }

  function buildMediaStage(post, metadata, metadataValueNodes) {
    const stage = document.createElement('figure');
    stage.className = 'community-photo-stage';
    const toolbar = document.createElement('div');
    toolbar.className = 'community-photo-stage-toolbar';

    const fullscreenLabel = t('community.detail.fullscreen', 'Fullscreen');
    const fullscreen = commandButton('');
    fullscreen.classList.add('community-photo-icon-command', 'is-fullscreen');
    fullscreen.setAttribute('aria-label', fullscreenLabel);
    fullscreen.title = fullscreenLabel;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen?.();
        } else {
          await stage.requestFullscreen?.();
        }
      } catch {
        // Browser policy may reject fullscreen without changing page state.
      }
    });

    const download = document.createElement('a');
    const downloadLabel = t('community.detail.download', 'Download');
    download.className = 'community-photo-stage-command community-photo-icon-command is-download';
    download.href = post.imageUrl;
    download.download = safeDownloadName(post.title);
    download.setAttribute('aria-label', downloadLabel);
    download.title = downloadLabel;
    toolbar.append(fullscreen, download);

    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title || t('community.creator.postPreview', 'Community post');
    image.loading = 'eager';
    image.addEventListener('load', () => {
      if (!metadata.width) metadata.width = positiveInteger(image.naturalWidth);
      if (!metadata.height) metadata.height = positiveInteger(image.naturalHeight);
      if (!metadata.aspectRatio && metadata.width && metadata.height) {
        metadata.aspectRatio = reducedRatio(metadata.width, metadata.height);
      }
      refreshMetadataValues(metadata, metadataValueNodes);
    });
    image.addEventListener('error', () => {
      stage.classList.add('is-unavailable');
      const unavailable = t('community.feed.imageUnavailable', 'Image unavailable');
      image.alt = unavailable;
      stage.dataset.error = unavailable;
    });

    const caption = document.createElement('figcaption');
    caption.className = 'community-photo-stage-caption';
    const aspect = document.createElement('span');
    aspect.dataset.mediaAspect = '';
    const size = document.createElement('span');
    size.dataset.mediaSize = '';
    const created = document.createElement('time');
    created.dateTime = post.createdAt || '';
    created.textContent = formatCreatedAt(post.createdAt);
    created.hidden = !created.textContent;
    metadataValueNodes.captionAspect = aspect;
    metadataValueNodes.captionSize = size;
    caption.append(aspect, size, created);
    refreshMetadataValues(metadata, metadataValueNodes);

    stage.append(toolbar, image, caption);
    return { stage, image };
  }

  function buildCreator(post) {
    const region = document.createElement('header');
    region.className = 'community-photo-creator';
    const avatar = document.createElement('span');
    avatar.className = 'community-photo-creator-avatar';
    avatar.textContent = initials(post.creator?.displayName || post.creator?.username || 'Creator');
    const identity = document.createElement('button');
    identity.type = 'button';
    identity.className = 'community-photo-creator-link';
    const name = document.createElement('strong');
    name.textContent = post.creator?.displayName || post.creator?.username || 'Creator';
    const handle = document.createElement('small');
    handle.textContent = post.creator?.username ? `@${post.creator.username}` : '';
    identity.append(name, handle);
    identity.disabled = !post.creator?.handle;
    identity.addEventListener('click', () => {
      if (post.creator?.handle) {
        window.ModelPromptForgeRouter?.navigate(
          `/creators/${encodeURIComponent(post.creator.handle)}`
        );
      }
    });
    region.append(avatar, identity);
    return region;
  }

  function buildPostSummary(post) {
    const region = document.createElement('section');
    region.className = 'community-photo-summary';
    const category = document.createElement('span');
    category.className = `community-post-type-badge is-${post.postType || 'image'}`;
    category.textContent = categoryLabel(post);
    const title = document.createElement('h1');
    title.textContent = post.title || t('community.creator.untitled', 'Untitled');
    const description = document.createElement('p');
    description.className = 'community-detail-description';
    description.textContent = post.description || '';
    region.append(category, title);
    if (description.textContent) region.appendChild(description);
    return region;
  }

  function buildEngagementActions(post, engagement, callbacks) {
    const region = document.createElement('div');
    region.className = 'community-photo-action-bar';
    region.append(
      engagementButton(
        t('community.detail.like', 'Like'),
        engagement.viewerState?.liked,
        engagement.summary?.likeCount,
        callbacks.onLike
      ),
      engagementButton(
        t('community.detail.save', 'Save'),
        engagement.viewerState?.saved,
        engagement.summary?.saveCount,
        callbacks.onSave
      )
    );
    const share = commandButton(t('community.detail.share', 'Share'));
    share.addEventListener('click', () => callbacks.onShare?.());
    region.appendChild(share);
    if (!post.viewer?.isOwner && post.viewer?.permissions?.canReport !== false) {
      const report = commandButton(t('community.report.action', 'Report'));
      report.classList.add('is-subdued');
      report.addEventListener('click', () => callbacks.onReport?.());
      region.appendChild(report);
    }
    return region;
  }

  function buildPromptCard(post) {
    const region = document.createElement('section');
    region.className = 'community-photo-prompt-card';
    const header = document.createElement('header');
    const heading = document.createElement('h2');
    heading.textContent = t('community.detail.prompt', 'Prompt');
    header.appendChild(heading);

    const hasPrompt = typeof post.promptPreview === 'string' && post.promptPreview.trim();
    const prompt = document.createElement('p');
    prompt.className = 'community-photo-prompt-text';
    prompt.textContent = hasPrompt
      ? post.promptPreview
      : t('community.detail.promptHidden', 'Prompt text is hidden by the creator.');

    if (hasPrompt) {
      const copy = commandButton(t('community.detail.copyPrompt', 'Copy'));
      copy.classList.add('community-photo-prompt-copy');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(post.promptPreview);
          copy.textContent = t('community.detail.copied', 'Copied');
          window.setTimeout(() => {
            copy.textContent = t('community.detail.copyPrompt', 'Copy');
          }, 1600);
        } catch {
          copy.textContent = t('community.detail.copyFailed', 'Copy failed');
        }
      });
      header.appendChild(copy);
    } else {
      region.classList.add('is-hidden-prompt');
    }

    region.append(header, prompt);
    if (hasPrompt && post.promptPreview.length > 220) {
      prompt.classList.add('is-collapsed');
      const toggle = commandButton(t('community.detail.showMore', 'Show more'));
      toggle.classList.add('community-photo-prompt-toggle');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        prompt.classList.toggle('is-collapsed', expanded);
        toggle.textContent = expanded
          ? t('community.detail.showMore', 'Show more')
          : t('community.detail.showLess', 'Show less');
      });
      region.appendChild(toggle);
    }
    return region;
  }

  function buildMetadata(post, metadata, nodes) {
    const region = document.createElement('dl');
    region.className = 'community-photo-metadata';
    if (post.providerModelDisplay) {
      appendMetadata(
        region,
        t('community.detail.model', 'Model'),
        post.providerModelDisplay
      );
    }
    nodes.aspect = appendMetadata(
      region,
      t('community.detail.aspectRatio', 'Aspect ratio'),
      metadata.aspectRatio || t('community.detail.metadataUnavailable', 'Not available')
    );
    nodes.size = appendMetadata(
      region,
      t('community.detail.imageSize', 'Size'),
      sizeLabel(metadata) || metadata.resolution
        || t('community.detail.metadataUnavailable', 'Not available')
    );
    return region;
  }

  function buildWorkflowActions(post, callbacks) {
    const region = document.createElement('div');
    region.className = 'community-photo-workflow';
    if (post.templateAvailability === true) {
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'community-photo-primary-action';
      use.textContent = t('community.template.use', 'Use Template');
      use.addEventListener('click', () => callbacks.onUseTemplate?.());
      region.appendChild(use);
    }
    const collection = document.createElement('button');
    collection.type = 'button';
    collection.className = 'community-photo-secondary-action';
    collection.textContent = t('community.detail.addToCollection', 'Add to collection');
    collection.title = t('community.detail.collectionComingSoon', 'Coming soon');
    collection.disabled = true;
    region.appendChild(collection);
    return region;
  }

  function engagementButton(label, active, count, callback) {
    const button = commandButton(`${label} ${Number(count) || 0}`);
    button.classList.toggle('active', active === true);
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await callback?.();
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    });
    return button;
  }

  function commandButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    return button;
  }

  function appendMetadata(list, label, value) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    row.append(term, detail);
    list.appendChild(row);
    return detail;
  }

  function refreshMetadataValues(metadata, nodes) {
    const aspect = metadata.aspectRatio || '';
    const size = sizeLabel(metadata) || metadata.resolution || '';
    if (nodes.captionAspect) {
      nodes.captionAspect.textContent = aspect;
      nodes.captionAspect.hidden = !aspect;
    }
    if (nodes.captionSize) {
      nodes.captionSize.textContent = size;
      nodes.captionSize.hidden = !size;
    }
    if (nodes.aspect) {
      nodes.aspect.textContent = aspect
        || t('community.detail.metadataUnavailable', 'Not available');
    }
    if (nodes.size) {
      nodes.size.textContent = size
        || t('community.detail.metadataUnavailable', 'Not available');
    }
  }

  function categoryLabel(post) {
    const value = post.officialTags?.[0]
      || post.taxonomy?.categoryCodes?.[0]
      || post.postType
      || 'image';
    return String(value).replace(/[._-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function formatCreatedAt(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  function sizeLabel(metadata) {
    return metadata.width && metadata.height
      ? `${metadata.width} x ${metadata.height}`
      : '';
  }

  function reducedRatio(width, height) {
    let left = width;
    let right = height;
    while (right) {
      const next = left % right;
      left = right;
      right = next;
    }
    return `${width / left}:${height / left}`;
  }

  function positiveInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
  }

  function initials(value) {
    return String(value || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'CR';
  }

  function safeDownloadName(value) {
    const name = String(value || 'community-image')
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return `${name || 'community-image'}.png`;
  }

  window.ModelPromptForgeCommunityPhotoViewer = { render };
})();
