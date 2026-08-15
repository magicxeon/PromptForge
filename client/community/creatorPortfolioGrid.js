(() => {
  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, page, allowReport = false } = {}) {
    if (!mount) return;
    mount.replaceChildren();
    const items = Array.isArray(page?.items) ? page.items : [];
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'creator-portfolio-empty';
      empty.textContent = translate(
        'community.creator.portfolioEmpty',
        'No public posts yet.'
      );
      mount.appendChild(empty);
      return;
    }

    items.forEach(post => {
      const article = document.createElement('article');
      article.className = 'creator-portfolio-card';

      if (post.thumbnailUrl || post.imageUrl) {
        const media = document.createElement('button');
        media.type = 'button';
        media.className = 'creator-portfolio-media';
        const image = document.createElement('img');
        image.src = post.thumbnailUrl || post.imageUrl;
        image.alt = post.title || translate('community.creator.postPreview', 'Community post');
        image.loading = 'lazy';
        media.appendChild(image);
        media.addEventListener('click', () => openPost(post));
        article.appendChild(media);
      }

      const copy = document.createElement('div');
      const type = document.createElement('small');
      type.textContent = String(post.postType || 'image').replaceAll('_', ' ');
      const title = document.createElement('strong');
      title.textContent = post.title || translate('community.creator.untitled', 'Untitled');
      title.setAttribute('role', 'link');
      title.tabIndex = 0;
      title.addEventListener('click', () => openPost(post));
      title.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        openPost(post);
      });
      copy.append(type, title);
      const disclosure = document.createElement('div');
      disclosure.className = 'creator-portfolio-disclosure';
      window.ModelPromptForgeModerationBanner?.render?.({
        mount: disclosure,
        contentDisclosure: post.contentDisclosure
      });
      copy.appendChild(disclosure);
      if (allowReport) {
        const report = document.createElement('button');
        report.type = 'button';
        report.className = 'creator-portfolio-report';
        report.textContent = translate('community.report.action', 'Report');
        report.addEventListener('click', () =>
          window.ModelPromptForgeReportPostDialog?.open?.(post.id)
        );
        copy.appendChild(report);
      }
      article.appendChild(copy);
      mount.appendChild(article);
    });
  }

  function openPost(post) {
    window.ModelPromptForgeRouter?.navigateToResource(
      `/community/${encodeURIComponent(post.id)}`,
      {
        sourceLabel: document.querySelector('.creator-profile-identity h1, .creator-profile-identity h2')
          ?.textContent?.trim() || translate('community.creator.profile', 'Creator profile'),
        sourceViewId: 'creator-portfolio'
      }
    );
  }

  window.ModelPromptForgeCreatorPortfolioGrid = { render };
})();
