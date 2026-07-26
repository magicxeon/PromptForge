(() => {
  let activePostId = null;
  let requestVersion = 0;

  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    window.addEventListener('modelpromptforge:route', event => activate(event.detail));
    window.addEventListener('modelpromptforge:actorchange', () => activePostId && load(activePostId));
    window.addEventListener('modelpromptforge:languagechange', () => activePostId && load(activePostId));
    activate(window.ModelPromptForgeRouter?.current?.());
  }

  function activate(route) {
    const match = String(route?.pathname || '').match(/^\/community\/([^/]+)$/);
    if (!match) {
      activePostId = null;
      return;
    }
    activePostId = decodeURIComponent(match[1]);
    load(activePostId);
  }

  async function load(postId) {
    const mount = document.getElementById('community-post-detail');
    if (!mount) return;
    const version = ++requestVersion;
    renderStatus(mount, t('community.detail.loading', 'Loading Community post...'));
    try {
      const [post, engagement, comments] = await Promise.all([
        window.ModelPromptForgeCommunityEngagementApi.getPost(postId),
        window.ModelPromptForgeCommunityEngagementApi.getEngagement(postId),
        window.ModelPromptForgeCommunityEngagementApi.listComments(postId)
      ]);
      if (version !== requestVersion) return;
      render(mount, post, engagement, comments);
      window.ModelPromptForgeCommunityEngagementApi.recordView(postId)
        .then(() => window.ModelPromptForgeCommunityFeed?.refresh?.())
        .catch(() => {});
    } catch (error) {
      if (version !== requestVersion) return;
      renderStatus(mount, error.message || t(
        'community.post.unavailable',
        'This community post is unavailable.'
      ), true);
    }
  }

  function render(mount, post, engagement, comments) {
    mount.replaceChildren();
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'community-detail-back';
    back.textContent = t('community.detail.back', 'Back to Community');
    back.addEventListener('click', () => window.ModelPromptForgeRouter.navigate('/community'));

    const type = document.createElement('span');
    type.className = `community-post-type-badge is-${post.postType || 'image'}`;
    type.textContent = post.postType || 'image';
    const title = document.createElement('h1');
    title.textContent = post.title || t('community.creator.untitled', 'Untitled');
    const description = document.createElement('p');
    description.className = 'community-detail-description';
    description.textContent = post.description || '';
    const creator = document.createElement('button');
    creator.type = 'button';
    creator.className = 'community-detail-creator';
    creator.textContent = post.creator?.displayName || 'Creator';
    creator.addEventListener('click', () => {
      if (post.creator?.handle) {
        window.ModelPromptForgeRouter.navigate(`/creators/${encodeURIComponent(post.creator.handle)}`);
      }
    });
    const prompt = document.createElement('p');
    prompt.className = 'community-detail-prompt';
    prompt.textContent = post.promptPreview || t(
      'community.detail.promptHidden',
      'Prompt text is hidden by the creator.'
    );

    const actions = buildEngagementActions(post, engagement);
    const workflow = buildWorkflowActions(post);
    const ownerActions = post.viewer?.isOwner ? buildOwnerActions(post) : null;

    if (post.postType === 'comparison' && post.comparisonSnapshot?.slots?.length) {
      const comparisonLayout = document.createElement('div');
      comparisonLayout.className = 'community-comparison-detail-layout';
      const heading = document.createElement('header');
      heading.className = 'community-comparison-detail-header';
      heading.append(type, title, creator, description);
      comparisonLayout.append(heading, buildComparisonMedia(post, engagement));

      const promptRegion = document.createElement('section');
      promptRegion.className = 'community-comparison-prompt';
      const promptHeading = document.createElement('h2');
      promptHeading.textContent = t('community.detail.prompt', 'Prompt');
      promptRegion.append(promptHeading, prompt);
      comparisonLayout.append(promptRegion, actions, workflow);
      if (ownerActions) comparisonLayout.appendChild(ownerActions);
      mount.append(back, comparisonLayout, buildComments(post, comments));
      return;
    }

    const layout = document.createElement('div');
    layout.className = 'community-detail-layout';
    const media = buildMedia(post, engagement);
    const aside = document.createElement('aside');
    aside.className = 'community-detail-panel';
    aside.append(type, title, creator, description);
    if (post.postType !== 'collection') aside.appendChild(prompt);
    aside.append(actions, workflow);
    if (ownerActions) aside.appendChild(ownerActions);

    layout.append(media, aside);
    mount.append(back, layout, buildComments(post, comments));
  }

  function buildMedia(post, engagement) {
    if (post.postType === 'comparison' && post.comparisonSnapshot?.slots?.length) {
      return buildComparisonMedia(post, engagement);
    }
    if (post.postType === 'collection' && post.collectionSnapshot?.items?.length) {
      return buildCollectionMedia(post);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-detail-media';
    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title || t('community.creator.postPreview', 'Community post');
    button.appendChild(image);
    button.addEventListener('click', () => {
      const item = {
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
      window.openLightbox?.(item, {
        triggerElement: button,
        browseContext: {
          source: 'community',
          itemIds: [post.id],
          items: [item],
          activeIndex: 0
        }
      });
    });
    return button;
  }

  function buildCollectionMedia(post) {
    const grid = document.createElement('div');
    grid.className = 'community-collection-grid';
    const items = post.collectionSnapshot.items.map((entry, index) => ({
      id: `${post.id}:${entry.itemId}`,
      imageUrl: entry.imageUrl,
      thumbnailUrl: entry.thumbnailUrl,
      prompt: '',
      provider: entry.providerDisplayName || 'Community',
      submodel: entry.modelDisplayName || 'Collection',
      createdAt: entry.createdAt,
      isCommunityPublic: true,
      communityPost: post,
      collectionPosition: index + 1
    }));
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'community-collection-item';
      const image = document.createElement('img');
      image.src = item.thumbnailUrl || item.imageUrl;
      image.alt = `${post.title || t('community.feed.type.collection', 'Collection')} ${index + 1}`;
      image.loading = 'lazy';
      const label = document.createElement('span');
      label.textContent = item.submodel || `${t('community.collection.image', 'Image')} ${index + 1}`;
      button.append(image, label);
      button.addEventListener('click', () => {
        window.openLightbox?.(item, {
          triggerElement: button,
          browseContext: {
            source: 'community',
            itemIds: items.map(entry => entry.id),
            items,
            activeIndex: index
          }
        });
      });
      grid.appendChild(button);
    });
    return grid;
  }

  function buildComparisonMedia(post, engagement) {
    const mount = document.createElement('section');
    mount.className = 'community-comparison-workspace-mount';
    const viewModel = window.ModelPromptForgeComparisons.fromPublicCommunityPost(post, engagement);
    const lightboxItems = viewModel.results.filter(result => result.imageUrl).map(result => ({
      id: `${post.id}:${result.slotId}`,
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      prompt: post.promptPreview || '',
      provider: result.providerLabel || 'Community',
      submodel: result.modelLabel || 'Comparison',
      createdAt: post.createdAt,
      isCommunityPublic: true,
      communityPost: post
    }));
    window.ModelPromptForgeComparisons.createWorkspace({
      mount,
      viewModel,
      options: {
        context: 'community',
        showPrompt: false,
        showEngagement: false
      },
      permissions: viewModel.permissions,
      actions: {
        onOpenResult(result, triggerElement) {
          const activeIndex = lightboxItems.findIndex(item => item.id.endsWith(`:${result.slotId}`));
          const item = lightboxItems[activeIndex];
          if (!item) return;
          window.openLightbox?.(item, {
            triggerElement,
            browseContext: {
              source: 'community-comparison',
              itemIds: lightboxItems.map(entry => entry.id),
              items: lightboxItems,
              activeIndex
            }
          });
        },
        async onVote(result) {
          if (result.isActorVote) {
            await window.ModelPromptForgeCommunityEngagementApi.removeComparisonVote(post.id);
          } else {
            await window.ModelPromptForgeCommunityEngagementApi.setComparisonVote(post.id, result.slotId);
          }
          await load(post.id);
        }
      }
    });
    return mount;
  }

  function buildEngagementActions(post, engagement) {
    const region = document.createElement('div');
    region.className = 'community-detail-actions';
    region.append(
      reactionButton('like', engagement.viewerState?.liked, engagement.summary?.likeCount, post.id),
      reactionButton('save', engagement.viewerState?.saved, engagement.summary?.saveCount, post.id)
    );
    const share = document.createElement('button');
    share.type = 'button';
    share.textContent = t('community.detail.share', 'Share');
    share.addEventListener('click', () => sharePublicPost(post));
    region.appendChild(share);
    if (!post.viewer?.isOwner) {
      const report = document.createElement('button');
      report.type = 'button';
      report.textContent = t('community.report.action', 'Report');
      report.addEventListener('click', () => window.ModelPromptForgeReportPostDialog?.open?.(post.id));
      region.appendChild(report);
    }
    return region;
  }

  async function sharePublicPost(post) {
    const url = new URL(`/community/${encodeURIComponent(post.id)}`, window.location.origin).href;
    if (navigator.share) {
      await navigator.share({ title: post.title || document.title, url });
      return;
    }
    await navigator.clipboard?.writeText?.(url);
  }

  function reactionButton(type, active, count, postId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.toggle('active', active === true);
    button.textContent = `${type === 'like' ? t('community.detail.like', 'Like') : t('community.detail.save', 'Save')} ${Number(count) || 0}`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await window.ModelPromptForgeCommunityEngagementApi.setReaction(postId, type, !active);
        await load(postId);
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }

  function buildWorkflowActions(post) {
    const region = document.createElement('div');
    region.className = 'community-detail-workflow';
    if (post.templateAvailability) {
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'btn-primary';
      use.textContent = t('community.template.use', 'Use Template');
      use.addEventListener('click', () =>
        window.ModelPromptForgeCommunityTemplateActions.usePostTemplate(post.id)
      );
      region.appendChild(use);
    }
    return region;
  }

  function buildOwnerActions(post) {
    const region = document.createElement('div');
    region.className = 'community-detail-owner-actions';
    const gallery = document.createElement('button');
    gallery.type = 'button';
    gallery.textContent = t('community.gallery.add', 'Add to Gallery');
    gallery.addEventListener('click', async () => {
      gallery.disabled = true;
      try {
        await window.ModelPromptForgeCommunityGalleryApi.addGalleryItem({
          postId: post.id,
          reusePolicy: post.templateAvailability ? 'use_as_template' : 'view_only'
        });
        gallery.textContent = t('community.gallery.added', 'Added to Gallery');
      } finally {
        gallery.disabled = false;
      }
    });
    const character = document.createElement('button');
    character.type = 'button';
    character.textContent = t('community.character.create', 'Create Character');
    character.addEventListener('click', async () => {
      character.disabled = true;
      try {
        await window.ModelPromptForgeCommunityGalleryApi.createCharacter({
          postId: post.id,
          displayName: post.title || 'Character',
          characterType: 'full_character'
        });
        character.textContent = t('community.character.created', 'Character created');
      } finally {
        character.disabled = false;
      }
    });
    region.append(gallery, character);
    return region;
  }

  function buildComments(post, page) {
    const section = document.createElement('section');
    section.className = 'community-comments';
    const heading = document.createElement('h2');
    heading.textContent = t('community.comments.title', 'Comments');
    const form = document.createElement('form');
    const input = document.createElement('textarea');
    input.rows = 2;
    input.maxLength = 1000;
    input.placeholder = t('community.comments.placeholder', 'Add a respectful comment...');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = t('community.comments.post', 'Post comment');
    form.append(input, submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!input.value.trim()) return;
      submit.disabled = true;
      try {
        await window.ModelPromptForgeCommunityEngagementApi.createComment(post.id, input.value);
        await load(post.id);
      } finally {
        submit.disabled = false;
      }
    });
    const list = document.createElement('div');
    list.className = 'community-comment-list';
    (page?.items || []).forEach(comment => {
      const article = document.createElement('article');
      const author = document.createElement('strong');
      author.textContent = comment.author?.displayName || 'Community member';
      const body = document.createElement('p');
      body.textContent = comment.body;
      article.append(author, body);
      if (comment.viewerCanDelete) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = t('community.comments.delete', 'Delete');
        remove.addEventListener('click', async () => {
          await window.ModelPromptForgeCommunityEngagementApi.removeComment(post.id, comment.id);
          await load(post.id);
        });
        article.appendChild(remove);
      }
      list.appendChild(article);
    });
    section.append(heading, form, list);
    return section;
  }

  function renderStatus(mount, message, error = false) {
    mount.replaceChildren();
    const status = document.createElement('section');
    status.className = `community-detail-status${error ? ' is-error' : ''}`;
    status.textContent = message;
    mount.appendChild(status);
  }

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCommunityPostDetail = { initialize, load };
})();
