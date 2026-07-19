/**
 * ModelPromptForge - Development Mock User Switcher UI
 */
(function () {
  const state = window.state;

  async function initMockUserSwitcher() {
    const switcherSelect = document.getElementById('mock-user-select');
    if (!switcherSelect) return;

    try {
      // 1. Fetch available mock users from API
      const response = await fetch('/api/mock-users');
      if (!response.ok) {
        console.warn('[MockUserSwitcher] API /api/mock-users not available or failed');
        return;
      }
      
      const data = await response.json();
      if (!data.enabled || !data.users) return;

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

      // 5. Handle change event
      switcherSelect.addEventListener('change', async (e) => {
        const nextUserId = e.target.value;
        if (window.ModelPromptForgeActorContext?.setActiveMockUserId) {
          window.ModelPromptForgeActorContext.setActiveMockUserId(nextUserId);
        }
        await refreshActiveActorContext();

        // 6. Trigger refresh hooks
        if (window.updateCredits) {
          window.updateCredits();
        }
        if (window.loadHistory) {
          window.loadHistory({ reset: true });
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

  // Expose to window
  window.ModelPromptForgeMockUserSwitcher = {
    init: initMockUserSwitcher,
    refreshActiveActorContext
  };
})();
