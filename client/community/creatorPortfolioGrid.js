(() => {
  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, page } = {}) {
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
        const image = document.createElement('img');
        image.src = post.thumbnailUrl || post.imageUrl;
        image.alt = post.title || translate('community.creator.postPreview', 'Community post');
        image.loading = 'lazy';
        article.appendChild(image);
      }

      const copy = document.createElement('div');
      const type = document.createElement('small');
      type.textContent = String(post.postType || 'image').replaceAll('_', ' ');
      const title = document.createElement('strong');
      title.textContent = post.title || translate('community.creator.untitled', 'Untitled');
      copy.append(type, title);
      article.appendChild(copy);
      mount.appendChild(article);
    });
  }

  window.ModelPromptForgeCreatorPortfolioGrid = { render };
})();
