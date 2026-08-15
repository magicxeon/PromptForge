/**
 * ModelPromptForge - Development Mock User Switcher UI
 */
(function () {
  const state = window.state;

  async function initMockUserSwitcher() {
    const switcherSelect = document.getElementById('mock-user-select');
    const switcherContainer = document.getElementById('mock-user-switcher-container');
    if (!switcherSelect) return;

    if (window.MPF_ENABLE_MOCK_USERS === false) {
      if (switcherContainer) switcherContainer.hidden = true;
      return;
    }

    try {
      // 1. Fetch available mock users from API
      const data = await window.ModelPromptForgeApiClient.apiJson('/api/mock-users');
      if (!data.enabled || !data.users) {
        if (switcherContainer) switcherContainer.hidden = true;
        return;
      }
      if (switcherContainer) switcherContainer.hidden = false;

      // 2. Populate select element
      switcherSelect.innerHTML = '';
      data.users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.displayName} (${user.role})`;
        switcherSelect.appendChild(option);
      });

      // 3. Set initial select value from actorContext
      const currentActiveId = window.ModelPromptForgeActorContext?.getActiveMockUserId();
      if (currentActiveId) {
        switcherSelect.value = currentActiveId;
      }

      // 4. Update legacy state.username and state.userRole on initial load
      await refreshActiveActorContext();
      window.dispatchEvent(new CustomEvent('modelpromptforge:actorchange', {
        detail: { userId: currentActiveId || switcherSelect.value, role: state.userRole }
      }));

      // 5. Handle change event
      switcherSelect.addEventListener('change', async (e) => {
        const nextUserId = e.target.value;
        if (window.ModelPromptForgeActorContext?.setActiveMockUserId) {
          window.ModelPromptForgeActorContext.setActiveMockUserId(nextUserId);
        }
        await refreshActiveActorContext();
        clearUserScopedWorkspaceState();
        window.dispatchEvent(new CustomEvent('modelpromptforge:actorchange', {
          detail: { userId: nextUserId, role: state.userRole }
        }));

        // 6. Trigger refresh hooks
        if (window.updateCredits) {
          window.updateCredits();
        }
        if (window.loadCollections) {
          await window.loadCollections({ preserveSelection: false });
        }
        if (window.loadHistory) {
          await window.loadHistory({ reset: true });
        }
        if (window.ModelPromptForgeSharedTemplatesPanel?.refreshSharedTemplates) {
          window.ModelPromptForgeSharedTemplatesPanel.refreshSharedTemplates();
        }
      });

    } catch (err) {
      console.error('[MockUserSwitcher] Initialization failed:', err);
    }
  }

  async function refreshActiveActorContext() {
    if (!window.ModelPromptForgeApiClient?.apiJson) return;

    try {
      // Fetch resolved actor representation from server
      const actor = await window.ModelPromptForgeApiClient.apiJson('/api/me');
      if (actor && actor.userId) {
        // Sync legacy state variables for backward compatibility
        state.username = actor.username;
        state.userRole = actor.role;
        console.log(`[MockUserSwitcher] Switched active actor to: ${actor.displayName} (role: ${actor.role})`);
      }
    } catch (err) {
      console.error('[MockUserSwitcher] Failed to resolve active actor details:', err);
    }
  }

  function clearUserScopedWorkspaceState() {
    const queueList = document.getElementById('active-queue-list');
    if (queueList) queueList.innerHTML = '';

    if (state) {
      state.historyAbortController?.abort?.();
      state.history = [];
      state.historyCursor = null;
      state.historyHasMore = false;
      state.historyWindowed = false;
      state.historyError = null;
      state.selectedCollectionId = 'all';
      state.activeJobId = null;
      state.activeViewportJobMeta = null;
      state.collectionMembershipJobId = null;
    }

    const generatedImage = document.getElementById('generated-image');
    const viewportPlaceholder = document.getElementById('viewport-placeholder');
    const telemetryBar = document.getElementById('telemetry-bar');
    if (generatedImage) {
      generatedImage.removeAttribute('src');
      generatedImage.style.display = 'none';
    }
    if (viewportPlaceholder) viewportPlaceholder.style.display = '';
    if (telemetryBar) telemetryBar.style.display = 'none';

    if (window.renderHistory) window.renderHistory([]);
    if (window.ModelPromptForgeCrossModeHandoff?.clearViewportHandoffActions) {
      window.ModelPromptForgeCrossModeHandoff.clearViewportHandoffActions();
    }
  }

  // Expose to window
  window.ModelPromptForgeMockUserSwitcher = {
    init: initMockUserSwitcher,
    refreshActiveActorContext,
    clearUserScopedWorkspaceState
  };
})();
