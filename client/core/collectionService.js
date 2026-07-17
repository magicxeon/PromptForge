/**
 * ModelPromptForge - Persistent Collections Service
 */
(() => {
  const state = window.state;

  function getApiErrorMessage(payload, fallback) {
    return payload?.error?.message || payload?.error || payload?.message || fallback;
  }

  function getCollectionById(collectionId) {
    return state.collections.find(collection => collection.id === collectionId) || null;
  }

  function getCollectionsForJob(jobId) {
    return state.collections.filter(collection => collection.jobIds.includes(jobId));
  }

  async function loadCollections({ preserveSelection = true } = {}) {
    try {
      const response = await fetch('/api/collections');
      const payload = await response.json();
      if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to load collections.'));
      state.collections = payload.collections || [];
      state.defaultCollectionId = payload.defaultCollectionId || null;
      if (
        !preserveSelection ||
        (state.selectedCollectionId !== 'all' && !getCollectionById(state.selectedCollectionId))
      ) {
        state.selectedCollectionId = 'all';
      }
      renderCollectionToolbar();
      if (state.history && window.renderHistory) window.renderHistory(state.history);
      if (window.syncOpenLightboxContext) window.syncOpenLightboxContext();
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }

  function renderCollectionToolbar() {
    const select = document.getElementById('collection-select');
    const editButton = document.getElementById('btn-edit-collection');
    const count = document.getElementById('collection-count');
    if (!select || !count) return;

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = `All Images (${state.history?.length || 0}${state.historyHasMore ? '+' : ''} loaded)`;
    select.appendChild(allOption);

    state.collections.forEach(collection => {
      const option = document.createElement('option');
      option.value = collection.id;
      option.textContent = `${collection.isDefault ? '★ ' : ''}${collection.name} (${collection.imageCount})`;
      select.appendChild(option);
    });

    select.value = state.selectedCollectionId;
    const activeCollection = getCollectionById(state.selectedCollectionId);
    count.textContent = activeCollection
      ? `${activeCollection.imageCount} image${activeCollection.imageCount === 1 ? '' : 's'}${activeCollection.isDefault ? ' · Default' : ''}`
      : `${state.history?.length || 0}${state.historyHasMore ? '+' : ''} loaded`;
    if (editButton) editButton.disabled = !activeCollection;
  }

  function setCollectionModalVisibility(modal, visible) {
    if (!modal) return;
    modal.style.display = visible ? 'flex' : 'none';
    document.body.style.overflow = visible ? 'hidden' : '';
  }

  function updateCollectionCharacterCounts() {
    [
      ['collection-name', 'collection-name-count'],
      ['collection-description', 'collection-description-count'],
      ['collection-story', 'collection-story-count']
    ].forEach(([fieldId, countId]) => {
      const field = document.getElementById(fieldId);
      const count = document.getElementById(countId);
      if (field && count) count.textContent = field.value.length;
    });
  }

  function populateCollectionCoverOptions(collection) {
    const field = document.getElementById('collection-cover-field');
    const select = document.getElementById('collection-cover');
    if (!field || !select) return;
    select.innerHTML = '';
    if (!collection || collection.jobIds.length === 0) {
      field.style.display = 'none';
      return;
    }
    collection.jobIds.forEach((jobId, index) => {
      const historyItem = state.history.find(item => item.id === jobId);
      if (!historyItem) return;
      const option = document.createElement('option');
      option.value = jobId;
      option.textContent = `Image ${index + 1} · #${jobId.substring(4, 9)}`;
      select.appendChild(option);
    });
    select.value = collection.coverJobId || collection.jobIds[0];
    field.style.display = select.options.length ? 'block' : 'none';
  }

  function openCollectionEditor(collection = null, { pendingJobId = null } = {}) {
    const modal = document.getElementById('collection-editor-modal');
    const title = document.getElementById('collection-editor-title');
    const error = document.getElementById('collection-editor-error');
    const deleteButton = document.getElementById('btn-delete-collection');
    document.getElementById('collection-editor-id').value = collection?.id || '';
    document.getElementById('collection-name').value = collection?.name || '';
    document.getElementById('collection-description').value = collection?.description || '';
    document.getElementById('collection-story').value = collection?.story || '';
    document.getElementById('collection-set-default').checked = collection?.isDefault === true;
    title.textContent = collection ? 'Edit Collection' : 'New Collection';
    error.textContent = '';
    deleteButton.style.display = collection ? 'inline-flex' : 'none';
    state.pendingCollectionJobId = pendingJobId;
    populateCollectionCoverOptions(collection);
    updateCollectionCharacterCounts();
    setCollectionModalVisibility(modal, true);
    setTimeout(() => document.getElementById('collection-name').focus(), 0);
  }

  function closeCollectionEditor() {
    state.pendingCollectionJobId = null;
    setCollectionModalVisibility(document.getElementById('collection-editor-modal'), false);
  }

  async function saveCollectionFromEditor(event) {
    event.preventDefault();
    const id = document.getElementById('collection-editor-id').value;
    const setAsDefault = document.getElementById('collection-set-default').checked;
    const payload = {
      name: document.getElementById('collection-name').value,
      description: document.getElementById('collection-description').value,
      story: document.getElementById('collection-story').value
    };
    const coverSelect = document.getElementById('collection-cover');
    if (id && coverSelect?.value) payload.coverJobId = coverSelect.value;
    const error = document.getElementById('collection-editor-error');
    error.textContent = '';

    try {
      const response = await fetch(id ? `/api/collections/${id}` : '/api/collections', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? payload : { ...payload, setAsDefault })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiErrorMessage(result, 'Could not save collection.'));
      const collectionId = result.id;
      if (!id) document.getElementById('collection-editor-id').value = collectionId;

      if (id) {
        if (setAsDefault && state.defaultCollectionId !== collectionId) {
          await fetch(`/api/collections/${collectionId}/default`, { method: 'PUT' });
        } else if (!setAsDefault && state.defaultCollectionId === collectionId) {
          await fetch('/api/collections/default', { method: 'DELETE' });
        }
      }

      if (state.pendingCollectionJobId) {
        const addResponse = await fetch(`/api/collections/${collectionId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: [state.pendingCollectionJobId] })
        });
        if (!addResponse.ok) {
          const addPayload = await addResponse.json();
          throw new Error(getApiErrorMessage(addPayload, 'Collection saved, but image could not be added.'));
        }
      }

      state.selectedCollectionId = collectionId;
      closeCollectionEditor();
      await loadCollections();
      if (window.loadHistory) await window.loadHistory({ reset: true });
    } catch (saveError) {
      error.textContent = saveError.message;
    }
  }

  async function deleteActiveCollection() {
    const id = document.getElementById('collection-editor-id').value;
    const collection = getCollectionById(id);
    if (!collection) return;
    const confirmed = await AppDialog.confirm(
      `Delete collection "${collection.name}"? Images and history will be kept.`,
      { title: "Delete Collection", confirmLabel: "Delete" }
    );
    if (!confirmed) return;
    const response = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) {
      document.getElementById('collection-editor-error').textContent =
        getApiErrorMessage(payload, 'Could not delete collection.');
      return;
    }
    state.selectedCollectionId = 'all';
    closeCollectionEditor();
    await loadCollections();
    if (window.loadHistory) await window.loadHistory({ reset: true });
  }

  function renderMembershipModal() {
    const list = document.getElementById('collection-membership-list');
    const error = document.getElementById('collection-membership-error');
    if (!list) return;
    list.innerHTML = '';
    error.textContent = '';

    if (state.collections.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'no-history-text';
      empty.textContent = 'No collections yet. Create one to organize this image.';
      list.appendChild(empty);
      return;
    }

    state.collections.forEach(collection => {
      const label = document.createElement('label');
      label.className = 'collection-membership-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = collection.jobIds.includes(state.collectionMembershipJobId);
      checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;
        error.textContent = '';
        try {
          const response = await fetch(
            checkbox.checked
              ? `/api/collections/${collection.id}/images`
              : `/api/collections/${collection.id}/images/${state.collectionMembershipJobId}`,
            checkbox.checked
              ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobIds: [state.collectionMembershipJobId] })
              }
              : { method: 'DELETE' }
          );
          const payload = await response.json();
          if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Could not update membership.'));
          await loadCollections();
          renderMembershipModal();
          if (document.getElementById('lightbox-modal')?.activeItem) {
            renderLightboxCollections(document.getElementById('lightbox-modal').activeItem.id);
          }
        } catch (membershipError) {
          checkbox.checked = !checkbox.checked;
          checkbox.disabled = false;
          error.textContent = membershipError.message;
        }
      });
      const copy = document.createElement('span');
      copy.className = 'collection-membership-copy';
      const name = document.createElement('strong');
      name.textContent = collection.name;
      const meta = document.createElement('small');
      meta.textContent = `${collection.imageCount} image${collection.imageCount === 1 ? '' : 's'}`;
      copy.append(name, meta);
      label.append(checkbox, copy);
      if (collection.isDefault) {
        const badge = document.createElement('span');
        badge.className = 'collection-default-badge';
        badge.textContent = 'DEFAULT';
        label.appendChild(badge);
      }
      list.appendChild(label);
    });
  }

  function openMembershipModal(jobId) {
    state.collectionMembershipJobId = jobId;
    renderMembershipModal();
    setCollectionModalVisibility(document.getElementById('collection-membership-modal'), true);
  }

  function closeMembershipModal() {
    state.collectionMembershipJobId = null;
    setCollectionModalVisibility(document.getElementById('collection-membership-modal'), false);
  }

  function renderLightboxCollections(jobId) {
    const list = document.getElementById('lightbox-collection-list');
    if (!list) return;
    list.innerHTML = '';
    const memberships = getCollectionsForJob(jobId);
    if (memberships.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'no-history-text';
      empty.textContent = 'Not in a collection';
      list.appendChild(empty);
      return;
    }
    memberships.forEach(collection => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'collection-chip';
      chip.textContent = `${collection.isDefault ? '★ ' : ''}${collection.name}`;
      chip.addEventListener('click', () => {
        state.selectedCollectionId = collection.id;
        renderCollectionToolbar();
        if (window.closeLightbox) window.closeLightbox();
        if (window.loadHistory) window.loadHistory({ reset: true });
      });
      list.appendChild(chip);
    });
  }

  function initializeCollectionsUI() {
    const select = document.getElementById('collection-select');
    const editorModal = document.getElementById('collection-editor-modal');
    const membershipModal = document.getElementById('collection-membership-modal');
    select?.addEventListener('change', () => {
      if (window.closeLightbox) window.closeLightbox({ restoreFocus: false });
      state.selectedCollectionId = select.value;
      renderCollectionToolbar();
      if (window.loadHistory) window.loadHistory({ reset: true });
    });
    document.getElementById('btn-history-load-more')?.addEventListener('click', () => {
      if (window.loadHistory) window.loadHistory({ reset: false });
    });
    document.getElementById('btn-history-newer')?.addEventListener('click', () => {
      if (window.loadHistory) window.loadHistory({ reset: true });
    });
    document.getElementById('btn-new-collection')?.addEventListener('click', () => openCollectionEditor());
    document.getElementById('btn-edit-collection')?.addEventListener('click', () => {
      const collection = getCollectionById(state.selectedCollectionId);
      if (collection) openCollectionEditor(collection);
    });
    document.getElementById('collection-editor-form')?.addEventListener('submit', saveCollectionFromEditor);
    document.getElementById('btn-delete-collection')?.addEventListener('click', deleteActiveCollection);
    ['btn-close-collection-editor', 'btn-cancel-collection'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', closeCollectionEditor)
    );
    ['collection-name', 'collection-description', 'collection-story'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', updateCollectionCharacterCounts)
    );
    editorModal?.addEventListener('click', event => {
      if (event.target === editorModal) closeCollectionEditor();
    });
    document.getElementById('btn-close-membership')?.addEventListener('click', closeMembershipModal);
    document.getElementById('btn-membership-done')?.addEventListener('click', closeMembershipModal);
    document.getElementById('btn-membership-new')?.addEventListener('click', () => {
      const jobId = state.collectionMembershipJobId;
      closeMembershipModal();
      openCollectionEditor(null, { pendingJobId: jobId });
    });
    membershipModal?.addEventListener('click', event => {
      if (event.target === membershipModal) closeMembershipModal();
    });
    document.getElementById('btn-lightbox-add-collection')?.addEventListener('click', () => {
      const item = document.getElementById('lightbox-modal')?.activeItem;
      if (item) openMembershipModal(item.id);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (editorModal?.style.display === 'flex') closeCollectionEditor();
      if (membershipModal?.style.display === 'flex') closeMembershipModal();
    });
  }

  // Expose to window
  window.getApiErrorMessage = getApiErrorMessage;
  window.getCollectionById = getCollectionById;
  window.getCollectionsForJob = getCollectionsForJob;
  window.loadCollections = loadCollections;
  window.renderCollectionToolbar = renderCollectionToolbar;
  window.setCollectionModalVisibility = setCollectionModalVisibility;
  window.updateCollectionCharacterCounts = updateCollectionCharacterCounts;
  window.populateCollectionCoverOptions = populateCollectionCoverOptions;
  window.openCollectionEditor = openCollectionEditor;
  window.closeCollectionEditor = closeCollectionEditor;
  window.saveCollectionFromEditor = saveCollectionFromEditor;
  window.deleteActiveCollection = deleteActiveCollection;
  window.renderMembershipModal = renderMembershipModal;
  window.openMembershipModal = openMembershipModal;
  window.closeMembershipModal = closeMembershipModal;
  window.renderLightboxCollections = renderLightboxCollections;
  window.initializeCollectionsUI = initializeCollectionsUI;
})();
