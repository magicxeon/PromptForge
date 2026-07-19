/**
 * ModelPromptForge - Client Actor Context Manager
 */
(function () {
  const LOCAL_STORAGE_KEY = 'mpf_active_mock_user_id';
  const DEFAULT_USER_ID = 'usr_demo';
  const listeners = new Set();

  function getActiveMockUserId() {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || DEFAULT_USER_ID;
  }

  function setActiveMockUserId(userId) {
    if (!userId) return;
    const oldId = getActiveMockUserId();
    if (oldId !== userId) {
      localStorage.setItem(LOCAL_STORAGE_KEY, userId);
      // Notify listeners
      listeners.forEach(fn => {
        try {
          fn(userId, oldId);
        } catch (err) {
          console.error('[actorContext] Listener error:', err);
        }
      });
    }
  }

  function getActorHeader() {
    return {
      'x-mpf-user-id': getActiveMockUserId()
    };
  }

  function subscribeActorChange(listener) {
    if (typeof listener === 'function') {
      listeners.add(listener);
    }
    return () => {
      listeners.delete(listener);
    };
  }

  window.ModelPromptForgeActorContext = {
    getActiveMockUserId,
    setActiveMockUserId,
    getActorHeader,
    subscribeActorChange
  };
})();
