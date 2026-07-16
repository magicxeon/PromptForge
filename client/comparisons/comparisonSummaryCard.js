(() => {
  let imageObserver = null;

  function language() {
    return window.ModelPromptForgeComparisonBridge?.getLanguage?.() || 'th';
  }

  function localized(en, th) {
    return language() === 'th' ? th : en;
  }

  function create(set, actions) {
    const card = document.createElement('article');
    card.className = 'comparison-summary-card';
    card.tabIndex = 0;
    card.dataset.setId = set.id;
    card.setAttribute('aria-label', `${set.name}, ${formatStatus(set.status)}`);

    const mosaic = document.createElement('div');
    mosaic.className = `comparison-summary-mosaic images-${Math.max(1, set.previewImages?.length || 0)}`;
    (set.previewImages || []).slice(0, 3).forEach(preview => mosaic.appendChild(createPreview(preview)));
    if (!set.previewImages?.length) {
      const empty = document.createElement('span');
      empty.className = 'comparison-summary-no-preview';
      empty.textContent = localized('No preview', 'ไม่มีภาพตัวอย่าง');
      mosaic.appendChild(empty);
    }
    const remaining = Math.max(0, Number(set.completedCount || 0) - Math.min(3, set.previewImages?.length || 0));
    if (remaining > 0) {
      const more = document.createElement('span');
      more.className = 'comparison-summary-more';
      more.textContent = `+${remaining}`;
      mosaic.appendChild(more);
    }

    const body = document.createElement('div');
    body.className = 'comparison-summary-body';
    const heading = document.createElement('div');
    heading.className = 'comparison-summary-heading';
    const title = document.createElement('h3');
    title.textContent = set.name;
    const menuWrap = document.createElement('div');
    menuWrap.className = 'comparison-summary-menu-wrap';
    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'comparison-summary-menu-button';
    menuButton.setAttribute('aria-label', localized('Comparison actions', 'การจัดการชุดเปรียบเทียบ'));
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = '•••';
    const menu = document.createElement('div');
    menu.className = 'comparison-summary-menu';
    menu.hidden = true;
    [
      [localized('Rename', 'เปลี่ยนชื่อ'), () => actions.rename(set)],
      [localized('Delete', 'ลบ'), () => actions.remove(set)]
    ].forEach(([label, handler], index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      if (index === 1) button.className = 'danger';
      button.addEventListener('click', event => {
        event.stopPropagation();
        closeMenu();
        handler();
      });
      menu.appendChild(button);
    });
    const closeMenu = () => {
      menu.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
    };
    menuButton.addEventListener('click', event => {
      event.stopPropagation();
      const open = menu.hidden;
      document.querySelectorAll('.comparison-summary-menu:not([hidden])').forEach(other => { other.hidden = true; });
      menu.hidden = !open;
      menuButton.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('button')?.focus();
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMenu();
        menuButton.focus();
      }
    });
    menuWrap.append(menuButton, menu);
    heading.append(title, menuWrap);

    const status = document.createElement('p');
    status.className = `comparison-summary-status status-${set.status}`;
    status.textContent = `${formatStatus(set.status)} · ${set.completedCount || 0}/${set.slotCount || 0}`;
    const providers = document.createElement('p');
    providers.className = 'comparison-summary-providers';
    providers.textContent = summarize(set.providers, set.models);
    const footer = document.createElement('footer');
    const date = document.createElement('time');
    date.dateTime = new Date(set.updatedAt).toISOString();
    date.textContent = new Date(set.updatedAt).toLocaleString(language() === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'comparison-summary-open';
    open.textContent = localized('Open', 'เปิด');
    open.addEventListener('click', event => { event.stopPropagation(); actions.open(set); });
    footer.append(date, open);
    body.append(heading, status, providers, footer);
    card.append(mosaic, body);
    card.addEventListener('click', () => actions.open(set));
    card.addEventListener('keydown', event => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      actions.open(set);
    });
    return card;
  }

  function createPreview(preview) {
    const slot = document.createElement('span');
    slot.className = 'comparison-summary-preview is-loading';
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.src = preview.thumbnailUrl || preview.imageUrl || '';
    img.dataset.fallback = preview.imageUrl || '';
    img.addEventListener('load', async () => {
      try { await img.decode(); } catch { /* load is enough for the fallback path */ }
      img.classList.add('is-loaded');
      slot.classList.remove('is-loading', 'is-error');
    });
    img.addEventListener('error', () => {
      if (!img.dataset.fallbackUsed && img.dataset.fallback && !img.src.endsWith(img.dataset.fallback)) {
        img.dataset.fallbackUsed = 'true';
        img.src = img.dataset.fallback;
        return;
      }
      slot.classList.remove('is-loading');
      slot.classList.add('is-error');
    });
    slot.appendChild(img);
    observe(img);
    return slot;
  }

  function observe(img) {
    if (!('IntersectionObserver' in window)) {
      img.src = img.dataset.src;
      return;
    }
    imageObserver ||= new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        imageObserver.unobserve(entry.target);
        entry.target.src = entry.target.dataset.src;
      });
    }, { rootMargin: '180px' });
    imageObserver.observe(img);
  }

  function resetObserver() {
    imageObserver?.disconnect();
    imageObserver = null;
  }

  function summarize(providers = [], models = []) {
    const providerText = providers.slice(0, 3).map(value => String(value).toUpperCase()).join(' · ');
    const modelText = models.slice(0, 2).join(' · ');
    return [providerText, modelText].filter(Boolean).join(' | ') || localized('Models unavailable', 'ไม่มีข้อมูลโมเดล');
  }

  function formatStatus(status = 'queued') {
    const labels = {
      completed: ['Completed', 'สำเร็จ'],
      partially_completed: ['Partial', 'สำเร็จบางส่วน'],
      failed: ['Failed', 'ไม่สำเร็จ'],
      cancelled: ['Cancelled', 'ยกเลิก'],
      queued: ['Queued', 'อยู่ในคิว'],
      processing: ['Processing', 'กำลังประมวลผล'],
      streaming: ['Processing', 'กำลังประมวลผล'],
      draft: ['Draft', 'ฉบับร่าง']
    };
    const value = labels[status] || [status.replaceAll('_', ' '), status.replaceAll('_', ' ')];
    return localized(value[0], value[1]);
  }

  window.ModelPromptForgeComparisonSummaryCard = { create, resetObserver };
})();
