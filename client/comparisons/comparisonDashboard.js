(() => {
  const PAGE_SIZE = 24;
  const MAX_RETAINED = 96;
  const copy = {
    kicker: { en: 'SAVED MODEL TESTS', th: 'ชุดทดสอบโมเดลที่บันทึกไว้' },
    title: { en: 'Comparison History', th: 'ประวัติการเปรียบเทียบ AI' },
    subtitle: { en: 'Find and reopen model comparisons without loading full generation details.', th: 'ค้นหาและเปิดชุดเปรียบเทียบเดิมโดยไม่โหลดรายละเอียดการสร้างทั้งหมด' },
    backStudio: { en: 'Back to Studio', th: 'กลับสตูดิโอ' },
    searchLabel: { en: 'Search comparisons', th: 'ค้นหาชุดเปรียบเทียบ' },
    statusLabel: { en: 'Status', th: 'สถานะ' },
    dateLabel: { en: 'Date', th: 'ช่วงเวลา' }
  };
  const state = {
    initialized: false,
    ready: false,
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    error: null,
    request: null,
    debounce: null,
    pollTimer: null,
    routeKey: null,
    loadedKey: null,
    openingSetId: null
  };

  const api = (...args) => window.ModelPromptForgeComparisonApi.request(...args);
  const language = () => window.ModelPromptForgeComparisonBridge?.getLanguage?.() || 'th';
  const text = (en, th) => language() === 'th' ? th : en;
  const username = () => window.ModelPromptForgeComparisonBridge?.getUsername?.() || 'user_demo';

  function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    bindEvents();
    localize();
    handleRoute(window.ModelPromptForgeRouter.current());
  }

  function bindEvents() {
    const form = document.getElementById('comparison-dashboard-filters');
    const search = document.getElementById('comparison-dashboard-search');
    const clear = document.getElementById('comparison-dashboard-clear-search');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      clearTimeout(state.debounce);
      updateUrlFromControls();
    });
    search?.addEventListener('input', () => {
      clear.hidden = !search.value;
      clearTimeout(state.debounce);
      state.debounce = setTimeout(updateUrlFromControls, 300);
    });
    clear?.addEventListener('click', () => {
      search.value = '';
      clear.hidden = true;
      search.focus();
      updateUrlFromControls();
    });
    ['comparison-dashboard-status', 'comparison-dashboard-date'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updateUrlFromControls);
    });
    document.getElementById('comparison-dashboard-load-more')?.addEventListener('click', () => loadPage({ reset: false }));
    document.getElementById('comparison-dashboard-retry')?.addEventListener('click', () => loadPage({ reset: state.items.length === 0 }));
    document.addEventListener('click', event => {
      if (event.target.closest('.comparison-summary-menu-wrap')) return;
      document.querySelectorAll('.comparison-summary-menu:not([hidden])').forEach(menu => { menu.hidden = true; });
    });
    window.addEventListener('modelpromptforge:route', event => handleRoute(event.detail));
    window.addEventListener('modelpromptforge:comparison-error', event => renderSetError(event.detail));
    window.addEventListener('modelpromptforge:comparison-opened', event => {
      if (state.openingSetId === event.detail.setId) state.openingSetId = null;
    });
    window.addEventListener('modelpromptforge:languagechange', () => {
      localize();
      if (isDashboardRoute()) renderItems();
    });
  }

  function handleRoute(route) {
    stopPolling();
    if (!route.pathname.startsWith('/comparisons')) {
      state.openingSetId = null;
      return;
    }
    localize();
    if (route.params.setId) {
      if (!window.ModelPromptForgeComparisonBridge) return;
      if (state.openingSetId === route.params.setId) return;
      state.openingSetId = route.params.setId;
      showMessage('', false);
      window.ModelPromptForgeComparison?.openSet(route.params.setId, { showWorkspace: true, updateRoute: false, silentError: true });
      return;
    }
    window.ModelPromptForgeComparison?.closeForRoute?.();
    state.openingSetId = null;
    syncControlsFromUrl();
    const snapshot = route.state?.comparisonDashboard;
    const key = queryKey();
    if (snapshot?.key === key && Array.isArray(snapshot.items)) {
      state.items = snapshot.items;
      state.cursor = snapshot.cursor || null;
      state.hasMore = snapshot.hasMore === true;
      state.routeKey = key;
      state.loadedKey = key;
      state.error = null;
      renderItems();
      requestAnimationFrame(() => window.scrollTo({ top: snapshot.scrollY || 0, behavior: 'auto' }));
      schedulePolling();
      return;
    }
    if ((state.loading && state.routeKey === key) || state.loadedKey === key) {
      renderItems();
      schedulePolling();
      return;
    }
    loadPage({ reset: true });
  }

  function readFilters() {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get('q') || '',
      status: ['completed', 'issues', 'processing'].includes(params.get('status')) ? params.get('status') : 'all',
      dateRange: ['7d', '30d'].includes(params.get('date')) ? params.get('date') : 'all'
    };
  }

  function syncControlsFromUrl() {
    const filters = readFilters();
    document.getElementById('comparison-dashboard-search').value = filters.search;
    document.getElementById('comparison-dashboard-clear-search').hidden = !filters.search;
    document.getElementById('comparison-dashboard-status').value = filters.status;
    document.getElementById('comparison-dashboard-date').value = filters.dateRange;
  }

  function updateUrlFromControls() {
    const params = new URLSearchParams();
    const search = document.getElementById('comparison-dashboard-search').value.trim();
    const status = document.getElementById('comparison-dashboard-status').value;
    const date = document.getElementById('comparison-dashboard-date').value;
    if (search) params.set('q', search);
    if (status !== 'all') params.set('status', status);
    if (date !== 'all') params.set('date', date);
    window.ModelPromptForgeRouter.navigate(`/comparisons${params.size ? `?${params}` : ''}`, { replace: true });
  }

  async function loadPage({ reset }) {
    if (state.loading && !reset) return;
    if (reset) {
      state.request?.abort();
      state.request = new AbortController();
      state.error = null;
      state.routeKey = queryKey();
      renderSkeletons();
    }
    const controller = state.request || new AbortController();
    state.request = controller;
    state.loading = true;
    updateBusyState();
    const filters = readFilters();
    const params = new URLSearchParams({
      username: username(),
      limit: String(PAGE_SIZE),
      search: filters.search,
      status: filters.status,
      dateRange: filters.dateRange
    });
    if (!reset && state.cursor) params.set('cursor', state.cursor);
    try {
      const payload = await api(`/api/comparisons?${params}`, { signal: controller.signal });
      const incoming = Array.isArray(payload.items) ? payload.items : [];
      if (reset) state.items = incoming;
      else {
        const byId = new Map(state.items.map(item => [item.id, item]));
        incoming.forEach(item => byId.set(item.id, item));
        state.items = [...byId.values()].slice(-MAX_RETAINED);
      }
      state.cursor = payload.nextCursor || null;
      state.hasMore = payload.hasMore === true;
      state.error = null;
      state.loadedKey = queryKey();
      renderItems();
      schedulePolling();
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!reset && error.code === 'invalid_comparison_cursor') return loadPage({ reset: true });
      state.error = error.message;
      if (state.items.length) renderItems();
      else renderError();
    } finally {
      if (state.request === controller) {
        state.loading = false;
        updateBusyState();
      }
    }
  }

  function renderSkeletons() {
    const grid = document.getElementById('comparison-dashboard-grid');
    grid.innerHTML = '';
    showMessage('', false);
    for (let index = 0; index < 6; index += 1) {
      const skeleton = document.createElement('div');
      skeleton.className = 'comparison-summary-skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      grid.appendChild(skeleton);
    }
  }

  function renderItems() {
    const grid = document.getElementById('comparison-dashboard-grid');
    window.ModelPromptForgeComparisonSummaryCard.resetObserver();
    grid.innerHTML = '';
    if (!state.items.length) {
      renderEmpty();
      updateBusyState();
      return;
    }
    showMessage(state.error ? text(`Could not refresh: ${state.error}`, `รีเฟรชไม่สำเร็จ: ${state.error}`) : '', Boolean(state.error));
    state.items.forEach(set => grid.appendChild(window.ModelPromptForgeComparisonSummaryCard.create(set, {
      open: openSet,
      rename: renameSet,
      remove: deleteSet
    })));
    updateBusyState();
  }

  function renderEmpty() {
    const filters = readFilters();
    const filtered = filters.search || filters.status !== 'all' || filters.dateRange !== 'all';
    showMessage(
      filtered
        ? text('No comparisons match these filters. Clear filters to see recent sets.', 'ไม่พบชุดเปรียบเทียบตามเงื่อนไข ล้างตัวกรองเพื่อดูรายการล่าสุด')
        : text('No saved comparisons yet. Return to Studio and create your first model comparison.', 'ยังไม่มีชุดเปรียบเทียบ กลับไปที่สตูดิโอเพื่อสร้างชุดแรก'),
      false,
      filtered
    );
  }

  function renderError() {
    document.getElementById('comparison-dashboard-grid').innerHTML = '';
    showMessage(text(`Could not load comparisons: ${state.error}`, `โหลดชุดเปรียบเทียบไม่สำเร็จ: ${state.error}`), true);
    updateBusyState();
  }

  function renderSetError(detail) {
    const route = window.ModelPromptForgeRouter.current();
    if (!route.params.setId || route.params.setId !== detail.setId) return;
    state.openingSetId = null;
    window.ModelPromptForgeComparison?.closeForRoute?.();
    document.getElementById('comparison-dashboard-grid').innerHTML = '';
    const message = detail.status === 404
      ? text('This Comparison Set was not found or has been deleted.', 'ไม่พบชุดเปรียบเทียบนี้ หรือชุดนี้ถูกลบแล้ว')
      : text(`Could not open this Comparison Set: ${detail.message}`, `เปิดชุดเปรียบเทียบนี้ไม่สำเร็จ: ${detail.message}`);
    const element = document.getElementById('comparison-dashboard-message');
    element.innerHTML = '';
    element.hidden = false;
    element.classList.toggle('is-error', detail.status !== 404);
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text('Back to Comparison History', 'กลับประวัติการเปรียบเทียบ');
    button.addEventListener('click', () => window.ModelPromptForgeRouter.navigate('/comparisons'));
    element.append(paragraph, button);
  }

  function showMessage(message, error, clearFilters = false) {
    const element = document.getElementById('comparison-dashboard-message');
    element.innerHTML = '';
    element.hidden = !message;
    element.classList.toggle('is-error', error);
    if (!message) return;
    const copyElement = document.createElement('p');
    copyElement.textContent = message;
    element.appendChild(copyElement);
    const action = document.createElement('button');
    action.type = 'button';
    if (clearFilters) {
      action.textContent = text('Clear Filters', 'ล้างตัวกรอง');
      action.addEventListener('click', () => window.ModelPromptForgeRouter.navigate('/comparisons', { replace: true }));
    } else if (!error && state.items.length === 0) {
      action.textContent = text('Back to Studio', 'กลับสตูดิโอ');
      action.dataset.route = '/studio';
    } else {
      return;
    }
    element.appendChild(action);
  }

  function updateBusyState() {
    document.querySelector('.comparison-dashboard-content')?.setAttribute('aria-busy', String(state.loading));
    const loadMore = document.getElementById('comparison-dashboard-load-more');
    const retry = document.getElementById('comparison-dashboard-retry');
    loadMore.hidden = !state.hasMore || Boolean(state.error) || state.items.length >= MAX_RETAINED;
    loadMore.disabled = state.loading;
    loadMore.textContent = state.loading ? text('Loading...', 'กำลังโหลด...') : text('Load More', 'โหลดเพิ่ม');
    retry.hidden = !state.error;
    retry.disabled = state.loading;
    retry.textContent = text('Retry', 'ลองใหม่');
  }

  function openSet(set) {
    const snapshot = {
      key: queryKey(), items: state.items, cursor: state.cursor, hasMore: state.hasMore, scrollY: window.scrollY
    };
    window.history.replaceState({ ...(window.history.state || {}), comparisonDashboard: snapshot }, '', window.location.href);
    window.ModelPromptForgeRouter.navigate(`/comparisons/${encodeURIComponent(set.id)}`);
  }

  async function renameSet(set) {
    const name = await AppDialog.prompt(text('Enter a new name for this Comparison Set.', 'กรอกชื่อใหม่สำหรับชุดเปรียบเทียบ'), {
      title: text('Rename Comparison', 'เปลี่ยนชื่อชุดเปรียบเทียบ'),
      inputLabel: text('Comparison name', 'ชื่อชุดเปรียบเทียบ'),
      value: set.name,
      required: true,
      confirmLabel: text('Save', 'บันทึก')
    });
    const normalized = name?.trim();
    if (!normalized || normalized === set.name) return;
    if (normalized.length > 100) {
      await AppDialog.alert(text('Name must be 100 characters or fewer.', 'ชื่อต้องไม่เกิน 100 ตัวอักษร'), { title: text('Invalid Name', 'ชื่อไม่ถูกต้อง') });
      return;
    }
    try {
      const updated = await api(`/api/comparisons/${encodeURIComponent(set.id)}`, { method: 'PATCH', body: { username: username(), name: normalized } });
      state.items = state.items.map(item => item.id === set.id ? { ...item, name: updated.name, updatedAt: updated.updatedAt } : item);
      renderItems();
    } catch (error) {
      await AppDialog.alert(error.message, { title: text('Rename Failed', 'เปลี่ยนชื่อไม่สำเร็จ') });
    }
  }

  async function deleteSet(set) {
    const confirmed = await AppDialog.confirm(
      text(`Delete “${set.name}”? Generated images, History and Collections will be kept.`, `ลบ “${set.name}” หรือไม่? รูปภาพ ประวัติ และ Collection จะยังคงอยู่`),
      { title: text('Delete Comparison Set', 'ลบชุดเปรียบเทียบ'), confirmLabel: text('Delete Set', 'ลบชุด') }
    );
    if (!confirmed) return;
    try {
      await api(`/api/comparisons/${encodeURIComponent(set.id)}?username=${encodeURIComponent(username())}`, { method: 'DELETE' });
      state.items = state.items.filter(item => item.id !== set.id);
      window.ModelPromptForgeComparison?.handleSetDeleted?.(set.id);
      renderItems();
    } catch (error) {
      await AppDialog.alert(error.message, { title: text('Delete Failed', 'ลบไม่สำเร็จ') });
    }
  }

  async function refreshStatuses() {
    if (!isDashboardRoute() || state.loading) return;
    const filters = readFilters();
    const params = new URLSearchParams({ username: username(), limit: String(PAGE_SIZE), search: filters.search, status: filters.status, dateRange: filters.dateRange });
    try {
      const payload = await api(`/api/comparisons?${params}`);
      const updates = new Map((payload.items || []).map(item => [item.id, item]));
      state.items = state.items.map(item => updates.get(item.id) || item);
      renderItems();
    } catch {
      // Keep the current cards; the next scheduled poll can recover.
    }
    schedulePolling();
  }

  function schedulePolling() {
    stopPolling();
    if (state.items.some(item => ['queued', 'processing', 'streaming'].includes(item.status))) {
      state.pollTimer = setTimeout(refreshStatuses, 5000);
    }
  }

  function stopPolling() {
    clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }

  function queryKey() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function isDashboardRoute() {
    return window.ModelPromptForgeRouter.current().pathname === '/comparisons';
  }

  function localize() {
    document.querySelectorAll('[data-dashboard-text]').forEach(element => {
      const value = copy[element.dataset.dashboardText];
      if (value) element.textContent = value[language()] || value.en;
    });
    const search = document.getElementById('comparison-dashboard-search');
    if (search) search.placeholder = text('Search name, provider or model...', 'ค้นหาชื่อ Provider หรือ Model...');
    const optionLabels = {
      'comparison-dashboard-status': {
        all: ['All', 'ทั้งหมด'], completed: ['Completed', 'สำเร็จ'], issues: ['Partial / Failed', 'บางส่วน / ไม่สำเร็จ'], processing: ['Processing', 'กำลังประมวลผล']
      },
      'comparison-dashboard-date': {
        all: ['All time', 'ทุกช่วงเวลา'], '7d': ['Last 7 days', '7 วันที่ผ่านมา'], '30d': ['Last 30 days', '30 วันที่ผ่านมา']
      }
    };
    Object.entries(optionLabels).forEach(([id, labels]) => {
      const select = document.getElementById(id);
      Object.entries(labels).forEach(([value, values]) => {
        const option = [...select.options].find(item => item.value === value);
        if (option) option.textContent = text(values[0], values[1]);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initialize);
  window.addEventListener('modelpromptforge:ready', () => {
    state.ready = true;
    initialize();
    localize();
    handleRoute(window.ModelPromptForgeRouter.current());
  });
})();
