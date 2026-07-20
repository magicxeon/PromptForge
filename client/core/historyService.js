/**
 * ModelPromptForge - Generation History Service
 */
(() => {
  const state = window.state;

  async function loadHistory({ reset = true } = {}) {
    if (state.historyLoading && !reset) return;
    if (reset) {
      state.historyAbortController?.abort();
      state.historyAbortController = new AbortController();
    }
    const controller = state.historyAbortController || new AbortController();
    state.historyAbortController = controller;
    state.historyLoading = true;
    state.historyError = null;
    renderHistoryPagination();
    try {
      const params = new URLSearchParams({
        limit: '24',
        collectionId: state.selectedCollectionId || 'all'
      });
      if (!reset && state.historyCursor) params.set('cursor', state.historyCursor);
      const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
      const res = await apiFetch(`/api/history?${params}`, { signal: controller.signal });
      const payload = await res.json();
      if (!res.ok && !reset && payload?.error?.code === 'invalid_history_cursor') {
        return loadHistory({ reset: true });
      }
      if (!res.ok) throw new Error(window.getApiErrorMessage ? window.getApiErrorMessage(payload, 'Failed to load history.') : 'Failed to load history.');
      const incoming = Array.isArray(payload.items) ? payload.items : [];
      if (reset) {
        state.history = incoming;
        state.historyWindowed = false;
      } else {
        const byId = new Map(state.history.map(item => [item.id, item]));
        incoming.forEach(item => byId.set(item.id, item));
        state.history = [...byId.values()];
        if (state.history.length > 96) {
          state.history = state.history.slice(-96);
          state.historyWindowed = true;
        }
      }
      state.historyCursor = payload.nextCursor || null;
      state.historyHasMore = payload.hasMore === true;
      if (window.renderCollectionToolbar) window.renderCollectionToolbar();
      renderHistory(state.history);
      if (window.syncOpenLightboxContext) window.syncOpenLightboxContext();

      // Auto-collapse on initial page load if history is empty (Step 7)
      if (state.history.length === 0 && !state.hasInitializedHistoryCollapse) {
        state.hasInitializedHistoryCollapse = true;
        const visualDashboard = document.getElementById("visual-dashboard");
        if (visualDashboard) {
          visualDashboard.classList.add("collapsed");
          const btnToggleDashboard = document.getElementById("btn-toggle-dashboard");
          const icon = btnToggleDashboard ? btnToggleDashboard.querySelector(".toggle-icon") : null;
          if (icon) icon.textContent = "▲";
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error("Failed to load history list:", err);
      state.historyError = err.message;
    } finally {
      if (state.historyAbortController === controller) {
        state.historyLoading = false;
        renderHistoryPagination();
      }
    }
  }

  function getVisibleHistoryItems(historyList = state.history) {
    return Array.isArray(historyList) ? historyList : [];
  }

  function renderHistoryPagination() {
    const container = document.getElementById('history-pagination');
    const loadMore = document.getElementById('btn-history-load-more');
    const newer = document.getElementById('btn-history-newer');
    const status = document.getElementById('history-page-status');
    if (!container || !loadMore || !newer || !status) return;
    container.hidden = state.history.length === 0 && !state.historyLoading && !state.historyError;
    loadMore.hidden = !state.historyHasMore;
    loadMore.disabled = state.historyLoading;
    newer.hidden = !state.historyWindowed && !state.historyError;
    newer.disabled = state.historyLoading;
    newer.textContent = state.historyError ? 'Retry' : 'Newer Images';
    status.textContent = state.historyLoading
      ? 'Loading previews...'
      : state.historyError || `${state.history.length}${state.historyHasMore ? '+' : ''} loaded`;
    status.classList.toggle('is-error', Boolean(state.historyError));
  }

  let historyImageObserver = null;

  function observeHistoryImage(img) {
    const beginLoad = () => {
      if (img.src) return;
      img.src = img.dataset.src;
    };
    if (!('IntersectionObserver' in window)) {
      beginLoad();
      return;
    }
    historyImageObserver ||= new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        historyImageObserver.unobserve(entry.target);
        if (!entry.target.src) entry.target.src = entry.target.dataset.src;
      });
    }, { rootMargin: '160px 0px' });
    historyImageObserver.observe(img);
  }

  function renderHistory(historyList) {
    const grid = document.getElementById("history-grid");
    if (!grid) return;

    historyImageObserver?.disconnect();
    historyImageObserver = null;
    grid.innerHTML = "";

    const visibleHistory = getVisibleHistoryItems(historyList);

    if (visibleHistory.length === 0) {
      grid.innerHTML = `<p class="no-history-text" id="no-history-placeholder">No history found</p>`;
      return;
    }

    visibleHistory.forEach(item => {
      const card = document.createElement("div");
      card.className = "history-item is-image-loading";
      card.title = `Generate: ${(item.prompt || '').substring(0, 100)}...`;

      const loading = document.createElement('span');
      loading.className = 'history-image-loading';
      loading.setAttribute('aria-hidden', 'true');

      const img = document.createElement("img");
      img.dataset.src = item.thumbnailUrl || item.imageUrl;
      img.dataset.fallbackSrc = item.imageUrl;
      img.loading = 'lazy';
      img.decoding = 'async';
      if (item.thumbnailWidth && item.thumbnailHeight) {
        img.width = item.thumbnailWidth;
        img.height = item.thumbnailHeight;
      }
      img.alt = "Generated Character Output";
      img.addEventListener('load', async () => {
        try { await img.decode(); } catch { }
        img.classList.add('is-loaded');
        card.classList.remove('is-image-loading', 'is-image-error');
      });
      img.addEventListener('error', () => {
        if (!img.dataset.usedFallback && img.dataset.fallbackSrc && img.src !== img.dataset.fallbackSrc) {
          img.dataset.usedFallback = 'true';
          img.src = img.dataset.fallbackSrc;
          return;
        }
        card.classList.remove('is-image-loading');
        card.classList.add('is-image-error');
      });
      img.addEventListener("click", () => {
        if (window.openLightbox) window.openLightbox(item, { triggerElement: img });
      });

      const btnDel = document.createElement("button");
      btnDel.className = "btn-delete-history";
      btnDel.innerHTML = "&times;";
      btnDel.title = "Delete image record";
      btnDel.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (await AppDialog.confirm("Are you sure you want to delete this generation history?", {
          title: "Delete Image History",
          confirmLabel: "Delete"
        })) {
          deleteHistory(item.id);
        }
      });

      const collectionButton = document.createElement('button');
      collectionButton.type = 'button';
      collectionButton.className = 'history-collection-action';
      collectionButton.textContent = '+';
      collectionButton.title = 'Add or remove from collections';
      collectionButton.setAttribute('aria-label', 'Add or remove image from collections');
      collectionButton.addEventListener('click', event => {
        event.stopPropagation();
        if (window.openMembershipModal) window.openMembershipModal(item.id);
      });

      const memberships = window.getCollectionsForJob ? window.getCollectionsForJob(item.id) : [];
      if (memberships.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'history-collection-badge';
        badge.textContent = memberships.length === 1 ? memberships[0].name : `${memberships.length} Collections`;
        card.appendChild(badge);
      }

      if (item.comparisonSetId) {
        const comparisonBadge = document.createElement('button');
        comparisonBadge.type = 'button';
        comparisonBadge.className = 'history-comparison-badge';
        comparisonBadge.textContent = 'Compare';
        comparisonBadge.title = 'Open this AI Comparison Set';
        comparisonBadge.addEventListener('click', event => {
          event.stopPropagation();
          window.ModelPromptForgeComparison?.openSet(item.comparisonSetId);
        });
        card.appendChild(comparisonBadge);
      }

      card.appendChild(loading);
      card.appendChild(img);
      card.appendChild(btnDel);
      card.appendChild(collectionButton);
      grid.appendChild(card);
      observeHistoryImage(img);
    });
    renderHistoryPagination();
  }

  async function deleteHistory(jobId) {
    try {
      const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
      const res = await apiFetch(`/api/history/${jobId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (window.loadCollections) await window.loadCollections();
        loadHistory();
      } else {
        const data = await res.json();
        await AppDialog.alert("Failed to delete entry: " + data.error, { title: "Delete Failed" });
      }
    } catch (err) {
      await AppDialog.alert("Delete operation failed: " + err.message, { title: "Delete Failed" });
    }
  }

  // Expose to window
  window.loadHistory = loadHistory;
  window.getVisibleHistoryItems = getVisibleHistoryItems;
  window.renderHistoryPagination = renderHistoryPagination;
  window.observeHistoryImage = observeHistoryImage;
  window.renderHistory = renderHistory;
  window.deleteHistory = deleteHistory;
})();
