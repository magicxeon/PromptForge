(() => {
  const namespace = window.ModelPromptForgeComparisons ||= {};

  function createMosaic({
    mount,
    items = [],
    maxVisible = 3,
    label = 'Open comparison',
    context = 'private',
    onActivate
  } = {}) {
    if (!mount) throw new TypeError('Comparison mosaic mount is required.');
    const visibleItems = items.filter(Boolean).slice(0, maxVisible);
    const root = document.createElement('button');
    root.type = 'button';
    root.className = `comparison-mosaic comparison-mosaic-${context} images-${Math.max(1, visibleItems.length)}`;
    root.setAttribute('aria-label', label);

    if (!visibleItems.length) {
      const empty = document.createElement('span');
      empty.className = 'comparison-mosaic-empty';
      empty.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
      root.appendChild(empty);
    } else {
      visibleItems.forEach(item => root.appendChild(createTile(item)));
      const remaining = Math.max(0, items.length - visibleItems.length);
      if (remaining) {
        const more = document.createElement('span');
        more.className = 'comparison-mosaic-more';
        more.textContent = `+${remaining}`;
        root.appendChild(more);
      }
    }
    root.addEventListener('click', event => {
      event.stopPropagation();
      onActivate?.();
    });
    mount.appendChild(root);
    return {
      element: root,
      destroy() {
        root.remove();
      }
    };
  }

  function createTile(item) {
    const tile = document.createElement('span');
    tile.className = 'comparison-mosaic-tile is-loading';
    const src = item.thumbnailUrl || item.imageUrl || '';
    if (!src) {
      tile.classList.remove('is-loading');
      tile.classList.add('is-unavailable');
      const unavailable = document.createElement('span');
      unavailable.className = 'comparison-mosaic-unavailable';
      unavailable.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
      tile.appendChild(unavailable);
      return tile;
    }
    const image = document.createElement('img');
    image.src = src;
    image.alt = item.alt || item.modelLabel || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => tile.classList.remove('is-loading'), { once: true });
    image.addEventListener('error', () => {
      tile.classList.remove('is-loading');
      tile.classList.add('is-unavailable');
      image.remove();
      const unavailable = document.createElement('span');
      unavailable.className = 'comparison-mosaic-unavailable';
      unavailable.textContent = translate('community.feed.imageUnavailable', 'Image unavailable');
      tile.appendChild(unavailable);
    }, { once: true });
    tile.appendChild(image);
    return tile;
  }

  function translate(key, fallback) {
    return window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  }

  namespace.createMosaic = createMosaic;
})();
